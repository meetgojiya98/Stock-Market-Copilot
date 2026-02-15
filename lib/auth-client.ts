"use client";

type AuthMode = "remote" | "local";

type AuthOutcome = {
  ok: boolean;
  mode: AuthMode;
  detail?: string;
};

type RegisterInput = {
  email: string;
  password: string;
  username: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type LocalAuthUser = {
  email: string;
  username: string;
  password: string;
  createdAt: string;
};

type RemoteResult =
  | { status: "success"; token?: string; email?: string; detail?: string }
  | { status: "error"; detail: string }
  | { status: "unavailable" };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const LOCAL_USERS_KEY = "smc_local_auth_users_v1";
const LOCAL_ACTIVE_KEY = "smc_local_auth_active_user_v1";
const AUTH_MODE_KEY = "smc_auth_mode_v1";
const REMOTE_AUTH_TIMEOUT_MS = 1800;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim();
}

function findLocalUserByIdentifier(identifier: string): LocalAuthUser | undefined {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return undefined;

  const emailLookup = normalizeEmail(normalizedIdentifier);
  const usernameLookup = normalizedIdentifier.toLowerCase();

  return readUsers().find(
    (user) => user.email === emailLookup || user.username.trim().toLowerCase() === usernameLookup
  );
}

function getSessionEmail(identifier: string, remoteEmail?: string) {
  if (remoteEmail) return normalizeEmail(remoteEmail);

  const matchedLocal = findLocalUserByIdentifier(identifier);
  if (matchedLocal?.email) return matchedLocal.email;

  if (identifier.includes("@")) return normalizeEmail(identifier);
  return `${normalizeIdentifier(identifier).toLowerCase()}@local.zentrade`;
}

function uniqueNonEmpty(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    if (!value) continue;
    const normalized = value.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
  }

  return next;
}

async function safeJson(response: Response): Promise<Record<string, unknown> | undefined> {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (data && typeof data === "object") return data;
    return undefined;
  } catch {
    return undefined;
  }
}

function isUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.name === "TypeError";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REMOTE_AUTH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readRemoteDetail(response: Response, fallback: string) {
  const data = await safeJson(response);
  if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return fallback;
}

function extractToken(data: Record<string, unknown> | undefined) {
  if (!data) return undefined;
  const value =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.token === "string" && data.token) ||
    (typeof data.jwt === "string" && data.jwt);
  return value || undefined;
}

function extractEmail(data: Record<string, unknown> | undefined) {
  if (!data) return undefined;
  if (typeof data.email === "string" && data.email.includes("@")) {
    return normalizeEmail(data.email);
  }
  return undefined;
}

function readUsers(): LocalAuthUser[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as LocalAuthUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(LOCAL_USERS_KEY);
    return [];
  }
}

