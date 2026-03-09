// Webhook alert configuration utilities for Zentrade

export type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
};

export const WEBHOOK_EVENTS = [
  { value: "agent.signal", label: "Agent Signal" },
  { value: "price.alert", label: "Price Alert" },
  { value: "risk.warning", label: "Risk Warning" },
  { value: "news.breaking", label: "Breaking News" },
] as const;

const STORAGE_KEY = "zentrade_webhooks_v1";

/** Load all webhook configs from localStorage. */
export function getWebhooks(): WebhookConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function persistWebhooks(webhooks: WebhookConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(webhooks));
  } catch {}
}

/** Save (add or update) a webhook config. */
export function saveWebhook(webhook: WebhookConfig): WebhookConfig[] {
  const existing = getWebhooks();
  const idx = existing.findIndex((w) => w.id === webhook.id);
  if (idx >= 0) {
    existing[idx] = webhook;
  } else {
    existing.push(webhook);
  }
  persistWebhooks(existing);
  return existing;
}

/** Delete a webhook config by id. */
export function deleteWebhook(id: string): WebhookConfig[] {
  const existing = getWebhooks().filter((w) => w.id !== id);
  persistWebhooks(existing);
  return existing;
}

/** Send a test POST to the webhook URL. Returns true on success. */
export async function testWebhook(webhook: WebhookConfig): Promise<boolean> {
  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "zentrade",
        type: "test",
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        timestamp: new Date().toISOString(),
        payload: {
          message: "This is a test webhook from Zentrade.",
          events: webhook.events,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
