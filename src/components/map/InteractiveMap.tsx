import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Wrench, 
  MapPin, 
  Star, 
  ChevronDown,
  Filter,
  X,
  Navigation,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Property, Handyman } from "@/types/user";

interface InteractiveMapProps {
  onBack: () => void;
}

// Mock data
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Apartment in Hydra',
    description: 'Beautiful 2-bedroom apartment with stunning city views',
    price: 65000,
    currency: 'DZD',
    location: { address: 'Rue Didouche Mourad', city: 'Algiers', lat: 36.765, lng: 3.058 },
    bedrooms: 2,
    bathrooms: 1,
    area: 85,
    images: [],
    amenities: ['WiFi', 'Elevator', 'Parking'],
    providerId: '1',
    isAvailable: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    title: 'Cozy Studio in El Biar',
    description: 'Perfect for students and young professionals',
    price: 35000,
    currency: 'DZD',
    location: { address: 'Avenue Ali Khodja', city: 'Algiers', lat: 36.770, lng: 3.040 },
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    images: [],
    amenities: ['WiFi', 'Furnished'],
    providerId: '2',
    isAvailable: true,
    createdAt: new Date(),
  },
];

const mockHandymen: Handyman[] = [
  {
    id: '1',
    userId: '1',
    name: 'Ahmed B.',
    specialties: ['Plumbing', 'Heating'],
    rating: 4.8,
    reviewCount: 127,
    hourlyRate: 2500,
    isAvailable: true,
    isEmergency: true,
    location: { lat: 36.768, lng: 3.055 },
    distance: 0.8,
  },
  {
    id: '2',
    userId: '2',
    name: 'Karim M.',
    specialties: ['Electrical', 'AC Repair'],
    rating: 4.9,
    reviewCount: 89,
    hourlyRate: 3000,
    isAvailable: true,
    isEmergency: false,
    location: { lat: 36.762, lng: 3.048 },
    distance: 1.2,
  },
];

type ViewMode = 'all' | 'properties' | 'handymen';

export function InteractiveMap({ onBack }: InteractiveMapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedItem, setSelectedItem] = useState<Property | Handyman | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const isProperty = (item: Property | Handyman): item is Property => {
    return 'bedrooms' in item;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset">
      {/* Header */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-20 p-4 safe-top"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Button variant="glass" size="icon" onClick={onBack}>
            <X className="w-5 h-5" />
          </Button>
          
          {/* Search bar */}
          <div className="flex-1 glass-card px-4 py-3 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">Search location...</span>
          </div>
          
          <Button variant="glass" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* View mode toggle */}
        <div className="flex gap-2 mt-3">
          {(['all', 'properties', 'handymen'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {mode === 'all' ? 'All' : mode === 'properties' ? 'Homes' : 'Handymen'}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Map placeholder */}
      <div className="flex-1 relative bg-muted">
        {/* Simulated map background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(212, 165, 116, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(212, 165, 116, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }} />
        </div>

        {/* Property markers */}
        {(viewMode === 'all' || viewMode === 'properties') && mockProperties.map((property, i) => (
          <motion.button
            key={property.id}
            className={`absolute p-2 rounded-full ${
              selectedItem?.id === property.id ? 'bg-primary scale-125' : 'bg-card'
            } shadow-lg border border-border transition-all`}
            style={{ 
              top: `${30 + i * 15}%`, 
              left: `${20 + i * 25}%`,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}
            onClick={() => setSelectedItem(property)}
            whileTap={{ scale: 0.9 }}
          >
            <Home className={`w-5 h-5 ${
              selectedItem?.id === property.id ? 'text-primary-foreground' : 'text-primary'
            }`} />
          </motion.button>
        ))}

        {/* Handyman markers */}
        {(viewMode === 'all' || viewMode === 'handymen') && mockHandymen.map((handyman, i) => (
          <motion.button
            key={handyman.id}
            className={`absolute p-2 rounded-full ${
              selectedItem?.id === handyman.id ? 'bg-accent scale-125' : 'bg-card'
            } shadow-lg border border-border transition-all`}
            style={{ 
              top: `${45 + i * 12}%`, 
              left: `${35 + i * 20}%`,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
            onClick={() => setSelectedItem(handyman)}
            whileTap={{ scale: 0.9 }}
          >
            <Wrench className={`w-5 h-5 ${
              selectedItem?.id === handyman.id ? 'text-accent-foreground' : 'text-accent'
            }`} />
            {handyman.isAvailable && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
            )}
          </motion.button>
        ))}

        {/* Current location indicator */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-card shadow-lg" />
          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
        </motion.div>
      </div>

      {/* Bottom sheet - Selected item details */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border p-6 pb-8"
          >
            {isProperty(selectedItem) ? (
              <PropertyCard property={selectedItem} onClose={() => setSelectedItem(null)} />
            ) : (
              <HandymanCard handyman={selectedItem} onClose={() => setSelectedItem(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PropertyCard({ property, onClose }: { property: Property; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-foreground">{property.title}</h3>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4" />
            {property.location.city}
          </p>
        </div>
        <button onClick={onClose} className="p-2 -m-2">
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className="gold-text font-bold text-2xl">
          {property.price.toLocaleString()} {property.currency}
        </span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <div className="flex gap-4 mb-6 text-sm text-muted-foreground">
        <span>{property.bedrooms} Bed</span>
        <span>•</span>
        <span>{property.bathrooms} Bath</span>
        <span>•</span>
        <span>{property.area} m²</span>
      </div>

      <div className="flex gap-3">
        <Button variant="gold" className="flex-1">
          <Home className="w-4 h-4" />
          View Details
        </Button>
        <Button variant="glass" size="icon">
          <Navigation className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

function HandymanCard({ handyman, onClose }: { handyman: Handyman; onClose: () => void }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">
              {handyman.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">{handyman.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-foreground font-medium">{handyman.rating}</span>
              <span className="text-muted-foreground text-sm">({handyman.reviewCount} reviews)</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 -m-2">
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {handyman.specialties.map((specialty) => (
          <span 
            key={specialty}
            className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
          >
            {specialty}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6 text-sm">
        <span className="gold-text font-bold">
          {handyman.hourlyRate.toLocaleString()} DZD/hr
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{handyman.distance} km away</span>
        {handyman.isAvailable && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Available now
            </span>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="gold" className="flex-1">
          <Wrench className="w-4 h-4" />
          Book Now
        </Button>
        <Button variant="glass" size="icon">
          <Phone className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
