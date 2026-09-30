'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Shift {
  id: string;
  name: string;
  category: 'lunch' | 'dinner';
  timeRange: string;
  availableSlots: string[];
  departureTime?: string;
  description: string;
  isDynamicLunch?: boolean;
  available: boolean;
  remainingIndoor: number;
  remainingOutdoor: number;
  remainingTotal: number;
  indoorAvailable: boolean;
  outdoorAvailable: boolean;
  reason?: string;
}

interface AvailabilityData {
  date: string;
  isClosed: boolean;
  dayOfWeek: number;
  isOutdoorActive: boolean;
  maxCapacityIndoor: number;
  maxCapacityOutdoor: number;
  shifts: Shift[];
}

interface BookingResult {
  code: string;
  customerName: string;
  date: string;
  time: string;
  shiftName: string;
  guestCount: number;
  seatingArea: 'indoor' | 'outdoor';
  dietary: string[];
}

// Helper: safe local YYYY-MM-DD
function getLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const formatted = dateObj.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function BookingPage() {
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('dinner_2');
  const [selectedSlot, setSelectedSlot] = useState<string>('21:30');
  const [seatingArea, setSeatingArea] = useState<'indoor' | 'outdoor'>('indoor');

  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loadingAvail, setLoadingAvail] = useState<boolean>(false);

  // Form inputs
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<BookingResult | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Set today on mount
  useEffect(() => {
    setSelectedDate(getLocalIso(new Date()));
  }, []);

  // Fetch availability when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return;

    let isMounted = true;
    async function fetchAvail() {
      setLoadingAvail(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/availability?date=${selectedDate}`);
        const data = await res.json();
        if (!isMounted) return;
        setAvailability(data);

        if (data.shifts && data.shifts.length > 0) {
          const currentAvailable = data.shifts.find(
            (s: Shift) => s.id === selectedShift && s.available
          );
          // If current shift is unavailable (e.g. Sunday lunch), switch automatically to first available
          if (!currentAvailable) {
            const firstAvail = data.shifts.find((s: Shift) => s.available);
            if (firstAvail) {
              setSelectedShift(firstAvail.id);
              if (firstAvail.availableSlots?.length > 0) {
                setSelectedSlot(firstAvail.availableSlots[0]);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoadingAvail(false);
      }
    }

    fetchAvail();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // When shift changes, update default slot
  const handleSelectShift = (shiftId: string) => {
    setSelectedShift(shiftId);
    const shift = availability?.shifts.find((s) => s.id === shiftId);
    if (shift && shift.availableSlots?.length > 0) {
      setSelectedSlot(shift.availableSlots[0]);
    }
  };

  const handleSelectDate = (iso: string) => {
    setSelectedDate(iso);
  };

  const dietaryOptions = [
    'Vegano',
    'Senza glutine',
    'No crostacei',
    'No arachidi / sesamo',
  ];

  const toggleDietary = (val: string) => {
    setSelectedDietary((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDate || !selectedShift || !selectedSlot) {
      setErrorMessage('Seleziona data, turno e orario di arrivo.');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setErrorMessage('Inserisci nome e numero di cellulare per bloccare il tavolo.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          shiftId: selectedShift,
          time: selectedSlot,
          seatingArea,
          guestCount,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          dietary: selectedDietary,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Impossibile completare la prenotazione.');
      }

      setSuccessBooking(data.booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la prenotazione. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!successBooking) return '#';
    const areaText = successBooking.seatingArea === 'outdoor' ? 'Dehors esterno' : 'Sala interna';
    const text = `🥢 Ho prenotato il tavolo da HANDĀ (Padova, Portello)!\n📅 Data: ${successBooking.date}\n⏰ Turno: ${successBooking.time} (${successBooking.shiftName})\n📍 Dove: ${areaText} • Via del Portello 32\n👥 Per: ${successBooking.guestCount} persone\nCodice prenotazione: #${successBooking.code}\n\nChi viene puntuale alza la mano 🙋`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const getGoogleCalendarUrl = () => {
    if (!successBooking) return '#';
    const [year, month, day] = successBooking.date.split('-');
    const [hours, minutes] = successBooking.time.split(':');
    const startHour = hours || '20';
    const startMin = minutes || '00';

    const startDateStr = `${year}${month}${day}T${startHour}${startMin}00`;
    const endH = String(Math.min(23, Number(startHour) + 2)).padStart(2, '0');
    const endDateStr = `${year}${month}${day}T${endH}${startMin}00`;

    const title = encodeURIComponent(`Cena da HANDA - Cicchetteria Asiatica`);
    const details = encodeURIComponent(
      `Prenotazione tavolo per ${successBooking.guestCount} persone. Codice #${successBooking.code}. Tolleranza 15 min. Telefono: 349 233 0492.`
    );
    const location = encodeURIComponent('Via del Portello, 32, 35131 Padova PD');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;
  };

  // Generate 7 upcoming days using safe local time
  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = getLocalIso(d);
    const weekday = d.toLocaleDateString('it-IT', { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('it-IT', { month: 'short' });
    const label = i === 0 ? 'OGGI' : i === 1 ? 'DOMANI' : weekday.toUpperCase();
    return { iso, label, weekday, dayNum, month };
  });

  const activeShift = availability?.shifts.find((s) => s.id === selectedShift);
  const minDateIso = getLocalIso(new Date());

  return (
    <main className="min-h-screen bg-white text-black flex flex-col justify-between selection:bg-[#e60000] selection:text-white">
      {/* Top Header */}
      <header className="px-4 py-4 sm:px-10 border-b-2 border-black sticky top-0 bg-white/95 backdrop-blur-xs z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-black text-2xl sm:text-4xl tracking-tighter text-black">
              HANDA<span className="text-[#e60000]">.</span>
            </span>
            <span className="text-xs sm:text-sm font-mono text-neutral-400 font-bold hidden sm:inline">
              慕食 • PORTELLO
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs sm:text-sm">
            <a
              href="https://www.instagram.com/handa_mushi/"
              target="_blank"
              rel="noreferrer"
              className="border-2 border-neutral-300 hover:border-black px-3 py-1.5 font-bold uppercase transition-colors"
            >
              @handa_mushi ↗
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto px-4 py-6 sm:py-16 flex-1">
        {/* Title */}
        <div className="mb-8 sm:mb-14">
          <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-widest text-[#e60000] block mb-1 sm:mb-2">
            PRENOTAZIONI TAVOLO ONLINE
          </span>
          <h1 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase text-black leading-none">
            BLOCCA IL TAVOLO<span className="text-[#e60000]">.</span>
          </h1>
          <div className="text-xs sm:text-base text-neutral-600 mt-3 font-mono space-y-1">
            <p>Lun–Sab 12:00–15:00 / 19:00–23:00 • Dom 19:00–23:00 (Solo Cena)</p>
            <p className="text-neutral-400 text-xs sm:text-sm">
              Non aver paura di sembrare strano perchè forse forse lo sei per davvero.
            </p>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION */}
        {successBooking ? (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            <div className="border-b-2 border-black pb-5 flex justify-between items-baseline">
              <div>
                <span className="text-xs sm:text-sm font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                  STATO PRENOTAZIONE
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#e60000] font-mono mt-1 block">
                  CONFERMATA
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                  CODICE
                </span>
                <span className="text-3xl sm:text-4xl font-mono font-black">
                  #{successBooking.code}
                </span>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-3.5 font-mono text-sm sm:text-base">
              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">NOME</span>
                <strong className="text-black font-black text-base sm:text-lg">{successBooking.customerName}</strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">COPERTI</span>
                <strong className="text-black font-black text-base sm:text-lg">
                  {successBooking.guestCount} {successBooking.guestCount === 1 ? 'PERSONA' : 'PERSONE'}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">AREA TAVOLO</span>
                <strong className="text-black font-black text-base sm:text-lg uppercase">
                  {successBooking.seatingArea === 'outdoor' ? '🌿 Dehors Esterno' : '🏠 Sala Interna (Coperta)'}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">DATA & ORA</span>
                <strong className="text-[#e60000] font-black text-base sm:text-lg">
                  {successBooking.date} • ORE {successBooking.time}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">SERVIZIO</span>
                <span className="font-bold">{successBooking.shiftName}</span>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">INDIRIZZO</span>
                <span className="font-bold">Via del Portello 32, Padova</span>
              </div>

              {successBooking.dietary && successBooking.dietary.length > 0 && (
                <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                  <span className="text-neutral-500 uppercase font-medium">NOTE</span>
                  <span className="font-bold text-[#e60000]">{successBooking.dietary.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="text-xs sm:text-sm font-mono text-neutral-700 bg-neutral-100 p-3.5 border-l-4 border-black">
              Tolleranza di <strong>15 minuti</strong> oltre l&apos;orario prescelto. In caso di ritardo o disdetta avvisaci al <strong>349 233 0492</strong>.
            </div>

            {/* Actions */}
            <div className="space-y-3 font-mono pt-3">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 sm:h-18 border-2 border-black bg-black hover:bg-[#e60000] hover:border-[#e60000] text-white font-black text-sm sm:text-lg flex items-center justify-center transition-colors uppercase tracking-wider cursor-pointer touch-manipulation"
              >
                Invia riepilogo su WhatsApp agli amici
              </a>

              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 sm:h-18 border-2 border-black bg-white hover:bg-neutral-100 text-black font-black text-sm sm:text-lg flex items-center justify-center transition-colors uppercase tracking-wider cursor-pointer touch-manipulation"
              >
                Aggiungi a Google Calendar
              </a>

              <div className="pt-4 flex justify-between items-center text-xs sm:text-sm font-mono">
                <Link
                  href={`/prenotazione/${successBooking.code}`}
                  className="text-neutral-500 hover:text-black underline font-bold"
                >
                  Modifica o cancella prenotazione
                </Link>

                <button
                  type="button"
                  onClick={() => setSuccessBooking(null)}
                  className="border-2 border-neutral-300 hover:border-black px-3 py-1.5 font-bold cursor-pointer touch-manipulation"
                >
                  ← Nuova prenotazione
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleBookingSubmit} className="space-y-9 sm:space-y-14">
            {/* 1. COPERTI */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black">
                  1. Numero persone
                </label>
                <span className="text-xs font-mono text-neutral-500">
                  Tavoli 7+?{' '}
                  <a
                    href="https://wa.me/393492330492?text=Ciao%20Handa,%20vorremmo%20prenotare%20per%20un%20gruppo%20numeroso"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e60000] font-black underline hover:text-red-700"
                  >
                    WhatsApp
                  </a>
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isSelected = guestCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCount(num)}
                      className={`h-14 sm:h-20 border-2 font-mono text-xl sm:text-4xl font-black transition-colors cursor-pointer touch-manipulation select-none active:scale-95 flex items-center justify-center ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. SCEGLI DATA & ALTRA DATA CON CALENDARIO */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black">
                  2. Scegli data
                </label>
                <span className="text-xs font-mono text-neutral-500 font-bold uppercase">
                  {selectedDate ? formatDisplayDate(selectedDate) : ''}
                </span>
              </div>

              {/* Quick Days (Swipeable horizontally on mobile, 7-col grid on desktop) */}
              <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
                {quickDays.map((d) => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => handleSelectDate(d.iso)}
                      className={`min-w-[76px] sm:min-w-0 flex-1 py-3 sm:py-5 px-1 border-2 flex flex-col items-center justify-center transition-colors font-mono cursor-pointer touch-manipulation select-none active:scale-95 snap-start ${
                        isSelected
                          ? 'border-black bg-black text-white shadow-sm'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      <span className={`text-[11px] sm:text-xs uppercase font-black tracking-tight ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {d.label}
                      </span>
                      <span className="text-2xl sm:text-4xl font-black my-0.5 leading-none">
                        {d.dayNum}
                      </span>
                      <span className={`text-[10px] sm:text-xs uppercase font-bold ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {d.month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* PROMINENT "ALTRA DATA DAL CALENDARIO" BUTTON (Mobile-friendly native picker trigger) */}
              <div className="mt-3 relative border-2 border-black bg-white hover:bg-neutral-50 transition-colors p-3.5 sm:p-4 flex items-center justify-between cursor-pointer touch-manipulation">
                <div className="flex items-center gap-3 pointer-events-none">
                  <span className="text-2xl sm:text-3xl">📅</span>
                  <div>
                    <span className="text-[11px] sm:text-xs text-neutral-500 font-mono font-bold uppercase tracking-wider block">
                      SELEZIONA UN&apos;ALTRA DATA DAL CALENDARIO
                    </span>
                    <span className="text-sm sm:text-lg font-mono font-black text-black block mt-0.5">
                      {selectedDate ? formatDisplayDate(selectedDate) : 'Scegli dal calendario...'}
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none">
                  <span className="text-xs font-mono font-black uppercase px-3 py-1.5 border border-black bg-black text-white">
                    APRI
                  </span>
                </div>

                {/* Invisible native input covering the ENTIRE card: clicking anywhere triggers iOS/Android datepicker wheel */}
                <input
                  ref={dateInputRef}
                  type="date"
                  min={minDateIso}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectDate(e.target.value);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            {/* 3. SCELTA AREA: SALA INTERNA (36) vs DEHORS ESTERNO (35) */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black">
                  3. Preferenza Tavolo
                </label>
                <span className="text-xs sm:text-sm font-mono text-neutral-500">
                  {availability?.isOutdoorActive ? '☀️ Dehors attivo' : '🌧️ Dehors chiuso per meteo'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
                {/* SALA INTERNA */}
                <button
                  type="button"
                  onClick={() => setSeatingArea('indoor')}
                  className={`p-4 sm:p-5 border-2 text-left transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between ${
                    seatingArea === 'indoor'
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-black hover:border-black'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-black text-lg sm:text-2xl">🏠 SALA INTERNA</span>
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 uppercase ${seatingArea === 'indoor' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-700'}`}>
                      36 POSTI
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${seatingArea === 'indoor' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    Sempre garantito al coperto con qualsiasi meteo.
                  </p>
                </button>

                {/* DEHORS ESTERNO */}
                <button
                  type="button"
                  disabled={!availability?.isOutdoorActive}
                  onClick={() => setSeatingArea('outdoor')}
                  className={`p-4 sm:p-5 border-2 text-left transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between ${
                    !availability?.isOutdoorActive
                      ? 'opacity-40 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                      : seatingArea === 'outdoor'
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-black hover:border-black'
                  }`}
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-black text-lg sm:text-2xl">🌿 DEHORS ESTERNO</span>
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 uppercase ${seatingArea === 'outdoor' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-700'}`}>
                      35 POSTI
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm font-medium ${seatingArea === 'outdoor' ? 'text-neutral-300' : 'text-neutral-600'}`}>
                    {availability?.isOutdoorActive
                      ? 'Plateatico all&apos;aperto sul Portello (soggetto al meteo).'
                      : 'Chiuso per pioggia o clima autunnale/invernale.'}
                  </p>
                </button>
              </div>
            </div>

            {/* 4. TURNO & ORARIO */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black">
                  4. Turno & Orario di arrivo
                </label>
                <span className="text-xs sm:text-sm font-mono text-neutral-500">
                  {loadingAvail ? 'Controllo...' : 'Disponibilità live'}
                </span>
              </div>

              {/* 3 SHIFT TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono mb-3">
                {/* 1. PRANZO DINAMICO */}
                {(() => {
                  const shift = availability?.shifts.find((s) => s.id === 'lunch');
                  const isAvailable = shift ? shift.available : true;
                  const isSelected = selectedShift === 'lunch';

                  return (
                    <button
                      key="lunch"
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('lunch')}
                      className={`p-4 sm:p-5 border-2 text-left transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-black text-xl sm:text-2xl">PRANZO</span>
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 uppercase ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            {isAvailable ? '12–15' : 'CHIUSO'}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm font-medium mt-1 leading-snug ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                          {shift?.reason || 'Servizio dinamico, rapido & cicchetti (~45 min).'}
                        </p>
                      </div>
                    </button>
                  );
                })()}

                {/* 2. 1° TURNO CENA */}
                {(() => {
                  const shift = availability?.shifts.find((s) => s.id === 'dinner_1');
                  const isAvailable = shift ? shift.available : true;
                  const isSelected = selectedShift === 'dinner_1';

                  return (
                    <button
                      key="dinner_1"
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('dinner_1')}
                      className={`p-4 sm:p-5 border-2 text-left transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-black text-xl sm:text-2xl">1° CENA</span>
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 uppercase ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            {isAvailable ? '19:15–20' : 'PIENO'}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm font-medium mt-1 leading-snug ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                          Tavolo da liberare categoricamente entro le 21:15/20.
                        </p>
                      </div>
                    </button>
                  );
                })()}

                {/* 3. 2° TURNO CENA */}
                {(() => {
                  const shift = availability?.shifts.find((s) => s.id === 'dinner_2');
                  const isAvailable = shift ? shift.available : true;
                  const isSelected = selectedShift === 'dinner_2';

                  return (
                    <button
                      key="dinner_2"
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('dinner_2')}
                      className={`p-4 sm:p-5 border-2 text-left transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-black text-xl sm:text-2xl">2° CENA</span>
                          <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 uppercase ${isSelected ? 'bg-white text-black' : 'bg-black text-white'}`}>
                            {isAvailable ? '21:30+' : 'PIENO'}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm font-medium mt-1 leading-snug ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>
                          Dalle 21:30 fino a chiusura del locale (23:00).
                        </p>
                      </div>
                    </button>
                  );
                })()}
              </div>

              {/* SPECIFIC TIME SLOT SELECTION */}
              {activeShift && activeShift.available && (
                <div className="p-3.5 sm:p-4 bg-neutral-50 border-2 border-neutral-200 font-mono">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-wide text-neutral-600 mb-2.5">
                    Scegli orario esatto di arrivo ({activeShift.name}):
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeShift.availableSlots.map((slot) => {
                      const isSlotSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2.5 sm:py-3 border-2 text-base sm:text-lg font-black transition-colors cursor-pointer touch-manipulation select-none active:scale-95 ${
                            isSlotSelected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white text-black hover:border-black'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>

                  {activeShift.departureTime && (
                    <p className="text-xs text-[#e60000] font-bold mt-3">
                      ⚠️ Nota bene: questo tavolo è prenotato per il 2° turno alle 21:30, andrà liberato alle {activeShift.departureTime}.
                    </p>
                  )}
                  {activeShift.isDynamicLunch && (
                    <p className="text-xs text-neutral-500 font-medium mt-2">
                      💡 Pranzo informale e veloce: permanenza media consigliata ~45 minuti per garantire i posti a tutti.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 5. CONTATTI */}
            <div className="space-y-4 font-mono">
              <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black block">
                5. Dati di contatto
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                    NOME E COGNOME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marco Rossi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                    CELLULARE (WHATSAPP) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="340 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg focus:border-black focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                  EMAIL (OPZIONALE)
                </label>
                <input
                  type="email"
                  placeholder="nome@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg focus:border-black focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 6. NOTE & INTOLLERANZE */}
            <div>
              <label className="text-base sm:text-lg font-mono font-black uppercase tracking-wider text-black block mb-3">
                6. Esigenze alimentari o note
              </label>

              <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                {dietaryOptions.map((opt) => {
                  const isChecked = selectedDietary.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDietary(opt)}
                      className={`text-xs sm:text-base font-mono px-3.5 py-2 sm:px-5 sm:py-3 border-2 transition-colors cursor-pointer touch-manipulation select-none active:scale-95 font-bold ${
                        isChecked
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder="Altre preferenze o note per il tavolo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-xs sm:text-base font-mono focus:border-black focus:outline-none transition-colors"
              />
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 text-[#e60000] text-xs sm:text-base font-mono font-bold border-l-4 border-[#e60000]">
                {errorMessage}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2 sm:pt-4">
              <button
                type="submit"
                disabled={submitting || availability?.isClosed}
                className="w-full h-16 sm:h-22 bg-black hover:bg-[#e60000] border-2 border-black hover:border-[#e60000] disabled:opacity-30 text-white font-mono font-black text-base sm:text-2xl uppercase tracking-wider transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex items-center justify-center"
              >
                {submitting ? 'CONFERMA IN CORSO...' : 'CONFERMA PRENOTAZIONE TAVOLO →'}
              </button>

              <p className="text-[11px] sm:text-sm font-mono text-neutral-500 text-center mt-3">
                Tavolo garantito per 15 min oltre l&apos;orario • Cancellazione gratuita
              </p>
            </div>
          </form>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t-2 border-black py-8 px-4 sm:px-10 text-xs sm:text-sm font-mono text-neutral-600">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <strong className="text-black font-black text-sm sm:text-base">HANDA.</strong> — Via del Portello 32, 35131 Padova
            <div className="text-[11px] text-neutral-500 mt-0.5">
              Mer–Mar 12:00–15:00 / 19:00–23:00 • Dom 19:00–23:00
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6 font-bold">
            <a
              href="https://www.instagram.com/handa_mushi/"
              target="_blank"
              rel="noreferrer"
              className="text-black hover:text-[#e60000] underline"
            >
              @handa_mushi
            </a>
            <a
              href="tel:+393492330492"
              className="text-black hover:text-[#e60000] underline"
            >
              349 233 0492
            </a>
            <a
              href="https://handa.it"
              target="_blank"
              rel="noreferrer"
              className="text-black hover:text-[#e60000] underline"
            >
              handa.it
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
