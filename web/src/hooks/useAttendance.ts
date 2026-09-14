import { useEffect, useState } from 'react';
import { supabase } from '../services/realtime';
import type { AttendanceRecord } from '../types';

type Row = {
  id: string;
  student_id: string | null;
  student_name: string;
  course: string;
  subject: string | null;
  status: 'ontime' | 'absent';
  scanned_at: string;
};

function fromRow(r: Row): AttendanceRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    course: r.course,
    subject: r.subject,
    status: r.status,
    scannedAt: r.scanned_at,
  };
}

// Misma tabla que usa la app (public.asistencias): acá se ve en vivo lo que
// va escaneando el profesor desde el celular, y sobrevive a un F5.
export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    let mounted = true;

    supabase
      .from('asistencias')
      .select('*')
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
