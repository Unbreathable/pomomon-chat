import { requestNotificationPermission } from "@/frontend/lib/client-utils";
import { createSignal, onMount, Show } from "solid-js";

const PROMPT_SHOWN_KEY = "chat_notification_prompt_shown";

/** Floating prompt to request notification permissions (shown once). */
export default function NotificationPrompt() {
  const [show, setShow] = createSignal(false);

  onMount(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(PROMPT_SHOWN_KEY) === "true") return;

    setTimeout(() => setShow(true), 2000);
  });

  const dismiss = (): void => {
    localStorage.setItem(PROMPT_SHOWN_KEY, "true");
    setShow(false);
  };

  const handleAllow = async (): Promise<void> => {
    await requestNotificationPermission();
    dismiss();
  };

  return (
    <Show when={show()}>
      <div
        class="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        role="dialog"
        aria-labelledby="notification-prompt-title"
      >
        <div class="flex items-start gap-3">
          <i
            class="ti ti-bell text-2xl text-blue-500 shrink-0"
            aria-hidden="true"
          />
          <div class="flex-1">
            <h3
              id="notification-prompt-title"
              class="font-semibold text-gray-900 dark:text-gray-100"
            >
              Enable Notifications
            </h3>
            <p class="mt-1 text-sm text-dimmed">
              Get notified when you receive messages in unmuted chatrooms
            </p>
            <div class="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAllow}
                class="btn-primary text-sm"
              >
                Allow
              </button>
              <button
                type="button"
                onClick={dismiss}
                class="btn-secondary text-sm"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            class="shrink-0 text-dimmed hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Close"
          >
            <i class="ti ti-x" />
          </button>
        </div>
      </div>
    </Show>
  );
}
