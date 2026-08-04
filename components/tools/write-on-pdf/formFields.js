'use client';

import { RENDER_SCALE } from './constants';

// Tier 1 of Write on PDF's priority order: a real interactive AcroForm field
// always wins over detected blanks/labels or free-positioned text, because
// filling it is genuine editing of that field's own value — not an overlay.
// pdf-lib's form API (already used by components/tools/FillPdfWorkspace.js)
// gives fields and their values, but not page position; getting a field's
// on-page rectangle takes one extra step pdf-lib doesn't expose directly:
// mapping each widget annotation back to the page whose /Annots array
// contains it. See the project plan for verification of this approach.
function buildRefToPageIndex(pages) {
  const map = new Map();
  pages.forEach((page, i) => {
    const annots = page.node.Annots();
    if (!annots) return;
    for (let j = 0; j < annots.size(); j++) map.set(annots.get(j).toString(), i);
  });
  return map;
}

function buildDictToRef(pdfDoc) {
  const map = new Map();
  for (const [ref, obj] of pdfDoc.context.enumerateIndirectObjects()) map.set(obj, ref);
  return map;
}

// Reads a page-space (RENDER_SCALE canvas px, top-left origin) rectangle
// from a widget's PDF-space (points, bottom-left origin) rectangle.
function widgetRectToPageSpace(widget, pageHeightPt) {
  const r = widget.getRectangle();
  return {
    x: r.x * RENDER_SCALE,
    y: (pageHeightPt - r.y - r.height) * RENDER_SCALE,
    w: r.width * RENDER_SCALE,
    h: r.height * RENDER_SCALE,
  };
}

// Detects every real AcroForm field in a loaded pdf-lib PDFDocument and
// returns one entry per widget (a field can have multiple widgets — e.g.
// each option in a radio group is its own widget at its own position) with
// a page-space rectangle, ready for Stage.js to render as a fixed-position
// input. Returns [] for PDFs with no form, or a malformed/missing AcroForm
// dict (caller doesn't need to special-case that — it's the same as "no
// fields", which just falls through to tiers 2/3).
export function detectFormFields(pdfDoc) {
  let form;
  try {
    form = pdfDoc.getForm();
  } catch {
    return [];
  }
  const fields = form.getFields();
  if (!fields.length) return [];

  const pages = pdfDoc.getPages();
  const refToPageIndex = buildRefToPageIndex(pages);
  const dictToRef = buildDictToRef(pdfDoc);

  const out = [];
  fields.forEach((field) => {
    const name = field.getName();
    const typeName = field.constructor.name; // PDFTextField | PDFCheckBox | PDFDropdown | PDFOptionList | PDFRadioGroup | PDFSignature
    let options;
    if (typeName === 'PDFDropdown' || typeName === 'PDFOptionList' || typeName === 'PDFRadioGroup') {
      try { options = field.getOptions(); } catch { options = []; }
    }
    let widgets;
    try { widgets = field.acroField.getWidgets(); } catch { widgets = []; }

    widgets.forEach((widget, widgetIndex) => {
      const ref = dictToRef.get(widget.dict);
      const pageIndex = ref ? refToPageIndex.get(ref.toString()) : undefined;
      if (pageIndex === undefined) return; // orphaned widget (not on any page) — skip

      let value;
      if (typeName === 'PDFRadioGroup') {
        // Which option a given widget represents isn't uniform across PDF
        // authoring tools: some (typically hand-authored/Acrobat PDFs) name
        // each widget's own "on" appearance state directly after the human-
        // readable option text, so it's already one of field.getOptions().
        // Others (notably pdf-lib's own createRadioGroup/addOptionToPage)
        // always name widget appearance states by index ("0", "1", ...)
        // and keep the real option text in a separate field-level /Opt
        // array pdf-lib doesn't expose a direct per-widget lookup for. Try
        // the direct (common, non-pdf-lib-authored) case first; fall back
        // to positional order against getOptions() otherwise — a
        // best-effort heuristic, not a guaranteed-correct mapping, but it
        // covers both cases seen in practice.
        let raw;
        try { raw = widget.getOnValue()?.decodeText(); } catch { raw = undefined; }
        value = (raw && options?.includes(raw)) ? raw : options?.[widgetIndex];
      }

      const rect = widgetRectToPageSpace(widget, pages[pageIndex].getHeight());
      out.push({
        id: `${name}__${widgetIndex}`,
        name,
        type: typeName,
        page: pageIndex,
        multiline: typeName === 'PDFTextField' ? !!(field.isMultiline && field.isMultiline()) : false,
        options,
        value,
        ...rect,
      });
    });
  });
  return out;
}

export function hitTestFormField(pos, field) {
  return pos.x >= field.x && pos.x <= field.x + field.w && pos.y >= field.y && pos.y <= field.y + field.h;
}

