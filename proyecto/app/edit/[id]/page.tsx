'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { useAxiosPrivate } from '@/app/lib/axios';
import { LISTING_FIELDS, FormField } from '@/shared/listing-fields';

// Importa todos tus componentes
import TagInput from '@/app/components/TagInput';
import ImageUpload from '@/app/components/ImageUpload';
import { LocationData } from '@/app/components/LocationPicker';

// --- Componente Dinámico (copiado de la pág. de submit) ---
const DynamicField = ({ field, value, onChange }: { field: FormField, value: any, onChange: (value: any) => void }) => {
    const commonClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 text-white px-3 py-2";
    switch (field.type) {
        case 'textarea': return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={`${commonClasses} min-h-[120px]`} />;
        case 'text':
            if (field.key === 'tags' || field.key === 'amenities') {
                // Ahora le pasamos los tags iniciales
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

    // 1. ESTADO COMPLETO (copiado de la pág. de submit)
    const [listingType, setListingType] = useState<keyof typeof LISTING_FIELDS>('lugares');
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [details, setDetails] = useState<Record<string, any>>({});
    const [locationData, setLocationData] = useState<LocationData | null>(null);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    // Estados para gestión de imágenes (de nuestra versión anterior de 'edit')
    const [existingCover, setExistingCover] = useState<string | null>(null);
    const [existingGallery, setExistingGallery] = useState<string[]>([]);
    const [newCoverImage, setNewCoverImage] = useState<File[]>([]);
    const [newGalleryImages, setNewGalleryImages] = useState<File[]>([]);
    const [galleryImagesToDelete, setGalleryImagesToDelete] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // El mapa se carga dinámicamente
    const LocationPicker = useMemo(() => dynamic(() => import('@/app/components/LocationPicker'), { ssr: false }), []);
    
    // 2. CARGA DE DATOS INICIALES (useEffect mejorado)
    useEffect(() => {
        if (!id) return;
        const fetchListingData = async () => {
            try {
                const [listingRes, categoriesRes] = await Promise.all([
                    axiosPrivate.get(`/listings/${id}`),
                    axiosPrivate.get('/categories')
                ]);
                const data = listingRes.data;
                setCategories(categoriesRes.data);
                
                // Rellenamos TODO el estado del formulario
                setTitle(data.title);
                setCategoryId(data.category_id);
                setDetails(data.details || {});
                setListingType(data.listing_type_id === 2 ? 'eventos' : 'lugares'); // Lógica de ejemplo para el tipo
                
                // Rellenamos el estado de ubicación para el LocationPicker
                setLocationData({ 
                    lat: data.lat, 
                    lng: data.lng, 
                    address: data.address, 
                    city: data.details.city || 'Viedma', // Usamos valores por defecto si no existen
                    province: data.details.province || 'Río Negro'
                });
                
                // Rellenamos las imágenes existentes
                setExistingCover(data.cover_image_path);
                setExistingGallery(data.gallery_images || []);

            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchListingData();
    }, [id, axiosPrivate]);
    
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
        if (!locationData) return;
        setSubmitting(true);

        const formData = new FormData();
        formData.append('_method', 'PUT');

        // Añadimos TODOS los datos al FormData
        formData.append('title', title);
        formData.append('listingTypeId', listingType);
        formData.append('categoryId', categoryId);
        formData.append('details', JSON.stringify(details));
        formData.append('lat', locationData.lat.toString());
        formData.append('lng', locationData.lng.toString());
        formData.append('address', locationData.address);
        formData.append('city', locationData.city);
        formData.append('province', locationData.province);

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
    
    if (loading) return <p className="text-center text-lg p-10">Cargando editor...</p>;

    // 5. RENDERIZADO COMPLETO (UI de la pág. de submit adaptada)
    return (
        <main className="min-h-screen bg-gray-900 py-12 px-4 text-white">
            <div className="mx-auto max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-center">Editar Listado</h1>
                        <p className="text-center text-gray-400 mt-2">Modifica la información y guarda los cambios.</p>
                    </div>

                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Tipo de Listado</label>
                                <select value={listingType} onChange={e => setListingType(e.target.value as keyof typeof LISTING_FIELDS)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 px-3 py-2">
                                    <option value="lugares">Lugar</option>
                                    <option value="eventos">Evento</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Categoría</label>
                                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 px-3 py-2">
                                    <option value="" disabled>Selecciona...</option>
                                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Título del Listado</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 px-3 py-2" />
                        </div>
                    </div>

                    {locationData && <LocationPicker onLocationChange={setLocationData} initialLocation={locationData} />}

                    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-green-400">Imágenes</h2>
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
                            {existingGallery.length < 6 && <ImageUpload label={`Añadir más (${6 - existingGallery.length} disp.)`} maxFiles={6 - existingGallery.length} onFilesChange={setNewGalleryImages} />}
                        </div>
                    </div>

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