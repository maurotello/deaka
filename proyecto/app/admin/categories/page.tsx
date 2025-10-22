'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAxiosPrivate } from '@/app/lib/axios';

// Interfaz de categoría (Acepta el tipo de dato que realmente devuelve la DB)
interface Category {
    id: string; 
    name: string;
    slug: string;
    parent_id: string | number | null; // 🚨 Aceptamos string, number o null de la DB
    marker_icon_slug: string | 'default-pin';
    icon_original_width: number | null; 
    icon_original_height: number | null;
}

const initialFormData = {
    name: '',
    slug: '',
    parent_id: '',
    marker_icon_slug: '',
    iconFile: null as File | null,
    iconPreviewUrl: null as string | null,
};

export default function AdminCategoriesPage() {
    const { auth } = useAuth();
    const router = useRouter();
    const axiosPrivate = useAxiosPrivate();
    
    // Estado de la página
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    
    // Estado del formulario
    const [formData, setFormData] = useState(initialFormData);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSending, setFormSending] = useState(false);

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
            const data = response.data;
            setCategories(data);
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

    // Obtener categorías principales (parent_id es NULL)
    const mainCategories = categories.filter(c => c.parent_id === null);
    
    // Obtener subcategorías de una categoría
    const getSubcategories = (parentId: string) => {
    const parentIdNumber = Number(parentId); // Convierte el ID del padre (string) a número (20)
    
    // Filtra la categoría si el parent_id es null O si el parent_id (number) coincide con el parentIdNumber.
    return categories.filter(c => c.parent_id !== null && c.parent_id === parentIdNumber); 
    // ^ Este filtro ASUME que todos los parent_id de los hijos son number!
};

    // Abrir modal para crear
    const openCreateModal = (parentId: string | null = null) => {
        setModalMode('create');
        setFormData({ ...initialFormData, parent_id: parentId || '', iconPreviewUrl: null }); // <-- Limpiar preview
        setFormError(null);
        setShowModal(true);
    };

    // Abrir modal para editar
    const openEditModal = (category: Category) => {
        setModalMode('edit');

        const currentIconSlug = category.marker_icon_slug || 'default-pin';
        const iconUrl = `/icons/${currentIconSlug}.png`;

        setFormData({
            name: category.name,
            slug: category.slug,
            parent_id: category.parent_id ? String(category.parent_id) : '',
            marker_icon_slug: currentIconSlug, // Mantenemos el slug actual
            iconFile: null,
            iconPreviewUrl: iconUrl,
        });
        setFormError(null);
        setShowModal(true);
        setSelectedCategory(category.id);
    };

    // Guardar categoría (crear o editar)

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSending(true);

        const dataToSend = new FormData();
        
        // 1. Datos básicos
        dataToSend.append('name', formData.name);
        dataToSend.append('slug', formData.slug);
        
        if (formData.parent_id) {
            dataToSend.append('parent_id', formData.parent_id);
        }

        // 2. 🔥 LÓGICA CRÍTICA DEL ARCHIVO
        if (formData.iconFile) {
            // Si hay un archivo nuevo, lo enviamos
            dataToSend.append('iconFile', formData.iconFile);
            console.log('📤 Enviando archivo:', formData.iconFile.name);
        } else if (modalMode === 'edit') {
            // Si estamos editando y NO hay archivo nuevo, preservamos el slug actual
            dataToSend.append('marker_icon_slug', formData.marker_icon_slug || 'default-pin');
            console.log('📌 Preservando slug actual:', formData.marker_icon_slug);
        }

        // 3. 🔍 DEBUG: Verificar contenido de FormData
        console.log('--- 📦 CONTENIDO DE FORMDATA ---');
        for (const [key, value] of dataToSend.entries()) {
            if (value instanceof File) {
                console.log(`${key}: [File: ${value.name}]`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        console.log('--- FIN DEBUG ---');

        try {
            if (modalMode === 'create') {
                await axiosPrivate.post('/categories', dataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert('✅ Categoría creada exitosamente.');
            } else {
                await axiosPrivate.patch(`/categories/${selectedCategory}`, dataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert('✅ Categoría actualizada exitosamente.');
            }
            
            setFormData(initialFormData); 
            setShowModal(false);
            setSelectedCategory(null);
            fetchCategories();

        } catch (err: any) {
            console.error('❌ Error al guardar:', err);
            setFormError(err.response?.data?.error || 'Error al guardar categoría. Verifique el slug y la imagen.');
        } finally {
            setFormSending(false);
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
            
            {/* BOTÓN CREAR CATEGORÍA PRINCIPAL */}
            <button 
                onClick={() => openCreateModal()}
                className="mb-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                + Crear Categoría Principal
            </button>

            {/* LÓGICA DE CARGA Y ERROR */}
            {loading && <p>Cargando categorías...</p>}
            {error && <p className="text-red-600">Error: {error}</p>}

            {/* LISTADO DE CATEGORÍAS JERÁRQUICO */}
            {!loading && !error && mainCategories.length > 0 && (
                <div className="space-y-4">
                    {mainCategories.map((mainCat) => {
                        const subcats = getSubcategories(mainCat.id);
                        const mainIconUrl = `/icons/${mainCat.marker_icon_slug || 'default-pin'}.png`;
                        
                        return (
                            <div key={mainCat.id} className="border rounded-lg p-4 bg-white shadow">
                                {/* Cabecera de Categoría Principal */}
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                        {/* 🎨 ÍCONO DE CATEGORÍA PRINCIPAL */}
                                        <div className="flex-shrink-0">
                                            <img 
                                                src={mainIconUrl}
                                                alt={mainCat.name}
                                                className="w-10 h-10 object-contain border border-gray-300 rounded-md p-1"
                                                onError={(e) => {
                                                    if (!e.currentTarget.src.includes('default-pin')) {
                                                        e.currentTarget.src = '/icons/default-pin.png';
                                                    }
                                                }}
                                            />
                                        </div>
                                        
                                        {/* INFORMACIÓN DE CATEGORÍA */}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{mainCat.name}</h3>
                                            <p className="text-sm text-gray-500">Slug: {mainCat.slug}</p>
                                            <p className="text-xs text-gray-400">Ícono: {mainCat.marker_icon_slug || 'default-pin'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(mainCat)}
                                            className="text-blue-600 hover:text-blue-900 font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(mainCat.id)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>

                                {/* Subcategorías */}
                                <div className="ml-4 mt-3 border-l-2 border-gray-300 pl-4">
                                    {subcats.length > 0 ? (
                                        <div className="space-y-2">
                                            {subcats.map((subcat) => {
                                                const subIconUrl = `/icons/${subcat.marker_icon_slug || 'default-pin'}.png`;
                                                
                                                return (
                                                    <div key={subcat.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            {/* 🎨 ÍCONO DE SUBCATEGORÍA */}
                                                            <div className="flex-shrink-0">
                                                                <img 
                                                                    src={subIconUrl}
                                                                    alt={subcat.name}
                                                                    className="w-8 h-8 object-contain border border-gray-300 rounded p-0.5"
                                                                    onError={(e) => {
                                                                        if (!e.currentTarget.src.includes('default-pin')) {
                                                                            e.currentTarget.src = '/icons/default-pin.png';
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            
                                                            {/* INFORMACIÓN DE SUBCATEGORÍA */}
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-800">{subcat.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    Slug: {subcat.slug} | Ícono: {subcat.marker_icon_slug || 'default-pin'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex gap-2 ml-2">
                                                            <button
                                                                onClick={() => openEditModal(subcat)}
                                                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(subcat.id)}
                                                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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

            {/* MENSAJE SI NO HAY CATEGORÍAS */}
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
                            
                            {/* 1. Campo Nombre */}
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

                            {/* 2. Campo Slug */}
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

                            {/* 🚨 3. CAMPO DE SUBIDA DE ARCHIVO - CORREGIDO */}
                            <div className="border border-dashed border-gray-300 p-4 rounded-md bg-gray-50">
                                
                                {/* VISTA PREVIA DEL ÍCONO ACTUAL */}
                                {modalMode === 'edit' && formData.iconPreviewUrl && !formData.iconFile && (
                                    <div className="mb-3 flex items-center space-x-3">
                                        <span className="text-sm text-gray-600 font-medium">Ícono actual:</span>
                                        <img 
                                            src={formData.iconPreviewUrl} 
                                            alt={formData.marker_icon_slug || 'Ícono'} 
                                            className="w-10 h-10 object-contain border border-gray-400 p-1 rounded-sm"
                                            onError={(e) => { 
                                                if (!e.currentTarget.src.includes('default-pin')) {
                                                    e.currentTarget.src = '/icons/default-pin.png'; 
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                {/* VISTA PREVIA DEL NUEVO ARCHIVO SELECCIONADO */}
                                {formData.iconFile && (
                                    <div className="mb-3 flex items-center space-x-3">
                                        <span className="text-sm text-green-600 font-medium">Nuevo ícono seleccionado:</span>
                                        <img 
                                            src={URL.createObjectURL(formData.iconFile)} 
                                            alt="Preview" 
                                            className="w-10 h-10 object-contain border border-green-500 p-1 rounded-sm"
                                        />
                                    </div>
                                )}

                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {modalMode === 'edit' ? 'Cambiar Ícono (Opcional)' : 'Subir Ícono (Opcional)'}
                                </label>
                                
                                {/* 🔥 CRÍTICO: Input de Archivo CORREGIDO */}
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        console.log('📎 Archivo seleccionado:', file?.name); // Debug
                                        setFormData({ 
                                            ...formData, 
                                            iconFile: file
                                        });
                                    }}
                                    className="w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-white p-2"
                                />
                                
                                {/* Mensaje de confirmación */}
                                {formData.iconFile ? (
                                    <p className="mt-1 text-xs text-green-600">
                                        ✅ Nuevo archivo: {formData.iconFile.name}
                                    </p>
                                ) : modalMode === 'edit' && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Slug actual: <strong>{formData.marker_icon_slug}</strong>. Subir un nuevo archivo lo reemplazará.
                                    </p>
                                )}
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-100 border border-red-400 rounded text-red-700 text-sm">
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setFormData(initialFormData); // Limpiar estado
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSending}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {formSending ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
};