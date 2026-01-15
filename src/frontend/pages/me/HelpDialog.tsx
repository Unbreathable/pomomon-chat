import { prompts } from "@/frontend/components/ui/prompts";

// ==========================
// Help Sections
// ==========================

const sections = [
  {
    title: "Chatrooms",
    icon: "ti ti-messages",
    items: [
      "You are automatically a member of all chatrooms",
      "Create new chatrooms with the + button in the sidebar",
      "You can edit or delete chatrooms you created",
      "Admins can edit or delete any chatroom",
      "Deleted chatrooms are soft-deleted and can be restored by admins",
    ],
  },
  {
    title: "Messages",
    icon: "ti ti-message",
    items: [
      "Messages support Markdown: **bold**, *italic*, `code`, lists, and links",
      "Send images by clicking the photo button or pasting from clipboard",
      "Emoji-only messages are displayed larger for better visibility",
      "Deleted messages are soft-deleted and visible to admins",
    ],
  },
  {
    title: "Favorites & Notifications",
    icon: "ti ti-heart",
    items: [
      "Click the heart icon to filter your favorite chatrooms",
      "Favorite chatrooms by clicking the heart in the chatroom menu",
      "Mute chatrooms to stop receiving desktop notifications",
      "You still receive notifications for unmuted rooms when not viewing them",
    ],
  },
  {
    title: "Images & Media",
    icon: "ti ti-photo",
    items: [
      "All images are automatically compressed to WebP format",
      "Avatars and chatroom images: max ~150 KB",
      "Chat images: max ~375 KB",
      "Click on images in chat to view them in fullscreen",
    ],
  },
  {
    title: "GIFs",
    icon: "ti ti-gif",
    items: [
      "Send GIFs by clicking the GIF button next to the photo button",
      "Search for GIFs or browse trending ones powered by KLIPY",
      "Scroll down in the GIF picker to load more results",
      "GIFs are loaded from an external service (KLIPY)",
      "Disable GIFs in your profile settings if you prefer not to load external content",
      "When disabled, GIFs appear as placeholders showing only the title",
    ],
  },
  {
    title: "Profile & Security",
    icon: "ti ti-user",
    items: [
      "Username: 3-20 characters, letters, numbers and underscores only",
      "Password: 8-128 characters, at least one letter and one number/special character",
      "You can logout from all devices in the profile menu",
      "Deleting your account removes your data but messages remain anonymous",
    ],
  },
  {
    title: "Search",
    icon: "ti ti-search",
    items: [
      "Use the search icon to find chatrooms by name or description",
      "Combine search with favorites filter to search within favorites",
      "Admins can see unlisted chatrooms in search results",
    ],
  },
];

// ==========================
// Help Dialog Functions
// ==========================

const SectionContent = (section: (typeof sections)[0]) => (
  <div class="space-y-2">
    <div class="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium">
      <i class={section.icon} />
      <span>{section.title}</span>
    </div>
    <ul class="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
      {section.items.map((item) => (
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

/** Shows the general help dialog with all sections. */
export const showGeneralHelp = async (): Promise<void> => {
  await prompts.alert(
    <div class="space-y-6 max-h-96 overflow-y-auto pr-2 scrollbar">
      {sections.map((section) => SectionContent(section))}
    </div>,
    {
      title: "Help",
      icon: "ti ti-help",
    },
  );
};

/** Shows the notifications help dialog. */
export const showNotificationsHelp = async (): Promise<void> => {
  await prompts.alert(
    <div class="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
      <p>
        To enable or disable desktop notifications, click the lock/info icon in
        your browser's address bar and change the notification setting.
      </p>
      <p>When enabled, you'll receive desktop notifications for:</p>
      <ul class="space-y-1 ml-4">
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>New messages in unmuted chatrooms</span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>Only when you're not currently viewing that chat</span>
        </li>
      </ul>
      <p>To mute a chatroom, open its menu and click "Mute notifications".</p>
    </div>,
    {
      title: "Desktop Notifications",
      icon: "ti ti-bell",
      confirmText: "Got it",
    },
  );
};

/** Shows the bots help dialog. */
export const showBotsHelp = async (): Promise<void> => {
  await prompts.alert(
    <div class="space-y-4 text-sm text-zinc-600 dark:text-zinc-400 max-h-96 overflow-y-auto pr-2 scrollbar">
      <p>
        <strong class="text-zinc-900 dark:text-zinc-100">What are Bots?</strong>
      </p>
      <p>
        Bots are automated accounts that work just like regular user accounts.
        They can join chatrooms, send and receive messages, and interact with
        other users - but they are controlled programmatically via the API
        instead of through the web interface.
      </p>
      <ul class="space-y-1 ml-4">
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>Bots are visible to all users in the system</span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            Any room manager can add your bot to their chatroom to activate it
            there
          </span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            Once added to a room, the bot can read and send messages in that
            room
          </span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>Some chatrooms may have bots disabled by their managers</span>
        </li>
      </ul>
      <p>
        <strong class="text-zinc-900 dark:text-zinc-100">Creating Bots:</strong>
      </p>
      <ul class="space-y-1 ml-4">
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            Each bot gets a unique API token (shown only once at creation)
          </span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>Store the token securely - it cannot be retrieved later</span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            You can regenerate the token if needed (invalidates the old one)
          </span>
        </li>
      </ul>
      <p>
        <strong class="text-zinc-900 dark:text-zinc-100">Using Bots:</strong>
      </p>
      <ul class="space-y-1 ml-4">
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            Authenticate API requests with the{" "}
            <code class="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
              X-Bot-Token
            </code>{" "}
            header
          </span>
        </li>
        <li class="flex gap-2">
          <span class="text-zinc-400 dark:text-zinc-600">•</span>
          <span>
            Use the REST API or WebSocket to send and receive messages
          </span>
        </li>
      </ul>
      <p>
        See the{" "}
        <a
          href="/api/docs"
          target="_blank"
          class="text-blue-500 hover:underline"
        >
          API documentation
        </a>{" "}
        for details.
      </p>
    </div>,
    {
      title: "About Bots",
      icon: "ti ti-robot",
      confirmText: "Got it",
    },
  );
};
