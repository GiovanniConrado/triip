
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import Toast, { ToastType } from '../components/Toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await authService.signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      setToast({
        message: error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao entrar. Tente novamente.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setToast({ message: 'Preencha e-mail e senha para criar conta.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.signUpWithEmail(email, password);
      setToast({ message: 'Conta criada! Verifique seu e-mail se necessário.', type: 'success' });
    } catch (error: any) {
      setToast({ message: error.message || 'Erro ao criar conta.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      setToast({ message: 'Erro ao entrar com Google.', type: 'error' });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-y-auto max-w-[480px] mx-auto bg-warm-cream">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="relative pt-16 pb-10 px-8 bg-gradient-to-b from-terracotta-100/80 to-warm-cream">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white border border-white shadow-md rounded-2xl flex items-center justify-center mb-8">
            <span className="material-symbols-outlined text-terracotta-500 text-4xl fill">explore</span>
          </div>
          <h1 className="text-3xl font-serif text-sunset-dark mb-3">Bem-vindo ao Triip</h1>
          <p className="text-sunset-muted text-center text-sm px-4 leading-relaxed">
            Entre para organizar suas viagens em grupo.
          </p>
        </div>
      </div>

      <div className="flex-1 px-8 pb-12">
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-3 w-full h-[54px] bg-white border border-terracotta-100 rounded-2xl font-medium text-sunset-dark shadow-sm active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            <span>Continuar com Google</span>
          </button>
        </div>

        <div className="relative flex items-center gap-4 mb-8">
          <div className="flex-1 h-[1px] bg-terracotta-100"></div>
          <span className="text-xs font-medium text-sunset-muted/60 uppercase tracking-widest">ou use seu e-mail</span>
          <div className="flex-1 h-[1px] bg-terracotta-100"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            className="w-full h-[54px] px-5 bg-white border border-terracotta-100 rounded-2xl outline-none text-sunset-dark"
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full h-[54px] px-5 bg-white border border-terracotta-100 rounded-2xl outline-none text-sunset-dark"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="w-full h-[54px] bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-sm text-sunset-muted">
            Novo por aqui?
            <button
              onClick={handleSignUp}
              className="font-bold text-terracotta-600 hover:underline ml-1"
              disabled={isSubmitting}
            >
              Criar uma conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
