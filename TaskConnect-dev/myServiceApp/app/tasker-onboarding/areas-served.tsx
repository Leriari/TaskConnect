import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import BottomBarSpace from '@/app/components/BottomBarSpace';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// --- Firebase Imports (No longer directly used for saving on this screen) ---
// import { getFirestore, doc, setDoc } from 'firebase/firestore';
// import { getAuth } from 'firebase/auth';
// import { app } from '../../firebase-config'; // No longer directly used for saving on this screen

// --- Mapbox Configuration ---
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiZW1tYW51ZWxvcmluZ2UiLCJhIjoiY21ib3Y0amEzMXRndjJsc2RhdzdvMGRtOSJ9.dmRs4J8gMykWqHuK2kb5jA';
const MAPBOX_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Define the types for data passed between onboarding screens
type PersonalDetails = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
};

type IDVerificationFormData = {
    kraPin: string;
    idNumber: string;
    idFrontImage: string | null;
    idBackImage: string | null;
    idFrontImageBase64: string;
    idBackImageBase64: string;
};

type CombinedOnboardingData = PersonalDetails & IDVerificationFormData;

type AreasServedFormData = {
    areasServed: string[];
};

// This type represents ALL data collected up to the AreasServed screen
// This is the structure that will be passed to the next screen
type AllOnboardingData = CombinedOnboardingData & AreasServedFormData;

const createStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: 20,
    },
    description: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        lineHeight: 24,
        marginBottom: 20,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        paddingHorizontal: 15,
        backgroundColor: theme.colors.card,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: theme.dark ? '#fff' : '#000',
        backgroundColor: theme.dark ? '#222' : '#fff',
    },
    searchLoadingIndicator: {
        marginLeft: 10,
    },
    clearSearchButton: {
        marginLeft: 10,
        padding: 5,
    },
    searchResultsContainer: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        backgroundColor: theme.colors.background,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3,
        marginBottom: 20,
        zIndex: 10,
    },
    searchResultsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    searchResultItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    searchResultText: {
        fontSize: 16,
        color: theme.colors.text,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 10,
        marginBottom: 15,
    },
    selectedAreasContainer: {
        marginBottom: 20,
    },
    selectedAreasList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    selectedAreaTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.colors.primaryLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    selectedAreaText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 14,
        marginTop: 15,
        marginBottom: 15,
        textAlign: 'center',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.primary,
        padding: 18,
        borderRadius: 12,
        marginTop: 30,
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
}));

