import { NextRequest, NextResponse } from 'next/server';
import { toggleOutdoorStatus, getShiftAvailability } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, enabled } = body;

    if (!date) {
      return NextResponse.json({ error: 'Data mancante' }, { status: 400 });
    }

    const nextOutdoorActive = await toggleOutdoorStatus(date, enabled);
    const availability = await getShiftAvailability(date);

    return NextResponse.json({
      success: true,
      date,
      isOutdoorActive: nextOutdoorActive,
      availability,
    });
  } catch (error) {
    console.error('Error toggling outdoor:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
