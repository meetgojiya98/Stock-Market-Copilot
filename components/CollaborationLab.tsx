"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  MessageSquare,
  Share2,
  Users,
  UserRoundPlus,
} from "lucide-react";
import { createLocalAlert } from "../lib/data-client";
import {
  addWorkspaceComment,
  createSharedMemoLink,
  createSharedWorkspace,
  fetchCollaborationState,
  type CollaborationState,
  type SharedWorkspace,
} from "../lib/collaboration-share";

type CollaborationLabProps = {
  symbols: string[];
};

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase();
}

function parseList(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CollaborationLab({ symbols }: CollaborationLabProps) {
  const [state, setState] = useState<CollaborationState>({
    workspaces: [],
    comments: [],
    memos: [],
    updatedAt: new Date().toISOString(),
  });
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState("");
  const [workspaceSymbols, setWorkspaceSymbols] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("You");
  const [commentBody, setCommentBody] = useState("");
  const [memoSymbol, setMemoSymbol] = useState(normalizeSymbol(symbols[0] || "AAPL"));
  const [memoTitle, setMemoTitle] = useState("");
  const [memoBody, setMemoBody] = useState("");
  const [memoAuthor, setMemoAuthor] = useState("You");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const symbolOptions = useMemo(
    () => [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 20),
    [symbols]
  );

  const selectedWorkspace = useMemo(
    () => state.workspaces.find((workspace) => workspace.id === selectedWorkspaceId),
    [selectedWorkspaceId, state.workspaces]
  );

  const workspaceComments = useMemo(
    () =>
      state.comments
        .filter((comment) => comment.workspaceId === selectedWorkspaceId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [selectedWorkspaceId, state.comments]
  );

  useEffect(() => {
    const load = async () => {
      const result = await fetchCollaborationState();
      setState(result.data);
      if (!selectedWorkspaceId && result.data.workspaces[0]) {
        setSelectedWorkspaceId(result.data.workspaces[0].id);
      }
    };
    load();
  }, [selectedWorkspaceId]);

  const handleCreateWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = await createSharedWorkspace({
      name: workspaceName,
      members: parseList(workspaceMembers),
      symbols: parseList(workspaceSymbols),
    });
    setState(result.data);

    if (!result.ok || !result.workspace) {
      setError(result.detail || "Unable to create workspace.");
      return;
    }

    setWorkspaceName("");
    setWorkspaceMembers("");
    setWorkspaceSymbols("");
    setSelectedWorkspaceId(result.workspace.id);
    const message = `Workspace "${result.workspace.name}" created.`;
    setNotice(message);
    createLocalAlert("TEAM", message, "execution");
  };

  const handleAddComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWorkspace) {
      setError("Select a workspace first.");
      return;
    }
    setError("");
    setNotice("");

    const result = await addWorkspaceComment({
      workspaceId: selectedWorkspace.id,
      author: commentAuthor,
      body: commentBody,
    });
    setState(result.data);
    if (!result.ok || !result.comment) {
      setError(result.detail || "Unable to add comment.");
      return;
    }

    setCommentBody("");
    setNotice(`Comment posted to ${selectedWorkspace.name}.`);
  };

  const handleShareMemo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const result = await createSharedMemoLink({
      symbol: memoSymbol,
      title: memoTitle,
      body: memoBody,
      author: memoAuthor,
    });
    setState(result.data);
    if (!result.ok || !result.memo) {
      setError(result.detail || "Unable to create memo link.");
      return;
    }

    setMemoTitle("");
    setMemoBody("");
    setNotice(`Shared memo created for ${result.memo.symbol}.`);
    createLocalAlert("TEAM", `Memo shared: ${result.memo.symbol} - ${result.memo.title}`, "execution");
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Share link copied to clipboard.");
    } catch {
      setError("Clipboard permission denied.");
    }
  };

  return (
    <section className="card-elevated rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="section-title text-base flex items-center gap-2">
          <Users size={16} />
          Collaboration + Sharing
        </h3>
        <div className="text-xs muted">
          {state.workspaces.length} workspace(s) • {state.memos.length} memo link(s)
        </div>
      </div>

      <p className="text-xs muted">
        Coordinate with teams via shared workspaces, comments, and publishable memo links.
      </p>

      {(notice || error) && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            error
              ? "border border-red-300/55 bg-red-500/10 text-red-600 dark:text-red-300"
              : "border border-emerald-300/55 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
        <div className="space-y-4">
          <form onSubmit={handleCreateWorkspace} className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs space-y-1 sm:col-span-2">
              <div className="muted">Workspace Name</div>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Growth Team Workspace"
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Members (comma/newline)</div>
              <textarea
                value={workspaceMembers}
                onChange={(event) => setWorkspaceMembers(event.target.value)}
                className="w-full min-h-[74px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                placeholder="pm@fund.com, analyst@fund.com"
              />
            </label>

            <label className="text-xs space-y-1">
              <div className="muted">Symbols (comma/newline)</div>
              <textarea
                value={workspaceSymbols}
                onChange={(event) => setWorkspaceSymbols(event.target.value)}
                className="w-full min-h-[74px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                placeholder={symbolOptions.slice(0, 5).join(", ")}
              />
            </label>

            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-3)] text-white px-3 py-2 text-sm font-semibold"
            >
              <UserRoundPlus size={13} />
              Create Shared Workspace
            </button>
          </form>

          <div className="grid sm:grid-cols-[0.9fr_1.1fr] gap-2">
            <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 p-3">
              <div className="text-sm font-semibold section-title">Workspaces</div>
              <div className="mt-2 space-y-2">
                {state.workspaces.length === 0 && (
                  <div className="text-xs muted">No workspaces yet.</div>
                )}

                {state.workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      workspace.id === selectedWorkspaceId
                        ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]"
                        : "border-[var(--surface-border)] bg-white/70 dark:bg-black/25"
                    }`}
                  >
                    <div className="text-sm font-semibold">{workspace.name}</div>
                    <div className="text-[11px] muted">
                      {workspace.members.length} member(s) • {workspace.symbols.length} symbol(s)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 p-3">
              <div className="text-sm font-semibold section-title">Team Comments</div>
              <div className="text-xs muted mt-1">
                {selectedWorkspace ? selectedWorkspace.name : "Select a workspace to comment."}
              </div>

              <form onSubmit={handleAddComment} className="mt-2 space-y-2">
                <input
                  value={commentAuthor}
                  onChange={(event) => setCommentAuthor(event.target.value)}
                  className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                  placeholder="Your name"
                />
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  className="w-full min-h-[64px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
                  placeholder="Add a tactical note for the team."
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] text-white px-3 py-1.5 text-xs font-semibold"
                >
                  <MessageSquare size={12} />
                  Post Comment
                </button>
              </form>

              <div className="mt-2 space-y-1 max-h-[180px] overflow-auto">
                {workspaceComments.length === 0 && (
                  <div className="text-xs muted">No comments yet.</div>
                )}

                {workspaceComments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-white/65 dark:bg-black/30 px-2.5 py-2">
                    <div className="text-[11px] muted">
                      {comment.author} • {formatDate(comment.createdAt)}
                    </div>
                    <div className="text-xs mt-1">{comment.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <form onSubmit={handleShareMemo} className="rounded-lg control-surface bg-white/75 dark:bg-black/25 p-3 space-y-2">
            <div className="text-sm font-semibold section-title flex items-center gap-1">
              <Share2 size={14} />
              Share Memo Link
            </div>
            <label className="text-xs space-y-1 block">
              <div className="muted">Symbol</div>
              <select
                value={memoSymbol}
                onChange={(event) => setMemoSymbol(event.target.value)}
                className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              >
                {symbolOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={memoTitle}
              onChange={(event) => setMemoTitle(event.target.value)}
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              placeholder="Title"
              required
            />
            <textarea
              value={memoBody}
              onChange={(event) => setMemoBody(event.target.value)}
              className="w-full min-h-[74px] rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              placeholder="Shareable memo summary"
              required
            />
            <input
              value={memoAuthor}
              onChange={(event) => setMemoAuthor(event.target.value)}
              className="w-full rounded-lg control-surface bg-white/80 dark:bg-black/25 px-3 py-2 text-xs"
              placeholder="Author"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white px-3 py-1.5 text-xs font-semibold"
            >
              Create Link
            </button>
          </form>

          <div className="rounded-lg control-surface bg-white/75 dark:bg-black/25 p-3">
            <div className="text-sm font-semibold section-title">Recent Shared Memos</div>
            <div className="mt-2 space-y-2 max-h-[300px] overflow-auto">
              {state.memos.length === 0 && (
                <div className="text-xs muted">No shared links yet.</div>
              )}

              {state.memos.slice(0, 12).map((memo) => (
                <div key={memo.id} className="rounded-lg bg-white/65 dark:bg-black/30 px-2.5 py-2">
                  <div className="text-xs font-semibold">{memo.symbol} • {memo.title}</div>
                  <div className="text-[11px] muted mt-1">
                    {memo.author} • {formatDate(memo.createdAt)}
                  </div>
                  <div className="text-[11px] mt-1">{memo.body}</div>
                  <button
                    onClick={() => handleCopy(memo.url)}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-white/80 dark:bg-black/25 px-2 py-1 text-[11px]"
                  >
                    <Copy size={11} />
                    Copy Link
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
