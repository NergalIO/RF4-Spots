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

export type Post = {
  id: string;
  coordX: number;
  coordY: number;
  catchType: CatchType;
  catchDate: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  fish: { id: string; name: string };
  waterbody: { id: string; name: string };
  screenshots: Screenshot[];
  commentsCount: number;
  comments?: CommentItem[];
};

export type Filters = {
  fishId: string;
  catchType: "" | CatchType;
  catchFrom: string;
  catchTo: string;
  uploadedFrom: string;
  uploadedTo: string;
  sort: "createdAt" | "catchDate";
};

declare global {
  interface Window {
    rf4?: {
      storeGet: () => Promise<{ serverUrl?: string; token?: string }>;
      storeSet: (data: { serverUrl: string; token?: string }) => Promise<boolean>;
    };
  }
}
