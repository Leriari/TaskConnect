import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import BottomBarSpace from '@/app/components/BottomBarSpace';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
// Removed Firestore imports: getFirestore, doc, setDoc
// Removed Firebase auth imports: getAuth
// Removed FirebaseError import as we're not directly handling Firestore errors here

// Define the type for PersonalDetails that we expect from params
type PersonalDetails = {
    firstName: string;
    lastName: string;
    email: string; // Ensure this is from the auth user or passed from previous screen
    phone: string;
};

// Define the type for the ID Verification form data
type IDVerificationFormData = {
    kraPin: string;
    idNumber: string;
    idFrontImage: string | null; // URI of the local image
    idBackImage: string | null;  // URI of the local image
};

// New type to combine data from previous steps for passing
type CombinedOnboardingData = PersonalDetails & IDVerificationFormData & {
    idFrontImageBase64: string; // Base64 strings for final save
    idBackImageBase64: string;
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
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
    },
    sublabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 10,
    },
    input: {
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
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 5,
    },
    idImagesContainer: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 10,
    },
    imageUploadBox: {
        flex: 1,
        aspectRatio: 3 / 2,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.card,
        overflow: 'hidden',
    },
    imageUploadError: {
        borderColor: theme.colors.error,
    },
    uploadText: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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

