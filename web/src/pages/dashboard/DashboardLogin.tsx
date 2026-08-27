import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School } from 'lucide-react';

export default function DashboardLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('profe@cnsil.edu.py');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard/profesor');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
            <School size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">C.N.S.I.L.</h1>
          <p className="text-gray-500 mt-1">Sistema Administrativo NFC</p>
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

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all mt-4 active:scale-95"
          >
            Acceder al Panel
          </button>
        </form>
      </div>
    </div>
  );
}
