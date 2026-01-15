import { createSignal, onMount } from "solid-js";

/** Toggle button for filtering by favorites. */
export default function FavoritesButton() {
  const [isActive, setIsActive] = createSignal(false);

  onMount(() => {
    const url = new URL(window.location.href);
    setIsActive(url.searchParams.get("favourites") === "true");
  });

  const toggle = (): void => {
    const url = new URL(window.location.href);
    if (isActive()) {
      url.searchParams.delete("favourites");
    } else {
      url.searchParams.set("favourites", "true");
    }
    url.searchParams.delete("page");
    window.location.href = url.toString();
  };

  return (
    <button
      type="button"
      class={`text-md sm:text-lg transition-colors ${isActive() ? "text-red-500 hover:text-red-700" : "text-pink-500 hover:text-pink-700"}`}
      title="Favorites"
      aria-label="Toggle favorites filter"
      aria-pressed={isActive()}
      onClick={toggle}
    >
      <i class={isActive() ? "ti ti-heart-off" : "ti ti-heart"} />
    </button>
  );
}
