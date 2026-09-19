import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Clock as ClockIcon, Minus } from 'lucide-react';
import { COURSES } from '../roster';
import { avatarColorFor, initialsFor } from '../theme';
import { todayISO } from '../hooks/useAttendance';
import type { Configuracion } from '../hooks/useConfig';
import type { AttendanceRecord, EnrolledStudent } from '../types';

type ScanResult =
  | { ok: true; record: AttendanceRecord }
  | { ok: false; reason: 'duplicado'; studentName: string }
  | { ok: false; reason: 'error'; message: string };

type Props = {
  students: EnrolledStudent[];
  records: AttendanceRecord[];
  config: Configuracion;
  onScan: (input: { studentId: string; studentName: string; course: string }) => Promise<ScanResult>;
  onSetArrivalTime: (id: string, scannedAtISO: string) => Promise<AttendanceRecord>;
};

const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

function etiquetaDia(fecha: string, hoy: string) {
  if (fecha === hoy) return 'Hoy';
  const [y, m, d] = fecha.split('-').map(Number);
  return `${DIAS_CORTOS[new Date(y, m - 1, d).getDay()]} ${d}`;
}

function fechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: 'short' });
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ nombre, size = 40 }: { nombre: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, backgroundColor: avatarColorFor(nombre), fontSize: size * 0.34 }}
    >
      {initialsFor(nombre)}
    </div>
  );
}

function ProgressRing({ percent, size = 44 }: { percent: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="shrink-0">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEF0F4" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#4F46E5"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </g>
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.26} fontWeight="bold" fill="#0F172A">
        {percent}%
      </text>
    </svg>
  );
}

// Panel "Clases" del profesor: cursos con % de hoy, y al entrar a uno, el
// mismo roster que la app -- tocar un alumno pendiente lo hace llegar,
// tocar uno que ya llegó abre su ficha para corregir la hora.
export default function ClassesPanel({ students, records, config, onScan, onSetArrivalTime }: Props) {
  const [cursoActivo, setCursoActivo] = useState<string | null>(null);
  const hoy = todayISO();

  return (
    <>
      <div className="flex flex-col gap-2">
        {COURSES.map((course) => {
          const roster = students.filter((s) => s.course === course);
          const delHoy = records.filter((r) => r.fecha === hoy && r.course === course);
          const presentes = roster.filter((s) => delHoy.some((r) => r.studentId === s.id)).length;
          const percent = roster.length === 0 ? 0 : Math.round((presentes / roster.length) * 100);

          return (
            <button
              key={course}
              onClick={() => setCursoActivo(course)}
              className="w-full text-left bg-card border border-border rounded-2xl p-3.5 flex items-center gap-3.5 hover:border-primary-light hover:bg-primary-light/30 transition-colors cursor-pointer"
            >
              <ProgressRing percent={percent} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-title">{course}</p>
                <p className="text-sm text-muted">
                  Asistencia de hoy · {presentes}/{roster.length}
                </p>
              </div>
              <ChevronRight size={18} className="text-muted shrink-0" />
            </button>
          );
        })}
      </div>

      {cursoActivo && (
        <CourseRosterModal
          course={cursoActivo}
          students={students.filter((s) => s.course === cursoActivo)}
          records={records.filter((r) => r.course === cursoActivo)}
          config={config}
          onScan={onScan}
          onSetArrivalTime={onSetArrivalTime}
          onClose={() => setCursoActivo(null)}
        />
      )}
    </>
  );
}

