# Frontend Architecture

## Overview

The frontend is a **SolidJS** application with server-side rendering via a custom SSR framework. It uses **Tailwind CSS** for styling and communicates with the backend via a type-safe **Hono client** and **WebSocket** for real-time messaging.

## Tech Stack

- **SolidJS** - Reactive UI framework with fine-grained reactivity
- **@valentinkolb/ssr** - Custom SSR framework with file-based routing
- **Hono** - Web framework for routing and type-safe API client
- **Tailwind CSS v4** - Utility-first CSS framework
- **Tabler Icons** - Icon library (webfont)
- **dayjs** - Date/time formatting
- **marked** - Markdown parsing
- **lean-qr** - QR code generation

## Directory Structure

```
src/frontend/
├── components/
│   ├── layout/              # App shell components
│   │   ├── Layout.tsx       # Main layout with sidebar
│   │   ├── UserMenu.island.tsx
│   │   ├── CreateButton.island.tsx
│   │   ├── SearchButton.island.tsx
│   │   ├── FavoritesButton.island.tsx
│   │   ├── GlobalNotifications.client.tsx
│   │   └── BinaryBackground.client.tsx
│   └── ui/                  # Reusable UI components
│       ├── Avatar.tsx
│       ├── Dropdown.tsx
│       ├── prompts.tsx      # Modal/alert utilities
│       └── forms/           # Form input components
├── pages/                   # File-based routing
│   ├── index.tsx            # Route definitions
│   ├── home/                # Chatroom list
│   ├── room/                # Chat view and room info
│   ├── admin/               # Admin panel
│   ├── auth/                # Login, register, reset
│   ├── me/                  # User profile
│   ├── legal/               # Terms, privacy, imprint
│   └── demo/                # Component demo page
├── lib/                     # Utilities and hooks
│   ├── websocket.tsx        # WebSocket hook
│   ├── mutation.tsx         # Mutation state hook
│   ├── client-utils.ts      # API client, notifications
│   ├── markdown.ts          # Markdown rendering
│   ├── images.ts            # Image processing
│   └── files.ts             # File picker utilities
└── styles/
    ├── global.css           # Tailwind imports
    └── custom.css           # Custom utility classes
```

## Component Patterns

### Island Components (`.island.tsx`)

Interactive components that hydrate on the client while keeping pages server-rendered:

- `UserMenu.island.tsx` - Profile dropdown with theme toggle
- `CreateButton.island.tsx` - New chatroom modal
- `SearchButton.island.tsx` - Global search modal
- `ChatWindow.island.tsx` - Real-time chat interface

### Client-Only Components (`.client.tsx`)

Components that only run on the client:

- `GlobalNotifications.client.tsx` - WebSocket notification listener
- `BinaryBackground.client.tsx` - Animated background effect

### Form Components

All form inputs use an `InputWrapper` pattern for consistent accessibility:

```tsx
<TextInput
  label="Username"
  description="Choose a unique username"
  error={errors().username}
  icon="ti-user"
  required
/>
```

Available form components:
- `TextInput` - Single/multi-line text
- `Select` - Dropdown with search
- `Checkbox` - Boolean toggle
- `TagsInput` - Multiple tag entry
- `NumberInput` - Numeric with increment/decrement
- `ImageInput` - Image upload/preview
- `PinInput` - Masked PIN entry

## Routing

File-based routing with middleware support:

```typescript
const pages = new Hono<AuthContext>()
  .get("/", auth.middleware.redirectIfNotAuthenticated, homePage)
  .get("/room/:id", auth.middleware.redirectIfNotAuthenticated, roomPage)
  .get("/admin", auth.middleware.requireAdmin, adminPage)
  .get("/auth/login", auth.middleware.redirectIfAuthenticated, loginPage);
```

### Route Guards

| Middleware | Behavior |
|------------|----------|
| `redirectIfNotAuthenticated` | Redirects to `/auth/login` |
| `redirectIfAuthenticated` | Redirects to `/` |
| `requireAdmin` | Returns 403 if not admin |

## State Management

### Signals (SolidJS)

Fine-grained reactivity using signals instead of centralized stores:

```typescript
const [messages, setMessages] = createSignal<Message[]>([]);
const [loading, setLoading] = createSignal(false);
```

