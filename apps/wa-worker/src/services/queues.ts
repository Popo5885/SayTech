import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import type { OutboundWhatsAppMessage } from "@lottery/core";
import type { ContactSyncTarget } from "./campaign-service";

export interface DelayedOutboundJob {
  message: OutboundWhatsAppMessage;
  delayMinutes: number;
  automationRuleId?: string;
}

interface QueueHandlers {
  sendMessage: (message: OutboundWhatsAppMessage) => Promise<void>;
  syncContact: (job: ContactSyncTarget) => Promise<void>;
}

export class QueueManager {
  private readonly redis =
    process.env.REDIS_URL
      ? new IORedis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null
        })
      : null;

  private readonly outboundQueue = this.redis
    ? new Queue<OutboundWhatsAppMessage>("outbound-whatsapp", {
        connection: this.redis
      })
    : null;

  private readonly contactQueue = this.redis
    ? new Queue<ContactSyncTarget>("google-contacts-sync", {
        connection: this.redis
      })
    : null;

  private readonly delayedQueue = this.redis
    ? new Queue<DelayedOutboundJob>("delayed-outbound", {
        connection: this.redis
      })
    : null;

  constructor(private readonly handlers: QueueHandlers) {}

  async start(): Promise<void> {
    if (!this.redis) {
      return;
    }

    new Worker(
      "outbound-whatsapp",
      async (job: Job<OutboundWhatsAppMessage>) => {
        await this.handlers.sendMessage(job.data);
      },
      { connection: this.redis }
    );

    new Worker(
      "google-contacts-sync",
      async (job: Job<ContactSyncTarget>) => {
        await this.handlers.syncContact(job.data);
      },
      { connection: this.redis }
    );

    new Worker(
      "delayed-outbound",
      async (job: Job<DelayedOutboundJob>) => {
        await this.handlers.sendMessage(job.data.message);
      },
      { connection: this.redis }
    );
  }

  async enqueueOutbound(message: OutboundWhatsAppMessage): Promise<void> {
    if (!this.outboundQueue) {
      await this.handlers.sendMessage(message);
      return;
    }

    await this.outboundQueue.add("send", message);
  }

  async enqueueContactSync(job: ContactSyncTarget): Promise<void> {
    if (!this.contactQueue) {
      await this.handlers.syncContact(job);
      return;
    }

    await this.contactQueue.add("sync", job);
  }

  async enqueueDelayed(job: DelayedOutboundJob): Promise<void> {
    const delayMs = Math.max(0, job.delayMinutes) * 60 * 1000;

    if (!this.delayedQueue) {
      setTimeout(() => {
        void this.handlers.sendMessage(job.message);
      }, delayMs);
      return;
    }

    await this.delayedQueue.add("delayed-send", job, { delay: delayMs });
  }
}