function CourseRosterModal({
  course,
  students,
  records,
  config,
  onScan,
  onSetArrivalTime,
  onClose,
}: {
  course: string;
  students: EnrolledStudent[];
  records: AttendanceRecord[];
  config: Configuracion;
  onScan: Props['onScan'];
  onSetArrivalTime: Props['onSetArrivalTime'];
  onClose: () => void;
}) {
  const hoy = todayISO();
  const dias = useMemo(() => {
    const conClase = Array.from(new Set(records.map((r) => r.fecha))).sort().reverse();
    return conClase.includes(hoy) ? conClase.slice(0, 10) : [hoy, ...conClase].slice(0, 10);
  }, [records, hoy]);

  const [diaActivo, setDiaActivo] = useState(hoy);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<{ student: EnrolledStudent; registro: AttendanceRecord } | null>(null);
  const esHoy = diaActivo === hoy;

  const delDia = records.filter((r) => r.fecha === diaActivo);
  const presentes = students.filter((s) => delDia.some((r) => r.studentId === s.id)).length;
  const tarde = delDia.filter((r) => r.status === 'late').length;

  const marcarLlegadaAhora = async (student: EnrolledStudent) => {
    if (procesando) return;
    setProcesando(student.id);
    try {
      const resultado = await onScan({ studentId: student.id, studentName: student.fullName, course });
      if (!resultado.ok && resultado.reason === 'error') alert(resultado.message);
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo registrar.');
    } finally {
      setProcesando(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-title/50 z-50 flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <button onClick={onClose} className="text-muted hover:text-title cursor-pointer -ml-1">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-title">{course}</h3>
            <p className="text-sm text-muted">
              {presentes}/{students.length} presentes{tarde > 0 ? ` · ${tarde} tarde` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-title cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-border overflow-x-auto">
          {dias.map((dia) => (
            <button
              key={dia}
              onClick={() => setDiaActivo(dia)}
              className={
                'px-3.5 py-1.5 rounded-full text-sm font-semibold shrink-0 cursor-pointer transition-colors ' +
                (diaActivo === dia ? 'bg-primary text-white' : 'bg-bg text-muted hover:bg-border')
              }
            >
              {etiquetaDia(dia, hoy)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {students.length === 0 ? (
            <p className="text-center text-muted mt-6">Todavía no hay alumnos registrados en este curso.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {students.map((student) => {
                const registro = delDia.find((r) => r.studentId === student.id);
                const pendiente = !registro && esHoy;
                const tocable = (esHoy && !registro) || !!registro;
                const cargando = procesando === student.id;

                const badge = pendiente
                  ? { texto: 'Pendiente', className: 'bg-border text-muted', icon: <Minus size={13} /> }
                  : !registro
                  ? { texto: 'Ausente', className: 'bg-danger-bg text-danger', icon: null }
                  : registro.status === 'late'
                  ? {
                      texto: `Tarde · ${hora(registro.scannedAt)}`,
                      className: 'bg-warning-bg text-warning',
                      icon: <ClockIcon size={13} />,
                    }
                  : {
                      texto: `Puntual · ${hora(registro.scannedAt)}`,
                      className: 'bg-success-bg text-success',
                      icon: <Check size={13} />,
                    };

                const contenido = (
                  <>
                    <Avatar nombre={student.fullName} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-title truncate">{student.fullName}</p>
                    </div>
                    {cargando ? (
                      <span className="text-xs text-muted">Marcando…</span>
                    ) : (
                      <span
                        className={
                          'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shrink-0 ' + badge.className
                        }
                      >
                        {badge.icon}
                        {badge.texto}
                      </span>
                    )}
                  </>
                );

                if (!tocable) {
                  return (
                    <div key={student.id} className="flex items-center gap-3 p-2.5 rounded-xl">
                      {contenido}
                    </div>
                  );
                }

                return (
                  <button
                    key={student.id}
                    disabled={cargando}
                    onClick={() =>
                      registro ? setDetalle({ student, registro }) : marcarLlegadaAhora(student)
                    }
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary-light/40 transition-colors cursor-pointer text-left"
                  >
                    {contenido}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detalle && (
        <ArrivalDetailModal
          student={detalle.student}
          registro={detalle.registro}
          config={config}
          onSetArrivalTime={onSetArrivalTime}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

function prediceEstado(horaHHMM: string, config: Configuracion): 'ontime' | 'late' {
  const [h, m] = horaHHMM.split(':').map(Number);
  const [ch, cm] = config.horaEntrada.split(':').map(Number);
  const limite = ch * 60 + cm + config.toleranciaMinutos;
  return h * 60 + m <= limite ? 'ontime' : 'late';
}

function horaHHMM(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Asuncion',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

// Paraguay no tiene horario de verano desde 2024: el desfase contra UTC es
// siempre -03:00.
const OFFSET_PY = '-03:00';

function ArrivalDetailModal({
  student,
  registro,
  config,
  onSetArrivalTime,
  onClose,
}: {
  student: EnrolledStudent;
  registro: AttendanceRecord;
  config: Configuracion;
  onSetArrivalTime: Props['onSetArrivalTime'];
  onClose: () => void;
}) {
  const horaOriginal = horaHHMM(registro.scannedAt);
  const [horaElegida, setHoraElegida] = useState(horaOriginal);
  const [guardando, setGuardando] = useState(false);

  const estadoPredicho = prediceEstado(horaElegida, config);
  const cambioAlgo = horaElegida !== horaOriginal;

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const iso = `${registro.fecha}T${horaElegida}:00${OFFSET_PY}`;
      await onSetArrivalTime(registro.id, iso);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-title/60 z-[60] flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl w-full max-w-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Avatar nombre={student.fullName} />
          <div className="flex-1">
            <h3 className="font-bold text-title">{student.fullName}</h3>
            <p className="text-sm text-muted">{fechaLarga(registro.fecha)}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-title cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <label className="text-xs font-bold text-label uppercase tracking-wide mb-2 block">Hora de llegada</label>
          <input
            type="time"
            value={horaElegida}
            onChange={(e) => setHoraElegida(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-bg text-title text-lg font-semibold"
          />

          <div
            className={
              'flex items-center gap-2 mt-4 p-3 rounded-xl text-sm font-semibold ' +
              (estadoPredicho === 'late' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')
            }
          >
            {estadoPredicho === 'late' ? <ClockIcon size={16} /> : <Check size={16} />}
            Con esa hora queda: {estadoPredicho === 'late' ? 'Llegó tarde' : 'Puntual'}
          </div>

          <button
            onClick={handleGuardar}
            disabled={!cambioAlgo || guardando}
            className="w-full mt-5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors cursor-pointer"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
