import { createSignal, For, Show, onMount, onCleanup } from "solid-js";
import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import Lightbox from "../Lightbox";

// ==========================
// Types
// ==========================

type ImageGalleryProps = {
  chatroomId: string;
  initialImages: string[];
  hasMore: boolean;
  totalCount: number;
};

// ==========================
// Component
// ==========================

/** Scrollable image gallery with infinite scroll and lightbox support. */
export default function ImageGallery(props: ImageGalleryProps) {
  const [images, setImages] = createSignal<string[]>(props.initialImages);
  const [hasMore, setHasMore] = createSignal(props.hasMore);
  const [page, setPage] = createSignal(1);
  const [lightboxIndex, setLightboxIndex] = createSignal<number | null>(null);

  const loadMoreMutation = createMutation({
    mutation: async () => {
      const nextPage = page() + 1;
      const res = await api.chatrooms[":id"].messages.$get({
        param: { id: props.chatroomId },
        query: {
          page: String(nextPage),
          per_page: "100",
          content_type: "image",
        },
      });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    onSuccess: (data) => {
      if (!data) return;
      const newImages = data.messages.map(
        (m: { content: string }) => m.content,
      );
      setImages((prev) => [...prev, ...newImages]);
      setPage((p) => p + 1);
      setHasMore(data.pagination.has_next);
    },
  });

  /** Handles window scroll to trigger infinite loading. */
  const handleScroll = () => {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
    if (nearBottom && hasMore() && !loadMoreMutation.loading()) {
      loadMoreMutation.mutate({});
    }
  };

  onMount(() => {
    window.addEventListener("scroll", handleScroll);
  });

  onCleanup(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  return (
    <>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        <For each={images()}>
          {(imageUrl, idx) => (
            <button
              type="button"
              onClick={() => setLightboxIndex(idx())}
              class="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-zinc-100 dark:bg-zinc-800 group"
            >
              <img
                src={imageUrl}
                alt={`Image ${idx() + 1}`}
                class="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>
          )}
        </For>

        <Show when={hasMore()}>
          <div class="col-span-full flex justify-center py-4">
            <button
              type="button"
              onClick={() => loadMoreMutation.mutate({})}
              disabled={loadMoreMutation.loading()}
              class="paper px-3 py-2 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
            >
              <Show
                when={loadMoreMutation.loading()}
                fallback={<i class="ti ti-arrow-down" />}
              >
                <i class="ti ti-loader-2 animate-spin" />
              </Show>
              <span>Load more</span>
            </button>
          </div>
        </Show>
      </div>

      <Show when={lightboxIndex() !== null}>
        <Lightbox
          images={images()}
          initialIndex={lightboxIndex()!}
          onClose={() => setLightboxIndex(null)}
          totalCount={props.totalCount}
          onLoadMore={() => {
            if (hasMore() && !loadMoreMutation.loading()) {
              loadMoreMutation.mutate({});
            }
          }}
        />
      </Show>
    </>
  );
}
