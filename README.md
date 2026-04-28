# Move Nest

Mobile-first collaborative moving checklist MVP built with Next.js App Router,
React, TypeScript, Tailwind CSS, shadcn/ui-style components, and Supabase.

## Milestone Status

Implemented:

- Next.js App Router scaffold with strict TypeScript and Tailwind CSS.
- shadcn/ui-compatible component structure and core primitives.
- Supabase browser/server utilities using `@supabase/ssr`.
- Cookie refresh proxy for Supabase Auth.
- Magic-link login page and `/auth/callback`.
- Protected `/app` shell with mobile bottom navigation.
- Supabase migration for profiles, workspaces, members, rooms, tasks, subtasks,
  activity log, indexes, helper functions, and RLS policies.

Milestone 3 will add workspace creation and starter template seeding in the app.

## Environment

Copy `.env.example` to `.env.local` and fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

## Local Development

```bash
npm install
npm run dev -- --port 4000
```

Open http://localhost:4000.

## Database

Migration files live in `supabase/migrations`.

Apply them with the Supabase CLI after linking a project:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

The initial migration enables RLS on all public tables. Workspace-scoped data is
readable and mutable only when `auth.uid()` is a member of that workspace.
Workspace settings and membership management are owner-only.

## Checks

```bash
npm run lint
npm run build
npm run test
```
