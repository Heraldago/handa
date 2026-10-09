const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://owpylouhydojtnlylfzx.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_tqHkOWGZscE6eNmTfadUUw_NrcHQPwM';

const supabase = createClient(url, key);

async function check() {
  console.log('--- TEST CONNESSIONE SUPABASE HANDĀ ---');
  console.log('Project URL:', url);

  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.log('❌ Tabella settings non ancora creata:', settingsError.message);
    } else {
      console.log('✅ Tabella settings trovata e funzionante! Record trovati:', settingsData?.length);
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);

    if (bookingsError) {
      console.log('❌ Tabella bookings non ancora creata:', bookingsError.message);
    } else {
      console.log('✅ Tabella bookings trovata e funzionante! Record trovati:', bookingsData?.length);
    }

    if (!settingsError && !bookingsError) {
      console.log('🎉 TUTTO PRONTO AL 100%! Supabase è operativo per HANDĀ.');
    }
  } catch (err) {
    console.error('Errore:', err);
  }
}

check();
