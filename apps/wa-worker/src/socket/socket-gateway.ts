import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { CampaignLiveState, ConnectionSnapshot } from "@lottery/core";

export class SocketGateway {
  private readonly httpServer: HttpServer;
  private readonly io: Server;

  constructor() {
    this.httpServer = createServer();
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*"
      }
    });
  }

  async start(port: number): Promise<void> {
    await new Promise<void>((resolve) => {
      this.httpServer.listen(port, () => resolve());
    });
  }

  async stop(): Promise<void> {
    this.io.close();
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  broadcastConnectionSnapshot(snapshot: ConnectionSnapshot): void {
    this.io.emit("connection:snapshot", snapshot);
  }

  broadcastCampaignLiveState(state: CampaignLiveState): void {
    this.io.emit("campaign:live_state", state);
  }
}
