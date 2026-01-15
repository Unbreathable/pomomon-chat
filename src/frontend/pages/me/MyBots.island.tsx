import { createSignal, For, Show, onMount } from "solid-js";
import { api, isImageUrl, copyToClipboard } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import Dropdown from "@/frontend/components/ui/Dropdown";
import Avatar from "@/frontend/components/ui/Avatar";
import { showBotsHelp } from "./HelpDialog";
import type { Bot } from "@/shared/schemas";

/** Token display with copy button */
function TokenDisplay(props: { token: string }) {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    await copyToClipboard(props.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="flex items-center gap-2">
      <code class="flex-1 block p-3 bg-zinc-100 dark:bg-zinc-800 rounded text-sm break-all select-all">
        {props.token}
      </code>
      <button
        type="button"
        class="shrink-0 p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        <i class={copied() ? "ti ti-check text-green-500" : "ti ti-copy"} />
      </button>
    </div>
  );
}

type MyBotsProps = {
  maxBotsPerUser: number;
  isAdmin: boolean;
};

/** Bot list with create, edit, regenerate token, and delete actions. */
export default function MyBots(props: MyBotsProps) {
  const [bots, setBots] = createSignal<Bot[]>([]);
  const [total, setTotal] = createSignal(0);
  const [loading, setLoading] = createSignal(true);

  const loadBots = async () => {
    setLoading(true);
    try {
      const res = await api.bots.$get({ query: { per_page: "100" } });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots);
        setTotal(data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  };

  onMount(loadBots);

  const createBotMutation = createMutation({
    mutation: async () => {
      const values = await prompts.form({
        title: "Create Bot",
        icon: "ti ti-robot",
        confirmText: "Create",
        fields: {
          username: {
            type: "text",
            label: "Username",
            placeholder: "my-bot",
            description:
              "3-20 characters, letters, numbers and underscores only",
            required: true,
            minLength: 3,
            maxLength: 20,
            icon: "ti ti-at",
          },
          bio: {
            type: "text",
            label: "Bio",
            placeholder: "What does this bot do?",
            description: "Max 500 characters",
            multiline: true,
            maxLength: 500,
          },
        },
      });

      if (!values) return null;

      const res = await api.bots.$post({
        json: { username: values.username, bio: values.bio || undefined },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error creating bot",
        );
      }

      return await res.json();
    },
    onSuccess: async (data) => {
      if (!data) return;
      // Show token to user (only shown once)
      await prompts.alert(
        <div class="flex flex-col gap-3">
          <p>
            Your bot has been created. Save this token securely - it will only
            be shown once!
          </p>
          <TokenDisplay token={data.token} />
        </div>,
        {
          title: "Bot Created",
          icon: "ti ti-check",
          variant: "success",
        },
      );
      await loadBots();
    },
    onError: (error) => prompts.error(error.message),
  });

  const editBotMutation = createMutation({
    mutation: async (bot: Bot) => {
      const values = await prompts.form({
        title: "Edit Bot",
        icon: "ti ti-robot",
        confirmText: "Save",
        fields: {
          avatar: {
            type: "image",
            round: true,
            default: bot.avatar,
          },
          username: {
            type: "text",
            label: "Username",
            placeholder: "my-bot",
            description:
              "3-20 characters, letters, numbers and underscores only",
            required: true,
            minLength: 3,
            maxLength: 20,
            default: bot.username,
            icon: "ti ti-at",
          },
          bio: {
            type: "text",
            label: "Bio",
            placeholder: "What does this bot do?",
            description: "Max 500 characters",
            multiline: true,
            maxLength: 500,
            default: bot.bio || undefined,
          },
        },
      });

      if (!values) return null;

      const res = await api.bots[":id"].$patch({
        param: { id: bot.id },
        json: {
          username:
            values.username !== bot.username ? values.username : undefined,
          bio: values.bio,
          avatar: isImageUrl(values.avatar) ? undefined : values.avatar,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error updating bot",
        );
      }

      return await res.json();
    },
    onSuccess: async (data) => {
      if (!data) return;
      await loadBots();
    },
    onError: (error) => prompts.error(error.message),
  });

  const regenerateTokenMutation = createMutation({
    mutation: async (bot: Bot) => {
      const confirmed = await prompts.confirm(
        "Are you sure you want to regenerate the token? The old token will stop working immediately.",
        {
          title: "Regenerate Token",
          icon: "ti ti-refresh",
          confirmText: "Regenerate",
        },
      );

      if (!confirmed) return null;

      const res = await api.bots[":id"]["regenerate-token"].$post({
        param: { id: bot.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error regenerating token",
        );
      }

      return await res.json();
    },
    onSuccess: async (data) => {
      if (!data) return;
      await prompts.alert(
        <div class="flex flex-col gap-3">
          <p>
            Token regenerated. Save this new token securely - it will only be
            shown once!
          </p>
          <TokenDisplay token={data.token} />
        </div>,
        {
          title: "Token Regenerated",
          icon: "ti ti-check",
          variant: "success",
        },
      );
      await loadBots();
    },
    onError: (error) => prompts.error(error.message),
  });

  const deleteBotMutation = createMutation({
    mutation: async (bot: Bot) => {
      const confirmed = await prompts.confirm(
        `Are you sure you want to delete the bot "${bot.username}"? This action cannot be undone.`,
        {
          title: "Delete Bot",
          icon: "ti ti-trash",
          variant: "danger",
          confirmText: "Delete",
        },
      );

      if (!confirmed) return null;

      const res = await api.bots[":id"].$delete({
        param: { id: bot.id },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error deleting bot",
        );
      }

      return true;
    },
    onSuccess: async (data) => {
      if (!data) return;
      await loadBots();
    },
    onError: (error) => prompts.error(error.message),
  });

  const getBotDropdownElements = (bot: Bot) => [
    {
      icon: "ti ti-pencil",
      label: "Edit Info",
      action: () => editBotMutation.mutate(bot),
    },
    {
      icon: "ti ti-refresh",
      label: "Reset Token",
      action: () => regenerateTokenMutation.mutate(bot),
    },
    {
      icon: "ti ti-trash",
      label: "Delete",
      action: () => deleteBotMutation.mutate(bot),
      variant: "danger" as const,
    },
  ];

  const canCreateMore = () => props.isAdmin || total() < props.maxBotsPerUser;

  return (
    <div class="flex flex-col gap-2">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-lg font-semibold">Bots</span>
          <Show when={total() > 0}>
            <span class="text-sm text-dimmed">
              ({total()}
              {props.isAdmin ? "" : ` / ${props.maxBotsPerUser}`})
            </span>
          </Show>
        </div>
        <div class="flex items-center gap-2">
          <Show when={canCreateMore()}>
            <button
              class="btn-primary text-sm px-3 py-1"
              onClick={() => createBotMutation.mutate({})}
              disabled={createBotMutation.loading()}
            >
              <i class="ti ti-plus mr-1" />
              Create Bot
            </button>
          </Show>
          <button
            type="button"
            class="btn-primary px-2 py-1"
            onClick={showBotsHelp}
            title="About Bots"
            aria-label="About Bots"
          >
            <i class="ti ti-info-circle text-lg" />
          </button>
        </div>
      </div>

      {/* Bot List */}
      <Show
        when={!loading()}
        fallback={
          <div class="paper p-8 text-center">
            <i class="ti ti-loader-2 animate-spin text-2xl text-dimmed" />
          </div>
        }
      >
        <Show
          when={bots().length > 0}
          fallback={
            <div class="paper p-8 text-center">
              <i class="ti ti-robot-off mb-2 text-4xl text-dimmed" />
              <p class="text-dimmed">No bots yet</p>
            </div>
          }
        >
          <div class="flex flex-col gap-2">
            <For each={bots()}>
              {(bot) => (
                <div class="paper p-3">
                  <div class="flex items-center gap-3">
                    <Avatar userId={bot.id} username={bot.username} size="md" />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">{bot.username}</span>
                        <Show when={bot.token_prefix}>
                          <code class="text-xs text-dimmed bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            bt_{bot.token_prefix}...
                          </code>
                        </Show>
                      </div>
                      <Show when={bot.bio}>
                        <p class="mt-0.5 text-sm text-dimmed truncate">
                          {bot.bio}
                        </p>
                      </Show>
                    </div>
                    <Dropdown
                      trigger={
                        <button
                          class="icon-btn"
                          title="Bot Actions"
                          aria-label="Bot Actions"
                        >
                          <i class="ti ti-dots-vertical" />
                        </button>
                      }
                      position="bottom-right"
                      width="w-48"
                      elements={getBotDropdownElements(bot)}
                    />
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
