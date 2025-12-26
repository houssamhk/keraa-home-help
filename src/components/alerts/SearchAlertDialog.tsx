import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SearchAlertDialogProps {
  initialFilters?: {
    city?: string;
    property_type?: string;
    bedrooms?: number;
    min_price?: number;
    max_price?: number;
    amenities?: string[];
  };
}

const cities = [
  { value: 'الجزائر', label: 'الجزائر' },
  { value: 'وهران', label: 'وهران' },
  { value: 'قسنطينة', label: 'قسنطينة' },
  { value: 'عنابة', label: 'عنابة' },
  { value: 'البليدة', label: 'البليدة' },
  { value: 'سطيف', label: 'سطيف' },
  { value: 'باتنة', label: 'باتنة' },
  { value: 'تيزي وزو', label: 'تيزي وزو' },
  { value: 'بجاية', label: 'بجاية' },
];

const propertyTypes = [
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'house', label: 'دار' },
  { value: 'studio', label: 'ستوديو' },
];

const amenitiesList = [
  { value: 'heating', label: 'تدفئة (شوفاج)' },
  { value: 'ac', label: 'تكييف (كليم)' },
  { value: 'pool', label: 'مسبح' },
  { value: 'garage', label: 'كراج' },
  { value: 'garden', label: 'حديقة' },
  { value: 'balcony', label: 'شرفة' },
  { value: 'elevator', label: 'مصعد' },
  { value: 'wifi', label: 'إنترنت' },
  { value: 'furnished', label: 'مفروشة' },
];

export function SearchAlertDialog({ initialFilters }: SearchAlertDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [city, setCity] = useState(initialFilters?.city || '');
  const [propertyType, setPropertyType] = useState(initialFilters?.property_type || '');
  const [minBedrooms, setMinBedrooms] = useState<string>(initialFilters?.bedrooms?.toString() || '');
  const [maxBedrooms, setMaxBedrooms] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>(initialFilters?.min_price?.toString() || '');
  const [maxPrice, setMaxPrice] = useState<string>(initialFilters?.max_price?.toString() || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialFilters?.amenities || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('يجب تسجيل الدخول لإنشاء تنبيه');
      return;
    }

    if (!name.trim()) {
      toast.error('يرجى إدخال اسم للتنبيه');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('search_alerts').insert({
        user_id: user.id,
        name: name.trim(),
        city: city || null,
        property_type: propertyType || null,
        min_bedrooms: minBedrooms ? parseInt(minBedrooms) : null,
        max_bedrooms: maxBedrooms ? parseInt(maxBedrooms) : null,
        min_price: minPrice ? parseFloat(minPrice) : null,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        amenities: selectedAmenities.length > 0 ? selectedAmenities : null,
      });

      if (error) throw error;

      toast.success('تم إنشاء التنبيه بنجاح! سيتم إعلامك عند توفر عقار مطابق');
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('حدث خطأ أثناء إنشاء التنبيه');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCity('');
    setPropertyType('');
    setMinBedrooms('');
    setMaxBedrooms('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedAmenities([]);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/30 hover:bg-primary/10">
          <Bell className="h-4 w-4" />
          إنشاء تنبيه
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-right">🔔 رادار البحث</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-name">اسم التنبيه *</Label>
            <Input
              id="alert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شقة في وهران"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المدينة</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>نوع العقار</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  {propertyTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الغرف (من)</Label>
              <Input
                type="number"
                min="1"
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label>الغرف (إلى)</Label>
              <Input
                type="number"
                min="1"
                value={maxBedrooms}
                onChange={(e) => setMaxBedrooms(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>السعر (من) دج</Label>
              <Input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="20000"
              />
            </div>
            <div className="space-y-2">
              <Label>السعر (إلى) دج</Label>
              <Input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="100000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>المرافق</Label>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map(amenity => (
                <div key={amenity.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`amenity-${amenity.value}`}
                    checked={selectedAmenities.includes(amenity.value)}
                    onCheckedChange={() => toggleAmenity(amenity.value)}
                  />
                  <Label 
                    htmlFor={`amenity-${amenity.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {amenity.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 ml-2" />
                تفعيل التنبيه
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
