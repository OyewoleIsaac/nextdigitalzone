import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Crosshair, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddressFieldProps {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  required?: boolean;
  label?: string;
}

export function AddressField({ value, onChange, required, label = 'Address' }: AddressFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [suggestions, setSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasPrompted = useRef(false);

  // Prompt for device location once on mount
  useEffect(() => {
    if (!hasPrompted.current && navigator.geolocation) {
      hasPrompted.current = true;
    }
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInput = (text: string) => {
    onChange(text);
    setIsVerified(false);
    setSuggestions([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 4) { setShowSuggestions(false); return; }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=ng&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        setSuggestions(data || []);
        setShowSuggestions(data?.length > 0);
      } catch {
        // Silently fail — user can still type
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleSelect = (item: { display_name: string; lat: string; lon: string }) => {
    onChange(item.display_name, { lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setIsVerified(true);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleUseMyLocation = () => {
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
          onChange(address, { lat: latitude, lng: longitude });
          setIsVerified(true);
          toast.success('Location detected and verified!');
        } catch {
          const fallback = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          onChange(fallback, { lat: latitude, lng: longitude });
          setIsVerified(true);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please type your address below.');
        } else {
          toast.error('Could not get your location. Please type your address.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label htmlFor="address">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      {/* GPS prompt banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground flex-1">Use your current location or type and select from suggestions</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseMyLocation}
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

      <div className="relative">
        <Input
          id="address"
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="e.g. 12 Adeola Odeku St, Victoria Island, Lagos"
          required={required}
          className={isVerified ? 'border-success pr-8' : ''}
        />
        {isVerified && (
          <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
        )}
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-start gap-2 border-b border-border last:border-0"
                onClick={() => handleSelect(s)}
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isVerified && value.length > 0 && (
        <p className="text-xs text-warning flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Select from suggestions above to verify your address
        </p>
      )}
      {isVerified && (
        <p className="text-xs text-success flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Address verified
        </p>
      )}
    </div>
  );
}
