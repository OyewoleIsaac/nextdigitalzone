import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationPicker } from '@/components/maps/LocationPicker';
import type { Category } from '@/lib/types';

interface ArtisanFieldsProps {
  categories: Category[] | undefined;
  categoryId: string;
  setCategoryId: (v: string) => void;
  customCategory: string;
  setCustomCategory: (v: string) => void;
  yearsExperience: string;
  setYearsExperience: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  location: { lat: number; lng: number } | undefined;
  setLocation: (v: { lat: number; lng: number }) => void;
}

export function ArtisanFields({
  categories,
  categoryId,
  setCategoryId,
  customCategory,
  setCustomCategory,
  yearsExperience,
  setYearsExperience,
  bio,
  setBio,
  location,
  setLocation,
}: ArtisanFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Service Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="experience">Years of Experience</Label>
          <Input
            id="experience"
            type="number"
            min="0"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>
      </div>

      {categoryId === 'other' && (
        <div className="space-y-2">
          <Label htmlFor="customCategory">Specify your service</Label>
          <Input
            id="customCategory"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="e.g. Tiling"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="bio">Short Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell customers about your skills and experience..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Your Location <span className="text-destructive">*</span></Label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>
    </>
  );
}
