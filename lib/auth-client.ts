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
  | { status: "success"; token?: string }
  | { status: "error"; detail: string }
  | { status: "unavailable" };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "");
const LOCAL_USERS_KEY = "smc_local_auth_users_v1";
const LOCAL_ACTIVE_KEY = "smc_local_auth_active_user_v1";
const AUTH_MODE_KEY = "smc_auth_mode_v1";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (response.ok) {
      return { status: "success" };
    }

    const detail =
      (await response
        .json()
        .then((data) => data?.detail as string | undefined)
        .catch(() => undefined)) || "Registration failed.";

    return { status: "error", detail };
  } catch {
    return { status: "unavailable" };
  }
}

async function attemptRemoteLogin(input: LoginInput): Promise<RemoteResult> {
  if (!API_BASE) return { status: "unavailable" };

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: input.email,
        password: input.password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const token = String(data?.access_token ?? "");
      if (token) {
        return { status: "success", token };
      }
      return { status: "error", detail: "Authentication token missing." };
    }

    const detail =
      (await response
        .json()
        .then((data) => data?.detail as string | undefined)
        .catch(() => undefined)) || "Invalid credentials.";

    return { status: "error", detail };
  } catch {
    return { status: "unavailable" };
  }
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
  const email = normalizeEmail(input.email);
  const users = readUsers();
  const found = users.find((user) => user.email === email);

  if (!found) {
    return { ok: false, mode: "local", detail: "Account not found. Create an account first." };
  }

  if (found.password !== input.password) {
    return { ok: false, mode: "local", detail: "Invalid credentials." };
  }

  storeSession(createLocalToken(email), "local", email);
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
    email: normalizeEmail(input.email),
    password: input.password,
  };

  const remote = await attemptRemoteLogin(normalizedInput);

  if (remote.status === "success" && remote.token) {
    storeSession(remote.token, "remote", normalizedInput.email);
    return { ok: true, mode: "remote" };
  }

  if (remote.status === "error") {
    const local = loginLocal(normalizedInput);
    if (local.ok) {
      return { ok: true, mode: "local", detail: remote.detail };
    }
    return {
      ok: false,
      mode: "remote",
      detail: remote.detail || local.detail || "Authentication failed.",
    };
  }

  return loginLocal(normalizedInput);
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
