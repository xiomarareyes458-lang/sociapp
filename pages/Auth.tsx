
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { Smartphone, Eye, EyeOff, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { DEFAULT_AVATAR } from '../constants';
import { User } from '../types';

type AuthMode = 'login' | 'signup' | 'forgot';

const Auth: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const { login } = useAuth();
  const { users, registerUser } = useSocial();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authMode === 'login') {
      const user = users.find(u => u.email === formData.email || u.username === formData.email);
      if (user) {
        login(user);
      } else {
        setError('Credenciales inválidas');
      }
    } else if (authMode === 'signup') {
      if (!formData.email || !formData.username || !formData.fullName) {
        setError('Por favor completa todos los campos');
        return;
      }
      const newUser: User = {
        id: 'user-' + Date.now(),
        username: formData.username.toLowerCase(),
        email: formData.email,
        fullName: formData.fullName,
        avatar: DEFAULT_AVATAR,
        joinedAt: Date.now(),
        coverPhoto: null,
        bio: '',
        followers: [],
        following: []
      };
      registerUser(newUser);
      login(newUser);
    } else if (authMode === 'forgot') {
      if (!formData.email) {
        setError('Por favor ingresa tu correo o usuario');
        return;
      }
      // Simulación de envío de correo
      setIsResetSent(true);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-[350px] w-full flex flex-col gap-3">
        {/* Main Form */}
        <div className="bg-[#121212] border border-[#2F3336] p-8 flex flex-col items-center rounded-2xl shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center gap-2 mb-8 select-none text-[#2ECC71]">
            <Smartphone className="w-10 h-10" />
            <h1 className="font-bold text-3xl italic tracking-tighter">SocialApp</h1>
          </div>

          {authMode === 'forgot' && isResetSent ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-[#2ECC71]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-[#2ECC71]" />
              </div>
              <h2 className="text-white font-bold text-xl mb-2">Instrucciones enviadas</h2>
              <p className="text-gray-500 text-sm mb-6">Hemos enviado un enlace de recuperación a tu correo asociado.</p>
              <button 
                onClick={() => { setAuthMode('login'); setIsResetSent(false); }}
                className="w-full bg-[#2ECC71] text-black font-bold py-3 rounded-xl text-sm hover:bg-[#27AE60] transition-all"
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
              {authMode === 'forgot' && (
                <div className="mb-4">
                  <h2 className="text-white font-bold text-lg mb-1">¿Tienes problemas para entrar?</h2>
                  <p className="text-gray-500 text-xs">Ingresa tu correo electrónico o nombre de usuario y te enviaremos un enlace para recuperar el acceso a tu cuenta.</p>
                </div>
              )}

              {authMode === 'signup' && (
                <>
                  <input 
                    type="text" 
                    placeholder="Nombre completo" 
                    className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71] placeholder-gray-500 transition-colors"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Nombre de usuario" 
                    className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71] placeholder-gray-500 transition-colors"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </>
              )}
              
              <input 
                type="text" 
                placeholder={authMode === 'login' ? "Usuario o correo electrónico" : "Correo electrónico"} 
                className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 text-sm text-white outline-none focus:border-[#2ECC71] placeholder-gray-500 transition-colors"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              
              {authMode !== 'forgot' && (
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Contraseña" 
                    className="w-full bg-[#1A1A1A] border border-[#363636] rounded-xl p-3 pr-10 text-sm text-white outline-none focus:border-[#2ECC71] placeholder-gray-500 transition-colors"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2ECC71] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-[#2ECC71] text-black font-bold py-3 rounded-xl text-sm mt-4 hover:bg-[#27AE60] transition-all active:scale-95 shadow-md shadow-[#2ECC71]/10"
              >
                {authMode === 'login' ? 'Iniciar Sesión' : authMode === 'signup' ? 'Registrarse' : 'Enviar enlace de acceso'}
              </button>

              {error && <div className="text-red-400 text-xs text-center mt-3 font-medium">{error}</div>}

              {authMode === 'login' && (
                <>
                  <div className="flex items-center gap-4 my-6 w-full">
                    <div className="h-[1px] bg-[#2F3336] flex-1"></div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase">O</span>
                    <div className="h-[1px] bg-[#2F3336] flex-1"></div>
                  </div>

                  <button type="button" className="text-[#2ECC71] font-bold text-sm hover:underline transition-all">Iniciar sesión con Facebook</button>
                  <button 
                    type="button" 
                    onClick={() => setAuthMode('forgot')}
                    className="text-xs text-gray-400 mt-2 hover:text-white transition-all"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </>
              )}

              {authMode === 'forgot' && (
                <button 
                  type="button" 
                  onClick={() => setAuthMode('login')}
                  className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-white hover:text-[#2ECC71] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </button>
              )}
            </form>
          )}
        </div>

        {/* Switch Login/Signup */}
        <div className="bg-[#121212] border border-[#2F3336] p-6 text-center text-sm rounded-2xl">
          {authMode === 'login' ? (
            <p className="text-gray-300">¿No tienes una cuenta? <button onClick={() => setAuthMode('signup')} className="text-[#2ECC71] font-bold hover:underline">Regístrate</button></p>
          ) : authMode === 'signup' ? (
            <p className="text-gray-300">¿Ya tienes cuenta? <button onClick={() => setAuthMode('login')} className="text-[#2ECC71] font-bold hover:underline">Inicia sesión</button></p>
          ) : (
            <p className="text-gray-300">¿Recordaste tu contraseña? <button onClick={() => setAuthMode('login')} className="text-[#2ECC71] font-bold hover:underline">Entrar</button></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
