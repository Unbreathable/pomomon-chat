import { api } from "@/frontend/lib/client-utils";
import { copyToClipboard } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { createDebounce } from "@/frontend/lib/timed";
import { prompts } from "@/frontend/components/ui/prompts";
import { generate } from "lean-qr/nano";
import { toSvgDataURL } from "lean-qr/extras/svg";
import { createSignal, For, Show } from "solid-js";
import type { User } from "@/backend/services/users";

type MemberActionsProps = {
  chatroomId: string;
  chatroomName: string;
  joinToken: string;
  existingMemberIds: string[];
};

/** Action bar for member management: share token, reset token, add user. */
export default function MemberActions(props: MemberActionsProps) {
  const getJoinUrl = (token: string) =>
    `${window.location.origin}/room/${props.chatroomId}/join?token=${token}`;

  const shareTokenMutation = createMutation({
    mutation: async () => {
      const joinUrl = getJoinUrl(props.joinToken);
      await copyToClipboard(joinUrl);

      const svg = toSvgDataURL(generate(joinUrl), {
        on: "black",
        off: "white",
      });

      await prompts.dialog(
        () => (
          <div class="flex flex-col gap-4 no-scrollbar">
            <img
              class="aspect-square h-auto w-full overflow-hidden rounded ring-2 ring-green-500 dark:ring-0"
              src={svg}
              alt="Join URL"
            />

            <p class="text-dimmed text-xs md:text-sm">
              The{" "}
              <a
                class="underline"
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                join URL
              </a>{" "}
              was copied to clipboard.
            </p>
          </div>
        ),
        { title: `Join "${props.chatroomName}"`, icon: "ti ti-share" },
      );

      return true;
    },
    onError: (error) => prompts.error(error.message),
  });

  const resetTokenMutation = createMutation({
    mutation: async () => {
      const confirmed = await prompts.confirm(
        "This will invalidate the current join link. Are you sure?",
        {
          title: "Reset Join Token",
          icon: "ti ti-refresh",
          variant: "danger",
          confirmText: "Reset",
        },
      );
      if (!confirmed) return null;

      const res = await api.chatrooms[":id"]["reset-join-token"].$post({
        param: { id: props.chatroomId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Failed to reset");
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: (data) => {
      if (data) window.location.reload();
    },
  });

  const addUserMutation = createMutation({
    mutation: async () => {
      const memberIds = new Set(props.existingMemberIds);
      const result = await prompts.dialog<{ userId: string } | null>(
        (close) => (
          <AddUserSearch
            chatroomId={props.chatroomId}
            existingMemberIds={memberIds}
            onAdd={close}
          />
        ),
        { title: "Add User", icon: "ti ti-user-plus" },
      );

      if (!result) return null;

      const res = await api.chatrooms[":id"].members.$post({
        param: { id: props.chatroomId },
        json: { user_id: result.userId },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Failed to add user",
        );
      }
      return res.json();
    },
    onError: (error) => prompts.error(error.message),
    onSuccess: (data) => {
      if (data) window.location.reload();
    },
  });

  const btnClass =
    "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50";

  return (
    <div class="paper p-0 flex flex-row overflow-hidden mb-2 divide-x divide-white/20 dark:divide-zinc-700/25">
      <button
        type="button"
        onClick={() => shareTokenMutation.mutate({})}
        disabled={shareTokenMutation.loading()}
        class={`${btnClass} flex-1`}
      >
        <i
          class={
            shareTokenMutation.loading()
              ? "ti ti-loader-2 animate-spin"
              : "ti ti-share"
          }
        />
        <span class="hidden sm:inline">Share via Link</span>
      </button>

      <button
        type="button"
        onClick={() => resetTokenMutation.mutate({})}
        disabled={resetTokenMutation.loading()}
        class={`${btnClass} flex-1`}
      >
        <i
          class={
            resetTokenMutation.loading()
              ? "ti ti-loader-2 animate-spin"
              : "ti ti-refresh"
          }
        />
        <span class="hidden sm:inline">Reset Share Token</span>
      </button>

      <button
        type="button"
        onClick={() => addUserMutation.mutate({})}
        disabled={addUserMutation.loading()}
        class={btnClass}
      >
        <i
          class={
            addUserMutation.loading()
              ? "ti ti-loader-2 animate-spin"
              : "ti ti-user-plus"
          }
        />
        <span class="hidden sm:inline">Add User</span>
      </button>
    </div>
  );
}

/** User search component for add user dialog. */
function AddUserSearch(props: {
  chatroomId: string;
  existingMemberIds: Set<string>;
  onAdd: (result: { userId: string } | undefined) => void;
}) {
  const [search, setSearch] = createSignal("");
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [addingUserId, setAddingUserId] = createSignal<string | null>(null);

  const searchUsers = async (q: string) => {
    if (q.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.users.search.$get({ query: { search: search() } });
      if (res.ok) {
        const data = await res.json();
        // Filter out users who are already members
        setUsers(data.filter((u: User) => !props.existingMemberIds.has(u.id)));
      }
    } finally {
      setLoading(false);
    }
  };

  const { debouncedFn: debouncedSearch } = createDebounce(searchUsers, 300);

  const handleInput = (value: string) => {
    setSearch(value);
    debouncedSearch(value);
  };

  const handleAdd = (userId: string) => {
    setAddingUserId(userId);
    props.onAdd({ userId });
  };

  return (
    <div class="flex flex-col gap-3">
      <div class="relative">
        <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          class="input-subtle w-full pl-9 pr-3 py-2"
          placeholder="Search by username..."
          value={search()}
          onInput={(e) => handleInput(e.currentTarget.value)}
          autofocus
        />
      </div>

      <div class="h-40 overflow-y-auto scrollbar">
        <Show when={loading()}>
          <div class="flex items-center justify-center py-8 text-dimmed">
            <i class="ti ti-loader-2 animate-spin text-xl" />
          </div>
        </Show>

        <Show when={!loading() && search().length >= 2 && users().length === 0}>
          <div class="flex flex-col items-center justify-center py-8 text-dimmed text-xs">
            <i class="ti ti-user-off text-xl mb-2" />
            <span>No users found</span>
          </div>
        </Show>

        <Show when={!loading() && search().length < 2}>
          <div class="flex flex-col items-center justify-center py-8 text-dimmed text-xs">
            <i class="ti ti-search text-xl mb-2" />
            <span>Type at least 2 characters</span>
          </div>
        </Show>

        <Show when={!loading() && users().length > 0}>
          <div class="flex flex-col gap-1">
            <For each={users()}>
              {(user) => (
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    class="w-8 h-8 rounded-full object-cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">
                      {user.username}
                    </div>
                    <Show when={user.real_name}>
                      <div class="text-xs text-dimmed truncate">
                        {user.real_name}
                      </div>
                    </Show>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(user.id)}
                    disabled={addingUserId() !== null}
                    class="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                    aria-label={`Add ${user.username}`}
                  >
                    <i
                      class={
                        addingUserId() === user.id
                          ? "ti ti-loader-2 animate-spin"
                          : "ti ti-user-plus"
                      }
                    />
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
