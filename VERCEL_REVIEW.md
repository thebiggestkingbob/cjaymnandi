# Vercel website walkthrough

Open `https://cjaymnandi.vercel.app/review` after the latest deployment is Ready.

This is the project's production Vercel alias, not an independently configured Vercel Preview deployment. Hostname routing serves the countdown on the custom domain before 18 November 2026 at 00:00 SAST and the working site on Vercel hostnames. Changes still share the same deployment, assets and Production environment variables.

## Start with the live read-only check

Click **Check connection & readiness**. The browser calls a same-origin POST endpoint; Vercel checks its own Supabase API credentials and reads only the API schema. No customer rows are read, no records are inserted and no migrations run. The result reports connection/schema readiness and missing setting names, never key values, provider response bodies or customer data.

The page and API are available only on Vercel/loopback hostnames. This is not an authentication boundary or a privileged admin area: any visitor to the Vercel hostname can see this non-sensitive readiness summary. It cannot change flags, enable collection or manage records. The page is marked noindex.

Connection passing does not prove permissions for submissions. Schema visibility passing does not prove a real booking or signup was saved. A separate controlled live test is still required after privacy approval and server configuration. Email and payments remain explicitly pending.

## Walk through every section

The review page links to the landing page, Music, Archive, Store, Bookings, About, Connect, Support and Privacy. Section links use a validated `?panel=` query to open their overlay directly. Test desktop and mobile. Provider playback must be confirmed in an ordinary browser because the cloud workspace currently blocks Spotify and YouTube.

The next priorities are booking/signup activation (see `SUPABASE_SETUP.md`), who monitors requests, the public support email and privacy approval, followed by email delivery and Yoco payments. Keep purchases disabled until payment verification and private fulfilment have been tested.

No Supabase setting is changed by opening this review page. Results describe only the deployment that handled the request.
