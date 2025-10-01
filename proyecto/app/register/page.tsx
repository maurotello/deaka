'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Hook para manejar la redirección
import Link from 'next/link';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falló el registro.');
      }

      setSuccess('¡Registro exitoso! Redirigiendo al login...');
      // Esperamos 2 segundos y redirigimos al usuario a la página de login
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Crear una nueva cuenta
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
              minLength={6}
              className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2"
            />
          </div>
          {error && <div className="rounded-md bg-red-800 p-3 text-center text-sm text-white">{error}</div>}
          {success && <div className="rounded-md bg-green-800 p-3 text-center text-sm text-white">{success}</div>}
          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Registrarse
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-400">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-green-400 hover:text-green-300">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </main>
  );
}