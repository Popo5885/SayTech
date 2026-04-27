import { google, people_v1 } from "googleapis";
import {
  CampaignRepository,
  ContactSyncLedgerRepository,
  WorkspaceRepository,
  renderTemplate,
  type Campaign,
  type GoogleSyncAccount,
  type Participant
} from "@lottery/core";

const DEFAULT_GOOGLE_CLIENT_ID =
  "455116448878-mlsaq4mflpdm8fpkisnak26tjhmtduf3.apps.googleusercontent.com";

function normalizePhone(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "");

  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

function buildQueries(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const withoutPlus = normalized.replace(/^\+/, "");
  return Array.from(new Set([phone, normalized, withoutPlus])).filter(Boolean);
}

export class GoogleContactsSyncService {
  private readonly workspaceRepository: WorkspaceRepository;
  private readonly campaignRepository: CampaignRepository;
  private readonly ledgerRepository: ContactSyncLedgerRepository;

  constructor(
    workspaceRepository = new WorkspaceRepository(),
    campaignRepository = new CampaignRepository(
      process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"
    ),
    ledgerRepository = new ContactSyncLedgerRepository()
  ) {
    this.workspaceRepository = workspaceRepository;
    this.campaignRepository = campaignRepository;
    this.ledgerRepository = ledgerRepository;
  }

  private createAuth(account: GoogleSyncAccount) {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback/google";

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Google OAuth environment variables.");
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken ?? undefined,
      expiry_date: account.tokenExpiry?.getTime()
    });

    return auth;
  }

  private createPeopleApi(account: GoogleSyncAccount) {
    return google.people({
      version: "v1",
      auth: this.createAuth(account)
    });
  }

  private buildDisplayName(account: GoogleSyncAccount, participant: Participant): string {
    const contactPhone = normalizePhone(participant.phone);

    return renderTemplate(account.contactTemplate, {
      name: participant.name,
      tickets: participant.tickets,
      link: participant.referralLink,
      referrals: participant.referralsCount,
      rank: 0,
      top10: "",
      contact_phone: contactPhone,
      campaign_name: "",
      ref: participant.referralToken
    });
  }

  private async findExistingContact(
    people: people_v1.People,
    phone: string
  ): Promise<people_v1.Schema$Person | null> {
    for (const query of buildQueries(phone)) {
      const response = await people.people.searchContacts({
        query,
        pageSize: 10,
        readMask: "names,phoneNumbers,metadata"
      });
      const match =
        response.data.results
          ?.map((result) => result.person)
          .find((person) =>
            person?.phoneNumbers?.some(
              (phoneNumber) => normalizePhone(phoneNumber.value ?? "") === normalizePhone(phone)
            )
          ) ?? null;

      if (match) {
        return match;
      }
    }

    return null;
  }

  private async ensureContactGroup(
    people: people_v1.People,
    campaign: Campaign
  ): Promise<string> {
    if (campaign.googleContactGroupResourceName) {
      return campaign.googleContactGroupResourceName;
    }

    const groups = await people.contactGroups.list({
      pageSize: 200,
      groupFields: "name,groupType"
    });
    const existingGroup = groups.data.contactGroups?.find(
      (group) => group.name === campaign.contactTagName
    );

    if (existingGroup?.resourceName) {
      await this.campaignRepository.updateGoogleContactGroupResourceName(
        campaign.id,
        existingGroup.resourceName
      );
      return existingGroup.resourceName;
    }

    const createdGroup = await people.contactGroups.create({
      requestBody: {
        contactGroup: {
          name: campaign.contactTagName
        }
      }
    });
    const resourceName = createdGroup.data.resourceName;

    if (!resourceName) {
      throw new Error("Failed to create Google contact group.");
    }

    await this.campaignRepository.updateGoogleContactGroupResourceName(
      campaign.id,
      resourceName
    );

    return resourceName;
  }

  private async addPersonToGroup(
    people: people_v1.People,
    groupResourceName: string,
    personResourceName: string
  ): Promise<void> {
    try {
      await people.contactGroups.members.modify({
        resourceName: groupResourceName,
        requestBody: {
          resourceNamesToAdd: [personResourceName]
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (!message.toLowerCase().includes("already")) {
        throw error;
      }
    }
  }

  async createOrUpdateContact(
    account: GoogleSyncAccount,
    campaign: Campaign,
    participant: Participant
  ): Promise<{ personResourceName: string | null; created: boolean; displayName: string }> {
    const people = this.createPeopleApi(account);
    const displayName = this.buildDisplayName(account, participant);
    const groupResourceName = await this.ensureContactGroup(people, campaign);
    const existing = await this.findExistingContact(people, participant.phone);

    if (existing?.resourceName) {
      await this.addPersonToGroup(people, groupResourceName, existing.resourceName);
      return {
        personResourceName: existing.resourceName,
        created: false,
        displayName:
          existing.names?.[0]?.displayName ?? existing.names?.[0]?.givenName ?? displayName
      };
    }

    const created = await people.people.createContact({
      personFields: "names,phoneNumbers,metadata",
      requestBody: {
        names: [
          {
            displayName,
            givenName: participant.name
          }
        ],
        phoneNumbers: [
          {
            value: normalizePhone(participant.phone)
          }
        ],
        userDefined: [
          {
            key: "campaignId",
            value: participant.campaignId
          }
        ]
      }
    });
    const personResourceName = created.data.resourceName ?? null;

    if (personResourceName) {
      await this.addPersonToGroup(people, groupResourceName, personResourceName);
    }

    return {
      personResourceName,
      created: true,
      displayName
    };
  }

  async syncSequentially(
    account: GoogleSyncAccount,
    campaign: Campaign,
    participants: Participant[]
  ): Promise<void> {
    for (const participant of participants) {
      await this.createOrUpdateContact(account, campaign, participant);
    }
  }

  async syncParticipantForWorkspace(
    workspaceId: string,
    participant: Participant
  ): Promise<boolean> {
    const account = await this.workspaceRepository.getGoogleSyncAccount(workspaceId);

    if (!account) {
      return false;
    }

    const existingLedger = await this.ledgerRepository.findByPhone(workspaceId, participant.phone);

    if (existingLedger) {
      await this.ledgerRepository.upsert({
        workspaceId,
        phone: participant.phone,
        displayName: existingLedger.displayName,
        googlePersonResourceName: existingLedger.googlePersonResourceName,
        lastCampaignId: participant.campaignId,
        syncedAt: existingLedger.syncedAt ? new Date(existingLedger.syncedAt) : null,
        lastCheckedAt: new Date()
      });
      return false;
    }

    const campaign = await this.campaignRepository.findById(participant.campaignId);

    if (!campaign) {
      return false;
    }

    const result = await this.createOrUpdateContact(account, campaign, participant);

    await this.ledgerRepository.upsert({
      workspaceId,
      phone: participant.phone,
      displayName: result.displayName,
      googlePersonResourceName: result.personResourceName,
      lastCampaignId: participant.campaignId,
      syncedAt: new Date(),
      lastCheckedAt: new Date()
    });

    return result.created;
  }
}
