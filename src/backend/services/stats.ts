import { sql } from "bun";

/**
 * Stats service.
 * Provides aggregated statistics for the admin dashboard.
 */

// ==========================
// Types
// ==========================

export type AdminStats = {
  total_users: number;
  total_messages: number;
  total_chatrooms: number;
  unlisted_chatrooms: number;
  listed_chatrooms: number;
  active_users_today: number;
  active_users_week: number;
};

// ==========================
// Queries
// ==========================

/**
 * Retrieves aggregated statistics for the admin dashboard.
 * Includes user counts, message counts, and activity metrics.
 *
 * @returns Promise with all admin statistics
 */
const getAdminStats = async (): Promise<AdminStats> => {
  const [stats] = (await sql`
    SELECT
      (SELECT COUNT(*) FROM users)::int as total_users,
      (SELECT COUNT(*) FROM messages)::int as total_messages,
      (SELECT COUNT(*) FROM chatrooms WHERE NOT deleted)::int as total_chatrooms,
      (SELECT COUNT(*) FROM chatrooms WHERE unlisted AND NOT deleted)::int as unlisted_chatrooms,
      (SELECT COUNT(*) FROM chatrooms WHERE NOT unlisted AND NOT deleted)::int as listed_chatrooms,
      (SELECT COUNT(DISTINCT created_by) FROM messages WHERE created_at >= NOW() - INTERVAL '1 day' AND created_by IS NOT NULL)::int as active_users_today,
      (SELECT COUNT(DISTINCT created_by) FROM messages WHERE created_at >= NOW() - INTERVAL '7 days' AND created_by IS NOT NULL)::int as active_users_week
  `) as AdminStats[];

  return stats!;
};

// ==========================
// Service Export
// ==========================

export const statsService = {
  getAdminStats,
};
