import "dotenv/config";
import {
  WhatsAppConnectionRepository,
  bootstrapDevelopmentData
} from "@lottery/core";
import { GoogleContactsSyncService } from "./google/contacts-sync";
import { SocketGateway } from "./socket/socket-gateway";
import { CampaignService } from "./services/campaign-service";
import { QueueManager } from "./services/queues";
import { SessionOrchestrator } from "./services/session-orchestrator";

async function main() {
  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const socketPort = Number(process.env.SOCKET_IO_PORT ?? 3333);

  if (process.env.ENABLE_DEVELOPMENT_SEED === "true") {
    await bootstrapDevelopmentData(baseUrl);
  }

  const socketGateway = new SocketGateway();
  await socketGateway.start(socketPort);

  const campaignService = new CampaignService(baseUrl);
  const connectionRepository = new WhatsAppConnectionRepository();
  const connection = await connectionRepository.getPrimaryConnection();

  if (!connection) {
    throw new Error("No WhatsApp connection found in the database.");
  }

  const googleContactsSync = new GoogleContactsSyncService();
  let orchestrator: SessionOrchestrator;

  const queues = new QueueManager({
    sendMessage: async (message) => {
      await orchestrator.dispatchOutbound(message);
    },
    syncContact: async ({ workspaceId, participant }) => {
      await googleContactsSync.syncParticipantForWorkspace(workspaceId, participant);
    }
  });

  orchestrator = new SessionOrchestrator(
    socketGateway,
    campaignService,
    queues
  );

  await queues.start();
  await orchestrator.connect({
    connectionId: connection.id,
    sessionKey: connection.sessionKey,
    provider: connection.provider,
    officialPhoneNumberId: connection.officialPhoneNumberId,
    officialWabaId: connection.officialWabaId,
    officialAccessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ?? null
  });

  process.stdout.write(`WhatsApp worker listening on Socket.IO port ${socketPort}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
