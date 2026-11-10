# C.JayMnandi — LAX! Experience

Official artist website project. Development starts with an immersive, single-stage LAX! visualizer experience.

## Approved creative direction
- The landing video remains the background of the **entire** website experience; supporting Music, Store, Bookings, About, Mailer and WhatsApp experiences appear as overlays, not separate white pages.
- Use **one exact green sampled from the supplied LAX! EP cover** as the only green; no green variants. Sunflower yellow is an accent for hover, not a filled primary button.
- On video/imagery, CTAs are transparent with white border and text. On solid green, use white/green buttons; white-to-yellow hover is allowed.
- Loop the supplied `ReelAudio-11318.mp3`, with sound toggle and browser-autoplay-safe user activation. Video and audio are separate coordinated media layers.
- The primary CTA is **BUY LAX!**: fixed price (amount pending), guest checkout with Yoco, payment verification on server, secure digital fulfilment. Mailing/WhatsApp opt-ins optional and skippable.
- Respect reduced motion, mobile data and media loading performance.
- Artist name must always be spelled **C.JayMnandi**.

## Artist context
Kamogelo “C.JayMnandi” Mkhwebane is from Stinkwater, Hammanskraal. His creative persona is “Jupiter Vibez.” Official Spotify: https://open.spotify.com/artist/5vvHnvQWm6Wlgq07j79vni

## Development
Build in Codex using Next.js/TypeScript. First milestone: responsive full-screen video, persistent nav and purchase CTA, accessible overlays, audio loop and controls. Follow with checkout UI and server-side Yoco integration after credentials and fixed price are supplied. Never commit credentials or private customer information.

## Assets
Use the user-supplied LAX! visualizer, artwork and audio. These media files have not yet been committed to this repository; do not replace them with fabricated artist portraits or music.

## Run the website

Requires Node.js 20.9 or newer (validated with Node.js 24).

```sh
npm ci
npm run dev
```

For production validation, run `npm run build` and `npm run typecheck`.
Run the production server with `npm start`.

Vercel: select the Next.js framework preset, repository root directory, and default build/output settings. No environment variables are required for this preview. Checkout, mailing-list collection and WhatsApp remain unavailable until their details and secure integrations are provided.

The client handover checklist is available as `CLIENT_CONTENT_REQUEST.html`. Media processing and placement are documented in `public/media-readme.txt`. The site uses album green `#005028`, Helvetica-first typography, and the supplied visualizer with a separate, synchronized audio loop. Audio starts only on user activation. Checkout remains disabled until price, fulfilment and Yoco credentials are configured.

## Contact and support preparation

Booking and mailing-list forms, a Support panel, a draft `/privacy` page and a private submission API are implemented behind activation flags. Forms default to disabled. Read `SUPABASE_SETUP.md` for migrations, server-key requirements, review flags and activation tests. `SITE_READINESS.html` records the current end-to-end audit and remaining launch requirements. Do not enable data collection until setup and privacy review are complete.

Run `npm test` for contact validation and local database tests, and `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` for the local browser journey. These do not prove live Supabase or third-party provider availability.

## Custom-domain countdown

`cjaymnandi.co.za` and `www.cjaymnandi.co.za` display the animated countdown until Friday, 13 November 2026 at 12:00 SAST. Vercel hostnames retain the main site for review. The schedule is isolated in `lib/launch/schedule.ts`; see `DOMAIN_LAUNCH.md` for routing and DNS details. No payment or contact feature is enabled by this countdown.