export default function AreasServedScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    // No longer initializing Firestore/Auth here as saving is moved
    // const db = getFirestore(app);
    // const auth = getAuth(app);

    const receivedOnboardingData: CombinedOnboardingData | null = params.onboardingData
        ? JSON.parse(params.onboardingData as string)
        : null;

    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!receivedOnboardingData) {
            Alert.alert('Error', 'Previous onboarding data missing. Please restart the onboarding process.');
            router.replace('/tasker-onboarding/personal-details');
        }
    }, [receivedOnboardingData, router]);

    const fetchMapboxResults = useCallback(async (text: string) => {
        if (
            !MAPBOX_ACCESS_TOKEN ||
            (typeof MAPBOX_ACCESS_TOKEN === 'string' && MAPBOX_ACCESS_TOKEN.includes('YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN'))
        ) {
            const configError = 'Mapbox Access Token is not configured. Please replace "YOUR_MAPBOX_PUBLIC_ACCESS_TOKEN" with your actual token in the code.';
            setError(configError);
            setLoadingSearch(false);
            return;
        }

        if (text.trim().length < 3) {
            setSearchResults([]);
            setLoadingSearch(false);
            return;
        }

        setLoadingSearch(true);
        setError(null);
        try {
            const encodedQuery = encodeURIComponent(text.trim());
            const url = `${MAPBOX_API_URL}/${encodedQuery}.json?` +
                `access_token=${MAPBOX_ACCESS_TOKEN}&` +
                `country=ke&` +
                `types=place,locality,neighborhood,poi&` +
                `limit=10&` +
                `language=en`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorBody = await response.text();
                let specificError = `Search failed: ${response.status} ${response.statusText}.`;
                if (response.status === 401 || response.status === 403) {
                    specificError += " Check your Mapbox Access Token or its permissions.";
                } else if (response.status === 429) {
                    specificError += " You've hit Mapbox rate limits. Consider upgrading your plan if this persists.";
                } else if (response.headers.get('Content-Type')?.includes('text/html')) {
                    specificError += " Server returned HTML instead of JSON. This often indicates an error page from Mapbox.";
                }
                setError(specificError);
                setSearchResults([]);
                return;
            }

            const data = await response.json();
            const uniqueResults = Array.from(new Set<string>(data.features.map((item: any) => {
                if (typeof item.place_name === 'string') {
                    return item.place_name.trim();
                }
                return '';
            }))).filter((r: string) => r.length > 0);

            setSearchResults(uniqueResults);

        } catch (err: any) {
            setError("A network error occurred during search. Please check your internet connection.");
            setSearchResults([]);
        } finally {
            setLoadingSearch(false);
        }
    }, []);

    const debouncedSearch = useRef(debounce(fetchMapboxResults, 500)).current;

    useEffect(() => {
        if (searchQuery.trim().length > 0 && isInputFocused) {
            debouncedSearch(searchQuery);
        } else {
            debouncedSearch.cancel();
            setSearchResults([]);
            setLoadingSearch(false);
        }
        return () => {
            debouncedSearch.cancel();
        };
    }, [searchQuery, debouncedSearch, isInputFocused]);

    const toggleArea = (area: string) => {
        setSelectedAreas(prev => {
            if (prev.includes(area)) {
                return prev.filter(a => a !== area);
            }
            return [...prev, area];
        });
        setError(null);

        setSearchQuery('');
        setSearchResults([]);
        Keyboard.dismiss();
    };

    const handleNext = async () => {
        if (selectedAreas.length === 0) {
            setError('Please select at least one area where you are available to work.');
            return;
        }
        if (!receivedOnboardingData) {
            Alert.alert('Error', 'Onboarding data from previous steps is missing. Please restart.');
            router.replace('/tasker-onboarding/personal-details');
            return;
        }
        setIsProcessing(true);
        const allCombinedData: AllOnboardingData = {
            ...receivedOnboardingData,
            areasServed: selectedAreas,
        };
        try {
            router.push({
                pathname: '/tasker-onboarding/services',
                params: {
                    onboardingData: JSON.stringify(allCombinedData),
                },
            });
        } catch (error) {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    <Text style={styles.description}>
                        Specify the areas where you're available to work by searching for specific locations, towns, or neighborhoods.
                    </Text>

                    {/* Search Input Section */}
                    <View style={styles.searchSection}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for a location (e.g., Kilimani, Ruiru)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => {
                                setTimeout(() => setIsInputFocused(false), 200);
                            }}
                            autoCapitalize="words"
                            returnKeyType="search"
                            onSubmitEditing={() => {
                                if (searchQuery.trim().length >= 3) {
                                    fetchMapboxResults(searchQuery);
                                }
                            }}
                            placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                        />
                        {loadingSearch && <ActivityIndicator size="small" color="#4A80F0" style={styles.searchLoadingIndicator} />}
                        {searchQuery.length > 0 && !loadingSearch && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); Keyboard.dismiss(); }} style={styles.clearSearchButton}>
                                <Ionicons name="close-circle" size={20} color="#999" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Search Results Display */}
                    {isInputFocused && searchResults.length > 0 && (
                        <View style={styles.searchResultsContainer}>
                            <Text style={styles.searchResultsTitle}>Suggestions</Text>
                            {searchResults.map((area, index) => (
                                <TouchableOpacity
                                    key={area + index}
                                    style={styles.searchResultItem}
                                    onPress={() => toggleArea(area)}
                                    // Removed disabled={isSaving}
                                >
                                    <Text style={styles.searchResultText}>{area}</Text>
                                    {selectedAreas.includes(area) && (
                                        <Ionicons name="checkmark-circle" size={20} color="#4A80F0" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Display Selected Areas */}
                    {selectedAreas.length > 0 && (
                        <View style={styles.selectedAreasContainer}>
                            <Text style={styles.sectionTitle}>Your Selected Service Areas</Text>
                            <View style={styles.selectedAreasList}>
                                {selectedAreas.map((area) => (
                                    <View key={area} style={styles.selectedAreaTag}>
                                        <Text style={styles.selectedAreaText}>{area}</Text>
                                        {/* Removed disabled={isSaving} */}
                                        <TouchableOpacity onPress={() => toggleArea(area)}>
                                            <Ionicons name="close-circle" size={20} color="#666" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Error Display */}
                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    {/* Next Button (back to original behavior) */}
                    {/* Removed disabled={isSaving} and ActivityIndicator */}
                    <TouchableOpacity style={styles.button} onPress={handleNext} disabled={isProcessing}>
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Next</Text>
                        )}
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <BottomBarSpace />
        </>
    );
}