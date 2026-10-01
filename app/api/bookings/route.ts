import { NextRequest, NextResponse } from 'next/server';
import { createBooking, getShiftAvailability, getSettings } from '@/lib/db';
import { ShiftId, SeatingArea } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      shiftId,
      time,
      seatingArea,
      guestCount,
      customerName,
      customerPhone,
      customerEmail,
      dietary,
      notes,
    } = body;

    // Validation
    if (!date || !shiftId || !guestCount || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Compila tutti i campi obbligatori (data, turno, persone, nome, cellulare).' },
        { status: 400 }
      );
    }

    const settings = getSettings();
    const guests = parseInt(guestCount, 10);

    if (isNaN(guests) || guests < 1) {
      return NextResponse.json({ error: 'Numero persone non valido.' }, { status: 400 });
    }

    if (guests > settings.maxGuestsOnline) {
      return NextResponse.json(
        {
          error: `Per gruppi superiori a ${settings.maxGuestsOnline} persone, ti chiediamo di chiamarci direttamente al locale (349 233 0492)!`,
        },
        { status: 400 }
      );
    }

    // Check shift availability
    const avail = getShiftAvailability(date);
    if (avail.isClosed) {
      return NextResponse.json({ error: 'Siamo chiusi in questa data.' }, { status: 400 });
    }

    const targetShift = avail.shifts.find((s) => s.id === (shiftId as ShiftId));
    if (!targetShift) {
      return NextResponse.json({ error: 'Turno non valido.' }, { status: 400 });
    }

    if (!targetShift.available) {
      return NextResponse.json(
        { error: `Posti esauriti per il ${targetShift.name}. Prova l'altro turno o un'altra data!` },
        { status: 400 }
      );
    }

    const chosenArea: SeatingArea = (seatingArea === 'outdoor' && avail.isOutdoorActive) ? 'outdoor' : 'indoor';

    // Verify requested area capacity
    if (chosenArea === 'indoor' && targetShift.remainingIndoor < guests) {
      if (avail.isOutdoorActive && targetShift.remainingOutdoor >= guests) {
        return NextResponse.json(
          { error: `Sala interna piena per questo orario! È rimasto posto solo all'esterno (sotto il portico).` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Posti interni esauriti per questo turno.` },
        { status: 400 }
      );
    }

    if (chosenArea === 'outdoor') {
      if (!avail.isOutdoorActive) {
        return NextResponse.json(
          { error: `I tavoli all'esterno non sono attivi per questa data per motivi meteo/stagionali.` },
          { status: 400 }
        );
      }
      if (targetShift.remainingOutdoor < guests) {
        return NextResponse.json(
          { error: `Posti esterni esauriti per questo turno. Prova in Sala Interna!` },
          { status: 400 }
        );
      }
    }

    const shiftConfig = settings.shifts[shiftId as ShiftId];
    const finalTime = time || (shiftConfig?.availableSlots?.[0] ?? '19:30');

    const booking = createBooking({
      date,
      shiftId: shiftId as ShiftId,
      shiftName: shiftConfig ? shiftConfig.name : shiftId,
      time: finalTime,
      seatingArea: chosenArea,
      guestCount: guests,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.trim() : undefined,
      dietary: Array.isArray(dietary) ? dietary : [],
      notes: notes ? notes.trim() : '',
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Errore interno nel salvataggio della prenotazione.' }, { status: 500 });
  }
}
