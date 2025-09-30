'use client';

import { useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';

interface MapEventsProps {
    onBoundsChange: (bounds: LatLngBounds) => void;
}

const MapEvents: React.FC<MapEventsProps> = ({ onBoundsChange }) => {
    const map = useMapEvents({
        // Se ejecuta cada vez que el usuario deja de mover el mapa o hacer zoom
        moveend: () => {
            onBoundsChange(map.getBounds());
        },
    });

    return null; // Este componente no renderiza nada, solo escucha eventos
};

export default MapEvents;