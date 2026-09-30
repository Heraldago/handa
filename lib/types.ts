export type ShiftId = 'lunch' | 'dinner_1' | 'dinner_2';

export type BookingStatus = 'CONFIRMED' | 'SEATED' | 'LATE' | 'NOSHOW' | 'CANCELLED';

export type SeatingArea = 'indoor' | 'outdoor';

export interface ShiftConfig {
  id: ShiftId;
  name: string;
  category: 'lunch' | 'dinner';
  timeRange: string;
  availableSlots: string[]; // e.g. ['19:15', '19:30', '19:45', '20:00']
  departureTime?: string;   // e.g. '21:15'
  description: string;
  isDynamicLunch?: boolean;
  enabled: boolean;
  maxCoversIndoor: number;  // 36
  maxCoversOutdoor: number; // 35
}

export interface Booking {
  id: string;
  code: string;
  date: string; // YYYY-MM-DD
  shiftId: ShiftId;
  shiftName: string;
  time: string; // specific arrival slot e.g. '19:30', '13:00'
  guestCount: number;
  seatingArea: SeatingArea; // 'indoor' | 'outdoor'
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  dietary: string[];
  notes?: string;
  status: BookingStatus;
  tableNumber?: string;
  isWalkIn?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Settings {
  restaurantName: string;
  japaneseTitle: string;
  subtitle: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  instagram: string;
  maxCapacityIndoor: number;  // 36 posti sala
  maxCapacityOutdoor: number; // 35 posti plateatico/dehors
  maxGuestsOnline: number;
  closedDays: number[]; // 0 = Sunday (lunch disabled dynamically)
  outdoorEnabledByDefault: boolean;
  outdoorStatusByDate: Record<string, boolean>; // date -> true/false
  shifts: Record<ShiftId, ShiftConfig>;
  lockedShifts: Record<string, ShiftId[]>; // date -> locked shift ids
}
