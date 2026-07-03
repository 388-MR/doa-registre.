import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [matricule, setMatricule] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await login(matricule, pin);
    if (result.error) { setError(result.error); return; }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#080a0d' }}>
      <div className="w-full max-w-md">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <img
              src="/DOA_logo_GTA_V.png"
              alt="DOA Logo"
              className="w-28 h-28 object-contain rounded-full"
              style={{ filter: 'invert(1)', background: '#000' }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-gray-100 uppercase">
            Registre DOA
          </h1>
          <p className="text-sm text-gray-500 mt-1">Drug Observation Agency</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-cyan-800" />
            <p className="text-xs text-cyan-600 tracking-[0.15em] uppercase">Mission Row · Liberty Dept. of Justice</p>
            <div className="h-px w-8 bg-cyan-800" />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 border"
          style={{ background: 'rgba(14, 18, 24, 0.98)', borderColor: '#1a2030' }}
        >
          <h2 className="text-base font-semibold text-gray-200 mb-1 text-center">Authentification Agent</h2>
          <p className="text-xs text-gray-600 mb-6 text-center">Accès réservé au personnel autorisé</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Matricule
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  placeholder="Ex: 315"
                  value={matricule}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setMatricule(val);
                  }}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors text-sm"
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="• • •"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full bg-gray-900/80 border border-gray-800 rounded-lg pl-10 pr-10 py-2.5 text-gray-100 placeholder-gray-700 focus:outline-none focus:border-cyan-700 transition-colors text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-400 transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-semibold text-sm tracking-[0.1em] uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: isLoading ? '#1a3050' : 'linear-gradient(135deg, #1a3a5c 0%, #0e5f8a 100%)',
                color: '#e0f0ff',
                border: '1px solid #1e5a84',
              }}
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-800/60">
            <p className="text-xs text-gray-700 text-center">
              Accès réservé — Matricule compris entre 301 et 400
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-800 mt-6">
          Système de surveillance interne — Usage officiel uniquement
        </p>
      </div>
    </div>
  );
}
