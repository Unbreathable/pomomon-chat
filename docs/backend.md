# Backend Architecture

## Overview

The backend is a **Hono** web framework application running on **Bun** runtime. It provides a REST API with WebSocket support for real-time chat, using **PostgreSQL** for persistence and **Redis** for sessions, rate limiting, and caching.

## Tech Stack

- **Bun** - JavaScript runtime with built-in Redis client and password hashing
- **Hono** - Lightweight web framework with RPC type inference
- **PostgreSQL** - Primary database (via Bun's SQL client)
- **Redis** - Session storage, rate limiting, invite tokens, and GIF caching
- **Zod** - Request validation with type inference
- **Sharp** - Image processing for avatars and fallback generation
- **hono-openapi** - OpenAPI documentation generation
- **Scalar** - Interactive API documentation UI

## Directory Structure

```
src/backend/
├── api/                 # HTTP route handlers
│   ├── index.ts         # Main API router with OpenAPI docs
│   ├── auth.ts          # Login, register, password management
│   ├── users.ts         # User profile and admin operations
│   ├── admin.ts         # Admin stats and invite management
│   ├── chatrooms.ts     # Chatroom CRUD, membership, and preferences
│   ├── messages.ts      # Message CRUD, search, and images
│   ├── gifs.ts          # GIF search via Klipy API
│   ├── bots.ts          # Bot account management
│   └── websocket.ts     # Real-time chat WebSocket
├── lib/                 # Shared utilities
│   ├── auth.ts          # Session management and middleware
│   ├── rate-limit.ts    # Sliding window rate limiter
│   ├── validator.ts     # Zod validation wrapper
│   ├── images.ts        # WebP parsing and fallback generation
│   └── openapi.ts       # OpenAPI helpers and metadata
├── services/            # Business logic layer
│   ├── users.ts         # User operations
│   ├── chatrooms.ts     # Chatroom operations with membership
│   ├── messages.ts      # Message operations with edit history
│   ├── gifs.ts          # Klipy API integration with caching
│   ├── bots.ts          # Bot account operations
│   └── stats.ts         # Admin statistics
└── migrate.ts           # Database migrations
```

## Authentication

### Session Management

Sessions are stored in Redis with the format `session:{userId}:{tokenPart}`:

```typescript
// Token format: "userId:randomUUID"
const token = `${userId}:${crypto.randomUUID()}`;
await redis.set(`session:${userId}:${tokenPart}`, "1", "EX", expirySeconds);
```

Sessions can be retrieved from:
1. `session_token` cookie (browser requests)
2. `Authorization: Bearer {token}` header (API requests)
3. `session_token` query parameter (WebSocket connections)

### Bot Token Authentication

Bots authenticate using the `X-Bot-Token` header instead of session tokens:

```
X-Bot-Token: {bot_token}
```

Bot tokens are generated when creating a bot and can be regenerated. The token is shown only once at creation/regeneration and must be stored securely.

### Middleware

| Middleware | Description |
|------------|-------------|
| `requireAuth` | Returns 401 if not authenticated |
| `requireAdmin` | Returns 403 if not admin (use after requireAuth) |
| `redirectIfNotAuthenticated` | Redirects to /auth/login (for pages) |
| `redirectIfAuthenticated` | Redirects to / if logged in (for auth pages) |

### Password Hashing

Uses Bun's built-in password hashing (Argon2):

```typescript
const hash = await Bun.password.hash(password);
const valid = await Bun.password.verify(password, hash);
```

## Rate Limiting

Implements a sliding window rate limiter using Redis:

- Default: 60 requests per second per user/IP
- Uses weighted average of current and previous windows
- Sets `X-RateLimit-*` headers on responses
- Returns 429 when limit exceeded
- Also applies to WebSocket messages

## API Routes

### Authentication (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Authenticate user, returns session token |
| POST | `/register` | Create account with invite token |
| POST | `/logout` | End session |
| POST | `/change-password` | Update password (authenticated) |
| POST | `/reset-password` | Reset password with admin-generated token |

### Users (`/api/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Get current user |
| PATCH | `/me` | Update profile (username, bio, avatar) |
| DELETE | `/me` | Delete own account |
| GET | `/search` | Search users by username (max 5 results) |
| GET | `/:id` | Get user by ID |
| GET | `/:id/avatar` | Get user avatar as WebP image |
| DELETE | `/:id` | Delete user (self or admin) |
| DELETE | `/:id/sessions` | Logout user from all devices (self or admin) |
| POST | `/:id/reset-password` | Generate reset link (admin only) |
| PATCH | `/:id/role` | Change user role (admin only) |
| GET | `/` | List all users (admin only) |

### Chatrooms (`/api/chatrooms`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List accessible chatrooms (with filters) |
| POST | `/` | Create chatroom |
| GET | `/:id` | Get chatroom details |
| PATCH | `/:id` | Update chatroom (manager or admin) |
| DELETE | `/:id` | Soft-delete chatroom (manager or admin) |
| GET | `/:id/image` | Get chatroom image as WebP |
| GET | `/:id/messages` | Get messages (cursor-based pagination) |

**Membership Management:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:id/members` | List chatroom members with roles |
| POST | `/:id/members` | Add member (manager only) |
| PATCH | `/:id/members/:userId` | Update member role (manager only) |
| DELETE | `/:id/members/:userId` | Remove member (manager or self) |
| POST | `/:id/join` | Join chatroom via token |
| POST | `/:id/reset-join-token` | Reset join token (manager only) |

**User Preferences:**

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/:id/favorite` | Add chatroom to favorites |
| DELETE | `/:id/favorite` | Remove chatroom from favorites |
| PUT | `/:id/mute` | Mute chatroom notifications |
| DELETE | `/:id/mute` | Unmute chatroom notifications |

### Messages (`/api/messages`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Search messages (requires chatroom_id) |
| POST | `/` | Send message (bot only, via REST API) |
| GET | `/:id` | Get message with edit history |
| PATCH | `/:id` | Edit message (creator only, 10-min window) |
| DELETE | `/:id` | Delete message (creator only, 10-min window) |
| GET | `/:id/image` | Get message image as WebP |

### GIFs (`/api/gifs`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Search GIFs or get trending (via Klipy API) |
| GET | `/recent` | Get user's recently used GIFs |

### Bots (`/api/bots`)

Bots are special user accounts that can be programmatically controlled via API tokens.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List your bots (admins see all) |
| POST | `/` | Create a new bot |
| GET | `/:id` | Get bot details |
| PATCH | `/:id` | Update bot (username, bio, avatar) |
| DELETE | `/:id` | Delete bot |
| POST | `/:id/regenerate-token` | Generate new token (invalidates old) |

**Bot Limits:**
- Regular users can create up to `MAX_BOTS_PER_USER` bots (default: 5)
- Admins are exempt from this limit
- Bots can only be added to chatrooms where `bots_allowed` is true

### Admin (`/api/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Get platform statistics |
| POST | `/invites` | Create invite link |
| DELETE | `/invites/:token` | Revoke invite |

### Documentation

| Path | Description |
|------|-------------|
| GET `/api/docs` | Interactive API documentation (Scalar UI) |
| GET `/api/openapi.json` | OpenAPI 3.0 specification |
| GET `/api/openapi.json?pretty` | OpenAPI spec with pretty-printed JSON |

### JSON Formatting

All API endpoints support the `?pretty` query parameter for human-readable JSON output:

```
GET /api/users/me?pretty
GET /api/chatrooms?pretty
```

## Image URLs and Fallbacks

User avatars and chatroom images are returned as URLs in API responses. The URL includes a `?fallback` query parameter when no custom image is set:

```
/api/users/:id/avatar           # Custom avatar
/api/users/:id/avatar?fallback  # Generated fallback (initials + color)

/api/chatrooms/:id/image           # Custom image
/api/chatrooms/:id/image?fallback  # Generated fallback
```

This allows clients to detect fallback images and handle them differently (e.g., hide delete button in image picker).

## Upload Limits

All images must be uploaded as **WebP base64 data URLs** (format: `data:image/webp;base64,...`).

| Type | Max Base64 Size | Approx. Image Size | Used For |
|------|-----------------|-------------------|----------|
| User Avatar | 200 KB | ~150 KB | `PATCH /api/users/me` |
| Chatroom Image | 200 KB | ~150 KB | `PATCH /api/chatrooms/:id` |
| Chat Message Image | 500 KB | ~375 KB | WebSocket messages |
| Text Message | 10 KB | - | WebSocket messages |

**Note:** Base64 encoding increases file size by ~33%, so a 375 KB image becomes ~500 KB when encoded.

## WebSocket

### Connection

```
ws://host/api/ws?session_token={token}&room_id={optional}
```

- `session_token` - Required for authentication
- `room_id` - Optional, subscribe to a specific chatroom for sending messages

### Messages

**Server → Client:**
```typescript
{ type: "message", data: Message }
{ type: "error", message: string }
```

**Client → Server:**
```typescript
{
  content_type: "text" | "image" | "gif",
  content: string,
  content_meta?: string  // Optional: alt text for images, metadata for GIFs
}
```

### Behavior

1. On connect: Validates session, subscribes to room (if provided) and all unmuted rooms
2. Join/leave `info` messages are broadcast to the room (not for bots)
3. All messages are persisted to the database
4. Rate limiting applies to WebSocket messages
5. Users receive notifications from all unmuted rooms
6. Bots do not generate join/leave messages when connecting/disconnecting

### Message Types

| Type | Description |
|------|-------------|
| `text` | Plain text message (HTML sanitized) |
| `image` | WebP base64 data URL |
| `gif` | URL to GIF (from Klipy CDN) |
| `info` | System message (join/leave notifications) |

## Database Schema

### Tables

- **users** - User accounts with password hashes (includes bot accounts with `is_bot=true`)
- **chatrooms** - Chat rooms with metadata and join tokens
- **chatroom_members** - Membership with roles (member/manage)
- **messages** - Chat messages with edit history
- **message_edits** - Edit history for messages
- **bot_tokens** - Authentication tokens for bot accounts
- **favorite_chatrooms** - User favorites (many-to-many)
- **unmuted_chatrooms** - Notification preferences (many-to-many)

### Chatroom Types

| Type | Description |
|------|-------------|
| Townsquare | Public rooms accessible to all users, no join token needed |
| Private | Invite-only rooms with explicit member list |
| Unlisted | Hidden from public list but accessible via direct link |

### Member Roles

| Role | Permissions |
|------|-------------|
| `member` | Read and write messages |
| `manage` | Edit room, manage members, reset join token |

### Key Constraints

- UUIDs for all primary keys
- Cascade deletes for messages when chatroom deleted
- SET NULL for user references when user deleted
- Message content limited to 500 KB (for image messages)
- Edit history preserved (old content saved before update)

## Services

Services encapsulate database operations and business logic:

| Service | Responsibility |
|---------|---------------|
| `userService` | User CRUD, password reset tokens, avatar data |
| `chatroomService` | Chatroom CRUD, access control, membership, favorites/mute |
| `messageService` | Message CRUD with sanitization and edit history |
| `botService` | Bot account CRUD, token generation and verification |
| `gifService` | Klipy API integration with Redis caching |
| `statsService` | Aggregated admin statistics |

All services return transformed objects with computed fields (e.g., avatar URLs instead of raw base64 data).

### GIF Service Caching

| Data | TTL | Description |
|------|-----|-------------|
| Trending GIFs | 5 minutes | Shared across all users |
| Search results | 2 minutes | Cached per query |
| Recent GIFs | No cache | User-specific, always fresh |

## Environment Variables

See `src/shared/env.ts` for all configuration options:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | "Chat" | Application name |
| `NODE_ENV` | "development" | Environment mode |
| `PORT` | 3000 | Server port |
| `SESSION_EXPIRY_HOURS` | 168 (7 days) | Session TTL |
| `INVITE_EXPIRY_HOURS` | 24 | Invite link TTL |
| `RATE_LIMIT_PER_SECOND` | 60 | Rate limit threshold |
| `MAX_BOTS_PER_USER` | 5 | Max bots per user (admins exempt) |
| `INITIAL_ADMIN_USERNAME` | "admin" | First admin username |
| `INITIAL_ADMIN_PASSWORD` | "changeme123" | First admin password |
| `KLIPY_API_KEY` | "" | API key for Klipy GIF service |

**Note:** Database and Redis connections use Bun's built-in `sql` and `redis` globals (configured via `bunfig.toml` or environment).
