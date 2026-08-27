export type Role = "player" | "admin";
export type CatchType = "farm" | "trophy" | "farm_trophy";

export type User = {
  id: string;
  nickname: string;
  role: Role;
};

export type Fish = {
  id: string;
  name: string;
  waterbodies: string[];
};

export type Waterbody = {
  id: string;
  name: string;
  metersPerCell: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  yFlipped: boolean;
  imageFile: string;
  imageWidth: number;
  imageHeight: number;
  padLeft: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  cellPx: number;
  rf4mapLocationId: number | null;
  sortOrder: number;
  mapUrl: string;
};

export type Screenshot = { id: string; url: string };

export type CommentItem = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  screenshots: Screenshot[];
};

export type PostMarker = {
  id: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  fishName: string;
};

export type Post = {
  id: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  catchDate: string;
  comment: string;
  weightKg: number | null;
  bait: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots: Screenshot[];
  commentsCount: number;
  commentsMeta: { id: string; createdAt: string; userId: string }[];
  comments?: CommentItem[];
  favorited: boolean;
};

export type GuideValue = string | number | null;
export type GuideRow = Record<string, GuideValue>;
export type GuideDataset = {
  key: string;
  updatedAt: string;
  rows: GuideRow[];
};

export type Filters = {
  fishId: string;
  catchType: "" | CatchType;
  catchFrom: string;
  catchTo: string;
  uploadedFrom: string;
  uploadedTo: string;
  sort: "createdAt" | "catchDate";
  mine: boolean;
  favorite: boolean;
  q: string;
};

export type SessionCatch = {
  id: string;
  fishId: string | null;
  fishName: string;
  fishNameRaw: string;
  weightKg: number | null;
  catchType: CatchType | null;
  ocrText: string;
  createdAt: string;
};

export type SessionEarning = {
  id: string;
  kind: "in" | "out";
  amount: string;
  createdAt: string;
};

export type FishingSession = {
  id: string;
  waterbodyId: string;
  waterbody: { id: string; name: string };
  startedAt: string;
  endedAt: string | null;
  openingCash: string;
  catches: SessionCatch[];
  earnings: SessionEarning[];
};

export type AdminUser = User & {
  createdAt: string;
  disabledAt: string | null;
};

export type Invite = {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdBy: User;
  usedBy: User | null;
};

export type ModerationReport = {
  id: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  resolvedAt: string | null;
  reporter: User;
  resolvedBy: User | null;
  post: { id: string; excerpt: string; fishName: string; deleted: boolean } | null;
  comment: { id: string; postId: string; excerpt: string; deleted: boolean } | null;
};

declare global {
  interface Window {
    rf4?: {
      storeGet: () => Promise<{ serverUrl?: string; token?: string }>;
      storeSet: (data: { serverUrl: string; token?: string }) => Promise<boolean>;
      ocrCapture?: () => Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
      tessLangPath?: () => Promise<string>;
    };
  }
}
