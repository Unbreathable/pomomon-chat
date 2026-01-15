import { createSignal, onMount } from "solid-js";
import Dropdown from "@/frontend/components/ui/Dropdown";

/** Admin filter dropdown for unlisted/deleted chatrooms. */
export default function AdminFilter() {
  const [showUnlisted, setShowUnlisted] = createSignal(false);
  const [showDeleted, setShowDeleted] = createSignal(false);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    setShowUnlisted(params.get("unlisted") === "true");
    setShowDeleted(params.get("deleted") === "true");
  });

  const toggleFilter = (filter: "unlisted" | "deleted"): void => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get(filter) === "true";

    if (current) {
      url.searchParams.delete(filter);
    } else {
      url.searchParams.set(filter, "true");
    }
    url.searchParams.delete("page");
    window.location.href = url.toString();
  };

  const filterActive = () => showUnlisted() || showDeleted();

  return (
    <Dropdown
      trigger={
        <div class="px-1 text-dimmed">
          <i
            class={`ti ti-adjustments text-xl ${filterActive() ? "text-blue-500" : ""}`}
          />
        </div>
      }
      elements={[
        {
          sectionLabel: "Admin Filter",
          items: [
            {
              icon: showUnlisted() ? "ti ti-eye-off" : "ti ti-eye",
              label: showUnlisted() ? "Hide Unlisted" : "Show Unlisted",
              action: () => toggleFilter("unlisted"),
            },
            {
              icon: showDeleted() ? "ti ti-trash-off" : "ti ti-trash",
              label: showDeleted() ? "Hide Deleted" : "Show Deleted",
              action: () => toggleFilter("deleted"),
            },
          ],
        },
      ]}
      position="bottom-right"
    />
  );
}
