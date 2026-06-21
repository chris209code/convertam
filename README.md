# Convertam — Setup & Deployment Guide

This is written for zero prior coding experience. Follow it top to bottom.

## What's already working

**Runs free, forever, in the visitor's browser (no setup needed):**
Merge PDF, Split PDF, Rotate PDF, Extract PDF Pages, JPG to PDF, PNG to PDF, PDF to JPG, PDF to PNG

**Runs free with no realistic daily ceiling (Google service account, steps below):**
PDF to Word, Word to PDF, Excel to PDF, PowerPoint to PDF

**Needs a CloudConvert key, limited to 10 conversions/day on the free plan (steps below):**
PDF to Excel, PDF to PowerPoint, Compress PDF

**Needs a Gemini API key (steps below):**
Smart AI Converter — photograph a document, get back Word or Excel

---

## Step 0a — Get a free Gemini API key (for the Smart AI Converter)

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account
3. Click **Create API Key**
4. Copy the key — you'll paste it into Vercel in Step 4, alongside the other keys
5. Gemini's free tier has a daily request limit that's generous for testing and early traffic. If you hit it, Google will tell you when in the response — at that point you'd add billing to your Google AI Studio project to keep it running past free limits.

## Step 0b — Set up the free Google Drive conversion engine (for PDF↔Word, Word/Excel/PowerPoint→PDF)

This one has more steps than the others, but it's a one-time setup and it's what gives you the high free daily ceiling.

1. Go to https://console.cloud.google.com and create a new project (any name, e.g. "convertam").
2. In the search bar at the top, search for **Google Drive API** and click **Enable**.
3. In the left sidebar, go to **APIs & Services → Credentials**.
4. Click **+ Create Credentials → Service Account**. Give it any name (e.g. "convertam-converter"). Click through the remaining steps with the defaults — no special role/permission is needed.
5. Once created, click into the new service account → go to the **Keys** tab → **Add Key → Create New Key → JSON**. This downloads a `.json` file to your computer — keep it safe, treat it like a password.
6. Open that downloaded `.json` file in Notepad. You need two values out of it:
   - The value next to `"client_email"` — this goes into Vercel as `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - The value next to `"private_key"` — this is a long value starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----\n`. Copy the **entire thing exactly as it appears**, including the `\n` characters you see in the text — this goes into Vercel as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Step 1 — Get a free CloudConvert API key

1. Go to https://cloudconvert.com and create a free account.
2. Once logged in, go to **Dashboard → API → Keys** (or visit https://cloudconvert.com/dashboard/api/v2/keys).
3. Click **Create New API Key v2**. Give it any name (e.g. "convertam-production").
4. Copy the long key it gives you — you'll paste it into Vercel in Step 4. Keep it secret; treat it like a password.
5. Free accounts get **10 conversions per day** (shared across PDF to Excel, PDF to PowerPoint, and Compress PDF). That's fine for testing — you can add a small one-time credit pack on CloudConvert's site later with no code changes needed, whenever you outgrow it.

## Step 2 — Put this code on GitHub (no terminal needed)

1. Create a free account at https://github.com if you don't have one.
2. Click the **+** icon top-right → **New repository**. Name it `convertam`. Keep it Public or Private, doesn't matter. Click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Drag this entire project folder's contents into the browser window (all the files and folders you see here — `app`, `components`, `lib`, `package.json`, etc.) and click **Commit changes**.

## Step 3 — Connect GitHub to Vercel

1. Go to https://vercel.com and sign up using your GitHub account (this links them automatically).
2. Click **Add New → Project**.
3. Find your `convertam` repository in the list and click **Import**.
4. Vercel will detect it's a Next.js project automatically. Don't change any build settings.

## Step 4 — Add your API keys (without exposing them)

1. Still on the Vercel import screen, expand **Environment Variables**.
2. Add four entries:
   - Name: `CLOUDCONVERT_API_KEY` — Value: *(the key from Step 1)*
   - Name: `GEMINI_API_KEY` — Value: *(the key from Step 0a)*
   - Name: `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Value: *(the client_email from Step 0b)*
   - Name: `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — Value: *(the private_key from Step 0b, pasted exactly as it appears)*
3. Click **Deploy**. Wait about a minute.

Your site is now live at a `*.vercel.app` address. The conversion tools work because all four values live only on Vercel's servers — they never reach a visitor's browser.

If you're adding any of these to an **already-deployed** site (not deploying fresh): go to your Vercel project → **Settings → Environment Variables** → **Add New** → enter the name and value → Save. Then go to the **Deployments** tab and **Redeploy** the latest one so the new variable takes effect.

## Step 5 — Connect convertam.app

1. In your Vercel project, go to **Settings → Domains**.
2. Type `convertam.app` and click **Add**.
3. Vercel will show you 1-2 DNS records to add (usually an `A` record and/or a `CNAME`).
4. Go to wherever you bought the domain (or your current Netlify DNS settings) and add those exact records.
5. DNS changes can take a few minutes to a few hours to take effect. Vercel will show a green checkmark once it sees it.

You can disconnect this from Netlify once it's working on Vercel — they can't both serve the live site at the same time.

## Updating the site later

Any time you (or I, in a future session) want to change something: edit the files, upload the changed ones to the same GitHub repository (GitHub's web uploader will let you replace files), and Vercel automatically redeploys within a minute or two. No separate "publish" step.

## Adding Google AdSense later

You'll need an approved AdSense account first (Google reviews your site before approving — having real, working tools live, like you now do, helps approval). Once approved, I can drop the ad code into specific spots (`app/page.js` for homepage banner, `components/ToolPageClient.js` for tool pages) in a future session.

## Adding Paystack / Flutterwave donations later

Both offer a simple "payment link" option that needs zero backend code — just a button linking out to a hosted payment page. I can wire that into the footer whenever you're ready; just share which provider and the link/key they give you.
