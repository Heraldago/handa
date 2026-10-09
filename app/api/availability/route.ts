import { NextRequest, NextResponse } from 'next/server';
import { getShiftAvailability } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Data non fornita' }, { status: 400 });
    }

    const availability = await getShiftAvailability(date);
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Errore nel recupero disponibilità' }, { status: 500 });
  }
}
