import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomBarSpace from '@/app/components/BottomBarSpace';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

type PaymentMethod = 'mpesa' | 'cash' | 'card';

type MpesaDetails = {
    phoneNumber: string;
    name: string;
};

const createStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
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
    methodsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    methodButton: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        gap: 8,
    },
    methodButtonSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    methodButtonText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    methodButtonTextSelected: {
        color: '#fff',
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
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalBody: {
        marginTop: 10,
    },
    modalDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        marginBottom: 8,
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
    modalButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}));

export default function PaymentMethodsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
    const [mpesaDetails, setMpesaDetails] = useState<MpesaDetails>({
        phoneNumber: '',
        name: '',
    });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [showMpesaModal, setShowMpesaModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    const paymentMethods = [
        { id: 'mpesa', label: 'M-Pesa', icon: 'phone-portrait-outline' },
        { id: 'cash', label: 'Cash', icon: 'cash-outline' },
        { id: 'card', label: 'Card', icon: 'card-outline' },
    ];

    const togglePaymentMethod = (method: PaymentMethod) => {
        setSelectedMethods(prev => {
            if (prev.includes(method)) {
                if (method === 'mpesa') {
                    setShowMpesaModal(false);
                }
                return prev.filter(m => m !== method);
            }
            if (method === 'mpesa') {
                setShowMpesaModal(true);
            }
            return [...prev, method];
        });
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (selectedMethods.length === 0) {
            newErrors.methods = 'Please select at least one payment method';
        }

        if (selectedMethods.includes('mpesa')) {
            if (!mpesaDetails.phoneNumber.trim()) {
                newErrors.phoneNumber = 'Phone number is required for M-Pesa';
            } else if (!/^\d{10}$/.test(mpesaDetails.phoneNumber.replace(/[^0-9]/g, ''))) {
                newErrors.phoneNumber = 'Please enter a valid 10-digit phone number';
            }

            if (!mpesaDetails.name.trim()) {
                newErrors.name = 'Account name is required for M-Pesa';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateForm()) {
            setIsProcessing(true);
            try {
                router.push({
                    pathname: '/tasker-onboarding/profile',
                    params: {
                        personalDetails: params.personalDetails,
                        idVerification: params.idVerification,
                        areasServed: params.areasServed,
                        services: params.services,
                        paymentMethods: JSON.stringify({
                            methods: selectedMethods,
                            mpesaDetails: selectedMethods.includes('mpesa') ? mpesaDetails : null,
                        }),
                    },
                });
            } catch (error) {
                setIsProcessing(false);
            }
        }
    };

    return (
        <>
            <View style={styles.container}>
                <ScrollView style={styles.scrollView}>
                    <View style={styles.content}>
                        <Text style={styles.description}>
                            Select the payment methods you want to accept from clients.
                        </Text>

                        <View style={styles.methodsContainer}>
                            {paymentMethods.map((method) => (
                                <TouchableOpacity
                                    key={method.id}
                                    style={[
                                        styles.methodButton,
                                        selectedMethods.includes(method.id as PaymentMethod) && styles.methodButtonSelected,
                                    ]}
                                    onPress={() => togglePaymentMethod(method.id as PaymentMethod)}
                                >
                                    <Ionicons
                                        name={method.icon as any}
                                        size={24}
                                        color={selectedMethods.includes(method.id as PaymentMethod) ? '#fff' : '#666'}
                                    />
                                    <Text style={[
                                        styles.methodButtonText,
                                        selectedMethods.includes(method.id as PaymentMethod) && styles.methodButtonTextSelected,
                                    ]}>
                                        {method.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {errors.methods && (
                            <Text style={styles.errorText}>{errors.methods}</Text>
                        )}

                        <TouchableOpacity style={styles.button} onPress={handleNext} disabled={isProcessing}>
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Next</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
            <BottomBarSpace />

            {/* M-Pesa Details Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showMpesaModal}
                onRequestClose={() => setShowMpesaModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>M-Pesa Details</Text>
                            <TouchableOpacity onPress={() => setShowMpesaModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalDescription}>
                                Enter your M-Pesa details to receive payments from clients.
                            </Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone Number</Text>
                                <TextInput
                                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                                    value={mpesaDetails.phoneNumber}
                                    onChangeText={(text) => {
                                        setMpesaDetails(prev => ({ ...prev, phoneNumber: text }));
                                        if (errors.phoneNumber) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.phoneNumber;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    placeholder="Enter M-Pesa number"
                                    keyboardType="phone-pad"
                                    placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                                />
                                {errors.phoneNumber && (
                                    <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Account Name</Text>
                                <TextInput
                                    style={[styles.input, errors.name && styles.inputError]}
                                    value={mpesaDetails.name}
                                    onChangeText={(text) => {
                                        setMpesaDetails(prev => ({ ...prev, name: text }));
                                        if (errors.name) {
                                            setErrors(prev => {
                                                const newErrors = { ...prev };
                                                delete newErrors.name;
                                                return newErrors;
                                            });
                                        }
                                    }}
                                    placeholder="Enter account name"
                                    placeholderTextColor={theme.dark ? theme.colors.textLight : '#000'}
                                />
                                {errors.name && (
                                    <Text style={styles.errorText}>{errors.name}</Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => {
                                    if (validateForm()) {
                                        setShowMpesaModal(false);
                                    }
                                }}
                            >
                                <Text style={styles.modalButtonText}>Save Details</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
} 