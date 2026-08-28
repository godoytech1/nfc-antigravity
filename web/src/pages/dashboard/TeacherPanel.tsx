import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Zap, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { useAttendanceSync } from '../../hooks/useAttendanceSync';
import type { AttendanceRecord, Justification, BroadcastMessage } from '../../types';

export default function TeacherPanel() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<AttendanceRecord[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [selectedJustification, setSelectedJustification] = useState<Justification | null>(null);

  const { broadcast } = useAttendanceSync((msg: BroadcastMessage) => {
    if (msg.type === 'NFC_SCAN') {
      // Esta lista es solo de alumnos: el profesor escanea, no se registra a sí mismo.
      if (msg.payload.role !== 'alumno') return;
      setScans((prev) => [msg.payload, ...prev]);
    } else if (msg.type === 'JUSTIFICATION_SUBMIT') {
      setJustifications((prev) => [msg.payload, ...prev]);
    }
  });

  const handleUpdateJustification = (id: string, status: 'approved' | 'denied') => {
    setJustifications((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status } : j))
    );
    broadcast({ type: 'JUSTIFICATION_UPDATE', payload: { id, status } });
    setSelectedJustification(null);
  };

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-[#0F294A] text-white p-4 px-8 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold">Panel de Profesores (BTI, BTC, Sociales)</h1>
          <p className="text-sm text-blue-200">Supervisión en vivo de asistencias generadas por las Tablets</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg cursor-pointer"
        >
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6 bg-gray-100">
        
        {/* Left Panel: Live Scans */}
        <section className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Llegadas Registradas por NFC Hoy <Zap size={20} className="text-yellow-500 fill-yellow-500" />
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {scans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Zap size={32} className="text-gray-300" />
                </div>
                <p>Esperando el primer escaneo de placa en la entrada...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {scans.map((scan) => (
                  <div key={scan.id} className="bg-white border border-gray-200 p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow animate-in slide-in-from-left-4 fade-in duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">
                        {scan.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{scan.userName}</p>
                        <p className="text-sm text-gray-500">{scan.role === 'profesor' ? 'Profesor' : 'Alumno'} • {scan.subject} {scan.specialty ? `(${scan.specialty})` : ''}</p>
                      </div>
                    </div>
                    <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-200">
                      {scan.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Justifications */}
        <section className="w-96 bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FileText size={20} className="text-blue-500" />
              Justificativos Pendientes
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {justifications.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                No hay justificativos pendientes.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {justifications.map((justification) => (
                  <div key={justification.id}>
                    {justification.status === 'pending' ? (
                      <div className="border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-900">{justification.studentName} ({justification.course})</h3>
                        <p className="text-sm text-gray-500 mt-1">Envió un certificado de reposo hoy.</p>
                        
                        <div className="mt-4 flex gap-2">
                          <button 
                            onClick={() => setSelectedJustification(justification)}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-semibold transition-colors"
                          >
                            Ver Carta
                          </button>
                          <button
                            onClick={() => handleUpdateJustification(justification.id, 'denied')}
                            className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl text-sm font-semibold transition-colors"
                          >
                            Denegar
                          </button>
                          <button
                            onClick={() => handleUpdateJustification(justification.id, 'approved')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors"
                          >
                            Aprobar
                          </button>
                        </div>
                      </div>
                    ) : justification.status === 'approved' ? (
                      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
                        <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-green-800">Inasistencia Justificada</h3>
                          <p className="text-sm text-green-700 mt-1">El sistema ha guardado la actualización para {justification.studentName}.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
                        <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-red-800">Justificativo Denegado</h3>
                          <p className="text-sm text-red-700 mt-1">Se rechazó la solicitud de {justification.studentName}.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Modal for Justification Detail */}
      {selectedJustification && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Detalle del Justificativo</h3>
              <button 
                onClick={() => setSelectedJustification(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-500 uppercase">Alumno</label>
                <p className="text-lg font-semibold">{selectedJustification.studentName} ({selectedJustification.course})</p>
              </div>
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-500 uppercase">Motivo</label>
                <p className="text-gray-800 p-4 bg-gray-50 rounded-xl mt-1 border border-gray-100">
                  {selectedJustification.reason}
                </p>
              </div>
              <div>
                <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Evidencia Adjunta</label>
                <div className="w-full h-48 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  [ Imagen del Certificado Médico ]
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-4 bg-gray-50">
              <button
                onClick={() => handleUpdateJustification(selectedJustification.id, 'denied')}
                className="flex-1 py-3 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Denegar
              </button>
              <button
                onClick={() => handleUpdateJustification(selectedJustification.id, 'approved')}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Aprobar Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
