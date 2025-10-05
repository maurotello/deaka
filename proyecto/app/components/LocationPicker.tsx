'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Interfaces (sin cambios)
export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
  province: string;
}

interface LocationPickerProps {
  onLocationChange: (data: LocationData) => void;
  iconSlug?: string | null;
  initialLocation?: LocationData | null; // <-- Nueva propiedad
}

// ... (provincias y lógica de íconos sin cambios)
const provinciasArgentinas = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Ciudad Autónoma de Buenos Aires", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"];
const defaultIcon = new Icon({ iconUrl: '/icons/default.png', iconSize: [38, 38]});
const createCustomIcon = (slug: string | null = null): Icon => {
    if (!slug) return defaultIcon;
    return new Icon({ iconUrl: `/icons/${slug}.png`, iconSize: [38, 38] });
};


const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationChange, iconSlug, initialLocation }) => {
  // El estado se inicializa con los valores iniciales si existen
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [city, setCity] = useState(initialLocation?.city || 'Viedma');
  const [province, setProvince] = useState(initialLocation?.province || 'Río Negro');
  const [mapVisible, setMapVisible] = useState(!!initialLocation); // El mapa es visible si hay datos iniciales
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : [-40.8135, -62.9967]
  );
  
  // ... (El resto del componente es igual, no es necesario cambiarlo)
  const notifyParent = useCallback((lat: number, lng: number) => {
    onLocationChange({ lat, lng, address, city, province });
  }, [onLocationChange, address, city, province]);
  
  const handleManualPositionChange = useCallback((newPos: { lat: number, lng: number }) => {
    setMarkerPosition([newPos.lat, newPos.lng]);
    notifyParent(newPos.lat, newPos.lng);
  }, [notifyParent]);

  const DraggableMarker = () => {
    const markerRef = useRef<any>(null);
    const map = useMap();
    useEffect(() => { map.flyTo(markerPosition, map.getZoom()); }, [markerPosition, map]);
    const eventHandlers = useMemo(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) handleManualPositionChange(marker.getLatLng());
      },
    }), []);
    return <Marker draggable eventHandlers={eventHandlers} position={markerPosition} ref={markerRef} icon={createCustomIcon(iconSlug)} />;
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
      alert('No se pudo encontrar la dirección.');
      setMapVisible(true);
    }
  };
  
  const inputClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring-green-500 text-white";

  return (
      <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
          {/* JSX del LocationPicker (sin cambios) */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
                <label>Provincia</label>
                <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClasses}>{provinciasArgentinas.map(p => (<option key={p} value={p}>{p}</option>))}</select>
            </div>
            <div>
                <label>Localidad</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} />
            </div>
          </div>
          <div>
            <label>Domicilio</label>
            <div className="flex items-center space-x-2">
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClasses} placeholder="Ej: San Martín 550" />
                <button type="button" onClick={handleGeocode} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Georeferenciar</button>
            </div>
          </div>
          {mapVisible && (
            <div className="h-64 w-full mt-4">
                <MapContainer center={markerPosition} zoom={16} className="w-full h-full rounded-md">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <DraggableMarker />
                </MapContainer>
            </div>
          )}
      </div>
  );
};

export default LocationPicker;