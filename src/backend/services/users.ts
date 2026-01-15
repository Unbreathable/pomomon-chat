import { sql, redis } from "bun";
import { auth } from "@/backend/lib/auth";
import { toAvatarUrl, toISOString } from "@/backend/lib/transforms";
import type { User } from "@/shared/schemas";

/**
 * User service.
 * Handles user CRUD, authentication, and password reset operations.
 */

// Re-export User type for convenience
export type { User } from "@/shared/schemas";

// ==========================
// Internal Types (not part of API)
// ==========================

export type UserFilters = {
  search?: string;
  is_bot?: boolean;
};

export type UserCreate = {
  username: string;
  passwordHash: string;
  realName: string;
};

export type UserUpdate = {
  username?: string;
  bio?: string | null;
  avatar?: string | null; // Accepts base64 for storage
};

/** Transforms a database row to a User object. */
const transformUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  real_name: row.real_name,
  bio: row.bio ?? null,
  avatar: toAvatarUrl(row.id, !!row.has_avatar),
  role: row.role,
  is_bot: row.is_bot ?? false,
  created_at: toISOString(row.created_at),
});

// ==========================
// Queries
// ==========================

const getAll = async (params: {
  filters: UserFilters;
  page: number;
  perPage: number;
}): Promise<{ users: User[]; total: number; totalPages: number }> => {
  const { filters, page, perPage } = params;

  // Build conditional filters using Bun's sql`` pattern
  const searchFilter = filters.search
    ? sql`AND (username ILIKE ${"%" + filters.search + "%"} OR real_name ILIKE ${"%" + filters.search + "%"})`
    : sql``;
  const isBotFilter = filters.is_bot !== undefined ? sql`AND is_bot = ${filters.is_bot}` : sql``;

  const [{ total }] = (await sql`
    SELECT COUNT(*)::int as total FROM users WHERE true ${searchFilter} ${isBotFilter}
  `) as [{ total: number }];

  const rows = (await sql`
    SELECT id, username, real_name, bio, role, is_bot, created_at, (avatar IS NOT NULL) as has_avatar
    FROM users
    WHERE true ${searchFilter} ${isBotFilter}
    ORDER BY created_at DESC
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `) as any[];

  return {
    users: rows.map(transformUser),
    total,
    totalPages: Math.ceil(total / perPage),
  };
};

const getById = async (params: { id: string }): Promise<User | null> => {
  const [user] = (await sql`
    SELECT id, username, real_name, bio, role, is_bot, created_at, (avatar IS NOT NULL) as has_avatar
    FROM users WHERE id = ${params.id}
  `) as any[];

  return user ? transformUser(user) : null;
};

const getByUsername = async (params: { username: string }): Promise<(User & { password_hash: string }) | null> => {
  const [user] = (await sql`
    SELECT id, username, real_name, bio, role, is_bot, created_at, password_hash, (avatar IS NOT NULL) as has_avatar
    FROM users WHERE username = ${params.username}
  `) as any[];

  return user ? { ...transformUser(user), password_hash: user.password_hash } : null;
};

const create = async (params: UserCreate): Promise<User> => {
  const [user] = (await sql`
    INSERT INTO users (username, password_hash, real_name)
    VALUES (${params.username}, ${params.passwordHash}, ${params.realName})
    RETURNING id, username, real_name, bio, role, is_bot, created_at, (avatar IS NOT NULL) as has_avatar
  `) as any[];

  return transformUser(user);
};

const update = async (params: { id: string; data: UserUpdate }): Promise<User> => {
  const { id, data } = params;

  // Build update object with only defined fields
  const updates: Record<string, unknown> = {};
  if (data.username !== undefined) updates.username = data.username;
  if (data.bio !== undefined) updates.bio = data.bio ?? null;
  if (data.avatar !== undefined) updates.avatar = data.avatar ?? null;

  const [user] = (await sql`
    UPDATE users SET ${sql(updates)}
    WHERE id = ${id}
    RETURNING id, username, real_name, bio, role, is_bot, created_at, (avatar IS NOT NULL) as has_avatar
  `) as any[];

  return transformUser(user);
};

const updateRole = async (params: { id: string; role: "user" | "admin" }): Promise<User> => {
  const [user] = (await sql`
    UPDATE users SET role = ${params.role}
    WHERE id = ${params.id}
    RETURNING id, username, real_name, bio, role, is_bot, created_at, (avatar IS NOT NULL) as has_avatar
  `) as any[];

  return transformUser(user);
};

const updatePassword = async (params: { id: string; passwordHash: string }): Promise<boolean> => {
  const [user] = (await sql`
    UPDATE users SET password_hash = ${params.passwordHash}
    WHERE id = ${params.id}
    RETURNING id
  `) as { id: string }[];

  return !!user;
};

const remove = async (params: { id: string }): Promise<boolean> => {
  const [user] = (await sql`DELETE FROM users WHERE id = ${params.id} RETURNING id`) as { id: string }[];
  if (user) await auth.session.getUser(params.id);
  return !!user;
};

// ==========================
// Password Reset
// ==========================

const createPasswordResetToken = async (params: { userId: string }): Promise<{ token: string; expiresAt: Date }> => {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await redis.set(`reset:${token}`, JSON.stringify({ user_id: params.userId }), "EX", 24 * 60 * 60);

  return { token, expiresAt };
};

const getPasswordResetToken = async (params: { token: string }): Promise<{ user_id: string } | null> => {
  const data = await redis.get(`reset:${params.token}`);
  return data ? JSON.parse(data) : null;
};

const deletePasswordResetToken = async (params: { token: string }): Promise<void> => {
  await redis.del(`reset:${params.token}`);
};

// ==========================
// Raw Data Access (for image routes)
// ==========================

const getAvatarData = async (params: { id: string }): Promise<{ avatar: string | null; username: string } | null> => {
  const [user] = (await sql`
    SELECT avatar, username FROM users WHERE id = ${params.id}
  `) as { avatar: string | null; username: string }[];

  return user ?? null;
};

// ==========================
// Service Export
// ==========================

export const userService = {
  getAll,
  getById,
  getByUsername,
  create,
  update,
  updateRole,
  updatePassword,
  remove,
  createPasswordResetToken,
  getPasswordResetToken,
  deletePasswordResetToken,
  getAvatarData,
};
