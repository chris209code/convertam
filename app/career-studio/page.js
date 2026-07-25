import ToolHubClient from '../../components/ToolHubClient';
import { CareerIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Career Studio — Convertam',
  description: 'AI-assisted resume, CV, and cover letter tools. Build, improve and tailor your job application documents. Free, no login required.',
};

const SECTIONS = [
  {
    id: 'all',
    label: 'All Career Tools',
    icon: '🎓',
    tools: [
      { slug: 'resume-builder', title: 'Resume Builder', desc: 'A guided, AI-assisted CV builder for starting from scratch', icon: '🛠️', badge: 'free' },
      { slug: 'cv-improver', title: 'CV Improver', desc: 'Upload your CV and AI rewrites and improves it', icon: '📄', badge: 'free' },
      { slug: 'cover-letter', title: 'Cover Letter Writer', desc: 'Generate a professional cover letter with AI', icon: '✉️', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

export default function CareerStudioPage() {
  return (
    <ToolHubClient
      accent={CATEGORY_ACCENTS.career}
      icon={CareerIcon}
      title="Career Studio"
      subtitle="Build, improve and tailor your resume, CV and cover letter — powered by AI."
      sections={SECTIONS_WITH_HREF}
    />
  );
}
