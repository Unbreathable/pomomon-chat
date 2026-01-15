import { api } from "@/frontend/lib/client-utils";
import { isImageUrl } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import Dropdown from "@/frontend/components/ui/Dropdown";
import type { User } from "@/shared/schemas";
import { showGeneralHelp, showNotificationsHelp } from "./HelpDialog";
import { createSignal } from "solid-js";

// Cookie helpers
const DISABLE_GIFS_COOKIE = "disable_gifs";

const getDisableGifsCookie = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${DISABLE_GIFS_COOKIE}=true`);
};

const setDisableGifsCookie = (value: boolean): void => {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${DISABLE_GIFS_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

/** Dropdown menu with profile actions (edit, password, logout, delete). */
export default function ProfileActionsDropdown(props: { user: User }) {
  const [gifsDisabled, setGifsDisabled] = createSignal(getDisableGifsCookie());

  const toggleGifs = () => {
    const newValue = !gifsDisabled();
    setGifsDisabled(newValue);
    setDisableGifsCookie(newValue);
  };

  const editProfileMutation = createMutation({
    mutation: async () => {
      const values = await prompts.form({
        title: "Edit Profile",
        icon: "ti ti-user",
        fields: {
          avatar: {
            type: "image",
            round: true,
            default: props.user.avatar,
          },
          username: {
            type: "text",
            label: "Username",
            placeholder: "Username",
            description:
              "3-20 characters, letters, numbers and underscores only",
            required: true,
            minLength: 3,
            maxLength: 20,
            default: props.user.username,
            icon: "ti ti-at",
          },
          bio: {
            type: "text",
            label: "Bio",
            placeholder: "Tell us about yourself...",
            description: "Max 500 characters",
            multiline: true,
            maxLength: 500,
            default: props.user.bio || undefined,
          },
        },
      });

      if (!values) return;

      const res = await api.users.me.$patch({
        json: {
          username:
            values.username !== props.user.username
              ? values.username
              : undefined,
          bio: values.bio,
          // Only send avatar if it changed (not a URL anymore)
          avatar: isImageUrl(values.avatar) ? undefined : values.avatar,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error updating profile",
        );
      }

      return await res.json();
    },
    onSuccess: () => window.location.reload(),
    onError: (error) => prompts.error(error.message),
  });

  const changePasswordMutation = createMutation({
    mutation: async () => {
      const values = await prompts.form({
        title: "Change Password",
        icon: "ti ti-key",
        confirmText: "Change Password",
        fields: {
          password: {
            type: "text",
            label: "New Password",
            placeholder: "New password",
            description:
              "8-128 characters, at least one letter and one number or special character",
            password: true,
            required: true,
            minLength: 8,
            maxLength: 128,
            icon: "ti ti-key",
          },
          passwordConfirm: {
            type: "text",
            label: "Confirm Password",
            placeholder: "Repeat password",
            password: true,
            required: true,
            icon: "ti ti-key",
          },
        },
      });

      if (!values) return;

      const res = await api.auth["change-password"].$post({ json: values });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error changing password",
        );
      }

      return await res.json();
    },
    onSuccess: async (data) => {
      if (!data) return;
      await prompts.alert(data.message, {
        title: "Success",
        icon: "ti ti-check",
        variant: "success",
      });
    },
    onError: (error) => prompts.error(error.message),
  });

  const logoutAllDevicesMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        "Are you sure you want to logout from all devices? You will need to login again.",
        {
          title: "Logout All Devices",
          icon: "ti ti-logout",
          confirmText: "Logout All",
        },
      );

      if (!confirmed) return null;

      const res = await api.users[":id"].sessions.$delete({
        param: { id: props.user.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Error logging out");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      if (!data) return;
      window.location.href = "/auth/login";
    },
    onError: (error) => prompts.error(error.message),
  });

  const deleteAccountMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        "Are you sure you want to delete your account? This action cannot be undone and you will lose all your data.",
        {
          title: "Delete Account",
          icon: "ti ti-trash",
          variant: "danger",
          confirmText: "Delete My Account",
          cancelText: "Cancel",
        },
      );

      if (!confirmed) return null;

      const res = await api.users.me.$delete();

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error deleting account",
        );
      }

      return await res.json();
    },
    onSuccess: (data) => {
      if (!data) return;
      window.location.href = "/";
    },
    onError: (error) => prompts.error(error.message),
  });

  const getElements = () => {
    const elements: any[] = [
      {
        icon: "ti ti-user",
        label: "Edit Profile",
        action: () => editProfileMutation.mutate({}),
      },
      {
        icon: "ti ti-key",
        label: "Change Password",
        action: () => changePasswordMutation.mutate({}),
      },
      {
        icon: "ti ti-logout",
        label: "Logout All Devices",
        action: () => logoutAllDevicesMutation.mutate({}),
      },
      {
        sectionLabel: "Local Settings",
        items: [
          {
            element: () => (
              <label class="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-white/30 dark:hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={gifsDisabled()}
                  onChange={toggleGifs}
                  class="shrink-0"
                />
                <span>Disable GIFs</span>
              </label>
            ),
          },
        ],
      },
      {
        sectionLabel: "Help",
        items: [
          {
            icon: "ti ti-help",
            label: "General",
            action: showGeneralHelp,
          },
          {
            icon: "ti ti-bell-question",
            label: "Notifications",
            action: showNotificationsHelp,
          },
          {
            icon: "ti ti-brand-github",
            label: "Source Code",
            href: "https://github.com/valentinkolb/chat",
            external: true,
          },
        ],
      },
    ];

    // Danger zone
    elements.push({
      sectionLabel: "Danger Zone",
      items: [
        {
          icon: "ti ti-trash",
          label: "Delete Account",
          action: () => deleteAccountMutation.mutate({}),
          variant: "danger" as const,
        },
      ],
    });

    return elements;
  };

  return (
    <Dropdown
      trigger={
        <button
          class="icon-btn"
          title="Profile Actions"
          aria-label="Profile Actions"
        >
          <i class="ti ti-dots-vertical" />
        </button>
      }
      position="bottom-right"
      width="w-56"
      elements={getElements()}
    />
  );
}
