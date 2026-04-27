# Move Nest

Mobile-first collaborative moving checklist MVP built with Next.js App Router,
React, TypeScript, Tailwind CSS, shadcn/ui-style components, and Supabase.

## Milestone 1 Status

Implemented:

- Next.js App Router scaffold with strict TypeScript and Tailwind CSS.
- shadcn/ui-compatible component structure and core primitives.
- Supabase browser/server utilities using `@supabase/ssr`.
- Cookie refresh proxy for Supabase Auth.
- Magic-link login page and `/auth/callback`.
- Protected `/app` shell with mobile bottom navigation.

Milestone 2 will add the Supabase schema, migrations, indexes, and RLS policies.

## Environment

Copy `.env.example` to `.env.local` and fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Checks

```bash
npm run lint
npm run build
npm run test
```
