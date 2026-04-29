import {
  CampaignRepository,
  ParticipantRepository,
  buildTop10Summary,
  getParticipantStatusSnapshot,
  normalizeCommand,
  renderTemplate,
  type Campaign,
  type CampaignLiveState,
  type ContactCardMessage,
  type IncomingWhatsAppMessage,
  type MessageTemplateKey,
  type OutboundWhatsAppMessage,
  type Participant
} from "@lottery/core";
import { prisma } from "@lottery/db";

export interface ContactSyncTarget {
  workspaceId: string;
  participant: Participant;
}

export interface CampaignExecutionResult {
  campaignId: string | null;
  liveState: CampaignLiveState | null;
  outbound: OutboundWhatsAppMessage[];
  contactsToSync: ContactSyncTarget[];
}

const MENU_STATUS_MATCHERS = ["כמה כרטיסים יש לי", "סטטוס", "כרטיסים", "status", "tickets"];
const MENU_LINK_MATCHERS = ["לינק אישי", "קישור אישי", "לינק", "link"];
const MENU_WINNER_MATCHERS = ["רשימת זוכים", "זוכים", "winner", "winners"];
const MENU_MATCHERS = ["תפריט", "menu", "help", "אפשרויות"];
const NEGATIVE_REFERRER_MATCHERS = ["אין", "לא", "none", "nobody"];
const CONTACT_SAVED_YES_MATCHERS = ["שמרתי", "שמרתי!", "כן", "yes", "saved"];
const CONTACT_SAVED_NO_MATCHERS = ["לא שמרתי", "לא", "no", "not saved"];
const db = prisma as any;

function normalizePhoneCandidate(value: string): string | null {
  const digits = value.replace(/[^\d+]/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("972")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length >= 9) {
    return `+972${digits.slice(1)}`;
  }

  if (digits.length >= 9) {
    return `+${digits}`;
  }

  return null;
}

function matchesOneOf(body: string, values: string[]): boolean {
  const normalized = normalizeCommand(body);
  return values.some((value) => normalized === normalizeCommand(value));
}

function matchesInteractiveReply(
  message: IncomingWhatsAppMessage,
  expectedReplyId: string,
  fallbacks: string[] = []
): boolean {
  return (
    message.interactiveReplyId === expectedReplyId || matchesOneOf(message.body, fallbacks)
  );
}

function looksLikeInvalidName(value: string): boolean {
  const normalized = value.trim();

  if (!normalized) {
    return true;
  }

  return (
    normalized.length > 60 ||
    /(https?:\/\/|www\.|play\.google\.com|ref=|\/join\/)/i.test(normalized)
  );
}

export class CampaignService {
  private readonly campaignRepository: CampaignRepository;
  private readonly participantRepository: ParticipantRepository;

  constructor(private readonly baseUrl: string) {
    this.campaignRepository = new CampaignRepository(baseUrl);
    this.participantRepository = new ParticipantRepository(baseUrl);
  }

