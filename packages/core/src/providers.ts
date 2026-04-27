import type {
  ConnectionSnapshot,
  IncomingWhatsAppMessage,
  OutboundWhatsAppMessage,
  WhatsAppProviderKind
} from "./domain";

export interface ProviderConnectionConfig {
  connectionId: string;
  sessionKey: string;
  provider: WhatsAppProviderKind;
  officialPhoneNumberId?: string | null;
  officialWabaId?: string | null;
  officialAccessToken?: string | null;
}

export interface WhatsAppProviderEvents {
  snapshot: ConnectionSnapshot;
  message: IncomingWhatsAppMessage;
}

export interface WhatsAppProvider {
  connect(config: ProviderConnectionConfig): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  sendMessage(message: OutboundWhatsAppMessage): Promise<void>;
  reactToMessage(
    connectionId: string,
    providerMessageId: string,
    reaction: string
  ): Promise<void>;
  getSnapshot(connectionId: string): Promise<ConnectionSnapshot | null>;
  onSnapshot(listener: (snapshot: ConnectionSnapshot) => void): () => void;
  onMessage(listener: (message: IncomingWhatsAppMessage) => void): () => void;
}
