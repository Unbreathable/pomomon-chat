import Layout from "@/frontend/components/layout/Layout";
import { html } from "@config";
import type { Context } from "hono";

export const demoPage = async (c: Context) => {
  return html(
    <Layout c={c}>
      <div class="container">
        <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
          Custom CSS Demo
        </h1>

        {/* Buttons */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Buttons
          </h2>
          <div class="flex flex-wrap gap-2">
            <button class="btn-simple">
              <i class="ti ti-circle" />
              <span>Simple</span>
            </button>
            <button class="btn-primary">
              <i class="ti ti-check" />
              <span>Primary</span>
            </button>
            <button class="btn-secondary">
              <i class="ti ti-settings" />
              <span>Secondary</span>
            </button>
            <button class="btn-success">
              <i class="ti ti-check" />
              <span>Success</span>
            </button>
            <button class="btn-danger">
              <i class="ti ti-trash" />
              <span>Danger</span>
            </button>
            <button class="btn-simple">
              <i class="ti ti-dots" />
              <span>Subtle</span>
            </button>
          </div>
        </section>

        {/* Icon Buttons */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Icon Buttons
          </h2>
          <div class="flex flex-wrap gap-2">
            <button class="icon-btn">
              <i class="ti ti-home" />
            </button>
            <button class="icon-btn">
              <i class="ti ti-search" />
            </button>
            <button class="icon-btn">
              <i class="ti ti-settings" />
            </button>
            <button class="icon-btn">
              <i class="ti ti-user" />
            </button>
          </div>
        </section>

        {/* Inputs */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Inputs
          </h2>
          <div class="flex flex-col gap-3">
            <input
              type="text"
              placeholder="input-border"
              class="input-border"
            />
            <input
              type="text"
              placeholder="input-subtle"
              class="input-subtle"
            />
            <input
              type="text"
              placeholder="input-simple"
              class="input-simple"
            />
          </div>
        </section>

        {/* Papers */}
        <section class="mb-8">
          <h2 class="paper mb-4 p-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Paper (this heading)
          </h2>
          <div class="paper-highlighted p-4">
            <p class="text-gray-700 dark:text-gray-300">
              Paper Highlighted - with hover effect
            </p>
          </div>
        </section>

        {/* Info Blocks */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Info Blocks
          </h2>
          <div class="flex flex-col gap-3">
            <div class="info-block-note">
              <i class="ti ti-info-circle" />
              <span>This is a note info block</span>
            </div>
            <div class="info-block-info">
              <i class="ti ti-info-circle" />
              <span>This is an info block</span>
            </div>
            <div class="info-block-success">
              <i class="ti ti-check" />
              <span>This is a success info block</span>
            </div>
            <div class="info-block-warning">
              <i class="ti ti-alert-triangle" />
              <span>This is a warning info block</span>
            </div>
            <div class="info-block-danger">
              <i class="ti ti-alert-circle" />
              <span>This is a danger info block</span>
            </div>
          </div>
        </section>

        {/* Text Utilities */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Text Utilities
          </h2>
          <div class="flex flex-col gap-2">
            <p class="text-dimmed">text-dimmed - Dimmed text color</p>
            <p class="hover-text">hover-text - Hover to see effect</p>
            <p class="ellipsis max-w-xs">
              ellipsis - This is a very long text that will be truncated with an
              ellipsis when it overflows
            </p>
          </div>
        </section>

        {/* Container */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Container
          </h2>
          <div class="rounded bg-gray-100 p-4 dark:bg-gray-800">
            <p class="text-sm text-gray-700 dark:text-gray-300">
              This demo page is wrapped in a `container` utility class which
              provides:
            </p>
            <ul class="mt-2 list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
              <li>mx-auto (centered)</li>
              <li>max-w-[1000px]</li>
              <li>px-4 (horizontal padding)</li>
            </ul>
          </div>
        </section>

        {/* Scrollbar */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Scrollbar
          </h2>
          <div class="scrollbar h-32 overflow-y-auto rounded bg-gray-100 p-4 dark:bg-gray-800">
            <p class="text-gray-700 dark:text-gray-300">
              This container has custom scrollbar styling. Scroll to see the
              effect.
            </p>
            {Array.from({ length: 20 }, (_, i) => (
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Line {i + 1} - Lorem ipsum dolor sit amet
              </p>
            ))}
          </div>
        </section>

        {/* No Scrollbar */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            No Scrollbar
          </h2>
          <div class="no-scrollbar h-32 overflow-y-auto rounded bg-gray-100 p-4 dark:bg-gray-800">
            <p class="text-gray-700 dark:text-gray-300">
              This container hides the scrollbar but is still scrollable.
            </p>
            {Array.from({ length: 20 }, (_, i) => (
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Line {i + 1} - Lorem ipsum dolor sit amet
              </p>
            ))}
          </div>
        </section>

        {/* Animation */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Animations
          </h2>
          <div class="flex items-center gap-2">
            <span class="text-gray-700 dark:text-gray-300">
              Cursor animation
            </span>
            <span class="animate-cursor text-2xl text-gray-900 dark:text-gray-100">
              |
            </span>
          </div>
        </section>

        {/* Article */}
        <section class="paper mb-8 p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
            Article Layout
          </h2>
          <div class="article">
            <p class="text-gray-700 dark:text-gray-300">
              The `article` utility provides optimal reading width (65ch-80ch)
              and spacing for article content. It's centered with responsive
              padding.
            </p>
          </div>
        </section>

        {/* Back to Home */}
        <div class="mt-8 flex justify-center">
          <a href="/" class="btn-secondary">
            <i class="ti ti-arrow-left" />
            <span>Zurück zur Startseite</span>
          </a>
        </div>
      </div>
    </Layout>,
    { title: "CSS Demo", c },
  );
};
