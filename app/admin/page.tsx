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
  const [walkInShift, setWalkInShift] = useState<ShiftId>('dinner_1');
  const [walkInTime, setWalkInTime] = useState<string>('19:30');
  const [walkInArea, setWalkInArea] = useState<SeatingArea>('indoor');
  const [walkInGuests, setWalkInGuests] = useState<number>(2);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInTable, setWalkInTable] = useState<string>('');
  const [walkInNotes, setWalkInNotes] = useState<string>('');
  const [savingWalkIn, setSavingWalkIn] = useState<boolean>(false);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const loadData = async () => {
    if (!selectedDate) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

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
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          shiftId: walkInShift,
          time: walkInTime,
          seatingArea: walkInArea,
          guestCount: walkInGuests,
          customerName: walkInName,
          customerPhone: walkInPhone || 'Walk-In',
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
        loadData();
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

  return (
    <main className="min-h-screen bg-white text-black font-mono selection:bg-[#e60000] selection:text-white pb-20">
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
            <span className="text-xs text-neutral-500 font-bold hidden sm:inline">
              Padova • Via del Portello 32
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWalkInModal(true)}
              className="h-11 px-5 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              + Walk-In Al Volo
            </button>

            <Link
              href="/"
              className="h-11 px-4 border-2 border-neutral-300 hover:border-black font-bold text-xs uppercase flex items-center justify-center transition-colors"
            >
              Vista Cliente →
            </Link>
          </div>
        </div>
      </header>

      {/* 2. COMMAND CONTROL BAR (DATE + WEATHER/DEHORS + GLOBAL COVERS) */}
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

          {/* Weather / Dehors Toggle & Total Day Stats */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Dehors weather control */}
            <button
              onClick={handleToggleOutdoor}
              className={`h-11 px-4 border-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
                stats?.isOutdoorActive
                  ? 'border-black bg-white text-black hover:border-[#e60000] hover:text-[#e60000]'
                  : 'border-[#e60000] bg-red-50 text-[#e60000]'
              }`}
              title="Clicca per aprire o chiudere il dehors in base al meteo di Padova"
            >
              <span>{stats?.isOutdoorActive ? '☀️ DEHORS APERTO (35P)' : '🌧️ DEHORS CHIUSO PER METEO'}</span>
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
                    className={`text-[10px] font-black px-2 py-0.5 uppercase ${
                      isLocked
                        ? 'bg-[#e60000] text-white'
                        : isSelected
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
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
                    className={`text-[10px] font-black px-2 py-0.5 uppercase ${
                      isLocked
                        ? 'bg-[#e60000] text-white'
                        : isSelected
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
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
                    className={`text-[10px] font-black px-2 py-0.5 uppercase ${
                      isLocked
                        ? 'bg-[#e60000] text-white'
                        : isSelected
                        ? 'bg-white text-black'
                        : 'bg-black text-white'
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
                <span className="text-neutral-500 font-bold block">DEHORS:</span>
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
            className="flex-1 h-12 px-4 border-2 border-neutral-300 bg-white font-mono text-sm focus:border-black focus:outline-none transition-colors"
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
          <div className="py-20 border-2 border-dashed border-neutral-300 text-center font-mono">
            <p className="text-neutral-500 font-bold uppercase tracking-wider">
              Nessuna prenotazione per questo turno
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              Usa il tasto in alto per registrare clienti walk-in o clienti telefonici.
            </p>
          </div>
        ) : (
          <div className="space-y-3 font-mono">
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
                          {isIndoor ? 'SALA' : 'DEHORS'}
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

      {/* WALK-IN MODAL */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs font-mono">
          <div className="bg-white border-2 border-black max-w-lg w-full p-6 sm:p-8 animate-in fade-in duration-150">
            <div className="flex justify-between items-baseline mb-6 border-b-2 border-black pb-4">
              <div>
                <span className="text-xs text-[#e60000] font-black uppercase tracking-widest block">
                  CARTA E PENNA 2.0
                </span>
                <h3 className="text-2xl font-black uppercase text-black">
                  + Registra Walk-In
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="text-2xl font-black hover:text-[#e60000] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4">
              {/* Turno */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWalkInShift('lunch');
                    setWalkInTime('13:00');
                  }}
                  className={`py-2 text-xs font-black uppercase border-2 ${
                    walkInShift === 'lunch'
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-black'
                  }`}
                >
                  Pranzo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalkInShift('dinner_1');
                    setWalkInTime('19:30');
                  }}
                  className={`py-2 text-xs font-black uppercase border-2 ${
                    walkInShift === 'dinner_1'
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-black'
                  }`}
                >
                  1° Cena
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWalkInShift('dinner_2');
                    setWalkInTime('21:30');
                  }}
                  className={`py-2 text-xs font-black uppercase border-2 ${
                    walkInShift === 'dinner_2'
                      ? 'border-black bg-black text-white'
                      : 'border-neutral-300 bg-white text-black'
                  }`}
                >
                  2° Cena
                </button>
              </div>

              {/* Area & Persone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">AREA TAVOLO</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setWalkInArea('indoor')}
                      className={`h-11 text-xs font-black uppercase border-2 ${
                        walkInArea === 'indoor'
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black'
                      }`}
                    >
                      Sala (36)
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalkInArea('outdoor')}
                      className={`h-11 text-xs font-black uppercase border-2 ${
                        walkInArea === 'outdoor'
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white text-black'
                      }`}
                    >
                      Dehors (35)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">NUMERO PERSONE</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setWalkInGuests(n)}
                        className={`h-11 font-black text-sm border-2 ${
                          walkInGuests === n
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-300 bg-white text-black'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nome & Tavolo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">NOME CLIENTE *</label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Luca"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="w-full h-11 px-3 border-2 border-neutral-300 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">TAVOLO ASSEGNATO</label>
                  <input
                    type="text"
                    placeholder="Es. T3 o Bancone"
                    value={walkInTable}
                    onChange={(e) => setWalkInTable(e.target.value)}
                    className="w-full h-11 px-3 border-2 border-neutral-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Telefono & Note */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">CELLULARE (OPZ.)</label>
                  <input
                    type="tel"
                    placeholder="340 0000000"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full h-11 px-3 border-2 border-neutral-300 focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">NOTE RAPIDE</label>
                  <input
                    type="text"
                    placeholder="Es. No glutine"
                    value={walkInNotes}
                    onChange={(e) => setWalkInNotes(e.target.value)}
                    className="w-full h-11 px-3 border-2 border-neutral-300 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Bottoni Azione */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="flex-1 h-12 border-2 border-neutral-300 hover:border-black font-bold uppercase text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingWalkIn}
                  className="flex-1 h-12 border-2 border-black bg-black text-white hover:bg-[#e60000] hover:border-[#e60000] font-black uppercase text-xs cursor-pointer transition-colors"
                >
                  {savingWalkIn ? 'Salvataggio...' : 'Conferma e Siedi →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
