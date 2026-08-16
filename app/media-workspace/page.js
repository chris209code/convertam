import MediaWorkspaceLanding from '@/components/MediaWorkspaceLanding';
import { relatedSuites } from '@/components/categoryVisuals';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Media Workspace — Convertam';
const DESCRIPTION = 'Edit, transcribe, caption, convert and compose audio & video — privately in your browser.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/media-workspace' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/media-workspace' }),
};

const RELATED_CATEGORIES = relatedSuites('media-workspace');

export default function MediaWorkspacePage() {
  return <MediaWorkspaceLanding relatedCategories={RELATED_CATEGORIES} />;
}
