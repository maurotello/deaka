'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';

// ▼▼▼ AQUÍ ESTÁ LA CORRECCIÓN ▼▼▼
// Actualizamos el tipo "Listing" para que coincida con los datos REALES de la API.
type Listing = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | null; // <-- La propiedad que faltaba
};

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const MapComponent = useMemo(() => dynamic(
    () => import('@/app/components/Map'),
    { 
      loading: () => <p className="text-center text-4xl font-bold">Cargando mapa...</p>,
      ssr: false
    }
  ), []);

  useEffect(() => {
    fetch('http://localhost:3001/api/listings')
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al obtener los datos de la API');
        }
        return response.json();
      })
      .then((data: Listing[]) => {
        console.log('DATOS CRUDOS RECIBIDOS DE LA API:', data);
        setListings(data);
      })
      .catch(err => {
        console.error(err);
        setError('No se pudieron cargar los negocios.');
      });
  }, []);

  return (
    <main className="w-screen h-screen">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] p-4 bg-red-600 text-white rounded-md shadow-lg">
            {error}
        </div>
      )}
      
      <MapComponent listings={listings} />
    </main>
  );
}