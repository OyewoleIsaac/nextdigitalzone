import { useState, useEffect, Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';

// Dynamically import Leaflet only when needed to avoid SSR/render crashes
const LeafletMap = lazy(() => import('./LeafletMap'));

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (location: { lat: number; lng: number }) => void;
  className?: string;
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
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }>
          <LeafletMap
            position={position}
            onLocationSelect={handleLocationSelect}
          />
        </Suspense>
      </div>
      {position && (
        <p className="text-xs text-muted-foreground mt-1">
          Coordinates: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
