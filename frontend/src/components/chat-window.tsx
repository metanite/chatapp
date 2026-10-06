"use client";

import { useState } from "react";
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
  updatingTitle: boolean;
  realtimeStatus: RealtimeStatus;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onComposerChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onUpdateTitle: (title: string | null) => Promise<void>;
};

export function ChatWindow({ conversation, currentUser, messages, loadingMessages, composer, sending, deleting, updatingTitle, realtimeStatus, messagesEndRef, onComposerChange, onSend, onDelete, onUpdateTitle }: ChatWindowProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  function beginTitleEdit() {
    setTitleDraft(conversation.title ?? "");
    setEditingTitle(true);
  }

  async function submitTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await onUpdateTitle(titleDraft.trim() || null);
      setEditingTitle(false);
    } catch {
      // The page displays the API error and leaves the editor open.
    }
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div className="chat-title-block">
          <p className="eyebrow">Your conversation</p>
          {editingTitle ? <form className="title-editor" onSubmit={submitTitle}><input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} maxLength={255} autoFocus placeholder={conversationName(conversation, currentUser)} aria-label="Conversation title" /><button type="submit" disabled={updatingTitle}>{updatingTitle ? "Saving…" : "Save"}</button><button type="button" className="cancel-title-button" onClick={() => setEditingTitle(false)}>Cancel</button></form> : <div className="chat-title-row"><h1>{conversationName(conversation, currentUser)}</h1><button className="edit-title-button" onClick={beginTitleEdit} aria-label="Edit conversation title">Edit</button></div>}
        </div>
        <div className="chat-header-actions"><div className={`online-status ${realtimeStatus}`}><span /> {realtimeStatus === "live" ? "Reverb live" : realtimeStatus === "connecting" ? "Connecting…" : "Reverb offline"}</div><button className="delete-button" onClick={onDelete} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button></div>
      </header>
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
