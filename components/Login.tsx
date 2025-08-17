
import React from 'react';
import { PlayCircle } from 'lucide-react';

declare var puter: any;

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const handleSignIn = async () => {
    try {
      await puter.auth.signIn();
      onLogin();
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
      <PlayCircle className="w-16 h-16 text-purple-400 mb-6" />
      <h1 className="text-4xl font-black tracking-wider text-white uppercase">AI Radio</h1>
      <p className="text-slate-300 mt-2 max-w-lg">
        Tu DJ con Cerebro Real. Inicia sesión con Puter para guardar los archivos de tu librería, tus DJs y tus preferencias en tu nube privada de Puter.
      </p>
      <button
        onClick={handleSignIn}
        className="mt-8 bg-purple-600 text-white font-bold py-3 px-8 text-lg rounded-lg transition-all shadow-[0_4px_14px_0_rgb(124,58,237,39%)] hover:shadow-[0_6px_20px_0_rgb(124,58,237,23%)] hover:bg-purple-500"
      >
        Iniciar Sesión / Registrarse con Puter
      </button>
       <div className="mt-6 text-sm text-slate-400">
        ¿Ya eres usuario? <a href="#" onClick={(e) => { e.preventDefault(); handleSignIn(); }} className="font-semibold text-purple-400 hover:text-purple-300">Inicia sesión aquí</a>.
      </div>
    </div>
  );
};

export default Login;
