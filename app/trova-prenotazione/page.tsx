'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Booking } from '@/lib/types';
import { Language, translations } from '@/lib/translations';

interface StoredBookingRef {
  code: string;
  customerName: string;
  date: string;
  time: string;
  guestCount: number;
}

export default function TrovaPrenotazionePage() {
  const [lang, setLang] = useState<Language>('it');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Booking[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [recentBookings, setRecentBookings] = useState<StoredBookingRef[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('handa_lang') as Language;
      if (savedLang === 'en' || savedLang === 'it') {
        setLang(savedLang);
      }

      const stored = localStorage.getItem('handa_user_bookings');
      if (stored) {
        setRecentBookings(JSON.parse(stored));
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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/bookings/lookup?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.bookings || []);
      } else {
        setError(data.error || 'Errore nella ricerca');
        setResults([]);
      }
    } catch {
      setError('Errore di connessione. Riprova tra poco.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] bg-paper-texture text-black font-sans selection:bg-[#e60000] selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="px-4 sm:px-10 py-3.5 border-b-2 border-black sticky top-0 bg-[#faf8f5]/95 backdrop-blur-xs z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-2xl tracking-tighter text-black">
            HANDA<span className="text-[#e60000]">.</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-black uppercase text-neutral-600 hover:text-black tracking-wider underline touch-manipulation"
            >
              {lang === 'en' ? '← Book a Table' : '← Prenota Tavolo'}
            </Link>

            {/* Language Switch */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleLanguageSwitch('it')}
                className={`h-8 px-2 text-xs font-bold border transition-colors ${
                  lang === 'it'
                    ? 'border-black bg-black text-white font-black'
                    : 'border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => handleLanguageSwitch('en')}
                className={`h-8 px-2 text-xs font-bold border transition-colors ${
                  lang === 'en'
                    ? 'border-black bg-black text-white font-black'
                    : 'border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 flex-1">
        <div className="mb-6 sm:mb-8">
          <span className="text-xs font-black uppercase tracking-widest text-[#e60000] block mb-1">
            {lang === 'en' ? 'CUSTOMER SELF-SERVICE' : 'GESTIONE PRENOTAZIONE CLIENTE'}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
            {lang === 'en' ? 'FIND OR CANCEL BOOKING' : 'TROVA O CANCELLA PRENOTAZIONE'}
          </h1>
          <p className="text-sm text-neutral-600 mt-2 font-medium">
            {lang === 'en'
              ? 'Enter your reservation code (e.g. #HND-1234), phone number, or email to view or cancel your table.'
              : 'Inserisci il tuo codice prenotazione (es. #HND-1234), numero di telefono o email per vedere o annullare il tuo tavolo.'}
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-white border-2 border-black p-5 sm:p-7 shadow-sm mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-700 mb-1.5">
                {lang === 'en' ? 'CODE, PHONE, OR EMAIL' : 'CODICE PRENOTAZIONE, TELEFONO O EMAIL'}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder={lang === 'en' ? 'e.g. HND-1234 or 3491234567' : 'es. HND-1234 oppure 3491234567'}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 h-14 px-4 border-2 border-neutral-300 focus:border-black font-bold text-base outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="h-14 px-6 bg-black hover:bg-[#e60000] disabled:bg-neutral-300 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer touch-manipulation active:scale-98"
                >
                  {loading ? (lang === 'en' ? 'SEARCHING...' : 'RICERCA...') : (lang === 'en' ? 'FIND BOOKING →' : 'CERCA PRENOTAZIONE →')}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <p className="text-xs font-black text-[#e60000] mt-3">{error}</p>
          )}
        </div>

        {/* Search Results */}
        {searched && (
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-black">
              {lang === 'en' ? 'SEARCH RESULTS' : 'RISULTATI TROVATI'} ({results?.length || 0})
            </h2>

            {results && results.length > 0 ? (
              <div className="space-y-3">
                {results.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white border-2 border-black p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg text-black">#{b.code}</span>
                        <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300">
                          {b.status}
                        </span>
                      </div>
                      <p className="text-sm font-black text-neutral-800">{b.customerName}</p>
                      <p className="text-xs text-neutral-600 font-bold mt-0.5">
                        📅 {b.date} • ⏰ {b.time} ({b.shiftName}) • 👥 {b.guestCount} PAX •{' '}
                        {b.seatingArea === 'outdoor' ? '🌿 Portico Esterno' : '🏠 Sala Interna'}
                      </p>
                    </div>

                    <Link
                      href={`/prenotazione/${b.code}`}
                      className="h-11 px-4 bg-black hover:bg-[#e60000] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center shrink-0 transition-colors touch-manipulation"
                    >
                      {lang === 'en' ? 'MANAGE OR CANCEL →' : 'GESTISCI O CANCELLA →'}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white border border-dashed border-neutral-300 text-center text-sm font-bold text-neutral-500">
                {lang === 'en'
                  ? 'No active reservation found. Check the code or phone number.'
                  : 'Nessuna prenotazione attiva trovata. Controlla il codice o il numero di telefono.'}
              </div>
            )}
          </div>
        )}

        {/* Recent bookings on this device */}
        {recentBookings.length > 0 && !searched && (
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500">
              {lang === 'en' ? 'RECENT BOOKINGS ON THIS DEVICE' : 'PRENOTAZIONI RECENTI SU QUESTO DISPOSITIVO'}
            </h2>
            <div className="space-y-2.5">
              {recentBookings.map((b) => (
                <div
                  key={b.code}
                  className="bg-white border border-neutral-300 hover:border-black p-4 flex items-center justify-between gap-3 transition-colors"
                >
                  <div>
                    <div className="font-black text-base text-black">#{b.code}</div>
                    <div className="text-xs font-bold text-neutral-600">
                      {b.customerName} • {b.date} alle {b.time} ({b.guestCount} PAX)
                    </div>
                  </div>
                  <Link
                    href={`/prenotazione/${b.code}`}
                    className="h-10 px-3.5 border-2 border-black bg-white hover:bg-black hover:text-white text-black font-black text-xs uppercase tracking-wider flex items-center justify-center shrink-0 transition-colors"
                  >
                    {lang === 'en' ? 'Open →' : 'Apri →'}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-black py-6 px-4 text-center text-xs text-neutral-500 font-sans">
        HANDĀ • Via del Portello 32, Padova • 349 233 0492
      </footer>
    </main>
  );
}
