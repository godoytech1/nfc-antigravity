import { useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import type { AttendanceRecord, AttendanceStatus } from '../types';

type Row = {
  id: string;
  student_id: string | null;
  student_name: string;
  course: string;
  status: AttendanceStatus;
  fecha: string;
  scanned_at: string;
};

function fromRow(r: Row): AttendanceRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    course: r.course,
    status: r.status,
    fecha: r.fecha,
    scannedAt: r.scanned_at,
  };
}

// Acotamos el historial que se trae: antes se pedían todas las filas de
// siempre, sin límite.
const DIAS_DE_HISTORIAL = 60;

export function todayISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
}

function desdeISO(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString('en-CA');
}

// Misma tabla que usa la app (public.asistencias). El estado puntual/tarde
// lo calcula un trigger en la base, no el cliente.
export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase
      .from('asistencias')
      .select('*')
      .gte('fecha', desdeISO(DIAS_DE_HISTORIAL))
      .order('scanned_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('No se pudo leer asistencias:', error.message);
          return;
        }
        if (mounted && data) setRecords((data as Row[]).map(fromRow));
      });

    const channel = supabase
      .channel('web-asistencias-db')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asistencias' }, (payload) => {
        const record = fromRow(payload.new as Row);
        setRecords((prev) => (prev.some((r) => r.id === record.id) ? prev : [record, ...prev]));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const clearAll = async () => {
    const { error } = await supabase.from('asistencias').delete().not('id', 'is', null);
    if (error) throw error;
    setRecords([]);
  };

  return { records, clearAll };
}
