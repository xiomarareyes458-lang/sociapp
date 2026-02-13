import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Smartphone, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle, ShieldOff } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { login, register, enterDemoMode } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsBlocked(false);
    setLoading(true);

    try {
      if (authMode === 'login') {
        await login(formData.email, formData.password);
      } else if (authMode === 'signup') {
        if (!formData.email || !formData.username || !formData.fullName || !formData.password) {
          setError('Completa todos los campos');
          setLoading(false);
          return;
        }
        await register(formData.email, formData.password, formData.username, formData.fullName);
      } else if (authMode === 'forgot') {
        setIsResetSent(true);
      }
    } catch (err: any) {
      if (err.message === 'CONEXION_BLOQUEADA') {
        setIsBlocked(true);
        setError('Tu navegador o un AdBlocker está bloqueando la conexión segura.');
      } else {
        setError(err.message || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-[350px] w-full flex flex-col gap-3">
        <div className="bg-[#121212] border border-[#2F3336] p-8 flex flex-col items-center rounded-2xl shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center gap-2 mb-8 select-none text-[#2ECC71]">
            <Smartphone className="w-10 h-10" />
            <h1 className="font-bold text-3xl italic tracking-tighter">SocialApp</h1>
          </div>

          {authMode === 'forgot' && isResetSent ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-12 h-12 text-[#2ECC71] mx-auto mb-4" />
              <h2 className="text-white font-bold text-xl mb-2">Enlace enviado</h2>
              <button onClick={() => setAuthMode('login')} className="w-full bg-[#2ECC71] text-black font-bold py-3 rounded-xl mt-4">Volver</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
              {authMode === 'signup' && (
                <>
                  <input type="text" placeholder="Nombre completo" className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71]" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                  <input type="text" placeholder="Usuario" className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71]" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </>
              )}
              
              <input type="email" placeholder="Correo" className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              
              {authMode !== 'forgot' && (
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Contraseña" className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 pr-10 text-sm text-white outline-none focus:border-[#2ECC71]" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-500">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-[#2ECC71] text-black font-bold py-3 rounded-xl text-sm mt-4 hover:bg-[#27AE60] disabled:opacity-50 transition-all">
                {loading ? 'Cargando...' : authMode === 'login' ? 'Entrar' : 'Registrarse'}
              </button>

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <p className="text-red-400 text-xs font-bold flex items-center justify-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" /> {error}
                  </p>
                  {isBlocked && (
                    <button 
                      type="button" 
                      onClick={enterDemoMode}
                      className="w-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-wider py-2 rounded-lg flex items-center justify-center gap-2 transition-all border border-white/5"
                    >
                      <ShieldOff className="w-3 h-3" /> Entrar en Modo Demo
                    </button>
                  )}
                </div>
              )}

              {authMode === 'login' && (
                <button type="button" onClick={() => setAuthMode('signup')} className="text-xs text-gray-500 mt-6 hover:text-[#2ECC71]">¿No tienes cuenta? <span className="font-bold">Regístrate</span></button>
              )}
              {authMode !== 'login' && (
                <button type="button" onClick={() => setAuthMode('login')} className="text-xs text-gray-500 mt-6 hover:text-[#2ECC71]">Volver al inicio</button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;