export type TenantId = "acme-casino" | "nova-sports";

export type TenantConfig = {
  id: TenantId;
  label: string;
  short: string;
  vibe: string;
  apiKey: string;
  hmacSecret: string;
  playerId: string;
  mode: "vip" | "velocity";
};

export function getTenants(): Record<TenantId, TenantConfig> {
  return {
    "acme-casino": {
      id: "acme-casino",
      label: "Acme Casino",
      short: "ACME",
      vibe: "VIP ascent",
      apiKey: process.env.ACME_API_KEY ?? "ak_acme_dev_001",
      hmacSecret: process.env.ACME_HMAC_SECRET ?? "hmac_acme_dev_secret",
      playerId: "load-acme-casino-0",
      mode: "vip",
    },
    "nova-sports": {
      id: "nova-sports",
      label: "Nova Sports",
      short: "NOVA",
      vibe: "Velocity watch",
      apiKey: process.env.NOVA_API_KEY ?? "ak_nova_dev_001",
      hmacSecret: process.env.NOVA_HMAC_SECRET ?? "hmac_nova_dev_secret",
      playerId: "load-nova-sports-0",
      mode: "velocity",
    },
  };
}

export function apiBase(): string {
  return process.env.ENGAGEPULSE_URL ?? "http://127.0.0.1:8080";
}
