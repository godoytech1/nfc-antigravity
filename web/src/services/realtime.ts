import { createClient } from '@supabase/supabase-js';

// Proyecto público de Supabase (Realtime). La "anon key" es pública por diseño
// (protegida por Row Level Security, no es un secreto) — se puede exponer en el cliente.
// Se puede sobreescribir con un .env local (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// si algún día se migra a otro proyecto de Supabase.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://scejwfjmbeerwymwufwe.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZWp3ZmptYmVlcnd5bXd1ZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjM1NTIsImV4cCI6MjEwMzQzOTU1Mn0.yAO7VW4ykJ7kfkjiQPdM8F65rdLuTvyZ4MvCu9CS6XM';

// No usamos Supabase Auth (solo Realtime), desactivamos la sesión persistida.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export const CHANNEL_NAME = 'attendance';

// broadcast.self:true por si algún día se abre el panel y se escanea desde el mismo
// dispositivo — sin esto, Supabase no reenvía tu propio mensaje a vos mismo.
export const REALTIME_CHANNEL_CONFIG = { config: { broadcast: { self: true as const } } };
