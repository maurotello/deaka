'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLngBounds, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useEffect, useRef } from 'react';
import MapEvents from './MapEvents';

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

// 1. ▼▼▼ NUEVO COMPONENTE CONTROLADOR ▼▼▼
// Su única función es controlar el mapa de forma imperativa.
function MapController({ 
    selectedListing, 
    markerRefs,
    onBoundsChange 
}: { 
  selectedListing: Listing | null, 
    markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>,
    onBoundsChange: (bounds: LatLngBounds) => void 
}) {
  const map = useMap(); // Este hook nos da la instancia del mapa de forma 100% segura.
  const isFlyingRef = useRef(false);
  useEffect(() => {
    if (selectedListing) {
      const marker = markerRefs.current[selectedListing.id];
      if (marker) {
        isFlyingRef.current = true;
         const flightDuration = 1.0;
        // Le damos al mapa la orden de moverse
        map.flyTo([selectedListing.latitude, selectedListing.longitude], 17, {
          animate: true,
          duration: flightDuration,
        });
        
        // Usamos un pequeño retraso para asegurar que cualquier animación del cluster termine
        // antes de intentar abrir el popup. Esto previene el parpadeo.
        // 2. Usamos un temporizador para abrir el popup y bajar la bandera DESPUÉS de la animación.
        setTimeout(() => {
          if (markerRefs.current[selectedListing.id]) {
            markerRefs.current[selectedListing.id]?.openPopup();
          }
          // Damos un pequeño margen extra antes de bajar la bandera.
          setTimeout(() => {
            isFlyingRef.current = false;
          }, 200); 
        }, flightDuration * 1000);
      }
    }
  }, [selectedListing, map, markerRefs]);

  // EFECTO PARA ESCUCHAR LOS MOVIMIENTOS DEL USUARIO
  useMapEvents({
    moveend: () => {
      // 3. Solo actualizamos los límites si el movimiento fue del usuario (bandera abajo).
      if (!isFlyingRef.current) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  return null; // Este componente no renderiza nada visible.
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

// 2. ▼▼▼ EL COMPONENTE PRINCIPAL AHORA ES MÁS SIMPLE ▼▼▼
const Map: React.FC<MapProps> = ({ listings, onBoundsChange, selectedListing }) => {
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  return (
    <MapContainer center={[-40.8135, -62.9967]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
      <MapEvents onBoundsChange={onBoundsChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup>
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
      </MarkerClusterGroup>
      
      {/* 3. ▼▼▼ AÑADIMOS NUESTRO CONTROLADOR COMO HIJO DEL MAPA ▼▼▼ */}
      <MapController selectedListing={selectedListing} markerRefs={markerRefs} onBoundsChange={onBoundsChange} />
    </MapContainer>
  );
};

export default Map;