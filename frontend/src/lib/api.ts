import type {
  AuthResponse,
  Conversation,
  Message,
  Paginated,
  User,
} from "@/lib/types";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiOptions = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const validationMessage = payload?.errors
      ? Object.values(payload.errors).flat().join(" ")
      : null;
    throw new ApiError(
      validationMessage || payload?.message || "Something went wrong.",
      response.status,
    );
  }

  return payload as T;
}

export const api = {
  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: { ...body, password_confirmation: body.password } }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body }),
  me: (token: string) => request<{ user: User }>("/me", {}, token),
  logout: (token: string) => request<{ message: string }>("/auth/logout", { method: "POST" }, token),
  users: (token: string, search = "") =>
    request<Paginated<User>>(`/users?search=${encodeURIComponent(search)}`, {}, token),
  conversations: (token: string) => request<Paginated<Conversation>>("/conversations", {}, token),
  conversation: (token: string, id: number) =>
    request<Conversation>(`/conversations/${id}`, {}, token),
  createConversation: (token: string, userIds: number[]) =>
    request<Conversation>("/conversations", {
      method: "POST",
      body: { user_ids: userIds },
    }, token),
  messages: (token: string, conversationId: number) =>
    request<Paginated<Message>>(`/conversations/${conversationId}/messages`, {}, token),
  sendMessage: (token: string, conversationId: number, body: string) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: { body },
    }, token),
};

export function getReverbConfig() {
  return {
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? "",
    host: process.env.NEXT_PUBLIC_REVERB_HOST ?? "localhost",
    port: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    scheme: process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http",
    authEndpoint: `${API_URL.replace(/\/api$/, "")}/broadcasting/auth`,
  };
}
