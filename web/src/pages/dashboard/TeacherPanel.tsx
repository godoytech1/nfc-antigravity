import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, CheckCircle2, XCircle, Settings, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance, todayISO } from '../../hooks/useAttendance';
import { useJustifications } from '../../hooks/useJustifications';
import { useStudents } from '../../hooks/useStudents';
import { signOut } from '../../services/auth';
import SettingsModal from '../../components/SettingsModal';
import type { Justification } from '../../types';

// "2026-09-13" -> "sáb, 13 sept." sin corrimiento de zona horaria
function fechaLarga(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-PY', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TeacherPanel() {
  const navigate = useNavigate();
  const { loading, profile, email } = useAuth();
  const { records, clearAll: clearAttendance } = useAttendance();
  const { items: justifications, respond, clearAll: clearJustifications } = useJustifications();
  const students = useStudents();

  const [selectedJustification, setSelectedJustification] = useState<Justification | null>(null);
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Guardia de acceso: sin sesión, o sesión de alumno -> afuera.
  if (!loading && (!profile || profile.role !== 'profesor')) {
    navigate('/dashboard', { replace: true });
    return null;
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Cargando...</div>;
  }

  const hoy = todayISO();
  const todayScans = records.filter((r) => r.fecha === hoy);
  const tardeHoy = todayScans.filter((r) => r.status === 'late').length;
  const pending = justifications.filter((j) => j.status === 'pending');
  const resolved = justifications.filter((j) => j.status !== 'pending');
  const historyRecords = historyStudent ? records.filter((r) => r.studentId === historyStudent.id) : [];

  const handleLogout = async () => {
    await signOut();
    navigate('/dashboard', { replace: true });
  };

  const handleClearData = async () => {
    try {
      await Promise.all([clearAttendance(), clearJustifications()]);
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo limpiar los datos.');
    }
  };

  const handleRespond = async (id: string, status: 'approved' | 'denied') => {
    try {
      await respond(id, status);
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo actualizar el justificativo. Probá de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-paper">
      {/* Masthead */}
      <header className="border-b border-rule px-8 pt-5 pb-4 flex justify-between items-end shrink-0">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">SAN IGNACIO DE LOYOLA</p>
          <h1 className="font-serif text-2xl text-ink mt-0.5">Registro de asistencia</h1>
          <p className="text-sm text-ink-soft mt-1">
            {profile?.fullName} · {email}
          </p>
        </div>
        <div className="flex items-center gap-5 pb-1">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors text-sm font-medium cursor-pointer"
          >
            <Settings size={16} />
            <span>Configuración</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors text-sm font-medium cursor-pointer"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Live Scans */}
        <section className="flex-1 flex flex-col overflow-hidden border-r border-rule">
          <div className="px-8 pt-6 pb-4">
            <h2 className="font-serif text-lg text-ink">Llegadas de hoy</h2>
            <p className="text-sm text-ink-soft mt-1">
              {todayScans.length} {todayScans.length === 1 ? 'llegada' : 'llegadas'}
              {tardeHoy > 0 ? ` · ${tardeHoy} con retraso` : ''} — tocá un alumno para ver su historial
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {todayScans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-ink-soft border-t border-rule">
                <p>Esperando la primera llegada de hoy.</p>
              </div>
            ) : (
              <div className="border-t border-rule">
                {todayScans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => setHistoryStudent(scan.studentId ? { id: scan.studentId, name: scan.studentName } : null)}
                    className="w-full text-left py-3.5 flex items-center justify-between border-b border-rule hover:bg-brass-soft/40 transition-colors cursor-pointer px-1"
                  >
                    <div>
                      <p className="font-semibold text-ink">{scan.studentName}</p>
                      <p className="text-sm text-ink-soft">{scan.course}</p>
                    </div>
                    <div
                      className={
                        'font-mono text-sm font-medium ' + (scan.status === 'late' ? 'text-late' : 'text-ontime')
                      }
                    >
                      {scan.status === 'late' ? 'tarde · ' : ''}
                      {hora(scan.scannedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Middle Panel: Justifications */}
        <section className="w-96 flex flex-col overflow-hidden border-r border-rule shrink-0">
          <div className="px-8 pt-6 pb-4">
            <h2 className="font-serif text-lg text-ink flex items-center gap-2">
              <FileText size={18} className="text-brass" />
              Justificativos
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {pending.length === 0 && resolved.length === 0 ? (
              <div className="text-ink-soft border-t border-rule pt-6">No hay justificativos todavía.</div>
            ) : (
              <div className="flex flex-col gap-5">
                {pending.map((justification) => (
                  <div key={justification.id} className="border-t border-rule pt-4">
                    <h3 className="font-semibold text-ink">
                      {justification.studentName} <span className="text-ink-soft font-normal">({justification.course})</span>
                    </h3>
                    <p className="text-xs text-brass font-semibold mt-0.5">
                      Falta del {fechaLarga(justification.fecha)}
                    </p>
                    <p className="text-sm text-ink-soft mt-1.5 line-clamp-2">{justification.reason}</p>

                    <div className="mt-3 flex gap-4 text-sm font-medium">
                      <button
                        onClick={() => setSelectedJustification(justification)}
                        className="text-ink-soft hover:text-ink transition-colors cursor-pointer"
                      >
                        Ver motivo
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'denied')}
                        className="text-danger hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        Denegar
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'approved')}
                        className="text-ontime hover:opacity-70 transition-opacity cursor-pointer"
                      >
                        Aprobar
                      </button>
                    </div>
                  </div>
                ))}

                {resolved.map((justification) =>
                  justification.status === 'approved' ? (
                    <div key={justification.id} className="border-t border-rule pt-4 flex gap-3 items-start">
                      <CheckCircle2 size={17} className="text-ontime shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-ink text-sm">Inasistencia justificada</h3>
                        <p className="text-sm text-ink-soft mt-0.5">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  ) : (
                    <div key={justification.id} className="border-t border-rule pt-4 flex gap-3 items-start">
                      <XCircle size={17} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-ink text-sm">Justificativo denegado</h3>
                        <p className="text-sm text-ink-soft mt-0.5">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Enrolled students -> per-student history */}
        <section className="w-72 flex flex-col overflow-hidden shrink-0">
          <div className="px-8 pt-6 pb-4">
            <h2 className="font-serif text-lg text-ink flex items-center gap-2">
              <Users size={18} className="text-brass" />
              Alumnos
            </h2>
            <p className="text-sm text-ink-soft mt-1">{students.length} registrados</p>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            {students.length === 0 ? (
              <div className="text-ink-soft border-t border-rule pt-6">Todavía no hay alumnos registrados en la app.</div>
            ) : (
              <div className="border-t border-rule">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setHistoryStudent({ id: s.id, name: s.fullName })}
                    className="w-full text-left py-3 border-b border-rule hover:bg-brass-soft/40 transition-colors cursor-pointer px-1"
                  >
                    <p className="font-semibold text-ink text-sm">{s.fullName}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{s.course}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal: Justification Detail */}
      {selectedJustification && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-6">
          <div className="bg-paper-raised w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border-t-2 border-brass">
            <div className="px-7 pt-6 pb-5 flex justify-between items-start">
              <h3 className="font-serif text-xl text-ink">Detalle del justificativo</h3>
              <button onClick={() => setSelectedJustification(null)} className="text-ink-soft hover:text-ink cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="px-7 overflow-y-auto flex-1 border-t border-rule pt-5">
              <div className="mb-5">
                <label className="text-xs font-semibold text-ink-soft">Alumno</label>
                <p className="text-ink font-semibold mt-0.5">
                  {selectedJustification.studentName} ({selectedJustification.course})
                </p>
              </div>
              <div className="mb-5">
                <label className="text-xs font-semibold text-ink-soft">Día que justifica</label>
                <p className="text-ink font-semibold mt-0.5">{fechaLarga(selectedJustification.fecha)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-soft">Motivo</label>
                <p className="text-ink mt-1.5 leading-relaxed">{selectedJustification.reason}</p>
              </div>
            </div>

            {selectedJustification.status === 'pending' && (
              <div className="px-7 py-5 border-t border-rule flex gap-3 mt-5">
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'denied');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-2.5 font-semibold text-danger border border-danger/30 hover:bg-danger-soft transition-colors cursor-pointer"
                >
                  Denegar
                </button>
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'approved');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-2.5 font-semibold text-paper bg-ontime hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Aprobar falta
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Student History */}
      {historyStudent && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-6">
          <div className="bg-paper-raised w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border-t-2 border-brass">
            <div className="px-7 pt-6 pb-5 flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl text-ink">{historyStudent.name}</h3>
                <p className="text-sm text-ink-soft mt-0.5">Historial de asistencia</p>
              </div>
              <button onClick={() => setHistoryStudent(null)} className="text-ink-soft hover:text-ink cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="px-7 overflow-y-auto flex-1 border-t border-rule">
              {historyRecords.length === 0 ? (
                <p className="text-ink-soft mt-6">Todavía no tiene ninguna llegada registrada.</p>
              ) : (
                <div>
                  {historyRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-rule">
                      <div>
                        <p className="text-sm font-semibold text-ink">{fechaLarga(r.fecha)}</p>
                        <p className="text-xs text-ink-soft mt-0.5">{r.course}</p>
                      </div>
                      <span
                        className={
                          'font-mono text-sm font-medium ' + (r.status === 'late' ? 'text-late' : 'text-ontime')
                        }
                      >
                        {r.status === 'late' ? 'tarde · ' : ''}
                        {hora(r.scannedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="h-6 shrink-0" />
          </div>
        </div>
      )}

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        nombre={profile?.fullName ?? ''}
        email={email}
        onLogout={handleLogout}
        onClearData={handleClearData}
      />
    </div>
  );
}
