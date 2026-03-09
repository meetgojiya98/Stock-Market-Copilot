import type { Message } from "../components/terminal/TerminalMessage";

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "zentrade_chat_history_v1";
const MAX_SESSIONS = 50;

function loadAll(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveAll(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch { /* ignore */ }
}

export function saveChatSession(session: ChatSession) {
  const all = loadAll();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.unshift(session);
  }
  saveAll(all);
}

export function loadChatSessions(): ChatSession[] {
  return loadAll();
}

export function deleteChatSession(id: string) {
  saveAll(loadAll().filter((s) => s.id !== id));
}

export function searchChatHistory(query: string): ChatSession[] {
  const q = query.toLowerCase();
  return loadAll().filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
  );
}

export function generateSessionTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser) {
    const text = firstUser.content.trim();
    return text.length > 50 ? text.slice(0, 47) + "..." : text;
  }
  return "New Chat";
}
