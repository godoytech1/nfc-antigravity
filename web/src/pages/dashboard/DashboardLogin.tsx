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
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mb-4">
            <School size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-title text-center">San Ignacio de Loyola</h1>
          <p className="text-muted mt-1 text-sm">Panel de Profesores</p>
          <p className="text-muted text-xs mt-1">Usá la misma cuenta que en la app</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-bold text-label uppercase tracking-wide mb-1.5 block">
              Correo institucional
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-card text-title"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-label uppercase tracking-wide mb-1.5 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary bg-card text-title"
              required
            />
          </div>

          {error && <p className="text-danger text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors mt-2 cursor-pointer"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
