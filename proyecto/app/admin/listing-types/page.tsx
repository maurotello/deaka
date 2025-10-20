'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAxiosPrivate } from '@/app/lib/axios';

interface ListingType {
    id: string;
    name: string;
    slug: string;
}

export default function AdminListingTypesPage() {
    const { auth } = useAuth();
    const router = useRouter();
    const axiosPrivate = useAxiosPrivate();
    
    const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedListingTypeId, setSelectedListingTypeId] = useState<string | null>(null);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Seguridad: Redirección si no es admin
    useEffect(() => {
        if (auth.user?.role !== 'admin') {
            router.push('/');
        }
    }, [auth, router]);
    
    // Cargar todos los tipos de listado
    const fetchListingTypes = useCallback(async () => {
        if (auth.user?.role !== 'admin' || !auth.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            // 🚨 CAMBIO DE RUTA
            const response = await axiosPrivate.get('/listing-types'); 
            setListingTypes(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cargar tipos de listado.');
        } finally {
            setLoading(false);
        }
    }, [auth.accessToken, auth.user?.role, axiosPrivate]);

    useEffect(() => {
        if (auth.accessToken) {
            fetchListingTypes();
        }
    }, [auth.accessToken, fetchListingTypes]);
    
    // Abrir modal para crear
    const openCreateModal = () => {
        setModalMode('create');
        setFormData({ name: '', slug: '' });
        setFormError(null);
        setShowModal(true);
    };

    // Abrir modal para editar
    const openEditModal = (type: ListingType) => {
        setModalMode('edit');
        setFormData({ name: type.name, slug: type.slug });
        setFormError(null);
        setShowModal(true);
        setSelectedListingTypeId(type.id);
    };

    // Guardar tipo de listado (crear o editar)
    const handleSaveListingType = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);

        try {
            if (modalMode === 'create') {
                // 🚨 RUTA POST
                await axiosPrivate.post('/listing-types', formData);
                alert('Tipo de listado creado exitosamente.');
            } else {
                // 🚨 RUTA PATCH
                await axiosPrivate.patch(`/listing-types/${selectedListingTypeId}`, formData);
                alert('Tipo de listado actualizado exitosamente.');
            }
            setFormData({ name: '', slug: '' });
            setShowModal(false);
            setSelectedListingTypeId(null);
            fetchListingTypes();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Error al guardar tipo de listado.');
        } finally {
            setFormLoading(false);
        }
    };

    // Eliminar tipo de listado
    const handleDeleteListingType = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este Tipo de Listado?')) return;
        try {
            // 🚨 RUTA DELETE
            await axiosPrivate.delete(`/listing-types/${id}`);
            alert('Tipo de listado eliminado exitosamente.');
            fetchListingTypes();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al eliminar tipo de listado.');
        }
    };

    if (auth.user?.role !== 'admin') return null;

    // ---------------------------------------------------
    // --- Renderizado ---
    // ---------------------------------------------------
    return (
        <main className="container mx-auto p-6 bg-gray-900 min-h-screen text-white">
            <h1 className="text-3xl font-bold mb-6 text-green-400">Administración de Tipos de Listado</h1>
            
            <button 
                onClick={openCreateModal}
                className="mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                + Crear Nuevo Tipo de Listado
            </button>

            {loading && <p>Cargando Tipos de Listado...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            
            <div className="space-y-4">
                {listingTypes.map((type) => (
                    <div key={type.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800 shadow flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-gray-100">{type.name}</h3>
                            <p className="text-sm text-gray-400">Slug: {type.slug}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => openEditModal(type)}
                                className="text-blue-400 hover:text-blue-200 p-2 rounded"
                            >
                                Editar
                            </button>
                            <button
                                onClick={() => handleDeleteListingType(type.id)}
                                className="text-red-400 hover:text-red-200 p-2 rounded"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!loading && listingTypes.length === 0 && !error && (
                <p className="text-gray-500">No hay Tipos de Listado definidos.</p>
            )}

            {/* Modal para crear/editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
                        <h2 className="text-2xl font-bold mb-4 text-green-400">
                            {modalMode === 'create' ? 'Crear Tipo de Listado' : 'Editar Tipo de Listado'}
                        </h2>

                        <form onSubmit={handleSaveListingType} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Slug</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-700 text-white"
                                    placeholder="ej: lugares-de-interes"
                                />
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-800 border border-red-600 rounded text-red-100 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    {formLoading ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}