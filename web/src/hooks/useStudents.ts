import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import { useAutoRefetch } from './useAutoRefetch';
import type { EnrolledStudent } from '../types';

type ProfileRow = {
  id: string;
  full_name: string;
  role: 'alumno' | 'profesor';
  course: string | null;
};

function fromRows(rows: ProfileRow[]): EnrolledStudent[] {
  return rows
    .filter((r) => r.role === 'alumno' && r.course)
    .map((r) => ({ id: r.id, fullName: r.full_name, course: r.course as string }));
}

// Alumnos registrados de verdad desde la app — para la vista de historial
// por alumno del panel.
export function useStudents() {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      console.warn('No se pudo leer alumnos registrados:', error.message);
      return;
    }
    if (data) setStudents(fromRows(data as ProfileRow[]));
  }, []);

  useAutoRefetch(load);

  useEffect(() => {
    let yaConectado = false;
    load();

    const channel = supabase
      .channel('web-profiles-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') {
          if (yaConectado) load();
          yaConectado = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return students;
}
