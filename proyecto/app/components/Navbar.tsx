'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); // 2. Obtenemos la ruta actual
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verificamos el estado de login en el lado del cliente
  useEffect(() => {
    console.log("Verificando token en la ruta:", pathname);
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, [pathname]);


  const handleLogout = () => {
    // Borramos el token
    localStorage.removeItem('authToken');
    // Actualizamos el estado para que los botones cambien
    setIsLoggedIn(false);
    // Redirigimos al inicio
    router.push('/');
    // Forzamos un refresh para asegurar que todo se actualice
    router.refresh(); 
  };

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl text-green-400">
              DeaKa
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
              Mapa
            </Link>
            <Link href="/submit" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
              Crear Listado
            </Link>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700"
              >
                Cerrar Sesión
              </button>
            ) : (
              <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}