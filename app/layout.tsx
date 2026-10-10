import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://handa-rose.vercel.app'),
  title: 'HANDA. — Prenotazioni Tavolo',
  description: 'Cicchetteria asiatica e street food. Via del Portello 32, Padova.',
  applicationName: 'HANDĀ',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HANDĀ Prenota',
  },
  icons: {
    icon: '/handaprenotalogo.png',
    apple: '/handaprenotalogo.png',
  },
  openGraph: {
    title: 'HANDA. — Prenotazione Tavoli Online',
    description: 'Cicchetteria Asiatica • Made in Portello. Prenota online il tuo tavolo da HANDĀ.',
    url: 'https://handa-rose.vercel.app',
    siteName: 'HANDĀ Cicchetteria Asiatica',
    images: [
      {
        url: '/handaprenotalogo.png',
        width: 512,
        height: 512,
        alt: 'HANDĀ Prenotazione Tavoli Logo',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'HANDA. — Prenotazione Tavoli Online',
    description: 'Cicchetteria Asiatica • Made in Portello. Prenota online il tuo tavolo da HANDĀ.',
    images: ['/handaprenotalogo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#faf8f5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="h-full bg-[#faf8f5] text-black max-w-full overflow-x-hidden">
      <body className="min-h-full flex flex-col bg-[#faf8f5] bg-paper-texture text-black antialiased max-w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
