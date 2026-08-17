import CategoryLandingClient from '@/components/CategoryLandingClient';
import { MediaIcon, CATEGORY_ACCENTS, relatedSuites } from '@/components/categoryVisuals';
import { buildOgMeta } from '@/lib/pageMetadata';
import { SECTIONS } from '@/lib/toolSections/mediaWorkspace';

const TITLE = 'Media Workspace — Convertam';
const DESCRIPTION = 'Create, edit, transcribe, subtitle, and transform audio & video — screen recording, non-destructive video editing, and split-screen or picture-in-picture composition, all in your browser.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/media-workspace' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/media-workspace' }),
};

const EDITORIAL = {
  intro: [
    "Media Workspace is where audio and video actually get worked on — not just converted from one format to another, but recorded, transcribed, captioned, trimmed, and composed into something new. Record your screen with an optional mic and webcam, turn a voice memo into an editable transcript and a captioned video, extract and subtitle the audio track of a video, or cut, reorder, and compose a split-screen or picture-in-picture video from any number of clips — all without installing anything.",
    'Everything runs client-side in your browser using a real video engine (ffmpeg, self-hosted): audio and video files are decoded, edited, and re-encoded on your own device. Nothing is uploaded for editing — the only data that ever leaves your device is the audio sent to transcription, and only when you explicitly ask for a transcript.',
  ],
  whoFor: [
    'Anyone recording a tutorial, demo, or bug report from their screen',
    'Anyone who needs a written transcript or SRT/VTT captions from an audio or video file',
    'Creators turning raw footage into a trimmed, captioned, or composed final cut',
    'Anyone building a split-screen, picture-in-picture, or multi-participant video-call layout',
  ],
  learnLinks: [],
};

const FAQS = [
  {
    q: 'Do I need to install anything to record or edit video?',
    a: 'No — Screen Recorder, Video Editor, Video Studio, and Audio Studio all run entirely in your browser using a self-hosted video engine. There\'s nothing to install and no login required.',
  },
  {
    q: 'Is my audio or video uploaded to a server?',
    a: 'Recording, editing, trimming, composing, and caption burn-in all happen locally on your device — the file itself is never uploaded. The one exception is transcription: when you ask for a transcript, the audio is sent for processing and is not stored afterward.',
  },
  {
    q: 'Can I combine two videos into a split-screen or picture-in-picture layout?',
    a: 'Yes — Video Editor supports side-by-side, top/bottom, and picture-in-picture (video-call style) composition from any number of video or image overlays, with draggable positioning and real MP4 export.',
  },
  {
    q: 'Can I move work between these tools?',
    a: 'Yes — Screen Recorder\'s "Open in Video Editor" hands a finished recording straight to Video Editor\'s timeline, and Video Studio\'s Extract Audio can hand the extracted WAV straight to Audio Studio, both without a manual download-and-reupload.',
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: t.href || `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('media-workspace');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function MediaWorkspacePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.media}
        icon={MediaIcon}
        title="Media Workspace"
        subtitle="Record, edit, transcribe, subtitle, and transform audio & video."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
