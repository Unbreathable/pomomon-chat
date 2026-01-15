import type { JSX } from "solid-js";

// ==========================
// Types
// ==========================

type DropdownActionBase = {
  icon?: string;
  label: string;
  variant?: "danger";
};

type DropdownActionClick = DropdownActionBase & {
  action: () => void;
  href?: never;
};

type DropdownActionLink = DropdownActionBase & {
  href: string;
  external?: boolean;
  action?: never;
};

type DropdownAction = DropdownActionClick | DropdownActionLink;

type DropdownElement = {
  element: JSX.Element | ((close: () => void) => JSX.Element);
};

type DropdownSection = {
  sectionLabel?: string;
  items: Array<DropdownAction | DropdownElement>;
};

type DropdownItem = DropdownAction | DropdownElement | DropdownSection;

type DropdownProps = {
  trigger: JSX.Element;
  elements: DropdownItem[];
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | string;
  id?: string;
  width?: string;
  className?: string;
};

// ==========================
// Constants
// ==========================

const POSITION_STYLES: Record<string, string> = {
  "bottom-right": "top: anchor(bottom); right: anchor(right); margin-top: 4px;",
  "bottom-left": "top: anchor(bottom); left: anchor(left); margin-top: 4px;",
  "top-right": "bottom: anchor(top); right: anchor(right); margin-bottom: 4px;",
  "top-left": "bottom: anchor(top); left: anchor(left); margin-bottom: 4px;",
};

const ITEM_BASE_CLASSES =
  "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-white/30 dark:hover:bg-white/10";

// ==========================
// Component
// ==========================

/** Accessible dropdown menu with popover positioning. Supports both click actions and links. */
export default function Dropdown(props: DropdownProps) {
  const id = props.id ?? crypto.randomUUID();
  const anchor = `--dropdown-${id}`;
  const positionStyle =
    POSITION_STYLES[props.position ?? "bottom-right"] ??
    props.position ??
    POSITION_STYLES["bottom-right"];
  const width = props.width ?? "w-48";

  const close = (): void => {
    (document.getElementById(id) as HTMLElement | null)?.hidePopover();
  };

  const getVariantClasses = (variant?: "danger"): string =>
    variant === "danger"
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-700 dark:text-zinc-300";

  const renderItem = (item: DropdownAction | DropdownElement): JSX.Element => {
    if ("element" in item) {
      return typeof item.element === "function"
        ? item.element(close)
        : item.element;
    }

    const classes = `${ITEM_BASE_CLASSES} ${getVariantClasses(item.variant)}`;
    const content = (
      <>
        {item.icon && <i class={item.icon} />}
        <span>{item.label}</span>
      </>
    );

    // Link variant
    if ("href" in item && item.href) {
      return (
        <a
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          class={classes}
          onClick={close}
        >
          {content}
        </a>
      );
    }

    // Button variant
    return (
      <button
        type="button"
        class={classes}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          (item as DropdownActionClick).action();
          close();
        }}
      >
        {content}
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        class="inline-flex"
        style={`anchor-name: ${anchor}`}
        popoverTarget={id}
        onClick={(e) => e.stopPropagation()}
      >
        {props.trigger}
      </button>

      <div
        id={id}
        popover="auto"
        role="menu"
        aria-label="Dropdown menu"
        class={`${width} overflow-hidden paper p-0 border! border-zinc-300/60! dark:border-zinc-600/50! ${props.className ?? ""}`}
        style={
          props.className
            ? `position-anchor: ${anchor};`
            : `position-anchor: ${anchor}; ${positionStyle}`
        }
      >
        {props.elements.map((item, i) =>
          "items" in item ? (
            <>
              {i > 0 && <hr class="border-white/20 dark:border-zinc-700/25" />}
              {item.sectionLabel && (
                <div class="px-4 pt-3 pb-1 text-xs uppercase tracking-wider font-medium text-zinc-500">
                  {item.sectionLabel}
                </div>
              )}
              {item.items.map(renderItem)}
            </>
          ) : (
            renderItem(item)
          ),
        )}
      </div>
    </>
  );
}
