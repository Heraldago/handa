'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { translations, Language } from '@/lib/translations';

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

function formatDisplayDate(iso: string, lang: Language): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';
  const formatted = dateObj.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function BookingPage() {
  const [lang, setLang] = useState<Language>('it');
  const t = translations[lang];

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

  // Load language preference and set today's date on mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('handa_lang') as Language;
      if (savedLang === 'en' || savedLang === 'it') {
        setLang(savedLang);
      }
    } catch {}
    setSelectedDate(getLocalIso(new Date()));
  }, []);

  const handleLanguageSwitch = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('handa_lang', newLang);
    } catch {}
  };

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

  const toggleDietary = (val: string) => {
    setSelectedDietary((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDate || !selectedShift || !selectedSlot) {
      setErrorMessage(t.errorSelectDateTime);
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setErrorMessage(t.errorContact);
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
        throw new Error(data.error || t.errorGeneric);
      }

      setSuccessBooking(data.booking);
    } catch (err: any) {
      setErrorMessage(err.message || t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!successBooking) return '#';
    const text = t.whatsAppMessage({
      customerName: successBooking.customerName,
      date: successBooking.date,
      time: successBooking.time,
      shiftName: successBooking.shiftName,
      guestCount: successBooking.guestCount,
      seatingArea: successBooking.seatingArea,
      code: successBooking.code,
    });
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

    const title = encodeURIComponent(t.calendarTitle);
    const details = encodeURIComponent(
      t.calendarDetails({
        guestCount: successBooking.guestCount,
        code: successBooking.code,
      })
    );
    const location = encodeURIComponent('Via del Portello, 32, 35131 Padova PD');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateStr}/${endDateStr}&details=${details}&location=${location}`;
  };

  // Generate 7 upcoming days using safe local time & selected locale
  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = getLocalIso(d);
    const locale = lang === 'en' ? 'en-GB' : 'it-IT';
    const weekday = d.toLocaleDateString(locale, { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString(locale, { month: 'short' });
    const label = i === 0 ? t.today : i === 1 ? t.tomorrow : weekday.toUpperCase();
    return { iso, label, weekday, dayNum, month };
  });

  const activeShift = availability?.shifts.find((s) => s.id === selectedShift);
  const minDateIso = getLocalIso(new Date());

  return (
    <main className="min-h-screen bg-white text-black font-sans flex flex-col justify-between selection:bg-[#e60000] selection:text-white">
      {/* Top Header */}
      <header className="px-4 py-4 sm:px-10 border-b-2 border-black sticky top-0 bg-white/95 backdrop-blur-xs z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-black text-2xl sm:text-4xl tracking-tighter text-black">
              HANDA<span className="text-[#e60000]">.</span>
            </span>
            <span className="text-xs sm:text-sm text-neutral-400 font-bold hidden sm:inline tracking-wider">
              {t.brandSubtitle}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            {/* Bilingual Switcher: IT | EN */}
            <div className="inline-flex border-2 border-black overflow-hidden font-bold bg-neutral-100" role="tablist" aria-label="Selettore lingua">
              <button
                type="button"
                role="tab"
                aria-selected={lang === 'it'}
                onClick={() => handleLanguageSwitch('it')}
                className={`px-3 py-1 transition-colors cursor-pointer text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  lang === 'it'
                    ? 'bg-noren-active text-black shadow-xs'
                    : 'bg-transparent text-neutral-600 hover:text-black'
                }`}
              >
                IT
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={lang === 'en'}
                onClick={() => handleLanguageSwitch('en')}
                className={`px-3 py-1 border-l-2 border-black transition-colors cursor-pointer text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  lang === 'en'
                    ? 'bg-noren-active text-black shadow-xs'
                    : 'bg-transparent text-neutral-600 hover:text-black'
                }`}
              >
                EN
              </button>
            </div>

            <a
              href="https://www.instagram.com/handa_mushi/"
              target="_blank"
              rel="noreferrer"
              className="border-2 border-neutral-300 hover:border-black px-3 py-1.5 font-bold uppercase transition-colors"
            >
              {t.instaLink}
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl w-full mx-auto px-4 py-6 sm:py-16 flex-1">
        {/* Title */}
        <div className="mb-8 sm:mb-14">
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#e60000] block mb-1 sm:mb-2">
            {t.heroBadge}
          </span>
          <h1 className="text-4xl sm:text-7xl font-black tracking-tighter uppercase text-black leading-none">
            {t.heroTitle}<span className="text-[#e60000]">.</span>
          </h1>
          <div className="text-xs sm:text-base text-neutral-600 mt-3 space-y-1">
            <p className="font-semibold">{t.heroHours}</p>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.heroTagline}
            </p>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION */}
        {successBooking ? (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            <div className="border-b-2 border-black pb-5 flex justify-between items-baseline">
              <div>
                <span className="text-xs sm:text-sm text-neutral-500 uppercase tracking-widest block font-bold">
                  {t.successStatus}
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#e60000] mt-1 block">
                  {t.confirmed}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm text-neutral-500 uppercase tracking-widest block font-bold">
                  {t.code}
                </span>
                <span className="text-3xl sm:text-4xl font-black">
                  #{successBooking.code}
                </span>
              </div>
            </div>

            {/* Details Table */}
            <div className="space-y-3.5 text-sm sm:text-base">
              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.name}</span>
                <strong className="text-black font-black text-base sm:text-lg">{successBooking.customerName}</strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.covers}</span>
                <strong className="text-black font-black text-base sm:text-lg">
                  {successBooking.guestCount} {successBooking.guestCount === 1 ? t.personSingle : t.personPlural}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.tableArea}</span>
                <strong className="text-black font-black text-base sm:text-lg uppercase">
                  {successBooking.seatingArea === 'outdoor' ? t.outdoorSeating : t.indoorSeating}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.dateTime}</span>
                <strong className="text-[#e60000] font-black text-base sm:text-lg">
                  {successBooking.date} • {t.atHour} {successBooking.time}
                </strong>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.service}</span>
                <span className="font-bold">{successBooking.shiftName}</span>
              </div>

              <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                <span className="text-neutral-500 uppercase font-medium">{t.address}</span>
                <span className="font-bold">{t.addressValue}</span>
              </div>

              {successBooking.dietary && successBooking.dietary.length > 0 && (
                <div className="flex justify-between border-b-2 border-neutral-200 pb-2.5">
                  <span className="text-neutral-500 uppercase font-medium">{t.notes}</span>
                  <span className="font-bold text-[#e60000]">{successBooking.dietary.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="text-xs sm:text-sm text-neutral-700 bg-neutral-100 p-3.5 border-l-4 border-black">
              {t.toleranceNotice}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-3">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 sm:h-18 border-2 border-black bg-black hover:bg-[#e60000] hover:border-[#e60000] text-white font-black text-sm sm:text-lg flex items-center justify-center transition-colors uppercase tracking-wider cursor-pointer touch-manipulation"
              >
                {t.shareWhatsApp}
              </a>

              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 sm:h-18 border-2 border-black bg-white hover:bg-neutral-100 text-black font-black text-sm sm:text-lg flex items-center justify-center transition-colors uppercase tracking-wider cursor-pointer touch-manipulation"
              >
                {t.addToGoogleCalendar}
              </a>

              <div className="pt-4 flex justify-between items-center text-xs sm:text-sm">
                <Link
                  href={`/prenotazione/${successBooking.code}`}
                  className="text-neutral-500 hover:text-black underline font-bold"
                >
                  {t.modifyOrCancel}
                </Link>

                <button
                  type="button"
                  onClick={() => setSuccessBooking(null)}
                  className="border-2 border-neutral-300 hover:border-black px-3 py-1.5 font-bold cursor-pointer touch-manipulation"
                >
                  {t.newBooking}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* BOOKING FORM - FOLLOWS NATURAL VERBAL CONVERSATION ORDER */
          <form onSubmit={handleBookingSubmit} className="space-y-9 sm:space-y-14">
            {/* 1. NUMERO PERSONE ("Per quante persone?") */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {t.step1Title}
                </label>
                <span className="text-xs text-neutral-500 font-medium">
                  {t.step1GroupNotice}{' '}
                  <a
                    href="https://wa.me/393492330492?text=Ciao%20Handa,%20vorremmo%20prenotare%20per%20un%20gruppo%20numeroso"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e60000] font-black underline hover:text-red-700"
                  >
                    {t.step1GroupAction}
                  </a>
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label={t.step1Title}>
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isSelected = guestCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setGuestCount(num)}
                      className={`h-14 sm:h-20 border-2 text-xl sm:text-4xl font-black transition-all cursor-pointer touch-manipulation select-none active:scale-95 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isSelected
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-200 bg-white text-neutral-700 hover:border-black hover:text-black'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. SCEGLI DATA ("Per che giorno?") */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {t.step2Title}
                </label>
                <span className="text-xs text-neutral-500 font-bold uppercase">
                  {selectedDate ? formatDisplayDate(selectedDate, lang) : ''}
                </span>
              </div>

              {/* Quick Days */}
              <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x" role="radiogroup" aria-label={t.step2Title}>
                {quickDays.map((d) => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectDate(d.iso)}
                      className={`min-w-[76px] sm:min-w-0 flex-1 py-3 sm:py-5 px-1 border-2 flex flex-col items-center justify-center transition-all cursor-pointer touch-manipulation select-none active:scale-95 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isSelected
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-200 bg-white text-neutral-700 hover:border-black hover:text-black'
                      }`}
                    >
                      <span className={`text-[11px] sm:text-xs uppercase font-black tracking-tight ${isSelected ? 'text-black' : 'text-neutral-500'}`}>
                        {d.label}
                      </span>
                      <span className="text-2xl sm:text-4xl font-black my-0.5 leading-none text-black">
                        {d.dayNum}
                      </span>
                      <span className={`text-[10px] sm:text-xs uppercase font-bold ${isSelected ? 'text-black' : 'text-neutral-500'}`}>
                        {d.month}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Native Calendar Picker Card */}
              <div className="mt-3 relative border-2 border-black bg-white hover:bg-neutral-50 transition-colors p-3.5 sm:p-4 flex items-center justify-between cursor-pointer touch-manipulation">
                <div className="flex items-center gap-3 pointer-events-none">
                  <span className="text-2xl sm:text-3xl">📅</span>
                  <div>
                    <span className="text-[11px] sm:text-xs text-neutral-500 font-bold uppercase tracking-wider block">
                      {t.calendarPickerLabel}
                    </span>
                    <span className="text-sm sm:text-lg font-black text-black block mt-0.5">
                      {selectedDate ? formatDisplayDate(selectedDate, lang) : t.calendarPickerPlaceholder}
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none">
                  <span className="text-xs font-black uppercase px-3 py-1.5 border border-black bg-black text-white">
                    {t.calendarPickerOpen}
                  </span>
                </div>

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

            {/* 3. TURNO & ORARIO DI ARRIVO ("A che ora?") */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {t.step3Title}
                </label>
                <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                  {loadingAvail ? t.checkingAvailability : t.liveAvailability}
                </span>
              </div>

              {/* 3 SHIFT TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3" role="radiogroup" aria-label={t.step3Title}>
                {/* 1. PRANZO DINAMICO */}
                {(() => {
                  const shift = availability?.shifts.find((s) => s.id === 'lunch');
                  const isAvailable = shift ? shift.available : true;
                  const isSelected = selectedShift === 'lunch';

                  return (
                    <button
                      key="lunch"
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('lunch')}
                      className={`p-4 sm:p-5 border-2 text-left transition-all cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-black text-xl sm:text-2xl tracking-tight text-black block">{t.lunchTitle}</span>
                            <span className={`text-xs sm:text-sm font-bold tracking-tight ${
                              !isAvailable ? 'text-neutral-400' : isSelected ? 'text-black font-black' : 'text-neutral-500'
                            }`}>
                              {t.lunchTime}
                            </span>
                          </div>
                          {!isAvailable ? (
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
                              {t.statusClosed}
                            </span>
                          ) : isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                              ✓
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium mt-1 leading-snug text-neutral-600">
                          {shift?.reason || t.lunchDesc}
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
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('dinner_1')}
                      className={`p-4 sm:p-5 border-2 text-left transition-all cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-black text-xl sm:text-2xl tracking-tight text-black block">{t.dinner1Title}</span>
                            <span className={`text-xs sm:text-sm font-bold tracking-tight ${
                              !isAvailable ? 'text-neutral-400' : isSelected ? 'text-black font-black' : 'text-neutral-500'
                            }`}>
                              {t.dinner1Time}
                            </span>
                          </div>
                          {!isAvailable ? (
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
                              {t.statusFull}
                            </span>
                          ) : isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                              ✓
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium mt-1 leading-snug text-neutral-600">
                          {t.dinner1Desc}
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
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!isAvailable}
                      onClick={() => handleSelectShift('dinner_2')}
                      className={`p-4 sm:p-5 border-2 text-left transition-all cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        !isAvailable
                          ? 'opacity-35 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-black text-xl sm:text-2xl tracking-tight text-black block">{t.dinner2Title}</span>
                            <span className={`text-xs sm:text-sm font-bold tracking-tight ${
                              !isAvailable ? 'text-neutral-400' : isSelected ? 'text-black font-black' : 'text-neutral-500'
                            }`}>
                              {t.dinner2Time}
                            </span>
                          </div>
                          {!isAvailable ? (
                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
                              {t.statusFull}
                            </span>
                          ) : isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                              ✓
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium mt-1 leading-snug text-neutral-600">
                          {t.dinner2Desc}
                        </p>
                      </div>
                    </button>
                  );
                })()}
              </div>

              {/* SPECIFIC TIME SLOT SELECTION */}
              {activeShift && activeShift.available && (
                <div className="p-3.5 sm:p-4 bg-neutral-50 border-2 border-neutral-200">
                  <div className="text-xs sm:text-sm font-bold uppercase tracking-wide text-neutral-600 mb-2.5">
                    {t.selectSlotPrompt} ({activeShift.name}):
                  </div>

                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Orario di arrivo">
                    {activeShift.availableSlots.map((slot) => {
                      const isSlotSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          role="radio"
                          aria-checked={isSlotSelected}
                          onClick={() => setSelectedSlot(slot)}
                          className={`px-4 py-2.5 sm:py-3 border-2 text-base sm:text-lg font-black transition-all cursor-pointer touch-manipulation select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                            isSlotSelected
                              ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                              : 'border-2 border-neutral-200 bg-white text-neutral-700 hover:border-black hover:text-black'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>

                  {activeShift.departureTime && (
                    <p className="text-xs text-[#e60000] font-bold mt-3">
                      {t.dinner1Notice} {activeShift.departureTime}.
                    </p>
                  )}
                  {activeShift.isDynamicLunch && (
                    <p className="text-xs text-neutral-500 font-medium mt-2">
                      {t.lunchNotice}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 4. PREFERENZA TAVOLO: SALA (36) vs ESTERNO (35) ("Dentro o fuori?") */}
            <div>
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {t.step4Title}
                </label>
                <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                  {availability?.isOutdoorActive ? t.outdoorActiveLabel : t.outdoorClosedLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label={t.step4Title}>
                {/* SALA INTERNA */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={seatingArea === 'indoor'}
                  onClick={() => setSeatingArea('indoor')}
                  className={`p-4 sm:p-5 border-2 text-left transition-all cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    seatingArea === 'indoor'
                      ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                      : 'border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-black text-lg sm:text-2xl tracking-tight text-black block">{t.indoorTitle}</span>
                        <span className="text-xs sm:text-sm font-bold text-neutral-500">{t.indoorSeats}</span>
                      </div>
                      {seatingArea === 'indoor' ? (
                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">
                      {t.indoorDesc}
                    </p>
                  </div>
                </button>

                {/* ESTERNO (PORTICO) */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={seatingArea === 'outdoor'}
                  disabled={!availability?.isOutdoorActive}
                  onClick={() => setSeatingArea('outdoor')}
                  className={`p-4 sm:p-5 border-2 text-left transition-all cursor-pointer touch-manipulation select-none active:scale-98 flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                    !availability?.isOutdoorActive
                      ? 'opacity-40 border-dashed border-neutral-300 bg-neutral-100 cursor-not-allowed'
                      : seatingArea === 'outdoor'
                      ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                      : 'border-2 border-neutral-200 bg-white text-neutral-600 hover:border-black hover:text-black'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-black text-lg sm:text-2xl tracking-tight text-black block">{t.outdoorTitle}</span>
                        <span className="text-xs sm:text-sm font-bold text-neutral-500">{t.outdoorSeats}</span>
                      </div>
                      {!availability?.isOutdoorActive ? (
                        <span className="px-2 py-0.5 bg-red-100 text-[#e60000] border border-red-300 text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
                          CHIUSO METEO
                        </span>
                      ) : seatingArea === 'outdoor' ? (
                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">
                      {availability?.isOutdoorActive ? t.outdoorDesc : t.outdoorDescClosed}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. DATI DI CONTATTO ("A che nome e numero?") */}
            <div className="space-y-4">
              <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black block">
                {t.step5Title}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg font-medium focus:border-black focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={t.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg font-medium focus:border-black focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm text-neutral-600 font-bold block mb-1.5">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-base sm:text-lg font-medium focus:border-black focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 6. ESIGENZE ALIMENTARI & NOTE ("Allergie o note?") */}
            <div>
              <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black block mb-3">
                {t.step6Title}
              </label>

              <div className="flex flex-wrap gap-2 sm:gap-3 mb-3">
                {t.dietaryOptions.map((opt) => {
                  const isChecked = selectedDietary.includes(opt.label);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleDietary(opt.label)}
                      className={`text-xs sm:text-base px-3.5 py-2 sm:px-5 sm:py-3 border-2 transition-colors cursor-pointer touch-manipulation select-none active:scale-95 font-bold ${
                        isChecked
                          ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                          : 'border-2 border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                placeholder={t.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-13 sm:h-16 px-4 border-2 border-neutral-300 bg-white text-xs sm:text-base focus:border-black focus:outline-none transition-colors font-medium"
              />
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 text-[#e60000] text-xs sm:text-base font-bold border-l-4 border-[#e60000]">
                {errorMessage}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2 sm:pt-4">
              <button
                type="submit"
                disabled={submitting || availability?.isClosed}
                className="w-full h-16 sm:h-22 bg-black hover:bg-[#e60000] border-2 border-black hover:border-[#e60000] disabled:opacity-30 text-white font-black text-base sm:text-2xl uppercase tracking-wider transition-colors cursor-pointer touch-manipulation select-none active:scale-98 flex items-center justify-center"
              >
                {submitting ? t.submittingButton : t.submitButton}
              </button>

              <p className="text-[11px] sm:text-sm text-neutral-500 text-center mt-3 font-medium">
                {t.guaranteeText}
              </p>
            </div>
          </form>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t-2 border-black py-8 px-4 sm:px-10 text-xs sm:text-sm text-neutral-600">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <strong className="text-black font-black text-sm sm:text-base">HANDA.</strong> — Via del Portello 32, 35131 Padova
            <div className="text-[11px] text-neutral-500 mt-0.5 font-medium">
              {t.footerOpening}
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
