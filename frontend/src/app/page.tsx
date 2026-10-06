"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, getReverbConfig } from "@/lib/api";
import type { AuthResponse, Conversation, Message, User } from "@/lib/types";

const TOKEN_KEY = "chat_token";

type ReverbChannel = {
  listen: (event: string, callback: (message: Message) => void) => ReverbChannel;
  subscribed: (callback: () => void) => ReverbChannel;
  error: (callback: (error: unknown) => void) => ReverbChannel;
};

type ReverbEcho = {
  private: (channel: string) => ReverbChannel;
  leave: (channel: string) => void;
  disconnect: () => void;
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function conversationName(conversation: Conversation, currentUser?: User | null) {
  if (conversation.title) return conversation.title;
  const otherUser = conversation.users?.find((user) => user.id !== currentUser?.id);
  return otherUser?.name ?? conversation.users?.[0]?.name ?? "New conversation";
}

function mergeMessage(messages: Message[], incoming: Message) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming];
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [booting, setBooting] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "offline">("offline");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      window.setTimeout(() => setBooting(false), 0);
      return;
    }

    api.me(savedToken)
      .then(({ user }) => {
        setToken(savedToken);
        setCurrentUser(user);
      })
      .catch(() => window.localStorage.removeItem(TOKEN_KEY))
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    api.conversations(token)
      .then((response) => {
        setConversations(response.data);
        setSelectedId((current) => current ?? response.data[0]?.id ?? null);
      })
      .catch((error: ApiError) => setNotice(error.message));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedId) {
      return;
    }

    Promise.resolve()
      .then(() => setLoadingMessages(true))
      .then(() => api.messages(token, selectedId))
      .then((response) => setMessages([...response.data].reverse()))
      .catch((error: ApiError) => setNotice(error.message))
      .finally(() => setLoadingMessages(false));
  }, [token, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!token || !selectedId) {
      return;
    }

    let echo: ReverbEcho | null = null;
    const channelName = `conversations.${selectedId}`;
    let cancelled = false;
    const statusTimer = window.setTimeout(() => setRealtimeStatus("connecting"), 0);

    async function subscribe() {
      const [{ default: Echo }, { default: Pusher }] = await Promise.all([
        import("laravel-echo"),
        import("pusher-js"),
      ]);
      if (cancelled) return;

      const config = getReverbConfig();
      if (!config.key) throw new Error("NEXT_PUBLIC_REVERB_APP_KEY is not configured.");

      const pusherWindow = window as Window & { Pusher?: typeof Pusher };
      pusherWindow.Pusher = Pusher;
      echo = new Echo({
        broadcaster: "reverb",
        key: config.key,
        wsHost: config.host,
        wsPort: config.port,
        wssPort: config.port,
        forceTLS: config.scheme === "https",
        enabledTransports: ["ws", "wss"],
        authEndpoint: config.authEndpoint,
        bearerToken: token,
        auth: { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
      });

      echo.private(channelName)
        .subscribed(() => setRealtimeStatus("live"))
        .error((error) => {
          console.error("Reverb channel subscription failed", error);
          setRealtimeStatus("offline");
        })
        .listen(".message.sent", (message) => setMessages((current) => mergeMessage(current, message)));
    }

    subscribe().catch((error) => {
      console.error("Reverb connection failed", error);
      setRealtimeStatus("offline");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(statusTimer);
      echo?.leave(channelName);
      echo?.disconnect();
    };
  }, [token, selectedId]);

  useEffect(() => {
    if (!newChatOpen || !token) return;

    const timer = window.setTimeout(() => {
      setUsersLoading(true);
      api.users(token, userSearch)
        .then((response) => setUserResults(response.data))
        .catch((error: ApiError) => setNotice(error.message))
        .finally(() => setUsersLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [newChatOpen, token, userSearch]);

  function startSession(response: AuthResponse) {
    window.localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setCurrentUser(response.user);
    setAuthError("");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const response = authMode === "login"
        ? await api.login({ email, password })
        : await api.register({ name: String(form.get("name") ?? ""), email, password });
      startSession(response);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    if (token) await api.logout(token).catch(() => undefined);
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setConversations([]);
    setMessages([]);
    setSelectedId(null);
  }

  async function createConversation(user: User) {
    if (!token) return;
    try {
      const conversation = await api.createConversation(token, [user.id]);
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      setSelectedId(conversation.id);
      setNewChatOpen(false);
      setUserSearch("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create conversation.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedId || !composer.trim() || sending) return;

    const body = composer.trim();
    setComposer("");
    setSending(true);
    try {
      const message = await api.sendMessage(token, selectedId, body);
      setMessages((current) => mergeMessage(current, message));
      setConversations((current) => current.map((conversation) => (
        conversation.id === selectedId ? { ...conversation, updated_at: message.created_at } : conversation
      )));
    } catch (error) {
      setComposer(body);
      setNotice(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  if (booting) {
    return <div className="loading-screen">Loading your conversations<span className="pulse-dots">...</span></div>;
  }

  if (!token || !currentUser) {
    return (
      <main className="auth-shell">
        <section className="auth-intro">
          <p className="eyebrow">A quieter place to talk</p>
          <h1>Good conversations have room to breathe.</h1>
          <p className="intro-copy">A small, focused chat space for the people and ideas you want close.</p>
          <div className="intro-mark" aria-hidden="true"><span>••</span><i /></div>
        </section>
        <section className="auth-card">
          <div className="auth-card-top"><div className="brand-mark">ch<span>at</span></div><span className="status-dot">Private beta</span></div>
          <div className="auth-heading"><p className="eyebrow">{authMode === "login" ? "Welcome back" : "Make an account"}</p><h2>{authMode === "login" ? "Pick up where you left off." : "Start a new thread."}</h2></div>
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "register" && <label><span>Your name</span><input name="name" required placeholder="Ada Lovelace" /></label>}
            <label><span>Email address</span><input name="email" type="email" required placeholder="you@example.com" /></label>
            <label><span>Password</span><input name="password" type="password" minLength={8} required placeholder="8 characters minimum" /></label>
            {authError && <p className="form-error">{authError}</p>}
            <button className="primary-button" disabled={authLoading}>{authLoading ? "One moment..." : authMode === "login" ? "Enter chat" : "Create account"}<span>→</span></button>
          </form>
          <button className="text-button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>{authMode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header"><div className="brand-mark">ch<span>at</span></div><button className="icon-button" onClick={() => setNewChatOpen(true)} aria-label="Start new conversation">+</button></div>
        <div className="sidebar-label"><span>Conversations</span><span>{conversations.length}</span></div>
        <div className="conversation-list">
          {conversations.length === 0 && <div className="empty-sidebar"><span className="empty-icon">✦</span><p>No conversations yet.</p><small>Start one with the + above.</small></div>}
          {conversations.map((conversation) => <button key={conversation.id} className={`conversation-item ${selectedId === conversation.id ? "selected" : ""}`} onClick={() => setSelectedId(conversation.id)}><span className="avatar">{initials(conversationName(conversation, currentUser))}</span><span className="conversation-copy"><strong>{conversationName(conversation, currentUser)}</strong><small>{conversation.messages_count ? `${conversation.messages_count} messages` : "No messages yet"}</small></span><span className="conversation-time">{formatTime(conversation.updated_at)}</span></button>)}
        </div>
        <div className="profile-card"><span className="avatar avatar-small">{initials(currentUser.name)}</span><span className="profile-copy"><strong>{currentUser.name}</strong><small>Online now</small></span><button className="logout-button" onClick={logout}>↗</button></div>
      </aside>

      <section className="chat-panel">
        {selectedConversation ? <>
          <header className="chat-header"><div><p className="eyebrow">Your conversation</p><h1>{conversationName(selectedConversation, currentUser)}</h1></div><div className={`online-status ${realtimeStatus}`}><span /> {realtimeStatus === "live" ? "Reverb live" : realtimeStatus === "connecting" ? "Connecting…" : "Reverb offline"}</div></header>
          <div className="message-area">
            <div className="date-divider"><span>Today</span></div>
            {loadingMessages && <p className="message-state">Loading messages...</p>}
            {!loadingMessages && messages.length === 0 && <div className="message-state"><span className="empty-icon">✦</span><p>This is the beginning.</p><small>Send the first message below.</small></div>}
            <div className="messages">{messages.map((message) => { const own = message.user.id === currentUser.id; return <article key={message.id} className={`message-row ${own ? "own" : ""}`}><span className="message-avatar">{initials(message.user.name)}</span><div className="message-content"><div className="message-meta"><strong>{own ? "You" : message.user.name}</strong><time>{formatTime(message.created_at)}</time></div><p className="message-bubble">{message.body}</p></div></article>; })}<div ref={messagesEndRef} /></div>
          </div>
          <form className="composer" onSubmit={sendMessage}><input value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Write a message..." aria-label="Message" /><button disabled={sending || !composer.trim()} aria-label="Send message">{sending ? "…" : "↑"}</button></form>
        </> : <div className="no-conversation"><span className="empty-icon">✦</span><h1>Your space is ready.</h1><p>Choose a conversation or start a new one.</p><button className="primary-button compact" onClick={() => setNewChatOpen(true)}>Start a conversation <span>→</span></button></div>}
      </section>

      {newChatOpen && <div className="modal-backdrop" onClick={() => setNewChatOpen(false)}><section className="new-chat-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">New conversation</p><h2>Who would you like to talk to?</h2></div><button className="close-button" onClick={() => setNewChatOpen(false)}>×</button></div><input className="search-input" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} autoFocus placeholder="Search by name or email" /><div className="user-results">{usersLoading ? <p className="message-state">Searching...</p> : userResults.length === 0 ? <p className="message-state">No people found.</p> : userResults.map((user) => <button className="user-result" key={user.id} onClick={() => createConversation(user)}><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><span className="result-arrow">→</span></button>)}</div></section></div>}
      {notice && <button className="notice" onClick={() => setNotice("")}>{notice} <span>×</span></button>}
    </main>
  );
}