export default function IDVerificationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    // Parse the combined data from the params (assuming it comes from the previous step)
    const personalDetails: PersonalDetails | null = params.personalDetails
        ? JSON.parse(params.personalDetails as string)
        : null;

    const [formData, setFormData] = useState<IDVerificationFormData>({
        kraPin: '',
        idNumber: '',
        idFrontImage: null,
        idBackImage: null,
    });

    const [errors, setErrors] = useState<Partial<IDVerificationFormData>>({});
    const [isProcessing, setIsProcessing] = useState(false); // Renamed from isSaving

    // If personalDetails are missing, log an error or redirect
    if (!personalDetails) {
        // In a real app, you might want router.replace('/tasker-onboarding/personal-details');
        // For this example, we'll let it proceed for now, but a warning is appropriate.
    }

    const pickImage = async (side: 'front' | 'back') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please grant access to your photo library to upload images.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 2],
            quality: 0.5, // Reduced quality to help keep Base64 size down
            base64: false, // We'll convert to Base64 manually after getting the URI
        });

        if (!result.canceled) {
            setFormData(prev => ({
                ...prev,
                [side === 'front' ? 'idFrontImage' : 'idBackImage']: result.assets[0].uri,
            }));
            setErrors(prev => ({
                ...prev,
                [side === 'front' ? 'idFrontImage' : 'idBackImage']: undefined,
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<IDVerificationFormData> = {};

        if (!formData.kraPin.trim()) {
            newErrors.kraPin = 'KRA PIN is required';
        } else if (!/^[A-Z]\d{9}[A-Z]$/.test(formData.kraPin.trim())) {
            newErrors.kraPin = 'Please enter a valid KRA PIN (e.g., A123456789Z)';
        }

        if (!formData.idNumber.trim()) {
            newErrors.idNumber = 'ID Number is required';
        } else if (!/^\d{8}$/.test(formData.idNumber.trim())) {
            newErrors.idNumber = 'Please enter a valid 8-digit ID number';
        }

        if (!formData.idFrontImage) {
            newErrors.idFrontImage = 'Front image of ID is required';
        }

        if (!formData.idBackImage) {
            newErrors.idBackImage = 'Back image of ID is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const convertImageToBase64 = async (uri: string, side: 'front' | 'back'): Promise<string> => {
        try {
            const response = await fetch(uri);
            if (!response.ok) {
                throw new Error(`Failed to fetch image from local URI: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();

            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        resolve(reader.result);
                    } else {
                        reject(new Error("FileReader did not return a valid Base64 string."));
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });

            return base64;

        } catch (error: any) {
            throw error;
        }
    };

    const handleNext = async () => {
        if (!validateForm()) {
            return;
        }

        if (!personalDetails) {
            Alert.alert('Error', 'Personal details are missing. Please go back and fill them.');
            router.replace('/tasker-onboarding/personal-details'); // Redirect back if personal details are missing
            return;
        }

        setIsProcessing(true); // Start processing
        try {
            if (!formData.idFrontImage) {
                throw new Error("Front ID image is missing.");
            }
            if (!formData.idBackImage) {
                throw new Error("Back ID image is missing.");
            }

            // Convert images to Base64 strings
            const frontImageBase64 = await convertImageToBase64(formData.idFrontImage!, 'front');
            const backImageBase64 = await convertImageToBase64(formData.idBackImage!, 'back');

            // Combine all collected data into a single object for passing
            const combinedTaskerData: CombinedOnboardingData = {
                // Personal Details (from previous screen)
                firstName: personalDetails.firstName,
                lastName: personalDetails.lastName,
                email: personalDetails.email,
                phone: personalDetails.phone,

                // ID Verification Details (from current screen)
                kraPin: formData.kraPin.trim(),
                idNumber: formData.idNumber.trim(),
                idFrontImage: formData.idFrontImage, // Keep URI for potential display if needed later
                idBackImage: formData.idBackImage, // Keep URI for potential display if needed later
                idFrontImageBase64: frontImageBase64, // Pass Base64 for eventual saving
                idBackImageBase64: backImageBase64, // Pass Base64 for eventual saving
            };

            // --- START: The ONLY LOG remaining ---
            console.log("--------------------------------------------------");
            console.log("ALL COLLECTED ONBOARDING DATA (Awaiting Save):");
            console.log(JSON.stringify(combinedTaskerData, null, 2));
            console.log("--------------------------------------------------");
            // --- END: The ONLY LOG remaining ---

            // Pass the combined data as a JSON string to the next route
            router.push({
                pathname: '/tasker-onboarding/areas-served',
                params: {
                    onboardingData: JSON.stringify(combinedTaskerData)
                },
            });

        } catch (error: any) {
            let errorMessage = 'An error occurred while preparing your data. Please try again.';
            if (error instanceof Error) {
                errorMessage = `App Error: ${error.message}`;
            }
            Alert.alert('Error', errorMessage);
        } finally {
            setIsProcessing(false); // Stop processing
        }
    };

    return (
        <>
            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.description}>
                        To ensure the safety and trust of our community, we need to verify your identity.
                        Please provide your KRA PIN, ID number, and upload clear images of your ID card.
                    </Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>KRA PIN</Text>
                            <TextInput
                                style={[styles.input, errors.kraPin && styles.inputError]}
                                value={formData.kraPin}
                                onChangeText={(text) => {
                                    setFormData(prev => ({ ...prev, kraPin: text.toUpperCase() }));
                                    if (text.trim()) {
                                        setErrors(prev => ({ ...prev, kraPin: undefined }));
                                    }
                                }}
                                placeholder="Enter your KRA PIN (e.g., A123456789Z)"
                                autoCapitalize="characters"
                                maxLength={11}
                                editable={!isProcessing}
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                            />
                            {errors.kraPin && (
                                <Text style={styles.errorText}>{errors.kraPin}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ID Number</Text>
                            <TextInput
                                style={[styles.input, errors.idNumber && styles.inputError]}
                                value={formData.idNumber}
                                onChangeText={(text) => {
                                    setFormData(prev => ({ ...prev, idNumber: text }));
                                    if (text.trim()) {
                                        setErrors(prev => ({ ...prev, idNumber: undefined }));
                                    }
                                }}
                                placeholder="Enter your ID number (e.g., 12345678)"
                                keyboardType="number-pad"
                                maxLength={8}
                                editable={!isProcessing}
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                            />
                            {errors.idNumber && (
                                <Text style={styles.errorText}>{errors.idNumber}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ID Card Images</Text>
                            <Text style={styles.sublabel}>Upload clear photos of both sides of your ID</Text>

                            <View style={styles.idImagesContainer}>
                                <TouchableOpacity
                                    style={[styles.imageUploadBox, errors.idFrontImage && styles.imageUploadError]}
                                    onPress={() => pickImage('front')}
                                    disabled={isProcessing}
                                >
                                    {formData.idFrontImage ? (
                                        <Image
                                            source={{ uri: formData.idFrontImage }}
                                            style={styles.uploadedImage}
                                        />
                                    ) : (
                                        <>
                                            <Ionicons name="camera-outline" size={32} color="#666" />
                                            <Text style={styles.uploadText}>Front Side</Text>
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.imageUploadBox, errors.idBackImage && styles.imageUploadError]}
                                    onPress={() => pickImage('back')}
                                    disabled={isProcessing}
                                >
                                    {formData.idBackImage ? (
                                        <Image
                                            source={{ uri: formData.idBackImage }}
                                            style={styles.uploadedImage}
                                        />
                                    ) : (
                                        <>
                                            <Ionicons name="camera-outline" size={32} color="#666" />
                                            <Text style={styles.uploadText}>Back Side</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            {(errors.idFrontImage || errors.idBackImage) && (
                                <Text style={styles.errorText}>Both sides of ID are required</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleNext}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Next</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <BottomBarSpace />
        </>
    );
}