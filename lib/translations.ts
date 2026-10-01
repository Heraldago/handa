export type Language = 'it' | 'en';

export const translations = {
  it: {
    // Header
    brandSubtitle: '慕食 • PORTELLO',
    instaLink: '@handa_mushi ↗',

    // Hero
    heroBadge: 'PRENOTAZIONI TAVOLO ONLINE',
    heroTitle: 'BLOCCA IL TAVOLO',
    heroHours: 'Lun–Sab 12:00–15:00 / 19:00–23:00 • Dom 19:00–23:00 (Solo Cena)',
    heroTagline: 'Non aver paura di sembrare strano perchè forse forse lo sei per davvero.',

    // Step 1: Persone
    step1Title: '1. Numero persone',
    step1GroupNotice: 'Tavoli 7+?',
    step1GroupAction: 'WhatsApp',

    // Step 2: Data
    step2Title: '2. Scegli data',
    today: 'OGGI',
    tomorrow: 'DOMANI',
    calendarPickerLabel: 'SELEZIONA UN’ALTRA DATA DAL CALENDARIO',
    calendarPickerPlaceholder: 'Scegli dal calendario...',
    calendarPickerOpen: 'APRI',

    // Step 3: Turno & Orario
    step3Title: '3. Turno & Orario di arrivo',
    liveAvailability: 'Disponibilità live',
    checkingAvailability: 'Controllo...',
    lunchTitle: 'PRANZO',
    lunchTime: '12:00 – 15:00',
    lunchDesc: 'Servizio dinamico, rapido & cicchetti (~45 min).',
    lunchNotice: '💡 Pranzo informale e veloce: permanenza media consigliata ~45 minuti per garantire i posti a tutti.',
    dinner1Title: '1° CENA',
    dinner1Time: '19:15 – 20:00',
    dinner1Desc: 'Tavolo da liberare categoricamente entro le 21:15.',
    dinner1Notice: '⚠️ Nota bene: questo tavolo è prenotato per il 2° turno alle 21:30, andrà liberato alle',
    dinner2Title: '2° CENA',
    dinner2Time: '21:30 – 23:00',
    dinner2Desc: 'Dalle 21:30 fino a chiusura del locale (23:00).',
    statusClosed: 'CHIUSO',
    statusFull: 'PIENO',
    selectSlotPrompt: 'Scegli orario esatto di arrivo',

    // Step 4: Preferenza Tavolo
    step4Title: '4. Preferenza Tavolo',
    outdoorActiveLabel: '☀️ Esterno aperto (sotto il portico)',
    outdoorClosedLabel: '🌧️ Esterno chiuso per meteo',
    indoorTitle: '🏠 SALA INTERNA',
    indoorSeats: '36 POSTI',
    indoorDesc: 'Sempre garantito al coperto con qualsiasi meteo.',
    outdoorTitle: '🌿 ESTERNO',
    outdoorSeats: '35 POSTI',
    outdoorDesc: 'Tavoli all’aperto sotto il portico di Via del Portello (soggetto al meteo).',
    outdoorDescClosed: 'Chiuso per pioggia o clima autunnale/invernale.',

    // Step 5: Contatti
    step5Title: '5. Dati di contatto',
    nameLabel: 'NOME E COGNOME *',
    namePlaceholder: 'Marco Rossi',
    phoneLabel: 'CELLULARE (WHATSAPP) *',
    phonePlaceholder: '340 1234567',
    emailLabel: 'EMAIL (OPZIONALE)',
    emailPlaceholder: 'nome@email.com',

    // Step 6: Note & Intolleranze
    step6Title: '6. Esigenze alimentari o note',
    dietaryOptions: [
      { key: 'vegan', label: 'Vegano' },
      { key: 'glutenFree', label: 'Senza glutine' },
      { key: 'noShellfish', label: 'No crostacei' },
      { key: 'noPeanuts', label: 'No arachidi / sesamo' },
    ],
    notesPlaceholder: 'Altre preferenze o note per il tavolo...',

    // Submit
    submitButton: 'CONFERMA PRENOTAZIONE TAVOLO →',
    submittingButton: 'CONFERMA IN CORSO...',
    guaranteeText: 'Tavolo garantito per 15 min oltre l’orario • Cancellazione gratuita',

    // Validation
    errorSelectDateTime: 'Seleziona data, turno e orario di arrivo.',
    errorContact: 'Inserisci nome e numero di cellulare per bloccare il tavolo.',
    errorGeneric: 'Errore durante la prenotazione. Riprova.',

    // Success Screen
    successStatus: 'STATO PRENOTAZIONE',
    confirmed: 'CONFERMATA',
    code: 'CODICE',
    name: 'NOME',
    covers: 'COPERTI',
    personSingle: 'PERSONA',
    personPlural: 'PERSONE',
    tableArea: 'AREA TAVOLO',
    outdoorSeating: '🌿 Esterno (Portico)',
    indoorSeating: '🏠 Sala Interna (Coperta)',
    dateTime: 'DATA & ORA',
    atHour: 'ORE',
    service: 'SERVIZIO',
    address: 'INDIRIZZO',
    addressValue: 'Via del Portello 32, Padova',
    notes: 'NOTE',
    toleranceNotice: 'Tolleranza di 15 minuti oltre l’orario prescelto. In caso di ritardo o disdetta avvisaci al 349 233 0492.',
    shareWhatsApp: 'Invia riepilogo su WhatsApp agli amici',
    addToGoogleCalendar: 'Aggiungi a Google Calendar',
    modifyOrCancel: 'Modifica o cancella prenotazione',
    newBooking: '← Nuova prenotazione',

    // WhatsApp Share Message Template
    whatsAppMessage: (booking: {
      customerName: string;
      date: string;
      time: string;
      shiftName: string;
      guestCount: number;
      seatingArea: string;
      code: string;
    }) => {
      const area = booking.seatingArea === 'outdoor' ? 'Esterno (sotto il portico)' : 'Sala interna';
      return `🥢 Ho prenotato il tavolo da HANDĀ (Padova, Portello)!\n📅 Data: ${booking.date}\n⏰ Turno: ${booking.time} (${booking.shiftName})\n📍 Dove: ${area} • Via del Portello 32\n👥 Per: ${booking.guestCount} persone\nCodice prenotazione: #${booking.code}\n\nChi viene puntuale alza la mano 🙋`;
    },

    calendarTitle: 'Cena da HANDA - Cicchetteria Asiatica',
    calendarDetails: (booking: { guestCount: number; code: string }) =>
      `Prenotazione tavolo per ${booking.guestCount} persone. Codice #${booking.code}. Tolleranza 15 min. Telefono: 349 233 0492.`,

    // Footer
    footerOpening: 'Mer–Mar 12:00–15:00 / 19:00–23:00 • Dom 19:00–23:00',
  },

  en: {
    // Header
    brandSubtitle: '慕食 • PORTELLO',
    instaLink: '@handa_mushi ↗',

    // Hero
    heroBadge: 'ONLINE TABLE RESERVATION',
    heroTitle: 'BOOK YOUR TABLE',
    heroHours: 'Mon–Sat 12:00–15:00 / 19:00–23:00 • Sun 19:00–23:00 (Dinner Only)',
    heroTagline: 'Don’t be afraid to seem weird because maybe you really are.',

    // Step 1: Persone
    step1Title: '1. Number of guests',
    step1GroupNotice: 'Party of 7+?',
    step1GroupAction: 'WhatsApp',

    // Step 2: Data
    step2Title: '2. Choose date',
    today: 'TODAY',
    tomorrow: 'TOMORROW',
    calendarPickerLabel: 'SELECT ANOTHER DATE FROM CALENDAR',
    calendarPickerPlaceholder: 'Pick from calendar...',
    calendarPickerOpen: 'OPEN',

    // Step 3: Turno & Orario
    step3Title: '3. Service & Arrival time',
    liveAvailability: 'Live availability',
    checkingAvailability: 'Checking...',
    lunchTitle: 'LUNCH',
    lunchTime: '12:00 – 15:00',
    lunchDesc: 'Fast-casual service & Asian cicchetti (~45 min stay).',
    lunchNotice: '💡 Fast-casual lunch: recommended stay ~45 min to accommodate all diners.',
    dinner1Title: '1ST DINNER',
    dinner1Time: '19:15 – 20:00',
    dinner1Desc: 'Table must be vacated strictly by 21:15 for the next shift.',
    dinner1Notice: '⚠️ Please note: this table is reserved for 2nd shift at 21:30, it must be vacated by',
    dinner2Title: '2ND DINNER',
    dinner2Time: '21:30 – 23:00',
    dinner2Desc: 'From 21:30 until closing time (23:00).',
    statusClosed: 'CLOSED',
    statusFull: 'FULL',
    selectSlotPrompt: 'Choose exact arrival time',

    // Step 4: Preferenza Tavolo
    step4Title: '4. Seating Area',
    outdoorActiveLabel: '☀️ Outdoor portico open',
    outdoorClosedLabel: '🌧️ Outdoor portico closed due to weather',
    indoorTitle: '🏠 INDOOR DINING',
    indoorSeats: '36 SEATS',
    indoorDesc: 'Always guaranteed indoor dining with any weather.',
    outdoorTitle: '🌿 OUTDOOR',
    outdoorSeats: '35 SEATS',
    outdoorDesc: 'Outdoor tables sheltered under the portico on Via del Portello (weather dependent).',
    outdoorDescClosed: 'Closed due to rain or cold weather.',

    // Step 5: Contatti
    step5Title: '5. Contact details',
    nameLabel: 'FULL NAME *',
    namePlaceholder: 'John Smith',
    phoneLabel: 'MOBILE PHONE (WHATSAPP) *',
    phonePlaceholder: '+39 340 1234567',
    emailLabel: 'EMAIL (OPTIONAL)',
    emailPlaceholder: 'john@email.com',

    // Step 6: Note & Intolleranze
    step6Title: '6. Dietary requirements & notes',
    dietaryOptions: [
      { key: 'vegan', label: 'Vegan' },
      { key: 'glutenFree', label: 'Gluten-free' },
      { key: 'noShellfish', label: 'No shellfish' },
      { key: 'noPeanuts', label: 'No peanuts / sesame' },
    ],
    notesPlaceholder: 'Any dietary requests, high chair, or notes...',

    // Submit
    submitButton: 'CONFIRM TABLE RESERVATION →',
    submittingButton: 'CONFIRMING RESERVATION...',
    guaranteeText: 'Table held for 15 min past booking time • Free cancellation',

    // Validation
    errorSelectDateTime: 'Please select date, service shift, and arrival time.',
    errorContact: 'Please enter your full name and mobile number to hold the table.',
    errorGeneric: 'Error completing reservation. Please try again.',

    // Success Screen
    successStatus: 'BOOKING STATUS',
    confirmed: 'CONFIRMED',
    code: 'CODE',
    name: 'NAME',
    covers: 'GUESTS',
    personSingle: 'GUEST',
    personPlural: 'GUESTS',
    tableArea: 'SEATING AREA',
    outdoorSeating: '🌿 Outdoor (Portico)',
    indoorSeating: '🏠 Indoor Dining (Covered)',
    dateTime: 'DATE & TIME',
    atHour: 'AT',
    service: 'SERVICE',
    address: 'ADDRESS',
    addressValue: 'Via del Portello 32, Padua (Italy)',
    notes: 'NOTES',
    toleranceNotice: '15-minute grace period past reserved time. In case of delay or cancellation, call us at +39 349 233 0492.',
    shareWhatsApp: 'Share reservation with friends on WhatsApp',
    addToGoogleCalendar: 'Add to Google Calendar',
    modifyOrCancel: 'Modify or cancel reservation',
    newBooking: '← New reservation',

    // WhatsApp Share Message Template
    whatsAppMessage: (booking: {
      customerName: string;
      date: string;
      time: string;
      shiftName: string;
      guestCount: number;
      seatingArea: string;
      code: string;
    }) => {
      const area = booking.seatingArea === 'outdoor' ? 'Outdoor (under the portico)' : 'Indoor dining';
      return `🥢 I booked a table at HANDĀ (Padua, Portello)!\n📅 Date: ${booking.date}\n⏰ Time: ${booking.time} (${booking.shiftName})\n📍 Location: ${area} • Via del Portello 32\n👥 Party of: ${booking.guestCount} guests\nBooking code: #${booking.code}\n\nSee you there on time! 🙋`;
    },

    calendarTitle: 'Dinner at HANDA - Asian Izakaya',
    calendarDetails: (booking: { guestCount: number; code: string }) =>
      `Table reservation for ${booking.guestCount} guests. Code #${booking.code}. 15 min grace period. Phone: +39 349 233 0492.`,

    // Footer
    footerOpening: 'Wed–Tue 12:00–15:00 / 19:00–23:00 • Sun 19:00–23:00',
  },
};
