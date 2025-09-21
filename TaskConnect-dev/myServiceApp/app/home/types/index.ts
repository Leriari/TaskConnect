// app/(tabs)/home/types/index.ts

import type { StackNavigationProp } from '@react-navigation/stack';

export type Tasker = {
  id: string;
  name: string;
  category: string;
  price: string;
  rating?: number;
  reviews?: number;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

export type Service = {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviews: number;
  price: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type Category = {
  name: string;
  icon: string;
};

export type City = {
  name: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type FilterOptions = {
  minRating: number;
  maxPrice: number;
  maxDistance: number;
  sortBy: 'rating' | 'price' | 'distance';
};

export type RootStackParamList = {
  Booking: { tasker: Tasker };
  BookingSummary: {
    tasker: Tasker;
    date: Date;
    address: string;
    notes: string;
  };
};

export type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Booking'>;