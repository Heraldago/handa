import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';
import { ShiftId } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, shiftId } = body;

    if (!date || !shiftId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const settings = getSettings();
    if (!settings.lockedShifts[date]) {
      settings.lockedShifts[date] = [];
    }

    const currentLocked = settings.lockedShifts[date];
    const index = currentLocked.indexOf(shiftId as ShiftId);

    let isNowLocked = false;
    if (index > -1) {
      // Unlock
      currentLocked.splice(index, 1);
      isNowLocked = false;
    } else {
      // Lock
      currentLocked.push(shiftId as ShiftId);
      isNowLocked = true;
    }

    settings.lockedShifts[date] = currentLocked;
    saveSettings(settings);

    return NextResponse.json({
      success: true,
      date,
      shiftId,
      isLocked: isNowLocked,
      lockedShifts: currentLocked,
    });
  } catch (error) {
    console.error('Error toggling shift:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
