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

  const getRelativeIsoDate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDisplayDate = (iso: string): string => {
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

    const todayIso = getRelativeIsoDate(0);
    const tomorrowIso = getRelativeIsoDate(1);
    const yesterdayIso = getRelativeIsoDate(-1);

    const formattedDay = `${days[dateObj.getDay()]} ${d} ${months[dateObj.getMonth()]}`;
    if (iso === todayIso) return `Oggi · ${formattedDay}`;
    if (iso === tomorrowIso) return `Domani · ${formattedDay}`;
    if (iso === yesterdayIso) return `Ieri · ${formattedDay}`;
    return formattedDay;
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

  const handleUpdateTable = async (bookingId: string, currentTable?: string) => {
    const tableNumber = prompt('Assegna numero tavolo (es. T1, T2, Bancone, E1, E2):', currentTable || '');
    if (tableNumber === null) return;

    try {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, tableNumber: tableNumber.trim() } : b))
      );

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
    { id: 'dinner_1', label: '1° Cena', time: '19:15 – 20:00', sub: 'Esce 21:15' },
    { id: 'dinner_2', label: '2° Cena', time: '21:30 – 23:00', sub: 'A chiusura' },
  ];

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white text-black font-sans flex items-center justify-center p-4 selection:bg-[#e60000] selection:text-white">
        <div className="border border-black max-w-sm w-full p-6 sm:p-8 animate-in fade-in duration-200">
          <div className="mb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e60000] block mb-1">
              ACCESSO RISERVATO
            </span>
            <h1 className="text-2xl font-black uppercase text-black tracking-tight">
              STAFF DESK
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Inserisci il PIN del personale per accedere alla gestione del servizio.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1.5 uppercase">
                PIN DI SICUREZZA
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full h-12 border border-neutral-300 focus:border-black text-center text-2xl font-black tracking-widest outline-none transition-colors"
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-[#e60000]">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full h-12 border border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Sblocca Dashboard →
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-200 text-center">
            <Link href="/" className="text-xs text-neutral-400 hover:text-black font-bold uppercase underline">
              ← Torna alla prenotazione
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-[#e60000] selection:text-white pb-20">
      {/* 1. UNIFIED COMMAND HEADER (CLEAN & COMPACT) */}
      <header className="border-b border-black bg-white px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Brand + Staff Pill + Live Pulse + Date Navigator */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="font-black text-xl tracking-tight text-black hover:opacity-85">
              HANDA<span className="text-[#e60000]">.</span>
            </Link>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-black text-white">
              STAFF
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-100 text-[10px] font-bold text-neutral-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </div>

            <div className="h-4 w-px bg-neutral-200 hidden sm:block"></div>

            {/* Date Navigator */}
            <div className="flex items-center border border-neutral-300 bg-white">
              <button
                type="button"
                onClick={() => changeDateByDays(-1)}
                className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 text-xs font-bold border-r border-neutral-200 cursor-pointer"
                title="Giorno precedente"
              >
                ←
              </button>
              <label className="relative flex items-center px-3 cursor-pointer select-none">
                <span className="text-xs font-black uppercase tracking-wider text-black">
                  {formatDisplayDate(selectedDate)}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </label>
              <button
                type="button"
                onClick={() => changeDateByDays(1)}
                className="h-8 w-8 flex items-center justify-center hover:bg-neutral-100 text-xs font-bold border-l border-neutral-200 cursor-pointer"
                title="Giorno successivo"
              >
                →
              </button>
            </div>

            {/* Quick jump to today */}
            {selectedDate !== getRelativeIsoDate(0) && (
              <button
                type="button"
                onClick={() => setSelectedDate(getRelativeIsoDate(0))}
                className="text-[11px] font-bold uppercase text-neutral-500 hover:text-black underline cursor-pointer"
              >
                Oggi
              </button>
            )}
          </div>

          {/* Right: Weather / Day Totals / New Booking CTA / Exit */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Weather / Esterno Toggle */}
            <button
              type="button"
              onClick={handleToggleOutdoor}
              className={`h-8 px-2.5 text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-1.5 ${
                stats?.isOutdoorActive
                  ? 'border-neutral-300 bg-white text-neutral-800 hover:border-black'
                  : 'border-[#e60000] bg-red-50 text-[#e60000]'
              }`}
              title="Clicca per aprire o chiudere l'esterno"
            >
              <span>{stats?.isOutdoorActive ? '☀️ Esterno Aperto (35p)' : '🌧️ Esterno Chiuso'}</span>
            </button>

            {/* Day Covers Stats */}
            <div className="h-8 px-3 border border-neutral-300 bg-neutral-50 flex items-center gap-2 text-xs font-bold">
              <span>Tot: <strong className="text-black font-black">{stats?.totalCovers || 0}</strong> pax</span>
              <span className="text-neutral-300">·</span>
              <span>Seduti: <strong className="text-[#e60000] font-black">{stats?.seatedCovers || 0}</strong></span>
            </div>

            {/* New Booking CTA */}
            <button
              type="button"
              onClick={() => {
                setWalkInDate(selectedDate || getRelativeIsoDate(0));
                setShowWalkInModal(true);
              }}
              className="h-8 px-3.5 bg-black text-white hover:bg-[#e60000] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>+ Prenotazione</span>
            </button>

            <Link
              href="/"
              className="text-[11px] text-neutral-500 hover:text-black font-bold uppercase hidden lg:inline"
            >
              Vista Cliente ↗
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] text-neutral-400 hover:text-[#e60000] font-bold uppercase cursor-pointer ml-1"
              title="Esci dalla sessione"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-5">
        {/* SHIFT SEGMENTED TABS (CLEAN & NON-DUPLICATIVE) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-neutral-300 bg-neutral-100 p-1 gap-1 mb-4">
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
                className={`py-2 px-3 text-left transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-transparent text-neutral-600 hover:text-black hover:bg-white/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm uppercase tracking-wider">
                    {shift.label}
                  </span>
                  <span
                    className={`text-[11px] font-medium hidden sm:inline ${
                      isSelected ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    ({shift.time})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isLocked && (
                    <span className="text-[10px] font-black uppercase text-[#e60000] bg-white px-1.5 py-0.5">
                      BLOCCATO
                    </span>
                  )}
                  <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-black'}`}>
                    {totalPax} pax
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* UTILITY STRIP: CAPACITY BREAKDOWN + LOCK SHIFT + SEARCH & STATUS FILTER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-200">
          {/* Capacity Breakdown & Lock Toggle */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-bold text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 uppercase text-[10px] tracking-wider">Sala:</span>
              <span className="text-black font-black text-sm">{shiftIndoorBooked}</span>
              <span className="text-neutral-400 text-xs">/36</span>
            </div>

            <span className="text-neutral-300">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 uppercase text-[10px] tracking-wider">Esterno:</span>
              <span
                className={`font-black text-sm ${
                  stats?.isOutdoorActive ? 'text-black' : 'text-neutral-400 line-through'
                }`}
              >
                {shiftOutdoorBooked}
              </span>
              <span className="text-neutral-400 text-xs">/35</span>
            </div>

            <span className="text-neutral-300">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400 uppercase text-[10px] tracking-wider">Seduti:</span>
              <span className="text-[#e60000] font-black text-sm">{shiftTotalSeatedPax}</span>
              <span className="text-neutral-400 text-xs">pax</span>
            </div>

            <span className="text-neutral-300 hidden sm:inline">|</span>

            <button
              type="button"
              onClick={() => handleToggleLock(activeTab)}
              className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${
                isShiftLocked
                  ? 'border-[#e60000] bg-red-50 text-[#e60000] hover:bg-[#e60000] hover:text-white'
                  : 'border-neutral-300 text-neutral-600 hover:border-black hover:text-black'
              }`}
            >
              {isShiftLocked ? '🔴 Turno Bloccato Online (Sblocca)' : '🔒 Blocca Prenotazioni Online'}
            </button>
          </div>

          {/* Status Filter & Fast Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Pills */}
            <div className="flex border border-neutral-300 bg-white">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`h-8 px-2.5 text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Tutti ({totalInShift})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('WAITING')}
                className={`h-8 px-2.5 text-[11px] font-bold uppercase border-l border-neutral-200 transition-colors cursor-pointer ${
                  statusFilter === 'WAITING'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                In Attesa ({waitingInShift})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SEATED')}
                className={`h-8 px-2.5 text-[11px] font-bold uppercase border-l border-neutral-200 transition-colors cursor-pointer ${
                  statusFilter === 'SEATED'
                    ? 'bg-black text-white'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Seduti ({seatedInShift})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca nome, tel, tavolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-56 h-8 px-3 border border-neutral-300 bg-white text-xs font-medium focus:border-black focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-xs text-neutral-400 hover:text-black font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. BOOKINGS LIST ("REGISTRO TAVOLI" - DECLUTTERED) */}
        {loading ? (
          <div className="py-20 text-center text-neutral-400 font-bold">
            Caricamento servizio in corso...
          </div>
        ) : currentTabBookings.length === 0 ? (
          <div className="py-16 border border-dashed border-neutral-300 text-center font-sans bg-neutral-50/50">
            <p className="text-neutral-500 font-bold uppercase tracking-wider text-xs">
              Nessuna prenotazione trovata per questo turno
            </p>
            <p className="text-xs text-neutral-400 mt-1.5">
              Clicca su <span className="font-bold text-black">&quot;+ Prenotazione&quot;</span> in alto per registrare una telefonata o clienti al banco.
            </p>
          </div>
        ) : (
          <div className="space-y-2 font-sans">
            {currentTabBookings.map((b) => {
              const isSeated = b.status === 'SEATED';
              const isLate = b.status === 'LATE';
              const isNoShow = b.status === 'NOSHOW';
              const isIndoor = b.seatingArea !== 'outdoor';

              return (
                <div
                  key={b.id}
                  className={`p-3.5 border transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                    isSeated
                      ? 'border-neutral-200 bg-neutral-50/70'
                      : isNoShow
                      ? 'border-neutral-200 bg-neutral-100/60 opacity-60'
                      : isLate
                      ? 'border-l-4 border-l-[#e60000] border-neutral-300 bg-red-50/20'
                      : 'border-neutral-200 bg-white hover:border-neutral-400'
                  }`}
                >
                  {/* Left Block: Time, Table Pill, Pax, Area */}
                  <div className="flex items-center gap-3 sm:gap-5 min-w-[240px]">
                    {/* Time Slot & Code */}
                    <div className="min-w-[62px]">
                      <span className="text-xl font-black block leading-none text-black">
                        {b.time}
                      </span>
                      <span className="text-[10px] font-medium text-neutral-400 uppercase mt-0.5 block">
                        #{b.code}
                      </span>
                    </div>

                    {/* Table Pill */}
                    <button
                      type="button"
                      onClick={() => handleUpdateTable(b.id, b.tableNumber)}
                      className={`h-8 px-2.5 text-[11px] font-black uppercase transition-colors cursor-pointer flex items-center justify-center ${
                        b.tableNumber
                          ? 'bg-black text-white hover:bg-neutral-800'
                          : 'border border-dashed border-neutral-300 text-neutral-400 hover:border-black hover:text-black bg-white'
                      }`}
                      title="Clicca per assegnare o cambiare tavolo"
                    >
                      {b.tableNumber ? `TAVOLO ${b.tableNumber}` : '+ TAVOLO'}
                    </button>

                    {/* Pax & Area */}
                    <div className="min-w-[90px] flex items-center gap-2">
                      <span className="text-base font-black text-black">
                        {b.guestCount} PAX
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-1.5 py-0.5 ${
                          isIndoor
                            ? 'bg-neutral-100 text-neutral-700'
                            : 'bg-red-50 text-[#e60000] border border-red-200'
                        }`}
                      >
                        {isIndoor ? 'SALA' : 'ESTERNO'}
                      </span>
                      {b.isWalkIn && (
                        <span className="text-[9px] font-bold uppercase text-neutral-400">
                          Walk-In
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Block: Customer Name, WhatsApp Link, Dietary Notes */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-baseline gap-2.5">
                      <strong className="text-base font-black text-black">
                        {b.customerName}
                      </strong>
                      {b.customerPhone && (
                        <a
                          href={`https://wa.me/${b.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-neutral-400 hover:text-black underline font-medium transition-colors"
                          title="Scrivi su WhatsApp"
                        >
                          {b.customerPhone}
                        </a>
                      )}
                    </div>

                    {/* Dietary / Notes alerts */}
                    {(b.dietary?.length > 0 || b.notes) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                        {b.dietary?.map((diet) => (
                          <span
                            key={diet}
                            className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-red-50 text-[#e60000] border border-red-200"
                          >
                            ⚠️ {diet}
                          </span>
                        ))}
                        {b.notes && (
                          <span className="text-neutral-500 italic text-[11px]">
                            Nota: {b.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Block: Decluttered Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
                    {/* CONFIRMED STATE */}
                    {!isSeated && !isLate && !isNoShow && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'SEATED')}
                          className="h-8 px-3 bg-black text-white hover:bg-[#e60000] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          ✓ Siedi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'LATE')}
                          className="h-8 px-2 text-neutral-500 hover:text-black text-xs font-bold uppercase hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Segna in ritardo"
                        >
                          Ritardo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'NOSHOW')}
                          className="h-8 px-2 text-neutral-400 hover:text-black text-xs font-bold uppercase hover:bg-neutral-100 transition-colors cursor-pointer"
                          title="Segna No-Show"
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
                          className="h-8 px-2 text-neutral-300 hover:text-[#e60000] text-xs font-bold transition-colors cursor-pointer"
                          title="Elimina"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {/* SEATED STATE */}
                    {isSeated && (
                      <>
                        <span className="h-8 px-2.5 flex items-center gap-1 bg-neutral-100 text-neutral-800 text-xs font-black uppercase tracking-wider border border-neutral-300">
                          <span className="text-emerald-600 font-bold">✓</span> Al Tavolo
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                          className="text-[11px] text-neutral-400 hover:text-black underline cursor-pointer px-1.5"
                          title="Riporta in attesa"
                        >
                          In attesa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Vuoi cancellare la prenotazione di ${b.customerName}?`)) {
                              handleUpdateStatus(b.id, 'CANCELLED');
                            }
                          }}
                          className="h-8 px-2 text-neutral-300 hover:text-[#e60000] text-xs font-bold transition-colors cursor-pointer"
                          title="Elimina"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {/* LATE STATE */}
                    {isLate && (
                      <>
                        <span className="h-8 px-2 flex items-center text-xs font-black uppercase tracking-wider bg-red-50 text-[#e60000] border border-[#e60000]">
                          ⏳ Ritardo
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'SEATED')}
                          className="h-8 px-3 bg-black text-white hover:bg-[#e60000] text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          ✓ Siedi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'NOSHOW')}
                          className="h-8 px-2 text-neutral-400 hover:text-black text-xs font-bold uppercase transition-colors cursor-pointer"
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
                          className="h-8 px-2 text-neutral-300 hover:text-[#e60000] text-xs font-bold transition-colors cursor-pointer"
                          title="Elimina"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    {/* NO-SHOW STATE */}
                    {isNoShow && (
                      <>
                        <span className="h-8 px-2.5 flex items-center text-xs font-bold uppercase text-neutral-400 bg-neutral-100 border border-neutral-200">
                          ✕ No-Show
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'CONFIRMED')}
                          className="text-xs text-neutral-500 hover:text-black underline cursor-pointer px-1.5"
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
                          className="h-8 px-2 text-neutral-300 hover:text-[#e60000] text-xs font-bold transition-colors cursor-pointer"
                          title="Elimina"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. TELEPHONE / WALK-IN MODAL (VERBAL CONVERSATIONAL FLOW) */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white border-2 border-black max-w-xl w-full p-5 sm:p-7 animate-in fade-in duration-150 my-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 border-b border-black pb-3">
              <div>
                <span className="text-[10px] text-[#e60000] font-black uppercase tracking-widest block">
                  📞 PRESA RAPIDA AL TELEFONO & WALK-IN
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-black leading-tight mt-0.5">
                  + Nuova Prenotazione Tavolo
                </h3>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                  Ordine vocale naturale: Persone → Data → Orario → Sala/Esterno → Nome/Tel → Note
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-2xl font-black hover:text-[#e60000] cursor-pointer p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4 sm:space-y-5">
              {/* 1. QUANTE PERSONE? */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    1. Per quante persone?
                  </label>
                  <span className="text-[11px] text-neutral-500 font-bold">
                    Selezionato: <strong className="text-black">{walkInGuests} PAX</strong>
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setWalkInGuests(n)}
                      className={`h-10 font-black text-sm border transition-colors cursor-pointer ${
                        walkInGuests === n
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center justify-end gap-2 text-xs">
                  <span className="text-neutral-500 text-[11px]">Più di 8 persone?</span>
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
                    className="w-20 h-7 px-2 border border-neutral-300 text-xs font-bold text-center focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. PER QUALE DATA? */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    2. Per che data?
                  </label>
                  <span className="text-[11px] text-[#e60000] font-black uppercase">
                    {walkInDate || selectedDate}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(0))}
                    className={`h-9 text-xs font-black uppercase border transition-colors cursor-pointer ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(0)
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(1))}
                    className={`h-9 text-xs font-black uppercase border transition-colors cursor-pointer ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(1)
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    Domani
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInDate(getRelativeIsoDate(2))}
                    className={`h-9 text-xs font-black uppercase border transition-colors cursor-pointer ${
                      (walkInDate || selectedDate) === getRelativeIsoDate(2)
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    Dopodomani
                  </button>
                  <input
                    type="date"
                    value={walkInDate || selectedDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="h-9 px-2 border border-neutral-300 focus:border-black text-[11px] font-bold uppercase cursor-pointer"
                  />
                </div>
              </div>

              {/* 3. TURNO & ORARIO DI ARRIVO */}
              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                    3. Turno & Orario di arrivo
                  </label>
                  <span className="text-[11px] text-neutral-600 font-bold">
                    Orario: <strong className="text-[#e60000]">{walkInTime}</strong>
                  </span>
                </div>

                {/* Shift Selector Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('lunch');
                      setWalkInTime('13:00');
                    }}
                    className={`py-2 px-1 text-center border transition-colors cursor-pointer flex flex-col items-center ${
                      walkInShift === 'lunch'
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    <span className="text-xs font-black uppercase">PRANZO</span>
                    <span className="text-[10px] opacity-80">12:00 – 15:00</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('dinner_1');
                      setWalkInTime('19:30');
                    }}
                    className={`py-2 px-1 text-center border transition-colors cursor-pointer flex flex-col items-center ${
                      walkInShift === 'dinner_1'
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    <span className="text-xs font-black uppercase">1° CENA</span>
                    <span className="text-[10px] opacity-80">19:15 (esce 21:15)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('dinner_2');
                      setWalkInTime('21:30');
                    }}
                    className={`py-2 px-1 text-center border transition-colors cursor-pointer flex flex-col items-center ${
                      walkInShift === 'dinner_2'
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    <span className="text-xs font-black uppercase">2° CENA</span>
                    <span className="text-[10px] opacity-80">21:30 – 23:00</span>
                  </button>
                </div>

                {/* Quick Slot Chips */}
                <div className="p-2 bg-neutral-100 border border-neutral-200">
                  <div className="text-[10px] uppercase font-bold text-neutral-500 mb-1.5">
                    Tocca per selezionare l&apos;orario concordato:
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
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
                        className={`px-2.5 py-1 text-xs font-black border transition-colors cursor-pointer ${
                          walkInTime === slot
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-300 bg-white text-black hover:border-black'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-[10px] text-neutral-400">Altro:</span>
                      <input
                        type="text"
                        placeholder="HH:MM"
                        value={walkInTime}
                        onChange={(e) => setWalkInTime(e.target.value)}
                        className="w-16 h-6 px-1.5 border border-neutral-300 bg-white text-xs font-bold text-center focus:border-black focus:outline-none"
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInArea('indoor')}
                    className={`p-3 text-left border transition-colors cursor-pointer ${
                      walkInArea === 'indoor'
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    <div className="font-black text-sm">🏠 SALA INTERNA</div>
                    <div className={`text-[10px] font-medium ${walkInArea === 'indoor' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      36 posti coperti garantiti
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalkInArea('outdoor')}
                    className={`p-3 text-left border transition-colors cursor-pointer ${
                      walkInArea === 'outdoor'
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white text-black hover:border-black'
                    }`}
                  >
                    <div className="font-black text-sm">🌿 ESTERNO (PORTICO)</div>
                    <div className={`text-[10px] font-medium ${walkInArea === 'outdoor' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      35 posti sotto il portico di Via del Portello
                    </div>
                  </button>
                </div>
              </div>

              {/* 5. DATI CLIENTE (NOME & CELLULARE) */}
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
                    className="w-full h-10 px-3 border border-neutral-300 font-bold focus:border-black focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1 uppercase">
                    CELLULARE / WHATSAPP
                  </label>
                  <input
                    type="tel"
                    placeholder="340 0000000"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full h-10 px-3 border border-neutral-300 font-bold focus:border-black focus:outline-none text-sm"
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
                    className="w-full h-10 px-3 border border-neutral-300 text-xs font-bold focus:border-black focus:outline-none"
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
                    className="w-full h-10 px-3 border border-neutral-300 text-xs font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 h-11 border border-neutral-300 hover:border-black font-bold uppercase text-xs cursor-pointer transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingWalkIn}
                  className="flex-[2] h-11 border border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black uppercase text-xs tracking-wider cursor-pointer transition-colors flex items-center justify-center"
                >
                  {savingWalkIn ? 'Salvataggio...' : 'CONFERMA E SALVA NEL REGISTRO →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
