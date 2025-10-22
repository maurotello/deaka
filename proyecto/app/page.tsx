'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LatLngBounds } from 'leaflet'; 
import { useDebounce } from '@/app/hooks/useDebounce'; 
import SearchBar from '@/app/components/SearchBar'; 
import { useAuth } from '@/app/context/AuthContext';

// 🚨 NUEVA IMPORTACIÓN
import FilterPanel from '@/app/components/FilterPanel'; 


// ▼▼▼ TIPOS ACTUALIZADOS ▼▼▼
// 🚨 Tipo Listing actualizado con las dimensiones calculadas del backend
type Listing = {
  id: string;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | 'default-pin'; 
  icon_calculated_width: number; // Dimensiones calculadas para proporcionalidad
  icon_calculated_height: number;
};

// 🚨 Tipo base para las listas de filtros
type FilterItem = {
    id: string;
    name: string;
};


export default function HomePage() {
  const { auth } = useAuth();

  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 🚨 ESTADOS CENTRALES DE FILTRO
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // 🚨 ESTADOS PARA POBLAR SELECTORES
  const [categories, setCategories] = useState<FilterItem[]>([]);
  const [listingTypes, setListingTypes] = useState<FilterItem[]>([]);

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

    // 🚨 1. useEffect para cargar los datos base de los filtros
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                // Asumo endpoints para obtener todas las categorías y tipos de listado
                const [catResponse, typeResponse] = await Promise.all([
                    fetch('http://localhost:3001/api/categories/all'), 
                    fetch('http://localhost:3001/api/listing-types') 
                ]);

                if (catResponse.ok) {
                    const data = await catResponse.json();
                    setCategories(data.map((c: any) => ({ id: c.id, name: c.name })));
                }
                if (typeResponse.ok) {
                    const data = await typeResponse.json();
                    setListingTypes(data.map((t: any) => ({ id: t.id, name: t.name })));
                }
            } catch (err) {
                console.error("Error al cargar datos de filtros:", err);
            }
        };

        fetchFilterData();
    }, []); 

    // 🚨 2. useEffect principal para cargar los listados (ahora con más dependencias)
  useEffect(() => {
    // No buscar si el mapa aún no nos ha informado de sus límites iniciales
    if (!mapBounds) return;

    const fetchListings = async () => {
      try {
        // Construimos la URL con los parámetros dinámicos
        const boundsString = `${mapBounds.getWest()},${mapBounds.getSouth()},${mapBounds.getEast()},${mapBounds.getNorth()}`;
        let url = `http://localhost:3001/api/listings?bbox=${boundsString}`;
        
        // 🚨 AÑADIR PARÁMETROS DE FILTRADO A LA URL
        if (debouncedSearchTerm.length > 2) {
          url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
        }
        if (selectedCategory) {
            url += `&categoryIds=${selectedCategory}`; 
        }
        if (selectedType) {
            url += `&listingTypeIds=${selectedType}`;
        }
        // Nota: Si quieres enviar solo subcategorías, necesitarías una lógica más avanzada aquí. 
        // Por ahora, enviamos el ID principal o subcategoría seleccionada.

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
    // 🚨 NUEVAS DEPENDENCIAS: El efecto se dispara cuando cualquiera de estos cambie
  }, [debouncedSearchTerm, mapBounds, selectedCategory, selectedType]); 

  const selectedListing = listings.find(l => l.id === selectedListingId) || null;


  return (
    <main className="w-screen h-screen relative">
      {/* 🚨 REEMPLAZAMOS SearchBar con FilterPanel (que lo contiene) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-11/12 md:w-2/3">
        <FilterPanel
            // Props de SearchBar
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm}
            searchResults={listings} 
            onResultClick={(id: string) => setSelectedListingId(id)}
            
            // Props para los Selectores
            categories={categories}
            listingTypes={listingTypes}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
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