  async handleInboundMessage(
    message: IncomingWhatsAppMessage
  ): Promise<CampaignExecutionResult> {
    const campaign = message.campaignId
      ? await this.campaignRepository.findById(message.campaignId)
      : await this.campaignRepository.findActiveByConnectionAndMessage(
          message.connectionId,
          message.body
        );

    if (!campaign) {
      return {
        campaignId: null,
        liveState: null,
        outbound: [],
        contactsToSync: []
      };
    }

    const outbound: OutboundWhatsAppMessage[] = [];
    const contactsToSync: ContactSyncTarget[] = [];
    const { participant, isNew } = await this.participantRepository.createIfMissing({
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      phone: message.from,
      chatAddress: message.chatAddress,
      name: null
    });

    let currentParticipant = participant;

    if (message.referralToken && currentParticipant.onboardingState !== "REGISTERED") {
      currentParticipant = await this.participantRepository.attachPendingReferralCode(
        currentParticipant.id,
        message.referralToken
      );
    }

    if (isNew) {
      await this.appendTemplateMessage(outbound, campaign, currentParticipant, "WELCOME");
      await this.campaignRepository.incrementMessageCount(campaign.id, outbound.length);
      return this.finish(campaign, outbound, contactsToSync);
    }

    switch (currentParticipant.onboardingState) {
      case "AWAITING_NAME":
        if (!message.body.trim()) {
          await this.appendTemplateMessage(outbound, campaign, currentParticipant, "WELCOME");
          break;
        }

        if (looksLikeInvalidName(message.body)) {
          await this.appendTemplateMessage(outbound, campaign, currentParticipant, "WELCOME");
          break;
        }

        currentParticipant = await this.participantRepository.captureName(
          currentParticipant.id,
          message.body
        );
        currentParticipant = await this.participantRepository.markAwaitingContactSave(
          currentParticipant.id
        );

        if (!this.isTemplateEnabled(campaign, "SAVE_CONTACT_PROMPT")) {
          await this.completeRegistrationFlow(
            campaign,
            currentParticipant,
            outbound,
            contactsToSync
          );
          break;
        }

        await this.appendSaveContactPrompt(outbound, campaign, currentParticipant);
        break;

      case "AWAITING_REFERRER":
        if (matchesInteractiveReply(message, "saved_contact_yes", CONTACT_SAVED_YES_MATCHERS)) {
          await this.completeRegistrationFlow(
            campaign,
            await this.participantRepository.markAwaitingContactSave(currentParticipant.id),
            outbound,
            contactsToSync
          );
          break;
        }

        if (matchesInteractiveReply(message, "saved_contact_no", CONTACT_SAVED_NO_MATCHERS)) {
          currentParticipant = await this.participantRepository.rejectContactSave(
            currentParticipant.id
          );
          await this.appendTemplateMessage(
            outbound,
            campaign,
            currentParticipant,
            "REGISTRATION_PAUSED"
          );
          break;
        }

        currentParticipant = message.body.trim()
          ? await this.handleReferrerStep(campaign, currentParticipant, message)
          : await this.participantRepository.markAwaitingContactSave(currentParticipant.id);

        if (!this.isTemplateEnabled(campaign, "SAVE_CONTACT_PROMPT")) {
          await this.completeRegistrationFlow(
            campaign,
            currentParticipant,
            outbound,
            contactsToSync
          );
          break;
        }

        await this.appendSaveContactPrompt(outbound, campaign, currentParticipant);
        break;

      case "AWAITING_CONTACT_SAVED":
        if (
          !this.isTemplateEnabled(campaign, "SAVE_CONTACT_PROMPT") ||
          matchesInteractiveReply(message, "saved_contact_yes", CONTACT_SAVED_YES_MATCHERS)
        ) {
          await this.completeRegistrationFlow(
            campaign,
            currentParticipant,
            outbound,
            contactsToSync
          );
          break;
        }

        if (matchesInteractiveReply(message, "saved_contact_no", CONTACT_SAVED_NO_MATCHERS)) {
          currentParticipant = await this.participantRepository.rejectContactSave(
            currentParticipant.id
          );
          await this.appendTemplateMessage(
            outbound,
            campaign,
            currentParticipant,
            "REGISTRATION_PAUSED"
          );
          break;
        }

        await this.appendSaveContactPrompt(outbound, campaign, currentParticipant);
        break;

      case "REGISTERED":
      default:
        outbound.push(...(await this.handleRegisteredParticipant(campaign, currentParticipant, message)));
        break;
    }

    if (outbound.length > 0) {
      await this.campaignRepository.incrementMessageCount(campaign.id, outbound.length);
    }

    return this.finish(campaign, outbound, contactsToSync);
  }

  private async finish(
    campaign: Campaign,
    outbound: OutboundWhatsAppMessage[],
    contactsToSync: ContactSyncTarget[]
  ): Promise<CampaignExecutionResult> {
    return {
      campaignId: campaign.id,
      liveState: await this.campaignRepository.getLiveState(campaign.id),
      outbound,
      contactsToSync
    };
  }

