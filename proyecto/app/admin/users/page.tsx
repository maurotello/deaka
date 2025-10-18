'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import axios from '@/app/lib/axios'; // 🚨 Usar tu instancia de Axios configurada para manejar tokens

interface User {
    id: number;
    name: string;
    email: string;
    role: 'user' | 'admin';
    created_at: string;
}

export default function AdminUsersPage() {
    const { auth } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 🚨 Seguridad: Redirección si no es admin
    useEffect(() => {
        if (auth.user?.role !== 'admin') {
            router.push('/');
        }
    }, [auth, router]);
    
    // ----------------------------------------------------
    // Lógica Común: Cargar Usuarios (Read)
    // ----------------------------------------------------
    const fetchUsers = useCallback(async () => {
        if (auth.user?.role !== 'admin' || !auth.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/auth/admin/users', {
                headers: { 'Authorization': `Bearer ${auth.accessToken}` }
            });
            setUsers(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }, [auth.accessToken, auth.user?.role]);

    useEffect(() => {
        if (auth.accessToken) {
            fetchUsers();
        }
    }, [auth.accessToken, fetchUsers]);

    // ----------------------------------------------------
    // Lógica de Modificación y Eliminación (Update & Delete)
    // ----------------------------------------------------

    const handleDelete = async (userId: number) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el usuario ID ${userId}?`)) return;
        try {
            await axios.delete(`/api/auth/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${auth.accessToken}` }
            });
            alert(`Usuario ${userId} eliminado.`);
            fetchUsers(); // Recargar la lista
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al eliminar.');
        }
    };
    
    // Lógica para Modificar Rol (Implementar en un modal o tabla editable)
    // const handleUpdateRole = async (userId: number, newRole: 'user' | 'admin') => { ... }


    if (auth.user?.role !== 'admin') return null; // Esperar redirección o mostrar nada

    return (
        <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Administración de Usuarios</h1>
            
            {/* Aquí iría un Modal o Formulario para la Creación (Alta) */}
            <button 
                onClick={() => router.push('/admin/create-user')}
                className="mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                + Crear Nuevo Usuario
            </button>

            {loading && <p>Cargando lista de usuarios...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            
            {/* Tabla de Usuarios (La vista R) */}
            {!loading && !error && users.length > 0 && (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {/* Modificar (U) - Podrías abrir un modal aquí */}
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                                            Editar
                                        </button>
                                        {/* Eliminar (D) */}
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-600 hover:text-red-900"
                                            disabled={user.role === 'admin' && user.id === auth.user?.id} // No auto-eliminar
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}