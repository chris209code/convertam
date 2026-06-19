import './globals.css';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
    default: 'Convertam — Upload. Convert am. Download.',
    template: '%s | Convertam',
  },
  description:
    'Free online file conversion. No login, no watermark, no subscription. Convert PDF, Word, Excel, PowerPoint and images instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="text-[#edeae0] font-body min-h-screen">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