  private async handleReferrerStep(
    campaign: Campaign,
    participant: Participant,
    message: IncomingWhatsAppMessage
  ): Promise<Participant> {
    if (message.referralToken) {
      return this.participantRepository.saveReferrerHint({
        participantId: participant.id,
        referralCode: message.referralToken
      });
    }

    if (matchesOneOf(message.body, NEGATIVE_REFERRER_MATCHERS)) {
      return this.participantRepository.saveReferrerHint({
        participantId: participant.id,
        phoneHint: null
      });
    }

    const phoneHint = normalizePhoneCandidate(message.body);

    if (phoneHint) {
      return this.participantRepository.saveReferrerHint({
        participantId: participant.id,
        phoneHint
      });
    }

    const registeredParticipants = await this.participantRepository.listByCampaign(campaign.id, {
      registeredOnly: true
    });
    const normalizedBody = normalizeCommand(message.body);
    const matchedReferrer = registeredParticipants.find(
      (candidate) => normalizeCommand(candidate.name) === normalizedBody
    );

    return this.participantRepository.saveReferrerHint({
      participantId: participant.id,
      phoneHint: matchedReferrer?.phone ?? null
    });
  }

  private async handleRegisteredParticipant(
    campaign: Campaign,
    participant: Participant,
    message: IncomingWhatsAppMessage
  ): Promise<OutboundWhatsAppMessage[]> {
    if (message.interactiveReplyId === "menu_status") {
      const statusMessage = await this.renderForParticipant(campaign, participant, "STATUS_TICKETS");
      return statusMessage ? [statusMessage] : [];
    }

    if (message.interactiveReplyId === "menu_link") {
      const linkMessage = await this.renderForParticipant(campaign, participant, "LINK");
      return linkMessage ? [linkMessage] : [];
    }

    if (message.interactiveReplyId === "menu_winner") {
      return [await this.buildWinnerStatusMessage(campaign, participant)];
    }

    const normalizedBody = normalizeCommand(message.body);

    if (
      campaign.statusCommandAliases.map(normalizeCommand).includes(normalizedBody) ||
      matchesOneOf(message.body, MENU_STATUS_MATCHERS)
    ) {
      const statusMessage = await this.renderForParticipant(campaign, participant, "STATUS_TICKETS");
      return statusMessage ? [statusMessage] : [];
    }

    if (matchesOneOf(message.body, MENU_LINK_MATCHERS)) {
      const linkMessage = await this.renderForParticipant(campaign, participant, "LINK");
      return linkMessage ? [linkMessage] : [];
    }

    if (matchesOneOf(message.body, MENU_WINNER_MATCHERS)) {
      return [await this.buildWinnerStatusMessage(campaign, participant)];
    }

    if (
      matchesOneOf(message.body, MENU_MATCHERS) ||
      normalizeCommand(campaign.triggerWord ?? "") === normalizedBody
    ) {
      const menuMessage = await this.renderForParticipant(campaign, participant, "MAIN_MENU");
      return menuMessage ? [menuMessage] : [];
    }

    const defaultMenu = await this.renderForParticipant(campaign, participant, "MAIN_MENU");
    return defaultMenu ? [defaultMenu] : [];
  }

  private async buildWinnerStatusMessage(
    campaign: Campaign,
    participant: Participant
  ): Promise<OutboundWhatsAppMessage> {
    const stats = await this.campaignRepository.getDashboardStats(campaign.id);
    const latestWinner = stats.latestWinner;

    return {
      connectionId: campaign.connectionId,
      to: participant.chatAddress ?? participant.phone,
      body: latestWinner
        ? `הזוכה האחרון הוא ${latestWinner.participantName}.\nעודכן ב-${new Date(
            latestWinner.createdAt
          ).toLocaleString("he-IL")}.`
        : "עדיין לא הוכרז זוכה. ברגע שתתבצע הגרלה נעדכן כאן.",
      mediaUrl: null,
      mediaType: null,
      interactive: null
    };
  }

