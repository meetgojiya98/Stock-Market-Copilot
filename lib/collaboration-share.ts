"use client";

export type SharedWorkspace = {
  id: string;
  name: string;
  members: string[];
  symbols: string[];
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceComment = {
  id: string;
  workspaceId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type SharedMemoLink = {
  id: string;
  symbol: string;
  title: string;
  body: string;
  author: string;
  url: string;
  createdAt: string;
};

export type CollaborationState = {
  workspaces: SharedWorkspace[];
  comments: WorkspaceComment[];
  memos: SharedMemoLink[];
  updatedAt: string;
};

type LocalResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
};

const STORAGE_KEY = "smc_collaboration_state_v1";

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function normalizeList(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function defaultState(): CollaborationState {
  return {
    workspaces: [],
    comments: [],
    memos: [],
    updatedAt: nowIso(),
  };
}

function readState() {
  const raw = safeRead<CollaborationState>(STORAGE_KEY, defaultState());
  return {
    workspaces: Array.isArray(raw.workspaces)
      ? raw.workspaces.map((workspace) => ({
          ...workspace,
          members: normalizeList(workspace.members || []),
          symbols: normalizeList((workspace.symbols || []).map(normalizeSymbol)),
        }))
      : [],
    comments: Array.isArray(raw.comments)
      ? raw.comments
          .map((comment) => ({
            ...comment,
            author: String(comment.author || "").trim() || "Teammate",
            body: String(comment.body || "").trim(),
          }))
          .filter((comment) => comment.body)
      : [],
    memos: Array.isArray(raw.memos)
      ? raw.memos
          .map((memo) => ({
            ...memo,
            symbol: normalizeSymbol(String(memo.symbol || "")),
            title: String(memo.title || "").trim(),
            body: String(memo.body || "").trim(),
            author: String(memo.author || "").trim() || "Owner",
          }))
          .filter((memo) => memo.symbol && memo.title && memo.body)
      : [],
    updatedAt: raw.updatedAt || nowIso(),
  } satisfies CollaborationState;
}

function writeState(next: CollaborationState) {
  safeWrite(STORAGE_KEY, {
    ...next,
    updatedAt: nowIso(),
  } satisfies CollaborationState);
}

function toShareUrl(shareId: string) {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/execution?share=${encodeURIComponent(shareId)}`;
  }
  return `https://stock-market-copilot.app/execution?share=${encodeURIComponent(shareId)}`;
}

export async function fetchCollaborationState(): Promise<LocalResult<CollaborationState>> {
  return {
    ok: true,
    data: readState(),
    mode: "local",
  };
}

export async function createSharedWorkspace(input: {
  name: string;
  members: string[];
  symbols: string[];
}): Promise<LocalResult<CollaborationState> & { workspace?: SharedWorkspace }> {
  const state = readState();
  const name = input.name.trim();
  const members = normalizeList(input.members);
  const symbols = normalizeList(input.symbols.map(normalizeSymbol));

  if (!name) {
    return {
      ok: false,
      data: state,
      mode: "local",
      detail: "Workspace name is required.",
    };
  }

  const workspace: SharedWorkspace = {
    id: `workspace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    members,
    symbols,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const next: CollaborationState = {
    ...state,
    workspaces: [workspace, ...state.workspaces],
    updatedAt: nowIso(),
  };
  writeState(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    workspace,
  };
}

export async function addWorkspaceComment(input: {
  workspaceId: string;
  author: string;
  body: string;
}): Promise<LocalResult<CollaborationState> & { comment?: WorkspaceComment }> {
  const state = readState();
  const body = input.body.trim();
  const author = input.author.trim() || "Teammate";

  if (!body) {
    return {
      ok: false,
      data: state,
      mode: "local",
      detail: "Comment text is required.",
    };
  }

  const workspace = state.workspaces.find((item) => item.id === input.workspaceId);
  if (!workspace) {
    return {
      ok: false,
      data: state,
      mode: "local",
      detail: "Workspace not found.",
    };
  }

  const comment: WorkspaceComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: input.workspaceId,
    author,
    body,
    createdAt: nowIso(),
  };

  const next: CollaborationState = {
    ...state,
    comments: [comment, ...state.comments],
    workspaces: state.workspaces.map((item) =>
      item.id === workspace.id ? { ...item, updatedAt: nowIso() } : item
    ),
    updatedAt: nowIso(),
  };
  writeState(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    comment,
  };
}

export async function createSharedMemoLink(input: {
  symbol: string;
  title: string;
  body: string;
  author: string;
}): Promise<LocalResult<CollaborationState> & { memo?: SharedMemoLink }> {
  const state = readState();
  const symbol = normalizeSymbol(input.symbol);
  const title = input.title.trim();
  const body = input.body.trim();
  const author = input.author.trim() || "Owner";

  if (!symbol || !title || !body) {
    return {
      ok: false,
      data: state,
      mode: "local",
      detail: "Symbol, title, and memo body are required.",
    };
  }

  const id = `memo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const memo: SharedMemoLink = {
    id,
    symbol,
    title,
    body,
    author,
    url: toShareUrl(id),
    createdAt: nowIso(),
  };

  const next: CollaborationState = {
    ...state,
    memos: [memo, ...state.memos],
    updatedAt: nowIso(),
  };
  writeState(next);

  return {
    ok: true,
    data: next,
    mode: "local",
    memo,
  };
}
