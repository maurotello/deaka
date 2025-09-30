'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngBounds, Marker as LeafletMarker, Map as LeafletMap } from 'leaflet';
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

const Map: React.FC<MapProps> = ({ listings, onBoundsChange, selectedListing }) => {
// 1. ▼▼▼ Volvemos a usar useRef, que es la forma correcta ▼▼▼
const mapRef = useRef<LeafletMap | null>(null);
const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
const clusterRef = useRef<any>(null);

  useEffect(() => {
    // El efecto ahora vuelve a usar 'mapRef.current'
    if (!selectedListing || !mapRef.current) return;
    
    const marker = markerRefs.current[selectedListing.id];
    
    if (marker) {
      mapRef.current.flyTo([selectedListing.latitude, selectedListing.longitude], 17);
      marker.openPopup();
    }
  }, [selectedListing]);

  return (
    // 2. ▼▼▼ Usamos la prop 'ref', que es el estándar de React ▼▼▼
    <MapContainer 
      ref={mapRef} 
      center={[-40.8135, -62.9967]} 
      zoom={14} 
      scrollWheelZoom={true} 
      className="w-full h-full"
    >
      <MapEvents onBoundsChange={onBoundsChange} />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
    </MapContainer>
  );
};

export default Map;