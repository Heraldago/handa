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
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [showGroupModal, setShowGroupModal] = useState<boolean>(false);

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
          // If current shift is unavailable (e.g. Sunday lunch or concluded today), switch automatically to first available
          if (!currentAvailable) {
            const firstAvail = data.shifts.find((s: Shift) => s.available);
            if (firstAvail) {
              setSelectedShift(firstAvail.id);
              if (firstAvail.availableSlots?.length > 0) {
                setSelectedSlot(firstAvail.availableSlots[0]);
              }
            }
          } else if (currentAvailable.availableSlots?.length > 0) {
            // Check if selectedSlot is still valid in availableSlots
            if (!currentAvailable.availableSlots.includes(selectedSlot)) {
              setSelectedSlot(currentAvailable.availableSlots[0]);
            }
          }
        }

        // Auto-fallback from outdoor to indoor if outdoor was closed
        if (data && !data.isOutdoorActive && seatingArea === 'outdoor') {
          setSeatingArea('indoor');
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

  const handleOpenCalendar = () => {
    const input = dateInputRef.current;
    if (input) {
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
          return;
        } catch (err) {
          console.warn('showPicker error:', err);
        }
      }
      input.focus();
    }
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

  const handleShareBooking = async () => {
    if (!successBooking) return;
    const text = t.shareMessage({
      customerName: successBooking.customerName,
      date: successBooking.date,
      time: successBooking.time,
      shiftName: successBooking.shiftName,
      guestCount: successBooking.guestCount,
      seatingArea: successBooking.seatingArea,
      code: successBooking.code,
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `HANDĀ - ${successBooking.customerName} (#${successBooking.code})`,
          text: text,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      } catch (e) {
        console.error('Failed to copy reservation text', e);
      }
    }
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
    <main className="min-h-screen bg-[#faf8f5] bg-paper-texture text-black font-sans flex flex-col justify-between selection:bg-[#e60000] selection:text-white max-w-full overflow-x-hidden">
      {/* Top Header */}
      <header className="px-5 sm:px-10 md:px-14 lg:px-16 py-3.5 border-b-2 border-black sticky top-0 bg-[#faf8f5]/95 backdrop-blur-xs z-30 max-w-full">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-baseline gap-2 sm:gap-3 shrink-0">
            <span className="font-black text-2xl sm:text-4xl tracking-tighter text-black">
              HANDA<span className="text-[#e60000]">.</span>
            </span>
            <span className="text-xs sm:text-sm text-neutral-400 font-bold hidden sm:inline tracking-wider">
              {t.brandSubtitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm shrink-0">
            {/* Bilingual Switcher: IT | EN - Light, Colorful & Ultra-Legible */}
            <div
              className="inline-flex items-center gap-1 shrink-0"
              role="tablist"
              aria-label="Selettore lingua"
            >
              <button
                type="button"
                role="tab"
                aria-selected={lang === 'it'}
                onClick={() => handleLanguageSwitch('it')}
                className={`h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer select-none touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  lang === 'it'
                    ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs'
                    : 'border-2 border-neutral-200 bg-white text-neutral-400 font-bold hover:text-black hover:border-neutral-400 opacity-60 hover:opacity-100'
                }`}
                title="Italiano"
              >
                <span className="text-base leading-none" aria-hidden="true">🇮🇹</span>
                <span className="tracking-wider">IT</span>
                {lang === 'it' && (
                  <span className="text-[10px] font-black text-emerald-700">✓</span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={lang === 'en'}
                onClick={() => handleLanguageSwitch('en')}
                className={`h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer select-none touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                  lang === 'en'
                    ? 'border-2 border-blue-600 bg-blue-50 text-blue-950 font-black shadow-xs'
                    : 'border-2 border-neutral-200 bg-white text-neutral-400 font-bold hover:text-black hover:border-neutral-400 opacity-60 hover:opacity-100'
                }`}
                title="English"
              >
                <span className="text-base leading-none" aria-hidden="true">🇬🇧</span>
                <span className="tracking-wider">EN</span>
                {lang === 'en' && (
                  <span className="text-[10px] font-black text-blue-700">✓</span>
                )}
              </button>
            </div>

            <a
              href="https://www.instagram.com/handa_mushi/"
              target="_blank"
              rel="noreferrer"
              className="h-9 sm:h-10 border-2 border-neutral-300 hover:border-black px-3 sm:px-3.5 font-bold uppercase transition-colors flex items-center justify-center gap-1.5 shrink-0 text-xs sm:text-sm text-black touch-manipulation select-none active:scale-95"
              title="Instagram @handa_mushi"
            >
              <svg
                className="w-4 h-4 shrink-0 fill-current"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span className="hidden sm:inline">@handa_mushi</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl w-full mx-auto px-5 sm:px-10 md:px-14 lg:px-16 pt-6 sm:pt-10 pb-16 sm:pb-24 flex-1 max-w-full overflow-x-hidden">
        {/* Title */}
        <div className="mb-6 sm:mb-8">
          <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#e60000] block mb-1 sm:mb-2">
            {t.heroBadge}
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase text-black leading-none">
            {t.heroTitle}<span className="text-[#e60000]">.</span>
          </h1>
          <div className="text-xs sm:text-base text-neutral-600 mt-2.5 space-y-1">
            <p className="font-semibold">{t.heroHours}</p>
            <p className="text-neutral-400 text-xs sm:text-sm">
              {t.heroTagline}
            </p>
          </div>
        </div>

        {/* SUCCESS CONFIRMATION */}
        {successBooking ? (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* Top Navigation Bar: Back / New Reservation */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <button
                type="button"
                onClick={() => {
                  setSuccessBooking(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="h-10 sm:h-11 px-4 border-2 border-black bg-white hover:bg-black hover:text-white text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-100 flex items-center gap-2 cursor-pointer touch-manipulation select-none active:scale-95 shadow-xs"
              >
                <span>{t.newBooking}</span>
              </button>
              <span className="text-xs text-neutral-500 font-black uppercase tracking-widest">
                {lang === 'en' ? 'RESERVATION CONFIRMED' : 'PRENOTAZIONE COMPLETATA'}
              </span>
            </div>

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
              <button
                type="button"
                onClick={handleShareBooking}
                className="w-full h-14 sm:h-16 border-2 border-black bg-black hover:bg-[#e60000] hover:border-[#e60000] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-colors uppercase tracking-wider cursor-pointer touch-manipulation shadow-xs select-none active:scale-98"
              >
                <span>{copiedShare ? '✓' : '📤'}</span>
                <span>
                  {copiedShare
                    ? (lang === 'en' ? 'COPIED TO CLIPBOARD!' : 'COPIATO NEGLI APPUNTI!')
                    : t.shareBooking}
                </span>
              </button>

              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 sm:h-16 border-2 border-black bg-white hover:bg-neutral-100 text-black font-black text-sm sm:text-base flex items-center justify-center transition-colors uppercase tracking-wider cursor-pointer touch-manipulation shadow-xs select-none active:scale-98"
              >
                {t.addToGoogleCalendar}
              </a>

              {/* Prominent High-Visibility New Booking Button */}
              <button
                type="button"
                onClick={() => {
                  setSuccessBooking(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full h-14 sm:h-16 border-2 border-black bg-noren-active hover:bg-black hover:text-white text-black font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer touch-manipulation shadow-xs select-none active:scale-98"
              >
                <span>{t.makeAnotherBooking}</span>
              </button>

              <div className="pt-3 text-center">
                <Link
                  href={`/prenotazione/${successBooking.code}`}
                  className="text-xs sm:text-sm text-neutral-500 hover:text-black underline font-bold uppercase tracking-wider"
                >
                  {t.modifyOrCancel} →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* BOOKING FORM - FOLLOWS NATURAL VERBAL CONVERSATION ORDER */
          <form onSubmit={handleBookingSubmit} className="space-y-7 sm:space-y-10">
            {/* 1. NUMERO PERSONE ("Per quante persone?") */}
            <div>
              <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 mb-3">
                <label className="text-base sm:text-lg font-black uppercase tracking-wider text-black">
                  {t.step1Title}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                    {t.step1GroupNotice}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGroupModal(true)}
                    className="h-8 sm:h-9 px-3 border-2 border-black bg-white hover:bg-black hover:text-white text-black text-xs font-black uppercase tracking-wider transition-all duration-100 flex items-center gap-1.5 cursor-pointer touch-manipulation select-none active:scale-95 shadow-2xs"
                  >
                    <span className="text-xs">💬</span>
                    <span>{t.step1GroupAction}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t.step1Title}>
                {[1, 2, 3, 4].map((num) => {
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

                {/* 5+ Groups Button */}
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="h-14 sm:h-20 border-2 border-dashed border-neutral-300 hover:border-black bg-white hover:bg-neutral-50 text-black transition-all cursor-pointer touch-manipulation select-none active:scale-95 flex flex-col items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black group"
                  title={t.step1GroupModalTitle}
                >
                  <span className="text-lg sm:text-3xl font-black group-hover:text-[#e60000] leading-none">5+</span>
                  <span className="text-[9px] sm:text-[11px] font-black uppercase text-neutral-500 group-hover:text-black tracking-tight mt-0.5">
                    {lang === 'en' ? 'Groups ↗' : 'Gruppi ↗'}
                  </span>
                </button>
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
              <div className="flex sm:grid sm:grid-cols-7 gap-2 overflow-x-auto pb-2 scrollbar-none snap-x" role="radiogroup" aria-label={t.step2Title}>
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
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenCalendar}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenCalendar();
                  }
                }}
                className="mt-3 relative border-2 border-black bg-white hover:bg-neutral-50 transition-colors p-3.5 sm:p-4 flex items-center justify-between cursor-pointer touch-manipulation select-none active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
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
                  onClick={(e) => {
                    if (typeof e.currentTarget.showPicker === 'function') {
                      try {
                        e.currentTarget.showPicker();
                      } catch {}
                    }
                  }}
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
                        <p className={`text-xs sm:text-sm mt-1 leading-snug ${
                          isSelected ? 'text-black font-semibold' : 'text-neutral-600 font-medium'
                        }`}>
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
                        <p className={`text-xs sm:text-sm mt-1 leading-snug ${
                          isSelected ? 'text-black font-semibold' : 'text-neutral-600 font-medium'
                        }`}>
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
                        <p className={`text-xs sm:text-sm mt-1 leading-snug ${
                          isSelected ? 'text-black font-semibold' : 'text-neutral-600 font-medium'
                        }`}>
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
                        <span className={`text-xs sm:text-sm uppercase tracking-wider block ${
                          seatingArea === 'indoor' ? 'text-black font-black' : 'text-neutral-500 font-bold'
                        }`}>
                          {t.indoorSeats}
                        </span>
                      </div>
                      {seatingArea === 'indoor' ? (
                        <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                          ✓
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-neutral-300 block shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm leading-relaxed ${
                      seatingArea === 'indoor' ? 'text-black font-semibold' : 'text-neutral-600 font-medium'
                    }`}>
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
                        <span className={`text-xs sm:text-sm uppercase tracking-wider block ${
                          seatingArea === 'outdoor' ? 'text-black font-black' : 'text-neutral-500 font-bold'
                        }`}>
                          {t.outdoorSeats}
                        </span>
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
                    <p className={`text-xs sm:text-sm leading-relaxed ${
                      seatingArea === 'outdoor' ? 'text-black font-semibold' : 'text-neutral-600 font-medium'
                    }`}>
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
      <footer className="border-t-2 border-black py-8 px-5 sm:px-10 md:px-14 lg:px-16 text-xs sm:text-sm text-neutral-600">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
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
      {/* MODAL PRENOTAZIONI 5+ PERSONE / GRUPPI */}
      {showGroupModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setShowGroupModal(false)}
        >
          <div
            className="bg-white border-2 border-black max-w-md w-full p-6 sm:p-7 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-modal-title"
          >
            <div className="flex justify-between items-start mb-3 border-b border-black pb-3">
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#e60000] block">
                  {t.step1GroupModalSubtitle}
                </span>
                <h3 id="group-modal-title" className="text-xl sm:text-2xl font-black uppercase text-black leading-tight mt-0.5">
                  {t.step1GroupModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="w-10 h-10 flex items-center justify-center border-2 border-neutral-300 hover:border-black bg-white text-lg font-black cursor-pointer touch-manipulation select-none active:scale-95"
                title={t.step1GroupClose}
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-medium mb-5">
              {t.step1GroupModalDesc}
            </p>

            <div className="space-y-2.5">
              {/* 1. Phone Call */}
              <a
                href="tel:+393492330492"
                className="h-13 sm:h-14 w-full border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-manipulation select-none active:scale-95 shadow-xs"
              >
                <span className="text-base">📞</span>
                <span>{t.step1GroupCall}</span>
              </a>

              {/* 2. WhatsApp */}
              <a
                href="https://wa.me/393492330492?text=Ciao%20HAND%C4%80%2C%20vorrei%20informazioni%20per%20prenotare%20un%20tavolo%20per%20un%20gruppo%20da%205%2B%20persone."
                target="_blank"
                rel="noreferrer"
                className="h-13 sm:h-14 w-full border-2 border-emerald-600 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer touch-manipulation select-none active:scale-95"
              >
                <span className="text-base">💬</span>
                <span>{t.step1GroupWhatsapp}</span>
              </a>

              {/* 3. Email */}
              <a
                href="mailto:handa.ramen@gmail.com?subject=Richiesta%20Tavolo%20Gruppo%20(5%2B%20persone)&body=Ciao%20team%20HAND%C4%80%2C%0A%0AVorrei%20prenotare%20un%20tavolo%20per%20un%20gruppo.%0AData%20desiderata%3A%0ATurno%2FOrario%3A%0ANumero%20persone%3A%0ANome%20e%20recapito%3A%0A%0AGrazie!"
                className="h-12 w-full border-2 border-neutral-300 bg-white hover:border-black text-neutral-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95"
              >
                <span className="text-sm">✉️</span>
                <span>{t.step1GroupEmail}</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowGroupModal(false)}
              className="mt-4 w-full h-11 border-2 border-neutral-200 hover:border-neutral-400 bg-neutral-50 text-neutral-600 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-manipulation select-none active:scale-95"
            >
              {t.step1GroupClose}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
