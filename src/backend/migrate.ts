import { sql } from "bun";

// ==========================
// Database Schema
// ==========================

/**
 * Creates all database tables, indexes, and the initial admin user.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
export const migrate = async (): Promise<void> => {
  const log = console.log;

  // ==========================
  // Enums
  // ==========================

  await sql`
    DO $$ BEGIN
      CREATE TYPE chatroom_role AS ENUM ('member', 'manage');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `.simple();
  log("  ✓ chatroom_role enum");

  // ==========================
  // Tables
  // ==========================

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      real_name TEXT NOT NULL,
      bio TEXT,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      is_bot BOOLEAN NOT NULL DEFAULT false,
      bot_owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT bot_owner_check CHECK (
        (is_bot = false AND bot_owner_id IS NULL) OR
        (is_bot = true AND bot_owner_id IS NOT NULL)
      )
    )
  `.simple();
  log("  ✓ users table");

  await sql`
    CREATE TABLE IF NOT EXISTS chatrooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      image TEXT,
      unlisted BOOLEAN NOT NULL DEFAULT false,
      pinned BOOLEAN NOT NULL DEFAULT false,
      deleted BOOLEAN NOT NULL DEFAULT false,
      is_townsquare BOOLEAN NOT NULL DEFAULT true,
      bots_allowed BOOLEAN NOT NULL DEFAULT true,
      join_token UUID DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.simple();
  log("  ✓ chatrooms table");

  await sql`
    CREATE TABLE IF NOT EXISTS chatroom_members (
      chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role chatroom_role NOT NULL DEFAULT 'member',
      PRIMARY KEY (chatroom_id, user_id)
    )
  `.simple();
  log("  ✓ chatroom_members table");

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'info', 'gif')),
      content TEXT NOT NULL CHECK (length(content) <= 500000),
      content_meta TEXT,
      deleted BOOLEAN NOT NULL DEFAULT false,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.simple();
  log("  ✓ messages table");

  await sql`
    CREATE TABLE IF NOT EXISTS message_edits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      old_content TEXT NOT NULL,
      edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.simple();
  log("  ✓ message_edits table");

  await sql`
    CREATE TABLE IF NOT EXISTS bot_tokens (
      bot_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      token_prefix TEXT NOT NULL,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.simple();
  log("  ✓ bot_tokens table");

  await sql`
    CREATE TABLE IF NOT EXISTS favorite_chatrooms (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, chatroom_id)
    )
  `.simple();
  log("  ✓ favorite_chatrooms table");

  await sql`
    CREATE TABLE IF NOT EXISTS unmuted_chatrooms (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, chatroom_id)
    )
  `.simple();
  log("  ✓ unmuted_chatrooms table");

  // ==========================
  // Indexes
  // ==========================

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chatroom_members_user
    ON chatroom_members(user_id)
  `.simple();
  log("  ✓ chatroom_members index");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_chatroom
    ON messages(chatroom_id, created_at DESC)
  `.simple();
  log("  ✓ messages index");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_message_edits_message
    ON message_edits(message_id, edited_at ASC)
  `.simple();
  log("  ✓ message_edits index");

  // ==========================
  // Initial Admin User
  // ==========================

  const [existingAdmin] = await sql`
    SELECT id FROM users WHERE username = ${process.env.INITIAL_ADMIN_USERNAME}
  `;

  if (!existingAdmin) {
    const passwordHash = await Bun.password.hash(process.env.INITIAL_ADMIN_PASSWORD!);
    await sql`
      INSERT INTO users (username, password_hash, real_name, role)
      VALUES (${process.env.INITIAL_ADMIN_USERNAME}, ${passwordHash}, 'System Admin', 'admin')
    `;
    log(`  ✓ admin user created (username: ${process.env.INITIAL_ADMIN_USERNAME})`);
  } else {
    log(`  ✓ admin user exists`);
  }
};

// ==========================
// CLI Entry Point
// ==========================

if (import.meta.main) {
  console.log("Running migrations...");
  await migrate();
  console.log("Migrations complete!");
}
