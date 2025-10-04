'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext'; // 1. Importamos el hook useAuth que creamos.

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setAuth } = useAuth(); // 2. Obtenemos la función setAuth de nuestro contexto.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falló el inicio de sesión.');
      }

      // 3. ¡EL GRAN CAMBIO! Ya no usamos localStorage.
      //    Guardamos el accessToken y la información del usuario en el estado global.
      //    Nuestro backend ahora devuelve un objeto con 'accessToken' y 'user'.
      setAuth({ user: data.user, accessToken: data.accessToken });

      router.push('/'); // Redirigimos al mapa principal

    } catch (err: any) {
      setError(err.message);
    }
  };

  // El JSX (toda la parte visual del return) no necesita ningún cambio.
  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Iniciar sesión
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* ... tu formulario sigue igual ... */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2"
            />
          </div>
          {error && <div className="rounded-md bg-red-800 p-3 text-center text-sm text-white">{error}</div>}
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Entrar
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-400">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="font-medium text-green-400 hover:text-green-300">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}