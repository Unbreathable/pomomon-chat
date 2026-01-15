import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import { Pagination } from "@/frontend/components/layout/Pagination";
import SearchBar from "./SearchBar.island";
import AdminFilter from "./AdminFilter.island";
import NotificationPrompt from "./NotificationPrompt.island";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { chatroomService } from "@/backend/services/chatrooms";
import { env } from "@/shared/env";

export const homePage = async (c: Context<AuthContext>) => {
  const user = c.get("user");

  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = 50;
  const searchQuery = c.req.query("search");
  const hasSearch = searchQuery !== undefined;
  const showFavorites = c.req.query("favourites") === "true";
  const showUnlisted = c.req.query("unlisted") === "true";
  const showDeleted = c.req.query("deleted") === "true";

  const result = await chatroomService.getAll({
    filters: {
      userId: user.id,
      search: searchQuery,
      filterFavorited: showFavorites || undefined,
      includeUnlisted: showUnlisted,
      includeDeleted: showDeleted,
    },
    page,
    perPage,
  });

  const buildUrl = (pageNum?: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (showFavorites) params.set("favourites", "true");
    if (showUnlisted) params.set("unlisted", "true");
    if (showDeleted) params.set("deleted", "true");
    if (pageNum) params.set("page", pageNum.toString());
    return params.toString() ? `/?${params.toString()}` : "/";
  };
  const baseUrl = buildUrl() + (buildUrl() ? "&page=" : "?page=");

  return html(
    <Layout c={c} showSearchButton showFavoritesButton>
      <div class="container flex flex-col sm:gap-2 p-2 sm:p-4 md:p-6">
        {hasSearch && (
          <div
            class="flex gap-2 items-center mb-2 sm:mb-0"
            style="view-transition-name: searchbar"
          >
            <div class="flex-1 min-w-0">
              <SearchBar />
            </div>
            {user.role === "admin" && <AdminFilter />}
          </div>
        )}

        {result.chatrooms.length === 0 ? (
          <div class="flex flex-col items-center justify-center flex-1 py-12 text-center">
            <i class="ti ti-message-off mb-3 text-4xl text-zinc-400 dark:text-zinc-600" />
            <p class="text-sm text-dimmed">No chatrooms available</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.chatrooms.map((room: any) => (
              <div
                class={`group paper hover:paper-highlighted p-4 flex gap-3 items-center relative ${room.unlisted ? "opacity-60 shimmer" : ""}`}
                style={`view-transition-name: chat-${room.id}`}
              >
                <a
                  href={`/room/${room.id}`}
                  class="absolute inset-0 z-0"
                  aria-label={room.name}
                />
                <img
                  src={`/api/chatrooms/${room.id}/image`}
                  alt={room.name}
                  class="shrink-0 h-12 w-12 rounded-lg"
                />

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3
                      class={`font-semibold truncate ${room.deleted ? "text-red-500 line-through" : "text-zinc-900 dark:text-zinc-100"}`}
                      style={`view-transition-name: chat-title-${room.id}`}
                    >
                      {room.name}
                    </h3>
                    {room.is_favorited && (
                      <i class="ti ti-heart shrink-0 text-xs bg-linear-to-br from-pink-500 to-red-500 bg-clip-text text-transparent" />
                    )}
                    {room.is_unmuted && (
                      <i class="ti ti-bell-ringing shrink-0 text-xs bg-linear-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent" />
                    )}
                    {room.pinned && (
                      <i class="ti ti-pin shrink-0 text-xs bg-linear-to-br from-teal-400 to-blue-500 bg-clip-text text-transparent" />
                    )}
                    {room.unlisted && (
                      <i class="ti ti-eye-off shrink-0 text-xs text-zinc-400 dark:text-zinc-600" />
                    )}
                    {room.deleted && (
                      <i class="ti ti-trash shrink-0 text-xs text-red-400 dark:text-red-600" />
                    )}
                  </div>

                  <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {room.description ?? "No description..."}
                  </p>
                </div>

                <a
                  href={`/room/${room.id}/info`}
                  class="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-1.5 shrink-0 rounded flex items-center justify-center"
                  aria-label={`Info for ${room.name}`}
                >
                  <i class="ti ti-info-circle text-lg text-zinc-500 hover:text-blue-500 transition-colors" />
                </a>
              </div>
            ))}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={result.totalPages}
          baseUrl={baseUrl}
        />
      </div>
      <NotificationPrompt />
    </Layout>,
    { title: env.APP_NAME, c },
  );
};
