// Tool metadata for the Career Studio hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
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
