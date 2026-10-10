import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HANDA. — Prenotazioni & Staff Desk',
  description: 'Cicchetteria asiatica e street food. Via del Portello 32, Padova.',
  applicationName: 'HANDĀ',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HANDĀ',
  },
  icons: {
    icon: '/handa-logo.png',
    apple: '/handa-logo.png',
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
