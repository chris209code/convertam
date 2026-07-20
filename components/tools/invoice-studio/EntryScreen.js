'use client';

import { ArrowRight } from 'lucide-react';
import { DOC_TYPES, FLOW_SEQUENCE, docTypeConfig } from '@/lib/invoice-studio/docTypes';

const DOC_TYPE_ICON = { invoice: '🧾', quotation: '📋', 'delivery-note': '📦', waybill: '🚚' };

function FlowStep({ label, isFirst }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {!isFirst && <ArrowRight size={14} color="#94A3B8" />}
      <div style={{ padding: '6px 12px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontSize: 12.5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export default function EntryScreen({ onStartFlow, onSelectSingle }) {
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '48px 48px 64px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 880 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 28, color: '#0F172A', marginBottom: 8 }}>
            Business Document Studio
          </div>
          <div style={{ fontSize: 14.5, color: '#6B7280', maxWidth: 520, margin: '0 auto' }}>
            Create invoices, quotations, delivery notes and waybills from one professional workspace.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Option A: Start a Business Document Flow */}
          <button
            type="button" onClick={onStartFlow}
            style={{
              flex: '1 1 380px', textAlign: 'left', cursor: 'pointer', font: 'inherit', padding: 28, borderRadius: 16,
              border: '1px solid #E2E6ED', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,.03)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>
                Start a Business Document Flow
              </div>
              <div style={{ fontSize: 12.5, color: '#8891A0', lineHeight: 1.5 }}>
                Move through the full business process — each document carries its data into the next.
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {FLOW_SEQUENCE.map((t, i) => (
                <FlowStep key={t} label={docTypeConfig(t).label} isFirst={i === 0} />
              ))}
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontSize: 13, fontWeight: 700 }}>
              Start with {docTypeConfig(FLOW_SEQUENCE[0]).label} <ArrowRight size={15} />
            </div>
          </button>

          {/* Option B: Create a Single Document */}
          <div
            style={{
              flex: '1 1 380px', padding: 28, borderRadius: 16, border: '1px solid #E2E6ED', background: '#fff',
              boxShadow: '0 1px 2px rgba(15,23,42,.03)', display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A', marginBottom: 6 }}>
                Create a Single Document
              </div>
              <div style={{ fontSize: 12.5, color: '#8891A0', lineHeight: 1.5 }}>
                Pick one document type, edit it directly, and download — no need to follow the full sequence.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {DOC_TYPES.map((t) => (
                <button
                  key={t} type="button" onClick={() => onSelectSingle(t)}
                  style={{
                    cursor: 'pointer', font: 'inherit', padding: '16px 14px', borderRadius: 12, border: '1px solid #E7EAF0',
                    background: '#F7F8FA', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{DOC_TYPE_ICON[t]}</span>
                  <span style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                    {docTypeConfig(t).label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
