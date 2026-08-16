'use client';

// Bespoke Media Workspace landing page — deliberately NOT built on top of
// CategoryLandingClient (the generic hub template shared by PDF Tools,
// Business, Image Tools, etc.). Media Workspace's own tools are few but
// deep (an actual multi-track video editor, not a single-purpose
// converter), so a flat "grid of equally-sized cards" undersells it —
// this groups by user INTENT instead ("what do you want to do?"), the way
// a real product landing page would, while still linking to exactly the
// same real tool routes. Every feature chip below names something that
// genuinely exists in the linked tool today — see each tool's own
// page.js for the full feature list; nothing here is aspirational.
import { useState } from 'react';
import Link from 'next/link';

const VIDEO_TOOLS = [
  {
    slug: 'video-editor',
    href: '/data-tools/video-editor',
    icon: '🎬',
    title: 'Video Editor',
    desc: 'Edit, compose and export videos.',
    chips: ['Trim', 'Split', 'Join', 'PIP', 'Split Screen', 'Overlays'],
    cta: 'Open Editor',
  },
  {
    slug: 'video-transcriber',
    href: '/data-tools/video-studio',
    icon: '🎙️',
    title: 'Video Transcriber',
    desc: 'Turn a video’s speech into editable text.',
    chips: ['Transcribe', 'Edit', 'SRT', 'VTT', 'TXT'],
    cta: 'Transcribe Video',
  },
  {
    slug: 'caption-maker',
    href: '/data-tools/video-studio',
    icon: '💬',
    title: 'Caption Maker',
    desc: 'Burn real subtitles directly into your footage.',
    chips: ['Auto Captions', 'SRT', 'VTT', 'Burn-in'],
    cta: 'Create Captions',
  },
];

const AUDIO_TOOLS = [
  {
    slug: 'audio-studio',
    href: '/data-tools/audio-studio',
    icon: '🎧',
    title: 'Audio Studio',
    desc: 'Edit, transcribe and caption audio.',
    chips: ['Waveform', 'Transcription', 'SRT', 'VTT'],
    cta: 'Open Audio Studio',
  },
  {
    slug: 'audio-extractor',
    href: '/data-tools/video-studio',
    icon: '🔊',
    title: 'Audio Extractor',
    desc: 'Pull the audio track out of any video.',
    chips: ['WAV'],
    cta: 'Extract Audio',
  },
];

// Small format-badge shortcuts — each links to whichever real tool
// actually produces that file, not a standalone converter (this app has
// no generic SRT<->VTT or media converter tool, so this section doesn't
// pretend one exists).
const QUICK_FORMATS = [
  { label: 'SRT', href: '/data-tools/video-studio', title: 'Export SRT captions — Video Studio' },
  { label: 'VTT', href: '/data-tools/video-studio', title: 'Export VTT captions — Video Studio' },
  { label: 'TXT', href: '/data-tools/audio-studio', title: 'Export a plain-text transcript — Audio Studio' },
  { label: 'WAV', href: '/data-tools/video-studio', title: 'Extract audio as WAV — Video Studio' },
  { label: 'MP4', href: '/data-tools/video-editor', title: 'Export an edited MP4 — Video Editor' },
];

const WORKFLOW_STEPS = [
  { icon: '⬆️', label: 'Upload', note: 'Video or audio, straight from your device' },
  { icon: '✂️', label: 'Edit', note: 'Trim, split, compose in Video Editor' },
  { icon: '📝', label: 'Transcribe', note: 'Speech to editable text' },
  { icon: '💬', label: 'Edit captions', note: 'Fix up the transcript, style stays consistent' },
  { icon: '🎛️', label: 'Compose', note: 'PIP, split-screen, overlays, cutout' },
  { icon: '⬇️', label: 'Export', note: 'A real file, rendered on your device' },
];

