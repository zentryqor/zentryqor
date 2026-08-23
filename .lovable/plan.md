# Make the signed-in app work again after the Appwrite login switch

## What's actually broken

Sign-in and sign-up now create an **Appwrite** session. But every authenticated
feature still asks the **old hosted backend** to prove who you are:

- 27 server-side modules (credits, AI chat, chat history, assets, library,
  billing/payments, referrals, YouTube, caption tools, stats, settings, admin)
  require an old-backend access token.
- The client middleware that attaches that token reads it from the old backend's
  session, which no longer exists after an Appwrite login — so it sends nothing
  and every request is rejected as unauthorized.
- `src/hooks/use-subscription.ts` still reads plan/credit data (and realtime
  updates) straight from the old backend, so the plan badge and credit balance
  render as "not signed in".

Sign-out and `useAuth` are already on Appwrite — those parts of the report are
out of date.

On top of that, the old hosted database is currently **paused**, so even the old
path cannot succeed right now.

## The decision this needs

This is not a small patch: it's the bridge between phase 1 (auth) and phase 2
(data). Two viable routes:

**Route A — Bridge now (recommended, smaller)**
Keep all data on the existing backend for now, and make the server accept the
Appwrite identity instead of the old session token.

1. Add Appwrite JWT verification middleware (server-side): read the bearer
   token, verify it against Appwrite, resolve the Appwrite user id.
2. Map each Appwrite user to a row in the existing database (a link table
   `appwrite_user_id -> internal user id`, created on first authenticated call).
3. Swap the 27 modules' middleware from the old auth middleware to the new one,
   using the mapped internal user id. Data access runs with the trusted server
   key, scoped in code by that id.
4. Replace the client token attacher so it sends a fresh Appwrite JWT.
5. Rewrite `use-subscription.ts` to read plan/credits through a server function
   instead of querying the database directly from the browser (the browser no
   longer has an old-backend session, and realtime needs one).

Result: everyone can sign in and use every feature again, existing rows stay
where they are, and phase 2 can move tables over gradually behind these
functions.

**Route B — Full phase 2 first**
Move profiles, credits, chat, assets, library, poster, push into Appwrite
collections and rewrite all 27 modules against Appwrite. Correct end state, but
it is a multi-stage rebuild and the app stays broken for signed-in users until a
large part of it lands.

## Prerequisite

The old hosted database must be resumed before either route can be built or
verified — every authenticated read still lands there, and I cannot test a single
signed-in page while it is paused.

## Technical notes

- New files: `src/lib/appwrite-auth-middleware.server.ts` (JWT verification via
  Appwrite `/account` with the user JWT), `src/lib/appwrite-auth-attacher.ts`
  (client middleware minting a JWT per call, cached until near expiry).
- `src/start.ts` `functionMiddleware` swaps the old attacher for the new one.
- Identity mapping lives in a single helper so the 27 modules change one import
  and one context field (`context.userId`) each.
- `src/routes/api/public/auth/signin.ts` becomes dead once Appwrite owns
  password sign-in; remove it and its lockout/rate-limit RPC calls in the same
  pass, or keep Appwrite's own throttling as the replacement.
