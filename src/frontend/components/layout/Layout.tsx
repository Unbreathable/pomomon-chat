import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { JSX } from "solid-js/jsx-runtime";
import UserMenu from "./UserMenu.island";
import CreateButton from "./CreateButton.island";
import SearchButton from "./SearchButton.island";
import FavoritesButton from "./FavoritesButton.island";
import GlobalNotifications from "./GlobalNotifications.client";
import BinaryBackground from "./BinaryBackground.client";

type LayoutProps = {
  children: JSX.Element;
  c: Context<AuthContext>;
  showSearchButton?: boolean;
  showFavoritesButton?: boolean;
  enableNotifications?: boolean;
  noHeader?: boolean;
};

/** Main application layout with sidebar navigation and optional notifications. */
export default function Layout({
  children,
  c,
  showSearchButton = false,
  showFavoritesButton = false,
  enableNotifications = true,
  noHeader = false,
}: LayoutProps) {
  const user = c.get("user");
  const sessionToken = c.get("sessionToken");
  const theme = (getCookie(c, "theme") ?? "light") as "light" | "dark";

  return (
    <div class="h-screen w-screen overflow-hidden flex flex-col sm:flex-row relative">
      <BinaryBackground />

      {/* Sidebar - Mobile: one paper container, Desktop: two separate paper bubbles */}
      {noHeader ? null : (
        <div class="shrink-0 flex flex-row sm:flex-col items-center justify-between p-2 sm:p-0 gap-3 paper sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none sm:shadow-none sm:border-0 sm:rounded-none mt-2 sm:mb-2 ml-2 mr-2 sm:mr-0">
          {/* Top Bubble - App Icon (Desktop: paper bubble, Mobile: no paper) */}
          <a
            href="/"
            class="flex items-center justify-center aspect-square h-full sm:paper sm:w-full sm:h-auto sm:p-2"
            style="view-transition-name: app-icon"
          >
            <i class="ti ti-bubble text-3xl sm:text-4xl bg-linear-to-br from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent" />
          </a>

          {/* Bottom Bubble - Actions + Avatar (Desktop: paper bubble, Mobile: no paper) */}
          <div class="flex flex-row sm:flex-col gap-3 sm:p-2 items-center sm:paper">
            {showFavoritesButton && (
              <div style="view-transition-name: favorites-button">
                <FavoritesButton />
              </div>
            )}

            {showSearchButton && (
              <div style="view-transition-name: search-button">
                <SearchButton />
              </div>
            )}

            {user && (
              <div style="view-transition-name: create-button">
                <CreateButton />
              </div>
            )}

            {/* User Avatar */}
            {user && <UserMenu user={user} theme={theme} />}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main class="flex-1 overflow-auto scrollbar">{children}</main>

      {/* Global WebSocket for notifications (only if not in a specific room) */}
      {enableNotifications && sessionToken && (
        <GlobalNotifications sessionToken={sessionToken} />
      )}

      <div class="absolute bg-zinc-50 dark:bg-zinc-950 -z-20 w-screen h-screen"></div>
    </div>
  );
}
