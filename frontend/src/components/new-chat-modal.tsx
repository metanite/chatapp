"use client";

import type { User } from "@/lib/types";
import { initials } from "@/lib/chat";

type NewChatModalProps = {
  search: string;
  users: User[];
  loading: boolean;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelectUser: (user: User) => void;
};

export function NewChatModal({ search, users, loading, onSearchChange, onClose, onSelectUser }: NewChatModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="new-chat-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header"><div><p className="eyebrow">New conversation</p><h2>Who would you like to talk to?</h2></div><button className="close-button" onClick={onClose}>×</button></div>
        <input className="search-input" value={search} onChange={(event) => onSearchChange(event.target.value)} autoFocus placeholder="Search by name or email" />
        <div className="user-results">{loading ? <p className="message-state">Searching...</p> : users.length === 0 ? <p className="message-state">No people found.</p> : users.map((user) => <button className="user-result" key={user.id} onClick={() => onSelectUser(user)}><span className="avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><span className="result-arrow">→</span></button>)}</div>
      </section>
    </div>
  );
}
