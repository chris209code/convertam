# Convertam Browser Companion (Future Roadmap — Phase 2/3, not started)

Do not begin development on this. Recorded here on 2026-08-06 per explicit
instruction to archive the idea for later, once Convertam's core roadmap
(Data Workspace, PDF Suite, Forms & Templates, etc.) is stable and has
consistent daily traffic.

## Objective

Build a lightweight browser extension that brings Convertam's most useful
tools directly into the user's workflow.

This is not a standalone product — it's an extension of the Convertam
ecosystem meant to increase daily usage, brand visibility, and traffic back
to Convertam.

The extension should become the fastest way to access Convertam tools
without opening the website first.

## Vision

Instead of users visiting Convertam first, they work normally on Gmail,
LinkedIn, Facebook, X, Reddit, Slack, Notion, Google Docs, or any website —
and whenever they need a quick tool, Convertam is already there. Think
Grammarly, LanguageTool, Honey, or Bitwarden: Convertam becomes a
productivity companion.

## Important principles

- Never inject advertisements.
- Never modify website layouts.
- Never interfere with page functionality.
- Only appear when the user intentionally invokes Convertam.
- Respect user privacy.
- Keep processing local whenever possible.
- Open Convertam only for tools requiring server-side processing.

## Phase 1 — MVP browser extension

**Context menu.** Highlight text, right-click, get a Convertam submenu:
Word Count, Change Case, Clean Text, Remove Line Breaks, Slug Generator,
Morse Code, Binary, ASCII, URL Encode, URL Decode, QR Generator, Copy
Result. All of these run locally inside the extension — no server calls.

**Popup launcher.** Clicking the Convertam icon opens a searchable
launcher (Resume Builder, Invoice Generator, QR Code, JSON Formatter,
Regex Tester, Password Generator, Currency Converter, Write on PDF, PDF
Compressor, Image Compressor, etc.). Selecting a cloud-powered tool opens
the corresponding Convertam page.

## Phase 2 — Smart floating toolbar

Whenever users highlight text, a small floating Convertam button appears
(similar to Grammarly or DeepL): Copy, Rewrite, Summarize, Translate,
Uppercase, Morse, Slug, Markdown, ASCII, Binary. Only appears on text
selection; disappears immediately after use.

## Phase 3 — Deep Convertam integration

Recognize common workflows:

- **LinkedIn** — highlight a job description, offer Extract Skills, Build
  Resume, Generate Cover Letter, Save to Convertam.
- **Gmail** — highlight an address, tracking number, or order info, offer
  Generate QR, Convert to PDF, Copy Clean Text.
- **Any web page** — highlight a table, offer Convert to CSV, Convert to
  JSON, Open Data Workspace.
- **Code blocks** — offer Beautify, Minify, Copy, JSON Formatter, SQL
  Formatter.

## Convertam cloud tools (redirect, don't run locally)

Some tools intentionally redirect to Convertam because they need real
processing: Resume Builder, AI Resume Import, Cover Letter Generator,
Write on PDF, Annotate PDF, Image Studio, Data Workspace, OCR, PDF Tools.
E.g. an "Open in Convertam →" link to `https://convertam.app/write-on-pdf`.

## Local-only tools (run entirely inside the extension)

Word Count, Character Count, Change Case, Slug Generator, Morse Code,
Binary, ASCII, URL Encoder, URL Decoder, Base64, Password Generator, UUID
Generator.

## Keyboard shortcut (future)

`Ctrl+Shift+C` opens a Convertam command palette — type `pdf`, `resume`,
`invoice`, `morse`, `qr`, `regex`, `json`, etc. to launch a tool instantly.

## Technical stack

- Platform: Chrome Extension (Manifest V3), with future support for Edge,
  Brave, Opera, and later Firefox.
- Core components: Popup UI, Context Menu, Background Service Worker,
  Content Scripts, optional Floating Toolbar, Settings Page.

## Privacy

- Never collect browsing history.
- Never monitor user activity.
- Only access selected text when the user explicitly invokes Convertam.
- Clearly explain permissions during installation.

Privacy should become one of Convertam's strongest selling points.

## Prerequisites before starting

- Stable Convertam platform.
- Mature tool ecosystem.
- Consistent daily traffic.
- Core roadmap completed (Data Workspace, PDF Suite, Forms & Templates,
  etc.).

## Long-term goal

The Browser Companion should become the fastest way to access Convertam
anywhere on the web — instead of asking users to "go to Convertam,"
Convertam should already be where they're working. Its purpose is to
increase convenience, brand awareness, user retention, and traffic back to
the main platform while staying privacy-first and non-intrusive.