// Writes collected field values onto a pdfDoc at export time and flattens
// the form — the exact sequence FillPdfWorkspace.js already uses, so a PDF
// with fields behaves identically whichever tool filled it in. `pdfDoc` here
// must be a document loaded from the *same original bytes* the field list
// was detected from (a fresh load at export time, not the detection-time
// instance) since detection happens once at upload and export happens once
// per download.
export function applyFormFieldValues(pdfDoc, values) {
  let form;
  try {
    form = pdfDoc.getForm();
  } catch {
    return;
  }
  const fieldsByName = new Map(form.getFields().map((f) => [f.getName(), f]));

  Object.entries(values).forEach(([name, value]) => {
    if (value === undefined || value === null || value === '') return;
    const field = fieldsByName.get(name);
    if (!field) return;
    const typeName = field.constructor.name;
    try {
      if (typeName === 'PDFTextField') {
        field.setText(String(value));
      } else if (typeName === 'PDFCheckBox') {
        if (value) field.check(); else field.uncheck();
      } else if (typeName === 'PDFDropdown' || typeName === 'PDFOptionList') {
        field.select(value);
      } else if (typeName === 'PDFRadioGroup') {
        field.select(value);
      }
      // PDFSignature fields are handled separately (Phase 3, once a
      // captured signature image can be drawn into the widget's rectangle)
      // — pdf-lib doesn't support real cryptographic PDF signing, so this
      // tier is always a visual placement, never a digital signature.
    } catch {
      // Value rejected by the field (e.g. an option not in its list) —
      // skip it rather than failing the whole export over one bad field.
    }
  });

  form.flatten();
}

// Deliberately no width/height here — every field element below sets
// `position: absolute` directly on itself (not on a wrapper div), so this
// object is spread alongside the caller's own left/top/width/height rather
// than nested inside it. A 100%/100% default here would resolve against
// the nearest positioned ANCESTOR (the whole scaled page), not the field's
// own rect, silently blowing every field up to near full-page size.
const fieldBoxStyle = {
  boxSizing: 'border-box',
  border: '1.5px solid #2563EB', borderRadius: 3, background: 'rgba(37,99,235,0.06)',
  padding: '0 4px', font: '14px inherit', color: '#0F172A', outline: 'none',
};

// Renders one real AcroForm field widget as a fixed-position DOM control —
// not draggable/resizable via TransformableBox, since this is a real field
// at a fixed position in the PDF, not a placed object. Tier 1 of the
// priority order: mounting these above the canvas means a click here is a
// click on this input, not the canvas — Stage's free-text click handler
// never fires for these positions, so no separate hit-test/routing code is
// needed for the priority ordering to hold.
export function FormFieldNode({ field, value, onChange }) {
  const style = { position: 'absolute', left: field.x, top: field.y, width: field.w, height: field.h };

  if (field.type === 'PDFTextField') {
    if (field.multiline) {
      return (
        <textarea style={{ ...style, ...fieldBoxStyle, resize: 'none', lineHeight: 1.3 }} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      );
    }
    return (
      <input type="text" style={{ ...style, ...fieldBoxStyle }} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    );
  }

  if (field.type === 'PDFCheckBox') {
    const checked = !!value;
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{ ...style, ...fieldBoxStyle, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        aria-pressed={checked}
      >
        {checked && <span style={{ fontSize: Math.max(10, field.h * 0.7), lineHeight: 1, color: '#2563EB', fontWeight: 700 }}>✓</span>}
      </button>
    );
  }

  if (field.type === 'PDFDropdown' || field.type === 'PDFOptionList') {
    return (
      <select style={{ ...style, ...fieldBoxStyle, cursor: 'pointer' }} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">— select —</option>
        {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (field.type === 'PDFRadioGroup') {
    const checked = value === field.value;
    return (
      <button
        type="button"
        onClick={() => onChange(field.value)}
        style={{ ...style, ...fieldBoxStyle, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        aria-pressed={checked}
        title={field.value}
      >
        {checked && <span style={{ width: '45%', height: '45%', borderRadius: '50%', background: '#2563EB' }} />}
      </button>
    );
  }

  if (field.type === 'PDFSignature') {
    // Signature fields become fillable once SignaturePad is wired in
    // (Quick Insert toolbar phase) — even a visual placement into this box
    // is never a real cryptographic PDF signature, since pdf-lib doesn't
    // support signing; labeled honestly rather than left blank/confusing.
    return (
      <div style={{ ...style, ...fieldBoxStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748B', background: 'rgba(100,116,139,0.08)', borderStyle: 'dashed', borderColor: '#94A3B8' }}>
        Signature field
      </div>
    );
  }

  return null;
}
