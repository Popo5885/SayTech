export type WhatsAppProviderKind = "unofficial_qr" | "official_business";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "qr_ready"
  | "connected"
  | "disconnected"
  | "error";

export type CampaignMode = "REFERRAL" | "TRIGGER_JOIN";

export type MessageTemplateKey =
  | "WELCOME"
  | "REFERRER_PROMPT"
  | "SAVE_CONTACT_PROMPT"
  | "REGISTRATION_PAUSED"
  | "MAIN_MENU"
  | "LINK"
  | "JOIN_WHATSAPP_PROMPT"
  | "STATUS_TICKETS"
  | "WINNER"
  | "SELF_STATUS"
  | "REFERRAL_UPDATE"
  | "LEADERBOARD_SUMMARY";

export type MediaType = "IMAGE" | "VIDEO";

export type ParticipantOnboardingState =
  | "AWAITING_NAME"
  | "AWAITING_REFERRER"
  | "AWAITING_STATUS_PROOF"
  | "AWAITING_CONTACT_SAVED"
  | "REGISTERED";

export type AccountStatus = "pending" | "active" | "suspended" | "rejected";

export type GlobalRole = "SUPER_ADMIN" | "USER";

export type WorkspaceRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export type TemplateInteractiveKind = "NONE" | "BUTTONS" | "LIST";

export interface TemplateInteractiveOption {
  id: string;
  label: string;
  description?: string | null;
}

export interface TemplateInteractiveConfig {
  kind: TemplateInteractiveKind;
  title?: string | null;
  footer?: string | null;
  buttonText?: string | null;
  options: TemplateInteractiveOption[];
}

export type DrawWeightMode =
  | "ONE_PER_PARTICIPANT"
  | "STORED_TICKETS"
  | "REFERRALS_HALVED";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  accountStatus?: AccountStatus;
  maxCampaigns?: number;
  monthlyMessageLimit?: number | null;
  hasTelegramSupport?: boolean;
  contractSignedAt?: string | null;
  phoneNumber?: string | null;
  whatsappStatus?: "CONNECTED" | "DISCONNECTED";
  createdAt: string;
}

export interface WhatsAppConnection {
  id: string;
  workspaceId: string;
  provider: WhatsAppProviderKind;
  label: string;
  status: ConnectionStatus;
  maxTenants?: number;
  currentTenants?: number;
  batteryLevel: number | null;
  qrCode: string | null;
  phoneNumber: string | null;
  sessionKey: string;
  officialPhoneNumberId?: string | null;
  officialWabaId?: string | null;
  lastError: string | null;
  updatedAt: string;
}

export interface CampaignMessageTemplate {
  id: string;
  campaignId: string;
  key: MessageTemplateKey;
  label: string;
  value: string;
  isEnabled: boolean;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  interactive: TemplateInteractiveConfig | null;
}

export interface CampaignTemplateUpdateInput {
  key: MessageTemplateKey;
  value: string;
  isEnabled?: boolean;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  interactive?: TemplateInteractiveConfig | null;
}

export interface CampaignSettingsUpdate {
  drawDate?: string | null;
  drawWeightMode?: DrawWeightMode;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  connectionId: string;
  name: string;
  slug: string;
  mode: CampaignMode;
  triggerWord: string | null;
  drawDate: string | null;
  drawWeightMode: DrawWeightMode;
  contactTagName: string;
  googleContactGroupResourceName: string | null;
  statusCommandAliases: string[];
  isActive: boolean;
  messageCount: number;
  createdAt: string;
  templates: CampaignMessageTemplate[];
}

export interface Participant {
  id: string;
  campaignId: string;
  name: string;
  phone: string;
  chatAddress: string | null;
  referralToken: string;
  referralLink: string;
  referralsCount: number;
  tickets: number;
  joinedAt: string;
  referredByParticipantId: string | null;
  onboardingState: ParticipantOnboardingState;
  contactSavedConfirmed: boolean;
  statusProofReceived?: boolean;
  statusProofMediaUrl?: string | null;
  pendingReferralCode: string | null;
  pendingReferrerPhone: string | null;
}

export interface WorkspaceContactCard {
  id: string;
  workspaceId: string;
  displayName: string;
  phone: string;
  organization: string | null;
  sortOrder: number;
  isEnabled: boolean;
}

export interface MessageLogEntry {
  id: string;
  workspaceId: string;
  campaignId: string | null;
  connectionId: string;
  participantId: string | null;
  direction: "INBOUND" | "OUTBOUND";
  status: "queued" | "sent" | "failed" | "received";
  providerMessageId: string | null;
  body: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface ContactSyncLedgerEntry {
  id: string;
  workspaceId: string;
  phone: string;
  displayName: string;
  googlePersonResourceName: string | null;
  lastCampaignId: string | null;
  syncedAt: string | null;
  lastCheckedAt: string;
}

export interface WinnerDraw {
  id: string;
  campaignId: string;
  participantId: string;
  participantName: string;
  participantPhone: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  anonymizedName: string;
  referralsCount: number;
  tickets: number;
  rank: number;
  link: string;
}

export interface ParticipantStatusSnapshot {
  participant: Participant;
  rank: number;
  totalParticipants: number;
  leaderboard: LeaderboardEntry[];
}

export interface DashboardStats {
  totalParticipants: number;
  totalMessagesSent: number;
  totalReferralEvents: number;
  leaderboard: LeaderboardEntry[];
  latestWinner: WinnerDraw | null;
}

export interface CampaignLiveState {
  campaign: Campaign;
  participants: Participant[];
  stats: DashboardStats;
  updatedAt: string;
}

export interface TemplatePreviewContext {
  name: string;
  tickets: number;
  link: string;
  referrals: number;
  rank: number;
  top10: string;
  contact_phone: string;
  campaign_name: string;
  ref: string;
}

export interface IncomingWhatsAppMessage {
  connectionId: string;
  campaignId?: string | null;
  from: string;
  chatAddress: string | null;
  pushName: string | null;
  body: string;
  interactiveReplyId?: string | null;
  providerMessageId: string;
  referralToken?: string | null;
  timestamp: number;
}

export interface OutboundWhatsAppMessage {
  connectionId: string;
  to: string;
  body: string;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  interactive: TemplateInteractiveConfig | null;
}

export interface ConnectionSnapshot {
  connectionId: string;
  status: ConnectionStatus;
  provider: WhatsAppProviderKind;
  batteryLevel: number | null;
  qrCode: string | null;
  phoneNumber: string | null;
  sessionKey: string;
  lastError: string | null;
  updatedAt: string;
  workerOnline?: boolean;
}

export const DEFAULT_STATUS_COMMANDS = [
  "סטטוס",
  "כמה כרטיסים יש לי",
  "כרטיסים",
  "my status",
  "my tickets"
] as const;

export const SUPPORTED_TEMPLATE_VARIABLES = [
  "name",
  "tickets",
  "link",
  "referrals",
  "rank",
  "top10",
  "contact_phone",
  "campaign_name",
  "ref"
] as const;
