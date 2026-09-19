import { useEffect, useState } from 'react';
import { X, Lock, Clock, Trash2, LogOut } from 'lucide-react';
import { changePassword } from '../services/auth';
import { useConfig, limiteDeTardanza } from '../hooks/useConfig';

type Props = {
  open: boolean;
  onClose: () => void;
  nombre: string;
  email: string;
  onLogout: () => void;
  onClearData: () => Promise<void>;
};

export default function SettingsModal({ open, onClose, nombre, email, onLogout, onClearData }: Props) {
  const { config, update } = useConfig();

  const [hora, setHora] = useState(config.horaEntrada);
  const [tolerancia, setTolerancia] = useState(String(config.toleranciaMinutos));
  const [horarioMsg, setHorarioMsg] = useState<string | null>(null);
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [guardandoPass, setGuardandoPass] = useState(false);

  const [limpiando, setLimpiando] = useState(false);

  // Al abrir: limpiar mensajes y campos de contraseña.
  useEffect(() => {
    if (!open) return;
    setHorarioMsg(null);
    setPassMsg(null);
    setActual('');
    setNueva('');
    setConfirmar('');
  }, [open]);

  // Sincronizar los campos con la configuración guardada. Va aparte del
  // efecto de arriba a propósito: si limpiara los mensajes acá, el
  // "Horario guardado" desaparecería en el mismo instante en que se guarda.
  useEffect(() => {
    setHora(config.horaEntrada);
    setTolerancia(String(config.toleranciaMinutos));
  }, [config]);

  if (!open) return null;

  const guardarHorario = async () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
      setHorarioMsg('La hora tiene que estar en formato HH:MM (por ejemplo 07:00).');
      return;
    }
    const minutos = Number(tolerancia);
    if (!Number.isInteger(minutos) || minutos < 0 || minutos > 120) {
      setHorarioMsg('La tolerancia tiene que ser un número de 0 a 120 minutos.');
      return;
    }
    setGuardandoHorario(true);
    setHorarioMsg(null);
    try {
      await update({ horaEntrada: hora, toleranciaMinutos: minutos });
      setHorarioMsg('Horario guardado.');
    } catch (e: any) {
      setHorarioMsg(e?.message ?? 'No se pudo guardar el horario.');
    } finally {
      setGuardandoHorario(false);
    }
  };

  const guardarPassword = async () => {
    if (!actual || !nueva) {
      setPassMsg('Completá la contraseña actual y la nueva.');
      return;
    }
    if (nueva.length < 6) {
      setPassMsg('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }
    if (nueva !== confirmar) {
      setPassMsg('La confirmación no coincide.');
      return;
    }
    setGuardandoPass(true);
    setPassMsg(null);
    try {
      await changePassword(email, actual, nueva);
      setPassMsg('Contraseña actualizada. La próxima vez usá la nueva.');
      setActual('');
      setNueva('');
      setConfirmar('');
    } catch (e: any) {
      setPassMsg(e?.message ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardandoPass(false);
    }
  };

  const limpiar = async () => {
    if (!confirm('Esto borra TODAS las asistencias y justificativos guardados (de todos los alumnos). Las cuentas no se tocan. ¿Confirmás?')) {
      return;
    }
    setLimpiando(true);
    try {
      await onClearData();
      onClose();
    } finally {
      setLimpiando(false);
    }
  };

  const input =
    'w-full px-0 py-2 border-b border-rule focus:outline-none focus:border-brass bg-transparent text-ink transition-colors';
  const label = 'text-xs font-semibold text-ink-soft mb-1.5 block';

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-6">
      <div className="bg-paper-raised w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-t-2 border-brass">
        <div className="px-7 pt-6 pb-5 flex justify-between items-start shrink-0">
          <div>
            <h3 className="font-serif text-xl text-ink">Configuración</h3>
            <p className="text-sm text-ink-soft mt-0.5">
              {nombre} · {email}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto px-7 pb-7 flex flex-col gap-7 border-t border-rule pt-6">
          {/* Horario */}
          <section>
            <h4 className="flex items-center gap-2 font-serif text-base text-ink mb-1">
              <Clock size={16} className="text-brass" />
              Horario de entrada
            </h4>
            <p className="text-sm text-ink-soft mb-4">
              Las llegadas después de las <strong className="text-ink">{limiteDeTardanza(config)}</strong> quedan
              marcadas como tarde.
            </p>
            <div className="flex gap-6">
              <div className="flex-1">
                <label className={label}>Hora de entrada</label>
                <input className={input} value={hora} onChange={(e) => setHora(e.target.value)} placeholder="07:00" />
              </div>
              <div className="flex-1">
                <label className={label}>Tolerancia (min)</label>
                <input
                  className={input}
                  value={tolerancia}
                  onChange={(e) => setTolerancia(e.target.value)}
                  placeholder="15"
                />
              </div>
            </div>
            {horarioMsg && <p className="text-sm text-ink-soft mt-3">{horarioMsg}</p>}
            <button
              onClick={guardarHorario}
              disabled={guardandoHorario}
              className="mt-4 bg-ink hover:bg-[#0E1728] disabled:opacity-50 text-paper font-semibold px-5 py-2.5 text-sm cursor-pointer transition-colors"
            >
              {guardandoHorario ? 'Guardando…' : 'Guardar horario'}
            </button>
          </section>

          {/* Seguridad */}
          <section className="border-t border-rule pt-6">
            <h4 className="flex items-center gap-2 font-serif text-base text-ink mb-4">
              <Lock size={16} className="text-brass" />
              Cambiar contraseña
            </h4>
            <div className="flex flex-col gap-4">
              <div>
                <label className={label}>Contraseña actual</label>
                <input type="password" className={input} value={actual} onChange={(e) => setActual(e.target.value)} />
              </div>
              <div>
                <label className={label}>Contraseña nueva</label>
                <input type="password" className={input} value={nueva} onChange={(e) => setNueva(e.target.value)} />
              </div>
              <div>
                <label className={label}>Confirmar contraseña nueva</label>
                <input
                  type="password"
                  className={input}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
            </div>
            {passMsg && <p className="text-sm text-ink-soft mt-3">{passMsg}</p>}
            <button
              onClick={guardarPassword}
              disabled={guardandoPass}
              className="mt-4 bg-ink hover:bg-[#0E1728] disabled:opacity-50 text-paper font-semibold px-5 py-2.5 text-sm cursor-pointer transition-colors"
            >
              {guardandoPass ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </section>

          {/* Simulación */}
          <section className="border-t border-rule pt-6">
            <h4 className="flex items-center gap-2 font-serif text-base text-ink mb-1">
              <Trash2 size={16} className="text-danger" />
              Limpiar datos de prueba
            </h4>
            <p className="text-sm text-ink-soft mb-4">
              Borra todas las asistencias y justificativos. Las cuentas de los alumnos no se tocan.
            </p>
            <button
              onClick={limpiar}
              disabled={limpiando}
              className="border border-danger/30 hover:bg-danger-soft disabled:opacity-50 text-danger font-semibold px-5 py-2.5 text-sm cursor-pointer transition-colors"
            >
              {limpiando ? 'Borrando…' : 'Borrar todo'}
            </button>
          </section>

          {/* Sesión */}
          <section className="border-t border-rule pt-6">
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-ink-soft hover:text-ink font-semibold text-sm cursor-pointer transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
