import CategoryLandingClient from '../../components/CategoryLandingClient';
import { CareerIcon, CATEGORY_ACCENTS, relatedSuites } from '../../components/categoryVisuals';
import { buildOgMeta } from '../../lib/pageMetadata';

const TITLE = 'Career Studio — Convertam';
const DESCRIPTION = 'AI-assisted CV, resume, cover letter and LinkedIn tools. Build or improve your CV, generate a matching cover letter, and optimize your LinkedIn profile. Free, no login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/career-studio' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/career-studio' }),
};

const EDITORIAL = {
  intro: [
    "A job application usually needs the same two or three documents — a CV, sometimes a cover letter, and increasingly a strong LinkedIn profile — done well and tailored to the actual role. Career Studio covers all of it: CV Improver takes a CV you already have and tightens, restructures, and tailors it toward a specific position; Resume Builder guides you through building one from nothing, question by question, for anyone starting with a blank page. Cover Letter Writer generates a matching letter from your background and the job description, and LinkedIn Optimizer strengthens your profile's headline, About, experience and skills sections with the same target role in mind.",
    'Every rewrite is grounded in what you actually provide — none of these tools invent experience, employers, or achievements on your behalf. CV Improver keeps AI scoring and suggestions in a separate "Professional Review" panel so the CV itself only ever contains finished, ready-to-send content, and every suggested rewrite requires your explicit approval before it changes anything.',
  ],
  whoFor: [
    'Job seekers tailoring an existing CV to a specific role',
    'Students and first-time job seekers with no CV to start from',
    'Anyone applying for several roles who needs a matching cover letter each time',
    'Career changers repositioning existing experience for a new industry',
    'Anyone whose LinkedIn profile hasn\'t kept up with their CV',
  ],
  learnLinks: [
    { title: 'Can AI Actually Improve Your Resume?', href: '/learn/ai-guides/can-ai-actually-improve-your-resume' },
  ],
};

const FAQS = [
  {
    q: "What's the difference between CV Improver and Resume Builder?",
    a: 'CV Improver rewrites and tailors a CV you already have. Resume Builder guides you through building one from scratch by answering simple questions — use it if you have nothing written down yet.',
  },
  {
    q: 'Will the AI invent experience or achievements I didn\'t provide?',
    a: "No — both tools only ever work with what you actually give them. CV Improver's suggested rewrites require you to explicitly apply each one, and Resume Builder writes stronger phrasing around your own descriptions rather than fabricating roles or results.",
  },
  {
    q: 'Are these tools free?',
    a: 'Yes — CV Improver, Resume Builder, Cover Letter Writer, and LinkedIn Optimizer are all completely free, with no login required.',
  },
  {
    q: 'Can I download my CV as a Word document, not just PDF?',
    a: 'Yes — both CV Improver and Resume Builder offer a "Download as Word (.docx)" option generated directly from your CV\'s real structure, alongside the PDF download.',
  },
  {
    q: 'Does LinkedIn Optimizer need my whole profile, or can I optimize one section at a time?',
    a: 'Either — paste just your headline, your About section, your experience, or your skills and optimize only that section, or fill in everything and optimize your entire profile in one pass.',
  },
];

const SECTIONS = [
  {
    id: 'all',
    label: 'Career Studio Tools',
    icon: '🎯',
    tools: [
      { slug: 'cv-improver', title: 'CV Improver', desc: 'Upload your existing CV and AI tailors it into a stronger, ATS-friendly version', icon: '📄', badge: 'free' },
      { slug: 'resume-builder', title: 'Resume Builder', desc: 'A guided, AI-assisted CV builder for starting from scratch', icon: '🛠️', badge: 'free' },
      { slug: 'cover-letter', title: 'Cover Letter Writer', desc: 'Generate a tailored, professional cover letter with AI', icon: '✉️', badge: 'free' },
      { slug: 'linkedin-optimizer', title: 'LinkedIn Optimizer', desc: 'Strengthen your headline, About, experience and skills with AI', icon: '💼', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('career-studio');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function CareerStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.career}
        icon={CareerIcon}
        title="Career Studio"
        subtitle="AI-assisted CV, resume, cover letter and LinkedIn tools — tailor what you have, or build from scratch."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
