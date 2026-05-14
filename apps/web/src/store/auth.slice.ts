import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  authService,
  type AuthUser,
  type SigninInput,
} from "@/services/auth.service";
import { getApiErrorMessage } from "@/lib/api";

// ── State ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  initialized: boolean; // true once the first getMeThunk has settled
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
  initialized: false,
};

// ── Thunks ────────────────────────────────────────────────────────────────────

export const signinThunk = createAsyncThunk(
  "auth/signin",
  async (data: SigninInput, { rejectWithValue }) => {
    try {
      const { user } = await authService.signin(data);
      return user;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err));
    }
  },
);

export const logoutThunk = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err));
    }
  },
);

export const getMeThunk = createAsyncThunk(
  "auth/getMe",
  async (_, { rejectWithValue }) => {
    try {
      const { user } = await authService.getMe();
      return user;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err));
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuth(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // signin
    builder
      .addCase(signinThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signinThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
      })
      .addCase(signinThunk.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });

    // logout
    builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // getMe
    builder
      .addCase(getMeThunk.pending, (state) => {
        state.status = "loading";
      })
      .addCase(getMeThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(getMeThunk.rejected, (state) => {
        state.status = "idle";
        state.user = null;
        state.initialized = true;
      });
  },
});

export const { clearAuth } = authSlice.actions;
export default authSlice.reducer;

// ── Selectors ─────────────────────────────────────────────────────────────────

export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthInitialized = (state: { auth: AuthState }) => state.auth.initialized;
