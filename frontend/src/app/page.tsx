"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { ChatWindow } from "@/components/chat-window";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { NewChatModal } from "@/components/new-chat-modal";
import { api, ApiError, getReverbConfig } from "@/lib/api";
import { conversationName, mergeMessage } from "@/lib/chat";
import type { AuthResponse, Conversation, ConversationCreatedEvent, ConversationDeletedEvent, ConversationUpdatedEvent, Message, User } from "@/lib/types";

const TOKEN_KEY = "chat_token";

type ReverbChannel = {
  listen: (event: string, callback: (payload: unknown) => void) => ReverbChannel;
  subscribed: (callback: () => void) => ReverbChannel;
  error: (callback: (error: unknown) => void) => ReverbChannel;
};

type ReverbEcho = {
  private: (channel: string) => ReverbChannel;
  leave: (channel: string) => void;
  disconnect: () => void;
};

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [booting, setBooting] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingTitle, setUpdatingTitle] = useState(false);
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
    if (!token || !selectedId) return;

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
    if (!token || !currentUser) return;

    let echo: ReverbEcho | null = null;
    const userChannelName = `App.Models.User.${currentUser.id}`;
    const conversationChannelName = selectedId ? `conversations.${selectedId}` : null;
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

      echo.private(userChannelName)
        .error((error) => console.error("Reverb user channel subscription failed", error))
        .listen(".conversation.created", (payload) => {
          const event = payload as ConversationCreatedEvent;
          setConversations((current) => current.some((conversation) => conversation.id === event.conversation.id)
            ? current
            : [event.conversation, ...current]);
        })
        .listen(".conversation.deleted", (payload) => {
          const event = payload as ConversationDeletedEvent;
          setConversations((current) => current.filter((conversation) => conversation.id !== event.conversation_id));
          if (selectedId === event.conversation_id) {
            setMessages([]);
            setSelectedId(null);
          }
        })
        .listen(".conversation.updated", (payload) => {
          const event = payload as ConversationUpdatedEvent;
          setConversations((current) => current.map((conversation) => conversation.id === event.conversation.id
            ? { ...conversation, ...event.conversation, messages_count: conversation.messages_count }
            : conversation));
        });

      if (conversationChannelName) {
        echo.private(conversationChannelName)
          .subscribed(() => setRealtimeStatus("live"))
          .error((error) => {
            console.error("Reverb conversation channel subscription failed", error);
            setRealtimeStatus("offline");
          })
          .listen(".message.sent", (payload) => setMessages((current) => mergeMessage(current, payload as Message)));
      }
    }

    subscribe().catch((error) => {
      console.error("Reverb connection failed", error);
      setRealtimeStatus("offline");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(statusTimer);
      echo?.leave(userChannelName);
      if (conversationChannelName) echo?.leave(conversationChannelName);
      echo?.disconnect();
    };
  }, [token, currentUser, selectedId]);

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

  async function deleteConversation() {
    if (!token || !selectedConversation || deleting) return;

    const name = conversationName(selectedConversation, currentUser);
    if (!window.confirm(`Delete the conversation with ${name}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await api.deleteConversation(token, selectedConversation.id);
      const remaining = conversations.filter((conversation) => conversation.id !== selectedConversation.id);
      setConversations(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setMessages([]);
      setNotice("Conversation deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete conversation.");
    } finally {
      setDeleting(false);
    }
  }

  async function updateConversationTitle(title: string | null) {
    if (!token || !selectedConversation || updatingTitle) return;

    setUpdatingTitle(true);
    try {
      const updatedConversation = await api.updateConversation(token, selectedConversation.id, title);
      setConversations((current) => current.map((conversation) => conversation.id === updatedConversation.id
        ? { ...conversation, ...updatedConversation, messages_count: conversation.messages_count }
        : conversation));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update conversation title.");
      throw error;
    } finally {
      setUpdatingTitle(false);
    }
  }

  if (booting) {
    return <div className="loading-screen">Loading your conversations<span className="pulse-dots">...</span></div>;
  }

  if (!token || !currentUser) {
    return <AuthPanel mode={authMode} loading={authLoading} error={authError} onSubmit={submitAuth} onToggleMode={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }} />;
  }

  return (
    <main className="app-shell">
      <ConversationSidebar currentUser={currentUser} conversations={conversations} selectedId={selectedId} onSelect={setSelectedId} onNewChat={() => setNewChatOpen(true)} onLogout={logout} />
      {selectedConversation ? <ChatWindow conversation={selectedConversation} currentUser={currentUser} messages={messages} loadingMessages={loadingMessages} composer={composer} sending={sending} deleting={deleting} updatingTitle={updatingTitle} realtimeStatus={realtimeStatus} messagesEndRef={messagesEndRef} onComposerChange={setComposer} onSend={sendMessage} onDelete={deleteConversation} onUpdateTitle={updateConversationTitle} /> : <section className="chat-panel"><div className="no-conversation"><span className="empty-icon">✦</span><h1>Your space is ready.</h1><p>Choose a conversation or start a new one.</p><button className="primary-button compact" onClick={() => setNewChatOpen(true)}>Start a conversation <span>→</span></button></div></section>}
      {newChatOpen && <NewChatModal search={userSearch} users={userResults} loading={usersLoading} onSearchChange={setUserSearch} onClose={() => setNewChatOpen(false)} onSelectUser={createConversation} />}
      {notice && <button className="notice" onClick={() => setNotice("")}>{notice} <span>×</span></button>}
    </main>
  );
}
