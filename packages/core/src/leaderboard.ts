import {
  type Campaign,
  type DashboardStats,
  type LeaderboardEntry,
  type Participant,
  type ParticipantStatusSnapshot,
  type WinnerDraw
} from "./domain";

export function anonymizeName(name: string): string {
  if (name.length <= 2) {
    return `${name[0] ?? "*"}*`;
  }

  return `${name.slice(0, 1)}***${name.slice(-1)}`;
}

export function buildLeaderboard(participants: Participant[]): LeaderboardEntry[] {
  return [...participants]
    .sort((left, right) => {
      if (right.referralsCount !== left.referralsCount) {
        return right.referralsCount - left.referralsCount;
      }

      if (right.tickets !== left.tickets) {
        return right.tickets - left.tickets;
      }

      return left.joinedAt.localeCompare(right.joinedAt);
    })
    .map((participant, index) => ({
      participantId: participant.id,
      name: participant.name,
      anonymizedName: anonymizeName(participant.name),
      referralsCount: participant.referralsCount,
      tickets: participant.tickets,
      rank: index + 1,
      link: participant.referralLink
    }));
}

export function buildTop10Summary(participants: Participant[]): string {
  const top10 = buildLeaderboard(participants).slice(0, 10);

  if (top10.length === 0) {
    return "עדיין אין הפניות.";
  }

  return top10
    .map(
      (entry) =>
        `${entry.rank}. ${entry.anonymizedName} - ${entry.referralsCount} הפניות`
    )
    .join("\n");
}

export function getParticipantStatusSnapshot(
  participants: Participant[],
  participantId: string
): ParticipantStatusSnapshot | null {
  const leaderboard = buildLeaderboard(participants);
  const entry = leaderboard.find((candidate) => candidate.participantId === participantId);
  const participant = participants.find((candidate) => candidate.id === participantId);

  if (!entry || !participant) {
    return null;
  }

  return {
    participant,
    rank: entry.rank,
    totalParticipants: participants.length,
    leaderboard: leaderboard.slice(0, 10)
  };
}

export function buildDashboardStats(
  campaign: Campaign,
  participants: Participant[],
  messagesSent: number,
  winnerDraws: WinnerDraw[],
  totalReferralEvents: number
): DashboardStats {
  return {
    totalParticipants: participants.length,
    totalMessagesSent: messagesSent,
    totalReferralEvents,
    leaderboard: buildLeaderboard(participants),
    latestWinner:
      winnerDraws.find((draw) => draw.campaignId === campaign.id) ?? null
  };
}

export function drawWinner(
  campaignId: string,
  participants: Participant[]
): WinnerDraw | null {
  if (participants.length === 0) {
    return null;
  }

  const winner = participants[Math.floor(Math.random() * participants.length)];

  return {
    id: `draw_${Date.now()}`,
    campaignId,
    participantId: winner.id,
    participantName: winner.name,
    participantPhone: winner.phone,
    createdAt: new Date().toISOString()
  };
}

export function generateReferralToken(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function normalizeCommand(body: string): string {
  return body.trim().toLowerCase();
}
