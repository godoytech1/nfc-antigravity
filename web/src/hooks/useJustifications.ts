import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import { useAutoRefetch } from './useAutoRefetch';
import type { Attachment, Justification } from '../types';

type Row = {
  id: string;
  user_id: string | null;
  student_name: string;
  course: string;
  reason: string;
  fecha: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  attachments: Attachment[] | null;
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
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  };
}

// Misma tabla que usa la app (public.justificativos). Antes el panel
// escuchaba un broadcast que la app ya no manda — quedaba siempre vacío.
export function useJustifications() {
  const [items, setItems] = useState<Justification[]>([]);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('justificativos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('No se pudo leer justificativos:', error.message);
      return;
    }
    if (data) setItems((data as Row[]).map(fromRow));
  }, []);

  useAutoRefetch(cargar);

  useEffect(() => {
    let yaConectado = false;
    cargar();

    const channel = supabase
      .channel('web-justificativos-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativos' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const borrado = (payload.old as { id?: string }).id;
          if (borrado) setItems((prev) => prev.filter((j) => j.id !== borrado));
          return;
        }
        const item = fromRow(payload.new as Row);
        setItems((prev) => {
          const i = prev.findIndex((x) => x.id === item.id);
          if (i === -1) return [item, ...prev];
          const next = prev.slice();
          next[i] = item;
          return next;
        });
      })
      .subscribe((estado) => {
        // Al reconectarse el tiempo real se vuelve a leer: lo ocurrido mientras estuvo caído no se repite.
        if (estado === 'SUBSCRIBED') {
          if (yaConectado) cargar();
          yaConectado = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const respond = async (id: string, status: 'approved' | 'denied') => {
    // Antes esto se reflejaba en pantalla ANTES de confirmar el update: si
    // fallaba (sesión vencida, corte de red), la tarjeta quedaba mostrando
    // "resuelto" mientras en la base seguía 'pending', sin ningún aviso.
    const { error } = await supabase.from('justificativos').update({ status }).eq('id', id);
    if (error) {
      console.warn('No se pudo actualizar el justificativo:', error.message);
      throw error;
    }
    setItems((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
  };

  const clearAll = async () => {
    const archivos = items.flatMap((j) => j.attachments.map((a) => a.path));
    const { error } = await supabase.from('justificativos').delete().not('id', 'is', null);
    if (error) throw error;
    // Los adjuntos viven en el storage: se borran aparte (si falla, solo quedan archivos huérfanos).
    if (archivos.length > 0) await supabase.storage.from('justificativos').remove(archivos);
    setItems([]);
  };

  return { items, respond, clearAll };
}
