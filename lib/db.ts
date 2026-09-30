import fs from 'fs';
import path from 'path';
import { Booking, Settings, ShiftId, SeatingArea } from './types';

const DATA_DIR = process.env.VERCEL ? '/tmp/handa-data' : path.join(process.cwd(), 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: Settings = {
  restaurantName: 'HANDA.',
  japaneseTitle: '慕食',
  subtitle: 'Cicchetteria Asiatica • Made in Portello',
  address: 'Via del Portello, 32 - Padova',
  phone: '349 233 0492',
  whatsappNumber: '393492330492',
  instagram: 'handa_mushi',
  maxCapacityIndoor: 36,
  maxCapacityOutdoor: 35,
  maxGuestsOnline: 6,
  closedDays: [], // Aperto tutti i giorni (Domenica solo cena)
  outdoorEnabledByDefault: true,
  outdoorStatusByDate: {},
  shifts: {
    lunch: {
      id: 'lunch',
      name: 'Pranzo Dinamico',
      category: 'lunch',
      timeRange: '12:00 – 15:00',
      availableSlots: ['12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15'],
      description: 'Servizio veloce & cicchetti • Nessun turno rigido (rotazione rapida ~45 min)',
      isDynamicLunch: true,
      enabled: true,
      maxCoversIndoor: 36,
      maxCoversOutdoor: 35,
    },
    dinner_1: {
      id: 'dinner_1',
      name: '1° Turno (Cena)',
      category: 'dinner',
      timeRange: '19:15 – 21:15',
      availableSlots: ['19:15', '19:30', '19:45', '20:00'],
      departureTime: '21:15',
      description: 'Arrivo 19:15–20:00 • Tavolo da liberare categoricamente entro le 21:15/21:20',
      enabled: true,
      maxCoversIndoor: 36,
      maxCoversOutdoor: 35,
    },
    dinner_2: {
      id: 'dinner_2',
      name: '2° Turno (Cena)',
      category: 'dinner',
      timeRange: '21:30 – 23:00',
      availableSlots: ['21:30', '21:45', '22:00'],
      description: 'Dalle 21:30 in poi fino a chiusura locale (23:00)',
      enabled: true,
      maxCoversIndoor: 36,
      maxCoversOutdoor: 35,
    },
  },
  lockedShifts: {},
};

function ensureFilesExist() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (process.env.VERCEL) {
    const seedSettings = path.join(process.cwd(), 'data', 'settings.json');
    const seedBookings = path.join(process.cwd(), 'data', 'bookings.json');
    if (!fs.existsSync(SETTINGS_FILE) && fs.existsSync(seedSettings)) {
      try { fs.copyFileSync(seedSettings, SETTINGS_FILE); } catch {}
    }
    if (!fs.existsSync(BOOKINGS_FILE) && fs.existsSync(seedBookings)) {
      try { fs.copyFileSync(seedBookings, BOOKINGS_FILE); } catch {}
    }
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }

  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getSettings(): Settings {
  ensureFilesExist();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      maxCapacityIndoor: parsed.maxCapacityIndoor ?? 36,
      maxCapacityOutdoor: parsed.maxCapacityOutdoor ?? 35,
      outdoorEnabledByDefault: parsed.outdoorEnabledByDefault ?? true,
      outdoorStatusByDate: parsed.outdoorStatusByDate ?? {},
      shifts: {
        ...DEFAULT_SETTINGS.shifts,
        ...(parsed.shifts || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  ensureFilesExist();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export function getAllBookings(): Booking[] {
  ensureFilesExist();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAllBookings(bookings: Booking[]): void {
  ensureFilesExist();
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
}

export function getBookingsByDate(date: string): Booking[] {
  const all = getAllBookings();
  return all.filter((b) => b.date === date && b.status !== 'CANCELLED');
}

export function getBookingByCode(code: string): Booking | null {
  const all = getAllBookings();
  return all.find((b) => b.code.toUpperCase() === code.toUpperCase()) || null;
}

export function createBooking(data: Omit<Booking, 'id' | 'code' | 'createdAt' | 'status'>): Booking {
  const all = getAllBookings();
  
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = `HND-${randomSuffix}`;
  const id = `b_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newBooking: Booking = {
    ...data,
    seatingArea: data.seatingArea || 'indoor',
    id,
    code,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  all.push(newBooking);
  saveAllBookings(all);
  return newBooking;
}

export function updateBooking(id: string, updates: Partial<Booking>): Booking | null {
  const all = getAllBookings();
  const index = all.findIndex((b) => b.id === id);
  if (index === -1) return null;

  all[index] = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveAllBookings(all);
  return all[index];
}

export function cancelBookingByCode(code: string): boolean {
  const all = getAllBookings();
  const index = all.findIndex((b) => b.code.toUpperCase() === code.toUpperCase());
  if (index === -1) return false;

  all[index].status = 'CANCELLED';
  all[index].updatedAt = new Date().toISOString();
  saveAllBookings(all);
  return true;
}

export function toggleOutdoorStatus(date: string, enabled?: boolean): boolean {
  const settings = getSettings();
  const current = settings.outdoorStatusByDate[date] ?? settings.outdoorEnabledByDefault;
  const nextValue = enabled !== undefined ? enabled : !current;

  settings.outdoorStatusByDate[date] = nextValue;
  saveSettings(settings);
  return nextValue;
}

export function getShiftAvailability(date: string) {
  const settings = getSettings();
  
  // Parse date safely in local time
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  const isClosed = settings.closedDays.includes(dayOfWeek);
  const lockedForDate = settings.lockedShifts[date] || [];
  const bookingsForDate = getBookingsByDate(date);

  // Weather / Dehors condition for this date
  const isOutdoorActive = settings.outdoorStatusByDate[date] ?? settings.outdoorEnabledByDefault;

  // Sunday: Closed for lunch! Only open for dinner 19-23.
  const isSunday = dayOfWeek === 0;

  const maxIndoor = settings.maxCapacityIndoor;   // 36
  const maxOutdoor = isOutdoorActive ? settings.maxCapacityOutdoor : 0; // 35 or 0

  const shiftsAvailability = Object.values(settings.shifts).map((shift) => {
    if (!shift.enabled) {
      return {
        ...shift,
        available: false,
        reason: 'Turno non attivo',
        bookedIndoor: 0,
        bookedOutdoor: 0,
        remainingIndoor: 0,
        remainingOutdoor: 0,
        remainingTotal: 0,
      };
    }

    if (isClosed) {
      return {
        ...shift,
        available: false,
        reason: 'Locale chiuso',
        bookedIndoor: 0,
        bookedOutdoor: 0,
        remainingIndoor: 0,
        remainingOutdoor: 0,
        remainingTotal: 0,
      };
    }

    // Sunday lunch is closed
    if (isSunday && shift.id === 'lunch') {
      return {
        ...shift,
        available: false,
        reason: 'Domenica chiuso a pranzo (aperto 19:00 – 23:00)',
        bookedIndoor: 0,
        bookedOutdoor: 0,
        remainingIndoor: 0,
        remainingOutdoor: 0,
        remainingTotal: 0,
      };
    }

    if (lockedForDate.includes(shift.id)) {
      return {
        ...shift,
        available: false,
        reason: 'Turno bloccato manualmente per questa data',
        bookedIndoor: 0,
        bookedOutdoor: 0,
        remainingIndoor: 0,
        remainingOutdoor: 0,
        remainingTotal: 0,
      };
    }

    const shiftBookings = bookingsForDate.filter((b) => b.shiftId === shift.id);
    const bookedIndoor = shiftBookings
      .filter((b) => b.seatingArea !== 'outdoor')
      .reduce((sum, b) => sum + b.guestCount, 0);

    const bookedOutdoor = shiftBookings
      .filter((b) => b.seatingArea === 'outdoor')
      .reduce((sum, b) => sum + b.guestCount, 0);

    const remainingIndoor = Math.max(0, maxIndoor - bookedIndoor);
    const remainingOutdoor = Math.max(0, maxOutdoor - bookedOutdoor);
    const remainingTotal = remainingIndoor + remainingOutdoor;

    return {
      ...shift,
      available: remainingTotal >= 1,
      bookedIndoor,
      bookedOutdoor,
      remainingIndoor,
      remainingOutdoor,
      remainingTotal,
      indoorAvailable: remainingIndoor >= 1,
      outdoorAvailable: isOutdoorActive && remainingOutdoor >= 1,
      reason: remainingTotal < 1 ? 'Tutto esaurito' : undefined,
    };
  });

  return {
    date,
    isClosed,
    dayOfWeek,
    isOutdoorActive,
    maxCapacityIndoor: maxIndoor,
    maxCapacityOutdoor: settings.maxCapacityOutdoor,
    shifts: shiftsAvailability,
  };
}
