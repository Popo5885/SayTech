import { EventEmitter } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import qrcode from "qrcode";
import WhatsAppWebJs, { type Message } from "whatsapp-web.js";
import type {
  ConnectionSnapshot,
  IncomingWhatsAppMessage,
  OutboundWhatsAppMessage,
  ProviderConnectionConfig,
  WhatsAppProvider
} from "@lottery/core";

const { Buttons, Client, List, LocalAuth, MessageMedia } = WhatsAppWebJs as any;
const AUTH_DATA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.wwebjs_auth"
);
const HEART_REACTION = "\u2764\ufe0f";

function createSnapshot(
  config: ProviderConnectionConfig,
  overrides: Partial<ConnectionSnapshot>
): ConnectionSnapshot {
  return {
    connectionId: config.connectionId,
    status: "idle",
    provider: config.provider,
    batteryLevel: null,
    qrCode: null,
    phoneNumber: null,
    sessionKey: config.sessionKey,
    lastError: null,
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function normalizeChatId(chatId: string): string {
  return chatId.replace(/@.+$/, "");
}

function normalizeDetectedPhone(value: string | null | undefined): string | null {
  const digits = value?.replace(/@.+$/, "").replace(/[^\d+]/g, "");

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

  return digits;
}

function normalizeOutboundTarget(target: string): string {
  return target.includes("@") ? target : `${target.replace(/^\+/, "")}@c.us`;
}

function isDirectCustomerChat(chatAddress: string): boolean {
  return !chatAddress.endsWith("@g.us") && chatAddress !== "status@broadcast";
}

function extractReferralToken(body: string): string | null {
  const patterns = [
    /(?:^|[?&])ref=([A-Z0-9]{6,12})(?:$|[&#\s])/i,
    /\b(?:ref|code|referral)\s*[:=]?\s*([A-Z0-9]{6,12})\b/i
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);

    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

function buildMessageKey(connectionId: string, providerMessageId: string): string {
  return `${connectionId}:${providerMessageId}`;
}

function buildButtonsMessage(message: OutboundWhatsAppMessage): any | null {
  if (!message.interactive || message.interactive.kind !== "BUTTONS") {
    return null;
  }

  return new Buttons(
    message.body,
    message.interactive.options.map((option) => ({
      id: option.id,
      body: option.label
    })),
    message.interactive.title ?? undefined,
    message.interactive.footer ?? undefined
  );
}

function buildListMessage(message: OutboundWhatsAppMessage): any | null {
  if (!message.interactive || message.interactive.kind !== "LIST") {
    return null;
  }

  return new List(
    message.body,
    message.interactive.buttonText ?? "Select an option",
    [
      {
        title: message.interactive.title ?? "Options",
        rows: message.interactive.options.map((option) => ({
          id: option.id,
          title: option.label,
          description: option.description ?? undefined
        }))
      }
    ],
    message.interactive.title ?? undefined,
    message.interactive.footer ?? undefined
  );
}

async function buildQrImageUrl(rawQrCode: string): Promise<string> {
  return qrcode.toDataURL(rawQrCode, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#111827",
      light: "#ffffff"
    }
  });
}

export class UnofficialQrProvider implements WhatsAppProvider {
  private readonly clients = new Map<string, any>();
  private readonly recentMessages = new Map<string, Message>();
  private readonly snapshots = new Map<string, ConnectionSnapshot>();
  private readonly emitter = new EventEmitter();

  async connect(config: ProviderConnectionConfig): Promise<void> {
    if (this.clients.has(config.connectionId)) {
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: config.sessionKey,
        dataPath: AUTH_DATA_PATH
      }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-extensions"]
      }
    });

    this.clients.set(config.connectionId, client);
    this.pushSnapshot(
      createSnapshot(config, {
        status: "connecting"
      })
    );

    client.on("qr", async (rawQrCode: string) => {
      try {
        const qrImageUrl = await buildQrImageUrl(rawQrCode);

        this.pushSnapshot(
          createSnapshot(config, {
            status: "qr_ready",
            qrCode: qrImageUrl,
            lastError: null
          })
        );
      } catch (error) {
        this.pushSnapshot(
          createSnapshot(config, {
            status: "error",
            qrCode: null,
            lastError:
              error instanceof Error ? error.message : "Failed to generate WhatsApp QR image."
          })
        );
      }
    });

    client.on("ready", async () => {
      let batteryLevel: number | null = null;

      try {
        const batteryStatus = await (
          client.info as { getBatteryStatus?: () => Promise<{ battery?: number }> }
        ).getBatteryStatus?.();
        batteryLevel = batteryStatus?.battery ?? null;
      } catch {
        batteryLevel = null;
      }

      this.pushSnapshot(
        createSnapshot(config, {
          status: "connected",
          qrCode: null,
          batteryLevel,
          phoneNumber: (client.info as { wid?: { user?: string } }).wid?.user
            ? `+${(client.info as { wid?: { user?: string } }).wid?.user}`
            : null,
          lastError: null
        })
      );
    });

    client.on("change_battery", (batteryInfo: { battery?: number }) => {
      const previous = this.snapshots.get(config.connectionId);

      this.pushSnapshot({
        ...(previous ?? createSnapshot(config, {})),
        batteryLevel: batteryInfo.battery ?? previous?.batteryLevel ?? null,
        updatedAt: new Date().toISOString()
      });
    });

    client.on("disconnected", (reason: unknown) => {
      this.pushSnapshot(
        createSnapshot(config, {
          status: "disconnected",
          lastError: String(reason)
        })
      );
      this.clients.delete(config.connectionId);
    });

    client.on("auth_failure", (message: string) => {
      this.pushSnapshot(
        createSnapshot(config, {
          status: "error",
          lastError: message
        })
      );
    });

    client.on("message", async (message: Message) => {
      const rawMessage = message as Message & {
        _data?: {
          notifyName?: string;
        };
        selectedButtonId?: string;
        selectedRowId?: string;
        id?: {
          _serialized?: string;
        };
      };
      const providerMessageId =
        rawMessage.id?._serialized ?? `${normalizeChatId(message.from)}:${message.timestamp}`;
      const chatAddress = message.from;

      if (!isDirectCustomerChat(chatAddress)) {
        return;
      }

      this.recentMessages.set(buildMessageKey(config.connectionId, providerMessageId), message);

      try {
        await message.react(HEART_REACTION);
      } catch {
        // Reactions are best-effort only on some session states.
      }

      const contact = await message.getContact().catch(() => null);
      const interactiveReplyId = rawMessage.selectedButtonId ?? rawMessage.selectedRowId ?? null;
      const detectedPhone =
        normalizeDetectedPhone(contact?.number) ?? normalizeDetectedPhone(chatAddress);

      const payload: IncomingWhatsAppMessage = {
        connectionId: config.connectionId,
        campaignId: null,
        from: detectedPhone ?? normalizeChatId(chatAddress),
        chatAddress,
        pushName: contact?.pushname ?? rawMessage._data?.notifyName ?? null,
        body: message.body?.trim() ? message.body : interactiveReplyId ?? "",
        interactiveReplyId,
        providerMessageId,
        referralToken: extractReferralToken(message.body),
        timestamp: Number(message.timestamp) * 1000
      };

      this.emitter.emit("message", payload);
    });

    await client.initialize();
  }

  async disconnect(connectionId: string): Promise<void> {
    const client = this.clients.get(connectionId);

    if (!client) {
      return;
    }

    await client.destroy();
    this.clients.delete(connectionId);
  }

  async sendMessage(message: OutboundWhatsAppMessage): Promise<void> {
    const client = this.clients.get(message.connectionId);

    if (!client) {
      throw new Error(`No active WhatsApp client for ${message.connectionId}`);
    }

    const target = normalizeOutboundTarget(message.to);

    if (message.mediaUrl) {
      const media = await MessageMedia.fromUrl(message.mediaUrl, {
        unsafeMime: true
      });

      await client.sendMessage(target, media, {
        caption: message.body || undefined
      });
      return;
    }

    const buttons = buildButtonsMessage(message);

    if (buttons) {
      await client.sendMessage(target, buttons);
      return;
    }

    const list = buildListMessage(message);

    if (list) {
      await client.sendMessage(target, list);
      return;
    }

    await client.sendMessage(target, message.body);
  }

  async reactToMessage(
    connectionId: string,
    providerMessageId: string,
    reaction: string
  ): Promise<void> {
    const message = this.recentMessages.get(buildMessageKey(connectionId, providerMessageId));

    if (!message) {
      return;
    }

    await message.react(reaction);
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

  private pushSnapshot(snapshot: ConnectionSnapshot): void {
    this.snapshots.set(snapshot.connectionId, snapshot);
    this.emitter.emit("snapshot", snapshot);
  }
}
