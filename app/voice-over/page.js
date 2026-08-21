import Link from 'next/link';
import VoiceOverWorkspace from '../../components/tools/data-tools/voice-over/VoiceOverWorkspace';

export const metadata = {
  title: 'Voice Over — Add Narration to a Video, Free | Convertam',
  description: 'Upload a video, record a microphone voice-over while it plays, adjust and mix the audio, then export a real MP4 with your narration permanently included — free, and processed in your browser.',
  alternates: { canonical: '/voice-over' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Voice Over',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based tool for adding a microphone voice-over to a video — record narration while the video plays, mix it with the original audio, and export a real MP4.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/voice-over',
};

const FAQ = [
  { q: 'How is this different from Video Editor?', a: 'Video Editor is a full multi-clip timeline editor. Voice Over is a single-purpose tool: one video, record narration over it, mix the audio, export — no tracks, no clips, no timeline to learn. If you\'re already in Video Editor, its "Add Voice Over" button opens this same tool for the video you\'re working on.' },
  { q: 'Can I record more than one take?', a: 'Yes — record as many takes as you want. Nothing is ever overwritten; every take stays in the list so you can compare them and pick the one you want, or delete the ones you don\'t.' },
  { q: 'Can I pause partway through recording?', a: 'Yes — Pause stops both your microphone and the video in sync, and Resume picks back up from exactly that point, so you can collect your thoughts mid-narration without starting over.' },
  { q: 'Can I trim my narration?', a: 'Yes — drag either edge of a take\'s waveform to trim its start or end before exporting.' },
  { q: 'What happens to the video\'s original audio?', a: 'You choose: keep it and adjust its volume, mute it entirely, or mix it together with your narration at whatever balance you set. Nothing happens to it automatically.' },
  { q: 'Does it clean up background noise in my recording?', a: 'Yes — turn on "Reduce noise while recording" for live noise reduction as you narrate, or use the "Clean" button on any take afterward. Both use real signal processing (a highpass filter for rumble, notch filters for electrical hum, a gentle noise gate for hiss) — it reduces noise, it doesn\'t claim to remove it perfectly.' },
  { q: 'Is the exported file a real MP4?', a: 'Yes — a genuine MP4 with your mixed audio permanently combined into it, not a preview-only overlay. The video itself is never re-encoded (so picture quality is untouched); only the audio track is replaced with the final mix.' },
  { q: 'Does this upload my video or recordings anywhere?', a: 'No — recording, mixing, and export all happen locally in your browser. Nothing is ever uploaded to a server.' },
  { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
];

export default function VoiceOverPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/media-workspace" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Media Workspace</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Voice Over</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Upload a video, record your microphone while it plays, mix your narration with the original audio, and export a real MP4 — a dedicated narration tool, not a full editor.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 1000, margin: '0 auto 56px' }}>
            <VoiceOverWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Voice Over?</h2>
              <p>
                Voice Over is a purpose-built narration tool: upload a video, record a microphone take while watching and listening to it, adjust how your narration balances against the original audio, and export a real MP4 with the voice-over permanently mixed in. It&apos;s deliberately simple — no timeline, no clips, no tracks — for exactly one job: adding narration to one video.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Voice Over do?</h2>
              <ul style={ul}>
                <li><strong>Record while watching</strong> — the video plays automatically as you narrate, so your timing lines up naturally.</li>
                <li><strong>Pause and resume</strong> — stop mid-recording to collect your thoughts, then continue from exactly that point.</li>
                <li><strong>Multiple takes</strong> — record as many as you want; nothing is ever overwritten, and you pick your favorite.</li>
                <li><strong>Trim</strong> — drag a take&apos;s waveform edges to cut off a rough start or a long pause at the end.</li>
                <li><strong>Mix control</strong> — independent volume for your narration and the original video audio, or mute the original entirely.</li>
                <li><strong>Noise reduction</strong> — live while recording, or applied afterward to a specific take.</li>
                <li><strong>Preview before export</strong> — hear the actual mix, at your chosen volumes, before committing to a render.</li>
                <li><strong>Real MP4 export</strong> — your narration is permanently combined into a genuine video file, with the original picture quality untouched.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Voice Over vs. Video Editor</h2>
              <p>
                Video Editor is a full multi-clip timeline for editing, composing, and exporting complex video projects. Voice Over is not a smaller version of that — it&apos;s a separate, focused tool for one specific job: narrating a single video. If you&apos;re already editing in Video Editor and want to add narration to the video you&apos;re working on, its <strong>Add Voice Over</strong> button opens this tool with that video already loaded — no manual download-and-reupload needed. When you finish here, <strong>Open in Video Editor</strong> sends the narrated result back just as easily.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Tutorial and how-to videos</strong> — narrate over screen recordings or demo footage.</li>
                <li><strong>Explainer videos</strong> — add a voice-over track to silent or ambient-only footage.</li>
                <li><strong>Presentations and training</strong> — record narration over slides or B-roll.</li>
                <li><strong>Home videos</strong> — add commentary or context to family or travel footage.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>Upload MP4, WebM, MOV, and other video formats your browser can natively play. Export always produces an MP4 with AAC audio; the original video stream is copied unchanged, never re-encoded.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and local processing</h2>
              <p>
                Recording, mixing, noise reduction, and export all happen entirely in your browser. Your video and microphone recordings are never uploaded to a server — the only thing that leaves your device is the file you choose to download or send to Video Editor.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>One video, one active take at export:</strong> Voice Over narrates a single uploaded video with one chosen take — for multi-clip projects or layering several audio tracks, use Video Editor or Recording Studio instead.</li>
                <li><strong>Noise reduction, not noise removal:</strong> real signal processing reduces hum, rumble, and hiss — it can&apos;t surgically isolate a voice from arbitrary background noise the way a paid AI model could.</li>
                <li><strong>Export re-encodes only audio:</strong> the video picture is copied unchanged for speed and quality, which also means Voice Over can&apos;t fix video-side issues (resolution, codec) — use Compress &amp; Split Video or Video Editor for that.</li>
                <li><strong>Browser memory:</strong> your video and every recorded take are held in your browser tab&apos;s memory while you work, so very long videos or many long takes can use significant RAM.</li>
              </ul>
            </section>

            <section>
              <h2 style={sectionH2}>Frequently asked questions</h2>
              {FAQ.map((item, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4, fontSize: '0.92rem' }}>{item.q}</div>
                  <div style={{ fontSize: '0.88rem', color: '#475569' }}>{item.a}</div>
                </div>
              ))}
            </section>
          </article>

          <div style={{ maxWidth: 760, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Related Tools</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/video-editor" style={relatedLink}>Video Editor →</Link>
              <Link href="/recording-studio" style={relatedLink}>Recording Studio →</Link>
              <Link href="/audio-studio" style={relatedLink}>Audio Studio →</Link>
              <Link href="/media-workspace" style={relatedLink}>Media Workspace →</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

const sectionH2 = { fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: 10 };
const ul = { paddingLeft: 20, margin: '10px 0' };
const relatedLink = { fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' };
