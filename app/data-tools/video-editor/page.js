import Link from 'next/link';
import VideoEditorWorkspace from '../../../components/tools/data-tools/video-editor/VideoEditorWorkspace';

export const metadata = {
  title: 'Video Editor — Multi-Track, Video Call & Screen Recording | Convertam',
  description: 'Trim, split, and reorder clips, add text/titles/shapes and a logo, adjust speed and fades, apply filters, compose multi-track split-screen, picture-in-picture, or video-call layouts, record your screen, and generate Auto Captions — entirely in your browser, no login required.',
  alternates: { canonical: '/data-tools/video-editor' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Video Editor',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based non-destructive video editor: trim, split, delete, join, and reorder clips; add text/titles, shapes, a logo/watermark, speed changes, fades, and color filters; compose multi-track split-screen, picture-in-picture, and video-call layouts from any number of video sources; record your screen directly in the browser.',
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
  { q: 'What is split-screen composition?', a: 'Add a video or image overlay and choose Split screen (side by side or top/bottom) to show the main video and that overlay at once, divided by an adjustable line. Split screen only applies with exactly one overlay track.' },
  { q: 'What is picture-in-picture / video-call layout?', a: 'Choose Picture-in-picture to show your main video full-size with an overlay as a smaller, repositionable box in a corner — the familiar video-call layout, with adjustable corner and size. Add more overlay tracks and each gets its own independently positioned tile, for a multi-participant call.' },
  { q: 'Can I add more than one overlay video?', a: 'Yes — every time you add a video or image overlay, it becomes its own new overlay track rather than replacing an existing one, so you can stack up several participants, webcams, or graphics at once.' },
  { q: 'What are video-call templates?', a: 'With two or more overlay tracks, Bottom strip, Side strip, and Corners are one-click layouts that arrange every overlay tile at once — you can still drag any tile afterward to adjust it further.' },
  { q: 'Can I record my screen in Video Editor?', a: 'Yes — click Record screen (or "Or record your screen" before you\'ve uploaded anything) to capture your screen, a window, or a browser tab via your browser\'s own screen-sharing prompt. The recording happens entirely on your device and is added to the timeline once you stop it.' },
  { q: 'Can I draw shapes or arrows on my video?', a: 'Yes — the Shapes panel adds rectangle, circle, line, and arrow annotations, each with its own color, filled or outline style, stroke width, position, and start/end timing.' },
  { q: 'Can I control audio from each video separately?', a: 'Yes — each clip has its own audio setting (Keep or Mute), so you can choose which video\'s sound plays during composed sections.' },
  { q: 'Can I export a vertical video for TikTok or Reels?', a: 'Yes — choose the Vertical (9:16) frame in the Composition panel. It works with a single video too, no overlay needed; the export is simply reframed to that shape. Square (1:1) and Landscape (16:9) are also available.' },
  { q: 'Does Convertam store my videos?', a: 'No. Editing, preview, and export all happen locally in your browser. Your video files are never uploaded anywhere, with one narrow exception: if you use Auto Captions, a compressed copy of just your exported video\'s audio is sent to our transcription provider for that single request, and not stored afterward.' },
  { q: 'What do I get when I export?', a: 'A real MP4 file reflecting every trim, split, join, reorder, composition, text, speed, fade, filter, and crop choice you made — downloaded directly to your device.' },
  { q: 'Can I add text or a title to my video?', a: 'Yes — the Text & titles panel adds Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout layers, each with its own font size, color, background, position, and timing.' },
  { q: 'Can I add my logo or a watermark image?', a: 'Yes — upload an image in the Media panel\'s Logo/watermark slot, then set its size, opacity, and corner position.' },
  { q: 'Can I change a clip\'s speed, or add fade in/out?', a: 'Yes — every clip has a Speed control (0.25× to 4×) and Fade in/Fade out, applied to both video and audio together.' },
  { q: 'Are there transitions between clips?', a: 'Fade, Dip to black, and Dip to white are available — pick one from the selected clip\'s Transition control. A true crossfade (blending two clips\' video at once) isn\'t supported yet.' },
  { q: 'Can I find and remove silent parts automatically?', a: 'Click Find silence on a clip to scan it for quiet stretches, review the list, uncheck anything you want to keep, then remove the rest — nothing is cut without your review.' },
  { q: 'Does the export resolution actually change the file?', a: 'Yes — 480p/720p/1080p and the Small/Balanced/High quality setting both genuinely change the exported file\'s pixel dimensions and encoding, not just a label.' },
  { q: 'Can I add captions to my video?', a: 'Yes — after exporting, use Auto Captions to transcribe the exported video\'s audio, edit the transcript for accuracy, then download it as SRT, VTT, or TXT, or burn the captions directly into the video as a new export.' },
  { q: 'Does adding captions upload my video?', a: 'Only the audio, and only for that one request. Auto Captions sends a compressed copy of your exported video\'s audio to our transcription provider to generate the transcript; it\'s processed for that single request and not stored afterward. Burning captions into the video happens locally in your browser, like every other export.' },
  { q: 'Does Video Editor use AI to edit my video for me?', a: 'No. All editing — trimming, splitting, composition, text, speed, filters, and export — is manual and runs locally in your browser. The only AI-powered feature is Auto Captions (speech-to-text transcription); there is no AI auto-editing, highlight generation, or scene detection.' },
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
              Trim, split, and reorder clips on a real timeline with drag-to-trim handles, add text/titles/shapes and a logo, adjust speed and fades, apply color filters, then compose multi-track split-screen, picture-in-picture, or video-call layouts from any number of videos — or record your screen directly — all in your browser.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 900, margin: '0 auto 56px' }}>
            <VideoEditorWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Video Editor?</h2>
              <p>
                Video Editor is a browser-based, non-destructive video editing workspace. Upload one video and cut it into a sequence, or add any number of additional video/image overlay tracks and compose them into split-screen, picture-in-picture, or multi-participant video-call layouts — without uploading your footage to a server or account.
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
                <li><strong>Multi-track overlays</strong> — add any number of video or image overlay tracks, not just one.</li>
                <li><strong>Split-screen</strong> — two videos side by side or stacked, with an adjustable divider.</li>
                <li><strong>Picture-in-picture / video call</strong> — a main video with one or more repositionable, resizable overlay tiles, each independently positioned.</li>
                <li><strong>Video-call templates</strong> — Bottom strip, Side strip, or Corners one-click layouts that arrange every overlay tile at once for a multi-participant call.</li>
                <li><strong>Screen recording</strong> — capture your screen, window, or tab directly in the browser and drop it straight into the timeline as the main video or an overlay.</li>
                <li><strong>Shapes</strong> — rectangle, circle, line, and arrow annotations, each with its own color, fill, stroke width, position, and timing.</li>
                <li><strong>Per-clip audio</strong> — keep, mute, replace, or mix in different audio per clip.</li>
                <li><strong>Reframe for social platforms</strong> — Landscape (16:9), Square (1:1), or Vertical (9:16), with one-click YouTube/TikTok/Instagram/LinkedIn presets.</li>
                <li><strong>Export controls</strong> — choose resolution (480p/720p/1080p) and quality (small/balanced/high).</li>
                <li><strong>Auto Captions</strong> — transcribe your exported video, edit the transcript, download SRT/VTT/TXT, or burn captions directly into the video.</li>
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
              <h2 style={sectionH2}>Multi-track composition: split-screen, picture-in-picture, and video calls</h2>
              <p>
                Add a video or image overlay to unlock composition — and add as many more as you need, each becoming its own overlay track with its own settings. <strong>Split screen</strong> places the main video and one overlay side by side or one above the other, with a divider you can drag to adjust the balance (only available with exactly one overlay track). <strong>Picture-in-picture</strong> keeps your main video full-size and places each overlay as its own smaller, independently positioned and resized tile — with two or more overlays, that becomes a genuine multi-participant <strong>video call</strong> layout. Both modes crop instead of stretching mismatched aspect ratios, so no video is ever distorted.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Video-call templates</h2>
              <p>
                With two or more overlay tracks, the Composition panel offers one-click <strong>video-call templates</strong> — <strong>Bottom strip</strong> and <strong>Side strip</strong> line every overlay tile up along an edge at matching size; <strong>Corners</strong> places one tile in each corner. Applying a template switches every overlay to picture-in-picture mode and arranges them automatically; you can still drag any tile afterward to fine-tune its position, or switch back to per-track controls to position each one by hand.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Screen recording</h2>
              <p>
                Click <strong>Record screen</strong> to capture your screen, a specific window, or a browser tab using your browser&apos;s own screen-sharing permission — no extension or download required. The recording happens entirely on your device; stop it with the in-app button or your browser&apos;s own &quot;Stop sharing&quot; control, and it&apos;s added straight to the timeline as your main video (if you haven&apos;t uploaded one yet) or as a new overlay track (for a webcam-plus-screen tutorial layout).
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
                The <strong>Text &amp; titles</strong> panel adds always-on-top text layers — pick a Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout starting point, then set its own font size, color, background, bold/italic, alignment, position, and start/end timing. The <strong>Shapes</strong> panel works the same way for rectangle, circle, line, and arrow annotations — each with its own color, filled/outline style, stroke width, position or endpoints, and timing. <strong>Logo/watermark</strong> follows the same pattern for an image instead of text. Per clip, the <strong>Clip</strong> panel adds <strong>Speed</strong> (0.25× to 4×), <strong>Fade in/out</strong> (video and audio together), <strong>Filters</strong> (brightness, contrast, saturation, grayscale, or a one-click preset), and <strong>Crop focus</strong> for choosing which part of the frame survives a crop. Choosing a <strong>Transition</strong> other than Cut sets that clip&apos;s fade-out and the next clip&apos;s fade-in to match automatically.
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
                <li><strong>Multi-participant video calls or panels</strong> — arrange three or four speakers with a video-call template.</li>
                <li><strong>Tutorials and product demos</strong> — record your screen, add a webcam overlay and shape annotations to point things out.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>MP4, WebM, MOV, and other video formats your browser can natively play and decode.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Editing, composition, screen recording, and export all happen locally in your browser — your video is never uploaded for those steps, and a screen recording never leaves your device unless you choose to export it. Auto Captions is the one exception: generating a transcript requires sending a compressed copy of just the exported video&apos;s audio to our transcription provider, processed for that single request and not stored afterward. If you don&apos;t use Auto Captions, nothing about your video ever reaches Convertam&apos;s servers.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Overlay tiles, not an equal grid:</strong> with picture-in-picture and video-call layouts, the main track stays full-size underneath and overlays are placed as smaller tiles on top — there&apos;s no mode that shrinks every participant, main track included, into equal-size grid cells.</li>
                <li><strong>Rendering speed:</strong> export runs in your browser, so it takes real processing time proportional to your video&apos;s length, composition, effects, and your device&apos;s power — using speed, fades, filters, text, shapes, extra overlay tracks, or a watermark takes longer to export than a straight trim.</li>
                <li><strong>Crossfade transitions:</strong> only Fade, Dip to black, and Dip to white are available between clips — a true crossfade (blending two clips&apos; video at once) isn&apos;t supported yet.</li>
                <li><strong>Screen recording audio:</strong> whether system/tab audio can be captured alongside your screen depends on your browser and what you choose to share — your microphone isn&apos;t captured unless your operating system routes it into the shared audio.</li>
                <li><strong>Captions:</strong> Auto Captions transcribes your <em>exported</em> video, not the live timeline — export first, then generate captions from that file.</li>
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
