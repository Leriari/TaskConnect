import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type Tasker = {
    id: string;
    name: string;
    category: string;
    price: string;
    location: string;
    rating: number;
    reviews: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
};

export type BookingFormData = {
    date: Date;
    address: string;
    notes: string;
};

export type RootStackParamList = {
    '(tabs)': undefined;
    'booking': {
        tasker: Tasker;
    };
    'bookingSummary': {
        tasker: Tasker;
    } & BookingFormData;
    'modal': undefined;
    'auth': undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
    NativeStackScreenProps<RootStackParamList, T>;

// Helper type for useLocalSearchParams in Expo Router
export type SearchParamTypes = {
    booking: {
        tasker: string; // JSON string of Tasker
    };
    bookingSummary: {
        tasker: string; // JSON string of Tasker
        date: string;
        address: string;
        notes: string;
        taskDuration?: string;
        paymentMethod: 'mpesa' | 'cash' | 'card';
    };
}; 