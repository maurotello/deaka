'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, FormEvent, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAxiosPrivate } from '@/app/lib/axios';
import { LISTING_FIELDS, FormField } from '@/shared/listing-fields';
import ImageUpload from '@/app/components/ImageUpload'; 
import TagInput from '@/app/components/TagInput';
import { LocationData } from '@/app/components/LocationPicker';


// Definición de tipos para las categorías
interface Category {
    id: number;
    name: string;
    marker_icon_slug: string | 'default-pin';
    parent_id: number | null;
}

// Definición de tipos para la georeferencia (API Georef)
interface GeoRefItem {
    id: string;
    nombre: string;
}


// --- Componente Dinámico (Se mantiene) ---
const DynamicField = ({ field, value, onChange }: { field: FormField, value: any, onChange: (value: any) => void }) => {
    const commonClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 text-white px-3 py-2";
    switch (field.type) {
        case 'textarea': return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={`${commonClasses} min-h-[120px]`} />;
        case 'text':
            if (field.key === 'tags' || field.key === 'amenities') {
                return <TagInput initialTags={value} onChange={onChange} />;
            }
            return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={commonClasses} />;
        default: return <input type={field.type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={commonClasses} />;
    }
};

// --- Componente Principal de Edición ---
export default function EditListingPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const axiosPrivate = useAxiosPrivate();

    // 1. ESTADOS DEL FORMULARIO
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState<Record<string, any>>({});
    
    // 🚨 NUEVOS ESTADOS DE LISTING TYPE
    const [listingTypes, setListingTypes] = useState<{ id: number; name: string; slug: string }[]>([]);
    const [listingType, setListingType] = useState<keyof typeof LISTING_FIELDS>('lugares'); // Usamos el slug

    // 🚨 ESTADOS DE CATEGORÍAS (Fetching Dinámico)
    const [allCategories, setAllCategories] = useState<Category[]>([]); // Almacenamos todas
    const [mainCategories, setMainCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Category[]>([]);
    const [mainCategoryId, setMainCategoryId] = useState('');
    const [subCategoryId, setSubCategoryId] = useState('');
    const [categoryId, setCategoryId] = useState(''); // ID final para el formulario

    // 🚨 ESTADOS DE GEOLOCALIZACIÓN (API Georef)
    const [provincias, setProvincias] = useState<GeoRefItem[]>([]);
    const [localidades, setLocalidades] = useState<GeoRefItem[]>([]);
    const [provinciaId, setProvinciaId] = useState('');
    const [localidadId, setLocalidadId] = useState('');
    
    // Estado de Localización (Mapa)
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    

    // Estados para gestión de imágenes
    const [existingCover, setExistingCover] = useState<string | null>(null);
    const [existingGallery, setExistingGallery] = useState<string[]>([]);
    const [newCoverImage, setNewCoverImage] = useState<File[]>([]);
    const [newGalleryImages, setNewGalleryImages] = useState<File[]>([]);
    const [galleryImagesToDelete, setGalleryImagesToDelete] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Mapas Dinámicos (useMemo)
    const LocationPicker = useMemo(() => dynamic(
        () => import('@/app/components/LocationPicker'), 
        { ssr: false, loading: () => <p className="text-gray-400 text-center py-4">Cargando mapa...</p> }
    ), []);
    
    // ---------------------------------------------------
    // --- Lógica de Nombres (Memoización) ---
    // ---------------------------------------------------

    const selectedProvinceName = useMemo(() => {
        return provincias.find(p => p.id === provinciaId)?.nombre || '';
    }, [provincias, provinciaId]);

    const selectedCityName = useMemo(() => {
        return localidades.find(l => l.id === localidadId)?.nombre || '';
    }, [localidades, localidadId]);

    // Lógica para obtener el icono
    const selectedCategoryIconSlug = useMemo(() => {
        const catArray = [...mainCategories, ...subcategories];
        return catArray.find(cat => cat.id === parseInt(categoryId, 10))?.marker_icon_slug || null;
    }, [categoryId, mainCategories, subcategories]);

    // ---------------------------------------------------
    // --- Handlers de Categorías (Reutilizados del Submit) ---
    // ---------------------------------------------------

    const fetchSubcategories = useCallback(async (parentId: string, currentSelectedId?: string) => {
        if (!parentId) {
            setSubcategories([]);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3001/api/categories/${parentId}/subcategories`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data: Category[] = await response.json();
            const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
            setSubcategories(sortedData);

            // 🚨 Re-seleccionar la subcategoría después de cargar (para el modo Edición)
            if (currentSelectedId && sortedData.some(c => c.id.toString() === currentSelectedId)) {
                setSubCategoryId(currentSelectedId);
            }
        } catch (error) {
            console.error(`Error al cargar subcategorías:`, error);
            setSubcategories([]);
        }
    }, []);

    const handleMainCategoryChange = (id: string) => {
        setMainCategoryId(id);
        setSubCategoryId(''); 
        fetchSubcategories(id); 
    };

    const handleSubCategoryChange = (id: string) => {
        setSubCategoryId(id);
    };

    // useEffect para sincronizar el 'categoryId' final para el envío
    useEffect(() => {
        setCategoryId(subCategoryId || mainCategoryId);
    }, [mainCategoryId, subCategoryId]);

    // ---------------------------------------------------
    // --- Handlers de Geolocalización (Reutilizados del Submit) ---
    // ---------------------------------------------------

    const fetchLocalidades = useCallback(async (idProvincia: string, currentSelectedId?: string) => {
        if (!idProvincia) {
            setLocalidades([]);
            return;
        }
        try {
            const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${idProvincia}&max=1000&campos=id,nombre`);
            if (!response.ok) throw new Error('Error al cargar localidades');
            const data = await response.json();
            const sortedLocalidades = data.localidades.sort((a: GeoRefItem, b: GeoRefItem) => a.nombre.localeCompare(b.nombre));
            setLocalidades(sortedLocalidades);

            // 🚨 Re-seleccionar la localidad después de cargar (para el modo Edición)
            if (currentSelectedId && sortedLocalidades.some((l: GeoRefItem) => l.id === currentSelectedId)) {
                setLocalidadId(currentSelectedId);
            }
        } catch (error) {
            console.error(`Error al cargar localidades:`, error);
            setLocalidades([]);
        }
    }, []);

    const handleProvinciaChange = (id: string) => {
        setProvinciaId(id);
        setLocalidadId(''); 
        fetchLocalidades(id); 
    };

    const handleLocalidadChange = (id: string) => {
        setLocalidadId(id);
    };

    // ---------------------------------------------------
    // --- Lógica de Carga Inicial (Multi-Fetch) ---
    // ---------------------------------------------------
    
    // Función auxiliar para mapear ID a slug (inverso del submit)
    const mapListingIdToSlug = (id: number) => {
        const type = listingTypes.find(t => t.id === id);
        return type ? type.slug : 'lugares';
    };

    useEffect(() => {
        if (!id) return;
        const fetchDependencies = async () => {
            try {
                // 1. Fetch de todas las dependencias (en paralelo)
                const [listingRes, categoriesRes, listingTypesRes, provinciasRes] = await Promise.all([
                    axiosPrivate.get(`/listings/${id}`),
                    axiosPrivate.get('/categories/all'), // Obtenemos TODAS para el mapeo
                    axiosPrivate.get('/listing-types'),
                    fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre').then(res => res.json())
                ]);

                // 2. Procesar datos y ordenamiento
                setAllCategories(categoriesRes.data);
                setListingTypes(listingTypesRes.data);
                const sortedProvincias = provinciasRes.provincias.sort((a: GeoRefItem, b: GeoRefItem) => a.nombre.localeCompare(b.nombre));
                setProvincias(sortedProvincias);

                const data = listingRes.data;
                const details = data.details || {};
                
                // 3. Establecer el estado principal del formulario
                setTitle(data.title);
                setDetails(details);
                setExistingCover(data.cover_image_path);
                setExistingGallery(data.gallery_images || []);
                
                // 4. Mapear y establecer Tipo de Listado
                const typeSlug = mapListingIdToSlug(data.listing_type_id);
                setListingType(typeSlug as keyof typeof LISTING_FIELDS); 
                
                // 5. Mapear y establecer Categorías
                const parentCat = allCategories.find(c => c.id === data.category_id)?.parent_id;
                
                const mainCatId = parentCat ? parentCat.toString() : data.category_id.toString();
                const subCatId = parentCat ? data.category_id.toString() : ''; // Si tiene padre, es la subcat
                
                setMainCategoryId(mainCatId);
                setSubCategoryId(subCatId); 

                // 6. Mapear y establecer Geolocalización
                const initialProvinciaId = details.provincia_id || '';
                const initialLocalidadId = details.localidad_id || '';
                setProvinciaId(initialProvinciaId); 
                setLocalidadId(initialLocalidadId);

                // 7. Establecer LocationData para el mapa (usa los nombres guardados en la DB)
                setLocationData({ 
                    lat: data.lat, 
                    lng: data.lng, 
                    address: data.address, 
                    city: data.city || details.city_name || '', // Nombre de la ciudad guardada
                    province: data.province || details.province_name || '' // Nombre de la provincia guardada
                });

                // 8. Disparar fetch dinámico para rellenar los selects dependientes
                const mainCats = categoriesRes.data.filter((c: Category) => c.parent_id === null);
                setMainCategories(mainCats.sort((a, b) => a.name.localeCompare(b.name)));
                
                if (parentCat) {
                    await fetchSubcategories(mainCatId, subCatId); // Carga subcategorías y re-selecciona
                }
                if (initialProvinciaId) {
                    await fetchLocalidades(initialProvinciaId, initialLocalidadId); // Carga localidades y re-selecciona
                }

            } catch (err) { 
                console.error("Error al cargar datos del listado:", err); 
                router.push('/my-listings'); // Redirigir si falla la carga
            } finally { 
                setLoading(false); 
            }
        };
        fetchDependencies();
    }, [id, axiosPrivate, router, fetchSubcategories, fetchLocalidades, allCategories, listingTypes]);


    // 3. LÓGICA DE IMÁGENES (sin cambios)
    const handleCoverDelete = () => setExistingCover(null);
    const handleGalleryDelete = (filename: string) => {
        setExistingGallery(prev => prev.filter(name => name !== filename));
        setGalleryImagesToDelete(prev => [...prev, filename]);
    };
    
    // 4. LÓGICA DEL FORMULARIO
    const handleDetailChange = (key: string, value: any) => setDetails(prev => ({ ...prev, [key]: value }));
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!locationData || !provinciaId || !localidadId) return; // Validaciones mínimas
        setSubmitting(true);

        const formData = new FormData();
        formData.append('_method', 'PUT'); // Para simular PATCH en Multer

        // Añadimos TODOS los datos al FormData
        formData.append('title', title);
        formData.append('listingTypeId', listingType);
        formData.append('categoryId', categoryId);
        formData.append('details', JSON.stringify(details));
        
        // Datos de ubicación y georef
        formData.append('lat', locationData.lat.toString());
        formData.append('lng', locationData.lng.toString());
        formData.append('address', locationData.address);
        formData.append('city', locationData.city); // Nombre de ciudad/localidad
        formData.append('province', locationData.province); // Nombre de provincia
        formData.append('provinciaId', provinciaId); 
        formData.append('localidadId', localidadId);

        // Lógica de imágenes
        if (!existingCover) formData.append('deleteCoverImage', 'true');
        formData.append('galleryImagesToDelete', JSON.stringify(galleryImagesToDelete));
        if (newCoverImage.length > 0) formData.append('coverImage', newCoverImage[0]);
        newGalleryImages.forEach(file => formData.append('galleryImages', file));

        try {
            await axiosPrivate.post(`/listings/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            router.push('/my-listings');
        } catch (err) { console.error(err); } 
        finally { setSubmitting(false); }
    };
    
    if (loading) return <p className="text-center text-lg p-10 bg-gray-900 text-white min-h-screen">Cargando editor...</p>;

    // 5. RENDERIZADO COMPLETO (UI de la pág. de submit adaptada)
    return (
        <main className="min-h-screen bg-gray-900 py-12 px-4 text-white">
            <div className="mx-auto max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-center">Editar Listado</h1>
                        <p className="text-center text-gray-400 mt-2">Modifica la información y guarda los cambios.</p>
                    </div>

                    {/* SECCIÓN DE CATEGORÍA Y TIPO */}
                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Tipo de Listado (DINÁMICO) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Tipo de Listado</label>
                                <select 
                                    value={listingType} 
                                    onChange={e => setListingType(e.target.value as keyof typeof LISTING_FIELDS)} 
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white"
                                >
                                    {listingTypes.map(type => (
                                        <option key={type.id} value={type.slug}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* SELECTOR 1: Categoría Principal */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Categoría Principal</label>
                                <select 
                                    value={mainCategoryId} 
                                    onChange={e => handleMainCategoryChange(e.target.value)} 
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white"
                                >
                                    <option value="">Selecciona la categoría...</option>
                                    {mainCategories.map(cat => (
                                        <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* SELECTOR 2: Subcategoría (Dependiente) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Subcategoría</label>
                                <select 
                                    value={subCategoryId} 
                                    onChange={e => handleSubCategoryChange(e.target.value)} 
                                    disabled={!mainCategoryId || subcategories.length === 0} 
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {mainCategoryId ? 
                                            (subcategories.length > 0 ? 'Selecciona la subcategoría...' : 'No aplica o sin subcategorías') 
                                            : 'Selecciona una Categoría Principal'
                                        }
                                    </option>
                                    {subcategories.map(cat => (
                                        <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300">Título del Listado</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 px-3 py-2" />
                        </div>
                    </div>
                    
                    {/* SECCIÓN DE GEOLOCALIZACIÓN (API Georef) */}
                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-green-400">Ubicación Geográfica (Argentina)</h2>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            
                            {/* SELECTOR 1: Provincia */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Provincia</label>
                                <select 
                                    value={provinciaId} 
                                    onChange={e => handleProvinciaChange(e.target.value)} 
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white"
                                >
                                    <option value="">Selecciona una provincia...</option>
                                    {provincias.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* SELECTOR 2: Localidad (Dependiente) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Localidad</label>
                                <select 
                                    value={localidadId} 
                                    onChange={e => handleLocalidadChange(e.target.value)} 
                                    disabled={!provinciaId || localidades.length === 0} 
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {provinciaId ? 
                                            (localidades.length > 0 ? 'Selecciona una localidad...' : 'Sin localidades en esta provincia') 
                                            : 'Selecciona una Provincia primero'
                                        }
                                    </option>
                                    {localidades.map(l => (
                                        <option key={l.id} value={l.id}>{l.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* LLAMADA AL LOCATION PICKER */}
                    {locationData && (
                        <LocationPicker 
                            onLocationChange={setLocationData} 
                            initialLocation={locationData} 
                            iconSlug={selectedCategoryIconSlug} 
                            selectedCityName={selectedCityName} 
                            selectedProvinceName={selectedProvinceName} 
                        />
                    )}

                    {/* SECCIÓN DE IMÁGENES */}
                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-green-400">Imágenes</h2>
                        {/* Portada */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Portada</label>
                            {existingCover && (
                                <div className="relative w-48 h-32 mb-2">
                                    <img src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/${id}/coverImage/${existingCover}`} alt="Portada" className="w-full h-full object-cover rounded-md"/>
                                    <button type="button" onClick={handleCoverDelete} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6">&times;</button>
                                </div>
                            )}
                            <ImageUpload label={existingCover ? "Reemplazar portada" : "Subir portada"} maxFiles={1} onFilesChange={setNewCoverImage} />
                        </div>
                        
                        {/* Galería */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Galería (Máx 6)</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-4">
                                {existingGallery.map(filename => (
                                    <div key={filename} className="relative aspect-square">
                                        <img src={`${process.env.NEXT_PUBLIC_API_BASE_URL}/uploads/${id}/galleryImages/${filename}`} alt="Galería" className="w-full h-full object-cover rounded-md"/>
                                        <button type="button" onClick={() => handleGalleryDelete(filename)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6">&times;</button>
                                    </div>
                                ))}
                            </div>
                            {existingGallery.length + newGalleryImages.length < 6 && <ImageUpload label={`Añadir más (${6 - existingGallery.length - newGalleryImages.length} disp.)`} maxFiles={6 - existingGallery.length - newGalleryImages.length} onFilesChange={setNewGalleryImages} />}
                        </div>
                    </div>

                    {/* SECCIÓN DE DETALLES */}
                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-green-400">Detalles de "{listingType.replace('-', ' ')}"</h2>
                        {LISTING_FIELDS[listingType].map((field: FormField) => (
                            <div key={field.key}>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                                <DynamicField field={field} value={details[field.key]} onChange={value => handleDetailChange(field.key, value)} />
                            </div>
                        ))}
                    </div>
                    
                    <button type="submit" disabled={submitting} className="w-full rounded-md bg-blue-600 px-4 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700 disabled:bg-gray-500">
                        {submitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </form>
            </div>
        </main>
    );
}