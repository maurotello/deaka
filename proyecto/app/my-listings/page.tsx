'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Importamos los hooks necesarios
import { useAuth } from '@/app/context/AuthContext';
import { useAxiosPrivate } from '../lib/axios';// [8, 11]


type UserWithRole = {
    id: string; 
    email: string; 
    role: string;
}


// Definición de tipos para los listados que recibiremos del backend
type UserListing = {
    id: number;
    title: string;
    address: string;
    city: string;
    category_name: string;
    status: 'published' | 'pending' | 'draft';
};

export default function MyListingsPage() {
    const { auth } = useAuth();
    const currentUser = auth.user as (UserWithRole | null);
    const router = useRouter();
    const axiosPrivate = useAxiosPrivate(); // Instancia protegida de axios [8]
    
    const [listings, setListings] = useState<UserListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 1. Efecto para verificar la autenticación y obtener los listados
    useEffect(() => {
        // Si el usuario no está cargando y no hay usuario, redirigir
        // Usamos auth.user como indicador, asumiendo que AuthProvider ya finalizó su chequeo inicial.
        if (auth.user === null) {
            // Si no estamos logueados, redirigimos inmediatamente (similar a la lógica anterior [12])
            router.push('/login');
            return; 
        }

        const fetchMyListings = async () => {

            if (!auth.accessToken) {
                // Esto debería ser capturado por la redirección superior, pero es defensivo.
                router.push('/login');
                return;
            }
            try {
                // Petición segura a la nueva ruta protegida del backend
                const response = await axiosPrivate.get('/my-listings');
                setListings(response.data);
            } catch (err: any) {
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                     // El interceptor ya estableció auth.user = null,
                     // pero si queremos asegurarnos de romper el ciclo si el 401 no es manejado
                     // como un 403, forzamos la redirección aquí también.
                     console.error("Token no válido. Redirigiendo a login.");
                     router.push('/login');
                } else {
                    console.error('Error al cargar mis listados:', err);
                    setError('No se pudieron cargar sus listados. Intente nuevamente.');
                }
            } finally {
                setLoading(false);
            }
        };

        // Si hay un usuario, procedemos a cargar los listados
        if (auth.user) {
            fetchMyListings();
        }
        
    }, [auth.user, router, axiosPrivate]); 
    // Dependencias: auth.user (para saber cuándo estamos logueados), router, y axiosPrivate

    // Lógica para Borrar (DELETE)
    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Está seguro de que desea eliminar este listado?')) return;
        
        try {
            // Usamos axiosPrivate para la petición segura de DELETE
            await axiosPrivate.delete(`/listings/${id}`); 
            // Filtramos la lista para actualizar la UI
            setListings(prev => prev.filter(l => l.id !== id));
            alert('Listado eliminado con éxito.');
        } catch (err) {
            console.error('Error al eliminar:', err);
            alert('Error al eliminar el listado. Verifique su sesión.');
        }
    };

    const handlePublish = async (id: number) => {
        if (!window.confirm('¿Está seguro de que desea PUBLICAR este listado y hacerlo visible en el mapa?')) return;

        try {
            // Llama a la nueva ruta PATCH que creaste en el backend
            await axiosPrivate.patch(`/listings/${id}/status`, { status: 'published' });
            
            // Actualizar la UI inmediatamente (o recargar los datos)
            // Opción 1: Recargar todos los listados (la más segura)
            // Nota: Aquí necesitarías que la función fetchMyListings fuera accesible desde afuera.
            // Para simplificar, actualizaremos el estado local directamente:
            setListings(prev => prev.map(l => 
                l.id === id ? { ...l, status: 'published' } : l
            ));
            
            alert('Listado publicado con éxito.');
        } catch (err: any) {
            console.error('Error al publicar:', err);
            // Mensaje de error más informativo si es un 403 (No autorizado)
            const errorMessage = err.response?.status === 403 
                               ? 'Acceso denegado. Solo los administradores pueden publicar.' 
                               : 'Error al intentar publicar el listado.';
            alert(errorMessage);
        }
    };


    if (loading) {
        return (
             <main className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                 <p className="text-xl animate-pulse">Cargando mis listados...</p>
             </main>
        );
    }
    
    if (error) {
         return (
             <main className="min-h-screen bg-gray-900 pt-20 px-4 text-white">
                 <p className="text-red-500 text-xl text-center">{error}</p>
             </main>
         );
    }

    return (
        <main className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 text-white">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-4xl font-bold text-center mb-8 text-green-400">Mis Listados</h1>
                
                <div className="flex justify-end mb-4">
                    <Link 
                        href="/submit" 
                        className="rounded-md bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                        + Crear Nuevo Listado
                    </Link>
                </div>

                {listings.length === 0 ? (
                    <div className="text-center p-10 border border-gray-700 rounded-lg bg-gray-800">
                        <p className="text-xl text-gray-400">Aún no ha creado ningún listado.</p>
                        <p className="text-md text-gray-500 mt-2">Utilice el botón "Crear Nuevo Listado" para empezar.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg shadow-xl">
                        <table className="min-w-full divide-y divide-gray-700 bg-gray-800">
                            <thead>
                                <tr className="text-left text-sm font-semibold text-gray-300 uppercase tracking-wider bg-gray-700">
                                    <th className="px-6 py-3">Título</th>
                                    <th className="px-6 py-3">Categoría</th>
                                    <th className="px-6 py-3">Localidad</th>
                                    <th className="px-6 py-3">Estado</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {listings.map((l) => (
                                    <tr key={l.id} className="hover:bg-gray-700 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{l.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{l.category_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{l.city}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                                                l.status === 'published' ? 'bg-green-100 text-green-800' :
                                                l.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            {/* El enlace de edición lo implementaremos en el siguiente paso */}
                                            <Link href={`/edit/${l.id}`} className="text-blue-500 hover:text-blue-700">
                                                Editar
                                            </Link>
                                            <button 
                                                onClick={() => handleDelete(l.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Borrar
                                            </button>
                                            {/* ------------------------------------------------------------------ */}
                                            {/* LÓGICA DE ACTIVACIÓN POR ROL DE ADMINISTRADOR */}
                                            {/* ------------------------------------------------------------------ */}
                                            {currentUser && currentUser.role === 'admin' && l.status === 'pending' && (
                                                <>
                                                    <span className="text-gray-500 mx-2">|</span>
                                                    <button
                                                        onClick={() => handlePublish(l.id)}
                                                        className="text-green-500 hover:text-green-400 font-bold"
                                                        title="Publicar este listado para que sea visible en el mapa"
                                                    >
                                                        Activar
                                                    </button>
                                                </>
                                            )}
                                            {/* ------------------------------------------------------------------ */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}