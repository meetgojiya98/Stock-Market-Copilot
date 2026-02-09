"use client";

export type ThesisStatus = "active" | "invalidated";
export type ThesisSource = "manual" | "watchlist" | "research";

export type ThesisVersion = {
  id: string;
  symbol: string;
  memo: string;
  confidence: number;
  status: ThesisStatus;
  source: ThesisSource;
  keyDrivers: string[];
  invalidationTriggers: string[];
  changeSummary: string[];
  confidenceDelta: number;
  previousId?: string;
  createdAt: string;
};

export type ThesisLibrary = {
  versions: ThesisVersion[];
  updatedAt: string;
};

type QueryResult<T> = {
  data: T;
  mode: "local";
  detail?: string;
};

type MutationResult<T> = {
  ok: boolean;
  data: T;
  mode: "local";
  detail?: string;
  driftAlert?: string;
  invalidatedAlert?: string;
};

export type SaveThesisInput = {
  symbol: string;
  memo: string;
  confidence: number;
  keyDrivers?: string[];
  invalidationTriggers?: string[];
  status?: ThesisStatus;
  source?: ThesisSource;
};

const THESIS_STORAGE_KEY = "smc_thesis_memory_v1";
const DRIFT_ALERT_THRESHOLD = 15;

function nowIso() {
  return new Date().toISOString();
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

function normalizeList(items: string[] = []) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function sortVersions(versions: ThesisVersion[]) {
  return [...versions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function createDefaultLibrary(): ThesisLibrary {
  return {
    versions: [],
    updatedAt: nowIso(),
  };
}

function sanitizeVersion(raw: unknown): ThesisVersion | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<ThesisVersion>;
  const symbol = normalizeSymbol(String(candidate.symbol ?? ""));
  const memo = String(candidate.memo ?? "").trim();
  const confidence = clamp(Number(candidate.confidence ?? 50), 0, 100);

  if (!symbol || !memo) return null;

  return {
    id: String(candidate.id ?? `thesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    symbol,
    memo,
    confidence,
    status: candidate.status === "invalidated" ? "invalidated" : "active",
    source:
      candidate.source === "watchlist" || candidate.source === "research"
        ? candidate.source
        : "manual",
    keyDrivers: normalizeList(Array.isArray(candidate.keyDrivers) ? candidate.keyDrivers : []),
    invalidationTriggers: normalizeList(
      Array.isArray(candidate.invalidationTriggers) ? candidate.invalidationTriggers : []
    ),
    changeSummary: normalizeList(
      Array.isArray(candidate.changeSummary) ? candidate.changeSummary : []
    ),
    confidenceDelta: Number.isFinite(Number(candidate.confidenceDelta))
      ? Number(candidate.confidenceDelta)
      : 0,
    ...(candidate.previousId ? { previousId: String(candidate.previousId) } : {}),
    createdAt: String(candidate.createdAt ?? nowIso()),
  };
}

function readLibrary(): ThesisLibrary {
  const raw = safeRead<Partial<ThesisLibrary>>(THESIS_STORAGE_KEY, createDefaultLibrary());
  const versions = Array.isArray(raw.versions)
    ? sortVersions(
        raw.versions
          .map((item) => sanitizeVersion(item))
          .filter((item): item is ThesisVersion => Boolean(item))
      )
    : [];

  return {
    versions,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
  };
}

function writeLibrary(library: ThesisLibrary) {
  safeWrite(THESIS_STORAGE_KEY, {
    versions: sortVersions(library.versions),
    updatedAt: nowIso(),
  } satisfies ThesisLibrary);
}

function latestVersionForSymbol(versions: ThesisVersion[], symbol: string) {
  return sortVersions(versions).find((item) => item.symbol === symbol);
}

function diffList(previous: string[], next: string[]) {
  const prevSet = new Set(previous);
  const nextSet = new Set(next);
  const added = next.filter((item) => !prevSet.has(item));
  const removed = previous.filter((item) => !nextSet.has(item));
  return { added, removed };
}

function diffSummary(previous: ThesisVersion | undefined, next: SaveThesisInput) {
  if (!previous) {
    return {
      summary: ["Initial thesis memo created."],
      confidenceDelta: 0,
    };
  }

  const summary: string[] = [];
  const nextMemo = next.memo.trim();
  const nextDrivers = normalizeList(next.keyDrivers || []);
  const nextInvalidation = normalizeList(next.invalidationTriggers || []);
  const nextStatus = next.status || "active";
  const nextConfidence = clamp(next.confidence, 0, 100);

  if (previous.memo.trim() !== nextMemo) {
    summary.push("Core thesis narrative updated.");
  }

  const driverDiff = diffList(previous.keyDrivers, nextDrivers);
  if (driverDiff.added.length) {
    summary.push(`Added drivers: ${driverDiff.added.slice(0, 3).join(", ")}.`);
  }
  if (driverDiff.removed.length) {
    summary.push(`Removed drivers: ${driverDiff.removed.slice(0, 3).join(", ")}.`);
  }

  const invalidationDiff = diffList(previous.invalidationTriggers, nextInvalidation);
  if (invalidationDiff.added.length) {
    summary.push(
      `New invalidation triggers: ${invalidationDiff.added.slice(0, 3).join(", ")}.`
    );
  }
  if (invalidationDiff.removed.length) {
    summary.push(
      `Retired invalidation triggers: ${invalidationDiff.removed.slice(0, 3).join(", ")}.`
    );
  }

  const confidenceDelta = Number((nextConfidence - previous.confidence).toFixed(1));
  if (Math.abs(confidenceDelta) >= 0.1) {
    summary.push(
      `Confidence ${confidenceDelta > 0 ? "increased" : "decreased"} by ${Math.abs(
        confidenceDelta
      ).toFixed(1)} points.`
    );
  }

  if (previous.status !== nextStatus) {
    summary.push(
      nextStatus === "invalidated"
        ? "Thesis status flipped to invalidated."
        : "Thesis status reactivated."
    );
  }

  if (!summary.length) {
    summary.push("No material change; version checkpoint recorded.");
  }

  return { summary, confidenceDelta };
}

export async function fetchThesisLibrary(): Promise<QueryResult<ThesisLibrary>> {
  return {
    data: readLibrary(),
    mode: "local",
  };
}

export async function saveThesisVersion(
  input: SaveThesisInput
): Promise<MutationResult<ThesisLibrary> & { version?: ThesisVersion }> {
  const symbol = normalizeSymbol(input.symbol);
  const memo = input.memo.trim();
  const confidence = clamp(Number(input.confidence), 0, 100);
  const keyDrivers = normalizeList(input.keyDrivers || []);
  const invalidationTriggers = normalizeList(input.invalidationTriggers || []);
  const status: ThesisStatus = input.status === "invalidated" ? "invalidated" : "active";
  const source: ThesisSource =
    input.source === "watchlist" || input.source === "research" ? input.source : "manual";

  const library = readLibrary();

  if (!symbol || !memo) {
    return {
      ok: false,
      data: library,
      mode: "local",
      detail: "Symbol and thesis memo are required.",
    };
  }

  const previous = latestVersionForSymbol(library.versions, symbol);
  const diff = diffSummary(previous, {
    ...input,
    symbol,
    memo,
    confidence,
    keyDrivers,
    invalidationTriggers,
    status,
    source,
  });

  const version: ThesisVersion = {
    id: `thesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    memo,
    confidence,
    status,
    source,
    keyDrivers,
    invalidationTriggers,
    changeSummary: diff.summary,
    confidenceDelta: diff.confidenceDelta,
    ...(previous ? { previousId: previous.id } : {}),
    createdAt: nowIso(),
  };

  const nextLibrary: ThesisLibrary = {
    versions: sortVersions([version, ...library.versions]),
    updatedAt: nowIso(),
  };
  writeLibrary(nextLibrary);

  const driftAlert =
    previous && Math.abs(diff.confidenceDelta) >= DRIFT_ALERT_THRESHOLD
      ? `${symbol} confidence drift alert: ${diff.confidenceDelta > 0 ? "+" : ""}${diff.confidenceDelta.toFixed(
          1
        )} points since last memo.`
      : undefined;

  const invalidatedAlert =
    status === "invalidated"
      ? `${symbol} thesis invalidated. Review position sizing and risk controls.`
      : undefined;

  return {
    ok: true,
    data: nextLibrary,
    mode: "local",
    ...(driftAlert ? { driftAlert } : {}),
    ...(invalidatedAlert ? { invalidatedAlert } : {}),
    version,
  };
}

export async function invalidateLatestThesis(
  symbol: string,
  reason: string
): Promise<MutationResult<ThesisLibrary> & { version?: ThesisVersion }> {
  const normalized = normalizeSymbol(symbol);
  const rationale = reason.trim();
  const library = readLibrary();
  const latest = latestVersionForSymbol(library.versions, normalized);

  if (!latest) {
    return {
      ok: false,
      data: library,
      mode: "local",
      detail: "No existing thesis memo found for this symbol.",
    };
  }

  const nextConfidence = clamp(latest.confidence - 20, 0, 100);
  const changeSummary = [
    rationale
      ? `Thesis invalidated: ${rationale}`
      : "Thesis invalidated by user action.",
    `Confidence reduced from ${latest.confidence.toFixed(1)} to ${nextConfidence.toFixed(1)}.`,
  ];

  const version: ThesisVersion = {
    ...latest,
    id: `thesis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "invalidated",
    confidence: nextConfidence,
    changeSummary,
    confidenceDelta: Number((nextConfidence - latest.confidence).toFixed(1)),
    previousId: latest.id,
    createdAt: nowIso(),
  };

  const nextLibrary: ThesisLibrary = {
    versions: sortVersions([version, ...library.versions]),
    updatedAt: nowIso(),
  };

  writeLibrary(nextLibrary);

  return {
    ok: true,
    data: nextLibrary,
    mode: "local",
    invalidatedAlert: `${normalized} thesis invalidated. ${rationale || "Check risk controls and exit conditions."}`,
    version,
  };
}
