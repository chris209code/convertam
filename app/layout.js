import './globals.css';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import Script from 'next/script';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const GA_ID = 'G-1GVMCT8YX3';

const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});
const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata = {
  metadataBase: new URL('https://convertam.app'),
  title: {
    default: 'Convertam — Free File Conversion. No Login. No Watermark.',
    template: '%s | Convertam',
  },
  description:
    'Free online file conversion — PDF to Word, Word to PDF, Excel, PowerPoint, Merge PDF, Sign PDF, Invoice Generator and more. No login, no watermark, no subscription.',
  keywords: [
    'pdf to word', 'word to pdf', 'pdf converter', 'free pdf converter',
    'merge pdf', 'split pdf', 'compress pdf', 'sign pdf', 'invoice generator',
    'file conversion', 'document converter', 'free online converter',
  ],
  openGraph: {
    title: 'Convertam — Free File Conversion. No Login. No Watermark.',
    description: 'Free online file conversion tools. PDF, Word, Excel, PowerPoint, images and more. No login required.',
    url: 'https://www.convertam.app',
    siteName: 'Convertam',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Convertam — Free File Conversion',
    description: 'Free online file conversion. No login, no watermark, no stress.',
    creator: '@chrisndz',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body className="text-ink font-body min-h-screen">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
