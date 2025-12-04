# discourse.ai

AI-powered debate platform to sharpen your argumentation skills.

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono.js + TypeScript
- **Database**: PostgreSQL (Docker) + Drizzle ORM
- **AI**: Groq (LLaMA) + Deepgram (STT)
- **Styling**: Tailwind CSS

## Project Structure
```
discourse.ai/
├── apps/
│   ├── api/          # Hono backend API
│   └── web/          # Landing page
├── packages/
│   └── db/           # Database schema
├── scripts/          # Setup scripts
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)
- [Docker](https://docker.com)

### Setup

**Linux/macOS:**
```bash
./scripts/setup.sh
```

**Windows:**
```cmd
scripts\setup.bat
```

### Manual Setup

1. Start Docker containers:
```bash
docker-compose up -d
```

2. Install dependencies:
```bash
bun install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Push database schema:
```bash
bun run db:push
```

## Development
```bash
bun run dev        # Start all services
bun run dev:api    # API only (port 8787)
bun run dev:web    # Web only (port 3000)
```

## Docker Commands
```bash
bun run docker:up    # Start containers
bun run docker:down  # Stop containers
bun run docker:logs  # View logs
```

## License

<!-- MIT -->
