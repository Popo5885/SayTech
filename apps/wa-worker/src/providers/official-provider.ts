import { EventEmitter } from "node:events";
import type {
  ConnectionSnapshot,
  IncomingWhatsAppMessage,
  OutboundWhatsAppMessage,
  ProviderConnectionConfig,
  WhatsAppProvider
} from "@lottery/core";

type OfficialRuntimeConfig = ProviderConnectionConfig & {
  officialPhoneNumberId: string;
  officialAccessToken: string;
};

function normalizeRecipient(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION ?? "v20.0";
}

export class OfficialBusinessProvider implements WhatsAppProvider {
  private readonly snapshots = new Map<string, ConnectionSnapshot>();
  private readonly configs = new Map<string, OfficialRuntimeConfig>();
  private readonly emitter = new EventEmitter();

  async connect(config: ProviderConnectionConfig): Promise<void> {
    const accessToken = config.officialAccessToken ?? process.env.META_WHATSAPP_ACCESS_TOKEN ?? null;
    const phoneNumberId = config.officialPhoneNumberId ?? null;

    if (!accessToken || !phoneNumberId) {
      const snapshot: ConnectionSnapshot = {
        connectionId: config.connectionId,
        status: "error",
        provider: config.provider,
        batteryLevel: null,
        qrCode: null,
        phoneNumber: null,
        sessionKey: config.sessionKey,
        lastError:
          "WhatsApp Business Cloud requires an access token and Phone Number ID before it can send real messages.",
        updatedAt: new Date().toISOString()
      };

      this.snapshots.set(config.connectionId, snapshot);
      this.emitter.emit("snapshot", snapshot);
      return;
    }

    this.configs.set(config.connectionId, {
      ...config,
      officialPhoneNumberId: phoneNumberId,
      officialAccessToken: accessToken
    });

    const snapshot: ConnectionSnapshot = {
      connectionId: config.connectionId,
      status: "connected",
      provider: config.provider,
      batteryLevel: null,
      qrCode: null,
      phoneNumber: null,
      sessionKey: config.sessionKey,
      lastError: null,
      updatedAt: new Date().toISOString()
    };

    this.snapshots.set(config.connectionId, snapshot);
    this.emitter.emit("snapshot", snapshot);
  }

  async disconnect(connectionId: string): Promise<void> {
    this.configs.delete(connectionId);
    this.snapshots.delete(connectionId);
  }

  async sendMessage(message: OutboundWhatsAppMessage): Promise<void> {
    const config = this.configs.get(message.connectionId);

    if (!config) {
      throw new Error("Official WhatsApp Business connection is not configured.");
    }

    const endpoint = `https://graph.facebook.com/${graphVersion()}/${config.officialPhoneNumberId}/messages`;
    const body = this.buildCloudPayload(message);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.officialAccessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`WhatsApp Business Cloud send failed: ${payload}`);
    }
  }

  async reactToMessage(
    _connectionId: string,
    _providerMessageId: string,
    _reaction: string
  ): Promise<void> {
    // The Cloud API path is intentionally no-op here; message delivery stays real and auditable.
  }

  async getSnapshot(connectionId: string): Promise<ConnectionSnapshot | null> {
    return this.snapshots.get(connectionId) ?? null;
  }

  onSnapshot(listener: (snapshot: ConnectionSnapshot) => void): () => void {
    this.emitter.on("snapshot", listener);

    return () => {
      this.emitter.off("snapshot", listener);
    };
  }

  onMessage(listener: (message: IncomingWhatsAppMessage) => void): () => void {
    this.emitter.on("message", listener);

    return () => {
      this.emitter.off("message", listener);
    };
  }

  private buildCloudPayload(message: OutboundWhatsAppMessage) {
    const to = normalizeRecipient(message.to);

    if (message.mediaUrl && message.mediaType === "IMAGE") {
      return {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: {
          link: message.mediaUrl,
          caption: message.body
        }
      };
    }

    if (message.mediaUrl && message.mediaType === "VIDEO") {
      return {
        messaging_product: "whatsapp",
        to,
        type: "video",
        video: {
          link: message.mediaUrl,
          caption: message.body
        }
      };
    }

    return {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: true,
        body: message.body
      }
    };
  }
}
