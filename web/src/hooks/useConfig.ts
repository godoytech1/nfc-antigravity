import { useCallback, useEffect, useId, useState } from 'react';
import { supabase } from '../services/realtime';

export type Configuracion = {
  horaEntrada: string; // "07:00"
  toleranciaMinutos: number;
};

type Row = {
  id: number;
  hora_entrada: string;
  tolerancia_minutos: number;
};

const POR_DEFECTO: Configuracion = { horaEntrada: '07:00', toleranciaMinutos: 15 };

function hhmm(hora: string) {
  return hora.slice(0, 5); // "07:00:00" -> "07:00"
}

// Hora a partir de la cual una llegada cuenta como tarde.
export function limiteDeTardanza(config: Configuracion) {
  const [h, m] = config.horaEntrada.split(':').map(Number);
  const total = h * 60 + m + config.toleranciaMinutos;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Horario de entrada del colegio: la misma fila que lee el trigger que
// decide puntual/tarde, así el panel y la app muestran siempre lo mismo.
export function useConfig() {
  const [config, setConfig] = useState<Configuracion>(POR_DEFECTO);
  // TeacherPanel y SettingsModal llaman a este hook al mismo tiempo; cada
  // instancia necesita su PROPIO canal, porque Supabase no deja agregar un
  // listener a un canal que otra instancia ya suscribió con el mismo nombre.
  const uid = useId();

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single();
    if (error || !data) return;
    const row = data as Row;
    setConfig({ horaEntrada: hhmm(row.hora_entrada), toleranciaMinutos: row.tolerancia_minutos });
  }, []);

  useEffect(() => {
    reload();

    // Sin esto, un panel ya abierto se quedaba con el horario/tolerancia
    // viejos si otra sesión los cambiaba — y al guardar podía pisar ese
    // cambio ajeno sin darse cuenta.
    const channel = supabase
      .channel(`web-configuracion-db-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, () => {
        reload();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload, uid]);

  const update = useCallback(async (next: Configuracion) => {
    const { error } = await supabase
      .from('configuracion')
      .update({ hora_entrada: next.horaEntrada, tolerancia_minutos: next.toleranciaMinutos })
      .eq('id', 1);
    if (error) throw error;
    setConfig(next);
  }, []);

  return { config, update };
}
