import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, CheckCircle2, XCircle, Settings, BookOpen, Smartphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAttendance, todayISO } from '../../hooks/useAttendance';
import { useJustifications } from '../../hooks/useJustifications';
import { useStudents } from '../../hooks/useStudents';
import { useConfig } from '../../hooks/useConfig';
import { signOut } from '../../services/auth';
import SettingsModal from '../../components/SettingsModal';
import ClassesPanel from '../../components/ClassesPanel';
import { avatarColorFor, initialsFor } from '../../theme';
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

export default function TeacherPanel() {
  const navigate = useNavigate();
  const { loading, profile, email } = useAuth();
  const { records, clearAll: clearAttendance, scan, setArrivalTime, removeArrival } = useAttendance();
  const { items: justifications, respond, clearAll: clearJustifications } = useJustifications();
  const students = useStudents();
  const { config } = useConfig();

  const [selectedJustification, setSelectedJustification] = useState<Justification | null>(null);
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Guardia de acceso: sin sesión, o sesión de alumno -> afuera.
  if (!loading && (!profile || profile.role !== 'profesor')) {
    navigate('/dashboard', { replace: true });
    return null;
  }
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Cargando...</div>;
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
    <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-bg">
      {/* Header */}
      <header className="bg-card border-b border-border px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <p className="text-[11px] font-bold text-label uppercase tracking-wide">Panel de profesores</p>
          <h1 className="text-xl font-bold text-title mt-0.5">San Ignacio de Loyola</h1>
          <p className="text-sm text-muted mt-0.5">
            {profile?.fullName} · {email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-body hover:bg-primary-light hover:text-primary transition-colors px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <Settings size={16} />
            <span>Configuración</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-body hover:bg-primary-light hover:text-primary transition-colors px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Panel: Live Scans */}
        <section className="flex-1 bg-card rounded-2xl border border-border flex flex-col overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <Smartphone size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-title">Llegadas de hoy</h2>
              <p className="text-xs text-muted mt-0.5">
                {todayScans.length} {todayScans.length === 1 ? 'llegada' : 'llegadas'}
                {tardeHoy > 0 ? ` · ${tardeHoy} con retraso` : ''}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {todayScans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted text-sm">
                <p>Esperando la primera llegada de hoy.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {todayScans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => setHistoryStudent(scan.studentId ? { id: scan.studentId, name: scan.studentName } : null)}
                    className="text-left bg-card border border-border p-3 rounded-2xl flex items-center gap-3 hover:border-primary-light hover:bg-primary-light/40 transition-colors cursor-pointer"
                  >
                    <Avatar nombre={scan.studentName} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-title truncate">{scan.studentName}</p>
                      <p className="text-sm text-muted">{scan.course}</p>
                    </div>
                    <span
                      className={
                        'px-3 py-1 rounded-full text-xs font-bold shrink-0 ' +
                        (scan.status === 'late' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')
                      }
                    >
                      {scan.status === 'late' ? 'Tarde · ' : ''}
                      {hora(scan.scannedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Middle Panel: Justifications */}
        <section className="w-96 bg-card rounded-2xl border border-border flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-title">Justificativos</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {pending.length === 0 && resolved.length === 0 ? (
              <div className="text-muted text-sm text-center mt-6">No hay justificativos todavía.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((justification) => (
                  <div key={justification.id} className="border border-border rounded-2xl p-4">
                    <h3 className="font-semibold text-title">
                      {justification.studentName} <span className="text-muted font-normal">({justification.course})</span>
                    </h3>
                    <p className="text-xs text-label font-bold mt-0.5">
                      Falta del {fechaLarga(justification.fecha)}
                    </p>
                    <p className="text-sm text-body mt-1.5 line-clamp-2">{justification.reason}</p>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setSelectedJustification(justification)}
                        className="flex-1 bg-bg hover:bg-border text-body py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Ver motivo
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'denied')}
                        className="flex-1 bg-danger-bg hover:opacity-80 text-danger py-2 rounded-xl text-sm font-semibold transition-opacity cursor-pointer"
                      >
                        Denegar
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'approved')}
                        className="flex-1 bg-primary hover:bg-primary-dark text-white py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Aprobar
                      </button>
                    </div>
                  </div>
                ))}

                {resolved.map((justification) =>
                  justification.status === 'approved' ? (
                    <div key={justification.id} className="bg-success-bg rounded-2xl p-4 flex gap-3 items-start">
                      <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-title text-sm">Inasistencia justificada</h3>
                        <p className="text-sm text-body mt-0.5">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  ) : (
                    <div key={justification.id} className="bg-danger-bg rounded-2xl p-4 flex gap-3 items-start">
                      <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-title text-sm">Justificativo denegado</h3>
                        <p className="text-sm text-body mt-0.5">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Classes -> per-course roster, same as the app */}
        <section className="w-80 bg-card rounded-2xl border border-border flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-title">Clases</h2>
              <p className="text-xs text-muted mt-0.5">{students.length} alumnos registrados</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ClassesPanel
              students={students}
              records={records}
              config={config}
              onScan={scan}
              onSetArrivalTime={setArrivalTime}
              onRemoveArrival={removeArrival}
            />
          </div>
        </section>
      </main>

      {/* Modal: Justification Detail */}
      {selectedJustification && (
        <div className="fixed inset-0 bg-title/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-title">Detalle del justificativo</h3>
              <button onClick={() => setSelectedJustification(null)} className="text-muted hover:text-title cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-5 flex items-center gap-3">
                <Avatar nombre={selectedJustification.studentName} />
                <div>
                  <p className="text-xs font-bold text-label uppercase tracking-wide">Alumno</p>
                  <p className="text-title font-semibold">
                    {selectedJustification.studentName} ({selectedJustification.course})
                  </p>
                </div>
              </div>
              <div className="mb-5">
                <label className="text-xs font-bold text-label uppercase tracking-wide">Día que justifica</label>
                <p className="text-title font-semibold mt-1">{fechaLarga(selectedJustification.fecha)}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-label uppercase tracking-wide">Motivo</label>
                <p className="text-body p-4 bg-bg rounded-xl mt-1.5 leading-relaxed">{selectedJustification.reason}</p>
              </div>
            </div>

            {selectedJustification.status === 'pending' && (
              <div className="p-6 border-t border-border flex gap-3 bg-bg/60">
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'denied');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-danger bg-danger-bg hover:opacity-80 transition-opacity cursor-pointer"
                >
                  Denegar
                </button>
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'approved');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-title/50 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-3xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Avatar nombre={historyStudent.name} />
                <div>
                  <h3 className="text-lg font-bold text-title">{historyStudent.name}</h3>
                  <p className="text-sm text-muted">Historial de asistencia</p>
                </div>
              </div>
              <button onClick={() => setHistoryStudent(null)} className="text-muted hover:text-title cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyRecords.length === 0 ? (
                <p className="text-center text-muted mt-6">Todavía no tiene ninguna llegada registrada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historyRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-bg">
                      <div>
                        <p className="text-sm font-semibold text-title">{fechaLarga(r.fecha)}</p>
                        <p className="text-xs text-muted">{r.course}</p>
                      </div>
                      <span
                        className={
                          'px-3 py-1 rounded-full text-xs font-bold ' +
                          (r.status === 'late' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success')
                        }
                      >
                        {r.status === 'late' ? 'Tarde · ' : ''}
                        {hora(r.scannedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
