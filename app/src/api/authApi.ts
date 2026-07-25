import { baseApi } from "./baseApi";
import type { AuthUser } from "../store/authSlice";

interface TokenPair {
  access: string;
  refresh: string;
}

interface AuthResponse extends TokenPair {
  user: AuthUser;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/v1/auth/signup", method: "POST", body }),
    }),
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/v1/auth/login", method: "POST", body }),
    }),
    googleAuth: builder.mutation<AuthResponse, { id_token: string }>({
      query: (body) => ({ url: "/v1/auth/google", method: "POST", body }),
    }),
    logout: builder.mutation<void, { refresh: string }>({
      query: (body) => ({ url: "/v1/auth/logout", method: "POST", body }),
    }),
    me: builder.query<AuthUser, void>({
      query: () => "/v1/auth/me",
      providesTags: ["Me"],
    }),
    updateMe: builder.mutation<AuthUser, Partial<Pick<AuthUser, "display_name" | "avatar_url">>>({
      query: (body) => ({ url: "/v1/auth/me", method: "PATCH", body }),
      invalidatesTags: ["Me"],
    }),
    requestPasswordReset: builder.mutation<{ detail: string }, { email: string }>({
      query: (body) => ({ url: "/v1/auth/password-reset/request", method: "POST", body }),
    }),
    confirmPasswordReset: builder.mutation<{ detail: string }, { token: string; new_password: string }>({
      query: (body) => ({ url: "/v1/auth/password-reset/confirm", method: "POST", body }),
    }),
    deleteAccount: builder.mutation<void, void>({
      query: () => ({ url: "/v1/auth/account/delete", method: "POST" }),
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useGoogleAuthMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateMeMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useDeleteAccountMutation,
} = authApi;
