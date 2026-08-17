import Link from 'next/link';
import AudioStudioWorkspace from '../../components/tools/data-tools/audio-studio/AudioStudioWorkspace';

export const metadata = {
  title: 'Audio Studio — Transcribe Audio & Create Captioned Videos | Convertam',
  description: 'Transcribe audio to text, edit the transcript, generate SRT and VTT captions, and turn audio into a captioned video or audiogram — entirely in your browser, no login required.',
  alternates: { canonical: '/audio-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Audio Studio',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based audio workspace: AI transcription, an editable transcript, SRT/VTT caption export, and audio-to-captioned-video / audiogram creation.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/audio-studio',
};

const FAQ = [
  { q: 'Can I transcribe MP3?', a: 'Yes — MP3, WAV, M4A, AAC, OGG, and WebM audio are all supported.' },
  { q: 'Can I edit the transcript?', a: 'Yes — click any line to edit its text, merge it with the next line, delete it, or search across the whole transcript.' },
  { q: 'Can I download SRT?', a: 'Yes, along with WebVTT (.vtt) and a plain-text transcript.' },
  { q: 'Can I create a video from audio?', a: 'Yes — Create Captioned Video turns your audio plus a branded background and waveform into a downloadable MP4 with your transcript burned in as captions.' },
  { q: 'Can I add an image?', a: 'Not in this version — Audio Studio currently renders one clean branded background. Uploading your own image or picking a gradient/solid color is planned for a future update.' },
  { q: 'Can I create vertical videos?', a: 'Not yet — this version renders a single square (1:1) format. Additional aspect ratios are planned for a future update.' },
  { q: 'Does Convertam store my audio?', a: 'No. Your audio is processed in your browser for playback, waveform display, and video rendering. Transcription sends a compressed copy of the audio to our AI provider to generate the transcript; it is not stored afterward, and nothing about your audio is saved on our servers.' },
  { q: 'Can I summarize the transcript?', a: 'Not in this version — AI cleanup, summaries, and key points are planned for a future update. You can copy the transcript into any other tool, including Convertam\'s own Text Cleaner Studio, in the meantime.' },
  { q: 'Can I translate the transcript?', a: 'Not in this version. Translation is planned for a future update.' },
  { q: 'What happens with poor audio quality?', a: 'Transcription accuracy depends on the source audio — background noise, overlapping speech, or very quiet recordings will produce a less accurate transcript. Silent or non-speech audio produces an empty transcript rather than invented text.' },
];

export default function AudioStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/media-workspace" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Media Workspace</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Audio Studio</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Turn audio into transcripts, captions, and shareable content — transcribe recordings, edit the transcript, create synchronized subtitles, and turn spoken audio into a polished captioned video.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 820, margin: '0 auto 56px' }}>
            <AudioStudioWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Audio Studio?</h2>
              <p>
                Audio Studio is a browser-based workspace for turning spoken audio into text you can actually use — an accurate transcript, synchronized captions, and, if you need it, a polished captioned video, all without uploading your recording to a storage service or account. It&apos;s built around one core idea: audio is easier to search, edit, share, and repurpose once it&apos;s text.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Audio Studio do?</h2>
              <ul style={ul}>
                <li><strong>Transcribe</strong> — upload an audio file and get an accurate, timestamped transcript of what was said.</li>
                <li><strong>Edit the transcript</strong> — click any line to correct it, merge adjoining lines, delete lines, or search across the whole thing.</li>
                <li><strong>Generate captions</strong> — download the transcript as SRT or WebVTT, the two subtitle formats supported by virtually every video platform and player.</li>
                <li><strong>Create a captioned video</strong> — turn the audio, a waveform visualization, and your captions into a downloadable MP4.</li>
                <li><strong>Export the transcript</strong> — plain text, ready to paste anywhere or hand off to another Convertam tool.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Audio transcription explained</h2>
              <p>
                When you click Transcribe, Audio Studio sends a compressed copy of your audio to Convertam&apos;s AI provider, which listens to it and returns exactly what was said, broken into timestamped segments. Audio longer than a few minutes is automatically split into sequential, overlapping pieces behind the scenes and stitched back into one continuous transcript — you just see &quot;Transcribing part 2 of 5…&quot; and get one finished result. This version transcribes clips up to 15 minutes — a real, current limit, documented plainly below rather than hidden. Nothing is invented: silent or unintelligible stretches are left out or marked, never filled in with guessed words.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>How audio becomes a transcript</h2>
              <p>
                Underneath, the flow is: your file is read and its waveform is drawn locally in your browser → when you transcribe, a compressed copy of the audio is sent for AI transcription → the result comes back as timestamped segments you can click to jump to that point in the audio → editing a segment&apos;s text never touches the original file, only the transcript.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Creating captions from audio</h2>
              <p>
                Once you have a transcript, Download SRT and Download VTT generate real subtitle files — properly formatted timestamps, line-split for readability — ready to attach to a video in any editor, or to upload alongside your audio wherever captions are accepted.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Turning audio into a captioned video</h2>
              <p>
                Many platforms (social feeds especially) don&apos;t support audio-only posts, or perform far better with video. Create Captioned Video renders your audio against a clean branded background with a waveform visualization and your captions burned directly into the frame — a real MP4 you can post anywhere a plain audio file wouldn&apos;t work.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Audiograms explained</h2>
              <p>
                An audiogram is exactly this kind of audio-plus-waveform-plus-captions video — a format that&apos;s become the standard way podcasts, sermons, and interviews get shared as short, captioned clips on social media. Audio Studio&apos;s captioned-video export produces one directly from your transcript, no separate editing software required.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Meetings</strong> — turn a recorded meeting into a searchable, shareable transcript.</li>
                <li><strong>Interviews</strong> — transcribe an interview for quoting or editing.</li>
                <li><strong>Lectures</strong> — generate a transcript students can search and review.</li>
                <li><strong>Sermons</strong> — create captioned video clips for social sharing.</li>
                <li><strong>Podcasts</strong> — produce audiogram clips to promote an episode.</li>
                <li><strong>Voice notes</strong> — turn a quick recording into text.</li>
                <li><strong>Content creation</strong> — get accurate captions for accessibility and reach.</li>
                <li><strong>Announcements</strong> — turn a short recorded announcement into a shareable video.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>MP3, WAV, M4A, AAC, OGG, and WebM — any format your browser can natively decode audio from.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Playback, the waveform, and video rendering all happen locally in your browser — your audio file itself is never uploaded for those steps. Transcription is the one exception: a compressed copy of the audio is sent to our AI provider to generate the transcript, processed for that single request, and not stored afterward. Convertam is designed for processing, not permanent media storage.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Transcription length:</strong> clips up to 15 minutes in this version. Longer audio is transcribed in sequential pieces and merged automatically, but there&apos;s still a real ceiling on total length per click.</li>
                <li><strong>Languages:</strong> transcription quality depends on how well the underlying AI model handles the spoken language; results are most reliable for widely-spoken languages.</li>
                <li><strong>Speaker labels:</strong> not supported in this version — Audio Studio doesn&apos;t attempt to guess who is speaking when, since that would risk showing you a confident-looking but wrong answer.</li>
                <li><strong>Word-level timing:</strong> captions are timed per sentence/clause, not per individual word, in this version.</li>
                <li><strong>Video creation:</strong> one background style, one caption look, and a single square (1:1) aspect ratio in this version — additional customization is planned.</li>
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
              <Link href="/video-studio" style={relatedLink}>Video Studio →</Link>
              <Link href="/data-tools/text-cleaner" style={relatedLink}>Text Cleaner Studio →</Link>
              <Link href="/data-tools/smart-parser" style={relatedLink}>Smart Parser →</Link>
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
