import Link from 'next/link';
import CompressVideoWorkspace from '../../components/tools/data-tools/compress-video/CompressVideoWorkspace';

export const metadata = {
  title: 'Compress & Split Video — Up to 2GB, Free & Local | Convertam',
  description: 'Shrink an oversized video by lowering its resolution and quality, or cut it into smaller parts — accepts files up to 2GB, well past the 500MB limit on Video Editor and Video Studio, for exactly this purpose. Entirely in your browser, no upload to a server.',
  alternates: { canonical: '/compress-video' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Compress & Split Video',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based tool for shrinking or splitting an oversized video file, entirely on-device — accepts files up to 2GB.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/compress-video',
};

const FAQ = [
  { q: 'Why is this tool\'s upload limit bigger than Video Editor\'s?', a: 'Video Editor and Video Studio cap uploads at 500MB because their own editing, composition, and export processing genuinely can\'t handle more in a browser tab. This tool exists for the opposite case — a video that\'s already over that limit — so it accepts up to 2GB, purely to shrink or cut it down to something those tools can open.' },
  { q: 'Why not truly unlimited?', a: 'Everything here runs entirely in your browser (nothing is ever uploaded to a server), and the video engine has to hold the file in your browser tab\'s own memory to process it. 2GB is a real, tested ceiling for what a modern desktop browser tab can handle without crashing — four times Video Editor\'s normal limit, not a fake "unlimited" that would silently hang on a genuinely huge file.' },
  { q: 'What does Compress actually do?', a: 'It re-encodes your video at a lower resolution and/or quality setting you choose, which reduces file size — the same trade-off any video compressor makes. Higher compression (smaller resolution, smaller quality) means a smaller file but a less sharp picture.' },
  { q: 'What does Split actually do?', a: 'It cuts your video into consecutive parts of whatever length you choose (e.g. every 5 minutes), without re-encoding — so it\'s fast and lossless. Each cut lands on the nearest keyframe rather than an exact frame, so a part\'s length can be off by a couple of seconds; that\'s a disclosed trade-off for speed, not a bug.' },
  { q: 'Can I get frame-accurate cuts instead?', a: 'Not from this tool — Split is built for quickly getting a huge file down to postable-sized pieces, not precision editing. Once a part is small enough, open it in Video Editor for frame-accurate trimming.' },
  { q: 'What happens after I compress or split my video?', a: 'Download the result directly, or click "Open in Video Editor" to send it straight there without a manual download-then-reupload step — the same local, in-browser handoff Screen Recorder already uses.' },
  { q: 'Does this tool upload my video anywhere?', a: 'No — compressing and splitting both happen entirely in your browser, at any file size this tool accepts. Nothing about your video ever reaches Convertam\'s servers.' },
];

export default function CompressVideoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/media-workspace" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Media Workspace</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Compress &amp; Split Video</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Got a video too big to upload elsewhere on Convertam? Shrink it by lowering resolution and quality, or cut it into smaller parts — this tool alone accepts files up to 2GB, entirely for that purpose, then hands the result straight to Video Editor.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 820, margin: '0 auto 56px' }}>
            <CompressVideoWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Compress &amp; Split Video?</h2>
              <p>
                Every other video tool on Convertam — Video Editor, Video Studio — caps uploads at 500MB, because their own editing and export work genuinely can&apos;t handle more inside a browser tab. Compress &amp; Split Video is the deliberate exception: a single-purpose tool that accepts files up to 2GB for exactly one job — getting an oversized video down to a size those other tools can open. Pick Compress to shrink the file itself, or Split to cut it into smaller consecutive parts, then send the result straight into Video Editor to keep working.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Compress &amp; Split Video do?</h2>
              <ul style={ul}>
                <li><strong>Compress</strong> — re-encode at a lower resolution (1080p/720p/480p) and quality (high/balanced/small) to shrink file size, with a before/after size comparison.</li>
                <li><strong>Split</strong> — cut into consecutive parts of a chosen length (2/5/10/15 minutes), fast and lossless, no re-encoding.</li>
                <li><strong>Download individually or all at once</strong> — every compressed file or split part downloads on its own, or as one ZIP for a full split.</li>
                <li><strong>Open in Video Editor</strong> — send the compressed video or any split part straight into Video Editor, with no manual re-upload.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Compress vs. Split — which do I need?</h2>
              <p>
                <strong>Compress</strong> keeps your video as one file but makes it smaller by re-encoding at a lower resolution and/or quality — the right choice when you want the whole video, just lighter. <strong>Split</strong> keeps the original quality but breaks the video into several smaller files — the right choice when you need the full quality preserved, or when you only actually need to work with part of a long recording at a time. Both get you to the same place: a file (or files) small enough for Video Editor or Video Studio&apos;s normal 500MB limit.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Why this tool alone allows a bigger upload</h2>
              <p>
                Video Editor and Video Studio&apos;s 500MB limit exists because their own processing — timeline rendering, composition, transcription — genuinely can&apos;t reliably handle more in a browser tab. This tool&apos;s only job is shrinking or cutting a file down, so it can safely accept up to 2GB — still not literally unlimited, since everything runs in your browser&apos;s own memory with nothing ever uploaded to a server, but four times more headroom, purely so an oversized file has somewhere to go.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>A screen recording that ran long</strong> — shrink it down before editing, or split it into per-topic parts.</li>
                <li><strong>Phone-shot 4K footage</strong> — compress to 1080p or 720p for something manageable to edit and share.</li>
                <li><strong>A long lecture or webinar recording</strong> — split into per-session parts before uploading anywhere with its own size limit.</li>
                <li><strong>Getting into Video Editor at all</strong> — when a file is simply too large to open there directly.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>MP4, WebM, MOV, and other video formats your browser can natively play. Compress always outputs MP4 (H.264 video, AAC audio); Split keeps the original codec, since it copies rather than re-encodes.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Compressing and splitting both happen entirely in your browser — your video, at any size this tool accepts, is never uploaded to a server. The handoff to Video Editor uses your browser&apos;s own local Cache Storage, not a server round trip.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Upload limit:</strong> 2GB, not literally unlimited — a real, tested ceiling for what a browser tab can process without crashing, stated plainly here rather than promised as infinite.</li>
                <li><strong>Compress speed:</strong> a full re-encode runs entirely in your browser, so it takes real time proportional to your video&apos;s length and your device&apos;s power.</li>
                <li><strong>Split accuracy:</strong> cuts land on the nearest keyframe, not an exact frame — parts can be off by a couple of seconds. Use Video Editor afterward for frame-accurate trimming.</li>
                <li><strong>No composition or captions here:</strong> this tool only shrinks or cuts a single file — trimming, overlays, captions, and export controls all live in Video Editor.</li>
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
              <Link href="/video-studio" style={relatedLink}>Video Studio →</Link>
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
