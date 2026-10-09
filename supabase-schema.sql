-- ==============================================================================
-- HANDĀ Asian Izakaya - Schema Database Supabase
-- Esegui questo script nell'editor SQL di Supabase (SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Tabella PRENOTAZIONI (Bookings)
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  shift_id TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  time TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  seating_area TEXT NOT NULL CHECK (seating_area IN ('indoor', 'outdoor')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  dietary JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'SEATED', 'LATE', 'NOSHOW', 'CANCELLED')),
  table_number TEXT,
  is_walk_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per velocizzare ricerche per data, codice prenotazione e stato
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 2. Tabella IMPOSTAZIONI LOCALE (Settings: orari, coperti, dehors, blocchi)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dati Iniziali (Seed per HANDĀ)
INSERT INTO settings (id, data, updated_at)
VALUES (
  'restaurant_config',
  '{
    "restaurantName": "HANDA.",
    "japaneseTitle": "慕食",
    "subtitle": "Cicchetteria Asiatica • Made in Portello",
    "address": "Via del Portello, 32 - Padova",
    "phone": "349 233 0492",
    "whatsappNumber": "393492330492",
    "instagram": "handa_mushi",
    "maxCapacityIndoor": 36,
    "maxCapacityOutdoor": 35,
    "maxGuestsOnline": 6,
    "closedDays": [],
    "outdoorEnabledByDefault": true,
    "outdoorStatusByDate": {},
    "shifts": {
      "lunch": {
        "id": "lunch",
        "name": "Pranzo Dinamico",
        "category": "lunch",
        "timeRange": "12:00 – 15:00",
        "availableSlots": ["12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15"],
        "description": "Servizio veloce & cicchetti • Nessun turno rigido (rotazione rapida ~45 min)",
        "isDynamicLunch": true,
        "enabled": true,
        "maxCoversIndoor": 36,
        "maxCoversOutdoor": 35
      },
      "dinner_1": {
        "id": "dinner_1",
        "name": "1° Turno Cena",
        "category": "dinner",
        "timeRange": "19:15 – 21:15",
        "availableSlots": ["19:15", "19:30", "19:45", "20:00"],
        "departureTime": "21:15",
        "description": "Arrivo 19:15–20:00 • Tavolo da liberare categoricamente entro le 21:15/21:20",
        "enabled": true,
        "maxCoversIndoor": 36,
        "maxCoversOutdoor": 35
      },
      "dinner_2": {
        "id": "dinner_2",
        "name": "2° Turno Cena",
        "category": "dinner",
        "timeRange": "21:30 – 23:00",
        "availableSlots": ["21:30", "21:45", "22:00"],
        "description": "Dalle 21:30 in poi fino a chiusura (23:00)",
        "enabled": true,
        "maxCoversIndoor": 36,
        "maxCoversOutdoor": 35
      }
    },
    "lockedShifts": {}
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4. Sicurezza & Politiche RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Permetti lettura e scrittura all'API backend
DROP POLICY IF EXISTS "Allow backend access to bookings" ON bookings;
CREATE POLICY "Allow backend access to bookings" ON bookings
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow backend access to settings" ON settings;
CREATE POLICY "Allow backend access to settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);
