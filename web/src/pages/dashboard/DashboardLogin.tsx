import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="border-t-2 border-brass pt-7 text-center">
          <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">COLEGIO NACIONAL</p>
          <h1 className="font-serif text-3xl text-ink mt-1 leading-tight">San Ignacio de Loyola</h1>
          <p className="text-ink-soft text-sm mt-2">Registro de asistencia · panel de profesores</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5 mt-10 border-t border-rule pt-8">
          <div>
            <label className="text-xs font-semibold text-ink-soft block mb-1.5">Correo institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-0 py-2 border-b border-rule focus:outline-none focus:border-brass bg-transparent text-ink transition-colors"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-soft block mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-0 py-2 border-b border-rule focus:outline-none focus:border-brass bg-transparent text-ink transition-colors"
              required
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink hover:bg-[#0E1728] disabled:opacity-50 text-paper font-semibold py-3 mt-3 transition-colors cursor-pointer"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="text-ink-soft/70 text-xs text-center mt-6">Usá la misma cuenta que en la app del celular.</p>
      </div>
    </div>
  );
}
