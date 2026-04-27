import type {
  CampaignLiveState,
  ConnectionSnapshot,
  OutboundWhatsAppMessage,
  ProviderConnectionConfig,
  WhatsAppProvider
} from "@lottery/core";
import { WhatsAppConnectionRepository } from "@lottery/core";
import { OfficialBusinessProvider } from "../providers/official-provider";
import { UnofficialQrProvider } from "../providers/unofficial-provider";
import type { SocketGateway } from "../socket/socket-gateway";
import type { CampaignService } from "./campaign-service";
import type { QueueManager } from "./queues";

export class SessionOrchestrator {
  private readonly unofficial = new UnofficialQrProvider();
  private readonly official = new OfficialBusinessProvider();
  private readonly connectionProviders = new Map<string, ProviderConnectionConfig["provider"]>();
  private readonly connectionRepository = new WhatsAppConnectionRepository();

  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly campaignService: CampaignService,
    private readonly queues: QueueManager
  ) {
    this.registerProvider(this.unofficial);
    this.registerProvider(this.official);
  }

  async connect(config: ProviderConnectionConfig): Promise<void> {
    this.connectionProviders.set(config.connectionId, config.provider);
    await this.getProvider(config.provider).connect(config);
  }

  async dispatchOutbound(message: OutboundWhatsAppMessage): Promise<void> {
    const providerKey = this.connectionProviders.get(message.connectionId) ?? "unofficial_qr";
    await this.getProvider(providerKey).sendMessage(message);
  }

  private registerProvider(provider: WhatsAppProvider): void {
    provider.onSnapshot((snapshot) => {
      void this.persistSnapshot(snapshot);
      this.socketGateway.broadcastConnectionSnapshot(snapshot);
    });

    provider.onMessage((message) => {
      void this.handleInboundMessage(message);
    });
  }

  private async handleInboundMessage(
    message: Parameters<CampaignService["handleInboundMessage"]>[0]
  ): Promise<void> {
    const result = await this.campaignService.handleInboundMessage(message);

    for (const outbound of result.outbound) {
      await this.queues.enqueueOutbound(outbound);
    }

    for (const participant of result.contactsToSync) {
      await this.queues.enqueueContactSync(participant);
    }

    if (result.liveState) {
      this.broadcastLiveState(result.liveState);
    }
  }

  private getProvider(provider: ProviderConnectionConfig["provider"]): WhatsAppProvider {
    return provider === "official_business" ? this.official : this.unofficial;
  }

  private async persistSnapshot(snapshot: ConnectionSnapshot): Promise<void> {
    await this.connectionRepository.updateSnapshot(snapshot.connectionId, snapshot);
  }

  private broadcastLiveState(state: CampaignLiveState): void {
    this.socketGateway.broadcastCampaignLiveState(state);
  }
}
