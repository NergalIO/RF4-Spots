import { create } from "zustand";
import { createAuthSlice } from "./store/authSlice";
import { createSpotsSlice } from "./store/spotsSlice";
import { bindSync } from "./store/sync";
import type { Store } from "./store/types";

export const useStore = create<Store>()((...a) => ({
  ...createAuthSlice(...a),
  ...createSpotsSlice(...a),
}));

bindSync(useStore);
