# @quaver/backend

Convex backend for the Quaver platform. Provides serverless functions for authentication, project management, messaging, and sandbox orchestration.

## Features

- **Authentication** - Clerk integration with JWT validation and webhook sync
- **Projects** - CRUD operations with Daytona sandbox lifecycle management
- **Messages** - Conversation storage with reasoning/extended content support
- **Payments** - Stripe integration via @convex-dev/stripe

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Deploy to production
bun run deploy
```

## Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
CONVEX_URL=https://your-deployment.convex.cloud

# Clerk Authentication
CLERK_JWT_ISSUER_DOMAIN=https://your-clerk-domain.clerk.accounts.dev
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Daytona Sandbox
DAYTONA_API_KEY=dtn_...
```

## Schema

### Tables

| Table | Description | Indexes |
|-------|-------------|---------|
| `users` | Clerk user records | `by_clerk_id` |
| `projects` | User projects with sandbox refs | `by_user`, `by_sandbox_id`, `by_status` |
| `messages` | Conversation history | `by_project` |

### Project Status Lifecycle

```
creating → generating → ready ⇄ stopped → archived
                          ↓
                       failed
```

## Modules

### Auth (`convex/auth/`)

```typescript
// Queries
userLoginStatus()     // Check authentication status
currentUser()         // Get authenticated user

// Actions
deleteUser()          // Delete current user and Clerk account
```

### Projects (`convex/projects/`)

```typescript
// Queries
listForCurrentUser()  // Get user's projects
getById(projectId)    // Get single project
getBySandboxId(id)    // Find project by sandbox

// Mutations
rename(projectId, name)  // Rename project
remove(projectId)        // Delete project (cascades to messages + sandbox)

// Actions
create(name, prompt)  // Create project with Daytona sandbox
```

### Messages (`convex/messages/`)

```typescript
// Queries
listByProject(projectId)  // Get conversation history

// Mutations
insert(projectId, role, content, parts?)  // Add message
```

Message parts support extended content:

```typescript
type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; duration?: number };
```

## HTTP Endpoints

### POST `/clerk-users-webhook`

Handles Clerk authentication webhooks with Svix signature verification:

- `user.created` - Sync new user to Convex
- `user.updated` - Update user record
- `user.deleted` - Remove user record

## Dependencies

| Package | Purpose |
|---------|---------|
| `convex` | Serverless backend platform |
| `@convex-dev/stripe` | Stripe payment integration |
| `svix` | Webhook signature validation |
| `@quaver/sandbox` | Daytona sandbox API client |

## Structure

```
convex/
├── auth/
│   ├── tables.ts      # User schema
│   └── users.ts       # Auth queries/mutations/actions
├── messages/
│   ├── tables.ts      # Message schema
│   ├── queries.ts     # List messages
│   └── mutations.ts   # Insert messages
├── projects/
│   ├── tables.ts      # Project schema
│   ├── queries.ts     # List/get projects
│   ├── mutations.ts   # CRUD operations
│   └── actions.ts     # Sandbox management
├── lib/
│   └── daytona.ts     # Daytona client init
├── auth.config.ts     # Clerk JWT config
├── convex.config.ts   # Convex + Stripe config
├── http.ts            # Webhook endpoints
└── schema.ts          # Database schema
```
