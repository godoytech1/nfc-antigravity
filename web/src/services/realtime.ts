import { createClient } from '@supabase/supabase-js';

// Proyecto público de Supabase (Auth + Realtime + tablas). La "anon key" es
// pública por diseño (protegida por Row Level Security, no es un secreto) —
// se puede exponer en el cliente. Se puede sobreescribir con un .env local
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) si algún día se migra a otro
// proyecto de Supabase.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://scejwfjmbeerwymwufwe.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZWp3ZmptYmVlcnd5bXd1ZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjM1NTIsImV4cCI6MjEwMzQzOTU1Mn0.yAO7VW4ykJ7kfkjiQPdM8F65rdLuTvyZ4MvCu9CS6XM';

// Ahora el panel usa cuentas reales (las mismas de la app), así que sí
// queremos que la sesión quede guardada (localStorage del navegador, es lo
// que usa Supabase por defecto en web) — así no hay que loguearse de nuevo
// cada vez que se recarga la página.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
