import fs from 'fs';
import path from 'path';
import { Booking, Settings, ShiftId, SeatingArea } from './types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

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
      name: '1° Turno Cena',
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
      name: '2° Turno Cena',
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

// Map helper between Supabase row and TypeScript Booking
function mapRowToBooking(row: any): Booking {
  return {
    id: row.id,
    code: row.code,
    date: row.date,
    shiftId: row.shift_id as ShiftId,
    shiftName: row.shift_name,
    time: row.time,
    guestCount: Number(row.guest_count),
    seatingArea: row.seating_area as SeatingArea,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || undefined,
    dietary: Array.isArray(row.dietary) ? row.dietary : [],
    notes: row.notes || undefined,
    status: row.status,
    tableNumber: row.table_number || undefined,
    isWalkIn: Boolean(row.is_walk_in),
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function mapBookingToRow(b: Booking): any {
  return {
    id: b.id,
    code: b.code,
    date: b.date,
    shift_id: b.shiftId,
    shift_name: b.shiftName,
    time: b.time,
    guest_count: b.guestCount,
    seating_area: b.seatingArea,
    customer_name: b.customerName,
    customer_phone: b.customerPhone,
    customer_email: b.customerEmail || null,
    dietary: b.dietary || [],
    notes: b.notes || null,
    status: b.status,
    table_number: b.tableNumber || null,
    is_walk_in: b.isWalkIn || false,
    created_at: b.createdAt,
    updated_at: b.updatedAt || new Date().toISOString(),
  };
}

// Local file fallback helpers
function getLocalSettings(): Settings {
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

function saveLocalSettings(settings: Settings): void {
  ensureFilesExist();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {}
}

function getLocalBookings(): Booking[] {
  ensureFilesExist();
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalBookings(bookings: Booking[]): void {
  ensureFilesExist();
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch {}
}

// ==============================================================================
// EXPORTED ASYNC DATABASE FUNCTIONS (SUPABASE + LOCAL FALLBACK)
// ==============================================================================

export async function getSettings(): Promise<Settings> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'restaurant_config')
        .single();

      if (!error && data?.data) {
        return {
          ...DEFAULT_SETTINGS,
          ...data.data,
          shifts: {
            ...DEFAULT_SETTINGS.shifts,
            ...(data.data.shifts || {}),
          },
        };
      }
    } catch (err) {
      console.warn('Supabase getSettings fallback to local:', err);
    }
  }

  return getLocalSettings();
}

export async function saveSettings(settings: Settings): Promise<void> {
  saveLocalSettings(settings);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('settings').upsert({
        id: 'restaurant_config',
        data: settings,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Supabase saveSettings error:', err);
    }
  }
}

export async function getAllBookings(): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(mapRowToBooking);
      }
    } catch (err) {
      console.warn('Supabase getAllBookings fallback to local:', err);
    }
  }

  return getLocalBookings();
}

export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', date)
        .neq('status', 'CANCELLED');

      if (!error && data) {
        return data.map(mapRowToBooking);
      }
    } catch (err) {
      console.warn('Supabase getBookingsByDate fallback to local:', err);
    }
  }

  const all = getLocalBookings();
  return all.filter((b) => b.date === date && b.status !== 'CANCELLED');
}

export async function getBookingByCode(code: string): Promise<Booking | null> {
  const cleanCode = code.trim().toUpperCase();
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .ilike('code', cleanCode)
        .single();

      if (!error && data) {
        return mapRowToBooking(data);
      }
      if (error && error.code === 'PGRST116') {
        return null;
      }
    } catch (err) {
      console.warn('Supabase getBookingByCode fallback to local:', err);
    }
  }

  const all = getLocalBookings();
  return all.find((b) => b.code.toUpperCase() === cleanCode) || null;
}

export async function createBooking(
  data: Omit<Booking, 'id' | 'code' | 'createdAt' | 'status'>
): Promise<Booking> {
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

  // Always update local storage
  const localList = getLocalBookings();
  localList.push(newBooking);
  saveLocalBookings(localList);

  // Save to Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const row = mapBookingToRow(newBooking);
      const { error } = await supabase.from('bookings').insert(row);
      if (error) {
        console.error('Supabase createBooking insert error:', error);
      }
    } catch (err) {
      console.error('Supabase createBooking exception:', err);
    }
  }

  return newBooking;
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
  const localList = getLocalBookings();
  const index = localList.findIndex((b) => b.id === id);

  let updatedBooking: Booking | null = null;
  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLocalBookings(localList);
    updatedBooking = localList[index];
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.tableNumber !== undefined) updateData.table_number = updates.tableNumber;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.guestCount !== undefined) updateData.guest_count = updates.guestCount;
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.seatingArea !== undefined) updateData.seating_area = updates.seatingArea;

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return mapRowToBooking(data);
      }
    } catch (err) {
      console.error('Supabase updateBooking error:', err);
    }
  }

  return updatedBooking;
}

export async function cancelBookingByCode(code: string): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  const localList = getLocalBookings();
  const index = localList.findIndex((b) => b.code.toUpperCase() === cleanCode);

  let localSuccess = false;
  if (index !== -1) {
    localList[index].status = 'CANCELLED';
    localList[index].updatedAt = new Date().toISOString();
    saveLocalBookings(localList);
    localSuccess = true;
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .ilike('code', cleanCode);

      if (!error) {
        return true;
      }
    } catch (err) {
      console.error('Supabase cancelBookingByCode error:', err);
    }
  }

  return localSuccess;
}

export async function toggleOutdoorStatus(date: string, enabled?: boolean): Promise<boolean> {
  const settings = await getSettings();
  const current = settings.outdoorStatusByDate[date] ?? settings.outdoorEnabledByDefault;
  const nextValue = enabled !== undefined ? enabled : !current;

  settings.outdoorStatusByDate[date] = nextValue;
  await saveSettings(settings);
  return nextValue;
}

export async function getShiftAvailability(date: string) {
  const settings = await getSettings();

  // Parse date safely in local time
  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  const isClosed = settings.closedDays.includes(dayOfWeek);
  const lockedForDate = settings.lockedShifts[date] || [];
  const bookingsForDate = await getBookingsByDate(date);

  // Weather / Dehors condition for this date
  const isOutdoorActive = settings.outdoorStatusByDate[date] ?? settings.outdoorEnabledByDefault;

  // Sunday: Closed for lunch! Only open for dinner 19-23.
  const isSunday = dayOfWeek === 0;

  const maxIndoor = settings.maxCapacityIndoor; // 36
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

    // Check manual override lock
    if (lockedForDate.includes(shift.id)) {
      return {
        ...shift,
        available: false,
        reason: 'Turno bloccato dal locale',
        bookedIndoor: 0,
        bookedOutdoor: 0,
        remainingIndoor: 0,
        remainingOutdoor: 0,
        remainingTotal: 0,
      };
    }

    // Filter bookings for this shift
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

    // Available if there are seats in at least one area
    const available = remainingTotal > 0;

    return {
      ...shift,
      available,
      reason: available ? undefined : 'Posti esauriti',
      bookedIndoor,
      bookedOutdoor,
      remainingIndoor,
      remainingOutdoor,
      remainingTotal,
    };
  });

  return {
    date,
    dayOfWeek,
    isClosed,
    isSunday,
    isOutdoorActive,
    shifts: shiftsAvailability,
    maxCapacityIndoor: settings.maxCapacityIndoor,
    maxCapacityOutdoor: settings.maxCapacityOutdoor,
  };
}
