# Connect Supabase

The code includes a server-only public-role client in `lib/supabase/server.ts`.
No tables, permissions, customer records or live integrations have been created yet.
The website continues to work without Supabase configuration.

1. Create or select the client's project at https://supabase.com/dashboard.
2. In project settings, find the project URL and the **publishable** API key (a legacy anon key also works). Do not use the secret or service-role key.
3. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the Vercel project's environment variables for the required environments. Redeploy after saving them. These server-only variable names do not need a `NEXT_PUBLIC_` prefix.
4. For local development, copy `.env.example` to `.env.local` and fill in the values. This file is ignored by Git. Cloud workspace configuration must be set separately from Vercel.
5. Allow the project's hostname in cloud network settings if it is blocked, then run `npm run supabase:check`.

The connection check makes a read-only request to Supabase's Data API and prints no keys or database contents. A passing check verifies API connectivity, not application features or table permissions.

Decide the first workflow before creating its schema: mailing-list/booking enquiries, managed archive content, or purchase records/download fulfilment. Enable Row Level Security and add narrowly scoped policies for the chosen workflow. Do not make customer data publicly readable. Yoco payment verification remains a separate server integration; adding Supabase does not enable payments.

## Selected first workflow: mailing list and bookings

Create the project under the client's organisation, name it `cjaymnandi`, choose a region close to the audience (South Africa if available), and generate/save a strong database password in a password manager. The Free plan is sufficient to start development; review current plan limits before launch.

After the project finishes provisioning, run `supabase/migrations/202611100001_contacts.sql` once in its SQL Editor. This creates separate signup and enquiry tables with Row Level Security enabled and no public read/write permissions. The migration has not been applied or validated against a live database yet.

The future submission API requires a Supabase server secret key (or legacy service-role key). Store it only in secure server environment settings, never in chat, browser code, or a `NEXT_PUBLIC_` variable. Submission validation, spam controls, privacy/consent wording and end-to-end verification must be completed before enabling public forms. These tables store requests; sending newsletters or enquiry notification emails needs a separate email service.
