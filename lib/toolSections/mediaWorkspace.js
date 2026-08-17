// Tool metadata for the Media Workspace hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module. Unlike most other suites,
// these tools live under /data-tools/* rather than a flat /<slug> route, so
// each entry sets its own href instead of relying on page.js to derive one.
export const SECTIONS = [
  {
    id: 'media-workspace',
    label: 'Media Workspace',
    icon: '🎬',
    tools: [
      { slug: 'video-editor', title: 'Video Editor', desc: 'Trim, split, join, reorder and undo/redo clips on a real timeline, then compose split-screen, top/bottom, picture-in-picture or video-call layouts — with draggable image or video overlays and full audio mixing.', icon: '✂️', href: '/data-tools/video-editor' },
      { slug: 'screen-recorder', title: 'Screen Recorder', desc: 'Record your screen, window, or browser tab, with an optional microphone and an optional webcam picture-in-picture — then open the recording straight in Video Editor.', icon: '🎥', href: '/data-tools/screen-recorder' },
      { slug: 'audio-studio', title: 'Audio Studio', desc: 'Transcribe audio to an editable transcript, generate SRT/VTT/TXT captions, and turn audio into a captioned video or audiogram.', icon: '🎙️', href: '/data-tools/audio-studio' },
      { slug: 'video-studio', title: 'Video Studio', desc: 'Extract audio from any video, transcribe it, and burn real subtitles directly into the footage.', icon: '🎬', href: '/data-tools/video-studio' },
    ],
  },
];
