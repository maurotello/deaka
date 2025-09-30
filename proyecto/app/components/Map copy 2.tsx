'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLngBounds, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useEffect, useRef, useState } from 'react';
//import MapEvents from './MapEvents';

// Configurar los iconos por defecto de Leaflet para evitar problemas de carga
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: '/icons/default.png',
  iconUrl: '/icons/default.png',
  shadowUrl: '/icons/default.png', // Puedes usar una imagen de sombra si tienes una
});

type Listing = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | null;
};

interface MapProps {
  listings: Listing[];
  onBoundsChange: (bounds: LatLngBounds) => void;
  selectedListing: Listing | null;
}

interface MapControllerProps {
  selectedListing: Listing | null;
  markerRefs: React.RefObject<Record<string, LeafletMarker | null>>;
  onBoundsChange: (bounds: LatLngBounds) => void;
}

function MapController({ 
    selectedListing, 
    markerRefs,
    onBoundsChange 
}: { 
  selectedListing: Listing | null, 
  markerRefs: React.RefObject<Record<string, LeafletMarker | null>>,
  onBoundsChange: (bounds: LatLngBounds) => void 
}) {
  const map = useMap();
  const isMovingRef = useRef(false);
  
  useEffect(() => {
    if (selectedListing) {
      const marker = markerRefs.current[selectedListing.id];
      if (marker) {
        isMovingRef.current = true;
        
        // Centrar el mapa en el marcador
        map.flyTo([selectedListing.latitude, selectedListing.longitude], 17, {
          animate: true,
          duration: 1.0,
        });
        
        // Abrir el popup después de un pequeño retraso
        setTimeout(() => {
          marker.openPopup();
          isMovingRef.current = false;
        }, 1200); // Un poco más que la duración de flyTo
      }
    }
  }, [selectedListing, map, markerRefs]);

  // Manejar eventos del mapa solo si no estamos en movimiento programático
  useMapEvents({
    moveend: () => {
      if (!isMovingRef.current) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  return null;
}

// Funciones para crear los íconos (sin cambios)
const defaultIcon = new Icon({
  iconUrl: '/icons/default.png',
  iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38],
});

const createCustomIcon = (slug: string | null): Icon => {
  if (!slug) return defaultIcon;
  return new Icon({
    iconUrl: `/icons/${slug}.png`,
    iconSize: [38, 38], iconAnchor: [19, 38], popupAnchor: [0, -38],
  });
};

// Eliminamos el componente MapRefresher ya que no es necesario
const Map: React.FC<MapProps> = ({ listings, onBoundsChange, selectedListing }) => {
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  return (
    <MapContainer center={[-40.8135, -62.9967]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
      <MapEvents onBoundsChange={onBoundsChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listings.map((listing) => {
        const customIcon = createCustomIcon(listing.marker_icon_slug);
        return (
          <Marker
            key={listing.id}
            position={[listing.latitude, listing.longitude]}
            icon={customIcon}
            ref={(el) => {
              markerRefs.current[listing.id] = el;
            }}
          >
            <Popup>
              <span className="font-bold">{listing.title}</span>
            </Popup>
          </Marker>
        );
      })}
      
      <MapController selectedListing={selectedListing} markerRefs={markerRefs} onBoundsChange={onBoundsChange} />
    </MapContainer>
  );
};

export default Map;