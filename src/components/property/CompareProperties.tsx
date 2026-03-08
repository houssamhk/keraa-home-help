import { X, Bed, Bath, Ruler, MapPin, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/i18n/LanguageContext';

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
  price_period: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  property_type: string;
  amenities?: string[];
}

interface ComparePropertiesProps {
  properties: Property[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export function CompareProperties({ properties, onRemove, onClose }: ComparePropertiesProps) {
  const { t } = useLanguage();

  if (properties.length < 2) return null;

  const rows: { label: string; icon: React.ElementType; getValue: (p: Property) => string }[] = [
    { label: 'السعر', icon: DollarSign, getValue: (p) => `${p.price.toLocaleString('ar-DZ')} دج` },
    { label: 'المدينة', icon: MapPin, getValue: (p) => p.city },
    { label: 'الغرف', icon: Bed, getValue: (p) => `${p.bedrooms}` },
    { label: 'الحمامات', icon: Bath, getValue: (p) => `${p.bathrooms}` },
    { label: 'المساحة', icon: Ruler, getValue: (p) => `${p.area_sqm} م²` },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-auto"
      >
        <div className="p-4 safe-area-inset">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground">مقارنة العقارات</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Header row with property names */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `120px repeat(${properties.length}, 1fr)` }}>
            <div />
            {properties.map((p) => (
              <div key={p.id} className="text-center">
                <p className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{p.title}</p>
                <button onClick={() => onRemove(p.id)} className="text-xs text-destructive hover:underline">إزالة</button>
              </div>
            ))}

            {/* Comparison rows */}
            {rows.map((row) => (
              <>
                <div key={row.label} className="flex items-center gap-2 text-sm text-muted-foreground py-3 border-t border-border">
                  <row.icon className="w-4 h-4" />
                  {row.label}
                </div>
                {properties.map((p) => {
                  const val = row.getValue(p);
                  const vals = properties.map(row.getValue);
                  const isBest = row.label === 'السعر'
                    ? val === vals.reduce((a, b) => parseInt(a) < parseInt(b) ? a : b)
                    : row.label === 'المساحة'
                    ? val === vals.reduce((a, b) => parseInt(a) > parseInt(b) ? a : b)
                    : false;
                  return (
                    <div key={`${p.id}-${row.label}`} className={`text-center text-sm py-3 border-t border-border font-medium ${isBest ? 'text-primary' : 'text-foreground'}`}>
                      {val}
                    </div>
                  );
                })}
              </>
            ))}

            {/* Amenities row */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3 border-t border-border">
              المرافق
            </div>
            {properties.map((p) => (
              <div key={`${p.id}-amenities`} className="text-center text-xs py-3 border-t border-border text-muted-foreground">
                {p.amenities?.slice(0, 4).join('، ') || '-'}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
