import { redis } from "bun";
import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import CreateInviteButton from "./CreateInviteButton.island";
import SearchBar from "../../home/SearchBar.island";
import { Pagination } from "@/frontend/components/layout/Pagination";
import InviteActionsDropdown from "./InviteActionsDropdown.island";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { parsePagination } from "@/shared/pagination";
import dayjs from "dayjs";
import "dayjs/locale/en";

export const invitesPage = async (c: Context<AuthContext>) => {
  const user = c.get("user");

  // Set dayjs locale to English
  dayjs.locale("en");

  // Pagination
  const { page, perPage, offset } = parsePagination({
    page: parseInt(c.req.query("page") || "1", 10),
    per_page: 20,
  });
  const searchQuery = c.req.query("search");
  const hasSearch = searchQuery !== undefined;

  // Get all active invites from Redis
  const inviteKeys = await redis.keys("invite:*");
  const invites = [];

  for (const key of inviteKeys) {
    const token = key.replace("invite:", "");
    const data = await redis.get(key);
    const ttl = await redis.ttl(key);

    if (data && ttl > 0) {
      const parsed = JSON.parse(data);
      const expiresAt = new Date(Date.now() + ttl * 1000);
      const baseUrl = new URL(c.req.url).origin;

      invites.push({
        token,
        real_name: parsed.real_name,
        invite_url: `${baseUrl}/auth/register/${token}`,
        expires_at: expiresAt,
      });
    }
  }

  // Sort by expires_at descending (newest first)
  invites.sort((a, b) => b.expires_at.getTime() - a.expires_at.getTime());

  // Filter by search query
  const filteredInvites = hasSearch
    ? invites.filter((invite) =>
        invite.real_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : invites;

  // Paginate invites
  const total = filteredInvites.length;
  const paginatedInvites = filteredInvites.slice(offset, offset + perPage);
  const totalPages = Math.ceil(total / perPage);
  const baseUrl = searchQuery
    ? `/admin/invites?search=${encodeURIComponent(searchQuery)}&page=`
    : "/admin/invites?page=";

  return html(
    <Layout c={c} showSearchButton={true}>
      <div class="container flex flex-col gap-6 p-2">
        {/* Header */}
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <a href="/admin" class="hidden sm:block">
                <i class="ti ti-arrow-left" />
              </a>
              <a
                href="/admin/invites"
                class="text-lg font-semibold hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Invites ({total})
              </a>
            </div>
            <div style="view-transition-name: admin-invite-button">
              <CreateInviteButton />
            </div>
          </div>

          {hasSearch && (
            <div style="view-transition-name: admin-searchbar">
              <SearchBar />
            </div>
          )}

          {paginatedInvites.length === 0 ? (
            <div class="paper p-8 text-center">
              <i class="ti ti-ticket-off mb-2 text-xl text-dimmed" />
              <p class="text-dimmed">
                {hasSearch ? "No invites found" : "No active invites"}
              </p>
            </div>
          ) : (
            <div class="flex flex-col gap-3">
              {paginatedInvites.map((invite: any) => (
                <div class="paper p-4 group">
                  <div class="flex items-start gap-4">
                    <div class="shrink-0 h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <i class="ti ti-ticket text-lg text-white" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold">{invite.real_name}</div>
                      <div class="mt-1 text-xs font-mono text-dimmed break-all">
                        {invite.invite_url}
                      </div>
                      <div class="mt-2 text-xs text-dimmed">
                        Expires{" "}
                        {dayjs(invite.expires_at).format("DD.MM.YYYY HH:mm")}
                      </div>
                    </div>
                    <InviteActionsDropdown
                      token={invite.token}
                      inviteUrl={invite.invite_url}
                      realName={invite.real_name}
                    />
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
    { title: "Invites", c },
  );
};
