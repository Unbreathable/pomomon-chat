// ==========================
// Environment Variables
// ==========================

const int = (value: string | undefined, fallback: number): number => parseInt(value ?? "", 10) || fallback;

export const env = {
  APP_NAME: process.env.APP_NAME ?? "Chat",

  NODE_ENV: process.env.NODE_ENV ?? "development",
  isDev: process.env.NODE_ENV === "development",
  isProd: process.env.NODE_ENV === "production",

  PORT: int(process.env.PORT, 3000),

  SESSION_EXPIRY_HOURS: int(process.env.SESSION_EXPIRY_HOURS, 168),
  SESSION_EXPIRY_SECONDS: int(process.env.SESSION_EXPIRY_HOURS, 168) * 60 * 60,

  INVITE_EXPIRY_HOURS: int(process.env.INVITE_EXPIRY_HOURS, 24),
  INVITE_EXPIRY_SECONDS: int(process.env.INVITE_EXPIRY_HOURS, 24) * 60 * 60,

  RATE_LIMIT_PER_SECOND: int(process.env.RATE_LIMIT_PER_SECOND, 60),

  MAX_BOTS_PER_USER: int(process.env.MAX_BOTS_PER_USER, 5),

  INITIAL_ADMIN_USERNAME: process.env.INITIAL_ADMIN_USERNAME ?? "admin",
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD ?? "changeme123",

  KLIPY_API_KEY: process.env.KLIPY_API_KEY ?? "",
};
