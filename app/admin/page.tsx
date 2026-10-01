'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Booking, BookingStatus, ShiftId, Settings, SeatingArea } from '@/lib/types';

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ShiftId>('dinner_1');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'SEATED'>('ALL');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Walk-in modal
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInDate, setWalkInDate] = useState<string>('');
  const [walkInShift, setWalkInShift] = useState<ShiftId>('dinner_1');
  const [walkInTime, setWalkInTime] = useState<string>('19:30');
  const [walkInArea, setWalkInArea] = useState<SeatingArea>('indoor');
  const [walkInGuests, setWalkInGuests] = useState<number>(2);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInTable, setWalkInTable] = useState<string>('');
  const [walkInNotes, setWalkInNotes] = useState<string>('');
  const [savingWalkIn, setSavingWalkIn] = useState<boolean>(false);

  // Table assignment modal
  const [tableModalBooking, setTableModalBooking] = useState<Booking | null>(null);
  const [customTableInput, setCustomTableInput] = useState<string>('');

  const getRelativeIsoDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatBigDate = (iso: string): { label: string; fullDate: string; isToday: boolean } => {
    if (!iso) return { label: '', fullDate: '', isToday: false };
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3) return { label: '', fullDate: iso, isToday: false };
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);

    const daysFull = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthsFull = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const todayIso = getRelativeIsoDate(0);
    const tomorrowIso = getRelativeIsoDate(1);
    const yesterdayIso = getRelativeIsoDate(-1);

    const isToday = iso === todayIso;
    let label = '';
    if (isToday) label = 'OGGI';
    else if (iso === tomorrowIso) label = 'DOMANI';
    else if (iso === yesterdayIso) label = 'IERI';

    const fullDate = `${daysFull[dateObj.getDay()]} ${d} ${monthsFull[dateObj.getMonth()]}`;

    return { label, fullDate, isToday };
  };

  // Staff Security PIN Gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    const isAuth = sessionStorage.getItem('handa_staff_auth') === 'true';
    if (isAuth) {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '3232' || pinInput === 'handa') {
      setIsAuthenticated(true);
      sessionStorage.setItem('handa_staff_auth', 'true');
      setPinError('');
    } else {
      setPinError('PIN errato. Riprova.');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('handa_staff_auth');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const loadData = async (showLoading = true) => {
    if (!selectedDate) return;
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setSettings(data.settings);
        setAvailability(data.availability);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    if (!isAuthenticated) return;

    // Live auto-refresh every 4 seconds for real-time desk sync
    const interval = setInterval(() => {
      loadData(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedDate, isAuthenticated]);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
      );

      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const handleAssignTableDirect = async (bookingId: string, tableNumber: string) => {
    try {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, tableNumber: tableNumber.trim() } : b))
      );
      setTableModalBooking(null);
      setCustomTableInput('');

      await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableNumber: tableNumber.trim() }),
      });
    } catch (err) {
      console.error(err);
      loadData();
    }
  };

  const handleToggleLock = async (shiftId: ShiftId) => {
    try {
      const res = await fetch('/api/admin/toggle-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, shiftId }),
      });
      const data = await res.json();
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOutdoor = async () => {
    try {
      const current = stats?.isOutdoorActive;
      const res = await fetch('/api/admin/toggle-outdoor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, enabled: !current }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;

    setSavingWalkIn(true);
    const targetDate = walkInDate || selectedDate;
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          shiftId: walkInShift,
          time: walkInTime,
          seatingArea: walkInArea,
          guestCount: walkInGuests,
          customerName: walkInName,
          customerPhone: walkInPhone || 'Telefonata / Walk-In',
          tableNumber: walkInTable,
          notes: walkInNotes,
        }),
      });

      if (res.ok) {
        setShowWalkInModal(false);
        setWalkInName('');
        setWalkInPhone('');
        setWalkInTable('');
        setWalkInNotes('');
        if (targetDate !== selectedDate) {
          setSelectedDate(targetDate);
        } else {
          loadData();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWalkIn(false);
    }
  };

  const changeDateByDays = (delta: number) => {
    if (!selectedDate) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + delta);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Shift & booking computations
  const bigDateInfo = formatBigDate(selectedDate);
  const isShiftLocked = stats?.lockedShifts?.includes(activeTab);

  const shiftBookingsAll = bookings.filter(
    (b) => b.shiftId === activeTab && b.status !== 'CANCELLED'
  );

  const totalInShift = shiftBookingsAll.length;
  const waitingInShift = shiftBookingsAll.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'LATE'
  ).length;
  const seatedInShift = shiftBookingsAll.filter((b) => b.status === 'SEATED').length;

  const shiftIndoorBooked = shiftBookingsAll
    .filter((b) => b.seatingArea !== 'outdoor')
    .reduce((sum, b) => sum + b.guestCount, 0);

  const shiftOutdoorBooked = shiftBookingsAll
    .filter((b) => b.seatingArea === 'outdoor')
    .reduce((sum, b) => sum + b.guestCount, 0);

  const shiftTotalSeatedPax = shiftBookingsAll
    .filter((b) => b.status === 'SEATED')
    .reduce((sum, b) => sum + b.guestCount, 0);

  const currentTabBookings = bookings
    .filter((b) => b.shiftId === activeTab)
    .filter((b) => {
      if (statusFilter === 'WAITING') return b.status === 'CONFIRMED' || b.status === 'LATE';
      if (statusFilter === 'SEATED') return b.status === 'SEATED';
      return b.status !== 'CANCELLED';
    })
    .filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.tableNumber && b.tableNumber.toLowerCase().includes(q))
      );
    });

  const shiftsList: { id: ShiftId; label: string; time: string; sub: string }[] = [
    { id: 'lunch', label: 'Pranzo', time: '12:00 – 15:00', sub: 'Dinamico' },
    { id: 'dinner_1', label: '1° Turno Cena', time: '19:15 – 20:00', sub: 'Esce 21:15' },
    { id: 'dinner_2', label: '2° Turno Cena', time: '21:30 – 23:00', sub: 'A chiusura' },
  ];

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#faf8f5] bg-paper-texture text-black font-sans flex items-center justify-center p-4 selection:bg-[#e60000] selection:text-white">
        <div className="border-2 border-black bg-white max-w-sm w-full p-6 sm:p-8 animate-in fade-in duration-200 shadow-xl">
          <div className="mb-5 text-center sm:text-left">
            <span className="text-xs font-black uppercase tracking-widest text-[#e60000] block mb-1">
              ACCESSO RISERVATO • CASSA
            </span>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-black tracking-tight">
              STAFF DESK
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Digita il PIN per accedere alla gestione tavoli.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-black text-neutral-600 block mb-1.5 uppercase text-center sm:text-left">
                PIN DI SICUREZZA
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                readOnly
                placeholder="••••"
                value={pinInput}
                className="w-full h-14 border-2 border-neutral-300 focus:border-black text-center text-3xl font-black tracking-widest outline-none transition-colors bg-neutral-50 select-none cursor-default"
              />
            </div>

            {pinError && (
              <p className="text-xs font-black text-[#e60000] text-center">{pinError}</p>
            )}

            {/* POS Touch Keypad (Min 56px targets, 8px gap) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === 'C') setPinInput('');
                    else if (k === '⌫') setPinInput((prev) => prev.slice(0, -1));
                    else if (pinInput.length < 8) setPinInput((prev) => prev + k);
                  }}
                  className={`h-14 sm:h-15 text-xl font-black border-2 transition-all duration-75 flex items-center justify-center touch-manipulation select-none cursor-pointer active:scale-95 ${
                    k === 'C'
                      ? 'border-neutral-200 text-neutral-500 hover:border-black bg-neutral-50'
                      : k === '⌫'
                      ? 'border-neutral-200 text-neutral-700 hover:border-black bg-neutral-50'
                      : 'border-neutral-300 bg-white text-black hover:border-black hover:bg-neutral-50'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full h-14 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black text-sm uppercase tracking-wider transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-98 shadow-sm flex items-center justify-center"
            >
              Sblocca Dashboard →
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-200 text-center">
            <Link href="/" className="text-xs text-neutral-500 hover:text-black font-bold uppercase underline touch-manipulation">
              ← Torna alla prenotazione
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] bg-paper-texture text-black font-sans selection:bg-[#e60000] selection:text-white pb-36 max-w-full overflow-x-hidden">
      {/* 1. TOP HEADER (TOUCH-ROBUST: MIN 48PX TARGETS) */}
      <header className="border-b-2 border-black bg-[#faf8f5]/95 backdrop-blur-xs px-4 sm:px-8 py-3 sticky top-0 z-40 max-w-full overflow-hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand + Staff Desk Pill + Live Sync Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" className="font-black text-xl sm:text-2xl tracking-tight text-black hover:opacity-85 touch-manipulation select-none">
              HANDA<span className="text-[#e60000]">.</span>
            </Link>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 bg-black text-white">
              STAFF
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-[11px] font-bold text-neutral-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden xs:inline">LIVE SYNC</span>
            </div>
            <span className="text-xs text-neutral-400 font-bold hidden lg:inline">
              Via del Portello 32, Padova
            </span>
          </div>

          {/* Right: + Nuova Prenotazione / Walk-In + Vista Cliente + Esci */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setWalkInDate(selectedDate || getRelativeIsoDate(0));
                setShowWalkInModal(true);
              }}
              className="h-12 sm:h-12 px-4 sm:px-5 bg-black text-white hover:bg-[#e60000] text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-75 cursor-pointer flex items-center gap-2 shrink-0 touch-manipulation select-none active:scale-95 shadow-sm border border-black"
            >
              <span className="text-base">📞</span>
              <span className="sm:hidden">+ PRENOTA</span>
              <span className="hidden sm:inline">+ NUOVA PRENOTAZIONE</span>
            </button>

            <Link
              href="/"
              className="h-12 px-3.5 border-2 border-neutral-300 bg-white hover:border-black text-xs font-black uppercase hidden md:flex items-center justify-center shrink-0 touch-manipulation select-none active:scale-95 transition-all duration-75"
            >
              Vista Cliente ↗
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="h-12 px-3.5 border-2 border-neutral-200 bg-white hover:border-red-300 text-xs font-black text-neutral-500 hover:text-[#e60000] uppercase cursor-pointer shrink-0 touch-manipulation select-none active:scale-95 transition-all duration-75 flex items-center justify-center"
              title="Esci dalla sessione"
            >
              Esci 🔒
            </button>
          </div>
        </div>
      </header>

      {/* 2. OPERATIONS COMMAND CENTER (BIG DATE ORIENTATION & MASTER ESTERNO TOGGLE) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="pb-5 sm:pb-6 mb-5 sm:mb-6 border-b-2 border-black flex flex-col gap-4 sm:gap-5">
          {/* TOP ROW: FAST DAY JUMPERS & DATE PICKER (FULL WIDTH, NEVER CLIPPED) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap xs:flex-nowrap">
              <button
                type="button"
                onClick={() => changeDateByDays(-1)}
                className="h-12 w-12 sm:h-13 sm:w-13 border-2 border-neutral-300 hover:border-black bg-white flex items-center justify-center font-black text-lg cursor-pointer transition-all duration-75 shrink-0 touch-manipulation select-none active:scale-95"
                title="Giorno precedente"
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getRelativeIsoDate(0))}
                className={`h-12 sm:h-13 px-3.5 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-wider border-2 transition-all duration-75 cursor-pointer shrink-0 touch-manipulation select-none active:scale-95 ${
                  selectedDate === getRelativeIsoDate(0)
                    ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black'
                }`}
              >
                Oggi
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getRelativeIsoDate(1))}
                className={`h-12 sm:h-13 px-3.5 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-wider border-2 transition-all duration-75 cursor-pointer shrink-0 touch-manipulation select-none active:scale-95 ${
                  selectedDate === getRelativeIsoDate(1)
                    ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black'
                }`}
              >
                Domani
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getRelativeIsoDate(2))}
                className={`h-12 sm:h-13 px-3.5 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-wider border-2 transition-all duration-75 cursor-pointer shrink-0 touch-manipulation select-none active:scale-95 ${
                  selectedDate === getRelativeIsoDate(2)
                    ? 'border-2 border-black bg-noren-active text-black shadow-xs ring-1 ring-black'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black'
                }`}
              >
                Dopodomani
              </button>

              <button
                type="button"
                onClick={() => changeDateByDays(1)}
                className="h-12 w-12 sm:h-13 sm:w-13 border-2 border-neutral-300 hover:border-black bg-white flex items-center justify-center font-black text-lg cursor-pointer transition-all duration-75 shrink-0 touch-manipulation select-none active:scale-95"
                title="Giorno successivo"
              >
                →
              </button>
            </div>

            {/* Styled Date Picker Button (Min 48px hit area, never clipped, whitespace-nowrap, responsive width) */}
            <label className="relative h-12 sm:h-13 px-4 border-2 border-neutral-300 hover:border-black bg-white flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm font-black text-neutral-800 transition-all duration-75 shrink-0 touch-manipulation select-none active:scale-95 whitespace-nowrap w-full sm:w-auto">
              <span>📅 Scegli Data</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full touch-manipulation"
              />
            </label>
          </div>

          {/* LOWER ROW: BIG DATE ORIENTATION (LEFT) & MASTER ESTERNO TOGGLE (RIGHT) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pt-1">
            <div className="flex-1">
              {/* BIG PROMINENT DATE HEADING (READABLE AT A GLANCE FROM AFAR) */}
              <div className="flex items-center gap-2 mb-1">
                {bigDateInfo.label ? (
                  <span
                    className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 ${
                      bigDateInfo.isToday ? 'bg-[#e60000] text-white' : 'bg-black text-white'
                    }`}
                  >
                    {bigDateInfo.label}
                  </span>
                ) : (
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-500">
                    DATA SELEZIONATA
                  </span>
                )}
                <span className="text-xs font-bold text-neutral-400">
                  • Servizio Tavoli HANDĀ
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-black leading-tight sm:leading-none">
                {bigDateInfo.fullDate}
              </h1>

              {/* DAY TOTAL COVERS METRICS */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-sm font-bold text-neutral-600 mt-2 sm:mt-3">
                <div>
                  Totale Giorno:{' '}
                  <strong className="text-black font-black text-sm sm:text-base">{stats?.totalCovers || 0}</strong>{' '}
                  pax
                </div>
                <span className="text-neutral-300">·</span>
                <div>
                  Seduti:{' '}
                  <strong className="text-[#e60000] font-black text-sm sm:text-base">
                    {stats?.seatedCovers || 0}
                  </strong>{' '}
                  pax
                </div>
                <span className="text-neutral-300">·</span>
                <div>
                  Da Accogliere:{' '}
                  <strong className="text-black font-black text-sm sm:text-base">
                    {Math.max(0, (stats?.totalCovers || 0) - (stats?.seatedCovers || 0))}
                  </strong>{' '}
                  pax
                </div>
              </div>
            </div>

            {/* RIGHT: MASTER ESTERNO (OUTDOOR) TOGGLE SWITCH — VERDE SU APERTO, ROSSO SU CHIUSO */}
            <div className="flex flex-col sm:items-start lg:items-end justify-center shrink-0 w-full lg:w-auto">
            <div className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-1.5 flex items-center justify-between sm:justify-end gap-2 w-full">
              <span>Tavoli Esterni (Portico 35 Posti)</span>
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                  stats?.isOutdoorActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {stats?.isOutdoorActive ? '● ATTIVO' : '✕ DISATTIVATO'}
              </span>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(stats?.isOutdoorActive)}
              aria-label="Interruttore stato tavoli esterni sotto il portico"
              onClick={handleToggleOutdoor}
              className={`w-full lg:w-auto min-h-[56px] p-4 sm:px-6 sm:py-4 border-2 transition-all duration-75 cursor-pointer flex items-center justify-between sm:justify-start gap-5 text-left select-none touch-manipulation active:scale-[0.98] ${
                stats?.isOutdoorActive
                  ? 'border-emerald-600 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 shadow-xs'
                  : 'border-red-600 bg-red-50/90 hover:bg-red-100/90 text-red-950'
              }`}
              title={
                stats?.isOutdoorActive
                  ? "Esterno aperto: Clicca per chiudere i tavoli esterni per pioggia o freddo"
                  : "Esterno chiuso: Clicca per riaprire i 35 posti esterni sotto il portico"
              }
            >
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl leading-none" aria-hidden="true">
                    {stats?.isOutdoorActive ? '☀️' : '🌧️'}
                  </span>
                  <span
                    className={`font-black text-base sm:text-lg uppercase tracking-wider ${
                      stats?.isOutdoorActive ? 'text-emerald-900' : 'text-red-700'
                    }`}
                  >
                    {stats?.isOutdoorActive ? 'ESTERNO APERTO' : 'ESTERNO CHIUSO'}
                  </span>
                </div>
                <div className="text-xs font-semibold opacity-90 mt-1">
                  {stats?.isOutdoorActive
                    ? '35 posti portico attivi e prenotabili online'
                    : 'Chiuso per meteo · Solo 36 sala interna'}
                </div>
              </div>

              {/* SEMANTIC TOGGLE TRACK: VERDE SU APERTO, ROSSO SU CHIUSO */}
              <div
                aria-hidden="true"
                className={`relative w-18 h-9 border-2 transition-colors duration-150 flex items-center p-0.5 shrink-0 ${
                  stats?.isOutdoorActive
                    ? 'border-emerald-800 bg-emerald-600 justify-end'
                    : 'border-red-800 bg-red-600 justify-start'
                }`}
              >
                <div className="w-7 h-7 bg-white shadow-xs transition-transform duration-150" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. SHIFT SEGMENTED TABS (MIN 56PX HEIGHT, GAP >= 8PX) */}
        <div className="grid grid-cols-3 border-2 border-black bg-neutral-100 p-2 gap-2 mb-5 select-none">
          {shiftsList.map((shift) => {
            const isSelected = activeTab === shift.id;
            const shiftBookings = bookings.filter(
              (b) => b.shiftId === shift.id && b.status !== 'CANCELLED'
            );
            const totalPax = shiftBookings.reduce((sum, b) => sum + b.guestCount, 0);
            const isLocked = stats?.lockedShifts?.includes(shift.id);

            return (
              <button
                key={shift.id}
                type="button"
                onClick={() => setActiveTab(shift.id)}
                className={`min-h-[56px] py-3 px-3 sm:px-4 text-center sm:text-left transition-all duration-75 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-1.5 touch-manipulation select-none active:scale-[0.98] ${
                  isSelected
                    ? 'bg-white bg-noren-active border-2 border-black text-black shadow-xs ring-1 ring-black'
                    : 'bg-white/60 border border-neutral-300 text-neutral-700 hover:text-black hover:border-black'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider block text-black">
                    {shift.label}
                  </span>
                  <span
                    className={`text-[11px] font-medium hidden md:inline ${
                      isSelected ? 'text-neutral-700 font-bold' : 'text-neutral-500'
                    }`}
                  >
                    ({shift.time})
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocked && (
                    <span className="text-[10px] font-black uppercase text-[#e60000] bg-red-50 border border-red-300 px-1.5 py-0.5">
                      BLOCCATO
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-black text-black px-2 py-0.5 bg-neutral-100 border border-neutral-200">
                    {totalPax} pax
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 4. UTILITY STRIP: CAPACITY BREAKDOWN + LOCK SHIFT + SEARCH & STATUS FILTER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-5 mb-5 border-b-2 border-black">
          {/* Capacity Breakdown & Lock Toggle */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-bold text-neutral-700">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300">
              <span className="text-neutral-400 uppercase text-[11px] tracking-wider font-bold">Sala:</span>
              <span className="text-black font-black text-base">{shiftIndoorBooked}</span>
              <span className="text-neutral-400 text-xs">/36</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300">
              <span className="text-neutral-400 uppercase text-[11px] tracking-wider font-bold">Esterno:</span>
              <span
                className={`font-black text-base ${
                  stats?.isOutdoorActive ? 'text-emerald-700' : 'text-neutral-400 line-through'
                }`}
              >
                {shiftOutdoorBooked}
              </span>
              <span className="text-neutral-400 text-xs">/35</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  stats?.isOutdoorActive ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300">
              <span className="text-neutral-400 uppercase text-[11px] tracking-wider font-bold">Seduti:</span>
              <span className="text-[#e60000] font-black text-base">{shiftTotalSeatedPax}</span>
              <span className="text-neutral-400 text-xs">pax</span>
            </div>

            <button
              type="button"
              onClick={() => handleToggleLock(activeTab)}
              className={`h-12 min-h-[48px] px-4 text-xs sm:text-sm font-black uppercase tracking-wider border-2 transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95 ${
                isShiftLocked
                  ? 'border-[#e60000] bg-red-50 text-[#e60000] hover:bg-[#e60000] hover:text-white'
                  : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
              }`}
            >
              {isShiftLocked ? '🔴 Turno Bloccato (Sblocca)' : '🔒 Blocca Turno'}
            </button>
          </div>

          {/* Status Filter & Fast Search (Min 48px Touch Targets & >= 8px gap) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Filter Separate Pills */}
            <div className="flex items-center gap-2 select-none">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`h-12 min-w-[75px] sm:min-w-[95px] px-3.5 text-xs sm:text-sm font-bold uppercase transition-all duration-75 cursor-pointer flex items-center justify-center gap-2 border-2 touch-manipulation select-none active:scale-95 ${
                  statusFilter === 'ALL'
                    ? 'bg-noren-active text-black font-black border-black shadow-xs ring-1 ring-black'
                    : 'border-neutral-300 bg-white text-neutral-600 hover:text-black hover:border-black'
                }`}
              >
                <span>Tutti</span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 ${statusFilter === 'ALL' ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                  {totalInShift}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('WAITING')}
                className={`h-12 min-w-[100px] sm:min-w-[125px] px-3.5 text-xs sm:text-sm font-bold uppercase border-2 transition-all duration-75 cursor-pointer flex items-center justify-center gap-2 touch-manipulation select-none active:scale-95 ${
                  statusFilter === 'WAITING'
                    ? 'border-amber-500 bg-amber-400 text-amber-950 font-black shadow-xs ring-1 ring-amber-500'
                    : 'border-amber-200 text-amber-900 bg-amber-50/70 hover:bg-amber-100'
                }`}
              >
                <span>● In Attesa</span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 ${statusFilter === 'WAITING' ? 'bg-amber-950 text-white' : 'bg-amber-100 text-amber-900'}`}>
                  {waitingInShift}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SEATED')}
                className={`h-12 min-w-[100px] sm:min-w-[125px] px-3.5 text-xs sm:text-sm font-bold uppercase border-2 transition-all duration-75 cursor-pointer flex items-center justify-center gap-2 touch-manipulation select-none active:scale-95 ${
                  statusFilter === 'SEATED'
                    ? 'border-emerald-700 bg-emerald-600 text-white font-black shadow-xs ring-1 ring-emerald-700'
                    : 'border-emerald-200 text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100'
                }`}
              >
                <span>✓ Seduti</span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 ${statusFilter === 'SEATED' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                  {seatedInShift}
                </span>
              </button>
            </div>

            {/* Search Input (Min 48px height, 16px font prevents iOS zoom) */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca nome, tel, tavolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 h-12 px-3.5 pr-10 border-2 border-neutral-300 bg-white text-base font-bold focus:border-black focus:outline-none transition-colors touch-manipulation"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-0 top-0 w-12 h-12 flex items-center justify-center text-sm font-black text-neutral-400 hover:text-black cursor-pointer touch-manipulation select-none active:scale-90"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 5. BOOKINGS LIST ("REGISTRO TAVOLI" - OPTIMIZED FOR MOBILE TOUCH) */}
        {loading ? (
          <div className="py-20 text-center text-neutral-400 font-bold">
            Caricamento servizio in corso...
          </div>
        ) : currentTabBookings.length === 0 ? (
          <div className="py-16 border border-dashed border-neutral-300 text-center font-sans bg-neutral-50/50 p-4">
            <p className="text-neutral-600 font-black uppercase tracking-wider text-sm">
              Nessuna prenotazione trovata per questo turno
            </p>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1.5">
              Clicca su <span className="font-bold text-black">&quot;+ PRENOTA&quot;</span> in alto per registrare una telefonata o clienti al banco.
            </p>
          </div>
        ) : (
          <div className="space-y-3 font-sans">
            {currentTabBookings.map((b) => {
              const isSeated = b.status === 'SEATED';
              const isLate = b.status === 'LATE';
              const isNoShow = b.status === 'NOSHOW';
              const isIndoor = b.seatingArea !== 'outdoor';

              return (
                <div
                  key={b.id}
                  className={`p-3.5 sm:p-4 border-2 transition-colors flex flex-col justify-between gap-3 ${
                    isSeated
                      ? 'border-neutral-200 bg-neutral-50/70'
                      : isNoShow
                      ? 'border-neutral-200 bg-neutral-100/60 opacity-60'
                      : isLate
                      ? 'border-[#e60000] bg-red-50/20'
                      : 'border-neutral-300 bg-white hover:border-black'
                  }`}
                >
                  {/* Top Line: Time & Table | Pax & Area */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-200">
                    <div className="flex items-center gap-3">
                      {/* Arrival Time (Big, glanceable) */}
                      <span className="text-2xl sm:text-3xl font-black block leading-none text-black">
                        {b.time}
                      </span>

                      {/* Table Pill (Touch-Friendly: Min 48px height, instant modal) */}
                      <button
                        type="button"
                        onClick={() => {
                          setTableModalBooking(b);
                          setCustomTableInput(b.tableNumber || '');
                        }}
                        className={`h-12 min-w-[110px] px-3.5 text-xs sm:text-sm font-black uppercase transition-all duration-75 cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation select-none active:scale-95 ${
                          b.tableNumber
                            ? 'border-2 border-black bg-neutral-100 hover:bg-neutral-200 text-black shadow-xs'
                            : 'border-2 border-dashed border-neutral-400 text-neutral-600 hover:border-black hover:text-black bg-white'
                        }`}
                        title="Tocca per assegnare o cambiare tavolo"
                      >
                        <span>🍽️</span>
                        <span>{b.tableNumber ? `TAV. ${b.tableNumber}` : '+ TAVOLO'}</span>
                      </button>

                      <span className="text-xs font-mono font-bold text-neutral-400 uppercase hidden sm:inline">
                        #{b.code}
                      </span>
                    </div>

                    {/* Pax & Area */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl font-black text-black">
                        {b.guestCount} PAX
                      </span>
                      <span
                        className={`text-xs font-black uppercase px-2.5 py-1 border-2 ${
                          isIndoor
                            ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                            : stats?.isOutdoorActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                            : 'bg-red-50 text-red-700 border-red-300 line-through'
                        }`}
                      >
                        {isIndoor ? 'SALA' : 'ESTERNO'}
                      </span>
                      {b.isWalkIn && (
                        <span className="text-[10px] font-black uppercase text-neutral-600 bg-neutral-200 border border-neutral-300 px-1.5 py-0.5">
                          WALK-IN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Line: Customer Name, Phone & Dietary Alerts */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <strong className="text-xl font-black text-black tracking-tight">
                        {b.customerName}
                      </strong>
                      {b.customerPhone && (
                        <a
                          href={`tel:${b.customerPhone.replace(/[^0-9+]/g, '')}`}
                          className="h-12 px-3.5 border-2 border-neutral-300 bg-white hover:border-black hover:bg-neutral-50 text-black font-bold text-sm transition-all duration-75 flex items-center gap-2 touch-manipulation select-none active:scale-95 shadow-xs"
                          title="Chiama al telefono"
                        >
                          <span className="text-base">📞</span>
                          <span>{b.customerPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Dietary / Notes alerts */}
                    {(b.dietary?.length > 0 || b.notes) && (
                      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs sm:text-sm">
                        {b.dietary?.map((diet) => (
                          <span
                            key={diet}
                            className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-red-50 text-[#e60000] border border-red-200"
                          >
                            ⚠️ {diet}
                          </span>
                        ))}
                        {b.notes && (
                          <span className="text-neutral-700 italic text-xs sm:text-sm block w-full mt-1 bg-amber-50/50 p-2 border-l-2 border-amber-400">
                            Nota: {b.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Line: Touch-Friendly Primary & Secondary Actions (Min 48px-56px, Gap >= 8px) */}
                  <div className="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
                    {/* CONFIRMED STATE */}
                    {!isSeated && !isLate && !isNoShow && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'SEATED')}
                          className="w-full sm:w-auto h-14 sm:h-14 px-6 sm:px-8 bg-black hover:bg-[#e60000] text-white text-sm sm:text-base font-black uppercase tracking-wider transition-all duration-75 cursor-pointer flex items-center justify-center gap-2.5 shadow-sm touch-manipulation select-none active:scale-95"
                        >
                          <span className="text-lg">✓</span>
                          <span>Accogli / Siedi al Tavolo</span>
                        </button>

                        <div className="flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'LATE')}
                            className="h-12 px-4 text-xs sm:text-sm font-bold uppercase border-2 border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Segna in ritardo"
                          >
                            ⏳ Ritardo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'NOSHOW')}
                            className="h-12 px-4 text-xs sm:text-sm font-bold uppercase border-2 border-neutral-300 bg-white text-neutral-500 hover:border-black hover:text-black transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Segna No-Show"
                          >
                            ✕ No-Show
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Vuoi cancellare la prenotazione di ${b.customerName}?`)) {
                                handleUpdateStatus(b.id, 'CANCELLED');
                              }
                            }}
                            className="h-12 px-4 text-xs sm:text-sm font-bold uppercase border-2 border-neutral-200 bg-white text-neutral-400 hover:text-[#e60000] hover:border-red-300 transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Elimina"
                          >
                            Elimina
                          </button>
                        </div>
                      </>
                    )}

                    {/* SEATED STATE */}
                    {isSeated && (
                      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="h-12 px-4 flex items-center justify-center sm:justify-start gap-2.5 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-emerald-400">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Al Tavolo (Seduti)
                        </span>

                        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                            className="h-12 px-4 border-2 border-neutral-300 bg-white hover:border-black text-xs sm:text-sm font-bold uppercase transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Riporta in attesa"
                          >
                            Riporta in attesa
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Vuoi cancellare la prenotazione di ${b.customerName}?`)) {
                                handleUpdateStatus(b.id, 'CANCELLED');
                              }
                            }}
                            className="h-12 px-4 border-2 border-neutral-200 bg-white text-neutral-400 hover:text-[#e60000] hover:border-red-300 text-xs sm:text-sm font-bold uppercase transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Elimina"
                          >
                            ✕ Elimina
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LATE STATE */}
                    {isLate && (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="h-12 px-4 flex items-center text-xs sm:text-sm font-black uppercase tracking-wider bg-red-50 text-[#e60000] border-2 border-[#e60000]">
                            ⏳ In Ritardo
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'SEATED')}
                            className="h-12 px-5 bg-black text-white hover:bg-[#e60000] text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            ✓ Siedi
                          </button>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3 justify-end">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'NOSHOW')}
                            className="h-12 px-4 text-xs sm:text-sm font-bold uppercase border-2 border-neutral-300 bg-white text-neutral-600 hover:border-black hover:text-black transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            No-Show
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Vuoi cancellare la prenotazione di ${b.customerName}?`)) {
                                handleUpdateStatus(b.id, 'CANCELLED');
                              }
                            }}
                            className="h-12 px-4 text-xs sm:text-sm font-bold uppercase border-2 border-neutral-200 bg-white text-neutral-400 hover:text-[#e60000] hover:border-red-300 transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Elimina"
                          >
                            ✕ Elimina
                          </button>
                        </div>
                      </>
                    )}

                    {/* NO-SHOW STATE */}
                    {isNoShow && (
                      <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="h-12 px-4 flex items-center justify-center sm:justify-start text-xs sm:text-sm font-bold uppercase text-neutral-500 bg-neutral-100 border-2 border-neutral-300">
                          ✕ No-Show
                        </span>
                        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                            className="h-12 px-4 border-2 border-neutral-300 bg-white hover:border-black text-xs sm:text-sm font-bold uppercase transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                          >
                            Ripristina
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Vuoi cancellare definitivamente la prenotazione di ${b.customerName}?`)) {
                                handleUpdateStatus(b.id, 'CANCELLED');
                              }
                            }}
                            className="h-12 px-4 border-2 border-neutral-200 bg-white text-neutral-400 hover:text-[#e60000] hover:border-red-300 text-xs sm:text-sm font-bold uppercase transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95"
                            title="Elimina"
                          >
                            ✕ Elimina
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. TELEPHONE / WALK-IN MODAL (VERBAL CONVERSATIONAL FLOW - TOUCH POS OPTIMIZED) */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white border-2 border-black max-w-xl w-full p-4 sm:p-7 animate-in fade-in duration-150 my-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-4 sm:mb-5 border-b border-black pb-3">
              <div>
                <span className="text-[10px] sm:text-xs text-[#e60000] font-black uppercase tracking-widest block">
                  📞 PRESA RAPIDA AL TELEFONO & WALK-IN
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-black leading-tight mt-0.5">
                  + Nuova Prenotazione Tavolo
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  Ordine vocale naturale: Persone → Data → Orario → Sala/Esterno → Nome/Tel → Note
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="w-12 h-12 flex items-center justify-center border-2 border-neutral-300 hover:border-black bg-white text-xl font-black cursor-pointer touch-manipulation select-none active:scale-95 transition-all"
                title="Chiudi"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4 sm:space-y-5">
              {/* 1. QUANTE PERSONE? (MIN 56PX POS BUTTONS) */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    1. Per quante persone?
                  </label>
                  <span className="text-xs text-neutral-500 font-bold">
                    Selezionato: <strong className="text-black">{walkInGuests} PAX</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setWalkInGuests(n)}
                      className={`h-14 font-black text-lg sm:text-xl border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                        walkInGuests === n
                          ? 'border-black bg-black text-white shadow-xs'
                          : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-2 text-xs sm:text-sm">
                  <span className="text-neutral-500 font-bold">Più di 8 persone?</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Altro n."
                    value={walkInGuests > 8 ? walkInGuests : ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setWalkInGuests(v);
                    }}
                    className="w-24 h-12 px-2 border-2 border-neutral-300 text-base font-black text-center focus:border-black focus:outline-none touch-manipulation"
                  />
                </div>
              </div>

              {/* 2. PER QUALE DATA? (MIN 52PX BUTTONS) */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    2. Per che data?
                  </label>
                  <span className="text-xs text-neutral-600 font-black uppercase">
                    {walkInDate || selectedDate}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(0))}
                    className={`h-13 sm:h-14 text-xs sm:text-sm font-black uppercase border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(0)
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(1))}
                    className={`h-13 sm:h-14 text-xs sm:text-sm font-black uppercase border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(1)
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    Domani
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(2))}
                    className={`h-13 sm:h-14 text-xs sm:text-sm font-black uppercase border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(2)
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    Dopodomani
                  </button>
                  <input
                    type="date"
                    value={walkInDate || selectedDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="h-13 sm:h-14 px-3 border-2 border-neutral-300 focus:border-black text-xs sm:text-sm font-black uppercase cursor-pointer touch-manipulation select-none bg-white"
                  />
                </div>
              </div>

              {/* 3. TURNO & ORARIO DI ARRIVO */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    3. Turno & Orario di arrivo
                  </label>
                  <span className="text-xs text-neutral-600 font-bold">
                    Orario: <strong className="text-black font-black">{walkInTime}</strong>
                  </span>
                </div>

                {/* Shift Selector Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('lunch');
                      setWalkInTime('13:00');
                    }}
                    className={`min-h-[58px] sm:min-h-[64px] py-2 px-1 text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center touch-manipulation select-none active:scale-95 ${
                      walkInShift === 'lunch'
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black uppercase">PRANZO</span>
                    <span className={`text-[11px] ${walkInShift === 'lunch' ? 'text-neutral-300' : 'text-neutral-500'}`}>12:00 – 15:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('dinner_1');
                      setWalkInTime('19:30');
                    }}
                    className={`min-h-[58px] sm:min-h-[64px] py-2 px-1 text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center touch-manipulation select-none active:scale-95 ${
                      walkInShift === 'dinner_1'
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black uppercase">1° TURNO CENA</span>
                    <span className={`text-[11px] ${walkInShift === 'dinner_1' ? 'text-neutral-300' : 'text-neutral-500'}`}>19:15 (esce 21:15)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('dinner_2');
                      setWalkInTime('21:30');
                    }}
                    className={`min-h-[58px] sm:min-h-[64px] py-2 px-1 text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center touch-manipulation select-none active:scale-95 ${
                      walkInShift === 'dinner_2'
                        ? 'border-black bg-black text-white shadow-xs'
                        : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-black uppercase">2° TURNO CENA</span>
                    <span className={`text-[11px] ${walkInShift === 'dinner_2' ? 'text-neutral-300' : 'text-neutral-500'}`}>21:30 – 23:00</span>
                  </button>
                </div>

                {/* Quick Slot Chips (Min 48px height, 64px width) */}
                <div className="p-3 bg-neutral-100 border-2 border-neutral-200">
                  <div className="text-xs uppercase font-black text-neutral-500 mb-2">
                    Tocca per selezionare l&apos;orario concordato:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(walkInShift === 'lunch'
                      ? ['12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00']
                      : walkInShift === 'dinner_1'
                      ? ['19:15', '19:30', '19:45', '20:00']
                      : ['21:30', '21:45', '22:00']
                    ).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setWalkInTime(slot)}
                        className={`h-12 min-w-[64px] px-3.5 text-sm sm:text-base font-black border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                          walkInTime === slot
                            ? 'border-black bg-black text-white shadow-xs'
                            : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:text-black'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-bold text-neutral-500">Altro:</span>
                      <input
                        type="text"
                        placeholder="HH:MM"
                        value={walkInTime}
                        onChange={(e) => setWalkInTime(e.target.value)}
                        className="w-20 h-12 px-2 border-2 border-neutral-300 bg-white text-base font-black text-center focus:border-black focus:outline-none touch-manipulation"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. PREFERENZA TAVOLO (SALA O ESTERNO) */}
              <div>
                <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black block mb-1.5">
                  4. Preferenza Tavolo (Dentro o Fuori?)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWalkInArea('indoor')}
                    className={`min-h-[64px] p-3.5 sm:p-4 text-left border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                      walkInArea === 'indoor'
                        ? 'border-2 border-black bg-white text-black shadow-md ring-1 ring-black'
                        : 'border-2 border-neutral-300 bg-white text-neutral-700 hover:border-black'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-black text-sm sm:text-base text-black">🏠 SALA INTERNA</div>
                      {walkInArea === 'indoor' ? (
                        <span className="px-2 py-0.5 bg-black text-white text-xs font-black uppercase tracking-wider">✓</span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-neutral-300" />
                      )}
                    </div>
                    <div className="text-xs font-medium text-neutral-600">
                      36 posti coperti garantiti
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalkInArea('outdoor')}
                    className={`min-h-[64px] p-3.5 sm:p-4 text-left border-2 transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                      walkInArea === 'outdoor'
                        ? 'border-2 border-black bg-white text-black shadow-md ring-1 ring-black'
                        : 'border-2 border-neutral-300 bg-white text-neutral-700 hover:border-black'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-black text-sm sm:text-base text-black">🌿 ESTERNO (PORTICO)</div>
                      {walkInArea === 'outdoor' ? (
                        <span className="px-2 py-0.5 bg-black text-white text-xs font-black uppercase tracking-wider">✓</span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border-2 border-neutral-300" />
                      )}
                    </div>
                    <div className="text-xs font-medium text-neutral-600">
                      35 posti sotto il portico
                    </div>
                  </button>
                </div>
              </div>

              {/* 5. DATI CLIENTE (NOME & CELLULARE - MIN 52PX INPUTS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1 uppercase">
                    5. NOME CLIENTE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Luca Ferrari"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="w-full h-13 sm:h-14 px-3.5 border-2 border-neutral-300 font-black focus:border-black focus:outline-none text-base touch-manipulation"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 uppercase">
                    NUMERO DI TELEFONO
                  </label>
                  <input
                    type="tel"
                    placeholder="340 0000000"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full h-13 sm:h-14 px-3.5 border-2 border-neutral-300 font-bold focus:border-black focus:outline-none text-base touch-manipulation"
                  />
                </div>
              </div>

              {/* 6. NOTE RAPIDE & TAVOLO ASSEGNATO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1 uppercase">
                    6. TAVOLO (OPZIONALE)
                  </label>
                  <input
                    type="text"
                    placeholder="Es. T3, T5, Bancone..."
                    value={walkInTable}
                    onChange={(e) => setWalkInTable(e.target.value)}
                    className="w-full h-13 sm:h-14 px-3.5 border-2 border-neutral-300 text-base font-bold focus:border-black focus:outline-none touch-manipulation"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 uppercase">
                    NOTE / INTOLLERANZE
                  </label>
                  <input
                    type="text"
                    placeholder="Es. No glutine, seggiolone, cane..."
                    value={walkInNotes}
                    onChange={(e) => setWalkInNotes(e.target.value)}
                    className="w-full h-13 sm:h-14 px-3.5 border-2 border-neutral-300 text-base font-bold focus:border-black focus:outline-none touch-manipulation"
                  />
                </div>
              </div>

              {/* Action Buttons (Min 56px-64px height) */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 h-14 sm:h-16 border-2 border-neutral-300 hover:border-black font-black uppercase text-xs sm:text-sm cursor-pointer transition-colors touch-manipulation select-none active:scale-95"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingWalkIn}
                  className="flex-[2] h-14 sm:h-16 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black uppercase text-xs sm:text-base tracking-wider cursor-pointer transition-colors flex items-center justify-center touch-manipulation select-none active:scale-95"
                >
                  {savingWalkIn ? 'Salvataggio...' : 'CONFERMA E SALVA NEL REGISTRO →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. TABLE ASSIGNMENT TOUCH MODAL (FAST POS TOUCH SELECTION) */}
      {tableModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white border-2 border-black max-w-lg w-full p-4 sm:p-6 animate-in fade-in duration-150 my-auto shadow-2xl">
            <div className="flex justify-between items-start mb-4 border-b border-black pb-3">
              <div>
                <span className="text-[10px] sm:text-xs text-[#e60000] font-black uppercase tracking-widest block">
                  🍽️ ASSEGNAZIONE TAVOLO POS
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-black leading-tight mt-0.5">
                  {tableModalBooking.customerName}
                </h3>
                <p className="text-xs text-neutral-600 font-bold mt-1">
                  {tableModalBooking.guestCount} PAX • Ore {tableModalBooking.time} • Area: {tableModalBooking.seatingArea === 'outdoor' ? '🌿 Esterno Portico' : '🏠 Sala Interna'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTableModalBooking(null)}
                className="w-12 h-12 flex items-center justify-center border-2 border-neutral-300 hover:border-black bg-white text-xl font-black cursor-pointer touch-manipulation select-none active:scale-95"
                title="Chiudi"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Quick Tap Table Buttons: SALA INTERNA */}
              <div>
                <div className="text-xs font-black uppercase text-neutral-700 tracking-wider mb-2 flex items-center justify-between">
                  <span>🏠 Tavoli Sala Interna (Coperti)</span>
                  <span className="text-[11px] font-bold text-neutral-400">T1 – T8</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'].map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => handleAssignTableDirect(tableModalBooking.id, tbl)}
                      className={`h-14 font-black text-base border-2 transition-all cursor-pointer flex items-center justify-center touch-manipulation select-none active:scale-95 ${
                        tableModalBooking.tableNumber === tbl
                          ? 'border-black bg-black text-white shadow-md ring-2 ring-black'
                          : 'border-neutral-300 bg-white text-neutral-900 hover:border-black hover:bg-neutral-100'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tap Table Buttons: BANCONE */}
              <div>
                <div className="text-xs font-black uppercase text-neutral-700 tracking-wider mb-2 flex items-center justify-between">
                  <span>🍸 Posti Bancone Izakaya</span>
                  <span className="text-[11px] font-bold text-neutral-400">B1 – B4</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['B1', 'B2', 'B3', 'B4'].map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => handleAssignTableDirect(tableModalBooking.id, tbl)}
                      className={`h-14 font-black text-base border-2 transition-all cursor-pointer flex items-center justify-center touch-manipulation select-none active:scale-95 ${
                        tableModalBooking.tableNumber === tbl
                          ? 'border-black bg-black text-white shadow-md ring-2 ring-black'
                          : 'border-neutral-300 bg-white text-neutral-900 hover:border-black hover:bg-neutral-100'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tap Table Buttons: ESTERNO / PORTICO */}
              <div>
                <div className="text-xs font-black uppercase text-neutral-700 tracking-wider mb-2 flex items-center justify-between">
                  <span>🌿 Tavoli Esterno Portico</span>
                  <span className="text-[11px] font-bold text-neutral-400">E1 – E8</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'].map((tbl) => (
                    <button
                      key={tbl}
                      type="button"
                      onClick={() => handleAssignTableDirect(tableModalBooking.id, tbl)}
                      className={`h-14 font-black text-base border-2 transition-all cursor-pointer flex items-center justify-center touch-manipulation select-none active:scale-95 ${
                        tableModalBooking.tableNumber === tbl
                          ? 'border-black bg-black text-white shadow-md ring-2 ring-black'
                          : 'border-neutral-300 bg-white text-neutral-900 hover:border-black hover:bg-neutral-100'
                      }`}
                    >
                      {tbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Table Input (for unione tavoli, es. T1+T2) */}
              <div className="pt-2 border-t border-neutral-200">
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1.5">
                  Oppure scrivi tavolo personalizzato (es. T1+T2, Sociale, Saletta):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Es. T1+T2"
                    value={customTableInput}
                    onChange={(e) => setCustomTableInput(e.target.value)}
                    className="flex-1 h-14 px-3.5 border-2 border-neutral-300 text-base font-bold uppercase focus:border-black focus:outline-none touch-manipulation"
                  />
                  <button
                    type="button"
                    onClick={() => handleAssignTableDirect(tableModalBooking.id, customTableInput.trim())}
                    className="h-14 px-5 bg-black hover:bg-[#e60000] text-white text-sm font-black uppercase tracking-wider transition-all duration-75 cursor-pointer touch-manipulation select-none active:scale-95 shrink-0"
                  >
                    Assegna
                  </button>
                </div>
              </div>

              {/* Bottom Actions: Clear Table & Close */}
              <div className="pt-2 flex gap-3">
                {tableModalBooking.tableNumber && (
                  <button
                    type="button"
                    onClick={() => handleAssignTableDirect(tableModalBooking.id, '')}
                    className="flex-1 h-14 border-2 border-red-300 bg-red-50 hover:bg-red-100 text-[#e60000] font-black uppercase text-xs sm:text-sm cursor-pointer transition-colors touch-manipulation select-none active:scale-95"
                  >
                    Rimuovi Tavolo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTableModalBooking(null)}
                  className="flex-1 h-14 border-2 border-neutral-300 hover:border-black font-black uppercase text-xs sm:text-sm cursor-pointer transition-colors touch-manipulation select-none active:scale-95"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. PERSISTENT ERGONOMIC TOUCH DOCK (OPTIMIZED FOR LARGE TOUCH MONITORS & TABLETS) */}
      <aside className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-black px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.14)] select-none">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Glanceable Live Shift Metrics */}
          <div className="hidden sm:flex items-center gap-4 text-xs font-black uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-neutral-500">Turno:</span>
              <span className="text-black font-black">
                {activeTab === 'lunch' ? 'Pranzo' : activeTab === 'dinner_1' ? '1° Turno Cena' : '2° Turno Cena'}
              </span>
            </div>
            <div className="h-4 w-px bg-neutral-300" />
            <div>
              <span className="text-neutral-500">Prenotati:</span>{' '}
              <span className="text-black font-black">
                {currentTabBookings.reduce((sum: number, b: Booking) => sum + b.guestCount, 0)} PAX
              </span>
              <span className="text-neutral-400 font-bold ml-1">
                ({currentTabBookings.length} tav.)
              </span>
            </div>
            <div className="h-4 w-px bg-neutral-300" />
            <div>
              <span className="text-neutral-500">Seduti:</span>{' '}
              <span className="text-emerald-700 font-black">
                {currentTabBookings.filter((b: Booking) => b.status === 'SEATED').reduce((sum: number, b: Booking) => sum + b.guestCount, 0)} PAX
              </span>
            </div>
          </div>

          {/* Mobile Glance */}
          <div className="sm:hidden flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {activeTab === 'lunch' ? 'PRANZO' : activeTab === 'dinner_1' ? '1° TURNO CENA' : '2° TURNO CENA'}
            </span>
            <span className="text-sm font-black text-black">
              {currentTabBookings.reduce((sum: number, b: Booking) => sum + b.guestCount, 0)} PAX ({currentTabBookings.length} tav.)
            </span>
          </div>

          {/* Right: Prominent 56px POS Quick Booking Action */}
          <button
            type="button"
            onClick={() => {
              setWalkInDate(selectedDate || getRelativeIsoDate(0));
              setWalkInShift(activeTab);
              setWalkInTime(activeTab === 'lunch' ? '13:00' : activeTab === 'dinner_1' ? '19:30' : '21:30');
              setShowWalkInModal(true);
            }}
            className="h-14 sm:h-14 px-5 sm:px-8 bg-[#e60000] hover:bg-black text-white text-xs sm:text-base font-black uppercase tracking-wider transition-all duration-75 cursor-pointer flex items-center justify-center gap-2.5 shadow-md shrink-0 touch-manipulation select-none active:scale-95 border-2 border-black"
          >
            <span className="text-xl leading-none">📞</span>
            <span>+ NUOVA PRENOTAZIONE / WALK-IN</span>
          </button>
        </div>
      </aside>
    </main>
  );
}
