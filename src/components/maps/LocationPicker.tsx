import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
  className?: string;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({ value, onChange, className }: LocationPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    value || { lat: 9.0579, lng: 7.4951 } // Default: Abuja, Nigeria
  );
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (value) setPosition(value);
  }, [value]);

  const handleLocationSelect = (lat: number, lng: number) => {
    const loc = { lat, lng };
    setPosition(loc);
    onChange(loc);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(loc);
        onChange(loc);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          Click map to set location
        </p>
        <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation} disabled={isLocating}>
          <Crosshair className="h-3.5 w-3.5 mr-1" />
          {isLocating ? 'Locating...' : 'Use my location'}
        </Button>
      </div>
      <div className="rounded-lg overflow-hidden border border-border h-[250px]">
        <MapContainer center={[position.lat, position.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[position.lat, position.lng]} />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>
      {position && (
        <p className="text-xs text-muted-foreground mt-1">
          Coordinates: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
