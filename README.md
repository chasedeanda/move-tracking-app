# Move Nest

Mobile-first collaborative moving checklist MVP for households coordinating a
move. It covers workspace setup, seeded rooms and starter tasks, shared task
management, dashboard KPIs, room progress, people workload, move-day checklist,
and owner-managed collaborators.

## Tech Stack

- Next.js App Router
- React
- TypeScript strict
- Tailwind CSS
- shadcn/ui-style local primitives
- Supabase Auth, Postgres, and Row Level Security
- Zod validation
- Vitest

## Requirements

- Node.js 20+
- npm
- Supabase project
- Supabase CLI for database migrations

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Only public browser-safe Supabase values are required by the app. Do not commit
service-role keys, access tokens, or database passwords.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app on port 4000:

```bash
npm run dev -- --port 4000
```

Open:

```text
http://127.0.0.1:4000
```

## Supabase Setup

Link a Supabase project:

```bash
npx supabase link --project-ref your-project-ref
```

Apply migrations:

```bash
npx supabase db push
```

The migrations create:

- `profiles`
- `workspaces`
- `workspace_members`
- `rooms`
- `tasks`
- `subtasks`
- `activity_log`
- enums, indexes, triggers, helper functions, RPCs, and RLS policies

### Auth Redirects

For local magic-link auth, configure Supabase Auth URLs:

- Site URL: `http://127.0.0.1:4000`
- Redirect URL: `http://127.0.0.1:4000/auth/callback`

The app uses `/auth/callback` to exchange Supabase magic-link tokens and then
redirects into `/app`.

## Security Model

All workspace data is scoped by membership in Supabase RLS. The frontend is not
trusted as the authorization boundary.

- Members can read workspace data only for workspaces they belong to.
- Members can create, update, complete, assign, and delete tasks in their workspace.
- Owners can update workspace settings and manage membership.
- Membership management uses an owner-only RPC for adding existing signed-in
  users by email.
- Protected app routes call `supabase.auth.getUser()` in the app layout and
  redirect unauthenticated users to `/login`.

## Seed Behavior

Workspace creation can seed starter data through
`create_workspace_with_seed(...)`.

Seeded rooms:

- Entry / Front Area
- Living Room
- Kitchen
- Dining Area
- Primary Bedroom
- Kids Room
- Bathroom
- Garage / Storage
- Yard / Outdoor
- Utilities / Admin
- Move Day
- Post-Move

The starter template creates 29 tasks across packing, cleaning, utilities,
admin, repairs, donation, move-day, and post-move categories.

## App Routes

- `/`
- `/login`
- `/auth/callback`
- `/app`
- `/app/workspaces/new`
- `/app/workspaces/[workspaceId]`
- `/app/workspaces/[workspaceId]/tasks`
- `/app/workspaces/[workspaceId]/rooms`
- `/app/workspaces/[workspaceId]/rooms/[roomId]`
- `/app/workspaces/[workspaceId]/move-day`
- `/app/workspaces/[workspaceId]/people`
- `/app/workspaces/[workspaceId]/settings`

## Testing

Run the test suite:

```bash
npm run test
```

Current coverage includes:

- task sorting helpers
- dashboard KPI helpers
- task create/update/complete mutation payload flow
- Supabase session-cookie parsing
- migration-level RLS/access-control checks
- protected app route check in the app layout

Run lint and production build:

```bash
npm run lint
npm run build
```

## Vercel Deployment

1. Push this repository to GitHub.
2. Create a new Vercel project from the repository.
3. Add environment variables in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

4. In Supabase Auth settings, add production URLs:

```text
https://your-vercel-domain.vercel.app
https://your-vercel-domain.vercel.app/auth/callback
```

5. Deploy from Vercel.

Before production use, rotate any setup credentials that were shared during
development and keep only the public publishable key in frontend environments.

## Useful Commands

```bash
npm run dev -- --port 4000
npm run lint
npm run test
npm run build
npx supabase db push
```
