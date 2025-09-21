// app/(tabs)/home/data/mockData.ts

// import { Service, Category, City } from '../types';

export const allServices: Service[] = [
  { id: 1, name: 'Yvonne Karanja', category: 'Best Administrator', location: '2 km away', rating: 4.9, reviews: 42, price: 'Ksh 3500', coordinates: { latitude: -1.286389, longitude: 36.817223 } },
  { id: 2, name: 'Green Gardeners', category: 'Gardening', location: '4.5 km away', rating: 4.7, reviews: 38, price: 'Ksh 1500', coordinates: { latitude: -1.289389, longitude: 36.824223 } },
  { id: 3, name: 'HomeBright Cleaners', category: 'Cleaning', location: '6 km away', rating: 4.8, reviews: 56, price: 'Ksh 1000', coordinates: { latitude: -1.292389, longitude: 36.807223 } },
  { id: 4, name: 'FixIt Plumbers', category: 'Plumbing', location: '3.8 km away', rating: 4.6, reviews: 29, price: 'Ksh 2000', coordinates: { latitude: -1.281389, longitude: 36.820223 } },
  { id: 5, name: 'Style by Linda', category: 'Hair Stylist', location: '1.2 km away', rating: 4.9, reviews: 64, price: 'Ksh 2500', coordinates: { latitude: -1.287389, longitude: 36.812223 } },
  { id: 6, name: 'Paint Masters', category: 'Painting', location: '5.1 km away', rating: 4.5, reviews: 27, price: 'Ksh 1800', coordinates: { latitude: -1.295389, longitude: 36.825223 } },
  { id: 7, name: 'Baby Bliss Sitters', category: 'Baby Sitting', location: '2.9 km away', rating: 4.8, reviews: 46, price: 'Ksh 3000', coordinates: { latitude: -1.283389, longitude: 36.815223 } },
  { id: 8, name: 'QuickFix Movers', category: 'Moving', location: '7.3 km away', rating: 4.4, reviews: 31, price: 'Ksh 4000', coordinates: { latitude: -1.298389, longitude: 36.830223 } },
  { id: 9, name: 'Tech Rescue', category: 'Tech Help', location: '5.4 km away', rating: 4.7, reviews: 52, price: 'Ksh 5000', coordinates: { latitude: -1.288389, longitude: 36.822223 } },
  { id: 10, name: 'Chef Mambo', category: 'Chef', location: '1.9 km away', rating: 4.9, reviews: 73, price: 'Ksh 4000', coordinates: { latitude: -1.284389, longitude: 36.814223 } },
];

export const categories: Category[] = [
  { name: 'All', icon: 'grid' },
  { name: 'Cleaning', icon: 'md-shield-checkmark' },
  { name: 'Plumbing', icon: 'water' },
  { name: 'Electrical', icon: 'flash' },
  { name: 'Chef', icon: 'restaurant' },
  { name: 'Moving', icon: 'cube' },
  { name: 'Gardening', icon: 'leaf' },
  { name: 'Painting', icon: 'color-palette' },
  { name: 'Baby Sitting', icon: 'happy' },
  { name: 'Hair Stylist', icon: 'cut' },
  { name: 'AC Repair', icon: 'thermometer' },
  { name: 'Tech Help', icon: 'laptop' },
];

export const cities: City[] = [
  { name: 'Nairobi', country: 'Kenya', coordinates: { latitude: -1.286389, longitude: 36.817223 } },
  { name: 'Mombasa', country: 'Kenya', coordinates: { latitude: -4.043740, longitude: 39.668808 } },
  { name: 'Kisumu', country: 'Kenya', coordinates: { latitude: -0.091702, longitude: 34.767956 } },
  { name: 'Nakuru', country: 'Kenya', coordinates: { latitude: -0.303099, longitude: 36.080025 } },
  { name: 'Eldoret', country: 'Kenya', coordinates: { latitude: 0.521060, longitude: 35.269440 } },
];