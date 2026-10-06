import type { Conversation, Message, User } from "@/lib/types";

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function formatTime(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function conversationName(conversation: Conversation, currentUser?: User | null) {
  if (conversation.title) return conversation.title;
  const otherUser = conversation.users?.find((user) => user.id !== currentUser?.id);
  return otherUser?.name ?? conversation.users?.[0]?.name ?? "New conversation";
}

export function mergeMessage(messages: Message[], incoming: Message) {
  if (messages.some((message) => message.id === incoming.id)) return messages;
  return [...messages, incoming];
}
