import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from ".";

interface AppState {
  globalError: string | null;
}

const appSlice = createSlice({
  name: "app",
  initialState: { globalError: null } as AppState,
  reducers: {
    setGlobalError(state, action: PayloadAction<string>) {
      state.globalError = action.payload;
    },
    clearGlobalError(state) {
      state.globalError = null;
    },
  },
});

export const { setGlobalError, clearGlobalError } = appSlice.actions;
export default appSlice.reducer;

export const selectGlobalError = (state: RootState) => state.app.globalError;
