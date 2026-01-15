import { For, Show } from "solid-js";

// ==========================
// Types
// ==========================

/** GIF data structure from the Klipy API. */
export type Gif = {
  id: string;
  title: string;
  preview_url: string;
  url: string;
  blur_preview: string;
  width: number;
  height: number;
};

type GifGridProps = {
  gifs: Gif[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (gif: Gif) => void;
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
};

// ==========================
// Component
// ==========================

/** GIF picker grid with search functionality and infinite scroll. */
export function GifGrid(props: GifGridProps) {
  /** Triggers load more when scrolled near bottom. */
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLDivElement;
    const nearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (nearBottom && props.hasMore && !props.loading) {
      props.onLoadMore();
    }
  };

  return (
    <div class="p-2">
      {/* Search Header with KLIPY Attribution */}
      <div class="flex items-center gap-2 mb-3">
        <i class="ti ti-search text-zinc-400 text-md" />
        <input
          type="text"
          value={props.query}
          onInput={(e) => props.onQueryChange(e.currentTarget.value)}
          placeholder="Search KLIPY for GIFs"
          class="flex-1 bg-transparent outline-none text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        />
        {/* Powered by KLIPY */}
        <img
          src="/public/klipy-1.svg"
          alt="Powered by KLIPY"
          class="h-3 opacity-60"
        />
      </div>

      {/* GIF Grid */}
      <div
        class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 auto-rows-min gap-1.5 h-40 sm:h-50 md:h-60 overflow-y-auto p-0.5 -m-0.5"
        onScroll={handleScroll}
      >
        <Show
          when={!props.loading || props.gifs.length > 0}
          fallback={
            <div class="col-span-full flex items-center justify-center">
              <i class="ti ti-loader-2 animate-spin text-2xl text-zinc-400" />
            </div>
          }
        >
          <Show
            when={props.gifs.length > 0}
            fallback={
              <div class="col-span-full text-center py-8 text-sm text-zinc-500 dark:text-zinc-400">
                {props.query ? "No GIFs found" : "Loading..."}
              </div>
            }
          >
            <For each={props.gifs}>
              {(gif) => (
                <button
                  type="button"
                  onClick={() => props.onSelect(gif)}
                  class="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-zinc-100 dark:bg-zinc-800 group"
                  title={gif.title}
                >
                  <img
                    src={gif.preview_url}
                    alt={gif.title}
                    class="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    style={{
                      "background-image": `url(${gif.blur_preview})`,
                      "background-size": "cover",
                    }}
                  />
                </button>
              )}
            </For>
            {/* Loading indicator for more */}
            <Show when={props.loading && props.gifs.length > 0}>
              <div class="col-span-full flex items-center justify-center py-2">
                <i class="ti ti-loader-2 animate-spin text-xl text-zinc-400" />
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