function writeUsers(users: LocalAuthUser[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function upsertLocalUser(input: { email: string; password: string; username?: string }) {
  const email = normalizeEmail(input.email);
  const username = (input.username || "").trim() || email.split("@")[0];
  const users = readUsers();
  const existingIndex = users.findIndex((user) => user.email === email);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    const nextUsers = [...users];
    nextUsers[existingIndex] = {
      ...existing,
      username,
      password: input.password,
    };
    writeUsers(nextUsers);
    return;
  }

  writeUsers([
    {
      email,
      username,
      password: input.password,
      createdAt: new Date().toISOString(),
    },
    ...users,
  ]);
}

function createLocalToken(email: string) {
  const payload = `${normalizeEmail(email)}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  if (typeof btoa === "function") {
    return `local.${btoa(payload)}`;
  }

  return `local.${payload}`;
}

function storeSession(token: string, mode: AuthMode, email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
  localStorage.setItem(AUTH_MODE_KEY, mode);
  localStorage.setItem(LOCAL_ACTIVE_KEY, normalizeEmail(email));
}

async function attemptRemoteRegister(input: RegisterInput): Promise<RemoteResult> {
  if (!API_BASE) return { status: "unavailable" };

  const attempts = [`${API_BASE}/auth/register`, `${API_BASE}/signup`];
  let lastDetail: string | undefined;

  for (const endpoint of attempts) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (response.ok) {
        const data = await safeJson(response);
        const token = extractToken(data);
        const email = extractEmail(data) || input.email;
        return { status: "success", token, email };
      }

      if (response.status === 404 || response.status === 405 || response.status === 422) {
        continue;
      }

      lastDetail = await readRemoteDetail(response, "Registration failed.");
      return { status: "error", detail: lastDetail };
    } catch (error) {
      if (isUnavailableError(error)) {
        return { status: "unavailable" };
      }
      return { status: "error", detail: "Registration failed." };
    }
  }

  return { status: "error", detail: lastDetail || "Registration endpoint unavailable." };
}

async function attemptRemoteLogin(input: LoginInput): Promise<RemoteResult> {
  if (!API_BASE) return { status: "unavailable" };

  const identifier = normalizeIdentifier(input.email);
  const localMatch = findLocalUserByIdentifier(identifier);
  const candidates = uniqueNonEmpty([
    localMatch?.email,
    identifier,
    identifier.includes("@") ? normalizeEmail(identifier) : undefined,
  ]);

  if (!candidates.length) {
    return { status: "error", detail: "Please enter your email or username." };
  }

  let lastDetail = "Invalid credentials.";

  for (const candidate of candidates) {
    const primaryAttempt = {
      endpoint: `${API_BASE}/auth/login`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: candidate,
          password: input.password,
        }),
      } satisfies RequestInit,
    };

    const fallbackAttempts = [
      {
        endpoint: `${API_BASE}/auth/login`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidate,
            username: candidate,
            password: input.password,
          }),
        } satisfies RequestInit,
      },
      {
        endpoint: `${API_BASE}/login`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidate,
            username: candidate,
            password: input.password,
          }),
        } satisfies RequestInit,
      },
    ];

    const allAttempts = [primaryAttempt, ...fallbackAttempts];

    for (let index = 0; index < allAttempts.length; index += 1) {
      const attempt = allAttempts[index];

      try {
        const response = await fetchWithTimeout(attempt.endpoint, attempt.init);

        if (response.ok) {
          const data = await safeJson(response);
          const token = extractToken(data);
          const email = extractEmail(data) || (candidate.includes("@") ? normalizeEmail(candidate) : undefined);

          if (token) {
            return { status: "success", token, email };
          }

          const statusValue = typeof data?.status === "string" ? data.status.toLowerCase() : "";
          const success =
            data?.success === true ||
            data?.ok === true ||
            data?.authenticated === true ||
            statusValue === "success" ||
            statusValue === "ok" ||
            statusValue === "authenticated";

          if (success) {
            return {
              status: "success",
              email,
              detail: "Signed in without remote token. Local session enabled.",
            };
          }

          return {
            status: "success",
            email,
            detail: "Signed in. Local session enabled.",
          };
        }

        const unsupportedShape =
          response.status === 404 || response.status === 405 || response.status === 422;

        if (unsupportedShape && index < allAttempts.length - 1) {
          continue;
        }

        lastDetail = await readRemoteDetail(response, "Invalid credentials.");
        return { status: "error", detail: lastDetail };
      } catch (error) {
        if (isUnavailableError(error)) {
          return { status: "unavailable" };
        }
        return { status: "error", detail: "Authentication service failed." };
      }
    }
  }

  return { status: "error", detail: lastDetail };
}

function registerLocal(input: RegisterInput): AuthOutcome {
  const email = normalizeEmail(input.email);
  const users = readUsers();

  if (users.some((user) => user.email === email)) {
    return { ok: false, mode: "local", detail: "Email already registered." };
  }

  const nextUsers: LocalAuthUser[] = [
    {
      email,
      username: input.username.trim() || email.split("@")[0],
      password: input.password,
      createdAt: new Date().toISOString(),
    },
    ...users,
  ];

  writeUsers(nextUsers);
  return { ok: true, mode: "local" };
}

function loginLocal(input: LoginInput): AuthOutcome {
  const identifier = normalizeIdentifier(input.email);
  const users = readUsers();
  const found = users.find(
    (user) =>
      user.email === normalizeEmail(identifier) ||
      user.username.trim().toLowerCase() === identifier.toLowerCase()
  );

  if (!found) {
    return { ok: false, mode: "local", detail: "Account not found. Create an account first." };
  }

  if (found.password !== input.password) {
    return { ok: false, mode: "local", detail: "Invalid credentials." };
  }

  storeSession(createLocalToken(found.email), "local", found.email);
  return { ok: true, mode: "local" };
}

export async function registerUser(input: RegisterInput): Promise<AuthOutcome> {
  const normalizedInput: RegisterInput = {
    email: normalizeEmail(input.email),
    password: input.password,
    username: input.username.trim(),
  };

  const remote = await attemptRemoteRegister(normalizedInput);

  if (remote.status === "success") {
    upsertLocalUser(normalizedInput);
    if (remote.token) {
      storeSession(remote.token, "remote", remote.email || normalizedInput.email);
    }
    return { ok: true, mode: "remote" };
  }

  const registerAndActivateLocal = (detail?: string): AuthOutcome => {
    const local = registerLocal(normalizedInput);
    if (local.ok) {
      storeSession(createLocalToken(normalizedInput.email), "local", normalizedInput.email);
      return { ok: true, mode: "local", detail };
    }
    return local;
  };

  if (remote.status === "error") {
    const local = registerAndActivateLocal(remote.detail);
    if (local.ok) return local;
    return { ok: false, mode: "remote", detail: remote.detail };
  }

  return registerAndActivateLocal();
}

export async function loginUser(input: LoginInput): Promise<AuthOutcome> {
  const normalizedInput: LoginInput = {
    email: normalizeIdentifier(input.email),
    password: input.password,
  };

  // Fast path: if this credential pair already exists locally, skip remote probes.
  const local = loginLocal(normalizedInput);
  if (local.ok) return local;

  const remote = await attemptRemoteLogin(normalizedInput);

  if (remote.status === "success") {
    const sessionEmail = getSessionEmail(normalizedInput.email, remote.email);
    upsertLocalUser({
      email: sessionEmail,
      password: normalizedInput.password,
      username: normalizedInput.email.includes("@") ? undefined : normalizedInput.email,
    });

    if (remote.token) {
      storeSession(remote.token, "remote", sessionEmail);
      return { ok: true, mode: "remote" };
    }

    storeSession(createLocalToken(sessionEmail), "local", sessionEmail);
    return { ok: true, mode: "local", detail: remote.detail };
  }

  if (remote.status === "error") {
    return {
      ok: false,
      mode: "remote",
      detail: remote.detail || local.detail || "Authentication failed.",
    };
  }

  return local;
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem(LOCAL_ACTIVE_KEY);
  localStorage.removeItem(AUTH_MODE_KEY);
}

export function getAuthModeLabel() {
  if (typeof window === "undefined") return "Remote";
  const mode = localStorage.getItem(AUTH_MODE_KEY);
  return mode === "local" ? "Local Mode" : "Remote Mode";
}

export function isApiConfigured() {
  return Boolean(API_BASE);
}
