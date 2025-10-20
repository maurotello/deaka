'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext'; 
import axios from 'axios';

// 🚨 Recomendación: Mover esta configuración de axios a un archivo /lib/axios.ts
// para que no se re-defina en cada componente.
const api = axios.create({
    baseURL: 'http://localhost:3001/api',
    withCredentials: true 
});

export default function Navbar() {
    const { auth, setAuth } = useAuth();
    const router = useRouter();

    // 🚨 Lógica de Control de Rol
    const isAdmin = auth.user?.role === 'admin';

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('El logout en el servidor falló, pero limpiaremos el cliente:', error);
        } finally {
            setAuth({ user: null, accessToken: null });
            router.push('/login');
        }
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
                        
                        {auth.user ? (
                            <>
                                <span className="text-gray-300 text-sm hidden sm:block">
                                    Hola, {auth.user.email}
                                </span>
                                
                                {/* 🚨 ENLACE DE ADMINISTRACIÓN (SOLO ADMIN) */}
                                {isAdmin && (
                                    <Link 
                                        href="/admin/users" 
                                        className="px-3 py-2 rounded-md text-sm font-medium bg-purple-600 hover:bg-purple-700 transition"
                                    >
                                        Usuarios
                                    </Link> 
                                )}

                                {isAdmin && (
                                    <Link 
                                        href="/admin/categories" 
                                        className="px-3 py-2 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700 transition"
                                    >
                                        Categorías
                                    </Link> 
                                )}

                                {isAdmin && (
                                    <Link href="/admin/listing-types" className="block text-gray-300 hover:text-green-400 transition">
                                        Tipos de Listado
                                    </Link>
                                )}


                                
                                <Link href="/submit" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700">
                                    Crear Listado
                                </Link>
                                <Link 
                                    href="/my-listings" 
                                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
                                >
                                    Mis Listados
                                </Link> 
                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700"
                                >
                                    Cerrar Sesión
                                </button>
                            </>
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