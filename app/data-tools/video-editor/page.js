import Link from 'next/link';
import VideoEditorWorkspace from '../../../components/tools/data-tools/video-editor/VideoEditorWorkspace';

export const metadata = {
  title: 'Video Editor — Trim, Text, Speed & Split-Screen Video Editing | Convertam',
  description: 'Trim, split, and reorder clips, add text/titles and a logo, adjust speed and fades, apply filters, and compose split-screen or picture-in-picture layouts — entirely in your browser, no login required.',
  alternates: { canonical: '/data-tools/video-editor' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Video Editor',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based non-destructive video editor: trim, split, delete, join, and reorder clips; add text/titles, a logo/watermark, speed changes, fades, and color filters; compose split-screen, picture-in-picture, and video-call layouts from two video sources.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/video-editor',
};

const FAQ = [
  { q: 'Can I trim a video?', a: 'Yes — select a clip and set its trim start and end points with precise numeric inputs. Trimming never modifies your original file; it only changes what part of it plays.' },
  { q: 'Can I split a clip into two?', a: 'Yes — move the playhead to where you want the cut and click Split at playhead. The clip becomes two independent clips you can trim, delete, or reorder separately.' },
  { q: 'Can I delete part of a video?', a: 'Yes — split at both edges of the part you don\'t want, select the middle piece, and delete it. The remaining clips automatically play back to back.' },
  { q: 'Can I join clips back together?', a: 'Yes — select a clip and click Join with next to merge it with the clip immediately after it on the same track.' },
  { q: 'Can I reorder clips?', a: 'Yes — drag and drop any clip in the main track to change its position in the sequence.' },
  { q: 'Does it have undo/redo?', a: 'Yes — every edit (trim, split, delete, join, reorder, composition changes) can be undone and redone.' },
  { q: 'What is split-screen composition?', a: 'Upload a second video as an overlay and choose Split screen (side by side or top/bottom) to show both videos at once, divided by an adjustable line.' },
  { q: 'What is picture-in-picture / video-call layout?', a: 'Choose Picture-in-picture to show your main video full-size with the second video as a smaller, repositionable box in a corner — the familiar video-call layout, with adjustable corner and size.' },
  { q: 'Can I control audio from each video separately?', a: 'Yes — each clip has its own audio setting (Keep or Mute), so you can choose which video\'s sound plays during composed sections.' },
  { q: 'Can I export a vertical video for TikTok or Reels?', a: 'Yes — choose the Vertical (9:16) frame in the Composition panel. It works with a single video too, no overlay needed; the export is simply reframed to that shape. Square (1:1) and Landscape (16:9) are also available.' },
  { q: 'Does Convertam store my videos?', a: 'No. Editing, preview, and export all happen locally in your browser. Your video files are never uploaded anywhere.' },
  { q: 'What do I get when I export?', a: 'A real MP4 file reflecting every trim, split, join, reorder, composition, text, speed, fade, filter, and crop choice you made — downloaded directly to your device.' },
  { q: 'Can I add text or a title to my video?', a: 'Yes — the Text & titles panel adds Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout layers, each with its own font size, color, background, position, and timing.' },
  { q: 'Can I add my logo or a watermark image?', a: 'Yes — upload an image in the Media panel\'s Logo/watermark slot, then set its size, opacity, and corner position.' },
  { q: 'Can I change a clip\'s speed, or add fade in/out?', a: 'Yes — every clip has a Speed control (0.25× to 4×) and Fade in/Fade out, applied to both video and audio together.' },
  { q: 'Are there transitions between clips?', a: 'Fade, Dip to black, and Dip to white are available — pick one from the selected clip\'s Transition control. A true crossfade (blending two clips\' video at once) isn\'t supported yet.' },
  { q: 'Can I find and remove silent parts automatically?', a: 'Click Find silence on a clip to scan it for quiet stretches, review the list, uncheck anything you want to keep, then remove the rest — nothing is cut without your review.' },
  { q: 'Does the export resolution actually change the file?', a: 'Yes — 480p/720p/1080p and the Small/Balanced/High quality setting both genuinely change the exported file\'s pixel dimensions and encoding, not just a label.' },
];

export default function VideoEditorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Video Editor</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Trim, split, and reorder clips on a real timeline with drag-to-trim handles, add text/titles and a logo, adjust speed and fades, apply color filters, then compose split-screen or picture-in-picture layouts from two videos — all in your browser.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 900, margin: '0 auto 56px' }}>
            <VideoEditorWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Video Editor?</h2>
              <p>
                Video Editor is a browser-based, non-destructive video editing workspace. Upload one or two videos and cut them into a sequence, or compose them together into split-screen and picture-in-picture layouts — without uploading your footage to a server or account.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Video Editor do?</h2>
              <ul style={ul}>
                <li><strong>Trim</strong> — drag either edge of a clip on the timeline, or set precise numeric in/out points.</li>
                <li><strong>Split</strong> — cut a clip in two at the playhead.</li>
                <li><strong>Delete</strong> — remove an unwanted segment.</li>
                <li><strong>Join</strong> — merge adjacent clips back together.</li>
                <li><strong>Reorder</strong> — drag clips into a new sequence.</li>
                <li><strong>Duplicate</strong> — one click to repeat a clip.</li>
                <li><strong>Freeze frame</strong> — turn the current frame into a still image dropped into the sequence.</li>
                <li><strong>Undo/redo</strong> — step backward and forward through your edit history.</li>
                <li><strong>Timeline thumbnails and waveform</strong> — see a filmstrip and audio waveform on every clip, not just a plain colored bar.</li>
                <li><strong>Text and titles</strong> — headings, subtitles, lower thirds, quotes, callouts, and watermark text, each with its own font size, color, background, position, and timing.</li>
                <li><strong>Logo / watermark image</strong> — upload an image, position it in a corner, and control its size and opacity.</li>
                <li><strong>Speed</strong> — 0.25× to 4× per clip.</li>
                <li><strong>Fade in/out</strong> — per clip, video and audio together.</li>
                <li><strong>Transitions</strong> — fade, dip to black, or dip to white between clips.</li>
                <li><strong>Color filters</strong> — brightness, contrast, saturation, grayscale, and warm/cool/vintage/cinematic presets.</li>
                <li><strong>Crop focus</strong> — choose which part of an oversized frame stays visible when cropping to fill.</li>
                <li><strong>Silence removal</strong> — scan a clip for silent stretches and review them before removing.</li>
                <li><strong>Split-screen</strong> — two videos side by side or stacked, with an adjustable divider.</li>
                <li><strong>Picture-in-picture / video call</strong> — a main video with a repositionable, resizable overlay in any corner.</li>
                <li><strong>Per-clip audio</strong> — keep, mute, replace, or mix in different audio per clip.</li>
                <li><strong>Reframe for social platforms</strong> — Landscape (16:9), Square (1:1), or Vertical (9:16), with one-click YouTube/TikTok/Instagram/LinkedIn presets.</li>
                <li><strong>Export controls</strong> — choose resolution (480p/720p/1080p) and quality (small/balanced/high).</li>
                <li><strong>Keyboard shortcuts</strong> — Space to play/pause, S to split, D to duplicate, Delete to remove, Ctrl/Cmd+Z to undo.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Non-destructive editing, explained</h2>
              <p>
                Every edit in Video Editor works by changing which part of your original file plays and in what order — your uploaded file itself is never modified or re-encoded until you export. That means you can trim, split, delete, and reorder freely, undo any of it, and only pay the cost of real rendering once, at export time.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Split-screen and picture-in-picture composition</h2>
              <p>
                Add a second video as an overlay track to unlock composition. <strong>Split screen</strong> places both videos side by side or one above the other, with a divider you can drag to adjust the balance. <strong>Picture-in-picture</strong> keeps your main video full-size and places the second video as a smaller box in whichever corner you choose — the layout used for video-call-style reaction or commentary videos. Both modes crop instead of stretching mismatched aspect ratios, so neither video is ever distorted.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Exporting for TikTok, Instagram, and YouTube</h2>
              <p>
                Pick a <strong>Frame</strong> in the Composition panel to choose the shape your export is cropped to: Landscape (16:9) for YouTube, Square (1:1) for an Instagram feed post, or Vertical (9:16) for TikTok, Reels, and Shorts. This works with a single video too — no second clip or overlay required, the whole export is simply reframed. Use <strong>Crop to fill</strong> to fill the new frame edge to edge (cropping the sides or top/bottom as needed), or <strong>Fit whole frame</strong> to keep the entire original picture visible with a solid-color letterbox filling the rest.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Text, titles, speed, and effects</h2>
              <p>
                The <strong>Text &amp; titles</strong> panel adds always-on-top text layers — pick a Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout starting point, then set its own font size, color, background, bold/italic, alignment, position, and start/end timing. <strong>Logo/watermark</strong> works the same way for an image instead of text. Per clip, the <strong>Clip</strong> panel adds <strong>Speed</strong> (0.25× to 4×), <strong>Fade in/out</strong> (video and audio together), <strong>Filters</strong> (brightness, contrast, saturation, grayscale, or a one-click preset), and <strong>Crop focus</strong> for choosing which part of the frame survives a crop. Choosing a <strong>Transition</strong> other than Cut sets that clip&apos;s fade-out and the next clip&apos;s fade-in to match automatically.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Trimming footage</strong> — cut a long recording down to the part you need.</li>
                <li><strong>Removing mistakes</strong> — split around an unwanted section and delete it.</li>
                <li><strong>Reordering clips</strong> — rearrange multiple takes into the right sequence.</li>
                <li><strong>Reaction and commentary videos</strong> — picture-in-picture your face over gameplay or footage.</li>
                <li><strong>Interview and comparison videos</strong> — split screen two speakers or two angles side by side.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>MP4, WebM, MOV, and other video formats your browser can natively play and decode.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Editing, preview, and export all happen locally in your browser — your video files are never uploaded anywhere. Nothing about your video is saved on Convertam&apos;s servers, because it never reaches them in the first place.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Two tracks:</strong> one main track plus one optional overlay track — not an open-ended multi-track timeline.</li>
                <li><strong>Rendering speed:</strong> export runs in your browser, so it takes real processing time proportional to your video&apos;s length, composition, effects, and your device&apos;s power — using speed, fades, filters, text, or a watermark takes longer to export than a straight trim.</li>
                <li><strong>Crossfade transitions:</strong> only Fade, Dip to black, and Dip to white are available between clips — a true crossfade (blending two clips&apos; video at once) isn&apos;t supported yet.</li>
                <li><strong>Captions/subtitles:</strong> not yet connected to this tool — for now, transcribe and caption a video separately in Video Studio.</li>
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
              <Link href="/data-tools/video-studio" style={relatedLink}>Video Studio →</Link>
              <Link href="/data-tools/audio-studio" style={relatedLink}>Audio Studio →</Link>
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
