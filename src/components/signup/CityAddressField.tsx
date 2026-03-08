import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Crosshair, Loader2 } from 'lucide-react';
import { NIGERIAN_CITIES, getCitiesByState } from '@/data/nigerianCities';
import { toast } from 'sonner';

interface CityAddressFieldProps {
  value: string;
  coords: { lat: number; lng: number } | undefined;
  onChange: (address: string, coords: { lat: number; lng: number }) => void;
  role?: 'artisan' | 'customer' | null;
}

export function CityAddressField({ value, coords, onChange, role }: CityAddressFieldProps) {
  const [selectedCity, setSelectedCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const citiesByState = getCitiesByState();

  // When city + landmark changes, auto-generate verified address
  useEffect(() => {
    if (selectedCity) {
      const city = NIGERIAN_CITIES.find((c) => c.name === selectedCity);
      if (city) {
        const fullAddress = landmark
          ? `${landmark}, ${city.name}, ${city.state} State, Nigeria`
          : `${city.name}, ${city.state} State, Nigeria`;
        onChange(fullAddress, { lat: city.lat, lng: city.lng });
        setIsVerified(true);
      }
    }
  }, [selectedCity, landmark]);

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const address = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          // Try to auto-select closest city
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const match = NIGERIAN_CITIES.find(
            (c) => c.name.toLowerCase() === city.toLowerCase()
          );
          if (match) setSelectedCity(match.name);
          onChange(address, { lat: latitude, lng: longitude });
          setIsVerified(true);
          toast.success('Location detected!');
        } catch {
          onChange(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, { lat: latitude, lng: longitude });
          setIsVerified(true);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please select your city below.');
        } else {
          toast.error('Could not get your location. Please select your city.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      <Label>
        Your Location{' '}
        <span className="text-destructive">*</span>
        {role === 'artisan' && (
          <span className="ml-1 text-xs text-muted-foreground font-normal">(Used to match you with nearby customers)</span>
        )}
      </Label>

      {/* GPS prompt */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">
          Use your current device location for best matching
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseGPS}
          disabled={isLocating}
          className="shrink-0 text-xs h-7 px-2"
        >
          {isLocating ? (
            <><Loader2 className="h-3 w-3 animate-spin mr-1" />Locating...</>
          ) : (
            <><Crosshair className="h-3 w-3 mr-1" />Use my location</>
          )}
        </Button>
      </div>

      {/* City selector */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Or select your city/town</Label>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger>
            <SelectValue placeholder="Select your city or town" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {Object.entries(citiesByState).sort().map(([state, cities]) => (
              <SelectGroup key={state}>
                <SelectLabel>{state} State</SelectLabel>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Landmark / street (optional detail) */}
      {selectedCity && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Nearest landmark or street <span className="text-muted-foreground/60">(optional but recommended)</span>
          </Label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder={`e.g. Near ${selectedCity} Central Market, Beside...`}
          />
        </div>
      )}

      {/* Verified address display */}
      {isVerified && value && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200 text-sm">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-green-700 font-medium text-xs mb-0.5">Address Verified ✓</p>
            <p className="text-green-600 text-xs">{value}</p>
          </div>
        </div>
      )}

      {!isVerified && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Please use GPS or select your city above to verify your location
        </p>
      )}
    </div>
  );
}
