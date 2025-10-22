'use client';

import { useState, useMemo, useRef, useCallback, useEffect, FC } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Interfaces (sin cambios)
export interface LocationData {
    lat: number;
    lng: number;
    address: string;
    city: string; // <-- Ahora será el nombre de la Localidad seleccionada
    province: string; // <-- Ahora será el nombre de la Provincia seleccionada
}

interface LocationPickerProps {
    onLocationChange: (data: LocationData) => void;
    iconSlug?: string | null;
    initialLocation?: LocationData | null;
    selectedCityName: string;
    selectedProvinceName: string;
    // 🚨 NUEVAS PROPIEDADES para las dimensiones del icono
    iconWidth?: number | null; 
    iconHeight?: number | null; 
}

// Lógica de Íconos (🚨 MODIFICADA para usar 'default-pin.png')
// Establecemos el icono por defecto. ASUME que tienes /public/icons/default-pin.png
const DEFAULT_ICON_URL = '/icons/default-pin.png';

L.Icon.Default.mergeOptions({
    iconRetinaUrl: DEFAULT_ICON_URL,
    iconUrl: DEFAULT_ICON_URL,
    shadowUrl: '/leaflet/images/marker-shadow.png', 
});

// Lógica de Íconos (Se mantiene la función original)
/*
const defaultIcon = new Icon({ 
    iconUrl: DEFAULT_ICON_URL, 
    iconSize: [null, 38],
    // Puedes añadir iconAnchor o popupAnchor si lo necesitas
});
*/
const DEFAULT_ICON_SIZE: [number, number] = [38, 38];
const createCustomIcon = (
    slug: string | null = null, 
    width: number | null = null, 
    height: number | null = null // Aceptamos altura y ancho
): Icon => {
    // Usamos un tamaño específico si se proporcionan, si no, el DEFAULT_ICON_SIZE
    const iconSize: [number, number] = 
        (width && height) ? [width, height] : DEFAULT_ICON_SIZE;

    // Si es el ícono por defecto
    if (!slug || slug === 'default-pin') {
        return new Icon({ 
            iconUrl: DEFAULT_ICON_URL, 
            iconSize: iconSize, // Aplicamos el tamaño también al default
        });
    }

    // Para íconos personalizados, si se proporcionaron dimensiones
    return new Icon({ 
        iconUrl: `/icons/${slug}.png`, 
        iconSize: iconSize,
    });
};


const LocationPicker: FC<LocationPickerProps> = ({ 
    onLocationChange, 
    iconSlug, 
    initialLocation,
    selectedCityName, // Usamos como prop
    selectedProvinceName, // Usamos como prop
    iconWidth,   // <--- Recibimos de las props
    iconHeight,  // <--- Recibimos de las props
}) => {
    // Solo necesitamos el estado del Domicilio (Address) y la posición del mapa
    const [address, setAddress] = useState(initialLocation?.address || '');
    const [mapVisible, setMapVisible] = useState(!!initialLocation);
    const [markerPosition, setMarkerPosition] = useState<[number, number]>(
        initialLocation ? [initialLocation.lat, initialLocation.lng] : [-40.8135, -62.9967]
    );

    // 🚨 useEffect para sincronizar la provincia/localidad en el parent
    // Disparar la notificación al padre cuando las props de ciudad/provincia cambien
    useEffect(() => {
        // Solo notificamos si hay una posición de marcador válida.
        if (markerPosition[0] !== 0 && markerPosition[1] !== 0) {
            onLocationChange({
                lat: markerPosition[0],
                lng: markerPosition[1],
                address: address,
                city: selectedCityName, 
                province: selectedProvinceName,
            });
        }
    }, [selectedCityName, selectedProvinceName, address, onLocationChange, markerPosition]);
    
    // Función de notificación al padre (simplificada)
    const notifyParent = useCallback((lat: number, lng: number, addr: string) => {
        onLocationChange({ 
            lat, 
            lng, 
            address: addr, 
            city: selectedCityName, 
            province: selectedProvinceName 
        });
    }, [onLocationChange, selectedCityName, selectedProvinceName]);
    
    // Handler para posición manual (manteniendo la nueva lógica de notifyParent)
    const handleManualPositionChange = useCallback((newPos: { lat: number, lng: number }) => {
        setMarkerPosition([newPos.lat, newPos.lng]);
        notifyParent(newPos.lat, newPos.lng, address); // Usa el address del estado local
    }, [notifyParent, address]);

    // Función de Geocoding (usando las props del padre)
    const handleGeocode = async () => {
        if (!selectedProvinceName || !selectedCityName || !address) {
            alert('Por favor, completa Provincia, Localidad y Domicilio.');
            return;
        }
        
        const fullAddress = `${address}, ${selectedCityName}, ${selectedProvinceName}, Argentina`;
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
            setMarkerPosition(newPos);
            notifyParent(newPos[0], newPos[1], address); // Notifica con la nueva lat/lng
            setMapVisible(true);
        } else {
            alert('No se pudo encontrar la dirección. Por favor, sé más específico o arrastra el marcador.');
            setMapVisible(true);
        }
    };
    
    // Lógica del Marker Draggable
    const DraggableMarker = () => {
        const markerRef = useRef<any>(null);
        const map = useMap();
        useEffect(() => { map.flyTo(markerPosition, map.getZoom()); }, [markerPosition, map]);
        const eventHandlers = useMemo(() => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) handleManualPositionChange(marker.getLatLng());
            },
        }), [handleManualPositionChange]);

        return (
            <Marker 
                draggable 
                eventHandlers={eventHandlers} 
                position={markerPosition} 
                ref={markerRef} 
                // 🚨 Pasar las nuevas propiedades a createCustomIcon
                icon={createCustomIcon(iconSlug, iconWidth, iconHeight)} 
            />
        );
    };
    
    const inputClasses = "mt-1 block w-full rounded-md bg-gray-700 border-gray-600 focus:border-green-500 focus:ring-green-500 text-white px-3 py-2";

    return (
        <div className="space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-green-400">Georeferenciación del Domicilio</h2>
            
            {/* 🚨 Eliminamos los selectores de Provincia/Localidad de aquí */}
            
            <div>
                <label className="block text-sm font-medium text-gray-300">Domicilio</label>
                <div className="flex items-center space-x-2">
                    <input 
                        type="text" 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        className={inputClasses} 
                        placeholder="Ej: San Martín 550" 
                        required
                    />
                    <button 
                        type="button" 
                        onClick={handleGeocode} 
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 whitespace-nowrap"
                        disabled={!selectedCityName || !selectedProvinceName || !address}
                    >
                        Georeferenciar
                    </button>
                </div>
                {(!selectedCityName || !selectedProvinceName) && (
                    <p className="text-sm text-yellow-400 mt-1">Completa Provincia y Localidad arriba antes de Georeferenciar.</p>
                )}
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