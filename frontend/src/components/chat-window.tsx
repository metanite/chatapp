"use client";

import type { FormEvent, RefObject } from "react";
import type { Conversation, Message, User } from "@/lib/types";
import { conversationName, formatTime, initials } from "@/lib/chat";

type RealtimeStatus = "connecting" | "live" | "offline";

type ChatWindowProps = {
  conversation: Conversation;
  currentUser: User;
  messages: Message[];
  loadingMessages: boolean;
  composer: string;
  sending: boolean;
  deleting: boolean;
  realtimeStatus: RealtimeStatus;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onComposerChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
};

export function ChatWindow({ conversation, currentUser, messages, loadingMessages, composer, sending, deleting, realtimeStatus, messagesEndRef, onComposerChange, onSend, onDelete }: ChatWindowProps) {
  return (
    <section className="chat-panel">
      <header className="chat-header"><div><p className="eyebrow">Your conversation</p><h1>{conversationName(conversation, currentUser)}</h1></div><div className="chat-header-actions"><div className={`online-status ${realtimeStatus}`}><span /> {realtimeStatus === "live" ? "Reverb live" : realtimeStatus === "connecting" ? "Connecting…" : "Reverb offline"}</div><button className="delete-button" onClick={onDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button></div></header>
      <div className="message-area">
        <div className="date-divider"><span>Today</span></div>
        {loadingMessages && <p className="message-state">Loading messages...</p>}
        {!loadingMessages && messages.length === 0 && <div className="message-state"><span className="empty-icon">✦</span><p>This is the beginning.</p><small>Send the first message below.</small></div>}
        <div className="messages">{messages.map((message) => { const own = message.user.id === currentUser.id; return <article key={message.id} className={`message-row ${own ? "own" : ""}`}><span className="message-avatar">{initials(message.user.name)}</span><div className="message-content"><div className="message-meta"><strong>{own ? "You" : message.user.name}</strong><time>{formatTime(message.created_at)}</time></div><p className="message-bubble">{message.body}</p></div></article>; })}<div ref={messagesEndRef} /></div>
      </div>
      <form className="composer" onSubmit={onSend}><input value={composer} onChange={(event) => onComposerChange(event.target.value)} placeholder="Write a message..." aria-label="Message" /><button disabled={sending || !composer.trim()} aria-label="Send message">{sending ? "…" : "↑"}</button></form>
    </section>
  );
}