const FAQS = [
  { q: 'Do I need to install anything to edit video?', a: 'No — Video Editor, Video Studio, and Audio Studio all run entirely in your browser using a self-hosted video engine. There’s nothing to install and no login required.' },
  { q: 'Is my audio or video uploaded to a server?', a: 'Editing, trimming, composing, and caption burn-in all happen locally on your device — the file itself is never uploaded. The one exception is transcription: when you ask for a transcript, the audio is sent for processing and is not stored afterward.' },
  { q: 'Can I combine two videos into a split-screen or picture-in-picture layout?', a: 'Yes — Video Editor supports side-by-side, top/bottom, and picture-in-picture (video-call style) composition from any number of video or image overlays, with draggable positioning and real MP4 export.' },
  { q: 'Can Video Editor remove a person’s background automatically?', a: 'Yes — Person Cutout uses an on-device machine learning model to isolate a person from their background on a picture-in-picture overlay, no green screen needed, live in the preview and in the export.' },
  { q: 'Can I move work between these tools?', a: 'Video Studio’s Extract Audio can hand the extracted WAV straight to Audio Studio without a manual download-and-reupload. Video Editor’s own Auto Captions and Video Studio’s transcription both work in one step within their own tool.' },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

function ToolCard({ tool }) {
  return (
    <Link href={tool.href} className="mw-card">
      <span className="mw-card-icon" aria-hidden="true">{tool.icon}</span>
      <div className="mw-card-body">
        <div className="mw-card-title">{tool.title}</div>
        <p className="mw-card-desc">{tool.desc}</p>
        <div className="mw-card-chips">
          {tool.chips.map((c) => <span key={c} className="mw-chip">{c}</span>)}
        </div>
      </div>
      <span className="mw-card-cta">{tool.cta} <span aria-hidden="true">→</span></span>
    </Link>
  );
}

export default function MediaWorkspaceLanding({ relatedCategories }) {
  const [mode, setMode] = useState('video'); // 'video' | 'audio' — which group gets top billing

  return (
    <div className="mw-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ---- Hero ---- */}
      <section className="mw-hero">
        <div className="mw-hero-text">
          <p className="mw-eyebrow">Media Workspace</p>
          <h1 className="mw-h1">Media Workspace</h1>
          <p className="mw-sub">Edit, transcribe, caption, convert and compose audio &amp; video — privately in your browser.</p>
          <div className="mw-trust">
            <span className="mw-trust-item">✓ Local processing</span>
            <span className="mw-trust-item">✓ No file storage</span>
            <span className="mw-trust-item">✓ Private &amp; secure</span>
          </div>
          <p className="mw-trust-note">Editing, composition, and export run entirely on your device. The one exception is transcription: audio is sent for that single request and never stored afterward.</p>
          <div className="mw-switch" role="tablist" aria-label="Workspace focus">
            <button type="button" role="tab" aria-selected={mode === 'video'} className={`mw-switch-btn${mode === 'video' ? ' mw-switch-btn-active' : ''}`} onClick={() => setMode('video')}>Video</button>
            <button type="button" role="tab" aria-selected={mode === 'audio'} className={`mw-switch-btn${mode === 'audio' ? ' mw-switch-btn-active' : ''}`} onClick={() => setMode('audio')}>Audio</button>
          </div>
        </div>
        <div className="mw-hero-art" aria-hidden="true">
          <div className="mw-laptop">
            <div className="mw-laptop-screen">
              <div className="mw-laptop-bar">
                <span /><span /><span />
              </div>
              <div className="mw-laptop-editor">
                <div className="mw-laptop-preview">
                  <div className="mw-laptop-pip" />
                </div>
                <div className="mw-laptop-track" />
                <div className="mw-laptop-track mw-laptop-track-short" />
              </div>
            </div>
            <div className="mw-laptop-base" />
          </div>
          <div className="mw-floaty mw-floaty-1">▶ Trim</div>
          <div className="mw-floaty mw-floaty-2">🎙️ Transcribing…</div>
          <div className="mw-floaty mw-floaty-3">SRT · VTT</div>
        </div>
      </section>

      {/* ---- What do you want to do? ---- */}
      <section className="mw-section">
        <h2 className="mw-h2">What do you want to do?</h2>
        <div className={`mw-groups${mode === 'audio' ? ' mw-groups-audio-first' : ''}`}>
          <div className="mw-group">
            <h3 className="mw-group-title"><span className="mw-group-dot mw-dot-video" />Video Tools</h3>
            <div className="mw-card-grid">
              {VIDEO_TOOLS.map((t) => <ToolCard key={t.slug} tool={t} />)}
            </div>
          </div>
          <div className="mw-group">
            <h3 className="mw-group-title"><span className="mw-group-dot mw-dot-audio" />Audio Tools</h3>
            <div className="mw-card-grid mw-card-grid-2col">
              {AUDIO_TOOLS.map((t) => <ToolCard key={t.slug} tool={t} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Quick formats ---- */}
      <section className="mw-section mw-quick">
        <h2 className="mw-h3">Quick access by format</h2>
        <div className="mw-quick-row">
          {QUICK_FORMATS.map((f) => (
            <Link key={f.label + f.href} href={f.href} title={f.title} className="mw-quick-chip">{f.label}</Link>
          ))}
        </div>
      </section>

      {/* ---- Workflow ---- */}
      <section className="mw-section">
        <h2 className="mw-h2">Your media workflow</h2>
        <p className="mw-workflow-sub">These tools are built to work together — most steps happen within one tool; Video Studio’s Extract Audio can also hand its WAV straight to Audio Studio without a re-upload.</p>
        <div className="mw-workflow">
          {WORKFLOW_STEPS.map((s, i) => (
            <div className="mw-workflow-step" key={s.label}>
              <div className="mw-workflow-icon">{s.icon}</div>
              <div className="mw-workflow-label">{s.label}</div>
              <div className="mw-workflow-note">{s.note}</div>
              {i < WORKFLOW_STEPS.length - 1 && <div className="mw-workflow-arrow" aria-hidden="true">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ---- SEO content ---- */}
      <section className="mw-section mw-prose">
        <h2 className="mw-h2">What is Media Workspace?</h2>
        <p>Media Workspace is where audio and video actually get worked on — not just converted from one format to another, but transcribed, captioned, trimmed, and composed into something new. Turn a voice memo into an editable transcript and a captioned video, extract and subtitle the audio track of a video, or cut, reorder, and compose a split-screen or picture-in-picture video from any number of clips — all without installing anything.</p>
        <p>Everything runs client-side in your browser using a real video engine (ffmpeg, self-hosted): audio and video files are decoded, edited, and re-encoded on your own device. Nothing is uploaded for editing — the only data that ever leaves your device is the audio sent to transcription, and only when you explicitly ask for a transcript.</p>

        <h2 className="mw-h2">Video editing</h2>
        <p>Video Editor is a non-destructive, multi-track timeline: trim, split, join, and freely reposition clips; add text, shapes, and a logo; compose split-screen, picture-in-picture, or multi-participant video-call layouts; automatically remove a person’s background for a cutout overlay; and export a real MP4 — all rendered on your device.</p>

        <h2 className="mw-h2">Audio editing &amp; transcription</h2>
        <p>Audio Studio edits and transcribes audio with a real waveform view, then turns a transcript into SRT/VTT captions or a captioned video/audiogram. Video Studio does the video-side equivalent: transcribe a video, edit the transcript, and burn real captions directly into the footage — or just extract its audio as a WAV file.</p>

        <h2 className="mw-h2">Privacy</h2>
        <p>Editing, composition, and export all happen locally in your browser — your file is never uploaded for those steps. Transcription is the one exception: a compressed copy of the audio is sent to our transcription provider for that single request and isn’t stored afterward.</p>

        <h2 className="mw-h2">Frequently asked questions</h2>
        {FAQS.map((f) => (
          <div key={f.q} className="mw-faq-item">
            <div className="mw-faq-q">{f.q}</div>
            <div className="mw-faq-a">{f.a}</div>
          </div>
        ))}
      </section>

      {relatedCategories?.length > 0 && (
        <section className="mw-section">
          <h2 className="mw-h3">Related tools</h2>
          <div className="mw-related-row">
            {relatedCategories.map((c) => (
              <Link key={c.slug} href={c.href} className="mw-related-chip">
                <span aria-hidden="true">{c.icon}</span> {c.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .mw-page {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(20px, 4vw, 40px) var(--cvt-space-page-x, 20px) 64px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: var(--cvt-color-ink, #132033);
        }
        .mw-hero {
          display: flex;
          align-items: center;
          gap: clamp(24px, 5vw, 56px);
          flex-wrap: wrap;
          padding: clamp(24px, 4vw, 40px) 0 clamp(32px, 5vw, 48px);
        }
        .mw-hero-text { flex: 1 1 380px; min-width: 280px; }
        .mw-eyebrow {
          font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--cvt-color-primary, #2563EB); margin: 0 0 10px;
        }
        .mw-h1 {
          font-size: clamp(2rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.1; margin: 0 0 14px;
          letter-spacing: -0.01em;
        }
        .mw-sub { font-size: 1.05rem; color: var(--cvt-color-ink-muted, #526075); margin: 0 0 18px; max-width: 46ch; line-height: 1.5; }
        .mw-trust { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
        .mw-trust-item {
          font-size: 0.78rem; font-weight: 700; color: var(--cvt-color-primary-strong, #1D4ED8);
          background: var(--cvt-color-primary-soft, #EFF6FF); border: 1px solid var(--cvt-color-primary-rule, #BFDBFE);
          border-radius: 999px; padding: 6px 12px;
        }
        .mw-trust-note { font-size: 0.74rem; color: var(--cvt-color-ink-soft, #718098); max-width: 48ch; margin: 0 0 20px; line-height: 1.5; }
        .mw-switch { display: inline-flex; background: var(--cvt-color-surface-tint, #F1F6FF); border-radius: 999px; padding: 4px; gap: 2px; }
        .mw-switch-btn {
          border: none; background: transparent; padding: 8px 22px; border-radius: 999px; font-size: 0.85rem; font-weight: 700;
          color: var(--cvt-color-ink-muted, #526075); cursor: pointer; font-family: inherit;
        }
        .mw-switch-btn-active { background: var(--cvt-color-primary, #2563EB); color: white; box-shadow: 0 2px 8px rgba(37,99,235,0.3); }

        .mw-hero-art { position: relative; flex: 1 1 340px; min-width: 260px; max-width: 460px; display: flex; justify-content: center; }
        .mw-laptop { width: 100%; max-width: 380px; }
        .mw-laptop-screen {
          background: #0F172A; border-radius: 14px 14px 4px 4px; padding: 12px 12px 16px; box-shadow: var(--cvt-shadow-lg, 0 18px 42px rgba(15,23,42,0.18));
          border: 1px solid #1E293B;
        }
        .mw-laptop-bar { display: flex; gap: 5px; margin-bottom: 10px; }
        .mw-laptop-bar span { width: 8px; height: 8px; border-radius: 50%; background: #334155; }
        .mw-laptop-editor { display: flex; flex-direction: column; gap: 6px; }
        .mw-laptop-preview {
          height: 110px; border-radius: 8px; position: relative; overflow: hidden;
          background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #0F172A 100%);
        }
        .mw-laptop-pip { position: absolute; right: 8px; bottom: 8px; width: 46px; height: 32px; border-radius: 5px; background: rgba(255,255,255,0.85); border: 2px solid white; }
        .mw-laptop-track { height: 14px; border-radius: 5px; background: #1E293B; }
        .mw-laptop-track::after { content: ''; }
        .mw-laptop-track-short { width: 60%; background: #334155; }
        .mw-laptop-base { height: 10px; background: linear-gradient(#334155, #1E293B); border-radius: 0 0 10px 10px; margin: 0 -4px; }
        .mw-floaty {
          position: absolute; background: white; border: 1px solid var(--cvt-color-rule, #E3EAF3); border-radius: 10px;
          padding: 6px 12px; font-size: 0.72rem; font-weight: 700; color: var(--cvt-color-ink, #132033);
          box-shadow: var(--cvt-shadow-md, 0 12px 28px rgba(15,23,42,0.12));
        }
        .mw-floaty-1 { top: -6px; left: -6px; }
        .mw-floaty-2 { bottom: 30%; right: -18px; color: var(--cvt-color-primary-strong, #1D4ED8); }
        .mw-floaty-3 { bottom: -10px; left: 20%; }

        .mw-section { padding: clamp(24px, 4vw, 40px) 0; border-top: 1px solid var(--cvt-color-rule, #E3EAF3); }
        .mw-h2 { font-size: 1.4rem; font-weight: 800; margin: 0 0 18px; letter-spacing: -0.01em; }
        .mw-h3 { font-size: 1.05rem; font-weight: 800; margin: 0 0 14px; }

        .mw-groups { display: flex; flex-direction: column; gap: 32px; }
        .mw-groups-audio-first { flex-direction: column-reverse; }
        .mw-group-title { display: flex; align-items: center; gap: 8px; font-size: 0.95rem; font-weight: 800; margin: 0 0 12px; }
        .mw-group-dot { width: 9px; height: 9px; border-radius: 50%; }
        .mw-dot-video { background: var(--cvt-color-primary, #2563EB); }
        .mw-dot-audio { background: #7C3AED; }
        .mw-card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .mw-card-grid-2col { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); max-width: 700px; }

        :global(.mw-card) {
          display: flex; flex-direction: column; gap: 8px; text-decoration: none; color: inherit;
          background: var(--cvt-color-surface, #FFFFFF); border: 1px solid var(--cvt-color-rule, #E3EAF3);
          border-radius: var(--cvt-radius-lg, 12px); padding: 18px; transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        :global(.mw-card:hover) { transform: translateY(-2px); box-shadow: var(--cvt-shadow-md, 0 12px 28px rgba(15,23,42,0.1)); border-color: var(--cvt-color-primary-rule, #BFDBFE); }
        :global(.mw-card-icon) { font-size: 1.6rem; }
        :global(.mw-card-title) { font-size: 1rem; font-weight: 800; }
        :global(.mw-card-desc) { font-size: 0.82rem; color: var(--cvt-color-ink-muted, #526075); margin: 0; line-height: 1.4; }
        :global(.mw-card-chips) { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
        :global(.mw-chip) {
          font-size: 0.66rem; font-weight: 700; color: var(--cvt-color-ink-soft, #718098); background: var(--cvt-color-bg, #F6F8FC);
          border: 1px solid var(--cvt-color-rule, #E3EAF3); border-radius: 6px; padding: 3px 7px;
        }
        :global(.mw-card-cta) { font-size: 0.8rem; font-weight: 800; color: var(--cvt-color-primary, #2563EB); margin-top: auto; padding-top: 6px; }

        .mw-quick-row { display: flex; flex-wrap: wrap; gap: 8px; }
        :global(.mw-quick-chip) {
          text-decoration: none; font-size: 0.76rem; font-weight: 700; color: var(--cvt-color-ink-muted, #526075);
          background: var(--cvt-color-surface-tint, #F1F6FF); border: 1px solid var(--cvt-color-primary-rule, #BFDBFE);
          border-radius: 999px; padding: 7px 16px;
        }
        :global(.mw-quick-chip:hover) { color: var(--cvt-color-primary-strong, #1D4ED8); }

        .mw-workflow-sub { font-size: 0.85rem; color: var(--cvt-color-ink-muted, #526075); max-width: 68ch; margin: -6px 0 22px; }
        .mw-workflow { display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-start; }
        .mw-workflow-step { position: relative; flex: 1 1 130px; min-width: 110px; max-width: 160px; text-align: center; padding: 0 14px; }
        .mw-workflow-icon {
          width: 44px; height: 44px; border-radius: 12px; background: var(--cvt-color-primary-soft, #EFF6FF); display: flex;
          align-items: center; justify-content: center; font-size: 1.2rem; margin: 0 auto 8px;
        }
        .mw-workflow-label { font-size: 0.82rem; font-weight: 800; margin-bottom: 3px; }
        .mw-workflow-note { font-size: 0.68rem; color: var(--cvt-color-ink-soft, #718098); line-height: 1.35; }
        .mw-workflow-arrow { position: absolute; top: 14px; right: -6px; color: var(--cvt-color-rule-strong, #CBD8E8); font-size: 1rem; }

        .mw-prose p { font-size: 0.92rem; line-height: 1.65; color: var(--cvt-color-ink-muted, #526075); margin: 0 0 14px; max-width: 74ch; }
        .mw-prose h2 { margin-top: 26px; }
        .mw-prose h2:first-child { margin-top: 0; }
        .mw-faq-item { margin-bottom: 16px; max-width: 74ch; }
        .mw-faq-q { font-weight: 800; font-size: 0.9rem; margin-bottom: 4px; }
        .mw-faq-a { font-size: 0.85rem; color: var(--cvt-color-ink-muted, #526075); line-height: 1.55; }

        .mw-related-row { display: flex; flex-wrap: wrap; gap: 8px; }
        :global(.mw-related-chip) {
          text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700;
          color: var(--cvt-color-ink, #132033); background: var(--cvt-color-surface, #fff); border: 1px solid var(--cvt-color-rule, #E3EAF3);
          border-radius: 10px; padding: 8px 14px;
        }

        @media (max-width: 640px) {
          .mw-hero { flex-direction: column; }
          .mw-hero-art { order: -1; max-width: 300px; }
          .mw-card-grid { grid-template-columns: 1fr; }
          .mw-workflow { flex-direction: column; align-items: stretch; }
          .mw-workflow-step { max-width: none; text-align: left; display: flex; align-items: center; gap: 12px; padding: 6px 0; }
          .mw-workflow-icon { margin: 0; flex-shrink: 0; }
          .mw-workflow-arrow { display: none; }
        }
      `}</style>
    </div>
  );
}
