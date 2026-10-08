import client from "./client";
import type { User, TokenResponse } from "../types";

export const authApi = {
  login: (username: string, password: string) =>
    client<TokenResponse>("/auth/login/json", {
      method: "POST",
      body: { username, password },
    }),

  register: (username: string, email: string, password: string) =>
    client<User>("/auth/register", {
      method: "POST",
      body: { username, email, password },
    }),

  googleLogin: (credential: string) =>
    client<TokenResponse>("/auth/google", {
      method: "POST",
      body: { credential },
    }),


  refresh: (refreshToken: string) =>
    client<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),

  forgotPassword: (email: string) =>
    client<{ message: string; reset_token?: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPassword: (token: string, newPassword: string) =>
    client<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
    }),

  me: () => client<User>("/auth/me"),
};

