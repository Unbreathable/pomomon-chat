REST API for the Chat application.

## Terms of Service

By using this API, you agree to the [Terms of Service (AGB)](/agb). This applies to all API access, including bot accounts and third-party clients.

**Key rules:**

- **No persistent message storage** – Temporary caching only, no databases/logs/archives
- **Rate limit: 60 req/s** – Debounce autocomplete to 300ms, respect HTTP 429
- **One WebSocket per session** – Send identifiable User-Agent header
- **Credentials stay local** – Never share or store on external servers
- **No scraping/spam** – No mass downloads or rate-limit circumvention
- **GIF attribution required** – Display Klipy logo per their terms

Violations may result in immediate account termination.

**For complete rules, see the full [Terms of Service (AGB)](/agb).**

## JSON Formatting

All JSON responses can be pretty-printed by adding the `?pretty` query parameter to any endpoint:

```
GET /api/users/me?pretty
```

## WebSocket

Real-time messaging via WebSocket at `/api/ws`.

### Connection

```
GET /api/ws?session_token={token}&room_id={uuid}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `session_token` | Yes | Session token from login |
| `room_id` | No | Chatroom UUID to join |

### Connection Modes

**With `room_id`** (Active Chat):
- Joins the specified chatroom
- Can send and receive messages
- Auto-broadcasts join/leave messages (not for bots)
- Also subscribes to all unmuted rooms for notifications

**Without `room_id`** (Notification Only):
- Cannot send messages (returns error if attempted)
- Receives messages from all unmuted rooms
- Useful for showing notifications in the UI

### Server Messages

```json
{ "type": "message", "data": { /* Message object */ } }
{ "type": "error", "message": "Error description" }
```

### Client Messages

Only allowed when connected with `room_id`.

**Text** (max 10KB):
```json
{ "content_type": "text", "content": "Hello!", "content_meta": "optional" }
```

**Image** (max 500KB WebP base64):
```json
{ "content_type": "image", "content": "data:image/webp;base64,...", "content_meta": "alt text" }
```

**GIF** (Klipy CDN only):
```json
{ "content_type": "gif", "content": "https://static.klipy.com/...", "content_meta": "optional" }
```

### Rate Limiting

Messages are rate limited per user. Exceeding the limit closes the connection with an error.
