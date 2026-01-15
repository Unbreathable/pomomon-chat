import type { JSX } from "solid-js";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
};

/**
 * Renders pagination controls with ellipsis for large page counts.
 * Shows first, last, and pages adjacent to current page.
 */
export const Pagination = (props: PaginationProps): null | JSX.Element => {
  if (props.totalPages <= 1) return null;

  const visiblePages = Array.from(
    { length: props.totalPages },
    (_, i) => i + 1,
  ).filter(
    (p) =>
      p === 1 || p === props.totalPages || Math.abs(p - props.currentPage) <= 1,
  );

  return (
    <nav
      class="mt-8 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {visiblePages.map((page, idx) => {
        const prevPage = visiblePages[idx - 1];
        const showEllipsis = prevPage && page - prevPage > 1;

        return (
          <>
            {showEllipsis && (
              <span
                class="flex h-8 w-8 items-center justify-center text-dimmed text-sm"
                aria-hidden="true"
              >
                ···
              </span>
            )}
            <a
              href={`${props.baseUrl}${page}`}
              class={
                page === props.currentPage
                  ? "btn-primary flex h-8 w-8 items-center justify-center text-sm"
                  : "btn-simple flex h-8 w-8 items-center justify-center text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }
              aria-current={page === props.currentPage ? "page" : undefined}
              aria-label={`Page ${page}`}
            >
              {page}
            </a>
          </>
        );
      })}
    </nav>
  );
};
