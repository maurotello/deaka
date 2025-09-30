'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LatLngBounds } from 'leaflet'; // <-- AÑADIR: para los tipos de los límites del mapa
import { useDebounce } from '@/app/hooks/useDebounce'; // <-- AÑADIR: nuestro hook de debounce
import SearchBar from '@/app/components/SearchBar'; // <-- AÑADIR: el componente de la barra


// ▼▼▼ AQUÍ ESTÁ LA CORRECCIÓN ▼▼▼
// Actualizamos el tipo "Listing" para que coincida con los datos REALES de la API.
type Listing = {
  id: string;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | null; // <-- La propiedad que faltaba
};

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms de espera
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const MapComponent = useMemo(() => dynamic(
    () => import('@/app/components/Map'),
    { 
      loading: () => <p className="text-center text-4xl font-bold">Cargando mapa...</p>,
      ssr: false
    }
  ), []);

  useEffect(() => {
    // No buscar si el mapa aún no nos ha informado de sus límites iniciales
    if (!mapBounds) return;

    const fetchListings = async () => {
      try {
        // Construimos la URL con los parámetros dinámicos
        const boundsString = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
        let url = `http://localhost:3001/api/listings?bbox=${boundsString}`;
        
        // Solo añadimos el parámetro de búsqueda si tiene más de 2 letras
        if (debouncedSearchTerm.length > 2) {
          url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Error en la respuesta de la API');
        
        const data = await response.json();
        setListings(data);
      } catch (err) {
        setError('No se pudieron cargar los negocios.');
        console.error(err);
      }
    };

    fetchListings();
  }, [debouncedSearchTerm, mapBounds]); // Se ejecuta cuando el término (retrasado) o los límites cambian

  const selectedListing = listings.find(l => l.id === selectedListingId) || null;


  return (
    <main className="w-screen h-screen relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-11/12 md:w-1/2 lg:w-2/3">
        <SearchBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm}
          results={listings} // <-- AÑADIMOS ESTA LÍNEA
          onResultClick={(id) => setSelectedListingId(id)}
      />
      </div>
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] p-4 bg-red-600 text-white rounded-md shadow-lg">
            {error}
        </div>
      )}
      
      <MapComponent 
        listings={listings} 
        onBoundsChange={setMapBounds}
        selectedListing={selectedListing}
      />
    </main>
  );
}