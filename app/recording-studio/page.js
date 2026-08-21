import Link from 'next/link';
import RecordingStudioWorkspace from '../../components/tools/data-tools/recording-studio/RecordingStudioWorkspace';

export const metadata = {
  title: 'Recording Studio — Free Multitrack Audio Editor & Mixer | Convertam',
  description: 'Import multiple audio tracks, edit and mix them with effects, ducking, crossfades and noise reduction, then export as WAV or MP3 — a real multitrack audio workspace that runs entirely in your browser, free, with no upload to a server.',
  alternates: { canonical: '/recording-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Recording Studio',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based multitrack audio editor and mixer — import, edit, apply effects, ducking, crossfades and noise reduction, and export as WAV or MP3, entirely on-device.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/recording-studio',
};

const FAQ = [
  { q: 'Is this a real multitrack editor, or just a simple audio player?', a: 'A real one — add as many tracks as you want, import audio onto each, edit clips (move, trim, split, delete, duplicate), mix with per-track volume/pan/mute/solo and effects, then export the finished mix. It\'s built around a proper timeline, not a single playback bar.' },
  { q: 'Can I record audio directly in this tool?', a: 'No — Recording Studio is an import-and-edit workspace: bring in audio files you\'ve already recorded (in any app, on any device), then edit, mix, and export them here. Record your source audio with whatever microphone setup gives you the quality you want, then import the file.' },
  { q: 'Does the noise reduction actually remove background noise?', a: 'It reduces it, using real signal processing (a highpass filter for rumble, notch filters for electrical hum at both 50Hz and 60Hz, and a gentle noise gate for quiet hiss) — the same engine already used elsewhere on Convertam. It genuinely helps with fan noise, AC hum, and electrical buzz, but it\'s not an AI model, so it won\'t surgically remove arbitrary noise the way a paid AI denoiser might. We\'d rather tell you that plainly than oversell it.' },
  { q: 'What effects are available?', a: 'Per track: bass and treble EQ, a compressor, reverb, and echo/delay — each as a simple amount slider, not raw DSP parameters. Per clip: volume, fade in/out, and a speed control (which also shifts pitch, like a tape-speed change, since true pitch-only shifting isn\'t reliably possible for free in a browser).' },
  { q: 'Can I export as MP3?', a: 'Yes — WAV or MP3, both encoded locally in your browser using an open-source encoder. Nothing is ever sent to a paid transcoding service.' },
  { q: 'Does the preview speed control change my export?', a: 'No — the 0.25×–2× speed control on the transport is for editing only, so you can slow playback down to find an exact spot. It never affects the exported mix unless you deliberately apply the per-clip Speed effect.' },
  { q: 'How does audio ducking work?', a: 'Open a track\'s FX panel and set "Duck under" to another track — say, background music ducking under a vocal track. Whenever that other track has actual signal, this track\'s volume automatically drops (and rises back once it\'s quiet again), with a short hold so normal speech pauses don\'t pump the volume up and down. It updates live while you preview, and the exported mix always matches exactly what you heard.' },
  { q: 'Does this upload my audio anywhere?', a: 'No — importing, editing, mixing, effects, noise reduction, and export all happen locally in your browser. Nothing is ever uploaded to a server.' },
  { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
];

export default function RecordingStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/media-workspace" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Media Workspace</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Recording Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Import, layer, edit, and mix multiple audio tracks, then export a finished WAV or MP3 — a real multitrack audio workspace that runs entirely in your browser, free, with nothing ever uploaded to a server.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 1100, margin: '0 auto 56px' }}>
            <RecordingStudioWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Recording Studio?</h2>
              <p>
                Recording Studio is a multitrack audio editor and mixer — the kind of tool you&apos;d normally install desktop software for, running entirely in your browser instead. Import audio files onto as many tracks as you want, edit clips on a real timeline, mix everything with per-track volume/pan/mute/solo and effects, then export the finished result as WAV or MP3.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Recording Studio do?</h2>
              <ul style={ul}>
                <li><strong>Import audio files</strong> — bring in as many audio files as you want; each one lands on its own track, ready to edit and mix alongside the others.</li>
                <li><strong>Non-destructive editing</strong> — select, move, trim, split, delete, and duplicate clips; drag them to reorder or move them between tracks; undo/redo anything.</li>
                <li><strong>Mixing</strong> — per-track volume, pan, mute, and solo, plus a master volume with a safety limiter and a live level meter.</li>
                <li><strong>Effects</strong> — per-track bass/treble EQ, compressor, reverb, and echo; per-clip gain, fade in/out, and a speed effect.</li>
                <li><strong>Noise reduction</strong> — clean up a noisy imported clip with real signal processing.</li>
                <li><strong>Enhance Voice</strong> — a one-click preset combining noise reduction, a voice-presence EQ boost, and loudness normalization for the common &quot;just make my voice sound good&quot; case.</li>
                <li><strong>Automatic pause removal</strong> — find long silences in a clip at your choice of sensitivity, review how much they add up to, then remove them in one click.</li>
                <li><strong>Crossfades</strong> — overlap a clip with the next one on its track and fade smoothly between them, with an adjustable crossfade length.</li>
                <li><strong>Audio ducking</strong> — set a track to automatically lower in volume whenever another track (like a vocal) has signal, then rise back up in the gaps — ideal for background music under narration.</li>
                <li><strong>Editing playback speed</strong> — slow playback down to 0.25× to find an exact spot, without touching your export.</li>
                <li><strong>Export</strong> — download your finished mix as WAV or MP3.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>About the noise reduction</h2>
              <p>
                Recording Studio&apos;s &quot;Clean Audio&quot; option uses real, plain signal processing — the same engine already used elsewhere on Convertam: a highpass filter for low rumble, notch filters tuned to electrical hum at both 50Hz and 60Hz (plus their first harmonics, since a recording&apos;s origin isn&apos;t known ahead of time), and a gentle noise gate that pulls down quiet background hiss between speech. It genuinely helps with fan noise, air conditioner hum, and electrical buzz. It is not an AI denoiser, and it won&apos;t surgically remove arbitrary background noise the way a paid AI service might — we&apos;d rather be upfront about that than oversell a &quot;clean&quot; button.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Podcasting</strong> — import each speaker&apos;s track, mix levels, and clean up background noise before exporting.</li>
                <li><strong>Voiceover and narration</strong> — import a narration take and a music bed, duck the music under the voice automatically, and export a finished mix.</li>
                <li><strong>Songwriting demos</strong> — import a vocal or instrument take over a backing track, layer harmonies, and mix a rough demo.</li>
                <li><strong>Cleaning up an existing recording</strong> — import a noisy voice memo, run Clean Audio, and export a clearer version.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>Import any audio format your browser can decode (MP3, WAV, M4A, AAC, OGG, WebM). Export as WAV (uncompressed, full quality) or MP3 (compressed, smaller file), both encoded locally — never sent to an external transcoding service.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and local processing</h2>
              <p>
                Editing, mixing, effects, noise reduction, and export all run entirely in your browser using the Web Audio API. Any files you import are never uploaded to a server — the only thing that ever leaves your device is the file you choose to download.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>No live recording:</strong> Recording Studio edits and mixes audio you&apos;ve already recorded elsewhere — it doesn&apos;t capture from a microphone directly.</li>
                <li><strong>Noise reduction, not noise removal:</strong> plain signal processing reduces hum, rumble, and hiss — it can&apos;t surgically isolate a voice from arbitrary background noise the way a paid AI model could.</li>
                <li><strong>Speed changes pitch:</strong> the per-clip Speed effect shifts pitch along with tempo, like a tape-speed change, since true pitch-independent time-stretching isn&apos;t reliably available for free client-side.</li>
                <li><strong>Browser memory:</strong> every track&apos;s audio is held in your browser tab&apos;s memory while you work, so extremely long sessions with many tracks can use significant RAM.</li>
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
              <Link href="/audio-studio" style={relatedLink}>Audio Studio →</Link>
              <Link href="/video-editor" style={relatedLink}>Video Editor →</Link>
              <Link href="/screen-recorder" style={relatedLink}>Screen Recorder →</Link>
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
