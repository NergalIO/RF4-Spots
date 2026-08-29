export const CATCH_TYPES = ["farm", "trophy", "farm_trophy"] as const;
export type CatchTypeValue = (typeof CATCH_TYPES)[number];
