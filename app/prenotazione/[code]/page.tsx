'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Booking } from '@/lib/types';

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/${code}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Prenotazione non trovata');
        } else {
          setBooking(data.booking);
        }
      } catch {
        setError('Errore di connessione');
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadBooking();
    }
  }, [code]);

  const handleCancelBooking = async () => {
    if (!confirm('Vuoi annullare questa prenotazione? Il tavolo verrà liberato.')) {
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
        alert(data.error || 'Errore nella cancellazione');
      } else {
        if (booking) {
          setBooking({ ...booking, status: 'CANCELLED' });
        }
      }
    } catch {
      alert('Errore di connessione');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f9] text-black font-mono text-xs flex items-center justify-center">
        Caricamento prenotazione...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f8f8f9] text-black font-mono text-xs flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-sm text-center">
          <h1 className="font-bold text-sm text-black">PRENOTAZIONE NON TROVATA</h1>
          <p className="text-neutral-500">
            Nessuna prenotazione attiva con il codice #{code}.
          </p>
          <Link
            href="/"
            className="block w-full bg-black hover:bg-neutral-800 text-white text-center py-2.5 rounded-xl font-bold uppercase transition-colors"
          >
            Torna alla prenotazione
          </Link>
        </div>
      </div>
    );
  }

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#f8f8f9] text-black font-mono text-xs p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-4">
        <Link
          href="/"
          className="inline-block text-neutral-500 hover:text-black font-medium underline uppercase"
        >
          ← Torna alla home
        </Link>

        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-sm">
          <div className="border-b border-neutral-200 pb-4 flex justify-between items-start">
            <div>
              <span className="text-neutral-400 block text-[11px] uppercase tracking-wider">PRENOTAZIONE</span>
              <span className="font-black text-xl text-black">#{booking.code}</span>
            </div>
            <div>
              {isCancelled ? (
                <span className="bg-red-50 text-[#e60000] border border-red-200 px-2.5 py-1 rounded-md font-bold">
                  ANNULLATA
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                  CONFERMATA
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase">Nome:</span>
              <span className="font-bold text-black">{booking.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase">Persone:</span>
              <span className="font-bold text-black">{booking.guestCount}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase">Data:</span>
              <span className="font-bold text-black">{booking.date}</span>
            </div>
            <div className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="text-neutral-500 uppercase">Turno:</span>
              <span className="font-bold text-black">{booking.time} ({booking.shiftName})</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-neutral-500 uppercase">Indirizzo:</span>
              <span className="text-black">Via del Portello 32, Padova</span>
            </div>
            {booking.dietary.length > 0 && (
              <div className="flex justify-between pt-2 border-t border-neutral-200">
                <span className="text-neutral-500 uppercase">Note:</span>
                <span className="font-bold text-black">{booking.dietary.join(', ')}</span>
              </div>
            )}
          </div>

          {!isCancelled ? (
            <div className="space-y-2.5 pt-1">
              <a
                href={`https://wa.me/393492330492?text=Ciao%20Handa,%20scrivo%20per%20la%20prenotazione%20${booking.code}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center w-full bg-[#25D366] hover:bg-[#20ba59] text-black font-bold py-3 rounded-xl uppercase transition-colors shadow-xs"
              >
                Scrivici su WhatsApp
              </a>

              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl uppercase font-bold transition-colors cursor-pointer"
              >
                {cancelling ? 'Annullamento...' : 'Annulla questa prenotazione'}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-neutral-100 text-neutral-500 rounded-xl text-center">
              Prenotazione annullata. Tavolo rimesso a disposizione.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
