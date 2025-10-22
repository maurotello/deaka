'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { LISTING_FIELDS, FormField } from '@/shared/listing-fields';
import TagInput from '@/app/components/TagInput';
import { LocationData } from '@/app/components/LocationPicker';
import ImageUpload from '@/app/components/ImageUpload'; 
import { useAuth } from '../context/AuthContext'; 

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

// =======================================================
// --- Componente auxiliar DynamicField (Se mantiene) ---
// =======================================================
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

// =======================================================
// --- Componente principal SubmitPage ---
// =======================================================
export default function SubmitPage() {
  const router = useRouter();
  const { auth } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Estados del Formulario General
  const [listingType, setListingType] = useState<keyof typeof LISTING_FIELDS>('lugares');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});
  const [coverImage, setCoverImage] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  // ESTADOS DE CATEGORÍAS (Fetching Dinámico)
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [mainCategoryId, setMainCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [categoryId, setCategoryId] = useState(''); // ID final para el formulario
  
  // ESTADOS DE GEOLOCALIZACIÓN (API Georef)
  const [provincias, setProvincias] = useState<GeoRefItem[]>([]);
  const [localidades, setLocalidades] = useState<GeoRefItem[]>([]);
  const [provinciaId, setProvinciaId] = useState('');
  const [localidadId, setLocalidadId] = useState('');
  

  // 🛑 NUEVO ESTADO PARA TIPOS DE LISTADO
  const [listingTypes, setListingTypes] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [listingTypeSlug, setListingTypeSlug] = useState<keyof typeof LISTING_FIELDS>('lugares'); // 🚨 CAMBIO DE NOMBRE: Ahora es el SLUG
  const [listingTypeId, setListingTypeId] = useState<string>(''); // 🚨 NUEVO ESTADO: ID NUMÉRICO para enviar al backend


  // Estado de Localización (Mapa) - CRÍTICO: Aquí se define el setter
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // OBTENER NOMBRES DE PROVINCIA Y LOCALIDAD PARA EL GEOCÓDIGO
  const selectedProvinceName = useMemo(() => {
      return provincias.find(p => p.id === provinciaId)?.nombre || '';
  }, [provincias, provinciaId]);

  const selectedCityName = useMemo(() => {
      return localidades.find(l => l.id === localidadId)?.nombre || '';
  }, [localidades, localidadId]);


  // ---------------------------------------------------
  // --- API: Tipos de Listado (Carga inicial) ---
  // ---------------------------------------------------
  
  // 🚨 NUEVO useEffect: Cargar tipos de listado
  useEffect(() => {
      const fetchListingTypes = async () => {
          try {
              // Usar la nueva ruta pública
              const response = await fetch('http://localhost:3001/api/listing-types'); 
              if (!response.ok) throw new Error('Error al cargar tipos de listado');
              const data = await response.json();
              setListingTypes(data);
              // 🚨 NUEVA LÓGICA: Establecer el ID del primer tipo como valor por defecto
              if (data.length > 0) {
                // 🚨 Buscamos el tipo 'lugares' por defecto para establecer el ID
                const defaultType = data.find((type: any) => type.slug === 'lugares') || data[0];
                
                // 1. Establece el ID numérico por defecto (para enviar al backend)
                setListingTypeId(defaultType.id.toString()); 
                
                // 2. Establece el slug por defecto (para el JSX y LISTING_FIELDS)
                setListingTypeSlug(defaultType.slug as keyof typeof LISTING_FIELDS); 
              }
          } catch (error) {
              console.error('No se pudieron cargar los tipos de listado', error);
          }
      };
      if (!isCheckingAuth) {
          fetchListingTypes();
      }
  }, [isCheckingAuth]); // Depende de la autenticación para no dispararse innecesariamente


  // ---------------------------------------------------
  // --- Efectos y Handlers de Autenticación y Carga ---
  // ---------------------------------------------------
  
  useEffect(() => {
    if (auth.user === null) { 
      router.push('/login');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router, auth.user]);

  // useEffect para sincronizar el 'categoryId' final para el envío
  useEffect(() => {
      setCategoryId(subCategoryId || mainCategoryId);
  }, [mainCategoryId, subCategoryId]);

  // ---------------------------------------------------
  // --- API: Categorías (Fetch Dinámico) ---
  // ---------------------------------------------------

  // 1. Cargar Categorías Principales al inicio
  useEffect(() => {
    const fetchMainCategories = async () => {
      if (isCheckingAuth) return;
      try {
        const response = await fetch('http://localhost:3001/api/categories');
        if (!response.ok) throw new Error('Network response was not ok');
        const data: Category[] = await response.json();

        // Ordenamiento alfabético
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

        setMainCategories(sortedData);
      } catch (error) {
        console.error('No se pudieron cargar las categorías principales', error);
      }
    };
    fetchMainCategories();
  }, [isCheckingAuth]);

  // Función para cargar Subcategorías
  const fetchSubcategories = useCallback(async (parentId: string) => {
      if (!parentId) {
          setSubcategories([]);
          return;
      }
      try {
          const response = await fetch(`http://localhost:3001/api/categories/${parentId}/subcategories`);
          if (!response.ok) throw new Error('Network response was not ok');
          const data: Category[] = await response.json();

          // Ordenamiento alfabético
          const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));

          setSubcategories(sortedData);
      } catch (error) {
          console.error(`Error al cargar subcategorías para ID ${parentId}`, error);
          setSubcategories([]);
      }
  }, []);

  // Handler para la Categoría Principal
  const handleMainCategoryChange = (id: string) => {
      setMainCategoryId(id);
      setSubCategoryId(''); 
      fetchSubcategories(id); 
  };

  const handleSubCategoryChange = (id: string) => {
      setSubCategoryId(id);
  };

  // ---------------------------------------------------
  // --- API: Geolocalización (API Georef) ---
  // ---------------------------------------------------
  
  // 1. Cargar Provincias al inicio
  useEffect(() => {
    const fetchProvincias = async () => {
        try {
            const response = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre');
            if (!response.ok) throw new Error('Error al cargar provincias');
            const data = await response.json();

            // Ordenamiento alfabético
            const sortedProvincias = data.provincias.sort((a: GeoRefItem, b: GeoRefItem) => a.nombre.localeCompare(b.nombre));

            setProvincias(sortedProvincias);
        } catch (error) {
            console.error('Error al cargar provincias:', error);
        }
    };
    fetchProvincias();
  }, []);

  // Función para cargar Localidades
  const fetchLocalidades = useCallback(async (idProvincia: string) => {
      if (!idProvincia) {
          setLocalidades([]);
          return;
      }
      try {
          const response = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${idProvincia}&max=1000&campos=id,nombre`);
          if (!response.ok) throw new Error('Error al cargar localidades');
          const data = await response.json();

          // Ordenamiento alfabético
          const sortedLocalidades = data.localidades.sort((a: GeoRefItem, b: GeoRefItem) => a.nombre.localeCompare(b.nombre));

          setLocalidades(sortedLocalidades);
      } catch (error) {
          console.error(`Error al cargar localidades para ID ${idProvincia}:`, error);
          setLocalidades([]);
      }
  }, []);

  // Handler para la Provincia
  const handleProvinciaChange = (id: string) => {
      setProvinciaId(id);
      setLocalidadId(''); 
      fetchLocalidades(id); 
  };

  // Handler para la Localidad
  const handleLocalidadChange = (id: string) => {
      setLocalidadId(id);
  };
  
  // ---------------------------------------------------
  // --- Handlers y Mapa Dinámico ---
  // ---------------------------------------------------

  const LocationPicker = useMemo(() => dynamic(
    () => import('@/app/components/LocationPicker'), 
    { ssr: false, loading: () => <p className="text-gray-400 text-center py-4">Cargando mapa...</p> }
  ), []);
  
  const resetForm = () => {
    setTitle('');
    setMainCategoryId('');
    setSubCategoryId('');
    setProvinciaId('');
    setLocalidadId('');
    setDetails({});
    setLocationData(null);
    setListingType('lugares');
    setListingTypeSlug('lugares'); // 🚨 USAR SLUG
    setListingTypeId(''); // 🚨 NUEVO: Limpiar el ID
    setCoverImage([]);
    setGalleryImages([]);
    setSubcategories([]); 
    setLocalidades([]); 
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
      router.push('/login');
      return;
    }

    if (!locationData) {
      alert('Por favor, establece una ubicación en el mapa.');
      setSubmissionStatus('idle');
      return;
    }

    if (!provinciaId || !localidadId) {
      alert('Por favor, selecciona Provincia y Localidad.');
      setSubmissionStatus('idle');
      return;
    }
    
    const formData = new FormData();

    // 1. IDs y Nombres (API Georef)
    formData.append('provinciaId', provinciaId); 
    formData.append('localidadId', localidadId);
    formData.append('provinceName', selectedProvinceName); 
    formData.append('cityName', selectedCityName);

    // 2. Datos de Listado y Categoría
    formData.append('title', title);
    // 🚨 CAMBIO CRÍTICO: Envía el listingTypeId
    formData.append('listingTypeId', listingTypeId);
    //formData.append('listingTypeId', listingType);
    formData.append('categoryId', categoryId); // ID final del listado
    
    // 3. Datos de Ubicación (del LocationPicker/Geocoding)
    formData.append('lat', locationData.lat.toString());
    formData.append('lng', locationData.lng.toString());
    formData.append('address', locationData.address); // CRÍTICO: Usar address del locationData
    formData.append('city', locationData.city); // CRÍTICO: Usar city del locationData
    formData.append('province', locationData.province); // CRÍTICO: Usar province del locationData
    
    // Los detalles (objeto)
    formData.append('details', JSON.stringify(details));

    // 4. Archivos
    if (coverImage && coverImage.length > 0) {
      formData.append('coverImage', coverImage[0]);
    }
    if (galleryImages && galleryImages.length > 0) {
      for (let i = 0; i < galleryImages.length; i++) {
        formData.append('galleryImages', galleryImages[i]);
      }
    }

    try {
      const response = await fetch('http://localhost:3001/api/listings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` 
        },
        body: formData, 
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Falló el envío del formulario');
      }
      
      setSubmissionStatus('success');
      setTimeout(() => setSubmissionStatus('idle'), 5000);
      resetForm(); 
    } catch (error: any) {
      console.error(error);
      setSubmissionStatus('error');
    }
  };
  
  const currentFields = LISTING_FIELDS[listingTypeSlug];
  const selectedCategoryIconSlug = [...mainCategories, ...subcategories].find(cat => cat.id === parseInt(categoryId, 10))?.marker_icon_slug || 'default-pin';

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-lg animate-pulse">Verificando autenticación...</p>
      </main>
    );
  }

  // ---------------------------------------------------
  // --- Renderizado JSX ---
  // ---------------------------------------------------
  return (
    <main className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* TÍTULO Y ESTADO */}
          <div>
            <h1 className="text-3xl font-bold text-center">Crear un nuevo listado</h1>
            <p className="text-center text-gray-400 mt-2">Completa la información para enviarlo a revisión.</p>
          </div>
          {submissionStatus === 'success' && <div className="rounded-md bg-green-800 p-4 text-center text-white">¡Listado enviado a revisión con éxito!</div>}
          {submissionStatus === 'error' && <div className="rounded-md bg-red-800 p-4 text-center text-white">Hubo un error al enviar. Intenta de nuevo.</div>}

          {/* SECCIÓN DE CATEGORÍA Y TIPO */}
          <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Tipo de Listado (AHORA DINÁMICO) */}
              <div>
                  <label className="block text-sm font-medium text-gray-300">Tipo de Listado</label>
                  <select 
                      value={listingTypeId}
                      // 🚨 El onChange debe seguir guardando el SLUG (que es el valor de la opción)
                      onChange={e => {
                        const newId = e.target.value;
                        setListingTypeId(newId);
                        // 🚨 Encontrar el slug correspondiente para actualizar los campos
                        const selectedType = listingTypes.find(type => type.id.toString() === newId);
                        if (selectedType) {
                            setListingTypeSlug(selectedType.slug as keyof typeof LISTING_FIELDS);
                        }
                      }}
                      className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white"
                  >
                      {/* Renderizar opciones desde el estado dinámico */}
                      {listingTypes.map(type => (
                          // 🚨 CRÍTICO: El valor debe ser el ID numérico
                          <option key={type.id} value={type.id.toString()}>{type.name}</option>
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
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2" />
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
          
          {/* LLAMADA AL LOCATION PICKER SIMPLIFICADO */}
          <LocationPicker 
              onLocationChange={setLocationData} // Este es el setter que preguntaste
              iconSlug={selectedCategoryIconSlug} 
              selectedCityName={selectedCityName} 
              selectedProvinceName={selectedProvinceName} 
          />

          {/* SECCIÓN DE IMÁGENES */}
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
          
          {/* SECCIÓN DE DETALLES */}
          <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-green-400">Detalles de "{listingType.replace('-', ' ')}"</h2>
            {currentFields.map((field: FormField) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-300 mb-1">{field.label}</label>
                <DynamicField field={field} value={details[field.key]} onChange={value => handleDetailChange(field.key, value)} />
              </div>
            ))}
          </div>
          
          {/* BOTÓN DE ENVÍO */}
          <button type="submit" disabled={submissionStatus === 'submitting'} className="w-full rounded-md bg-blue-600 px-4 py-3 text-lg font-bold text-white shadow-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
            {submissionStatus === 'submitting' ? 'Enviando...' : 'Enviar a Revisión'}
          </button>
        </form>
      </div>
    </main>
  );
}