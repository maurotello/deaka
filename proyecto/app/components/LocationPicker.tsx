'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
  province: string;
}

interface LocationPickerProps {
  onLocationChange: (data: LocationData) => void;
  iconSlug: string | null;
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

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationChange, iconSlug }) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Viedma');
  const [province, setProvince] = useState('Río Negro');
  const [mapVisible, setMapVisible] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([-40.8135, -62.9967]);
  const mapRef = useRef<any>(null);

  // Función interna para notificar al componente padre con todos los datos
  const notifyParent = useCallback((lat: number, lng: number) => {
    onLocationChange({ lat, lng, address, city, province });
  }, [onLocationChange, address, city, province]);

  // ▼▼▼ LA CORRECCIÓN PRINCIPAL ESTÁ AQUÍ ▼▼▼
  const handleManualPositionChange = useCallback((newPos: { lat: number, lng: number }) => {
    // 1. Actualizamos el estado principal con la nueva posición
    setMarkerPosition([newPos.lat, newPos.lng]);
    // 2. Notificamos al componente padre (la página del formulario)
    notifyParent(newPos.lat, newPos.lng);
  }, [notifyParent]);


  const DraggableMarker = () => {
    const markerRef = useRef<any>(null);
    const map = useMap();

    // Sincronizamos el mapa si la posición cambia por geocodificación
    useEffect(() => {
        map.flyTo(markerPosition, map.getZoom());
    }, [markerPosition, map]);

    const eventHandlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          // Cuando se termina de arrastrar, llamamos a la función que actualiza el estado
          handleManualPositionChange(marker.getLatLng());
        }
      },
    }), []);
  
    return <Marker draggable={true} eventHandlers={eventHandlers} position={markerPosition} ref={markerRef} icon={createCustomIcon(iconSlug)} />;
  };
  
  const handleGeocode = async () => {
    const fullAddress = `${address}, ${city}, ${province}`;
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
      setMarkerPosition(newPos);
      notifyParent(newPos[0], newPos[1]);
      setMapVisible(true);
    } else {
      alert('No se pudo encontrar la dirección. Por favor, ubícala manualmente en el mapa.');
      setMapVisible(true);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-600 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
            <label className="block text-sm font-medium text-gray-300">Provincia</label>
            <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Localidad</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Domicilio (Calle y Altura)</label>
        <div className="flex items-center space-x-2">
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="block w-full rounded-md border-gray-500 bg-gray-700 text-white" placeholder="Ej: San Martín 550" />
          <button type="button" onClick={handleGeocode} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 whitespace-nowrap">
            Georeferenciar
          </button>
        </div>
      </div>

      {mapVisible && (
        <div className="h-64 w-full mt-4">
          <p className="text-xs text-gray-400 mb-2">Si la ubicación no es exacta, arrastra el marcador a la posición correcta.</p>
          <MapContainer ref={mapRef} center={markerPosition} zoom={16} scrollWheelZoom={true} className="w-full h-full rounded-md">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DraggableMarker />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;