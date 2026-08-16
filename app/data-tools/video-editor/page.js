import Link from 'next/link';
import VideoEditorWorkspace from '../../../components/tools/data-tools/video-editor/VideoEditorWorkspace';

export const metadata = {
  title: 'Video Editor — Multi-Track, Video Call & Screen Recording | Convertam',
  description: 'Trim, split, and reorder clips on a zoomable, snapping, multi-select timeline, add text/titles/shapes with entrance animations and a logo, rotate/flip/crop and pan, adjust speed and fades, apply filters, compose multi-track split-screen, picture-in-picture, or video-call layouts with per-track mute/solo/lock and a custom reframe background, automatically remove a person\'s background for a cutout overlay (no green screen needed), record your screen, drop timeline markers, and generate Auto Captions straight from your edited timeline — entirely in your browser, no login required.',
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
  { q: 'Can I reorder clips?', a: 'Yes — drag any clip in the main track left or right to move it wherever you want (Premiere-style free positioning), with snapping to the playhead, other clips\' edges, and markers. Clips can\'t overlap each other on the same track, but you can leave a gap for a deliberate pause. If you have several clips multi-selected, dragging any one of them moves the whole group together.' },
  { q: 'Does it have undo/redo?', a: 'Yes — every edit (trim, split, delete, join, reorder, composition changes) can be undone and redone.' },
  { q: 'What is split-screen composition?', a: 'Add a video or image overlay and choose Split screen (side by side or top/bottom) to show the main video and that overlay at once, divided by an adjustable line. Split screen only applies with exactly one overlay track.' },
  { q: 'What is picture-in-picture / video-call layout?', a: 'Choose Picture-in-picture to show your main video full-size with an overlay as a smaller, repositionable box in a corner — the familiar video-call layout, with adjustable corner and size. Add more overlay tracks and each gets its own independently positioned tile, for a multi-participant call.' },
  { q: 'Can I remove the background from a person without a green screen?', a: 'Yes — with a video overlay in Picture-in-picture mode, click Person cutout (remove background). It automatically isolates the person using on-device machine learning (nothing is uploaded), live in the preview and in the export, so only they show over whatever\'s on your Main track underneath. You can soften the cut edge, add a drop shadow or a colored outline glow, and resize/move/flip it exactly like any other overlay.' },
  { q: 'Can I add more than one overlay video?', a: 'Yes — every time you add a video or image overlay, it becomes its own new overlay track rather than replacing an existing one, so you can stack up several participants, webcams, or graphics at once.' },
  { q: 'What are video-call templates?', a: 'With two or more overlay tracks, Bottom strip, Side strip, and Corners are one-click layouts that arrange every overlay tile at once — you can still drag any tile afterward to adjust it further.' },
  { q: 'Can I record my screen in Video Editor?', a: 'Yes — click Record screen (or "Or record your screen" before you\'ve uploaded anything) to capture your screen, a window, or a browser tab via your browser\'s own screen-sharing prompt. The recording happens entirely on your device and is added to the timeline once you stop it.' },
  { q: 'Can I draw shapes or arrows on my video?', a: 'Yes — the Shapes panel adds rectangle, circle, line, and arrow annotations, each with its own color, filled or outline style, stroke width, position, and start/end timing.' },
  { q: 'Can I control audio from each video separately?', a: 'Yes — each clip has its own audio setting (Keep or Mute), so you can choose which video\'s sound plays during composed sections.' },
  { q: 'Can I export a vertical video for TikTok or Reels?', a: 'Yes — choose the Vertical (9:16) frame in the Composition panel. It works with a single video too, no overlay needed; the export is simply reframed to that shape. Square (1:1) and Landscape (16:9) are also available.' },
  { q: 'Does Convertam store my videos?', a: 'No. Editing, preview, and export all happen locally in your browser. Your video files are never uploaded anywhere, with one narrow exception: if you use Auto Captions, a compressed copy of just your edited timeline\'s rendered audio is sent to our transcription provider for that single request, and not stored afterward.' },
  { q: 'What do I get when I export?', a: 'A real MP4 file reflecting every trim, split, join, reorder, composition, text, speed, fade, filter, and crop choice you made — downloaded directly to your device.' },
  { q: 'Can I add text or a title to my video?', a: 'Yes — the Text & titles panel adds Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout layers, each with its own font size, color, background, position, and timing.' },
  { q: 'Can I add my logo or a watermark image?', a: 'Yes — upload an image in the Media panel\'s Logo/watermark slot, then set its size, opacity, and corner position.' },
  { q: 'Can I change a clip\'s speed, or add fade in/out?', a: 'Yes — every clip has a Speed control (0.25× to 4×) and Fade in/Fade out, applied to both video and audio together.' },
  { q: 'Are there transitions between clips?', a: 'Fade, Dip to black, Dip to white, and Crossfade are available — pick one from the selected clip\'s Transition control. Crossfade genuinely blends both clips\' video together (not just a fade through a color), with the incoming clip held on its own first frame during the blend so there\'s no jump once its own slot begins.' },
  { q: 'Can I duck background music under a voice track?', a: 'Yes — set a clip\'s audio to Mix with…, upload the background audio, then check Duck background. It analyzes the clip\'s own audio and automatically lowers the mixed-in track\'s volume while the clip has signal (e.g. speech), raising it back during quiet stretches. Plain signal analysis, not AI.' },
  { q: 'Can I find and remove silent parts automatically?', a: 'Click Find silence on a clip to scan it for quiet stretches, review the list, uncheck anything you want to keep, then remove the rest — nothing is cut without your review.' },
  { q: 'Does the export resolution actually change the file?', a: 'Yes — 480p/720p/1080p and the Small/Balanced/High quality setting both genuinely change the exported file\'s pixel dimensions and encoding, not just a label.' },
  { q: 'Can I change the export frame rate?', a: 'Yes — choose Original (the default, matching your source footage), or a fixed 24/30/60fps. An estimated output size is shown before you export, and you can cancel an export in progress at any time.' },
  { q: 'Can I rotate or flip a clip?', a: 'Yes — the Clip panel has a Rotate button that cycles a clip through 90°/180°/270°, plus separate Flip horizontal and Flip vertical toggles. Handy for footage recorded sideways or a mirrored webcam feed.' },
  { q: 'What is Master audio?', a: 'A project-wide Volume slider, Mute all toggle, and Fade in/Fade out that apply on top of everything else — every clip\'s own volume, fades, and ducking are unaffected; Master audio just scales the final mix.' },
  { q: 'What are timeline markers?', a: 'Press M (or the flag button above the timeline) to drop a labeled marker at the current playhead position — useful for planning where to cut, noting a music change, or leaving yourself a reminder. Markers are for navigating your own edit; they don\'t appear in the exported video.' },
  { q: 'How do I fill the empty space when reframing a video, like 16:9 to 9:16?', a: 'With Fit whole frame selected, choose a Background: a solid Color, a two-color Gradient, Blurred (a soft, zoomed-in copy of your own video — the common look for turning landscape footage into a clean vertical video), or a Custom image you upload.' },
  { q: 'Can I even out the volume of my clips?', a: 'Yes — select a clip and click Normalize audio to analyze its loudness and set a matching volume automatically, or drag the Volume slider yourself. This is plain signal analysis, not AI.' },
  { q: 'Can I play a clip backwards?', a: 'Yes — click Reverse on a selected clip. The live preview shows a best-effort silent scrub since browsers can\'t play video backwards natively, but the exported video genuinely plays that clip backwards with its audio correctly reversed too.' },
  { q: 'Can I add captions to my video?', a: 'Yes — click Auto Captions at any point while editing (no export needed first). It renders your edited timeline\'s audio locally, transcribes it, and lets you fix up the transcript, download it as SRT, VTT, or TXT, or burn the captions directly into your final exported video.' },
  { q: 'Does adding captions upload my video?', a: 'No — never your video, and not even your original audio files. Auto Captions renders your edited timeline\'s audio mix locally first, then sends a compressed copy of just that rendered audio to our transcription provider for that one request; it\'s not stored afterward. Burning captions into the final video happens locally in your browser, like every other export.' },
  { q: 'Do captions match my edits — trims, deleted sections, muted clips?', a: 'Yes — Auto Captions transcribes a local render of the ACTUAL edited timeline\'s audio, not your original source files, so trims, splits, deleted sections, reordering, mute/replace/mix audio choices, volume, fades, and ducking are all reflected in both what gets transcribed and the resulting timestamps.' },
  { q: 'Do I need to export before generating captions?', a: 'No — that\'s the point. Auto Captions works directly off your current timeline. Export only happens once, at the end, when you burn the finished captions into your final video (or whenever you export normally, with or without captions).' },
  { q: 'Does Video Editor use AI to edit my video for me?', a: 'No. All editing — trimming, splitting, composition, text, speed, filters, and export — is manual and runs locally in your browser. The only AI-powered feature is Auto Captions (speech-to-text transcription); there is no AI auto-editing, highlight generation, or scene detection.' },
  { q: 'Can I zoom in on the timeline?', a: 'Yes — the +/− buttons above the main track zoom the whole timeline in or out, useful for trimming precisely on a long clip. The main track and every overlay track scroll together, so they stay aligned.' },
  { q: 'Can I mute or solo one overlay track?', a: 'Yes — every overlay track has its own Mute and Solo buttons in its timeline header. Mute silences just that track; Solo silences every OTHER overlay track so you can hear this one alone. Both apply only to overlay tracks\' audio, not the main track.' },
  { q: 'Can I lock or hide an overlay track?', a: 'Yes — Lock disables trimming, deleting, and dragging that track\'s clips (including repositioning them on the preview) until you unlock it again, which is handy once a layout is finalized. Hide removes that track from the picture (and the export) without deleting it or affecting its audio — mute controls that separately.' },
  { q: 'What are Slide, Wipe, Zoom, and Blur transitions?', a: 'Four additional lightweight transitions alongside Crossfade: Slide pushes the outgoing clip off as the next one pushes in, Wipe reveals the next clip with a hard edge sweeping across, Zoom scales the next clip in while it fades on, and Blur dissolves through a soft blur rather than a plain cross-fade. All four genuinely blend both clips\' video, the same way Crossfade does.' },
  { q: 'Can text have an entrance animation?', a: 'Yes — Fade, Slide, or Pop plays a short animation the moment a text layer appears. It\'s a fixed, brief beat by design, not a configurable timeline of its own.' },
  { q: 'Can I control letter spacing or line spacing on text?', a: 'Yes — Character spacing and Line spacing sliders are available per text layer, and the text field itself supports multiple lines.' },
  { q: 'Can I upload my own font?', a: 'Yes — upload a .ttf, .otf, or .woff file from the Text panel and it\'s used for that text layer immediately, in both the preview and the export. This relies on your browser\'s FontFace support, so very old browsers may not honor it.' },
  { q: 'Can I manually crop or pan a clip?', a: 'Yes — the Crop / pan control combines a draggable focus pad (choose which part of the frame stays visible) with a zoom slider (crop in tighter than a straight fill). It\'s available whenever Crop to fill is selected for the frame.' },
  { q: 'What are the safe-zone guides?', a: 'An optional on-screen overlay (toggle it from the Composition panel) showing the standard 90%/80% action-safe and title-safe boundaries, so you can keep important content away from edges some displays crop. It\'s a preview aid only — it never appears in the exported video.' },
  { q: 'Is there an audio level meter?', a: 'Yes — a live level meter sits under the Master audio controls, reading the final mixed output while you play the timeline back.' },
  { q: 'Can I select and edit multiple clips at once?', a: 'Yes — Ctrl/Cmd-click a clip to add it to your selection (click again to remove it), or Shift-click to select every clip between your last pick and the one you clicked. Delete or Duplicate then applies to the whole selection in one action, and one undo step. Click empty timeline space to clear the selection.' },
  { q: 'Does trimming snap to anything?', a: 'Yes — dragging a trim handle snaps to the playhead, the edges of clips on any track, and your markers, with a small highlight on the handle when it snaps. Hold Alt while dragging to bypass snapping for a precise freehand trim; the numeric Trim start/end inputs are never affected by snapping either way.' },
  { q: 'Can I drag text directly on the preview to reposition it?', a: 'Yes — click and drag any text layer right on the preview canvas to move it; its X/Y position updates to match, so it stays exactly where you dropped it.' },
  { q: 'Does the exported video have a watermark?', a: 'Yes — every export carries a small "convertam.app" mark in the bottom-right corner. It\'s only added to the downloaded file, never shown while you\'re editing, and isn\'t configurable.' },
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
                <li><strong>Trim</strong> — drag either edge of a clip on the timeline, or set precise numeric in/out points. Dragging snaps to the playhead, other clips&apos; edges, and markers for a clean cut, with a small on-screen highlight when it snaps — hold Alt to drag without snapping.</li>
                <li><strong>Split</strong> — cut a clip in two at the playhead.</li>
                <li><strong>Multi-select</strong> — Ctrl/Cmd-click to add clips to a selection, Shift-click to select a range, then delete or duplicate all of them in one action (one undo step, original order preserved). Click empty timeline space to clear the selection.</li>
                <li><strong>Delete</strong> — remove an unwanted segment, or every selected clip at once.</li>
                <li><strong>Join</strong> — merge adjacent clips back together.</li>
                <li><strong>Free-form positioning</strong> — drag any clip left or right to place it wherever you want on the timeline (gaps allowed, overlaps rejected), with snapping to the playhead, other clips&apos; edges, and markers; drag any clip in a multi-selection and the whole group moves together.</li>
                <li><strong>Duplicate</strong> — one click to repeat a clip, or duplicate a whole multi-clip selection as one block.</li>
                <li><strong>Freeze frame</strong> — turn the current frame into a still image dropped into the sequence.</li>
                <li><strong>Undo/redo</strong> — step backward and forward through your edit history.</li>
                <li><strong>Timeline thumbnails and waveform</strong> — see a filmstrip and audio waveform on every clip, not just a plain colored bar.</li>
                <li><strong>Timeline zoom</strong> — zoom in for frame-accurate trims on a long clip, zoom back out for a quick overview; the main track and every overlay track scroll together.</li>
                <li><strong>Text and titles</strong> — headings, subtitles, lower thirds, quotes, callouts, and watermark text, each with its own font size, color, background (with adjustable opacity), outline, drop shadow, character spacing, line spacing, multi-line text, an entrance animation (fade/slide/pop), and an optional custom uploaded font — one click to duplicate any text layer, or drag it directly on the preview to reposition it.</li>
                <li><strong>Logo / watermark image</strong> — upload an image, position it in a corner, and control its size and opacity.</li>
                <li><strong>Rotate &amp; flip</strong> — rotate any clip 90°/180°/270° and flip it horizontally or vertically, useful for footage shot the wrong way or mirrored webcam captures.</li>
                <li><strong>Speed</strong> — 0.25× to 4× per clip.</li>
                <li><strong>Fade in/out</strong> — per clip, video and audio together.</li>
                <li><strong>Transitions</strong> — cut, fade, dip to black, dip to white, crossfade, slide, wipe, zoom, or blur between clips.</li>
                <li><strong>Color filters</strong> — brightness, contrast, saturation, grayscale, and warm/cool/vintage/cinematic presets.</li>
                <li><strong>Manual crop &amp; pan</strong> — drag a focus pad to choose which part of an oversized frame stays visible, plus a zoom slider to crop in tighter than a straight fill.</li>
                <li><strong>Aspect-ratio-safe guides</strong> — an optional on-screen overlay showing action-safe/title-safe zones while you compose, never present in the export.</li>
                <li><strong>Silence removal</strong> — scan a clip for silent stretches and review them before removing.</li>
                <li><strong>Audio normalization</strong> — one click to analyze and level out a clip&apos;s volume, or set it manually.</li>
                <li><strong>Reverse clip</strong> — plays a clip&apos;s video and audio backwards in the export.</li>
                <li><strong>Master audio</strong> — a project-wide volume control, mute-all, and fade in/out that apply on top of every clip&apos;s own volume and fades, plus a live level meter while playing.</li>
                <li><strong>Timeline markers</strong> — press M (or the flag button) to drop a labeled marker at the playhead, for planning cuts, noting music changes, or leaving yourself notes — markers are for your own navigation and aren&apos;t burned into the export.</li>
                <li><strong>Multi-track overlays</strong> — add any number of video or image overlay tracks, not just one.</li>
                <li><strong>Track mute / solo / lock / hide</strong> — silence one overlay track&apos;s audio, solo it to hear it alone, lock a track to protect it from accidental edits, or hide it from the picture without deleting it.</li>
                <li><strong>Split-screen</strong> — two videos side by side or stacked, with an adjustable divider.</li>
                <li><strong>Picture-in-picture / video call</strong> — a main video with one or more repositionable, resizable overlay tiles, each independently positioned.</li>
                <li><strong>Person cutout</strong> — automatically remove a picture-in-picture overlay's background (no green screen needed) using on-device machine learning, with edge softness, an optional drop shadow, and an optional colored outline glow — nothing uploaded, works live in the preview and the export.</li>
                <li><strong>Video-call templates</strong> — Bottom strip, Side strip, or Corners one-click layouts that arrange every overlay tile at once for a multi-participant call.</li>
                <li><strong>Screen recording</strong> — capture your screen, window, or tab directly in the browser and drop it straight into the timeline as the main video or an overlay.</li>
                <li><strong>Shapes</strong> — rectangle, circle, line, and arrow annotations, each with its own color, fill, stroke width, position, and timing.</li>
                <li><strong>Per-clip audio</strong> — keep, mute, replace, or mix in different audio per clip.</li>
                <li><strong>Audio ducking</strong> — automatically lowers mixed-in background audio while a clip&apos;s own audio has signal, so voice and music don&apos;t fight for attention.</li>
                <li><strong>Reframe for social platforms</strong> — Landscape (16:9), Square (1:1), or Vertical (9:16), with one-click YouTube/TikTok/Instagram/LinkedIn presets.</li>
                <li><strong>Reframe background</strong> — when fitting the whole frame into a new shape leaves empty space, fill it with a solid color, a color gradient, a blurred/zoomed copy of your own video, or a custom uploaded image.</li>
                <li><strong>Export controls</strong> — choose resolution (480p/720p/1080p), quality (small/balanced/high), and frame rate (original, or a fixed 24/30/60fps), with an estimated output size shown before you export and a Cancel button once it&apos;s running. Every export carries a small "convertam.app" mark in the bottom-right corner.</li>
                <li><strong>Auto Captions</strong> — transcribe your edited timeline directly (no export needed first), edit the transcript, download SRT/VTT/TXT, or burn captions straight into your final exported video.</li>
                <li><strong>Keyboard shortcuts</strong> — Space to play/pause, S to split, D to duplicate, Delete to remove, M to drop a marker, Ctrl/Cmd+Z to undo.</li>
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
                Add a video or image overlay to unlock composition — and add as many more as you need, each becoming its own overlay track with its own settings. <strong>Split screen</strong> places the main video and one overlay side by side or one above the other, with a divider you can drag to adjust the balance (only available with exactly one overlay track). <strong>Picture-in-picture</strong> keeps your main video full-size and places each overlay as its own smaller, independently positioned and resized tile — with two or more overlays, that becomes a genuine multi-participant <strong>video call</strong> layout. Both modes crop instead of stretching mismatched aspect ratios, so no video is ever distorted. Each overlay track's header has its own <strong>mute</strong>, <strong>solo</strong>, <strong>hide</strong>, and <strong>lock</strong> buttons — mute or solo control that track's audio in the mix, hide removes it from the picture without deleting it, and lock protects its clips from accidental trims or deletes until you unlock it again.
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
                Pick a <strong>Frame</strong> in the Composition panel to choose the shape your export is cropped to: Landscape (16:9) for YouTube, Square (1:1) for an Instagram feed post, or Vertical (9:16) for TikTok, Reels, and Shorts. This works with a single video too — no second clip or overlay required, the whole export is simply reframed. Use <strong>Crop to fill</strong> to fill the new frame edge to edge (cropping the sides or top/bottom as needed), or <strong>Fit whole frame</strong> to keep the entire original picture visible with space left over on the sides or top/bottom — choose what fills that space: a solid <strong>Color</strong>, a <strong>Gradient</strong> between two colors, a <strong>Blurred</strong> zoomed-in copy of your own footage (the common look for turning a 16:9 video into a clean 9:16 one), or a <strong>Custom image</strong> you upload.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Text, titles, speed, and effects</h2>
              <p>
                The <strong>Text &amp; titles</strong> panel adds always-on-top text layers — pick a Heading, Subtitle, Lower third, Simple text, Watermark, Quote, or Callout starting point, then set its own font size, color, background (and its opacity), outline, drop shadow, character spacing, line spacing (multi-line text is supported), bold/italic, alignment, position, an entrance animation, and start/end timing, and duplicate any layer in one click. Upload your own font file if the built-in ones aren&apos;t enough. The <strong>Shapes</strong> panel works the same way for rectangle, circle, line, and arrow annotations — each with its own color, filled/outline style, stroke width, position or endpoints, and timing. <strong>Logo/watermark</strong> follows the same pattern for an image instead of text. Per clip, the <strong>Clip</strong> panel adds <strong>Speed</strong> (0.25× to 4×), <strong>Fade in/out</strong> (video and audio together), <strong>Rotate</strong> (90° steps) and <strong>Flip horizontal/vertical</strong>, <strong>Volume</strong> (with a one-click <strong>Normalize audio</strong> button that analyzes the clip and levels it to a consistent loudness), <strong>Reverse</strong> to play the clip backwards, <strong>Duck background</strong> to automatically lower mixed-in background audio while the clip&apos;s own audio has signal, <strong>Filters</strong> (brightness, contrast, saturation, grayscale, or a one-click preset), and <strong>Crop / pan</strong> — a draggable focus pad plus a zoom slider for choosing exactly which part of the frame survives a crop. A separate <strong>Master audio</strong> control applies a project-wide volume, mute-all, fade in/out, and a live level meter on top of every clip&apos;s own settings. Choosing a <strong>Transition</strong> — Fade, Dip to black, Dip to white, Crossfade, Slide, Wipe, Zoom, or Blur — sets that clip&apos;s fade-out (and, for Fade/Dip, the next clip&apos;s fade-in) to match automatically; every option past Dip genuinely blends both clips&apos; video together during the transition (a push, a hard-edged reveal, a scale-in, or a soft blur dissolve, respectively) rather than fading through a color.
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
                Editing, composition, screen recording, and export all happen locally in your browser — your video is never uploaded for those steps, and a screen recording never leaves your device unless you choose to export it. Auto Captions is the one exception: it first renders just your edited timeline&apos;s audio locally (never the video), then sends a compressed copy of that rendered audio to our transcription provider, processed for that single request and not stored afterward. If you don&apos;t use Auto Captions, nothing about your video — or its audio — ever reaches Convertam&apos;s servers.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>Overlay tiles, not an equal grid:</strong> with picture-in-picture and video-call layouts, the main track stays full-size underneath and overlays are placed as smaller tiles on top — there&apos;s no mode that shrinks every participant, main track included, into equal-size grid cells.</li>
                <li><strong>Rendering speed:</strong> export runs in your browser, so it takes real processing time proportional to your video&apos;s length, composition, effects, and your device&apos;s power — using speed, fades, filters, text, shapes, extra overlay tracks, or a watermark takes longer to export than a straight trim.</li>
                <li><strong>Crossfade&apos;s incoming clip:</strong> during the blend, the next clip is held on its own first frame (not actively playing) while it dissolves in — this avoids any jump or repeat once its own official slot begins, at the cost of that clip not visibly moving until the crossfade finishes.</li>
                <li><strong>Screen recording audio:</strong> whether system/tab audio can be captured alongside your screen depends on your browser and OS — Chrome on macOS can only capture a single browser tab&apos;s own audio this way, never your whole screen or system sound, regardless of what you check in the share picker; Windows generally supports sharing full system audio. The editor warns you the moment a recording starts with no audio track, rather than only after you&apos;re done. Your microphone isn&apos;t captured either way, unless your OS routes it into the shared audio.</li>
                <li><strong>Reversed clip preview:</strong> browsers can&apos;t natively play video backwards, so a reversed clip previews as a best-effort silent scrub rather than smooth playback — the exported video plays it backwards properly, with its audio correctly reversed too.</li>
                <li><strong>Auto Captions rendering time:</strong> generating the timeline&apos;s audio for transcription happens in real time (roughly as long as your edited timeline&apos;s own length), since it plays the mix back to capture it — shorter than a full video export, but not instant for a long timeline.</li>
                <li><strong>Multi-select scope:</strong> a selection can only include clips from one track at a time — it&apos;s for shared delete/duplicate actions on a sequence of clips, not for moving several clips freely across the timeline at once.</li>
                <li><strong>Person cutout accuracy:</strong> background removal uses an on-device machine learning model tuned for a single person facing the camera in reasonable lighting — it isn&apos;t pixel-perfect chroma-key quality, works best with one clearly visible person, and the first time you enable it there&apos;s a brief pause while the (self-hosted, never uploaded-to) model loads.</li>
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