### `createMutation` Hook

React Query-like mutation management:

```typescript
const editMutation = createMutation({
  mutation: async ({ content }) => {
    const res = await api.messages[":id"].$patch({
      param: { id: msgId },
      json: { content },
    });
    // Extract error message from API response
    if (!res.ok) {
      const data = await res.json();
      throw new Error("message" in data ? data.message : "Failed to edit");
    }
    return res.json();
  },
  onSuccess: (data) => setContent(data.content),
  onError: (error) => prompts.error(error.message),
});

// Usage
editMutation.mutate({ content: "Updated text" });
editMutation.loading(); // boolean signal
```

**Error Handling Pattern:** API error responses contain a `message` field. The mutation should check `res.ok`, extract the message, and throw an `Error`. The `onError` callback then displays it via `prompts.error(error.message)`.

### `createWs` Hook

WebSocket connection with auto-reconnect:

```typescript
const ws = createWs<WsServerMessage, WsClientMessage>({
  uri: `/api/ws?session_token=${token}&room_id=${roomId}`,
  onMessage: (msg) => {
    if (msg.type === "message") addMessage(msg.data);
  },
});

ws.send({ content_type: "text", content: "Hello!" });
ws.status(); // "connecting" | "connected" | "disconnected" | "error"
```

Features:
- Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max
- Max 10 reconnect attempts
- 200ms minimum "connecting" display to avoid flicker

## API Client

Type-safe API calls via Hono client:

```typescript
import { api } from "@/frontend/lib/client-utils";

// GET request
const res = await api.chatrooms.$get({ query: { page: "1" } });
const data = await res.json();

// POST request
const res = await api.chatrooms.$post({
  json: { name: "New Room", is_townsquare: true },
});
```

## Styling

### Tailwind CSS v4

Standard Tailwind utilities with custom configuration.

### Custom Utilities (`custom.css`)

| Class | Description |
|-------|-------------|
| `paper` | Glassmorphic card with blur |
| `paper-highlighted` | Elevated paper variant |
| `btn-primary` | Primary action button |
| `btn-danger` | Destructive action button |
| `btn-success` | Success action button |
| `input-subtle` | Borderless input style |
| `text-dimmed` | Muted text color |
| `shimmer` | Loading animation overlay |

### Theme Support

Light/dark mode via document class:

```typescript
// Toggle theme
const theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
document.documentElement.classList.toggle("dark");
document.cookie = `theme=${theme}; path=/; max-age=31536000`;
```

Server reads cookie for initial SSR render to prevent flash.

## Real-Time Features

### Chat Messages

1. Messages sent via WebSocket
2. Server broadcasts to room subscribers
3. UI updates immediately (optimistic)
4. Edit/delete within 10-minute window

### Notifications

- `GlobalNotifications.client.tsx` subscribes to unmuted rooms
- Desktop notifications via Notification API
- Click navigates to chatroom

### Message Grouping

Consecutive messages from same user within 5 minutes are grouped:

```typescript
// Groups messages for efficient rendering
const groups = groupMessages(messages);
// Returns: { user, messages: Message[], timestamp }[]
```

## View Transitions

Smooth page transitions using CSS View Transitions API:

```tsx
<a href={`/room/${room.id}`} style={`view-transition-name: chat-${room.id}`}>
  {room.name}
</a>
```

## Accessibility

- Semantic HTML with ARIA attributes
- Keyboard navigation support
- `InputWrapper` provides consistent labeling
- Live regions for dynamic content
- Focus management in modals

## Special Rendering

### Emoji-Only Messages

Messages with only emojis render larger:

| Count | Size |
|-------|------|
| 1 emoji | `text-7xl` |
| 2 emojis | `text-5xl` |
| 3-5 emojis | `text-3xl` |
| 6+ emojis | Normal |

### Image Grid

Multiple images in a message:

- 1 image: Full width
- 2 images: Side by side
- 3 images: 2 + 1 layout
- 4+ images: 2x2 grid with "+N more" overlay

### Markdown

Text messages support GFM markdown:

- Bold, italic, strikethrough
- Links (open in new tab)
- Code blocks with syntax highlighting
- Lists and blockquotes
