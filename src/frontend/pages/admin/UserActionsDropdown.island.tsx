import { api } from "@/frontend/lib/client-utils";
import { copyToClipboard } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import { generate } from "lean-qr/nano";
import { toSvgDataURL } from "lean-qr/extras/svg";
import Dropdown from "@/frontend/components/ui/Dropdown";

/** Admin dropdown for user management (reset password, logout, role, delete). */
export default function UserActionsDropdown(props: {
  userId: string;
  username: string;
  role: "user" | "admin";
}) {
  const resetPasswordMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Do you want to reset the password for ${props.username}?`,
        {
          title: "Reset Password",
          icon: "ti ti-key",
          confirmText: "Reset",
        },
      );

      if (!confirmed) return null;

      const res = await api.users[":id"]["reset-password"].$post({
        param: { id: props.userId },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error resetting password",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;

      const svg = toSvgDataURL(generate(data.reset_url), {
        on: "black",
        off: "white",
      });

      await copyToClipboard(data.reset_url);

      await prompts.dialog(
        (close) => {
          return (
            <div class="flex flex-col gap-4 no-scrollbar">
              <img
                class="aspect-square h-auto w-full overflow-hidden rounded ring-2 ring-blue-500 dark:ring-0"
                src={svg}
                alt="Reset QR Code"
              />

              <p class="text-dimmed text-xs md:text-sm">
                The{" "}
                <a
                  class="underline"
                  href={data.reset_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  reset URL
                </a>{" "}
                was copied to clipboard. This URL is valid until{" "}
                {new Date(data.expires_at).toLocaleString()}
              </p>
            </div>
          );
        },
        { title: "Password Reset" },
      );
    },
  });

  const logoutAllDevicesMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Logout ${props.username} from all devices?`,
        {
          title: "Logout All Devices",
          icon: "ti ti-logout",
          confirmText: "Logout",
        },
      );

      if (!confirmed) return null;

      const res = await api.users[":id"].sessions.$delete({
        param: { id: props.userId },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error logging out user",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;

      await prompts.alert(data.message, {
        title: "Success",
        icon: "ti ti-check",
        variant: "success",
      });
    },
  });

  const changeRoleMutation = createMutation({
    mutation: async (role: "user" | "admin") => {
      const isPromotion = role === "admin";
      const confirmed = await prompts.confirm(
        `${isPromotion ? "Promote" : "Demote"} ${props.username} to ${role === "admin" ? "admin" : "regular user"}?`,
        {
          title: isPromotion ? "Make Admin" : "Remove Admin",
          icon: isPromotion ? "ti ti-shield-check" : "ti ti-shield-off",
          confirmText: isPromotion ? "Make Admin" : "Remove Admin",
        },
      );

      if (!confirmed) return null;

      const res = await api.users[":id"].role.$patch({
        param: { id: props.userId },
        json: { role },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error changing role",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;
      window.location.reload();
    },
  });

  const deleteUserMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to delete '${props.username}'? This action cannot be undone.`,
        {
          title: "Delete User",
          icon: "ti ti-trash",
          variant: "danger",
          confirmText: "Delete",
          cancelText: "Cancel",
        },
      );

      if (!confirmed) return null;

      const res = await api.users[":id"].$delete({
        param: { id: props.userId },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error deleting user",
        );
      }

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;

      await prompts.alert("User deleted successfully.", {
        title: "Success",
        icon: "ti ti-check",
        variant: "success",
      });

      // Reload page to refresh user list
      window.location.reload();
    },
  });

  return (
    <Dropdown
      trigger={
        <button class="icon-btn">
          <i class="ti ti-dots-vertical" />
        </button>
      }
      elements={[
        {
          icon: "ti ti-key",
          label: "Reset Password",
          action: () => resetPasswordMutation.mutate({}),
        },
        {
          icon: "ti ti-logout",
          label: "Logout",
          action: () => logoutAllDevicesMutation.mutate({}),
        },
        {
          icon:
            props.role === "admin" ? "ti ti-shield-off" : "ti ti-shield-check",
          label: props.role === "admin" ? "Remove Admin" : "Make Admin",
          action: () =>
            changeRoleMutation.mutate(
              props.role === "admin" ? "user" : "admin",
            ),
        },
        {
          icon: "ti ti-trash",
          label: "Delete User",
          action: () => deleteUserMutation.mutate({}),
          variant: "danger" as const,
        },
      ]}
    />
  );
}
