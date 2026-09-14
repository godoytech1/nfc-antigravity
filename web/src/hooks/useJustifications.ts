import { useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import type { Justification } from '../types';

type Row = {
  id: string;
  user_id: string | null;
  student_name: string;
  course: string;
  reason: string;
  fecha: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
};

function fromRow(r: Row): Justification {
  return {
    id: r.id,
    userId: r.user_id,
    studentName: r.student_name,
    course: r.course,
    reason: r.reason,
    fecha: r.fecha,
    status: r.status,
    createdAt: r.created_at,
  };
}

// Misma tabla que usa la app (public.justificativos). Antes el panel
// escuchaba un broadcast que la app ya no manda — quedaba siempre vacío.
export function useJustifications() {
  const [items, setItems] = useState<Justification[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase
      .from('justificativos')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('No se pudo leer justificativos:', error.message);
          return;
        }
        if (mounted && data) setItems((data as Row[]).map(fromRow));
      });

    const channel = supabase
      .channel('web-justificativos-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativos' }, (payload) => {
        if (payload.eventType === 'DELETE') return;
        const item = fromRow(payload.new as Row);
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === item.id);
          if (i === -1) return [item, ...prev];
          const next = prev.slice();
          next[i] = item;
          return next;
        });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const respond = async (id: string, status: 'approved' | 'denied') => {
    setItems((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j))); // reflejo optimista
    const { error } = await supabase.from('justificativos').update({ status }).eq('id', id);
    if (error) console.warn('No se pudo actualizar el justificativo:', error.message);
  };

  const clearAll = async () => {
    const { error } = await supabase.from('justificativos').delete().not('id', 'is', null);
    if (error) throw error;
    setItems([]);
  };

  return { items, respond, clearAll };
}
