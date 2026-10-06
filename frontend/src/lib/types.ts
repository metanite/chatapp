export type User = {
  id: number;
  name: string;
  email?: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  body: string;
  user: User;
  created_at: string;
};

export type Conversation = {
  id: number;
  title: string | null;
  users: User[];
  messages_count?: number;
  messages?: Message[];
  updated_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AuthResponse = {
  user: User;
  token: string;
};
