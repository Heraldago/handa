import { NextRequest, NextResponse } from 'next/server';
import { findBookingsByCustomer } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    if (!query.trim()) {
      return NextResponse.json({ error: 'Specifica un codice, telefono o email' }, { status: 400 });
    }

    const bookings = await findBookingsByCustomer(query);
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Error looking up bookings:', error);
    return NextResponse.json({ error: 'Errore durante la ricerca' }, { status: 500 });
  }
}
