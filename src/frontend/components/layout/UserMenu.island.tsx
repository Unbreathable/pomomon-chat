import type { User } from "@/shared/schemas";
import { createSignal } from "solid-js";
import Avatar from "@/frontend/components/ui/Avatar";
import Dropdown from "@/frontend/components/ui/Dropdown";

type UserMenuProps = {
  user: User;
  theme: "light" | "dark";
};

/** User avatar dropdown with theme toggle, navigation, and logout. */
export default function UserMenu(props: UserMenuProps) {
  const [theme, setTheme] = createSignal(props.theme);

  const toggleTheme = (): void => {
    const newTheme = theme() === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
    setTheme(newTheme);
  };

  const logout = async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  };

  const UserInfoElement = () => (
    <a
      href="/me"
      class="flex border-b border-zinc-200 p-4 dark:border-zinc-800 ransition-colors hover:bg-white/30 dark:hover:bg-white/10"
    >
      <div class="flex items-center gap-3">
        <Avatar
          viewTransitionName="user-avatar"
          userId={props.user.id}
          username={props.user.username}
          size="sm"
        />
        <div class="flex-1">
          <div class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {props.user.username}
          </div>
          <div class="hidden sm:block text-xs text-dimmed">
            {props.user.real_name}
          </div>
        </div>
      </div>
    </a>
  );

  const getElements = () => [
    { element: <UserInfoElement /> },
    {
      icon: theme() === "dark" ? "ti ti-sunset-2" : "ti ti-moon-stars",
      label: theme() === "dark" ? "Light" : "Dark",
      action: toggleTheme,
    },
    ...(props.user.role === "admin"
      ? [{ icon: "ti ti-adjustments", label: "Admin Panel", href: "/admin" }]
      : []),
    {
      sectionLabel: "API",
      items: [
        {
          icon: "ti ti-robot",
          label: "llms.txt",
          href: "/llms.txt",
        },
        {
          icon: "ti ti-api",
          label: "API Docs",
          href: "/api/docs",
        },
      ],
    },
    {
      sectionLabel: "Legal",
      items: [
        {
          icon: "ti ti-file-text",
          label: "Terms",
          href: "/agb",
          external: true,
        },
        {
          icon: "ti ti-shield-lock",
          label: "Privacy",
          href: "/datenschutz",
          external: true,
        },
        {
          icon: "ti ti-info-circle",
          label: "Imprint",
          href: "/impressum",
          external: true,
        },
      ],
    },
    {
      items: [
        {
          icon: "ti ti-logout",
          label: "Sign Out",
          action: logout,
          variant: "danger" as const,
        },
      ],
    },
  ];

  return (
    <Dropdown
      trigger={
        <button
          type="button"
          class="rounded-full hover:ring-2 hover:ring-zinc-300 dark:hover:ring-zinc-600 scale-90 sm:scale-100 transition-all"
          aria-label="User menu"
        >
          <Avatar
            userId={props.user.id}
            username={props.user.username}
            class="sm:h-10 sm:w-10 h-5 w-5"
          />
        </button>
      }
      width="w-64"
      className="user-menu-dropdown"
      elements={getElements()}
    />
  );
}
