'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAxiosPrivate } from '@/app/lib/axios';

interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    marker_icon_slug: string | null;
}

export default function AdminCategoriesPage() {
    const { auth } = useAuth();
    const router = useRouter();
    const axiosPrivate = useAxiosPrivate();
    
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState({ name: '', slug: '', marker_icon_slug: '', parent_id: '' });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Seguridad: Redirección si no es admin
    useEffect(() => {
        if (auth.user?.role !== 'admin') {
            router.push('/');
        }
    }, [auth, router]);
    
    // Cargar todas las categorías
    const fetchCategories = useCallback(async () => {
        if (auth.user?.role !== 'admin' || !auth.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const response = await axiosPrivate.get('/categories/all');
            setCategories(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al cargar categorías.');
        } finally {
            setLoading(false);
        }
    }, [auth.accessToken, auth.user?.role, axiosPrivate]);

    useEffect(() => {
        if (auth.accessToken) {
            fetchCategories();
        }
    }, [auth.accessToken, fetchCategories]);

    // Obtener categorías principales (sin parent_id)
    const mainCategories = categories.filter(c => c.parent_id === null);
    
    // Obtener subcategorías de una categoría
    const getSubcategories = (parentId: string) => {
        return categories.filter(c => c.parent_id === parentId);
    };

    // Abrir modal para crear
    const openCreateModal = (parentId: string | null = null) => {
        setModalMode('create');
        setFormData({ name: '', slug: '', marker_icon_slug: '', parent_id: parentId || '' });
        setFormError(null);
        setShowModal(true);
    };

    // Abrir modal para editar
    const openEditModal = (category: Category) => {
        setModalMode('edit');
        setFormData({
            name: category.name,
            slug: category.slug,
            marker_icon_slug: category.marker_icon_slug || '',
            parent_id: category.parent_id || ''
        });
        setFormError(null);
        setShowModal(true);
        setSelectedCategory(category.id);
    };

    // Guardar categoría (crear o editar)
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormLoading(true);

        try {
            if (modalMode === 'create') {
                await axiosPrivate.post('/categories', formData);
                alert('Categoría creada exitosamente.');
            } else {
                await axiosPrivate.patch(`/categories/${selectedCategory}`, formData);
                alert('Categoría actualizada exitosamente.');
            }
            setFormData({ name: '', slug: '', marker_icon_slug: '', parent_id: '' });
            setShowModal(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (err: any) {
            setFormError(err.response?.data?.error || 'Error al guardar categoría.');
        } finally {
            setFormLoading(false);
        }
    };

    // Eliminar categoría
    const handleDeleteCategory = async (categoryId: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta categoría?')) return;
        try {
            await axiosPrivate.delete(`/categories/${categoryId}`);
            alert('Categoría eliminada exitosamente.');
            fetchCategories();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Error al eliminar categoría.');
        }
    };

    if (auth.user?.role !== 'admin') return null;

    return (
        <main className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Administración de Categorías</h1>
            
            <button 
                onClick={() => openCreateModal()}
                className="mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                + Crear Categoría Principal
            </button>

            {loading && <p>Cargando categorías...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}
            
            {!loading && !error && mainCategories.length > 0 && (
                <div className="space-y-4">
                    {mainCategories.map((mainCat) => {
                        const subcats = getSubcategories(mainCat.id);
                        return (
                            <div key={mainCat.id} className="border rounded-lg p-4 bg-white shadow">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{mainCat.name}</h3>
                                        <p className="text-sm text-gray-500">Slug: {mainCat.slug}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(mainCat)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(mainCat.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                {/* Subcategorías */}
                                <div className="ml-4 mt-3 border-l-2 border-gray-300 pl-4">
                                    {subcats.length > 0 ? (
                                        <div className="space-y-2">
                                            {subcats.map((subcat) => (
                                                <div key={subcat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                    <div>
                                                        <p className="font-medium text-gray-800">{subcat.name}</p>
                                                        <p className="text-xs text-gray-500">Slug: {subcat.slug}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openEditModal(subcat)}
                                                            className="text-blue-600 hover:text-blue-900 text-sm"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(subcat.id)}
                                                            className="text-red-600 hover:text-red-900 text-sm"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm italic">Sin subcategorías</p>
                                    )}
                                    <button
                                        onClick={() => openCreateModal(mainCat.id)}
                                        className="mt-2 py-1 px-3 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                    >
                                        + Agregar Subcategoría
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && mainCategories.length === 0 && (
                <p className="text-gray-500">No hay categorías. Crea una para empezar.</p>
            )}

            {/* Modal para crear/editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900">
                            {modalMode === 'create' ? 'Crear Categoría' : 'Editar Categoría'}
                        </h2>

                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="ej: pizzeria"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icono (opcional)</label>
                                <input
                                    type="text"
                                    value={formData.marker_icon_slug}
                                    onChange={(e) => setFormData({...formData, marker_icon_slug: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                    placeholder="ej: restaurant"
                                />
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
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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