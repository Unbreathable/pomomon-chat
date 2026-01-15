import { createSignal, onMount } from "solid-js";

/** Toggle button for showing/hiding the search bar. */
export default function SearchButton() {
  const [isActive, setIsActive] = createSignal(false);

  onMount(() => {
    const url = new URL(window.location.href);
    setIsActive(url.searchParams.has("search"));
  });

  const toggle = (): void => {
    const url = new URL(window.location.href);
    if (isActive()) {
      url.searchParams.delete("search");
    } else {
      url.searchParams.set("search", "");
    }
    url.searchParams.delete("page");
    window.location.href = url.toString();
  };

  return (
    <button
      type="button"
      class={`text-md sm:text-lg transition-colors text-cyan-500 hover:text-cyan-700`}
      title="Search"
      aria-label="Toggle search"
      aria-pressed={isActive()}
      onClick={toggle}
    >
      <i class={isActive() ? "ti ti-search-off" : "ti ti-search"} />
    </button>
  );
}
