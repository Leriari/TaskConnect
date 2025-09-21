import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    Alert, 
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Removed setDoc import as we won't save here
import { getAuth } from 'firebase/auth'; // Import Auth functions
import BottomBarSpace from '@/app/components/BottomBarSpace';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

type FormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
};

const createStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: theme.colors.textSecondary,
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
    uneditableInput: {
        backgroundColor: theme.dark ? '#222' : '#fff',
        color: theme.dark ? '#fff' : '#000',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 5,
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

export default function PersonalDetailsScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [errors, setErrors] = useState<Partial<FormData>>({});
    const [loading, setLoading] = useState(true); // State to manage loading indicator
    const [isProcessing, setIsProcessing] = useState(false); // Renamed from isSaving, as we're not saving here yet
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    useEffect(() => {
        const fetchUserDetails = async () => {
            setLoading(true);
            try {
                const auth = getAuth();
                const user = auth.currentUser;

                if (user) {
                    const db = getFirestore();
                    const userDocRef = doc(db, 'users', user.uid); // Assuming 'users' collection and UID as document ID
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setFormData(prev => ({
                            ...prev,
                            email: userData.email || '', // Prefill email
                            phone: userData.phoneNumber || '', // Prefill phone number
                            firstName: userData.firstName || '', // Prefill first name
                            lastName: userData.lastName || '', // Prefill last name
                        }));
                    } else {
                        // This case means a user exists in auth but not in your 'users' Firestore collection.
                        // For a real app, you might want to handle this as an error or prompt for full user registration.
                        // For this flow, we'll proceed with empty firstName/lastName and prefill email/phone if available from auth.
                        console.warn("User data not found in 'users' collection for UID:", user.uid);
                        setFormData(prev => ({
                            ...prev,
                            email: user.email || '', // Fallback to auth email if Firestore user doc missing
                            phone: user.phoneNumber || '', // Fallback to auth phone if Firestore user doc missing
                        }));
                    }
                } else {
                    Alert.alert('Authentication Error', 'No authenticated user found. Please log in again.');
                    router.replace('/login');
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
                Alert.alert('Error', 'Failed to fetch user details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, []); // Empty dependency array means this effect runs once after the initial render

    const validateForm = (): boolean => {
        const newErrors: Partial<FormData> = {};

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = async () => {
        if (!validateForm()) {
            return;
        }
        setIsProcessing(true); // Show spinner immediately
        try {
            router.push({
                pathname: '/tasker-onboarding/id-verification',
                params: { personalDetails: JSON.stringify(formData) }
            });
            // Do not set isProcessing to false here; let navigation handle unmount
        } catch (error) {
            console.error("Error during navigation or data preparation for ID verification:", error);
            Alert.alert('Error', 'Failed to proceed. Please try again.');
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A80F0" />
                <Text style={styles.loadingText}>Loading personal details...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView 
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.description}>
                        Let's start with your basic information. This will be used to create your tasker profile.
                    </Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>First Name</Text>
                            <TextInput
                                style={[styles.input, errors.firstName && styles.inputError]}
                                value={formData.firstName}
                                onChangeText={(text) => {
                                    setFormData(prev => ({ ...prev, firstName: text }));
                                    if (text.trim()) {
                                        setErrors(prev => ({ ...prev, firstName: undefined }));
                                    }
                                }}
                                placeholder="Enter your first name"
                                editable={!isProcessing}
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                                returnKeyType="next"
                            />
                            {errors.firstName && (
                                <Text style={styles.errorText}>{errors.firstName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={[styles.input, errors.lastName && styles.inputError]}
                                value={formData.lastName}
                                onChangeText={(text) => {
                                    setFormData(prev => ({ ...prev, lastName: text }));
                                    if (text.trim()) {
                                        setErrors(prev => ({ ...prev, lastName: undefined }));
                                    }
                                }}
                                placeholder="Enter your last name"
                                editable={!isProcessing}
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                                returnKeyType="next"
                            />
                            {errors.lastName && (
                                <Text style={styles.errorText}>{errors.lastName}</Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.uneditableInput]}
                                value={formData.email}
                                editable={false}
                                placeholder="Email will be prefilled"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={[styles.input]}
                                value={formData.phone}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                                placeholder="Enter your phone number"
                                keyboardType="phone-pad"
                                editable={!isProcessing}
                                placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                                returnKeyType="done"
                                onSubmitEditing={() => Keyboard.dismiss()}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleNext}
                        disabled={isProcessing} // Disable button while processing
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
        </KeyboardAvoidingView>
    );
}