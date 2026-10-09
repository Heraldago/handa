import { NextRequest, NextResponse } from 'next/server';
import { getBookingsByDate, createBooking, getSettings, getShiftAvailability } from '@/lib/db';
import { ShiftId, SeatingArea } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const bookings = await getBookingsByDate(date);
    const settings = await getSettings();
    const availability = await getShiftAvailability(date);

    // Calculate quick stats
    const totalCovers = bookings.reduce((sum, b) => sum + b.guestCount, 0);
    const seatedCovers = bookings
      .filter((b) => b.status === 'SEATED')
      .reduce((sum, b) => sum + b.guestCount, 0);

    const indoorCovers = bookings
      .filter((b) => b.seatingArea !== 'outdoor')
      .reduce((sum, b) => sum + b.guestCount, 0);

    const outdoorCovers = bookings
      .filter((b) => b.seatingArea === 'outdoor')
      .reduce((sum, b) => sum + b.guestCount, 0);

    const lockedShiftsForDate = settings.lockedShifts[date] || [];

    return NextResponse.json({
      date,
      bookings,
      availability,
      stats: {
        totalCovers,
        seatedCovers,
        indoorCovers,
        outdoorCovers,
        totalBookings: bookings.length,
        lockedShifts: lockedShiftsForDate,
        isOutdoorActive: availability.isOutdoorActive,
      },
      settings,
    });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

// Quick Walk-In insertion from admin dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, shiftId, time, seatingArea, guestCount, customerName, customerPhone, tableNumber, notes } = body;

    if (!date || !shiftId || !guestCount || !customerName) {
      return NextResponse.json({ error: 'Dati incompleti per walk-in' }, { status: 400 });
    }

    const settings = await getSettings();
    const shiftConfig = settings.shifts[shiftId as ShiftId];

    const booking = await createBooking({
      date,
      shiftId: shiftId as ShiftId,
      shiftName: shiftConfig ? shiftConfig.name : shiftId,
      time: time || (shiftConfig ? shiftConfig.availableSlots[0] : '19:30'),
      seatingArea: (seatingArea as SeatingArea) || 'indoor',
      guestCount: parseInt(guestCount, 10),
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : 'Walk-in',
      dietary: [],
      notes: notes ? `[WALK-IN] ${notes}` : '[WALK-IN]',
      tableNumber: tableNumber ? tableNumber.trim() : undefined,
      isWalkIn: true,
    });

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Error creating walk-in booking:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
