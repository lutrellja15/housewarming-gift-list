# Josh & Triniti's Housewarming Gift List

A polished public gift registry site for GitLab Pages with a private Supabase-backed admin area.

## Stack

- Vite + React + TypeScript
- Supabase Auth, Postgres, and row level security for production data
- GitLab Pages via `.gitlab-ci.yml`
- Vitest and ESLint

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Without Supabase environment variables, the app runs in demo mode using browser `localStorage`. Demo admin login is:

```text
demo@example.com
demo-admin
```

Demo mode is only for local review. Configure Supabase before sharing the production site.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. Create Josh and Triniti as Auth users with email/password.
4. Mark those users as admins. In Supabase SQL, replace the email and run:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email in ('josh@example.com', 'triniti@example.com');
```

5. In GitLab, add CI/CD variables:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The anon key is safe to expose in a frontend app when RLS is enabled. Do not commit service role keys.

## GitLab Pages deployment

1. Create a new GitLab repository.
2. Push this folder to the repository.
3. Add the Supabase CI/CD variables above in GitLab.
4. Push to the default branch. The pipeline runs lint, tests, build, then deploys Pages.
5. The live site URL appears under `Deploy > Pages`.

## Product search and API limitations

Amazon, Walmart, and Wayfair product APIs usually require partner accounts, API keys, or commercial approval. This project avoids unauthorized scraping. The admin screen provides:

- Store search buttons that open Amazon, Walmart, or Wayfair search pages in a new tab.
- A safe product URL capture workflow that detects store, derives a title from the URL, keeps the original purchase link, and lets admins edit title, image URL, price, category, notes, and description before saving.

If official API access is obtained later, add a serverless function or edge function to protect API keys. Do not call private marketplace APIs directly from the browser.

## Visitor flow

Visitors can browse, search, and filter gifts by category, store, price, and status. Clicking purchase options opens a confirmation modal with:

- Yes, reserve this item
- I already purchased this item
- Just take me to the store

Reservations and purchases can include optional name/email, then the store link opens in a new tab.

## Admin flow

Admins can:

- Add custom gifts
- Paste product URLs and edit captured details
- Edit or delete existing gifts
- Reserve, unreserve, and mark purchased
- Track thank-you status
- Review recent activity

## Checks

```bash
npm run lint
npm run test
npm run build
```
