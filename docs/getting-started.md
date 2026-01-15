# Getting Started

This guide provides code examples for integrating with the Chat API. Examples are provided in TypeScript, Python, Go, and C#.

> **Important:** By using this API, you agree to the [Terms of Service (AGB)](/agb).

## Base URL

All API requests are made to your server's base URL:

```
https://your-server.com/api
```

## Terms of Service

- **User-Agent:** Always send an identifiable `User-Agent` header (e.g., `MyBot/1.0`)
- **Rate Limit:** Max 60 requests/second – debounce autocomplete to 300ms
- **One WebSocket:** Only one WebSocket connection per session
- **No Persistent Storage:** Don't store messages in databases/logs – temporary caching only
- **Credentials:** Store tokens securely, never share with third parties

## Authentication

There are two authentication methods:

| Method | Header | Use Case |
|--------|--------|----------|
| User Session | `Authorization: Bearer {session_token}` | Regular user login |
| Bot Token | `X-Bot-Token: {bot_token}` | Bot account access |

---

## 1. Login

### User Login (Session Token)

Authenticate with username and password to receive a session token.

<details>
<summary>TypeScript</summary>

```typescript
const BASE_URL = "https://your-server.com/api";

async function login(username: string, password: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data.session_token;
}

// Usage
const sessionToken = await login("myuser", "mypassword");
```

</details>

<details>
<summary>Python</summary>

```python
import requests

BASE_URL = "https://your-server.com/api"

def login(username: str, password: str) -> str:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": username, "password": password}
    )
    response.raise_for_status()
    return response.json()["session_token"]

# Usage
session_token = login("myuser", "mypassword")
```

</details>

<details>
<summary>Go</summary>

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

const baseURL = "https://your-server.com/api"

type LoginRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type LoginResponse struct {
    SessionToken string `json:"session_token"`
}

func login(username, password string) (string, error) {
    body, _ := json.Marshal(LoginRequest{Username: username, Password: password})
    
    resp, err := http.Post(baseURL+"/auth/login", "application/json", bytes.NewBuffer(body))
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var result LoginResponse
    json.NewDecoder(resp.Body).Decode(&result)
    return result.SessionToken, nil
}
```

</details>

<details>
<summary>C#</summary>

```csharp
using System.Net.Http.Json;

const string BaseUrl = "https://your-server.com/api";

async Task<string> LoginAsync(string username, string password)
{
    using var client = new HttpClient();
    var response = await client.PostAsJsonAsync(
        $"{BaseUrl}/auth/login",
        new { username, password }
    );
    response.EnsureSuccessStatusCode();
    
    var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
    return result!.SessionToken;
}

record LoginResponse(string SessionToken);
```

</details>

### Bot Authentication

Bots use a token directly without login. The token is provided when creating the bot.

```
X-Bot-Token: bt_a1b2c3d4...
User-Agent: MyBot/1.0
```

---

## 2. Getting User Info

Fetch the current authenticated user's profile.

<details>
<summary>TypeScript</summary>

```typescript
// With session token
const response = await fetch(`${BASE_URL}/users/me`, {
  headers: { Authorization: `Bearer ${sessionToken}` },
});
const user = await response.json();

// With bot token
const response = await fetch(`${BASE_URL}/users/me`, {
  headers: { "X-Bot-Token": botToken },
});
const user = await response.json();
```

</details>

<details>
<summary>Python</summary>

```python
# With session token
response = requests.get(
    f"{BASE_URL}/users/me",
    headers={"Authorization": f"Bearer {session_token}"}
)
user = response.json()

# With bot token
response = requests.get(
    f"{BASE_URL}/users/me",
    headers={"X-Bot-Token": bot_token}
)
user = response.json()
```

</details>

<details>
<summary>Go</summary>

```go
req, _ := http.NewRequest("GET", baseURL+"/users/me", nil)
req.Header.Set("Authorization", "Bearer "+sessionToken)
// or for bots: req.Header.Set("X-Bot-Token", botToken)

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var user map[string]any
json.NewDecoder(resp.Body).Decode(&user)
```

</details>

<details>
<summary>C#</summary>

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", $"Bearer {sessionToken}");
// or for bots: client.DefaultRequestHeaders.Add("X-Bot-Token", botToken);

var user = await client.GetFromJsonAsync<JsonElement>($"{BaseUrl}/users/me");
```

</details>

---

## 3. Listing Chatrooms

Get all chatrooms accessible to the authenticated user.

<details>
<summary>TypeScript</summary>

```typescript
const headers = isBot
  ? { "X-Bot-Token": token }
  : { Authorization: `Bearer ${token}` };

const response = await fetch(`${BASE_URL}/chatrooms`, { headers });
const { chatrooms } = await response.json();
```

</details>

<details>
<summary>Python</summary>

```python
headers = {"X-Bot-Token": token} if is_bot else {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/chatrooms", headers=headers)
chatrooms = response.json()["chatrooms"]
```

</details>

<details>
<summary>Go</summary>

```go
req, _ := http.NewRequest("GET", baseURL+"/chatrooms", nil)
req.Header.Set("Authorization", "Bearer "+token)

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]any
json.NewDecoder(resp.Body).Decode(&result)
chatrooms := result["chatrooms"]
```

</details>

<details>
<summary>C#</summary>

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");

