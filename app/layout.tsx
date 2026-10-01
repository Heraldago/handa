import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HANDA. — Prenotazioni Tavolo',
  description: 'Cicchetteria asiatica e street food. Via del Portello 32, Padova.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="h-full bg-white text-black max-w-full overflow-x-hidden">
      <body className="min-h-full flex flex-col bg-white text-black antialiased max-w-full overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
