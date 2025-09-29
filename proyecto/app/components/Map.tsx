'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';

// ▼▼▼ LA CORRECCIÓN ESTÁ AQUÍ ▼▼▼
// Borramos la línea incorrecta e importamos los dos CSS de la librería original.
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';


interface ListingForMap {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  marker_icon_slug: string | null;
}

interface MapProps {
  listings: ListingForMap[];
}

const defaultIcon = new Icon({
  iconUrl: '/icons/default.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const createCustomIcon = (slug: string | null): Icon => {
  if (!slug) {
    return defaultIcon;
  }
  return new Icon({
    iconUrl: `/icons/${slug}.png`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
};

const Map: React.FC<MapProps> = ({ listings }) => {
  const position: [number, number] = [-40.8135, -62.9967];
  const zoomLevel = 14;

  return (
    <MapContainer center={position} zoom={zoomLevel} scrollWheelZoom={true} className="w-full h-full">
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
            >
              <Popup>
                <span className="font-bold">{listing.name}</span>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default Map;