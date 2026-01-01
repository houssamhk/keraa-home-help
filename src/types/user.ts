export type UserRole = 'tenant' | 'provider' | 'owner';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isVerified: boolean;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  createdAt: Date;
}

export interface KYCData {
  idType: 'national_id' | 'passport' | 'drivers_license';
  idNumber?: string;
  idFrontImage?: string;
  idBackImage?: string;
  selfieImage?: string;
  livenessVerified: boolean;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  location: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  bedrooms: number;
  bathrooms: number;
  area: number;
  images: string[];
  virtualTour?: string;
  amenities: string[];
  providerId: string;
  isAvailable: boolean;
  createdAt: Date;
}

export interface Handyman {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  isAvailable: boolean;
  isEmergency: boolean;
  location: {
    lat: number;
    lng: number;
  };
  distance?: number;
}