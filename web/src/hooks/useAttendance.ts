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

// Zona horaria fija del colegio (misma que usa el trigger set_asistencia_fields
// en la base). Antes se usaba la hora local de la computadora del profesor:
// si no tenía bien configurada la zona horaria, "hoy" podía no coincidir con
// la fecha real que la base ya calculó para una llegada.
const ZONA_HORARIA = 'America/Asuncion';

export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());
}

function desdeISO(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(d);
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
      // Si se limpian los datos desde la app, el panel abierto tiene que
      // enterarse en vez de seguir mostrando filas que ya no existen.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'asistencias' }, (payload) => {
        const borrado = (payload.old as { id?: string }).id;
        if (!borrado) return;
        setRecords((prev) => prev.filter((r) => r.id !== borrado));
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
