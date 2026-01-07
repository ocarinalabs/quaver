# @quaver/app

Next.js web application for the Quaver platform. Provides a chat interface for creating and managing AI agent benchmarks in isolated sandbox environments.

## Features

- **Authentication** - Clerk-based auth with sign-in/sign-up flows
- **Project Management** - Create, list, and manage benchmark projects
- **AI Chat Interface** - Real-time chat with Claude for benchmark generation
- **Sandbox Integration** - Live code execution in Daytona sandboxes
- **Real-time Sync** - Convex-powered data synchronization

## Quick Start

```bash
# Install dependencies (from monorepo root)
bun install

# Run development server
bun run dev

# Build for production
bun run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# AI Gateway
AI_GATEWAY_API_KEY=vck_...

# Daytona Sandbox
DAYTONA_API_KEY=dtn_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/projects` | Project list |
| `/projects/[id]` | Project detail with chat interface |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@quaver/backend` | Convex backend functions |
| `@quaver/sandbox` | Daytona sandbox client |
| `@quaver/ui` | Shared UI components |
| `@clerk/nextjs` | Authentication |
| `convex` | Real-time database |
| `ai` | Vercel AI SDK |

## Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home page
│   ├── sign-in/             # Clerk sign-in
│   ├── sign-up/             # Clerk sign-up
│   ├── projects/
│   │   ├── page.tsx         # Project list
│   │   └── [id]/page.tsx    # Project detail
│   └── api/
│       └── chat/route.ts    # AI chat endpoint
├── components/
│   ├── convex-provider.tsx  # Convex client setup
│   └── project/             # Project components
├── lib/
│   └── model.ts             # AI model configuration
└── contexts/                # React contexts
```

## Deployment

Deployed to Vercel via Turborepo:

```bash
# From monorepo root
bunx vercel deploy --prod
```

See [CI/CD documentation](/.github/workflows/ci.yml) for automated deployment setup.
