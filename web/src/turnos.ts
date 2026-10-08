import type { Configuracion } from './hooks/useConfig';
import type { Turno } from './types';

export const TURNOS: Turno[] = ['manana', 'tarde'];
export const TURNO_LABEL: Record<Turno, string> = { manana: 'Mañana', tarde: 'Tarde' };

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Mismo criterio que la base (set_asistencia_fields): desde una hora antes de la entrada de la
// tarde ya cuenta como turno tarde (12:00 con la configuración por defecto).
export function turnoDeHora(hora: string, config: Configuracion): Turno {
  return minutos(hora) >= minutos(config.horaEntradaTarde) - 60 ? 'tarde' : 'manana';
}

// Turno en el que estamos ahora mismo (hora del colegio).
export function turnoActual(config: Configuracion): Turno {
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Asuncion',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return turnoDeHora(hora, config);
}
