'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 1. INTERFACES (soluciona "Cannot find name 'LocationPickerProps'")
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

// 2. LISTA DE PROVINCIAS
const provinciasArgentinas = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa",
  "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

// 3. LÓGICA DE ÍCONOS
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

// 4. COMPONENTE PRINCIPAL
const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationChange, iconSlug }) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Viedma');
  const [province, setProvince] = useState('Río Negro');
  const [mapVisible, setMapVisible] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([-40.8135, -62.9967]);
  
  const notifyParent = useCallback((lat: number, lng: number) => {
    onLocationChange({ lat, lng, address, city, province });
  }, [onLocationChange, address, city, province]);
  
  const handleManualPositionChange = useCallback((newPos: { lat: number, lng: number }) => {
    setMarkerPosition([newPos.lat, newPos.lng]);
    notifyParent(newPos.lat, newPos.lng);
  }, [notifyParent]);

  // 5. COMPONENTE INTERNO (soluciona "Cannot find name 'DraggableMarker'")
  const DraggableMarker = () => {
    const markerRef = useRef<any>(null);
    const map = useMap();

    useEffect(() => {
        map.flyTo(markerPosition, map.getZoom());
    }, [markerPosition, map]);

    const eventHandlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          handleManualPositionChange(marker.getLatLng());
        }
      },
    }), []);
  
    return <Marker draggable={true} eventHandlers={eventHandlers} position={markerPosition} ref={markerRef} icon={createCustomIcon(iconSlug)} />;
  };
  
  // 6. FUNCIÓN DE GEOCODIFICACIÓN (soluciona "handleGeocode is not defined")
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

  const inputClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring focus:ring-green-500 focus:ring-opacity-50 px-3 py-2 text-white";

  return (
    <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
            <label className="block text-sm font-medium text-gray-300">Provincia</label>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClasses}>
              {provinciasArgentinas.map(p => (<option key={p} value={p}>{p}</option>))}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Localidad</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">Domicilio (Calle y Altura)</label>
        <div className="flex items-center space-x-2">
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} placeholder="Ej: San Martín 550" />
          <button type="button" onClick={handleGeocode} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 whitespace-nowrap">
            Georeferenciar
          </button>
        </div>
      </div>

      {mapVisible && (
        <div className="h-64 w-full mt-4">
          <p className="text-xs text-gray-400 mb-2">Si la ubicación no es exacta, arrastra el marcador a la posición correcta.</p>
          <MapContainer center={markerPosition} zoom={16} scrollWheelZoom={true} className="w-full h-full rounded-md">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <DraggableMarker />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;