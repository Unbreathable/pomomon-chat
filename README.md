# Chat

A real-time chat application built with [Bun](https://bun.sh), [Hono](https://hono.dev), and [SolidJS](https://solidjs.com).

## Features

- Real-time messaging via WebSocket
- User authentication with session management
- Chatrooms (public, private, unlisted)
- Bot accounts with API access
- GIF support via Klipy
- Image uploads (WebP)
- Message editing and deletion
- Admin dashboard

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Docker](https://docker.com) (for PostgreSQL and Valkey/Redis)

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/ValentinKolb/chat.git
   cd chat
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Start database services**

   ```bash
   docker compose -f compose.dev.yml up -d
   ```

4. **Run database migrations**

   ```bash
   bun run migrate
   ```

5. **Start the development server**

   ```bash
   bun run dev
   ```

6. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000)

   Default admin credentials:
   - Username: `admin`
   - Password: `changeme123`

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run serve` | Run production build (see `scripts/entrypoint.sh` for best practices) |
| `bun run migrate` | Run database migrations |

## Production Deployment

See [`compose.example.yml`](./compose.example.yml) for a production-ready Docker Compose configuration.

```bash
# Copy and configure
cp compose.example.yml compose.yml
# Edit compose.yml and change all CHANGE_ME values

# Deploy
docker compose up -d
```

The Docker image is available at `ghcr.io/valentinkolb/chat:latest`.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started.md) | API integration guide with code examples |
| [Backend Architecture](./docs/backend.md) | Technical documentation for the backend |
| [Frontend Architecture](./docs/frontend.md) | Technical documentation for the frontend |

### Interactive API Docs

When running the app, visit `/api/docs` for interactive API documentation (Scalar UI).

The OpenAPI specification is available at `/api/openapi.json?pretty`.

## Contributing

Contributions are welcome! Here's how to get started:

### Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make your changes
5. Run the app locally to test
6. Commit your changes: `git commit -m "Add my feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request

### Project Structure

```
src/
├── backend/          # Hono API server
│   ├── api/          # Route handlers
│   ├── lib/          # Utilities (auth, rate limiting, etc.)
│   └── services/     # Business logic
├── frontend/         # SolidJS UI
│   ├── components/   # Reusable components
│   ├── islands/      # Interactive client components
│   └── pages/        # Page components
└── shared/           # Shared types and schemas
```

### Guidelines

- Follow existing code style
- Add types for new code
- Test your changes locally
- Keep PRs focused on a single feature/fix
- **Minimal dependencies:** This project aims to use as few external packages as possible. New dependencies must be well justified – prefer using Bun/Hono built-ins over adding packages

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Backend:** [Hono](https://hono.dev)
- **Frontend:** [SolidJS](https://solidjs.com) with Islands Architecture
- **Database:** PostgreSQL
- **Cache/Sessions:** Valkey (Redis-compatible)
- **Styling:** Tailwind CSS

## License

[MIT](./LICENSE)
