import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HANDĀ • Prenotazioni Tavolo',
    short_name: 'HANDĀ',
    description: 'Cicchetteria asiatica e street food a Padova. Prenota il tuo tavolo online.',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#faf8f5',
    orientation: 'portrait',
    icons: [
      {
        src: '/handaprenotalogo-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/handaprenotalogo-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/handaprenotalogo-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Staff Desk (Cassa)',
        short_name: 'Staff',
        description: 'Gestione tavoli e servizio in sala',
        url: '/admin',
        icons: [
          { src: '/handaadminlogo-192.png', sizes: '192x192', type: 'image/png' },
        ],
      },
      {
        name: 'Trova Prenotazione',
        short_name: 'Trova',
        description: 'Cerca o cancella la tua prenotazione',
        url: '/trova-prenotazione',
        icons: [
          { src: '/handaprenotalogo-192.png', sizes: '192x192', type: 'image/png' },
        ],
      },
    ],
  };
}
