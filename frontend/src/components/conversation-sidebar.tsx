"use client";

import type { Conversation, User } from "@/lib/types";
import { conversationName, formatTime, initials } from "@/lib/chat";

type ConversationSidebarProps = {
  currentUser: User;
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onLogout: () => void;
};

export function ConversationSidebar({ currentUser, conversations, selectedId, onSelect, onNewChat, onLogout }: ConversationSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header"><div className="brand-mark">ch<span>at</span></div><button className="icon-button" onClick={onNewChat} aria-label="Start new conversation">+</button></div>
      <div className="sidebar-label"><span>Conversations</span><span>{conversations.length}</span></div>
      <div className="conversation-list">
        {conversations.length === 0 && <div className="empty-sidebar"><span className="empty-icon">✦</span><p>No conversations yet.</p><small>Start one with the + above.</small></div>}
        {conversations.map((conversation) => <button key={conversation.id} className={`conversation-item ${selectedId === conversation.id ? "selected" : ""}`} onClick={() => onSelect(conversation.id)}><span className="avatar">{initials(conversationName(conversation, currentUser))}</span><span className="conversation-copy"><strong>{conversationName(conversation, currentUser)}</strong><small>{conversation.messages_count ? `${conversation.messages_count} messages` : "No messages yet"}</small></span><span className="conversation-time">{formatTime(conversation.updated_at)}</span></button>)}
      </div>
      <div className="profile-card"><span className="avatar avatar-small">{initials(currentUser.name)}</span><span className="profile-copy"><strong>{currentUser.name}</strong><small>Online now</small></span><button className="logout-button" onClick={onLogout}>↗</button></div>
    </aside>
  );
}
