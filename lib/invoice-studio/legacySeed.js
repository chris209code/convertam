import { LEGACY_BIZ_PROFILE_KEY } from './constants';

// Read-only lookup of the classic Invoice Generator's saved business profile
// (name/tagline/address/phone/email/logo). Used once, to seed a freshly
// opened Invoice Studio template for returning users — never written to or
// cleared, since the legacy tool still owns that key until it's retired.
export function readLegacyBizProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_BIZ_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.biz) return null;
    return {
      name: parsed.biz.name || '',
      tagline: parsed.biz.tagline || '',
      address: parsed.biz.address || '',
      phone: parsed.biz.phone || '',
      email: parsed.biz.email || '',
      logoDataUrl: parsed.logo || null,
    };
  } catch {
    return null;
  }
}
