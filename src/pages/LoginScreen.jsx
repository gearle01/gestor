import React, { useState } from 'react';
import { Settings, User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase'; // Importando do arquivo firebase.js
import { Input, Button } from '../components/UI';

const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.52 12.29C23.52 11.44 23.44 10.62 23.3 9.82H12V14.45H18.46C18.18 15.93 17.33 17.18 16.06 18.03V21.01H19.93C22.19 18.93 23.52 15.87 23.52 12.29Z" fill="#4285F4" />
    <path d="M12 24C15.24 24 17.96 22.93 19.93 21.01L16.06 18.03C14.99 18.75 13.62 19.18 12 19.18C8.87 19.18 6.22 17.07 5.27 14.23H1.27V17.33C3.26 21.28 7.33 24 12 24Z" fill="#34A853" />
    <path d="M5.27 14.23C5.03 13.51 4.9 12.76 4.9 12C4.9 11.24 5.03 10.49 5.27 9.77V6.67H1.27C0.46 8.28 0 10.09 0 12C0 13.91 0.46 15.72 1.27 17.33L5.27 14.23Z" fill="#FBBC05" />
    <path d="M12 4.82C13.76 4.82 15.34 5.43 16.58 6.62L20.02 3.18C17.96 1.26 15.24 0 12 0C7.33 0 3.26 2.72 1.27 6.67L5.27 9.77C6.22 6.93 8.87 4.82 12 4.82Z" fill="#EA4335" />
  </svg>
);

const LoginScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError('Erro ao conectar com Google. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('Preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (formData.name) {
          await updateProfile(userCredential.user, { displayName: formData.name });
        }
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-azuri-600 to-indigo-700 p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-azuri-100 p-3 rounded-full mb-4 text-azuri-600">
              <Settings size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Gestor</h1>
            <p className="text-gray-500 text-sm text-center mt-1">
              {isRegistering ? 'Crie sua conta e gerencie seu negócio' : 'Bem-vindo de volta!'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
              <Input
                label="Nome da Empresa / Seu Nome"
                placeholder="Ex: Barbearia do Gearle"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                icon={User}
              />
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              icon={Mail}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              icon={Lock}
            />

            <Button
              type="submit"
              className="w-full py-3 text-base"
              disabled={loading}
              icon={loading ? null : ArrowRight}
            >
              {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta Grátis' : 'Entrar')}
            </Button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-gray-400 text-sm font-medium">ou continue com</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <Button
            variant="google"
            className="w-full py-3"
            onClick={handleGoogleLogin}
            disabled={loading}
            icon={GoogleIcon}
          >
            Google
          </Button>
        </div>

        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-sm text-gray-600">
            {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="ml-1 text-azuri-600 font-bold hover:underline focus:outline-none"
            >
              {isRegistering ? 'Fazer Login' : 'Criar agora'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;