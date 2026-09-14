import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School } from 'lucide-react';
import { signIn, signOut, getMyProfile, translateAuthError } from '../../services/auth';
import { supabase } from '../../services/realtime';

export default function DashboardLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya había una sesión de profesor guardada, entrar directo.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const profile = await getMyProfile();
      if (profile?.role === 'profesor') {
        navigate('/dashboard/profesor', { replace: true });
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      const profile = await getMyProfile();
      if (profile?.role !== 'profesor') {
        await signOut();
        setError('Esta cuenta no es de profesor. Este panel es solo para profesores.');
        return;
      }
      navigate('/dashboard/profesor', { replace: true });
    } catch (err: any) {
      setError(translateAuthError(err?.message ?? 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <School size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">C.N.S.I.L.</h1>
          <p className="text-gray-500 mt-1">Panel de Profesores</p>
          <p className="text-gray-400 text-xs mt-1">Usá la misma cuenta que en la app</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 ml-1 block mb-1">Correo Institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 ml-1 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-4 active:scale-95 cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Acceder al Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}
