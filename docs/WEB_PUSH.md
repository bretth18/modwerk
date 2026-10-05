# Device push notifications

Push is optional on each device. Members enable bell activity in **Your account → notification settings**. Administrator member accounts enable one alert per new account in **Admin workspace → Accounts**, with a test button for both. Sign-up events never enter member notifications or email digests, and every delivery checks the current administrator role. Key-only administrator sessions cannot grant permanent device subscriptions.

On iPhone/iPad (iOS/iPadOS 16.4+), open Modwerk in Safari, choose **Share → Add to Home Screen**, open the installed icon, sign in, and press **Enable on this device**. Allow notifications when prompted. Home Screen storage/sign-in may be separate from Safari. Supported desktop browsers work without installation.

## Operator setup

1. Run `npm run push:keys` once. This creates the ignored, owner-readable `.push-secrets.json` and prints no secrets. Keep a private backup and reuse the same keys for every deploy.
2. Apply migration `0032_web_push.sql` to local D1 first, then production D1 during the authorized rollout.
3. For local development, copy the three values into ignored `.dev.vars` and set `WEB_PUSH_ENABLED=true`.
4. For production, import the file without printing it:
   `npx wrangler secret bulk .push-secrets.json --config wrangler.worker.jsonc`
5. Production config sets `WEB_PUSH_ENABLED` to `"true"`; install the secrets before deploying the Worker and frontend through the normal, authorized deployment workflow. Set it to `"false"` to pause delivery. Keep registration/privacy settings as configured.
6. Open the website from your iPhone Home Screen, sign in with your administrator member account, enable **Admin sign-up alerts**, and send a test. Verify a controlled email signup and a completed social signup. Enable community push separately if desired.

Do not put the private key in `VITE_*`, Git, build output, logs or chat. Changing the key pair requires devices to enable push again. Delivery is unavailable until the flag and all keys are configured. Local development defaults to disabled; every device and topic still starts off. The manifest and service worker are static assets; the service worker has no fetch handler and does not cache or read firmware.

## Delivery and scope

Database triggers queue an event in the same transaction that stores a bell entry or accepts a new account's rules. Pending social identities do not trigger an alert until onboarding completes. Duplicate registrations, social logins and later rules acceptance do not create repeated signup events. Devices receive only events created while their topic was enabled; there is no historical replay.

A successful API mutation starts a background dispatcher; the minute cron retries work and drains bursts ten deliveries at a time. The five-minute cron retains member welcome emails. The hourly cron retains the existing maintenance and email digest jobs. Each device/event pair has a unique queue entry, a claim lease and stable notification tag. Transient failures back off to at most hourly retries for seven days. Permanent 404/410 endpoints are removed. Device providers retain signup pushes for up to seven days and activity pushes for one day. Device/OS settings and provider outages can delay or prevent presentation; acceptance by a push service cannot prove an iPhone displayed an alert.

Activity follows the bell recipient and GitHub identity rules and excludes read, hidden or removed entries at dispatch. Push topic choices are independent of email settings. Signup alerts contain only the public username, never email or identity-provider profile data. Account deletion removes subscriptions, pending delivery jobs and signup markers; account export lists topic choices and device creation times without push credentials.

Only HTTPS endpoints belonging to Apple's, Google's, Mozilla's or Microsoft's browser push services are accepted. Payloads use RFC 8291 aes128gcm encryption and RFC 8292 VAPID through pinned `@block65/webcrypto-web-push@2.0.0`. Requests prohibit redirects and time out after ten seconds.
