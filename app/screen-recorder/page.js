import Link from 'next/link';
import ScreenRecorderWorkspace from '../../components/tools/data-tools/screen-recorder/ScreenRecorderWorkspace';

export const metadata = {
  title: 'Screen Recorder — Mic & Webcam PIP, Free & Local | Convertam',
  description: 'Record your screen, window, or browser tab directly in your browser — with an optional microphone and an optional webcam picture-in-picture. Nothing is uploaded; download the recording or open it straight in Video Editor.',
  alternates: { canonical: '/screen-recorder' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Screen Recorder',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based screen recorder: capture your screen, a window, or a browser tab, with an optional microphone and an optional webcam picture-in-picture composited live into the recording, entirely on-device.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/screen-recorder',
};

const FAQ = [
  { q: 'Is this free?', a: 'Yes — Screen Recorder is free, with no account or login required.' },
  { q: 'Does it record my microphone?', a: 'Only if you turn it on — "Include microphone" is checked by default before you start, but it\'s a genuine on/off choice. You can record your screen completely silently, narrate over it with your voice, or capture whatever system/tab audio your browser shares (or both at once, mixed together).' },
  { q: 'Does it show my webcam?', a: 'Only if you turn it on — camera is off by default. Check "Include webcam" and your face appears as a repositionable, resizable picture-in-picture box over the recording, with a corner picker and a size slider. Leave it unchecked to record your screen (with or without your voice) without showing yourself at all.' },
  { q: 'Can I record my screen with no camera and no voice at all?', a: 'Yes — leave both "Include microphone" and "Include webcam" unchecked and start recording. You get a silent screen-only capture, which you can narrate over later in Video Editor if you want.' },
  { q: 'Where does the webcam picture-in-picture come from technically?', a: 'Your webcam feed is composited live onto a canvas every frame — the screen share drawn full-frame, your camera drawn into a rounded, bordered box in the corner you picked — and that canvas becomes the recorded video. This is the only way the picture-in-picture survives into a single downloadable file, and it all happens locally.' },
  { q: 'Can I choose where the webcam box appears?', a: 'Yes — four corner presets (top-left, top-right, bottom-left, bottom-right) plus a size slider, set before you start recording. The position is baked into the video\'s pixels at capture time, so it can\'t be moved after you\'ve started.' },
  { q: 'What happens after I stop recording?', a: 'You get a preview of the finished recording right in the page, with two options: Download it as a .webm file, or click "Open in Video Editor" to send it straight into Video Editor for trimming, composition, captions, and export — without a manual download-then-reupload round trip.' },
  { q: 'How does "Open in Video Editor" work without uploading my recording?', a: 'The recording is handed off entirely within your browser using the Cache Storage API — the same local mechanism Convertam already uses to send an extracted audio track from Video Studio to Audio Studio. It never touches a server; Video Editor just picks the file up the moment it loads.' },
  { q: 'Does it capture system/tab audio too?', a: 'It can, depending on your browser and OS, using your browser\'s own screen-sharing permission — that\'s separate from the microphone. On macOS, Chrome can only capture a single browser tab\'s own audio this way, never your whole screen or system sound; Windows generally supports sharing full system audio. If you turn on the microphone, that\'s captured independently and mixed in regardless of what system audio is or isn\'t available.' },
  { q: 'Can I record a specific window or tab instead of my whole screen?', a: 'Yes — when you click Start Recording, your browser\'s own screen-sharing picker lets you choose your entire screen, a specific application window, or a single browser tab.' },
  { q: 'Does Convertam store my recording?', a: 'No. Recording, preview, download, and the handoff to Video Editor all happen locally in your browser. Your screen, microphone, and webcam are never uploaded anywhere.' },
  { q: 'What format is the recording?', a: 'A .webm file (VP9 or VP8 video with Opus audio, whichever your browser supports), downloadable directly or usable straight in Video Editor, which can export it to MP4.' },
  { q: 'Can I stop the recording early?', a: 'Yes — click the in-app Stop Recording button, or use your browser\'s own "Stop sharing" control; either one ends the recording the same way.' },
  { q: 'Why is my recording silent even though I shared audio?', a: 'A live per-source checklist appears the moment recording starts, showing exactly what was captured (screen video, microphone, system/tab audio, webcam) — check it if something seems off. The most common cause is a browser/OS limitation on system audio sharing (see the system/tab audio question above), not a bug; turning on the microphone sidesteps that entirely.' },
];

export default function ScreenRecorderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/media-workspace" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Media Workspace</Link>

          <div style={{ maxWidth: 760, margin: '0 auto 32px', textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Screen Recorder</h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6 }}>
              Record your screen, a window, or a browser tab directly in your browser — with an optional microphone and an optional webcam picture-in-picture. Nothing is ever uploaded; download the finished recording or send it straight into Video Editor.
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: '28px 20px', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: 56, maxWidth: 640, margin: '0 auto 56px' }}>
            <ScreenRecorderWorkspace />
          </div>

          <article style={{ maxWidth: 760, margin: '0 auto', color: '#334155', lineHeight: 1.75, fontSize: '0.95rem' }}>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What is Screen Recorder?</h2>
              <p>
                Screen Recorder is a free, browser-based screen capture tool. Click Start, pick your screen, a window, or a tab in your browser&apos;s own sharing prompt, and record — with your microphone, your webcam as a picture-in-picture overlay, both, or neither, entirely your choice. It&apos;s a dedicated tool for <strong>creating</strong> a new recording, separate from Video Editor, which is for <strong>editing</strong> existing video — the two stay connected through a one-click &quot;Open in Video Editor&quot; handoff once you&apos;re done recording.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>What can Screen Recorder do?</h2>
              <ul style={ul}>
                <li><strong>Screen, window, or tab capture</strong> — your browser&apos;s own screen-sharing prompt lets you pick exactly what to record.</li>
                <li><strong>Optional microphone</strong> — narrate over your recording, on by default with a genuine off switch. Mixed together with any system/tab audio your browser shares, so both survive in the final recording.</li>
                <li><strong>Optional webcam picture-in-picture</strong> — show your face in a movable, resizable corner box over the screen recording, or leave it off entirely for a screen-only capture.</li>
                <li><strong>Live capture checklist</strong> — see exactly what&apos;s actually being captured (screen video, microphone, system audio, webcam) the moment recording starts, so you know immediately if something didn&apos;t come through.</li>
                <li><strong>Instant preview</strong> — watch the finished recording right on the page before you decide what to do with it.</li>
                <li><strong>Download</strong> — save the recording as a .webm file directly to your device.</li>
                <li><strong>Open in Video Editor</strong> — send the recording straight into Video Editor for trimming, composition, captions, and MP4 export, with no manual re-upload.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Microphone and system audio, captured independently</h2>
              <p>
                A browser&apos;s screen-share permission only ever grants access to <strong>system/tab audio</strong> — never your microphone, no matter what you check in the sharing picker. Screen Recorder requests your microphone completely separately (a distinct permission, a distinct on/off checkbox), then mixes the two together in real time so narrating over a recording works regardless of whether system audio sharing is even available on your platform. Leave the microphone off and share a source with no system audio and you get a genuinely silent screen recording — nothing is captured that you didn&apos;t explicitly allow.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Webcam picture-in-picture</h2>
              <p>
                Turning on &quot;Include webcam&quot; adds a second, independent camera capture, composited live onto a canvas every frame — your screen full-frame underneath, your webcam in a rounded, bordered box in whichever corner you pick, at whichever size you set with the slider. That canvas becomes the actual recorded video, which is the only way the picture-in-picture survives into a single downloadable file. Camera is completely optional and off by default — screen-only, or screen-plus-voice, recordings work exactly the same whether or not a webcam is ever involved.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>From recording to editing, without leaving your browser</h2>
              <p>
                Once you stop recording, &quot;Open in Video Editor&quot; hands the finished file straight to Video Editor using a local, same-browser handoff — no upload, no manual download-then-reupload step. Video Editor picks it up the instant it loads and drops it onto the timeline as your main video, ready to trim, add a second video or webcam overlay, apply captions, and export. If you&apos;d rather just keep the raw recording, Download saves it as a .webm file with no extra steps.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Common use cases</h2>
              <ul style={ul}>
                <li><strong>Tutorials and how-tos</strong> — narrate over your screen while walking through a process.</li>
                <li><strong>Product demos</strong> — record an app or website with your face in the corner for a personal touch.</li>
                <li><strong>Bug reports</strong> — capture exactly what&apos;s happening on screen to share with a teammate.</li>
                <li><strong>Quick explainer clips</strong> — record, then trim and export in Video Editor without leaving your browser.</li>
                <li><strong>Silent screen captures</strong> — record with no microphone and no camera, then add narration or captions later in Video Editor.</li>
              </ul>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Supported formats</h2>
              <p>Recordings save as .webm (VP9 or VP8 video with Opus audio, whichever your browser supports). Open one in Video Editor to export it as MP4.</p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Privacy and temporary processing</h2>
              <p>
                Recording, preview, download, and the handoff to Video Editor all happen locally in your browser — your screen, microphone, and webcam are never uploaded anywhere. The &quot;Open in Video Editor&quot; handoff uses your browser&apos;s own local Cache Storage, not a server round trip, and clears itself out once Video Editor has picked the recording up.
              </p>
            </section>

            <section style={{ marginBottom: 36 }}>
              <h2 style={sectionH2}>Limitations</h2>
              <ul style={ul}>
                <li><strong>System/tab audio depends on your platform:</strong> Chrome on macOS can only capture a single browser tab&apos;s own audio this way, never your whole screen or system sound, regardless of what you check in the share picker; Windows generally supports sharing full system audio. The microphone is unaffected by this and works the same everywhere.</li>
                <li><strong>Webcam position is fixed once you start:</strong> the corner and size are set before recording begins and baked into the video&apos;s pixels at capture time — there&apos;s no dragging it mid-recording, and no way to move or resize it afterward.</li>
                <li><strong>No pause/resume:</strong> Stop ends the recording; there&apos;s no pause-and-continue within a single recording.</li>
                <li><strong>Browser support:</strong> requires a browser with screen-capture support (a recent Chrome or Edge); Safari and Firefox support varies.</li>
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
              <Link href="/audio-studio" style={relatedLink}>Audio Studio →</Link>
              <Link href="/media-workspace" style={relatedLink}>All Media Workspace →</Link>
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
