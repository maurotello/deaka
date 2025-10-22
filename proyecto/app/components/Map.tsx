'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { Icon, LatLngBounds, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { useEffect, useRef } from 'react';

// ------ TIPOS ------
type Listing = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | 'default-pin';
};

interface MapProps {
  listings: Listing[];
  onBoundsChange: (bounds: LatLngBounds) => void;
  selectedListing: Listing | null;
}

// ------ COMPONENTE CONTROLADOR ------
function MapController({ 
    selectedListing, 
    markerRefs,
    onBoundsChange 
}: { 
    selectedListing: Listing | null, 
    markerRefs: React.MutableRefObject<Record<string, LeafletMarker | null>>,
    onBoundsChange: (bounds: LatLngBounds) => void 
}) {
  const map = useMap();
  const isFlyingRef = useRef(false);

  // ▼▼▼ MEJORA CLAVE PARA LA CARGA INICIAL ▼▼▼
  useEffect(() => {
    // Cuando el controlador se monta por primera vez, le decimos a la página
    // cuáles son los límites iniciales del mapa para que haga la primera búsqueda.
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  // Efecto para centrar el mapa al seleccionar un listado
  useEffect(() => {
    if (selectedListing) {
      const marker = markerRefs.current[selectedListing.id];
      if (marker) {
        isFlyingRef.current = true;
        const flightDuration = 1.0;

        map.flyTo([selectedListing.latitude, selectedListing.longitude], 17, {
          animate: true,
          duration: flightDuration,
        });
        
        setTimeout(() => {
          marker.openPopup();
          setTimeout(() => {
            isFlyingRef.current = false;
          }, 200); 
        }, flightDuration * 1000);
      }
    }
  }, [selectedListing, map, markerRefs]);

  // Efecto para escuchar los movimientos del usuario
  useMapEvents({
    moveend: () => {
      if (!isFlyingRef.current) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  return null;
}

// ------ LÓGICA DE ÍCONOS ------
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

// ------ COMPONENTE PRINCIPAL DEL MAPA ------
const Map: React.FC<MapProps> = ({ listings, onBoundsChange, selectedListing }) => {
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

  return (
    <MapContainer center={[-40.8135, -62.9967]} zoom={14} scrollWheelZoom={true} className="w-full h-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Nos aseguramos de que MarkerClusterGroup esté presente */}
      <MarkerClusterGroup>
        {listings.map((listing) => {
          const customIcon = createCustomIcon(listing.marker_icon_slug);
          return (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={customIcon}
              ref={(el) => { markerRefs.current[listing.id] = el; }}
            >
              <Popup><span className="font-bold">{listing.title}</span></Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
      
      <MapController 
        selectedListing={selectedListing} 
        markerRefs={markerRefs} 
        onBoundsChange={onBoundsChange} 
      />
    </MapContainer>
  );
};

export default Map;