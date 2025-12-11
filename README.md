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
│   ├── api/           # Hono + TypeScript backend (auth, debates, transcription)
│   ├── web/           # Hono JSX landing page (cluely-style dark theme)
│
├── packages/
│   └── db/            # Drizzle ORM + PostgreSQL schema
├── scripts/
│   ├── setup.sh       # Unix setup
│   └── setup.bat      # Windows setup
├── docker-compose.yml # PostgreSQL + Redis
└── .env.example
```

**Authentication Flow Diagram:**
```
┌─────────────────────────────────────────────────────────────┐
│                        SIGNUP FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                           Server                    │
│    │                                │                       │
│    │  POST /api/auth/signup         │                       │
│    │  {email, username, password}   │                       │
│    │ ──────────────────────────────>│                       │
│    │                                │                       │
│    │                         Validate with Zod              │
│    │                         Check email unique             │
│    │                         Check username unique          │
│    │                         Hash password                  │
│    │                         Save user                      │
│    │                         Generate token                 │
│    │                                │                       │
│    │  {user, token}                 │                       │
│    │ <──────────────────────────────│                       │
│    │                                │                       │
│    │  Store token in localStorage   │                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATED REQUEST                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                           Server                    │
│    │                                │                       │
│    │  GET /api/debates              │                       │
│    │  Header: Authorization:        │                       │
│    │          Bearer tok_xxxxx      │                       │
│    │ ──────────────────────────────>│                       │
│    │                                │                       │
│    │                         Extract token                  │
│    │                         Look up in sessions            │
│    │                         Find user                      │
│    │                         Return debates                 │
│    │                                │                       │
│    │  {debates: [...]}              │                       │
│    │ <──────────────────────────────│                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
**How the Middleware Flow Works:**
```
Request: POST /api/auth/signup
         Body: { "email": "bad", "password": "123" }
         
         ↓
         
Middleware: validateBody(signupSchema)
         ↓
         Tries to validate...
         ↓
         FAILS! "bad" is not valid email, "123" is too short
         ↓
         Returns 400 error, route handler NEVER runs
         
─────────────────────────────────────────────────────────

Request: POST /api/auth/signup  
         Body: { "email": "alice@example.com", "username": "alice", "password": "password123" }
         
         ↓
         
Middleware: validateBody(signupSchema)
         ↓
         Validates successfully!
         ↓
         Stores data in c.set("validatedBody", {...})
         ↓
         Calls next()
         ↓
         
Route Handler runs, accesses c.get("validatedBody")
```
**Architecture Diagram(Aligned with Desktop APP)**
```
┌─────────────────────────────────────────────────────────────────┐
│                        discourse.ai API                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────────────┐ │
│  │   Hono HTTP Server  │       │     Socket.IO Server        │ │
│  │   (REST API)        │       │     (Real-time Events)      │ │
│  ├─────────────────────┤       ├─────────────────────────────┤ │
│  │ • /api/auth         │       │ • join-room                 │ │
│  │ • /api/users        │       │ • offer/answer/ice-candidate│ │
│  │ • /api/debates      │       │ • transcription-data        │ │
│  │ • /api/rooms        │       │ • chat-message              │ │
│  │ • /api/waitlist     │       │ • participant-joined/left   │ │
│  └─────────────────────┘       └─────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL Database                    │  │
│  │  users | debates | rooms | participants | messages | ...  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

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
