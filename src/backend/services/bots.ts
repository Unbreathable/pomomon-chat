import { sql } from "bun";
import { env } from "@/shared/env";
import { toAvatarUrl, toISOString } from "@/backend/lib/transforms";
import type { Bot } from "@/shared/schemas";

/**
 * Bot service.
 * Handles bot account CRUD and token management.
 * Bots are special user accounts that can be invited to chatrooms and use the API via tokens.
 */

// ==========================
// Internal Types
// ==========================

export type BotCreate = {
  username: string;
  bio?: string;
  ownerId: string;
};

export type BotUpdate = {
  username?: string;
  bio?: string | null;
  avatar?: string | null;
};

/** Bot token prefix for identification */
const TOKEN_PREFIX = "bt_";

/** Generates a secure random token for bot authentication */
const generateToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${TOKEN_PREFIX}${randomPart}`;
};

/** Transforms a database row to a Bot object */
const transformBot = (row: any): Bot => ({
  id: row.id,
  username: row.username,
  real_name: row.real_name,
  bio: row.bio ?? null,
  avatar: toAvatarUrl(row.id, !!row.has_avatar),
  role: row.role,
  is_bot: true,
  created_at: toISOString(row.created_at),
  bot_owner_id: row.bot_owner_id,
  bot_owner_username: row.bot_owner_username,
  token_prefix: row.token_prefix ?? null,
  token_last_used_at: row.token_last_used_at ? toISOString(row.token_last_used_at) : null,
});

// ==========================
// Queries
// ==========================

/**
 * Get all bots owned by a user.
 * Admins can view all bots in the system.
 */
const getAll = async (params: {
  userId: string;
  page: number;
  perPage: number;
}): Promise<{ bots: Bot[]; total: number; totalPages: number }> => {
  const { userId, page, perPage } = params;

  // Use subquery to check admin status (cleaner than extra JOIN)
  const adminOrOwnerFilter = sql`AND (
    (SELECT role FROM users WHERE id = ${userId}) = 'admin'
    OR u.bot_owner_id = ${userId}
  )`;

  const [{ total }] = (await sql`
    SELECT COUNT(*)::int as total
    FROM users u
    WHERE u.is_bot = true ${adminOrOwnerFilter}
  `) as [{ total: number }];

  const rows = (await sql`
    SELECT
      u.id, u.username, u.real_name, u.bio, u.role, u.created_at,
      u.bot_owner_id, o.username as bot_owner_username,
      (u.avatar IS NOT NULL) as has_avatar,
      t.token_prefix, t.last_used_at as token_last_used_at
    FROM users u
    JOIN users o ON u.bot_owner_id = o.id
    LEFT JOIN bot_tokens t ON u.id = t.bot_id
    WHERE u.is_bot = true ${adminOrOwnerFilter}
    ORDER BY u.created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `) as any[];

  return {
    bots: rows.map(transformBot),
    total,
    totalPages: Math.ceil(total / perPage),
  };
};

/** Get a single bot by ID */
const getById = async (params: { id: string }): Promise<Bot | null> => {
  const [row] = (await sql`
    SELECT
      u.id, u.username, u.real_name, u.bio, u.role, u.created_at,
      u.bot_owner_id, o.username as bot_owner_username,
      (u.avatar IS NOT NULL) as has_avatar,
      t.token_prefix, t.last_used_at as token_last_used_at
    FROM users u
    JOIN users o ON u.bot_owner_id = o.id
    LEFT JOIN bot_tokens t ON u.id = t.bot_id
    WHERE u.id = ${params.id} AND u.is_bot = true
  `) as any[];

  return row ? transformBot(row) : null;
};

/** Count how many bots a user owns */
const countByOwner = async (params: { ownerId: string }): Promise<number> => {
  const [{ count }] = (await sql`
    SELECT COUNT(*)::int as count FROM users WHERE bot_owner_id = ${params.ownerId}
  `) as [{ count: number }];

  return count;
};

/**
 * Create a new bot account.
 * Returns the bot and the plain-text token (shown only once).
 */
const create = async (params: BotCreate): Promise<{ bot: Bot; token: string }> => {
  const { username, bio, ownerId } = params;

  // Generate token and hash it
  const token = generateToken();
  // Store prefix without bt_ for lookup (first 8 chars of the random part)
  const tokenPrefix = token.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 8);
  const tokenHash = await Bun.password.hash(token);

  // Create bot user with a random password (never used, bots authenticate via token)
  const randomPassword = await Bun.password.hash(crypto.randomUUID());

  const [botRow] = (await sql`
    INSERT INTO users (username, password_hash, real_name, bio, is_bot, bot_owner_id)
    VALUES (${username}, ${randomPassword}, ${username}, ${bio ?? null}, true, ${ownerId})
    RETURNING id, username, real_name, bio, role, created_at, bot_owner_id, (avatar IS NOT NULL) as has_avatar
  `) as any[];

  // Create token record
  await sql`
    INSERT INTO bot_tokens (bot_id, token_hash, token_prefix)
    VALUES (${botRow.id}, ${tokenHash}, ${tokenPrefix})
  `;

  // Fetch owner username for response
  const [owner] = (await sql`SELECT username FROM users WHERE id = ${ownerId}`) as { username: string }[];

  const bot: Bot = {
    ...transformBot(botRow),
    bot_owner_username: owner?.username ?? "",
    token_prefix: tokenPrefix,
    token_last_used_at: null,
  };

  return { bot, token };
};

/** Update a bot's profile */
const update = async (params: { id: string; data: BotUpdate }): Promise<Bot> => {
  const { id, data } = params;

  // Build update object with only defined fields
  const updates: Record<string, unknown> = {};
  if (data.username !== undefined) {
    updates.username = data.username;
    updates.real_name = data.username; // Keep real_name in sync with username for bots
  }
  if (data.bio !== undefined) updates.bio = data.bio ?? null;
  if (data.avatar !== undefined) updates.avatar = data.avatar ?? null;

  await sql`UPDATE users SET ${sql(updates)} WHERE id = ${id} AND is_bot = true`;

  const bot = await getById({ id });
  if (!bot) throw new Error("Bot not found after update");
  return bot;
};

/** Delete a bot account */
const remove = async (params: { id: string }): Promise<boolean> => {
  const [user] = (await sql`
    DELETE FROM users WHERE id = ${params.id} AND is_bot = true RETURNING id
  `) as { id: string }[];

  return !!user;
};

/** Regenerate a bot's token. Returns the new plain-text token. */
const regenerateToken = async (params: { id: string }): Promise<string> => {
  const token = generateToken();
  // Store prefix without bt_ for lookup (first 8 chars of the random part)
  const tokenPrefix = token.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 8);
  const tokenHash = await Bun.password.hash(token);

  await sql`
    UPDATE bot_tokens SET
      token_hash = ${tokenHash},
      token_prefix = ${tokenPrefix},
      last_used_at = NULL
    WHERE bot_id = ${params.id}
  `;

  return token;
};

// ==========================
// Token Verification
// ==========================

/**
 * Verify a bot token and return the bot's user ID if valid.
 * Updates last_used_at timestamp on successful verification.
 */
const verifyToken = async (params: { token: string }): Promise<string | null> => {
  // Token must start with prefix
  if (!params.token.startsWith(TOKEN_PREFIX)) return null;

  // Get the stored prefix (first 8 chars after bt_)
  const tokenPrefix = params.token.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 8);

  // Find tokens with matching prefix (should be unique, but check hash to be safe)
  const rows = (await sql`
    SELECT bot_id, token_hash FROM bot_tokens WHERE token_prefix = ${tokenPrefix}
  `) as { bot_id: string; token_hash: string }[];

  for (const row of rows) {
    const valid = await Bun.password.verify(params.token, row.token_hash);
    if (valid) {
      // Update last used timestamp
      await sql`UPDATE bot_tokens SET last_used_at = now() WHERE bot_id = ${row.bot_id}`;
      return row.bot_id;
    }
  }

  return null;
};

// ==========================
// Limit Check
// ==========================

/**
 * Check if a user can create more bots.
 * Admins are exempt from limits.
 */
const canCreateBot = async (params: { userId: string }): Promise<boolean> => {
  const [result] = (await sql`
    SELECT
      (SELECT role FROM users WHERE id = ${params.userId}) = 'admin' as is_admin,
      (SELECT COUNT(*)::int FROM users WHERE bot_owner_id = ${params.userId}) as bot_count
  `) as [{ is_admin: boolean; bot_count: number }];

  return result.is_admin || result.bot_count < env.MAX_BOTS_PER_USER;
};

// ==========================
// Service Export
// ==========================

export const botService = {
  getAll,
  getById,
  countByOwner,
  create,
  update,
  remove,
  regenerateToken,
  verifyToken,
  canCreateBot,
};
