/** 404 Not Found page with terminal-style design. */
export const NotFound = () => (
  <div class="items-center flex flex-col gap-2 min-h-screen justify-center bg-gray-50 p-4 dark:bg-gray-950">
    <div class="paper sm:flex-initial flex-1 sm:min-w-[40%] min-w-full p-4 text-center flex flex-col gap-4">
      <pre class="text-2xl leading-tight text-gray-600 dark:text-gray-400">
        404
      </pre>

      <p class="text-sm text-dimmed">
        <code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
          ERROR: ENOENT
        </code>
      </p>

      <div
        class="rounded bg-gray-50 p-4 font-mono text-left text-xs dark:border-gray-700 dark:bg-gray-900"
        aria-hidden="true"
      >
        <div class="text-gray-500">$ cat /dev/null</div>
        <div class="text-gray-500">$ echo $?</div>
        <div class="text-red-500">404</div>
        <div class="text-gray-500">$ pwd</div>
        <div class="text-blue-500">/lost+found</div>
        <div class="mt-2 text-gray-500">
          $ _<span class="animate-cursor bg-gray-700 text-gray-700">_</span>
        </div>
      </div>

      {/* Mobile: inside card */}
      <a href="/" class="btn-primary px-4 py-2 mt-auto sm:hidden">
        <i class="ti ti-home" />
        <span>Back to Home</span>
      </a>
    </div>

    {/* Desktop: outside card */}
    <a href="/" class="btn-primary px-4 py-2 hidden sm:flex">
      <i class="ti ti-home" />
      <span>Back to Home</span>
    </a>
  </div>
);
