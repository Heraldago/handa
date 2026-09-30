import { NextRequest, NextResponse } from 'next/server';
import { getBookingByCode, cancelBookingByCode } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    if (!code) {
      return NextResponse.json({ error: 'Codice mancante' }, { status: 400 });
    }

    const booking = getBookingByCode(code);
    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error getting booking by code:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const body = await request.json();

    if (body.action === 'CANCEL') {
      const ok = cancelBookingByCode(code);
      if (!ok) {
        return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Prenotazione annullata con successo' });
    }

    return NextResponse.json({ error: 'Azione non supportata' }, { status: 400 });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
