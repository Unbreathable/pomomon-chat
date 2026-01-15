import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import SearchBar from "../home/SearchBar.island";
import { Pagination } from "@/frontend/components/layout/Pagination";
import UserActionsDropdown from "./UserActionsDropdown.island";
import Avatar from "@/frontend/components/ui/Avatar";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { statsService } from "@/backend/services/stats";
import { userService } from "@/backend/services/users";
import dayjs from "dayjs";
import "dayjs/locale/en";

export const adminPage = async (c: Context<AuthContext>) => {
  const user = c.get("user");

  // Set dayjs locale to English
  dayjs.locale("en");

  // Pagination
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = 20;
  const searchQuery = c.req.query("search");
  const hasSearch = searchQuery !== undefined;

  // Stats - single optimized query instead of 7 separate queries!
  const stats = await statsService.getAdminStats();

  // Users with search
  const result = await userService.getAll({
    filters: { search: searchQuery },
    page,
    perPage,
  });
  const baseUrl = searchQuery
    ? `/admin?search=${encodeURIComponent(searchQuery)}&page=`
    : "/admin?page=";

  const { users, total, totalPages } = result;

  const statsDisplay = [
    { label: "Total Users", value: stats.total_users, icon: "ti-users" },
    {
      label: "Active Today",
      value: stats.active_users_today,
      icon: "ti-chart-line",
    },
    {
      label: "Active This Week",
      value: stats.active_users_week,
      icon: "ti-calendar-week",
    },
    {
      label: "Total Messages",
      value: stats.total_messages,
      icon: "ti-messages",
    },
    {
      label: "Chatrooms (Visible)",
      value: stats.listed_chatrooms,
      icon: "ti-eye",
    },
    {
      label: "Chatrooms (Hidden)",
      value: stats.unlisted_chatrooms,
      icon: "ti-eye-off",
    },
  ];

  return html(
    <Layout c={c} showSearchButton={true}>
      <div class="container flex flex-col gap-6 p-2 sm:p-4 md:p-6">
        {/* Stats */}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statsDisplay.map((stat, index) => (
            <div
              class="paper p-4 text-center"
              style={`view-transition-name: admin-stat-${index}`}
            >
              <i
                class={`ti ${stat.icon} mb-2 text-2xl text-dimmed hidden md:block`}
              />
              <div class="text-2xl font-bold">{stat.value}</div>
              <div class="mt-1 text-xs text-dimmed">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Users Section */}
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <a
              href="/admin"
              class="text-lg font-semibold hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Users ({total})
            </a>
            <a href="/admin/invites" class="btn-simple text-sm">
              <i class="ti ti-ticket" />
              <span class="hidden sm:inline">Invites</span>
            </a>
          </div>

          {hasSearch && (
            <div style="view-transition-name: admin-searchbar">
              <SearchBar />
            </div>
          )}

          {users.length === 0 ? (
            <div class="paper p-8 text-center">
              <i class="ti ti-users-off mb-2 text-4xl text-dimmed" />
              <p class="text-dimmed">No users found</p>
            </div>
          ) : (
            <div class="flex flex-col gap-3">
              {users.map((u: any) => (
                <div
                  class="paper p-4"
                  style={`view-transition-name: admin-user-${u.id}`}
                >
                  <div class="flex items-center gap-4">
                    <Avatar userId={u.id} username={u.username} size="lg" />
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">{u.username}</span>
                        {u.role === "admin" && (
                          <span class="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                            Admin
                          </span>
                        )}
                      </div>
                      <div class="mt-1 text-sm text-dimmed">{u.real_name}</div>
                      {u.bio && (
                        <p class="mt-1 text-sm text-secondary">{u.bio}</p>
                      )}
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-xs text-dimmed">
                        {dayjs(u.created_at).format("dd DD.MM.YYYY")}
                      </div>
                      <UserActionsDropdown
                        userId={u.id}
                        username={u.username}
                        role={u.role}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={baseUrl}
          />
        </div>
      </div>
    </Layout>,
    { title: "Admin Panel", c },
  );
};