var result = await client.GetFromJsonAsync<JsonElement>($"{BaseUrl}/chatrooms");
var chatrooms = result.GetProperty("chatrooms");
```

</details>

---

## 4. Sending Messages

### Via REST API (Bot Only)

Bots can send messages via the REST API without maintaining a WebSocket connection.

<details>
<summary>TypeScript</summary>

```typescript
const response = await fetch(`${BASE_URL}/messages`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Bot-Token": botToken,
  },
  body: JSON.stringify({
    chatroom_id: chatroomId,
    content_type: "text", // or "image", "gif"
    content: "Hello from bot!",
  }),
});
const message = await response.json();
```

</details>

<details>
<summary>Python</summary>

```python
response = requests.post(
    f"{BASE_URL}/messages",
    headers={"X-Bot-Token": bot_token},
    json={
        "chatroom_id": chatroom_id,
        "content_type": "text",  # or "image", "gif"
        "content": "Hello from bot!",
    }
)
message = response.json()
```

</details>

<details>
<summary>Go</summary>

```go
body, _ := json.Marshal(map[string]string{
    "chatroom_id":  chatroomID,
    "content_type": "text",
    "content":      "Hello from bot!",
})

req, _ := http.NewRequest("POST", baseURL+"/messages", bytes.NewBuffer(body))
req.Header.Set("Content-Type", "application/json")
req.Header.Set("X-Bot-Token", botToken)

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var message map[string]any
json.NewDecoder(resp.Body).Decode(&message)
```

</details>

<details>
<summary>C#</summary>

```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-Bot-Token", botToken);

var response = await client.PostAsJsonAsync($"{BaseUrl}/messages", new {
    chatroom_id = chatroomId,
    content_type = "text",
    content = "Hello from bot!"
});
var message = await response.Content.ReadFromJsonAsync<JsonElement>();
```

</details>

---

## 5. WebSocket Connection

For real-time messaging and receiving messages, connect via WebSocket.

### Connection URL

```
wss://your-server.com/api/ws?session_token={token}&room_id={optional}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `session_token` | Yes | Session token from login |
| `room_id` | No | Chatroom UUID to join for sending messages |

**Note:** Bots can also use WebSocket with their session. Bots do not produce join/leave messages.

### Message Format

**Server → Client:**
```json
{ "type": "message", "data": { "id": "...", "content": "...", ... } }
{ "type": "error", "message": "Error description" }
```

**Client → Server:**
```json
{ "content_type": "text", "content": "Hello!" }
{ "content_type": "image", "content": "data:image/webp;base64,..." }
{ "content_type": "gif", "content": "https://static.klipy.com/..." }
```

<details>
<summary>TypeScript</summary>

```typescript
const url = new URL("wss://your-server.com/api/ws");
url.searchParams.set("session_token", sessionToken);
url.searchParams.set("room_id", chatroomId); // optional

const ws = new WebSocket(url);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "message") {
    console.log("Received:", data.data.content);
  }
};

// Send a message (only if connected with room_id)
ws.send(JSON.stringify({ content_type: "text", content: "Hello!" }));
```

</details>

<details>
<summary>Python</summary>

```python
import asyncio
import websockets
import json

async def connect():
    url = f"wss://your-server.com/api/ws?session_token={session_token}&room_id={room_id}"
    
    async with websockets.connect(url) as ws:
        # Send a message
        await ws.send(json.dumps({"content_type": "text", "content": "Hello!"}))

        # Listen for messages
        async for message in ws:
            data = json.loads(message)
            if data["type"] == "message":
                print(f"Received: {data['data']['content']}")

asyncio.run(connect())
```

</details>

<details>
<summary>Go</summary>

```go
import "github.com/gorilla/websocket"

u := url.URL{Scheme: "wss", Host: "your-server.com", Path: "/api/ws"}
q := u.Query()
q.Set("session_token", sessionToken)
q.Set("room_id", roomID)
u.RawQuery = q.Encode()

conn, _, _ := websocket.DefaultDialer.Dial(u.String(), nil)
defer conn.Close()

// Send a message
conn.WriteJSON(map[string]string{"content_type": "text", "content": "Hello!"})

// Listen for messages
for {
    var msg map[string]any
    conn.ReadJSON(&msg)
    if msg["type"] == "message" {
        data := msg["data"].(map[string]any)
        fmt.Println("Received:", data["content"])
    }
}
```

</details>

<details>
<summary>C#</summary>

```csharp
using var ws = new ClientWebSocket();
var url = $"wss://your-server.com/api/ws?session_token={sessionToken}&room_id={roomId}";
await ws.ConnectAsync(new Uri(url), CancellationToken.None);

// Send a message
var msg = JsonSerializer.Serialize(new { content_type = "text", content = "Hello!" });
await ws.SendAsync(Encoding.UTF8.GetBytes(msg), WebSocketMessageType.Text, true, CancellationToken.None);

// Listen for messages
var buffer = new byte[4096];
while (ws.State == WebSocketState.Open) {
    var result = await ws.ReceiveAsync(buffer, CancellationToken.None);
    var data = JsonSerializer.Deserialize<JsonElement>(Encoding.UTF8.GetString(buffer, 0, result.Count));
    if (data.GetProperty("type").GetString() == "message") {
        Console.WriteLine($"Received: {data.GetProperty("data").GetProperty("content")}");
    }
}
```

</details>

---

## 6. Global Notifications (Without Room)

Connect without `room_id` to receive messages from all unmuted chatrooms without joining a specific room. This is useful for displaying notifications.

```
wss://your-server.com/api/ws?session_token={token}
```

In this mode:
- You receive all messages from unmuted chatrooms
- You cannot send messages (will receive an error)
- No join/leave messages are generated

---

## 7. Error Handling

All endpoints return errors in this format:

```json
{ "message": "Error description" }
```

Common HTTP status codes:

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |

---

## Further Resources

- **Interactive API Docs:** `/api/docs` (Scalar UI)
- **OpenAPI Specification:** `/api/openapi.json?pretty` – complete type definitions for all endpoints
- **WebSocket Details:** See [API Description](./api-description.md)
- **Backend Architecture:** See [Backend Documentation](./backend.md)
