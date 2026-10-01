'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Booking } from '@/lib/types';
import { translations, Language } from '@/lib/translations';

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [lang, setLang] = useState<Language>('it');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('handa_lang') as Language;
      if (savedLang === 'en' || savedLang === 'it') {
        setLang(savedLang);
      }
    } catch {}
  }, []);

  const handleLanguageSwitch = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('handa_lang', newLang);
    } catch {}
  };

  const t = translations[lang];

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/${code}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || (lang === 'en' ? 'Booking not found' : 'Prenotazione non trovata'));
        } else {
          setBooking(data.booking);
        }
      } catch {
        setError(lang === 'en' ? 'Connection error' : 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadBooking();
    }
  }, [code, lang]);

  const handleCancelBooking = async () => {
    const confirmMsg =
      lang === 'en'
        ? 'Are you sure you want to cancel this booking? The table will be released.'
        : 'Vuoi annullare questa prenotazione? Il tavolo verrà liberato.';

    if (!confirm(confirmMsg)) {
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || (lang === 'en' ? 'Cancellation error' : 'Errore nella cancellazione'));
      } else {
        if (booking) {
          setBooking({ ...booking, status: 'CANCELLED' });
        }
      }
    } catch {
      alert(lang === 'en' ? 'Connection error' : 'Errore di connessione');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black font-sans text-sm flex items-center justify-center">
        {lang === 'en' ? 'Loading booking details...' : 'Caricamento prenotazione...'}
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-white text-black font-sans text-sm flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-2 border-black p-6 sm:p-8 space-y-4 text-center">
          <span className="text-xs font-black uppercase tracking-widest text-[#e60000] block">
            404 NOT FOUND
          </span>
          <h1 className="font-black text-xl text-black uppercase">
            {lang === 'en' ? 'RESERVATION NOT FOUND' : 'PRENOTAZIONE NON TROVATA'}
          </h1>
          <p className="text-neutral-600 text-xs sm:text-sm">
            {lang === 'en'
              ? `No active reservation found with code #${code}.`
              : `Nessuna prenotazione attiva con il codice #${code}.`}
          </p>
          <Link
            href="/"
            className="block w-full h-12 border-2 border-black bg-black hover:bg-[#e60000] hover:border-[#e60000] text-white text-center font-black uppercase text-xs transition-colors flex items-center justify-center"
          >
            {lang === 'en' ? 'Return to Home / Booking' : 'Torna alla prenotazione'}
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <main className="min-h-screen bg-[#faf8f5] bg-paper-texture text-black font-sans selection:bg-[#e60000] selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="px-3 sm:px-8 py-3 border-b-2 border-black sticky top-0 bg-[#faf8f5]/95 backdrop-blur-xs z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter text-black">
            HANDA<span className="text-[#e60000]">.</span>
          </Link>

          <div
            className="inline-flex items-center gap-1.5 shrink-0"
            role="tablist"
            aria-label="Selettore lingua"
          >
            <button
              type="button"
              role="tab"
              aria-selected={lang === 'it'}
              onClick={() => handleLanguageSwitch('it')}
              className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                lang === 'it'
                  ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs'
                  : 'border-2 border-neutral-200 bg-white text-neutral-400 font-bold hover:text-black hover:border-neutral-400 opacity-60 hover:opacity-100'
              }`}
              title="Italiano"
            >
              <span className="text-base leading-none" aria-hidden="true">🇮🇹</span>
              <span className="tracking-wider">IT</span>
              {lang === 'it' && (
                <span className="text-[11px] font-black text-emerald-700 ml-0.5">✓</span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={lang === 'en'}
              onClick={() => handleLanguageSwitch('en')}
              className={`h-9 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                lang === 'en'
                  ? 'border-2 border-blue-600 bg-blue-50 text-blue-950 font-black shadow-xs'
                  : 'border-2 border-neutral-200 bg-white text-neutral-400 font-bold hover:text-black hover:border-neutral-400 opacity-60 hover:opacity-100'
              }`}
              title="English"
            >
              <span className="text-base leading-none" aria-hidden="true">🇬🇧</span>
              <span className="tracking-wider">EN</span>
              {lang === 'en' && (
                <span className="text-[11px] font-black text-blue-700 ml-0.5">✓</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Details */}
      <div className="max-w-2xl w-full mx-auto px-3 sm:px-8 pt-4 sm:pt-6 pb-12 sm:pb-16 flex-1 space-y-6">
        <Link
          href="/"
          className="inline-block text-xs font-bold text-neutral-500 hover:text-black uppercase underline"
        >
          {lang === 'en' ? '← Back to Home' : '← Torna alla home'}
        </Link>

        <div className="border-2 border-black p-6 sm:p-8 space-y-6 bg-white">
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <span className="text-neutral-500 block text-xs uppercase tracking-widest font-bold">
                {t.successStatus}
              </span>
              <span className="font-black text-2xl sm:text-3xl text-black">#{booking.code}</span>
            </div>
            <div>
              {isCancelled ? (
                <span className="bg-red-50 text-[#e60000] border-2 border-[#e60000] px-3 py-1 font-black text-xs uppercase">
                  {lang === 'en' ? 'CANCELLED' : 'ANNULLATA'}
                </span>
              ) : (
                <span className="bg-black text-white px-3 py-1 font-black text-xs uppercase">
                  {t.confirmed}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.name}:</span>
              <span className="font-black text-black">{booking.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.covers}:</span>
              <span className="font-black text-black">
                {booking.guestCount} {booking.guestCount === 1 ? t.personSingle : t.personPlural}
              </span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.tableArea}:</span>
              <span className="font-black text-black uppercase">
                {booking.seatingArea === 'outdoor' ? t.outdoorSeating : t.indoorSeating}
              </span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.dateTime}:</span>
              <span className="font-black text-[#e60000]">{booking.date} • {booking.time}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.service}:</span>
              <span className="font-bold text-black">{booking.shiftName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase font-medium">{t.address}:</span>
              <span className="font-bold text-black">{t.addressValue}</span>
            </div>
            {booking.dietary && booking.dietary.length > 0 && (
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500 uppercase font-medium">{t.notes}:</span>
                <span className="font-bold text-[#e60000]">{booking.dietary.join(', ')}</span>
              </div>
            )}
          </div>

          {!isCancelled ? (
            <div className="space-y-3 pt-2">
              <a
                href="tel:+393492330492"
                className="w-full h-12 border-2 border-black bg-white hover:bg-neutral-100 text-black font-black py-3 uppercase text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>📞</span>
                <span>
                  {lang === 'en' ? 'Call the restaurant (349 233 0492)' : 'Chiama il locale (349 233 0492)'}
                </span>
              </a>

              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full h-12 bg-white hover:bg-[#e60000] hover:text-white hover:border-[#e60000] text-[#e60000] border-2 border-[#e60000] uppercase font-black text-xs transition-colors cursor-pointer flex items-center justify-center"
              >
                {cancelling
                  ? (lang === 'en' ? 'Cancelling...' : 'Annullamento...')
                  : (lang === 'en' ? 'Cancel this reservation' : 'Annulla questa prenotazione')}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-neutral-100 border-l-4 border-black text-xs font-bold text-neutral-600">
              {lang === 'en'
                ? 'Reservation cancelled. The table has been released.'
                : 'Prenotazione annullata. Il tavolo è stato rimesso a disposizione.'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-black py-6 px-3 sm:px-8 text-center text-xs text-neutral-500 font-sans">
        HANDA. • Via del Portello 32, Padova • 349 233 0492
      </footer>
    </main>
  );
}
