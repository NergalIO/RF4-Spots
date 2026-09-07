import { create } from "zustand";
import { createAuthSlice } from "./authSlice";
import { createSpotsSlice } from "./spotsSlice";
import { bindSync } from "./sync";
import type { Store } from "./types";

export const useStore = create<Store>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSpotsSlice(...a),
}));

bindSync(useStore);
