'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LISTING_FIELDS, FormField } from '@/shared/listing-fields';
import TagInput from '@/app/components/TagInput';
import { LocationData } from '@/app/components/LocationPicker'; // Importamos el tipo

type ListingTypeSlug = keyof typeof LISTING_FIELDS;

// Pequeño componente para renderizar campos dinámicamente
const DynamicField = ({ field, value, onChange }: { field: FormField, value: any, onChange: (value: any) => void }) => {
  switch (field.type) {
    case 'textarea':
      return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className="mt-1 block w-full min-h-[100px] rounded-md bg-gray-700 border-gray-500" />;
    case 'text':
        if (field.key === 'tags' || field.key === 'amenities') {
            return <TagInput onChange={onChange} />;
        }
        return <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500" />;
    default:
      return <input type={field.type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500" />;
  }
};


export default function SubmitPage() {
  // Estados del formulario
  const [listingType, setListingType] = useState<ListingTypeSlug>('lugares');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [details, setDetails] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [categories, setCategories] = useState<{ id: number; name: string; marker_icon_slug: string | null }[]>([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Viedma');
  const [province, setProvince] = useState('Río Negro');
  
  // ▼▼▼ CARGAMOS EL COMPONENTE DE MAPA DE FORMA DINÁMICA ▼▼▼
 
  const LocationPicker = useMemo(() => dynamic(() => import('@/app/components/LocationPicker'), { ssr: false }), []);



  // Cargar categorías al inicio
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
    fetchCategories();
  }, []);

  const resetForm = () => {
      setTitle('');
      setCategoryId('');
      setDetails({});
      setLocation(null);
      setListingType('lugares');
  };

  const handleDetailChange = (key: string, value: any) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationData) {
      alert('Por favor, establece una ubicación en el mapa.');
      return;
    }
    setSubmissionStatus('submitting');
    
    // ▼▼▼ LA CORRECCIÓN ESTÁ AQUÍ ▼▼▼
    // Creamos un objeto 'details' que incluye la dirección textual
    const finalDetails = {
        ...details, // Los campos dinámicos (descripción, etc.)
        address: locationData.address,
        city: locationData.city,
        province: locationData.province
    };
    
    const submissionData = { 
      title, 
      listingTypeId: listingType, 
      categoryId: parseInt(categoryId, 10), 
      // Nos aseguramos de enviar solo lat y lng en la propiedad 'location'
      location: { lat: locationData.lat, lng: locationData.lng },
      // Y el resto de los datos en 'details'
      details: finalDetails,
    };

    try {
      const response = await fetch('http://localhost:3001/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        // Obtenemos más detalles del error del backend
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Falló el envío del formulario');
      }
      
      setSubmissionStatus('success');
      resetForm();
    } catch (error) {
      console.error(error);
      setSubmissionStatus('error');
    }
  };
  
  const currentFields = LISTING_FIELDS[listingType];
  // ▼▼▼ Buscamos el slug del ícono de la categoría seleccionada ▼▼▼
  const selectedCategoryIconSlug = categories.find(cat => cat.id === parseInt(categoryId, 10))?.marker_icon_slug || null;

  return (
    <main className="min-h-screen bg-gray-900 p-8 text-white">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Crear un nuevo listado</h1>
        
        {submissionStatus === 'success' && <div className="rounded-md bg-green-800 p-4 text-center text-white">¡Listado enviado a revisión con éxito!</div>}
        {submissionStatus === 'error' && <div className="rounded-md bg-red-800 p-4 text-center text-white">Hubo un error al enviar. Intenta de nuevo.</div>}

        <div className="space-y-4 rounded-lg border border-gray-600 p-4">
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium">Tipo de Listado</label>
            <select value={listingType} onChange={e => setListingType(e.target.value as ListingTypeSlug)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500">
              <option value="lugares">Lugar</option>
              <option value="eventos">Evento</option>
              <option value="trabajos">Trabajo</option>
              <option value="bienes-raices">Bienes Raíces</option>
              <option value="vehiculos">Vehículo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Título del Listado</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium">Categoría</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500">
              <option value="" disabled>Selecciona una categoría...</option>
              {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
            </select>
          </div>
          <div>
              <label>Provincia</label>
              <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700"/>
          </div>
          <div>
              <label>Localidad</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700"/>
          </div>
        </div>

        
        
        <LocationPicker 
            onLocationChange={(data) => setLocationData(data)} // <-- Y aquí
            iconSlug={selectedCategoryIconSlug} 
        />
        
        <div className="space-y-4 rounded-lg border border-gray-600 p-4">
            <h2 className="text-lg font-semibold">Detalles de "{listingType.replace('-', ' ')}"</h2>
            {currentFields.map((field: FormField) => (
                <div key={field.key}>
                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                    <DynamicField field={field} value={details[field.key]} onChange={value => handleDetailChange(field.key, value)} />
                </div>
            ))}
        </div>
        
        <button type="submit" disabled={submissionStatus === 'submitting'} className="w-full rounded-md bg-blue-600 px-4 py-3 text-lg font-bold text-white hover:bg-blue-700 disabled:bg-gray-500">
          {submissionStatus === 'submitting' ? 'Enviando...' : 'Enviar a Revisión'}
        </button>
      </form>
    </main>
  );
}