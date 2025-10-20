'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAxiosPrivate } from '@/app/lib/axios';

interface User {
    id: string;
    email: string;
    role: 'user' | 'admin';
    created_at: string;
}

export default function AdminUsersPage() {
    const { auth } = useAuth();
    const router = useRouter();
    const axiosPrivate = useAxiosPrivate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', role: 'user' as 'user' | 'admin' });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Seguridad: Redirección si no es admin
    useEffect(() => {
        if (auth.user?.role !== 'admin') {
            router.push('/');
        }
    }, [auth, router]);
    
    // Cargar Usuarios (Read)
    const fetchUsers = useCallback(async () => {
        if (auth.user?.role !== 'admin' || !auth.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axiosPrivate.get('/auth/admin/users');
            setUsers(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }, [auth.accessToken, auth.user?.role, axiosPrivate]);

    useEffect(() => {
        if (auth.accessToken) {
            fetchUsers();
        }
    }, [auth.accessToken, fetchUsers]);

    // Eliminar Usuario
    const handleDelete = async (userId: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar el usuario ID ${userId}?`)) return;
        try {
            await axiosPrivate.delete(`/auth/admin/users/${userId}`);
            alert('Usuario eliminado exitosamente.');
            fetchUsers();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al eliminar.');
        }
    };

    // Crear Usuario
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);

        try {
            await axiosPrivate.post('/auth/admin/register', formData);
            alert('Usuario creado exitosamente.');
            setFormData({ email: '', password: '', role: 'user' });
            setShowModal(false);
            fetchUsers();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Error al crear usuario.');
        } finally {
            setFormLoading(false);
        }
    };

    if (auth.user?.role !== 'admin') return null;

    return (
        <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Administración de Usuarios</h1>
            
            <button 
                onClick={() => setShowModal(true)}
                className="mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                + Crear Nuevo Usuario
            </button>

            {loading && <p>Cargando lista de usuarios...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            
            {!loading && !error && users.length > 0 && (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-600 hover:text-red-900"
                                            disabled={user.role === 'admin' && user.id === auth.user?.id}
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

            {/* Modal para Crear Usuario */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="Mínimo 6 caracteres"
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value as 'user' | 'admin'})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                >
                                    <option value="user">Usuario</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
                                >
                                    {formLoading ? 'Creando...' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}