import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import { useAutoRefetch } from './useAutoRefetch';
import type { AttendanceRecord, AttendanceStatus, Turno } from '../types';

type Row = {
  id: string;
  student_id: string | null;
  student_name: string;
  course: string;
  status: AttendanceStatus;
  turno?: Turno | null;
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
    turno: r.turno === 'tarde' ? 'tarde' : 'manana',
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

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .gte('fecha', desdeISO(DIAS_DE_HISTORIAL))
      .order('scanned_at', { ascending: false });
    if (error) {
      console.warn('No se pudo leer asistencias:', error.message);
      return;
    }
    if (data) setRecords((data as Row[]).map(fromRow));
  }, []);

  useAutoRefetch(cargar);

  useEffect(() => {
    let yaConectado = false;
    cargar();

    const channel = supabase
      .channel('web-asistencias-db')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'asistencias' }, (payload) => {
        const record = fromRow(payload.new as Row);
        setRecords((prev) => (prev.some((r) => r.id === record.id) ? prev : [record, ...prev]));
      })
      // El profesor puede corregir una llegada desde Clases: sin esto, otra
      // sesión abierta se quedaba con el dato viejo.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'asistencias' }, (payload) => {
        const record = fromRow(payload.new as Row);
        setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
      })
      // Si se limpian los datos desde la app, el panel abierto tiene que
      // enterarse en vez de seguir mostrando filas que ya no existen.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'asistencias' }, (payload) => {
        const borrado = (payload.old as { id?: string }).id;
        if (!borrado) return;
        setRecords((prev) => prev.filter((r) => r.id !== borrado));
      })
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') {
          if (yaConectado) cargar();
          yaConectado = true;
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cargar]);

  const clearAll = async () => {
    const { error } = await supabase.from('asistencias').delete().not('id', 'is', null);
    if (error) throw error;
    setRecords([]);
  };

  // Hace llegar a un alumno AHORA MISMO (hora real del servidor, no se
  // puede falsear). Mismo comportamiento que "Simular Escaneo NFC" en la app.
  const scan = async (
    input: { studentId: string; studentName: string; course: string }
  ): Promise<
    | { ok: true; record: AttendanceRecord }
    | { ok: false; reason: 'duplicado'; studentName: string }
    | { ok: false; reason: 'error'; message: string }
  > => {
    const { data, error } = await supabase
      .from('asistencias')
      .insert({ student_id: input.studentId, student_name: input.studentName, course: input.course })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { ok: false, reason: 'duplicado', studentName: input.studentName };
      return { ok: false, reason: 'error', message: error.message };
    }
    const record = fromRow(data as Row);
    setRecords((prev) => [record, ...prev]);
    return { ok: true, record };
  };

  // Corrección manual: ajusta la hora real de una llegada ya registrada. El
  // status (puntual/tarde) lo recalcula la base a partir de esa hora, nunca
  // se manda por separado. No se puede mover a otro día ni a hora futura
  // (la base lo rechaza).
  const setArrivalTime = async (id: string, scannedAtISO: string): Promise<AttendanceRecord> => {
    const { data, error } = await supabase
      .from('asistencias')
      .update({ scanned_at: scannedAtISO })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const record = fromRow(data as Row);
    setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
    return record;
  };

  // Saca el registro entero: si era de hoy, el alumno vuelve a "pendiente";
  // si era de un día pasado, vuelve a figurar como "ausente" ese día.
  const removeArrival = async (id: string): Promise<void> => {
    const { error } = await supabase.from('asistencias').delete().eq('id', id);
    if (error) throw error;
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return { records, clearAll, scan, setArrivalTime, removeArrival };
}
