import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@bridacero.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[oklch(0.16_0.015_260)] p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center mb-4">
            <span className="text-[oklch(0.16_0.015_260)] text-sm font-bold tracking-tight">BR</span>
          </div>
          <h1 className="text-lg font-semibold text-white">Bridacero ERP</h1>
          <p className="text-sm text-white/50 mt-0.5">Inventario, compras y pedidos</p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-white/35 mt-5 text-center">
          Cuenta de demostración: admin@bridacero.com · admin123
        </p>
      </div>
    </div>
  );
}
