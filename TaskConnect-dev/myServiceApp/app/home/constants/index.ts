// app/(tabs)/home/constants/index.ts

export const DEFAULT_FILTER_OPTIONS = {
    minRating: 4.0,
    maxPrice: 7000,
    maxDistance: 10,
    sortBy: 'rating' as const,
  };
  
  export const RATING_OPTIONS = [3.0, 3.5, 4.0, 4.5, 5.0];
  export const PRICE_OPTIONS = [500, 2000, 3500, 5000, 7000];
  export const DISTANCE_OPTIONS = [2, 4, 6, 8, 10];
  export const SORT_OPTIONS = ['rating', 'price', 'distance'] as const;
  
  export const COLORS = {
    primary: '#4A80F0',
    secondary: '#F0F4FF',
    background: '#F8F9FD',
    error: '#FF6B6B',
    gold: '#FFD700',
    textPrimary: '#333',
    textSecondary: '#A0A0A0',
    white: '#fff',
    border: '#F0F0F0',
  };