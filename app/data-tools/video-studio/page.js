import Link from 'next/link';
import VideoStudioWorkspace from '../../../components/tools/data-tools/video-studio/VideoStudioWorkspace';

export const metadata = {
  title: 'Video Studio — Transcribe, Caption & Extract Audio from Video | Convertam',
  description: 'Transcribe a video, edit the transcript, generate SRT and VTT captions, and burn real captions directly into your video — or extract its audio as a WAV file. Entirely in your browser, no login required.',
  alternates: { canonical: '/data-tools/video-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Video Studio',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based video workspace: AI transcription, an editable transcript, SRT/VTT caption export, audio extraction, and genuine caption burn-in.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/video-studio',
};

const FAQ = [
  { q: 'Can I transcribe a video?', a: 'Yes — upload a video and Video Studio decodes its audio track and transcribes it, the same way Audio Studio transcribes an audio file.' },
  { q: 'Can I extract audio from a video?', a: 'Yes — Extract Audio decodes the video\'s audio track and downloads it as a WAV file, without transcribing or captioning anything.' },
  { q: 'Can I burn captions directly into my video?', a: 'Yes — Burn Captions into Video produces a real MP4 with your transcript\'s captions rendered into the video\'s actual pixels, not just an overlay shown in the preview player.' },
  { q: 'What\'s the difference between downloading SRT and burning captions?', a: 'Downloading SRT/VTT gives you a separate subtitle file to attach in a video editor or upload alongside your video wherever captions are supported. Burning captions changes the video file itself — the captions become part of the picture, visible everywhere the video plays, with no separate file needed.' },
  { q: 'What is Quick Subtitle?', a: 'A one-click shortcut that transcribes your video and immediately downloads an SRT file, skipping the transcript editor — useful when you just need captions fast and don\'t need to correct anything first.' },
  { q: 'Can I edit the transcript before burning captions?', a: 'Yes — the same transcript editor as Audio Studio: click any line to correct it, merge it with the next line, delete it, or search across the whole transcript, all before you burn or export captions.' },
  { q: 'Does Convertam store my video?', a: 'No. Your video is processed in your browser for preview, audio extraction, and caption burn-in. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript; it is not stored afterward, and nothing about your video is saved on our servers.' },
  { q: 'What if my video has no audio track?', a: 'Video Studio detects this and disables transcription and audio extraction for that file, rather than pretending to process audio that isn\'t there.' },
  { q: 'Can I get a summary or chapters from my video?', a: 'Not in this version — AI summaries and chapter generation are planned for a future update.' },
  { q: 'Can I resize my video for social media?', a: 'Not in this version — aspect-ratio resizing and social media presets are planned for a future update.' },
];

export default function VideoStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Video Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Turn video into transcripts, captions, and audio — transcribe what's said, edit the transcript, create synchronized subtitles, extract the audio track, and burn real captions directly into the video.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 820, margin: '0 auto 56px' }}>
            <VideoStudioWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Video Studio?</h2>
              <p>
                Video Studio is a browser-based workspace for getting text and audio out of your video, and putting captions back into it. Upload a video and Video Studio can transcribe what&apos;s said, extract just the audio track, or burn styled, synchronized captions directly into the video&apos;s pixels — all without uploading your video to a storage service or account.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Video Studio do?</h2>
              <ul style={ul}>
                <li><strong>Transcribe</strong> — get an accurate, timestamped transcript of a video&apos;s spoken audio.</li>
                <li><strong>Edit the transcript</strong> — correct lines, merge them, delete them, or search across the whole thing.</li>
                <li><strong>Generate captions</strong> — download SRT or WebVTT subtitle files.</li>
                <li><strong>Burn captions into the video</strong> — produce a real MP4 with captions rendered into the picture itself.</li>
                <li><strong>Extract audio</strong> — pull just the audio track out as a downloadable WAV file.</li>
                <li><strong>Export the transcript</strong> — plain text, ready to paste anywhere or hand off to another Convertam tool.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How video becomes a transcript</h2>
              <p>
                Your video plays locally in the built-in preview player the moment you upload it — nothing is sent anywhere just to preview or scrub through it. When you click Transcribe, Video Studio decodes the video&apos;s audio track in your browser and sends a compressed copy of just that audio to Convertam&apos;s AI provider, which returns a timestamped transcript. This version transcribes videos up to 3 minutes — a real, current limit tied to how much audio fits in a single request, stated plainly here rather than hidden. Nothing is invented: silent or unintelligible stretches are left out or marked, never filled in with guessed words.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Extracting audio from video</h2>
              <p>
                Extract Audio decodes the video&apos;s audio track entirely in your browser and downloads it as a WAV file — no transcription, no captions, just the sound. Useful when you want to edit or repurpose a video&apos;s audio on its own, or run it through Audio Studio separately.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Quick Subtitle vs. Edit &amp; Style</h2>
              <p>
                Video Studio offers two paths once you&apos;re ready for captions. <strong>Quick Subtitle</strong> is a one-click shortcut: transcribe, then immediately download an SRT file, for when you just need captions fast and trust the transcript as-is. <strong>Transcribe &amp; Edit</strong> opens the full transcript editor first, so you can correct anything before generating captions or burning them into the video — the right choice whenever accuracy matters more than speed.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Burning captions into video, explained</h2>
              <p>
                Downloading an SRT or VTT file gives you captions as a separate file — useful for uploading to a platform that accepts subtitle files, or importing into a video editor. Burn Captions into Video is different: it renders your captions directly into the video&apos;s actual frames, producing one MP4 file where the captions are simply part of the picture. That means they show up anywhere the video plays, with no separate file to keep track of — at the cost of no longer being toggleable on or off the way an SRT track is.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Social clips</strong> — burn captions into a video for platforms where viewers watch with sound off.</li>
                <li><strong>Recorded talks and webinars</strong> — transcribe for a searchable record, or caption for accessibility.</li>
                <li><strong>Interviews</strong> — transcribe for quoting or editing.</li>
                <li><strong>Tutorials</strong> — add captions so steps are followable without audio.</li>
                <li><strong>Sermons and lectures</strong> — caption recordings for wider reach.</li>
                <li><strong>Repurposing audio</strong> — extract a video&apos;s audio track to use on its own.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>MP4, WebM, MOV, and other video formats your browser can natively play and decode audio from.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Preview, audio extraction, and caption burn-in all happen locally in your browser — your video file itself is never uploaded for those steps. Transcription is the one exception: a compressed copy of just the audio is sent to our AI provider to generate the transcript, processed for that single request, and not stored afterward. Convertam is designed for processing, not permanent media storage.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Transcription length:</strong> videos up to 3 minutes in this version — a real technical limit driven by how much audio fits in a single AI request.</li>
                <li><strong>Caption burn-in speed:</strong> runs in your browser, so it takes real processing time proportional to your video&apos;s length and your device&apos;s power — there is no server doing this work instantly behind the scenes.</li>
                <li><strong>Caption styling:</strong> one clean default caption style in this version — style presets and customization are planned for a future update.</li>
                <li><strong>Speaker labels and word-level timing:</strong> not supported in this version, for the same reason as Audio Studio — Convertam doesn&apos;t guess at data a plain transcription model can&apos;t reliably provide.</li>
                <li><strong>Resizing and social presets:</strong> not yet available — this version keeps your video&apos;s original dimensions.</li>
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
              <Link href="/data-tools/audio-studio" style={relatedLink}>Audio Studio →</Link>
              <Link href="/data-tools/text-cleaner" style={relatedLink}>Text Cleaner Studio →</Link>
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
              <Link href="/data-tools" style={relatedLink}>All Data Tools →</Link>
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
