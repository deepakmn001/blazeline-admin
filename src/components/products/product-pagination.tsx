// src/components/products/product-pagination.tsx
"use client";

import { useCallback, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZE = 10;
const SIBLING_COUNT = 1;
const ELLIPSIS = "ellipsis" as const;

type PageToken = number | typeof ELLIPSIS;

type ProductPaginationProps = {
  count: number;
  page: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  /**
   * Optional — defaults to DEFAULT_PAGE_SIZE. Backend page size isn't
   * part of this component's current public contract, so this stays
   * optional rather than required: existing callers keep compiling
   * unchanged, and any caller that does start passing ?page_size=N
   * through can wire it here without another refactor.
   */
  pageSize?: number;
};

/* ------------------------------------------------------------------ */
/* Shared class constants — avoids repeating the same Tailwind string   */
/* on every arrow/number button, keeps the render below scannable.      */
/* ------------------------------------------------------------------ */

const FOCUS_RING_CLASSES =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1";

const ARROW_BUTTON_CLASSES =
  `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASSES}`;

const PAGE_BUTTON_BASE_CLASSES =
  `flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-colors ${FOCUS_RING_CLASSES}`;

const PAGE_BUTTON_ACTIVE_CLASSES = "bg-brand-500 text-white";
const PAGE_BUTTON_INACTIVE_CLASSES = "border border-line text-ink hover:bg-neutral-50";

const MOBILE_NAV_BUTTON_CLASSES =
  `flex-1 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING_CLASSES}`;

/* ------------------------------------------------------------------ */
/* Page window calculation                                              */
/*                                                                       */
/* Classic "1 2 3 ... 18 19 20" model: always show the first and last   */
/* page, a window of SIBLING_COUNT pages either side of the current     */
/* page, and collapse everything else into a single ellipsis token per  */
/* side. Falls back to every page once total pages is small enough      */
/* that an ellipsis wouldn't save any space.                            */
/* ------------------------------------------------------------------ */

function range(start: number, end: number): number[] {
  const length = end - start + 1;
  return Array.from({ length }, (_, i) => start + i);
}

function getPageTokens(current: number, totalPages: number): PageToken[] {
  const totalVisible = SIBLING_COUNT * 2 + 5; // first + last + current + 2 siblings + 2 ellipses

  if (totalPages <= totalVisible) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(current - SIBLING_COUNT, 1);
  const rightSibling = Math.min(current + SIBLING_COUNT, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = range(1, 3 + SIBLING_COUNT * 2);
    return [...leftRange, ELLIPSIS, totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = range(totalPages - (3 + SIBLING_COUNT * 2) + 1, totalPages);
    return [1, ELLIPSIS, ...rightRange];
  }

  return [1, ELLIPSIS, ...range(leftSibling, rightSibling), ELLIPSIS, totalPages];
}

export function ProductPagination({
  count,
  page,
  // hasNext / hasPrevious are kept in the public API for backward
  // compatibility, but arrow enable/disable below is derived from
  // page/totalPages instead — a backend flag bug can no longer break
  // this control.
  hasNext: _hasNext,
  hasPrevious: _hasPrevious,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
}: ProductPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  const pageTokens = useMemo(
    () => getPageTokens(page, totalPages),
    [page, totalPages]
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
      onPageChange(nextPage);
    },
    [page, totalPages, onPageChange]
  );

  const goToPrevious = useCallback(() => {
    if (isFirstPage) return;
    goToPage(page - 1);
  }, [isFirstPage, goToPage, page]);

  const goToNext = useCallback(() => {
    if (isLastPage) return;
    goToPage(page + 1);
  }, [isLastPage, goToPage, page]);

  /* Left/Right/Home/End keyboard navigation. Attached to the <nav> so it
     only fires while focus is inside the pagination control, never
     globally. */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          goToPrevious();
          break;
        case "ArrowRight":
          event.preventDefault();
          goToNext();
          break;
        case "Home":
          event.preventDefault();
          goToPage(1);
          break;
        case "End":
          event.preventDefault();
          goToPage(totalPages);
          break;
        default:
          break;
      }
    },
    [goToPrevious, goToNext, goToPage, totalPages]
  );

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white px-6 py-4">
      {/* Desktop: full range summary + numbered pagination */}
      <p className="hidden text-sm text-ink-faint sm:block">
        Showing <span className="font-semibold">{rangeStart}–{rangeEnd}</span> of{" "}
        <span className="font-semibold">{count}</span> products
      </p>

      {/* Mobile: compact page indicator */}
      <p className="text-sm text-ink-faint sm:hidden">
        Page <span className="font-semibold">{page}</span> of{" "}
        <span className="font-semibold">{totalPages}</span>
      </p>

      <nav
        aria-label="Product pagination"
        onKeyDown={handleKeyDown}
        className="flex min-w-0 items-center gap-2 sm:gap-1"
      >
        {/* Desktop: prev arrow + numbers + next arrow */}
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            disabled={isFirstPage}
            onClick={goToPrevious}
            aria-label="Previous page"
            className={ARROW_BUTTON_CLASSES}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          {pageTokens.map((token, index) =>
            token === ELLIPSIS ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center text-sm text-ink-faint"
              >
                …
              </span>
            ) : (
              <button
                key={token}
                type="button"
                onClick={() => goToPage(token)}
                aria-label={`Page ${token}`}
                aria-current={token === page ? "page" : undefined}
                className={`${PAGE_BUTTON_BASE_CLASSES} ${
                  token === page ? PAGE_BUTTON_ACTIVE_CLASSES : PAGE_BUTTON_INACTIVE_CLASSES
                }`}
              >
                {token}
              </button>
            )
          )}

          <button
            type="button"
            disabled={isLastPage}
            onClick={goToNext}
            aria-label="Next page"
            className={ARROW_BUTTON_CLASSES}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile: full-width Previous / Next only, never overflows */}
        <div className="flex w-full items-center gap-2 sm:hidden">
          <button
            type="button"
            disabled={isFirstPage}
            onClick={goToPrevious}
            aria-label="Previous page"
            className={MOBILE_NAV_BUTTON_CLASSES}
          >
            Previous
          </button>

          <button
            type="button"
            disabled={isLastPage}
            onClick={goToNext}
            aria-label="Next page"
            className={MOBILE_NAV_BUTTON_CLASSES}
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}