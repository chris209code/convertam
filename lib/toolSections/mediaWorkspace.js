// Tool metadata for the Media Workspace hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module. These tools live at flat
// top-level routes (/video-editor, not /media-workspace/video-editor or
// /data-tools/video-editor) just like every other suite's tools, so no
// entry needs its own href — page.js derives `/${slug}` for all of them.
export const SECTIONS = [
  {
    id: 'media-workspace',
    label: 'Media Workspace',
    icon: '🎬',
    tools: [
      { slug: 'video-editor', title: 'Video Editor', desc: 'Trim, split, join, reorder and undo/redo clips on a real timeline, then compose split-screen, top/bottom, picture-in-picture or video-call layouts — with draggable image or video overlays and full audio mixing.', icon: '✂️' },
      { slug: 'screen-recorder', title: 'Screen Recorder', desc: 'Record your screen, window, or browser tab, with an optional microphone and an optional webcam picture-in-picture — then open the recording straight in Video Editor.', icon: '🎥' },
      { slug: 'audio-studio', title: 'Audio Studio', desc: 'Transcribe audio to an editable transcript, generate SRT/VTT/TXT captions, and turn audio into a captioned video or audiogram.', icon: '🎙️' },
      { slug: 'recording-studio', title: 'Recording Studio', desc: 'A real multitrack recorder and mixer — record and overdub multiple tracks, edit clips on a timeline, mix with per-track effects and noise reduction, then export as WAV or MP3.', icon: '🎛️' },
      { slug: 'voice-over', title: 'Voice Over', desc: 'Record a microphone narration over a video while it plays, mix it with the original audio, clean up noise, and export a real MP4 with your voice-over included.', icon: '🎤' },
      { slug: 'video-studio', title: 'Video Studio', desc: 'Extract audio from any video, transcribe it, and burn real subtitles directly into the footage.', icon: '🎬' },
      { slug: 'compress-video', title: 'Compress & Split Video', desc: 'Shrink an oversized video or cut it into smaller parts — accepts files up to 2GB, well past the other tools\' 500MB limit, for exactly this purpose. Send the result straight into Video Editor.', icon: '🗜️' },
    ],
  },
];
