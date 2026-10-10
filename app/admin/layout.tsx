import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HANDA. — Staff Desk & Gestione Tavoli',
  description: 'Pannello cassa e gestione tavoli, turni e coperti HANDĀ.',
  applicationName: 'HANDĀ Staff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HANDĀ Staff',
  },
  icons: {
    icon: [
      { url: '/favicon-admin-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/handaadminlogo-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon-admin.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'HANDĀ • Staff Desk',
    description: 'Pannello cassa e gestione tavoli e coperti in sala HANDĀ.',
    url: 'https://handa-rose.vercel.app/admin',
    siteName: 'HANDĀ Staff',
    images: [
      {
        url: '/handaadminlogo.png',
        width: 512,
        height: 512,
        alt: 'HANDĀ Staff Desk Logo',
      },
    ],
    locale: 'it_IT',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'HANDĀ • Staff Desk',
    description: 'Pannello cassa e gestione tavoli in sala HANDĀ.',
    images: ['/handaadminlogo.png'],
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
