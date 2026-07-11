// Shared by both AI Presentation Generator and AI Data Analyst (via its
// "Create Presentation" option) — one real .pptx builder, not two copies
// that could quietly drift apart.

export const PPTX_THEMES = {
  modern: {
    label: 'Modern Professional',
    fontFace: 'Calibri',
    bg: 'FFFFFF',
    titleSlideBg: '1E3A8A',
    titleColor: '1E3A8A',
    accentColor: '2563EB',
    bodyColor: '1F2937',
    lightBg: 'F3F4F6',
  },
  academic: {
    label: 'Minimal Academic',
    fontFace: 'Georgia',
    bg: 'FFFFFF',
    titleSlideBg: '111827',
    titleColor: '111827',
    accentColor: '4B5563',
    bodyColor: '1F2937',
    lightBg: 'F9FAFB',
  },
  corporate: {
    label: 'Corporate Blue',
    fontFace: 'Arial',
    bg: 'FFFFFF',
    titleSlideBg: '0C2D57',
    titleColor: 'FFFFFF',
    accentColor: '0C2D57',
    bodyColor: '1F2937',
    lightBg: 'E8EEF7',
  },
};

// outline: { title, subtitle, slides: [{ type, title, subtitle, bullets, speakerNotes, sourceFiles }] }
// options: { themeKey, includeSources }
export async function buildPptxFromOutline(outline, { themeKey = 'modern', includeSources = false } = {}) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  const theme = PPTX_THEMES[themeKey] || PPTX_THEMES.modern;
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.63 });
  pptx.layout = 'WIDE';

  let slideNum = 0;
  const totalContentSlides = outline.slides.filter((s) => s.type === 'content').length;

  outline.slides.forEach((slideData) => {
    const slide = pptx.addSlide();
    if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);

    if (slideData.type === 'title') {
      slide.background = { color: theme.titleSlideBg };
      slide.addText(outline.title || slideData.title || 'Untitled Presentation', {
        x: 0.6, y: 2.0, w: 8.8, h: 1.2, fontFace: theme.fontFace, fontSize: 36, bold: true,
        color: 'FFFFFF', align: 'center',
      });
      if (outline.subtitle || slideData.subtitle) {
        slide.addText(outline.subtitle || slideData.subtitle, {
          x: 0.6, y: 3.2, w: 8.8, h: 0.6, fontFace: theme.fontFace, fontSize: 18,
          color: 'D1D5DB', align: 'center',
        });
      }
    } else if (slideData.type === 'section') {
      slide.background = { color: theme.accentColor };
      slide.addText(slideData.title, {
        x: 0.6, y: 2.3, w: 8.8, h: 1, fontFace: theme.fontFace, fontSize: 30, bold: true,
        color: 'FFFFFF', align: 'center',
      });
    } else if (slideData.type === 'closing') {
      slide.background = { color: theme.titleSlideBg };
      slide.addText(slideData.title || 'Thank You', {
        x: 0.6, y: 2.0, w: 8.8, h: 1, fontFace: theme.fontFace, fontSize: 34, bold: true,
        color: 'FFFFFF', align: 'center',
      });
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, { x: 0.6, y: 3.0, w: 8.8, h: 0.6, fontFace: theme.fontFace, fontSize: 16, color: 'D1D5DB', align: 'center' });
      }
    } else {
      slideNum++;
      slide.background = { color: theme.bg };
      slide.addText(slideData.title || '', {
        x: 0.5, y: 0.35, w: 9, h: 0.7, fontFace: theme.fontFace, fontSize: 26, bold: true, color: theme.titleColor,
      });
      slide.addShape('rect', { x: 0.5, y: 1.05, w: 9, h: 0.035, fill: { color: theme.accentColor } });

      const bullets = (slideData.bullets || []).map((b) => ({ text: b, options: { bullet: { code: '25CF' }, color: theme.bodyColor, fontFace: theme.fontFace, fontSize: 16, breakLine: true, paraSpaceAfter: 10 } }));
      if (bullets.length) {
        slide.addText(bullets, { x: 0.6, y: 1.4, w: 8.8, h: 3.6 });
      }

      if (includeSources && slideData.sourceFiles?.length) {
        slide.addText(`Source: ${slideData.sourceFiles.join(', ')}`, {
          x: 0.5, y: 5.25, w: 6, h: 0.3, fontFace: theme.fontFace, fontSize: 9, italic: true, color: '9CA3AF',
        });
      }
      slide.addText(`${slideNum} / ${totalContentSlides}`, {
        x: 8.7, y: 5.25, w: 0.8, h: 0.3, fontFace: theme.fontFace, fontSize: 9, color: '9CA3AF', align: 'right',
      });
    }
  });

  return pptx;
}
