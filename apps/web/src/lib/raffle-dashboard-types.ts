export type RaffleDashboardData = {
  campaign: {
    id: string;
    name: string;
    slug: string;
    triggerWord: string | null;
    drawDate: string | null;
    isActive: boolean;
  };
  workspace: {
    id: string;
    name: string;
  };
  shareUrl: string;
  totals: {
    entered: number;
    tickets: number;
    shared: number;
    saved: number;
  };
  recent: {
    newSignups24h: number;
    activity24h: number;
    activityLastHour: number;
  };
  contacts: {
    savedInAccount: number;
    newContacts: number;
    downloadable: number;
    savedFilterCount: number;
  };
  hasData: boolean;
  updatedAt: string;
};