  private async renderForParticipant(
    campaign: Campaign,
    participant: Participant,
    key: MessageTemplateKey
  ): Promise<OutboundWhatsAppMessage | null> {
    const registeredParticipants = await this.participantRepository.listByCampaign(campaign.id, {
      registeredOnly: true
    });
    const snapshot = isRegisteredParticipant(participant)
      ? getParticipantStatusSnapshot(registeredParticipants, participant.id)
      : null;
    const template = campaign.templates.find((item) => item.key === key);

    if (!template || template.isEnabled === false) {
      return null;
    }

    return {
      connectionId: campaign.connectionId,
      to: participant.chatAddress ?? participant.phone,
      body: renderTemplate(template?.value ?? "", {
        name: participant.name,
        tickets: participant.tickets,
        link: participant.referralLink,
        referrals: participant.referralsCount,
        rank: snapshot?.rank ?? 0,
        top10: buildTop10Summary(registeredParticipants),
        contact_phone: participant.phone,
        campaign_name: campaign.name,
        ref: participant.referralToken
      }),
      mediaUrl: template?.mediaUrl ?? null,
      mediaType: template?.mediaType ?? null,
      interactive: template?.interactive ?? null
    };
  }

  private isTemplateEnabled(campaign: Campaign, key: MessageTemplateKey): boolean {
    return campaign.templates.find((template) => template.key === key)?.isEnabled !== false;
  }

  private async getWorkspaceContactCards(workspaceId: string): Promise<ContactCardMessage[]> {
    const cards = await db.workspaceContactCard.findMany({
      where: {
        workspaceId,
        isEnabled: true
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return cards.map((card: any) => ({
      displayName: card.displayName,
      phone: card.phone,
      organization: card.organization ?? null
    }));
  }

  private async appendSaveContactPrompt(
    outbound: OutboundWhatsAppMessage[],
    campaign: Campaign,
    participant: Participant
  ): Promise<void> {
    await this.appendTemplateMessage(outbound, campaign, participant, "SAVE_CONTACT_PROMPT");

    const contactCards = await this.getWorkspaceContactCards(campaign.workspaceId);

    if (contactCards.length === 0) {
      return;
    }

    outbound.push({
      connectionId: campaign.connectionId,
      to: participant.chatAddress ?? participant.phone,
      body:
        contactCards.length > 2
          ? "מצורף קובץ אנשי קשר לשמירה מהירה בטלפון."
          : "זה כרטיס איש הקשר לשמירה בטלפון.",
      mediaUrl: null,
      mediaType: null,
      interactive: null,
      contactCards,
      contactDeliveryMode: contactCards.length > 2 ? "VCARD_FILE" : "CONTACT_CARD"
    });
  }

  private async appendTemplateMessage(
    outbound: OutboundWhatsAppMessage[],
    campaign: Campaign,
    participant: Participant,
    key: MessageTemplateKey
  ): Promise<void> {
    const message = await this.renderForParticipant(campaign, participant, key);

    if (message) {
      outbound.push(message);
    }
  }

  private async completeRegistrationFlow(
    campaign: Campaign,
    participant: Participant,
    outbound: OutboundWhatsAppMessage[],
    contactsToSync: ContactSyncTarget[]
  ): Promise<Participant> {
    const registration = await this.participantRepository.completeRegistration({
      campaignId: campaign.id,
      participantId: participant.id
    });
    const registeredParticipant = registration.participant;

    contactsToSync.push({
      workspaceId: campaign.workspaceId,
      participant: registeredParticipant
    });

    await this.appendTemplateMessage(outbound, campaign, registeredParticipant, "LINK");
    await this.appendTemplateMessage(outbound, campaign, registeredParticipant, "MAIN_MENU");

    if (registration.referrer) {
      await this.appendTemplateMessage(outbound, campaign, registration.referrer, "REFERRAL_UPDATE");
    }

    return registeredParticipant;
  }
}

function isRegisteredParticipant(participant: Participant): boolean {
  return participant.onboardingState === "REGISTERED";
}
