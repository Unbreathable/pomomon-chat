import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import ProfileActionsDropdown from "./ProfileActionsDropdown.island";
import Avatar from "@/frontend/components/ui/Avatar";
import MyBots from "./MyBots.island";
import { env } from "@/shared/env";

export const mePage = async (c: Context<AuthContext>) => {
  const user = c.get("user");

  return html(
    <Layout c={c} showSearchButton={false}>
      <div class="container flex flex-col gap-6 p-2 sm:p-4 md:p-6">
        <div class="paper p-6" style="view-transition-name: me-profile-card">
          <div class="flex flex-col gap-6">
            {/* Avatar and Actions */}
            <div class="flex items-center gap-4">
              <Avatar
                userId={user.id}
                username={user.username}
                size="xl"
                viewTransitionName="me-avatar"
              />
              <div class="flex-1">
                <h2
                  class="text-xl font-semibold"
                  style="view-transition-name: me-username"
                >
                  {user.username}
                </h2>
                <p
                  class="text-sm text-dimmed"
                  style="view-transition-name: me-real-name"
                >
                  {user.real_name}
                </p>
              </div>
              <ProfileActionsDropdown user={user} />
            </div>

            {/* Info */}
            <div
              class="flex flex-col gap-3"
              style="view-transition-name: me-info-section"
            >
              <div style="view-transition-name: me-info-username">
                <label class="text-label">Username</label>
                <p class="mt-1">{user.username}</p>
              </div>

              <div style="view-transition-name: me-info-realname">
                <label class="text-label">Real Name</label>
                <p class="mt-1">{user.real_name}</p>
              </div>

              {user.bio && (
                <div style="view-transition-name: me-info-bio">
                  <label class="text-label">Bio</label>
                  <p class="mt-1">{user.bio}</p>
                </div>
              )}

              <div style="view-transition-name: me-info-role">
                <label class="text-label">Role</label>
                <p class="mt-1">
                  {user.role === "admin" ? (
                    <span class="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                      Admin
                    </span>
                  ) : (
                    <span>User</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bots Section */}
        <MyBots
          maxBotsPerUser={env.MAX_BOTS_PER_USER}
          isAdmin={user.role === "admin"}
        />
      </div>
    </Layout>,
    { title: "My Profile", c },
  );
};
