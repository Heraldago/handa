import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HANDĀ • Prenotazioni & Staff Desk',
    short_name: 'HANDĀ',
    description: 'Cicchetteria asiatica e street food a Padova. Prenotazioni tavoli e pannello cassa staff.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#faf8f5',
    icons: [
      {
        src: '/handa-logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/handa-logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Staff Desk (Cassa)',
        short_name: 'Staff Desk',
        description: 'Gestione tavoli e servizio in sala',
        url: '/admin',
        icons: [{ src: '/handa-logo.png', sizes: '192x192' }],
      },
      {
        name: 'Prenota Tavolo',
        short_name: 'Prenota',
        description: 'Prenotazione tavolo online',
        url: '/',
        icons: [{ src: '/handa-logo.png', sizes: '192x192' }],
      },
      {
        name: 'Trova Prenotazione',
        short_name: 'Trova',
        description: 'Cerca o cancella la tua prenotazione',
        url: '/trova-prenotazione',
        icons: [{ src: '/handa-logo.png', sizes: '192x192' }],
      },
    ],
  };
}
