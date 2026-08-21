import Link from 'next/link';
import RecordingStudioWorkspace from '../../components/tools/data-tools/recording-studio/RecordingStudioWorkspace';

export const metadata = {
  title: 'Recording Studio — Free Multitrack Audio Recorder & Mixer | Convertam',
  description: 'Record from your microphone, layer multiple tracks, edit and mix them, then export as WAV or MP3 — a real multitrack recording studio that runs entirely in your browser, free, with no upload to a server.',
  alternates: { canonical: '/recording-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Recording Studio',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based multitrack audio recorder, editor, and mixer — record, overdub, edit, apply effects and noise reduction, and export as WAV or MP3, entirely on-device.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/recording-studio',
};

const FAQ = [
  { q: 'Is this a real multitrack recorder, or just a voice memo tool?', a: 'A real one — add as many tracks as you want, record or import audio onto each, edit clips (move, trim, split, delete, duplicate), mix with per-track volume/pan/mute/solo and effects, then export the finished mix. It\'s built around a proper timeline, not a single record button.' },
  { q: 'Can I record while listening to what I already recorded?', a: 'Yes — that\'s overdubbing. Turn on "Listen to other tracks while recording" and your existing tracks play back in sync while you record a new one on top. Use headphones so the playback doesn\'t bleed into your mic.' },
  { q: 'What happens if I re-record over something?', a: 'Nothing is destroyed. If a new take would overlap what\'s already on the armed track, Recording Studio automatically places it on a new "(Take 2)" track instead, so you can compare both and delete whichever you don\'t want.' },
  { q: 'Does the noise reduction actually remove background noise?', a: 'It reduces it, using real signal processing (a highpass filter for rumble, notch filters for electrical hum at both 50Hz and 60Hz, and a gentle noise gate for quiet hiss) — the same engine already used elsewhere on Convertam. It genuinely helps with fan noise, AC hum, and electrical buzz, but it\'s not an AI model, so it won\'t surgically remove arbitrary noise the way a paid AI denoiser might. We\'d rather tell you that plainly than oversell it.' },
  { q: 'What effects are available?', a: 'Per track: bass and treble EQ, a compressor, reverb, and echo/delay — each as a simple amount slider, not raw DSP parameters. Per clip: volume, fade in/out, and a speed control (which also shifts pitch, like a tape-speed change, since true pitch-only shifting isn\'t reliably possible for free in a browser).' },
  { q: 'Can I export as MP3?', a: 'Yes — WAV or MP3, both encoded locally in your browser using an open-source encoder. Nothing is ever sent to a paid transcoding service.' },
  { q: 'Does the preview speed control change my export?', a: 'No — the 0.25×–2× speed control on the transport is for editing only, so you can slow playback down to find an exact spot. It never affects the exported mix unless you deliberately apply the per-clip Speed effect.' },
  { q: 'Does this upload my recordings anywhere?', a: 'No — recording, editing, mixing, effects, noise reduction, and export all happen locally in your browser. Nothing is ever uploaded to a server.' },
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
              Record, layer, edit, and mix multiple audio tracks, then export a finished WAV or MP3 — a real multitrack recording workspace that runs entirely in your browser, free, with nothing ever uploaded to a server.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 1100, margin: '0 auto 56px' }}>
            <RecordingStudioWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Recording Studio?</h2>
              <p>
                Recording Studio is a multitrack audio recorder, editor, and mixer — the kind of tool you&apos;d normally install desktop software for, running entirely in your browser instead. Add tracks, record from your microphone or import existing audio files onto them, edit clips on a real timeline, mix everything with per-track volume/pan/mute/solo and effects, then export the finished result as WAV or MP3.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Recording Studio do?</h2>
              <ul style={ul}>
                <li><strong>Multitrack recording</strong> — add as many tracks as you want, arm one for recording, and capture from your microphone straight onto the timeline.</li>
                <li><strong>Overdubbing</strong> — record a new track while listening to the tracks you&apos;ve already recorded, perfectly in sync.</li>
                <li><strong>Non-destructive editing</strong> — select, move, trim, split, delete, and duplicate clips; drag them to reorder or move them between tracks; undo/redo anything.</li>
                <li><strong>Import audio files</strong> — bring in existing recordings and edit them alongside anything you record fresh.</li>
                <li><strong>Mixing</strong> — per-track volume, pan, mute, and solo, plus a master volume with a safety limiter and a live level meter.</li>
                <li><strong>Effects</strong> — per-track bass/treble EQ, compressor, reverb, and echo; per-clip gain, fade in/out, and a speed effect.</li>
                <li><strong>Noise reduction</strong> — clean up a noisy clip after the fact, or reduce noise live while you&apos;re actually recording.</li>
                <li><strong>Editing playback speed</strong> — slow playback down to 0.25× to find an exact spot, without touching your export.</li>
                <li><strong>Export</strong> — download your finished mix as WAV or MP3.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How overdubbing and re-takes work</h2>
              <p>
                Arm a track (the red dot in its header), hit record, and — if &quot;Listen to other tracks while recording&quot; is on — everything else already on the timeline plays back in sync while you record on top of it, exactly like overdubbing on a real multitrack recorder. If a new take would land on top of audio that&apos;s already there, Recording Studio never overwrites it: it automatically creates a new &quot;(Take 2)&quot; track for the new recording instead, so both takes exist side by side until you decide what to keep. Use headphones while overdubbing so the played-back tracks don&apos;t bleed into your microphone.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>About the noise reduction</h2>
              <p>
                Recording Studio&apos;s &quot;Clean Audio&quot; and live noise-reduction options use real, plain signal processing — the same engine already used elsewhere on Convertam: a highpass filter for low rumble, notch filters tuned to electrical hum at both 50Hz and 60Hz (plus their first harmonics, since a recording&apos;s origin isn&apos;t known ahead of time), and a gentle noise gate that pulls down quiet background hiss between speech. It genuinely helps with fan noise, air conditioner hum, and electrical buzz. It is not an AI denoiser, and it won&apos;t surgically remove arbitrary background noise the way a paid AI service might — we&apos;d rather be upfront about that than oversell a &quot;clean&quot; button.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Podcasting</strong> — record separate tracks per speaker (or per take), mix levels, and clean up background noise before exporting.</li>
                <li><strong>Voiceover and narration</strong> — record a take, punch in a re-take without losing the first one, and normalize levels.</li>
                <li><strong>Songwriting demos</strong> — record a vocal or instrument over an imported backing track, layer harmonies, and mix a rough demo.</li>
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
                Recording, editing, mixing, effects, noise reduction, and export all run entirely in your browser using the Web Audio API. Your microphone audio and any files you import are never uploaded to a server — the only thing that ever leaves your device is the file you choose to download.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Noise reduction, not noise removal:</strong> plain signal processing reduces hum, rumble, and hiss — it can&apos;t surgically isolate a voice from arbitrary background noise the way a paid AI model could.</li>
                <li><strong>Speed changes pitch:</strong> the per-clip Speed effect shifts pitch along with tempo, like a tape-speed change, since true pitch-independent time-stretching isn&apos;t reliably available for free client-side.</li>
                <li><strong>Browser memory:</strong> every track's audio is held in your browser tab's memory while you work, so extremely long sessions with many tracks can use significant RAM.</li>
                <li><strong>Microphone quality depends on your hardware and browser permissions</strong> — Recording Studio can&apos;t improve a mic\'s fundamental audio quality, only clean up what it captures.</li>
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
