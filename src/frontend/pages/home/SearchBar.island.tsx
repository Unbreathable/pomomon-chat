import { createSignal, onMount } from "solid-js";

/** Search bar that filters content via URL query parameter. */
export default function SearchBar() {
  const [query, setQuery] = createSignal("");

  onMount(() => {
    setQuery(new URLSearchParams(window.location.search).get("search") ?? "");
  });

  const handleSubmit = (e: Event): void => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("search", query());
    url.searchParams.delete("page");
    window.location.href = url.toString();
  };

  const handleClear = (): void => {
    const url = new URL(window.location.href);
    url.searchParams.set("search", "");
    window.location.href = url.toString();
  };

  return (
    <form
      onSubmit={handleSubmit}
      class="flex gap-2 input-subtle p-0 items-center pr-2"
      role="search"
    >
      <input
        type="search"
        placeholder="Search..."
        aria-label="Search"
        class="pr-10 flex-1 p-2 focus-visible:outline-0"
        value={query()}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <div class="text-gray-400">
        {query() ? (
          <button
            type="button"
            onClick={handleClear}
            class="hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <i class="ti ti-x" />
          </button>
        ) : (
          <span class="text-xs hidden sm:inline">Enter</span>
        )}
      </div>
      <button type="submit" class="hidden">
        Search
      </button>
    </form>
  );
}
