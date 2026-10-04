# BondFin Collective

BondFin Collective is a Next.js application backed by Supabase authentication and member data.

## Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Never expose or commit `SUPABASE_SERVICE_ROLE_KEY`. It is used only by the administrative scripts in `scripts/`.

## Validation

```bash
npm run lint
npm run build
npm audit
```

## Security Requirements

- Review and enable Supabase Row Level Security for every application table.
- Test anonymous, member, and administrative access separately.
- Keep service-role credentials out of browser code, logs, Git, and deployment previews.
- Review `git diff --cached` before committing.

## Row Level Security

The repository includes `supabase/migrations/202609160001_enable_users_rls.sql`.
Run it in the Supabase SQL Editor, then run `supabase/verify_rls.sql` to confirm
that anonymous users cannot read profiles and authenticated users can read only
their own profile. The current database does not contain `public.members`, so
the members table schema and access model must be decided before adding a
members RLS policy.


## Test Update
This is a test change to confirm GitHub Desktop works.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
