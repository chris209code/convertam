# Convertam — Setup & Deployment Guide

This is written for zero prior coding experience. Follow it top to bottom.

## What's already working

**Runs free, forever, in the visitor's browser (no setup needed):**
Merge PDF, Split PDF, Rotate PDF, Extract PDF Pages, JPG to PDF, PNG to PDF, PDF to JPG, PDF to PNG

**Needs one free API key (steps below):**
PDF to Word, Word to PDF, PDF to Excel, Excel to PDF, PDF to PowerPoint, PowerPoint to PDF

**Needs a Gemini API key (steps below):**
Smart AI Converter — photograph a document, get back Word or Excel

**Not built yet (shows a "coming soon" page):**
Compress PDF

---

## Step 0 — Get a free Gemini API key (for the Smart AI Converter)

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account
3. Click **Create API Key**
4. Copy the key — you'll paste it into Vercel in Step 4, alongside the CloudConvert key
5. Gemini's free tier has a daily request limit that's generous for testing and early traffic. If you hit it, Google will tell you when in the response — at that point you'd add billing to your Google AI Studio project to keep it running past free limits.

## Step 1 — Get a free CloudConvert API key

1. Go to https://cloudconvert.com and create a free account.
2. Once logged in, go to **Dashboard → API → Keys** (or visit https://cloudconvert.com/dashboard/api/v2/keys).
3. Click **Create New API Key v2**. Give it any name (e.g. "convertam-production").
4. Copy the long key it gives you — you'll paste it into Vercel in Step 4. Keep it secret; treat it like a password.
5. Free accounts get **25 conversions per day**. That's fine for testing and early traffic — you'll get an email from CloudConvert with upgrade options once you outgrow it.

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
2. Add two entries:
   - Name: `CLOUDCONVERT_API_KEY` — Value: *(the key from Step 1)*
   - Name: `GEMINI_API_KEY` — Value: *(the key from Step 0)*
3. Click **Deploy**. Wait about a minute.

Your site is now live at a `*.vercel.app` address. The conversion tools work because both keys live only on Vercel's servers — they never reach a visitor's browser.

If you're adding the Gemini key to an **already-deployed** site (not deploying fresh): go to your Vercel project → **Settings → Environment Variables** → **Add New** → enter `GEMINI_API_KEY` and its value → Save. Then go to the **Deployments** tab and **Redeploy** the latest one so the new variable takes effect.

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
