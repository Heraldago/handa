'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Booking, BookingStatus, ShiftId, Settings, SeatingArea } from '@/lib/types';

export default function AdminDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ShiftId>('dinner_1');
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

    // Live auto-refresh every 4 seconds for real-time bookings
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
    const tableNumber = prompt('Numero tavolo (es. T1, T2, Bancone, E1, E2):', currentTable || '');
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

  // Filter bookings for the active tab and search
  const currentTabBookings = bookings
    .filter((b) => b.shiftId === activeTab)
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

  // Calculate shift stats
  const activeShiftConfig = settings?.shifts?.[activeTab];
  const activeShiftAvail = availability?.shifts?.find((s: any) => s.id === activeTab);
  const isShiftLocked = stats?.lockedShifts?.includes(activeTab);

  const shiftIndoorBooked = currentTabBookings
    .filter((b) => b.seatingArea !== 'outdoor' && b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + b.guestCount, 0);

  const shiftOutdoorBooked = currentTabBookings
    .filter((b) => b.seatingArea === 'outdoor' && b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + b.guestCount, 0);

  const shiftTotalSeated = currentTabBookings
    .filter((b) => b.status === 'SEATED')
    .reduce((sum, b) => sum + b.guestCount, 0);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white text-black font-sans flex items-center justify-center p-4 selection:bg-[#e60000] selection:text-white">
        <div className="border-2 border-black max-w-sm w-full p-6 sm:p-8 animate-in fade-in duration-200">
          <div className="mb-6">
            <span className="text-xs font-black uppercase tracking-widest text-[#e60000] block mb-1">
              ACCESSO RISERVATO
            </span>
            <h1 className="text-2xl font-black uppercase text-black">
              STAFF DESK
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Inserisci il PIN del personale per accedere alla gestione dei tavoli.
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
                className="w-full h-14 border-2 border-neutral-300 focus:border-black text-center text-3xl font-black tracking-widest outline-none transition-colors"
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-[#e60000]">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full h-14 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black text-sm uppercase tracking-wider transition-colors cursor-pointer"
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
      {/* 1. TOP HEADER */}
      <header className="border-b-2 border-black px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-black text-2xl sm:text-3xl tracking-tight text-black hover:opacity-80">
              HANDA<span className="text-[#e60000]">.</span>
            </Link>
            <span className="border-2 border-black bg-black text-white text-xs px-2.5 py-1 font-black uppercase tracking-wider">
              STAFF DESK
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 border-2 border-neutral-300 bg-neutral-50 text-[10px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE
            </div>
            <span className="text-xs text-neutral-500 font-bold hidden md:inline">
              Padova • Via del Portello 32
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setWalkInDate(selectedDate || new Date().toISOString().split('T')[0]);
                setShowWalkInModal(true);
              }}
              className="h-11 px-4 sm:px-5 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>📞</span>
              <span>+ Telefonata / Walk-In</span>
            </button>

            <Link
              href="/"
              className="h-11 px-4 border-2 border-neutral-300 hover:border-black font-bold text-xs uppercase flex items-center justify-center transition-colors"
            >
              Vista Cliente →
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="h-11 px-3 text-neutral-400 hover:text-[#e60000] font-bold text-xs uppercase cursor-pointer"
              title="Esci dalla sessione"
            >
              Esci 🔒
            </button>
          </div>
        </div>
      </header>

      {/* 2. COMMAND CONTROL BAR (DATE + WEATHER/OUTDOOR + GLOBAL COVERS) */}
      <section className="border-b-2 border-neutral-200 bg-neutral-50 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDateByDays(-1)}
              className="h-11 px-3 border-2 border-black bg-white hover:bg-neutral-100 font-black cursor-pointer"
              title="Giorno precedente"
            >
              ←
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-11 px-4 border-2 border-black bg-white font-black text-base focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => changeDateByDays(1)}
              className="h-11 px-3 border-2 border-black bg-white hover:bg-neutral-100 font-black cursor-pointer"
              title="Giorno successivo"
            >
              →
            </button>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(today);
              }}
              className="h-11 px-3 border-2 border-neutral-300 hover:border-black bg-white text-xs font-bold uppercase cursor-pointer"
            >
              Oggi
            </button>
          </div>

          {/* Weather / Outdoor Toggle & Total Day Stats */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Outdoor weather control */}
            <button
              onClick={handleToggleOutdoor}
              className={`h-11 px-4 border-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
                stats?.isOutdoorActive
                  ? 'border-black bg-white text-black hover:border-[#e60000] hover:text-[#e60000]'
                  : 'border-[#e60000] bg-red-50 text-[#e60000]'
              }`}
              title="Clicca per aprire o chiudere i tavoli esterni in base al meteo di Padova"
            >
              <span>{stats?.isOutdoorActive ? '☀️ ESTERNO APERTO (35P)' : '🌧️ ESTERNO CHIUSO PER METEO'}</span>
              <span className="text-[10px] underline font-medium">CAMBIA</span>
            </button>

            {/* Total Covers Summary Badge */}
            <div className="h-11 px-4 border-2 border-black bg-white flex items-center gap-4 text-xs font-bold">
              <div>
                TOT. GIORNO:{' '}
                <strong className="text-base text-black font-black">{stats?.totalCovers || 0}</strong> pax
              </div>
              <div className="text-neutral-400">|</div>
              <div>
                SEDUTI:{' '}
                <strong className="text-base text-[#e60000] font-black">{stats?.seatedCovers || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        {/* SHIFT TABS (3 SECTIONS: PRANZO, 1° CENA, 2° CENA) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
          {/* TAB 1: PRANZO */}
          {(() => {
            const shiftBookings = bookings.filter((b) => b.shiftId === 'lunch' && b.status !== 'CANCELLED');
            const totalPax = shiftBookings.reduce((sum, b) => sum + b.guestCount, 0);
            const isSelected = activeTab === 'lunch';
            const isLocked = stats?.lockedShifts?.includes('lunch');

            return (
              <button
                type="button"
                onClick={() => setActiveTab('lunch')}
                className={`p-4 border-2 text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 bg-white text-black hover:border-black'
                }`}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-black text-lg sm:text-xl">PRANZO DINAMICO</span>
                  <span
                    className={`text-xs font-bold ${
                      isLocked
                        ? 'text-[#e60000] font-black'
                        : isSelected
                        ? 'text-neutral-300'
                        : 'text-neutral-500'
                    }`}
                  >
                    {isLocked ? 'BLOCCATO' : '12:00 – 15:00'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className={isSelected ? 'text-neutral-300' : 'text-neutral-600'}>
                    Nessun turno rigido
                  </span>
                  <strong className="text-base font-black">
                    {totalPax} pax
                  </strong>
                </div>
              </button>
            );
          })()}

          {/* TAB 2: 1° CENA */}
          {(() => {
            const shiftBookings = bookings.filter((b) => b.shiftId === 'dinner_1' && b.status !== 'CANCELLED');
            const totalPax = shiftBookings.reduce((sum, b) => sum + b.guestCount, 0);
            const isSelected = activeTab === 'dinner_1';
            const isLocked = stats?.lockedShifts?.includes('dinner_1');

            return (
              <button
                type="button"
                onClick={() => setActiveTab('dinner_1')}
                className={`p-4 border-2 text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 bg-white text-black hover:border-black'
                }`}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-black text-lg sm:text-xl">1° CENA (19:15–20)</span>
                  <span
                    className={`text-xs font-bold ${
                      isLocked
                        ? 'text-[#e60000] font-black'
                        : isSelected
                        ? 'text-neutral-300'
                        : 'text-neutral-500'
                    }`}
                  >
                    {isLocked ? 'BLOCCATO' : 'LIBERO 21:15'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className={isSelected ? 'text-neutral-300' : 'text-neutral-600'}>
                    Tavoli fino 21:15/20
                  </span>
                  <strong className="text-base font-black">
                    {totalPax} pax
                  </strong>
                </div>
              </button>
            );
          })()}

          {/* TAB 3: 2° CENA */}
          {(() => {
            const shiftBookings = bookings.filter((b) => b.shiftId === 'dinner_2' && b.status !== 'CANCELLED');
            const totalPax = shiftBookings.reduce((sum, b) => sum + b.guestCount, 0);
            const isSelected = activeTab === 'dinner_2';
            const isLocked = stats?.lockedShifts?.includes('dinner_2');

            return (
              <button
                type="button"
                onClick={() => setActiveTab('dinner_2')}
                className={`p-4 border-2 text-left transition-colors cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 bg-white text-black hover:border-black'
                }`}
              >
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-black text-lg sm:text-xl">2° CENA (21:30+)</span>
                  <span
                    className={`text-xs font-bold ${
                      isLocked
                        ? 'text-[#e60000] font-black'
                        : isSelected
                        ? 'text-neutral-300'
                        : 'text-neutral-500'
                    }`}
                  >
                    {isLocked ? 'BLOCCATO' : 'FINO A CHIUSURA'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className={isSelected ? 'text-neutral-300' : 'text-neutral-600'}>
                    Dalle 21:30 a chiusura
                  </span>
                  <strong className="text-base font-black">
                    {totalPax} pax
                  </strong>
                </div>
              </button>
            );
          })()}
        </div>

        {/* ACTIVE SHIFT SUMMARY BAR */}
        <div className="border-2 border-black bg-white p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  {activeShiftConfig?.name || activeTab}
                </h2>
                <span className="text-sm font-bold text-neutral-500">
                  {activeShiftConfig?.timeRange}
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                {activeShiftConfig?.description}
              </p>
            </div>

            {/* Quick capacity count & Lock Shift Button */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-xs">
                <span className="text-neutral-500 font-bold block">SALA INTERNA:</span>
                <strong className="text-base text-black font-black">
                  {shiftIndoorBooked} / 36
                </strong>
              </div>

              <div className="text-xs">
                <span className="text-neutral-500 font-bold block">ESTERNO:</span>
                <strong className={`text-base font-black ${stats?.isOutdoorActive ? 'text-black' : 'text-neutral-400 line-through'}`}>
                  {shiftOutdoorBooked} / 35
                </strong>
              </div>

              <div className="text-xs">
                <span className="text-neutral-500 font-bold block">SEDUTI:</span>
                <strong className="text-base text-[#e60000] font-black">
                  {shiftTotalSeated} pax
                </strong>
              </div>

              <button
                type="button"
                onClick={() => handleToggleLock(activeTab)}
                className={`h-11 px-4 border-2 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                  isShiftLocked
                    ? 'border-[#e60000] bg-[#e60000] text-white hover:bg-black hover:border-black'
                    : 'border-black bg-white hover:bg-black hover:text-white'
                }`}
              >
                {isShiftLocked ? '🔓 SBLOCCA PRENOTAZIONI' : '🔒 BLOCCA PRENOTAZIONI ONLINE'}
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH BAR & FILTER */}
        <div className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Cerca per nome, cellulare, codice o tavolo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-12 px-4 border-2 border-neutral-300 bg-white font-sans text-sm focus:border-black focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="h-12 px-4 border-2 border-neutral-300 hover:border-black font-bold text-xs uppercase cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* BOOKINGS LIST ("CARTA & PENNA 2.0") */}
        {loading ? (
          <div className="py-20 text-center text-neutral-400 font-bold">
            Caricamento servizio in corso...
          </div>
        ) : currentTabBookings.length === 0 ? (
          <div className="py-20 border-2 border-dashed border-neutral-300 text-center font-sans">
            <p className="text-neutral-500 font-bold uppercase tracking-wider">
              Nessuna prenotazione per questo turno
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              Usa il tasto in alto per registrare clienti walk-in o clienti telefonici.
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
                  className={`p-4 border-2 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isSeated
                      ? 'border-black bg-neutral-50'
                      : isNoShow
                      ? 'border-neutral-200 bg-neutral-100 opacity-60'
                      : isLate
                      ? 'border-[#e60000] bg-red-50/40'
                      : 'border-neutral-300 bg-white hover:border-black'
                  }`}
                >
                  {/* Left: Time, Table, Pax, Area */}
                  <div className="flex items-center gap-4 sm:gap-6 min-w-[240px]">
                    {/* Time Slot Badge */}
                    <div className="text-center min-w-[70px]">
                      <span className="text-2xl font-black block leading-none">
                        {b.time}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase mt-1 block">
                        #{b.code}
                      </span>
                    </div>

                    {/* Table Pill (Clickable) */}
                    <button
                      type="button"
                      onClick={() => handleUpdateTable(b.id, b.tableNumber)}
                      className={`h-11 px-3 border-2 text-xs font-black uppercase transition-colors cursor-pointer flex items-center justify-center ${
                        b.tableNumber
                          ? 'border-black bg-black text-white'
                          : 'border-dashed border-neutral-400 text-neutral-500 hover:border-black hover:text-black'
                      }`}
                      title="Clicca per cambiare tavolo"
                    >
                      {b.tableNumber ? `TAVOLO ${b.tableNumber}` : '+ TAVOLO'}
                    </button>

                    {/* Pax & Area */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">
                          {b.guestCount} {b.guestCount === 1 ? 'PAX' : 'PAX'}
                        </span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 border ${
                            isIndoor
                              ? 'border-neutral-400 bg-white text-black'
                              : 'border-[#e60000] bg-white text-[#e60000]'
                          }`}
                        >
                          {isIndoor ? 'SALA' : 'ESTERNO'}
                        </span>
                      </div>

                      {b.isWalkIn && (
                        <span className="text-[10px] font-bold text-neutral-500 uppercase block">
                          [WALK-IN]
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Customer Name, Phone & Notes */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-baseline gap-3">
                      <strong className="text-base sm:text-lg font-black text-black">
                        {b.customerName}
                      </strong>
                      <a
                        href={`https://wa.me/${b.customerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-neutral-500 hover:text-black underline font-bold"
                        title="Scrivi su WhatsApp"
                      >
                        {b.customerPhone}
                      </a>
                    </div>

                    {/* Dietary / Notes alerts */}
                    {(b.dietary?.length > 0 || b.notes) && (
                      <div className="text-xs text-[#e60000] font-bold mt-1 space-x-2">
                        {b.dietary?.length > 0 && (
                          <span>⚠️ {b.dietary.join(', ')}</span>
                        )}
                        {b.notes && (
                          <span className="text-neutral-600 font-medium">Nota: {b.notes}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Status Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Seduto */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.id, 'SEATED')}
                      className={`h-10 px-3 border-2 font-black text-xs uppercase transition-colors cursor-pointer ${
                        isSeated
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black hover:border-black'
                      }`}
                    >
                      ✓ Seduto
                    </button>

                    {/* In Ritardo */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.id, 'LATE')}
                      className={`h-10 px-3 border-2 font-black text-xs uppercase transition-colors cursor-pointer ${
                        isLate
                          ? 'border-[#e60000] bg-[#e60000] text-white'
                          : 'border-neutral-300 bg-white text-neutral-600 hover:border-black'
                      }`}
                    >
                      ⏳ Ritardo
                    </button>

                    {/* No Show */}
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(b.id, 'NOSHOW')}
                      className={`h-10 px-3 border-2 font-black text-xs uppercase transition-colors cursor-pointer ${
                        isNoShow
                          ? 'border-black bg-neutral-300 text-black'
                          : 'border-neutral-300 bg-white text-neutral-500 hover:border-black'
                      }`}
                    >
                      ✕ No-Show
                    </button>

                    {/* Cancella */}
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Vuoi cancellare la prenotazione di ${b.customerName}?`)) {
                          handleUpdateStatus(b.id, 'CANCELLED');
                        }
                      }}
                      className="h-10 px-2.5 text-neutral-400 hover:text-[#e60000] font-bold text-xs uppercase cursor-pointer"
                      title="Cancella prenotazione"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TELEPHONE / WALK-IN MODAL (CONVERSATIONAL SEQUENCE) */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans overflow-y-auto">
          <div className="bg-white border-2 border-black max-w-xl w-full p-5 sm:p-7 animate-in fade-in duration-150 my-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 border-b-2 border-black pb-3">
              <div>
                <span className="text-[11px] text-[#e60000] font-black uppercase tracking-widest block">
                  📞 PRESA RAPIDA AL TELEFONO & WALK-IN
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-black leading-tight mt-0.5">
                  + Nuova Prenotazione Tavolo
                </h3>
                <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                  Segui l&apos;ordine vocale: Persone → Data → Orario → Sala/Esterno → Nome/Tel → Note
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-2xl font-black hover:text-[#e60000] cursor-pointer p-1"
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
                      className={`h-11 font-black text-base border-2 transition-colors cursor-pointer ${
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
                    className="w-20 h-8 px-2 border-2 border-neutral-300 text-xs font-bold text-center focus:border-black focus:outline-none"
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
                    className={`h-10 text-xs font-black uppercase border-2 transition-colors cursor-pointer ${
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
                    className={`h-10 text-xs font-black uppercase border-2 transition-colors cursor-pointer ${
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
                    className={`h-10 text-xs font-black uppercase border-2 transition-colors cursor-pointer ${
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
                    className="h-10 px-2 border-2 border-neutral-300 focus:border-black text-[11px] font-bold uppercase cursor-pointer"
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

                {/* Turni Buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInShift('lunch');
                      setWalkInTime('13:00');
                    }}
                    className={`py-2 px-1 text-center border-2 transition-colors cursor-pointer flex flex-col items-center ${
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
                    className={`py-2 px-1 text-center border-2 transition-colors cursor-pointer flex flex-col items-center ${
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
                    className={`py-2 px-1 text-center border-2 transition-colors cursor-pointer flex flex-col items-center ${
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
                        className="w-16 h-7 px-1.5 border border-neutral-300 bg-white text-xs font-bold text-center focus:border-black focus:outline-none"
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
                    className={`p-3 text-left border-2 transition-colors cursor-pointer ${
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
                    className={`p-3 text-left border-2 transition-colors cursor-pointer ${
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
                    className="w-full h-11 px-3 border-2 border-neutral-300 font-bold focus:border-black focus:outline-none"
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
                    className="w-full h-11 px-3 border-2 border-neutral-300 font-bold focus:border-black focus:outline-none"
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
                    className="w-full h-11 px-3 border-2 border-neutral-300 text-xs font-bold focus:border-black focus:outline-none"
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
                    className="w-full h-11 px-3 border-2 border-neutral-300 text-xs font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 h-12 border-2 border-neutral-300 hover:border-black font-bold uppercase text-xs cursor-pointer transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingWalkIn}
                  className="flex-[2] h-12 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black uppercase text-xs tracking-wider cursor-pointer transition-colors flex items-center justify-center"
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
