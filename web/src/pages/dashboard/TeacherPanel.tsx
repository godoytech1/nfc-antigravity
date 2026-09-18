import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Zap, FileText, CheckCircle2, XCircle, Settings, Users, Clock } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-[#0F294A] text-white p-4 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold">Panel de Profesores (BTI, BTC, Sociales)</h1>
          <p className="text-sm text-blue-200">
            {profile?.fullName} · {email} · Sincronizado en vivo con la app
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg cursor-pointer"
          >
            <Settings size={18} />
            <span>Configuración</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg cursor-pointer"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6 bg-gray-100">
        {/* Left Panel: Live Scans */}
        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Llegadas Registradas Hoy <Zap size={20} className="text-yellow-500 fill-yellow-500" />
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {todayScans.length} {todayScans.length === 1 ? 'llegada' : 'llegadas'}
              {tardeHoy > 0 ? ` · ${tardeHoy} con retraso` : ''} · tocá un alumno para ver su historial.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {todayScans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Zap size={32} className="text-gray-300" />
                </div>
                <p>Esperando el primer escaneo de hoy...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {todayScans.map((scan) => (
                  <button
                    key={scan.id}
                    onClick={() => setHistoryStudent(scan.studentId ? { id: scan.studentId, name: scan.studentName } : null)}
                    className="text-left bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">
                        {scan.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{scan.studentName}</p>
                        <p className="text-sm text-gray-500">{scan.course}</p>
                      </div>
                    </div>
                    <div
                      className={
                        scan.status === 'late'
                          ? 'bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold border border-amber-200'
                          : 'bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-200'
                      }
                    >
                      {scan.status === 'late' ? 'Tarde · ' : ''}
                      {hora(scan.scannedAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Middle Panel: Justifications */}
        <section className="w-96 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-500" />
              Justificativos
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {pending.length === 0 && resolved.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">No hay justificativos todavía.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {pending.map((justification) => (
                  <div key={justification.id} className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900">
                      {justification.studentName} ({justification.course})
                    </h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">
                      Falta del {fechaLarga(justification.fecha)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{justification.reason}</p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setSelectedJustification(justification)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Ver motivo
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'denied')}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Denegar
                      </button>
                      <button
                        onClick={() => handleRespond(justification.id, 'approved')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Aprobar
                      </button>
                    </div>
                  </div>
                ))}

                {resolved.map((justification) =>
                  justification.status === 'approved' ? (
                    <div key={justification.id} className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                      <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-green-800">Inasistencia Justificada</h3>
                        <p className="text-sm text-green-700 mt-1">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  ) : (
                    <div key={justification.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
                      <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-red-800">Justificativo Denegado</h3>
                        <p className="text-sm text-red-700 mt-1">{justification.studentName} ({justification.course})</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Enrolled students -> per-student history */}
        <section className="w-72 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              Alumnos
            </h2>
            <p className="text-sm text-gray-400 mt-1">{students.length} registrados</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {students.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 px-2">Todavía no hay alumnos registrados en la app.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setHistoryStudent({ id: s.id, name: s.fullName })}
                    className="text-left p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.fullName}</p>
                      <p className="text-xs text-gray-400">{s.course}</p>
                    </div>
                    <Clock size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal: Justification Detail */}
      {selectedJustification && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Detalle del Justificativo</h3>
              <button onClick={() => setSelectedJustification(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-500 uppercase">Alumno</label>
                <p className="text-lg font-semibold">
                  {selectedJustification.studentName} ({selectedJustification.course})
                </p>
              </div>
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-500 uppercase">Día que justifica</label>
                <p className="text-lg font-semibold">{fechaLarga(selectedJustification.fecha)}</p>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-500 uppercase">Motivo</label>
                <p className="text-gray-800 p-4 bg-gray-50 rounded-xl mt-1 border border-gray-100">{selectedJustification.reason}</p>
              </div>
            </div>

            {selectedJustification.status === 'pending' && (
              <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50">
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'denied');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  Denegar
                </button>
                <button
                  onClick={() => {
                    handleRespond(selectedJustification.id, 'approved');
                    setSelectedJustification(null);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors cursor-pointer"
                >
                  Aprobar Falta
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Student History */}
      {historyStudent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{historyStudent.name}</h3>
                <p className="text-sm text-gray-400">Historial de asistencia</p>
              </div>
              <button onClick={() => setHistoryStudent(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {historyRecords.length === 0 ? (
                <p className="text-center text-gray-400 mt-6">Todavía no tiene ninguna llegada registrada.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historyRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{fechaLarga(r.fecha)}</p>
                        <p className="text-xs text-gray-400">
                          {r.course} · {r.status === 'late' ? 'Llegó tarde' : 'Puntual'}
                        </p>
                      </div>
                      <span
                        className={
                          r.status === 'late'
                            ? 'bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200'
                            : 'bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200'
                        }
                      >
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
