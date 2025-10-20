'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LISTING_FIELDS, FormField } from '@/shared/listing-fields';
import TagInput from '@/app/components/TagInput';
import { LocationData } from '@/app/components/LocationPicker';
import ImageUpload from '@/app/components/ImageUpload'; // Importamos el nuevo componente
import { useAuth } from '../context/AuthContext'; // AÑADIR esta importación
import CustomCategorySelect from '@/app/components/CustomCategorySelect';


const DynamicField = ({ field, value, onChange }: { field: FormField, value: any, onChange: (value: any) => void }) => {
  const commonClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 text-white px-3 py-2";
  switch (field.type) {
    case 'textarea':
      return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={`${commonClasses} min-h-[120px]`} />;
    case 'text':
      if (field.key === 'tags' || field.key === 'amenities') {
        return <TagInput initialTags={value} onChange={onChange} />;
      }
      return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={commonClasses} />;
    default:
      return <input type={field.type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className={commonClasses} />;
  }
};

export default function SubmitPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [coverImage, setCoverImage] = useState<File[]>([]); // Usamos array para consistencia
  const [galleryImages, setGalleryImages] = useState<File[]>([]);


  useEffect(() => {
    if (auth.user === null) { 
        router.push('/login');
    } else {
        setIsCheckingAuth(false);
    }
  }, [router, auth.user]);

  const LocationPicker = useMemo(() => dynamic(
    () => import('@/app/components/LocationPicker'), 
    { ssr: false, loading: () => <p className="text-gray-400 text-center py-4">Cargando mapa...</p> }
  ), []);

  const [listingType, setListingType] = useState<keyof typeof LISTING_FIELDS>('lugares');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  //const [categories, setCategories] = useState<{ id: number; name: string; marker_icon_slug: string | null }[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string; marker_icon_slug: string | null; parent_id: number | null }[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/categories');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('No se pudieron cargar las categorías', error);
      }
    };
    if (!isCheckingAuth) { // Solo carga las categorías si el usuario está autenticado
        fetchCategories();
    }
  }, [isCheckingAuth]);

  const resetForm = () => {
    setTitle('');
    setCategoryId('');
    setDetails({});
    setLocationData(null);
    setListingType('lugares');
  };

  const handleDetailChange = (key: string, value: any) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  };

  
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionStatus('submitting');
    const token = auth.accessToken;

    if (!token) {
        setSubmissionStatus('error');
        // Esto debería ser redundante si el useEffect funciona, 
        // pero es una buena práctica defensiva.
        router.push('/login');
        return;
    }

    if (!locationData) {
      alert('Por favor, establece una ubicación en el mapa.');
      return;
    }
    

    // 1. Creamos un objeto FormData para poder enviar archivos y texto juntos.
    const formData = new FormData();

    // 2. Añadimos todos los campos de texto uno por uno.
    formData.append('title', title);
    formData.append('listingTypeId', listingType);
    formData.append('categoryId', categoryId);
    // Enviamos lat y lng por separado, como espera el backend con multer
    formData.append('lat', locationData.lat.toString());
    formData.append('lng', locationData.lng.toString());
    formData.append('address', locationData.address);
    formData.append('city', locationData.city);
    formData.append('province', locationData.province);
    // Los detalles (que son un objeto) los enviamos como un string de texto JSON
    formData.append('details', JSON.stringify(details));

    // 3. Añadimos los archivos (si existen)
    // El backend los buscará por los nombres 'coverImage' y 'galleryImages'
    if (coverImage && coverImage.length > 0) {
      formData.append('coverImage', coverImage[0]);
    }
    if (galleryImages && galleryImages.length > 0) {
      for (let i = 0; i < galleryImages.length; i++) {
        formData.append('galleryImages', galleryImages[i]);
      }
    }

    try {
      // 4. Hacemos la petición fetch con el FormData
      const response = await fetch('http://localhost:3001/api/listings', {
        method: 'POST',
        headers: {
          // ¡MUY IMPORTANTE! NO definimos 'Content-Type'. 
          // El navegador lo hará automáticamente al enviar FormData.
          'Authorization': `Bearer ${token}` 
        },
        body: formData, // Enviamos el objeto FormData directamente
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Falló el envío del formulario');
      }
      
      setSubmissionStatus('success');
      setTimeout(() => setSubmissionStatus('idle'), 5000);
      resetForm(); // Aquí también deberías resetear los estados de los archivos
    } catch (error: any) {
      console.error(error);
      setSubmissionStatus('error');
    }
  };
  
  const currentFields = LISTING_FIELDS[listingType];
  const selectedCategoryIconSlug = categories.find(cat => cat.id === parseInt(categoryId, 10))?.marker_icon_slug || null;

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Verificando autenticación...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-center">Crear un nuevo listado</h1>
            <p className="text-center text-gray-400 mt-2">Completa la información para enviarlo a revisión.</p>
          </div>

          {submissionStatus === 'success' && <div className="rounded-md bg-green-800 p-4 text-center text-white">¡Listado enviado a revisión con éxito!</div>}
          {submissionStatus === 'error' && <div className="rounded-md bg-red-800 p-4 text-center text-white">Hubo un error al enviar. Intenta de nuevo.</div>}

          <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300">Tipo de Listado</label>
                <select value={listingType} onChange={e => setListingType(e.target.value as keyof typeof LISTING_FIELDS)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2">
                    <option value="lugares">Lugar</option>
                    <option value="eventos">Evento</option>
                    <option value="trabajos">Trabajo</option>
                    <option value="bienes-raices">Bienes Raíces</option>
                    <option value="vehiculos">Vehículo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Categoría</label>
                {/* 🛑 REEMPLAZO DEL SELECT NATIVO POR EL COMPONENTE PERSONALIZADO */}
                <CustomCategorySelect
                  categories={categories}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Título del Listado</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2" />
            </div>
          </div>

          <LocationPicker onLocationChange={setLocationData} iconSlug={selectedCategoryIconSlug} />

          {/* ▼▼▼ SECCIÓN DE IMÁGENES AÑADIDA ▼▼▼ */}
          <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-green-400">Imágenes</h2>
            <ImageUpload 
              label="Imagen de Portada (Rectangular, Máx 2MB)"
              maxFiles={1}
              maxSizeMB={2}
              onFilesChange={setCoverImage}
            />
            <ImageUpload 
              label="Galería de Imágenes (Hasta 6, Máx 1MB c/u)"
              maxFiles={6}
              maxSizeMB={1}
              onFilesChange={setGalleryImages}
            />
          </div>
          
          <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-green-400">Detalles de "{listingType.replace('-', ' ')}"</h2>
            {currentFields.map((field: FormField) => (
                <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                    <DynamicField field={field} value={details[field.key]} onChange={value => handleDetailChange(field.key, value)} />
                </div>
            ))}
          </div>
          
          <button type="submit" disabled={submissionStatus === 'submitting'} className="w-full rounded-md bg-blue-600 px-4 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {submissionStatus === 'submitting' ? 'Enviando...' : 'Enviar a Revisión'}
          </button>
        </form>
      </div>
    </main>
  );
}