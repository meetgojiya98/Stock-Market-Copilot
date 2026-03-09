export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "zentrade_conversations_v1";
const MAX_CONVERSATIONS = 50;

export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function saveConversation(conversation: Conversation): void {
  let conversations = getConversations();
  const idx = conversations.findIndex((c) => c.id === conversation.id);

  // Auto-generate title from first user message if not set
  if (!conversation.title || conversation.title === "New Conversation") {
    const firstUserMsg = conversation.messages.find((m) => m.role === "user");
    if (firstUserMsg) {
      conversation.title = firstUserMsg.content.slice(0, 50).trim();
      if (firstUserMsg.content.length > 50) {
        conversation.title += "...";
      }
    }
  }

  conversation.updatedAt = new Date().toISOString();

  if (idx >= 0) {
    conversations[idx] = conversation;
  } else {
    conversations.unshift(conversation);
  }

  // FIFO eviction: keep only MAX_CONVERSATIONS
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations = conversations.slice(0, MAX_CONVERSATIONS);
  }

  persistConversations(conversations);
}

export function deleteConversation(id: string): void {
  persistConversations(getConversations().filter((c) => c.id !== id));
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getConversationContext(id: string): string {
  const conversations = getConversations();
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) return "";

  const recentMessages = conversation.messages.slice(-10);
  return recentMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}
