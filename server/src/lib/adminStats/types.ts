export type NamedCount = { id: string; name: string; count: number; pct: number };

export type AdminStats = {
  generatedAt: string;
  posts: {
    total: number;
    visible: number;
    hidden: number;
    today: number;
    yesterday: number;
    week: number;
    month: number;
    lastMonth: number;
    withScreenshots: number;
    withComments: number;
    avgPerDayMonth: number;
  };
  comments: { total: number; visible: number; today: number; month: number };
  screenshots: { total: number };
  users: {
    total: number;
    admins: number;
    disabled: number;
    newMonth: number;
    online: number;
    withPosts: number;
  };
  reports: { open: number; resolved: number; dismissed: number };
  invites: { unused: number; used: number };
  catchTypes: NamedCount[];
  waterbodies: NamedCount[];
  fish: NamedCount[];
  authors: NamedCount[];
  days: { date: string; count: number }[];
  months: { date: string; count: number }[];
};
