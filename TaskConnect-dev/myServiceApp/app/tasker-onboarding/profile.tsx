import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getDoc } from 'firebase/firestore';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

// Import Firebase (adjust path as needed for your project structure)
import { getAuth } from 'firebase/auth'; // For getting the current user
import { getFirestore, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'; // For Firestore database operations
import { app } from '../../firebase-config'; // Assuming you have your Firebase app initialized in firebaseConfig.ts/js

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Define the types for data passed between onboarding screens (re-used from previous files)
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

type AreasServedFormData = {
    areasServed: string[];
};

type Service = {
    id: string;
    category: string;
    title: string;
    rate: string;
    description: string;
    isCustom?: boolean;
    taskerId?: string; // Added to include UID in serviceCategory
};

type ServicesData = {
    services: Service[];
};

type SupportingDocument = {
    id: string;
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    base64: string;
};

// New type for data collected specifically on this Profile screen
type ProfileFormData = {
    profileImageBase64: string | null;
    bio: string;
};

// This type represents ALL data collected across ALL onboarding screens
type AllOnboardingData = PersonalDetails & IDVerificationFormData & AreasServedFormData & ServicesData & {
    supportingDocuments: SupportingDocument[];
    profileImageBase64: string | null; // Add profile image Base64
    bio: string; // Add bio
    onboardingStatus: 'pendingVerification' | 'completed';
    submissionDate?: string;
};

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
        marginBottom: 30,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    photoUpload: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: theme.colors.card,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    photoUploadError: {
        borderColor: theme.colors.error,
    },
    photoUploadText: {
        marginTop: 10,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    bioSection: {
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 8,
    },
    sublabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 15,
    },
    bioInput: {
        height: 200,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: theme.dark ? '#222' : '#fff',
        color: theme.dark ? '#fff' : '#000',
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    charCount: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 8,
        textAlign: 'right',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 5,
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

export default function ProfileScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    // Reconstruct the full onboardingData object from previous steps
    const receivedOnboardingData: Partial<AllOnboardingData> = params.onboardingData
        ? JSON.parse(params.onboardingData as string)
        : {};

    const [profileImageUri, setProfileImageUri] = useState<string | null>(null); // For display
    const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null); // For submission
    const [bio, setBio] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isProcessing, setIsProcessing] = useState(false); // For image picking loading
    const [isSaving, setIsSaving] = useState(false); // For database saving loading

    useEffect(() => {
        if (!receivedOnboardingData || Object.keys(receivedOnboardingData).length === 0) {
            Alert.alert('Error', 'No onboarding data received. Please start from the beginning.', [
                { text: 'OK', onPress: () => router.replace('/tasker-onboarding/personal-details') }
            ]);
        }
    }, [receivedOnboardingData]);

    useEffect(() => {
        const prefillFromUsersCollection = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (userData.profileImageBase64 && !profileImageBase64) {
                            setProfileImageBase64(userData.profileImageBase64);
                            setProfileImageUri(null);
                        }
                    }
                } catch (err) {
                    // Ignore errors, just don't prefill
                }
            }
        };
        prefillFromUsersCollection();
    }, []);

    const pickImage = async () => {
        setIsProcessing(true);
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please grant access to your photo library to select a profile photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedUri = result.assets[0].uri;
                setProfileImageUri(selectedUri);

                const base64 = await FileSystem.readAsStringAsync(selectedUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setProfileImageBase64(base64);

                if (errors.image) {
                    setErrors(prev => {
                        const { image, ...rest } = prev;
                        return rest;
                    });
                }
            }
        } catch (error: any) {
            console.error("Error picking image:", error);
            Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!profileImageBase64) {
            newErrors.image = 'Profile photo is required';
        }

        if (!bio.trim()) {
            newErrors.bio = 'Bio is required';
        } else if (bio.length < 50) {
            newErrors.bio = `Bio should be at least 50 characters (currently ${bio.length})`;
        } else if (bio.length > 200) {
            newErrors.bio = `Bio should be at most 200 characters (currently ${bio.length})`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleComplete = async () => {
        setIsSaving(true); // Show spinner immediately
        if (validateForm()) {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                setIsSaving(false);
                Alert.alert("Authentication Error", "You must be logged in to complete your profile.");
                router.replace('/login');
                return;
            }
            const finalOnboardingData: AllOnboardingData = {
                ...receivedOnboardingData as AllOnboardingData,
                profileImageBase64: profileImageBase64,
                bio: bio.trim(),
                onboardingStatus: 'pendingVerification',
                submissionDate: new Date().toISOString(),
            };
            console.log('finalOnboardingData:', finalOnboardingData);
            try {
                await setDoc(doc(db, 'taskers', currentUser.uid), finalOnboardingData);
                if (finalOnboardingData.services && finalOnboardingData.services.length > 0) {
                    for (const service of finalOnboardingData.services) {
                        const serviceWithTaskerId = {
                            ...service,
                            taskerId: currentUser.uid
                        };
                        console.log('Processing service:', serviceWithTaskerId);
                        const categoryDocRef = doc(db, 'serviceCategories', service.category);
                        const categorySnap = await getDoc(categoryDocRef);
                        console.log('Category exists:', categorySnap.exists());
                        if (!categorySnap.exists()) {
                            // Create the category document if it doesn't exist
                            await setDoc(categoryDocRef, {
                                name: service.category,
                                icon: '', // Set a default or pass from elsewhere
                                services: [serviceWithTaskerId]
                            });
                            console.log('Created new service category:', service.category);
                        } else {
                            await updateDoc(categoryDocRef, {
                                services: arrayUnion(serviceWithTaskerId)
                            });
                            console.log('Updated existing service category:', service.category);
                        }
                    }
                }
                router.replace('/'); // Switch to Home tab
                // Do not set isSaving to false here; let navigation handle unmount
            } catch (error) {
                console.error('Error in handleComplete:', error);
                setIsSaving(false);
            }
        } else {
            setIsSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.description}>
                        Add a profile photo and bio to help clients get to know you better.
                    </Text>

                    <View style={styles.photoSection}>
                        <TouchableOpacity
                            style={[styles.photoUpload, errors.image && styles.photoUploadError]}
                            onPress={pickImage}
                            disabled={isProcessing || isSaving}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="large" color="#4A80F0" />
                            ) : profileImageUri ? (
                                <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={40} color="#666" />
                                    <Text style={styles.photoUploadText}>Add Profile Photo</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {errors.image && (
                            <Text style={styles.errorText}>{errors.image}</Text>
                        )}
                    </View>

                    <View style={styles.bioSection}>
                        <Text style={styles.label}>Professional Bio</Text>
                        <Text style={styles.sublabel}>
                            Tell clients about your experience, skills, and what makes you great at what you do.
                        </Text>
                        <TextInput
                            style={[styles.bioInput, errors.bio && styles.inputError]}
                            value={bio}
                            onChangeText={(text) => {
                                setBio(text);
                                if (errors.bio && text.trim().length >= 50 && text.trim().length <= 200) {
                                    setErrors(prev => {
                                        const { bio, ...rest } = prev;
                                        return rest;
                                    });
                                }
                            }}
                            placeholder="Write your bio here..."
                            multiline
                            textAlignVertical="top"
                            maxLength={200}
                            editable={!isSaving}
                            placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                        />
                        <Text style={styles.charCount}>
                            {bio.length}/200 characters (minimum 50)
                        </Text>
                        {errors.bio && (
                            <Text style={styles.errorText}>{errors.bio}</Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleComplete} disabled={isProcessing || isSaving}>
                        {(isProcessing || isSaving) ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Complete Profile</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}