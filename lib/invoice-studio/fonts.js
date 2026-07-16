// Loaded only where Invoice Studio components apply these `variable` classes —
// this does not touch the site-wide fonts set up in app/layout.js.
import { Poppins, Inter, Caveat } from 'next/font/google';

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--cs-font-poppins',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--cs-font-inter',
  display: 'swap',
});

export const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--cs-font-caveat',
  display: 'swap',
});

// Design-panel font choices map to real CSS font-family stacks. Poppins/Inter
// resolve through the next/font variables above; Georgia/Arial are system fonts.
export const HEADING_FONT_OPTIONS = ['Poppins', 'Georgia', 'Arial'];
export const BODY_FONT_OPTIONS = ['Inter', 'Georgia', 'Arial'];

export function fontStack(name) {
  if (name === 'Poppins') return 'var(--cs-font-poppins), Poppins, sans-serif';
  if (name === 'Inter') return 'var(--cs-font-inter), Inter, sans-serif';
  if (name === 'Georgia') return 'Georgia, serif';
  return 'Arial, Helvetica, sans-serif';
}

export const SIGNATURE_FONT_STACK = 'var(--cs-font-caveat), Caveat, cursive';
