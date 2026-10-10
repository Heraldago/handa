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

    // Send staff notification
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

    // Send confirmation to customer if customerEmail is provided
    if (booking.customerEmail && booking.customerEmail.includes('@')) {
      const customerSubject = isNew
        ? `Conferma Prenotazione Tavolo #${booking.code} • HANDĀ`
        : `Cancellazione Prenotazione #${booking.code} • HANDĀ`;

      const customerHtml = isNew
        ? `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; max-width: 580px; margin: 0 auto; padding: 24px; border: 2px solid #000; background-color: #faf8f5;">
            <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
              <h1 style="margin: 0; font-size: 26px; text-transform: uppercase; font-weight: 900; letter-spacing: -1px;">
                HANDĀ<span style="color: #e60000;">.</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; font-weight: bold;">
                Cicchetteria Asiatica • Made in Portello (Padova)
              </p>
            </div>

            <div style="background-color: #ffffff; border: 2px solid #000; padding: 20px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #059669; background: #ecfdf5; padding: 4px 8px; border: 1px solid #a7f3d0;">
                  ✓ PRENOTAZIONE CONFERMATA
                </span>
                <span style="font-size: 22px; font-weight: 900; color: #000;">
                  #${booking.code}
                </span>
              </div>

              <p style="margin: 8px 0; font-size: 15px;"><strong>Nome:</strong> ${booking.customerName}</p>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Persone:</strong> ${booking.guestCount} ${booking.guestCount === 1 ? 'persona' : 'persone'}</p>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Data e Orario:</strong> <span style="color: #e60000; font-weight: bold;">${booking.date} alle ${booking.time}</span> (${booking.shiftName})</p>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Zona:</strong> ${areaLabel}</p>
              <p style="margin: 8px 0; font-size: 15px;"><strong>Indirizzo:</strong> Via del Portello, 32 - Padova</p>
              ${booking.dietary && booking.dietary.length > 0 ? `<p style="margin: 8px 0; font-size: 14px; color: #e60000;"><strong>Note / Allergie:</strong> ${booking.dietary.join(', ')}</p>` : ''}
            </div>

            <div style="background: #f4f4f5; padding: 12px 16px; border-left: 4px solid #000; font-size: 12px; color: #444; line-height: 1.5; margin-bottom: 24px;">
              <strong>Info Servizio:</strong> Tolleranza di arrivo 15 minuti. Per il 1° turno cena, il tavolo va liberato entro le 21:15 per permettere la preparazione del secondo turno.
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
              <a href="https://handa-rose.vercel.app/prenotazione/${booking.code}" style="display: inline-block; background-color: #000; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #000;">
                Visualizza o Cancella Prenotazione →
              </a>
            </div>

            <p style="text-align: center; font-size: 11px; color: #888; margin: 0;">
              Se hai bisogno di contattarci: Tel. 349 233 0492 • Via del Portello 32, Padova
            </p>
          </div>
        `
        : `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; max-width: 580px; margin: 0 auto; padding: 24px; border: 2px solid #e60000; background-color: #faf8f5;">
            <h2 style="margin-top: 0; color: #e60000; text-transform: uppercase;">HANDĀ • Prenotazione Annullata</h2>
            <p style="font-size: 15px;">Ciao ${booking.customerName}, la tua prenotazione <strong>#${booking.code}</strong> per il <strong>${booking.date} alle ${booking.time}</strong> è stata annullata con successo.</p>
            <p style="font-size: 13px; color: #666;">Il tavolo è stato rimesso a disposizione. Speriamo di rivederti presto!</p>
            <div style="margin-top: 20px;">
              <a href="https://handa-rose.vercel.app" style="display: inline-block; background: #000; color: #fff; padding: 12px 20px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 12px;">Effettua una nuova prenotazione</a>
            </div>
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
          to: [booking.customerEmail],
          subject: customerSubject,
          html: customerHtml,
        }),
      });
    }
  } catch (error) {
    console.error('Failed to send Email notification:', error);
  }
}
