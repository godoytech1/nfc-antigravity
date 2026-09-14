import { supabase } from './realtime';

export type Role = 'alumno' | 'profesor';

export type Profile = {
  id: string;
  fullName: string;
  role: Role;
  course: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: Role;
  course: string | null;
};

function fromRow(r: ProfileRow): Profile {
  return { id: r.id, fullName: r.full_name, role: r.role, course: r.course };
}

// El panel web es solo para profesores. No hay registro acá a propósito: las
// cuentas se crean desde la app (que solo deja crear Alumno) y se promueven
// a mano desde Supabase — ver supabase/profiles.sql.
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const check = await supabase.auth.signInWithPassword({ email: email.trim(), password: currentPassword });
  if (check.error) throw new Error('La contraseña actual no es correcta.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error || !data) return null;
  return fromRow(data as ProfileRow);
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('network')) return 'No hay conexión a internet.';
  return message;
}
