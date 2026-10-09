import { Booking } from './types';

interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

interface EmailConfig {
  resendApiKey?: string;
  notificationEmail?: string;
}

function getTelegramConfig(): TelegramConfig {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  };
}

function getEmailConfig(): EmailConfig {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    notificationEmail: process.env.NOTIFICATION_EMAIL,
  };
}

export async function sendStaffBookingNotification(
  booking: Booking,
  type: 'NEW' | 'CANCELLED' = 'NEW'
): Promise<void> {
  const telegram = getTelegramConfig();
  const email = getEmailConfig();

  // Run in parallel, never throw to block user booking
  await Promise.allSettled([
    sendTelegramNotification(booking, type, telegram),
    sendEmailNotification(booking, type, email),
  ]);
}

async function sendTelegramNotification(
  booking: Booking,
  type: 'NEW' | 'CANCELLED',
  config: TelegramConfig
): Promise<void> {
  if (!config.botToken || !config.chatId) {
    return;
  }

  try {
    const isNew = type === 'NEW';
    const areaLabel = booking.seatingArea === 'outdoor' ? '🌿 ESTERNO (Portico)' : '🏠 SALA INTERNA';
    const dietaryLabel = booking.dietary && booking.dietary.length > 0 ? booking.dietary.join(', ') : 'Nessuna';
    const notesLabel = booking.notes?.trim() ? booking.notes.trim() : 'Nessuna';

    let text = '';
    if (isNew) {
      text = [
        '🥢 *NUOVA PRENOTAZIONE • HANDĀ*',
        '',
        `📋 *Codice:* \`#${booking.code}\``,
        `👤 *Cliente:* *${booking.customerName}*`,
        `👥 *Coperti:* *${booking.guestCount} PERSONE*`,
        `📅 *Data:* *${booking.date}*`,
        `⏰ *Orario:* *${booking.time}* _(${booking.shiftName})_`,
        `📍 *Area:* ${areaLabel}`,
        `📞 *Telefono:* [${booking.customerPhone}](tel:${booking.customerPhone})`,
        booking.customerEmail ? `✉️ *Email:* ${booking.customerEmail}` : '',
        `⚠️ *Allergie/Dietary:* ${dietaryLabel}`,
        `📝 *Note:* ${notesLabel}`,
        '',
        `👉 [Apri Pannello Admin](https://handa-rose.vercel.app/admin)`,
      ]
        .filter(Boolean)
        .join('\n');
    } else {
      text = [
        '🚨 *PRENOTAZIONE CANCELLATA • HANDĀ*',
        '',
        `📋 *Codice:* \`#${booking.code}\``,
        `👤 *Cliente:* ${booking.customerName}`,
        `👥 *Coperti liberati:* ${booking.guestCount} PAX`,
        `📅 *Data:* ${booking.date} (${booking.shiftName})`,
        `⏰ *Orario:* ${booking.time}`,
        '',
        'I posti sono stati rimessi a disposizione automaticamente sul sistema.',
      ].join('\n');
    }

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Telegram notification error response:', errBody);
    }
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

async function sendEmailNotification(
  booking: Booking,
  type: 'NEW' | 'CANCELLED',
  config: EmailConfig
): Promise<void> {
  if (!config.resendApiKey || !config.notificationEmail) {
    return;
  }

  try {
    const isNew = type === 'NEW';
    const areaLabel = booking.seatingArea === 'outdoor' ? 'Esterno (Portico)' : 'Sala Interna';
    const subject = isNew
      ? `🥢 Nuova Prenotazione #${booking.code} - ${booking.customerName} (${booking.guestCount} PAX)`
      : `🚨 Cancellazione Prenotazione #${booking.code} - ${booking.customerName}`;

    const html = isNew
      ? `
        <div style="font-family: sans-serif; color: #111; max-width: 600px; padding: 20px; border: 2px solid #000;">
          <h2 style="margin-top: 0; color: #e60000; text-transform: uppercase;">HANDĀ • Nuova Prenotazione</h2>
          <p style="font-size: 18px; margin: 5px 0;"><strong>Codice:</strong> #${booking.code}</p>
          <hr style="border: 1px solid #eee; margin: 15px 0;" />
          <p><strong>Nome Cliente:</strong> ${booking.customerName}</p>
          <p><strong>Persone:</strong> ${booking.guestCount} PAX</p>
          <p><strong>Data:</strong> ${booking.date}</p>
          <p><strong>Orario:</strong> ${booking.time} (${booking.shiftName})</p>
          <p><strong>Zona:</strong> ${areaLabel}</p>
          <p><strong>Telefono:</strong> <a href="tel:${booking.customerPhone}">${booking.customerPhone}</a></p>
          ${booking.customerEmail ? `<p><strong>Email:</strong> ${booking.customerEmail}</p>` : ''}
          <p><strong>Allergie / Intolleranze:</strong> ${booking.dietary?.join(', ') || 'Nessuna'}</p>
          <p><strong>Note:</strong> ${booking.notes || 'Nessuna'}</p>
          <div style="margin-top: 25px;">
            <a href="https://handa-rose.vercel.app/admin" style="background: #000; color: #fff; padding: 10px 18px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 13px;">Apri Dashboard Staff</a>
          </div>
        </div>
      `
      : `
        <div style="font-family: sans-serif; color: #111; max-width: 600px; padding: 20px; border: 2px solid #e60000;">
          <h2 style="margin-top: 0; color: #e60000; text-transform: uppercase;">HANDĀ • Prenotazione Cancellata</h2>
          <p>La prenotazione <strong>#${booking.code}</strong> di <strong>${booking.customerName}</strong> (${booking.guestCount} PAX) per il <strong>${booking.date} alle ${booking.time}</strong> è stata annullata.</p>
          <p>Il tavolo è stato liberato automaticamente per altri clienti.</p>
        </div>
      `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'HANDĀ Prenotazioni <prenotazioni@handa-izakaya.it>',
        to: [config.notificationEmail],
        subject,
        html,
      }),
    });
  } catch (error) {
    console.error('Failed to send Email notification:', error);
  }
}
