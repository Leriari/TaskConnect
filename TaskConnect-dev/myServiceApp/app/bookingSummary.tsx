import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SearchParamTypes, Tasker } from '../types/navigation';

export default function BookingSummaryScreen() {
    const params = useLocalSearchParams<SearchParamTypes['bookingSummary']>();
    const router = useRouter();
    const tasker = params.tasker ? JSON.parse(params.tasker) as Tasker : null;
    const bookingDate = params.date ? new Date(params.date) : null;

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'mpesa':
                return 'phone-portrait-outline';
            case 'cash':
                return 'cash-outline';
            case 'card':
                return 'card-outline';
            default:
                return 'wallet-outline';
        }
    };

    const handleConfirmBooking = () => {
        // TODO: Implement actual booking confirmation logic
        Alert.alert(
            'Booking Confirmed',
            'Your booking has been confirmed. The tasker will be notified.',
            [
                {
                    text: 'OK',
                    onPress: () => router.push('/bookings'),
                },
            ]
        );
    };

    if (!tasker || !bookingDate) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Error: Missing booking information</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking Summary</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.taskerCard}>
                    <Ionicons name="person-circle-outline" size={60} color="#4A80F0" />
                    <View style={styles.taskerInfo}>
                        <Text style={styles.taskerName}>{tasker.name}</Text>
                        <Text style={styles.taskerDetail}>{tasker.category}</Text>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                            <Text style={styles.ratingText}>{tasker.rating}</Text>
                            <Text style={styles.reviewsText}>({tasker.reviews} reviews)</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Task Details</Text>

                <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                        <Ionicons name="calendar-outline" size={24} color="#4A80F0" />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date & Time</Text>
                        <Text style={styles.detailText}>{formatDate(bookingDate)}</Text>
                        <Text style={styles.detailText}>{formatTime(bookingDate)}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                        <Ionicons name="location-outline" size={24} color="#4A80F0" />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Location</Text>
                        <Text style={styles.detailText}>{params.address}</Text>
                    </View>
                </View>

                {params.taskDuration && (
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconContainer}>
                            <Ionicons name="time-outline" size={24} color="#4A80F0" />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Estimated Duration</Text>
                            <Text style={styles.detailText}>{params.taskDuration}</Text>
                        </View>
                    </View>
                )}

                {params.notes && (
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconContainer}>
                            <Ionicons name="document-text-outline" size={24} color="#4A80F0" />
                        </View>
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Additional Notes</Text>
                            <Text style={styles.detailText}>{params.notes}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                        <Ionicons
                            name={getPaymentMethodIcon(params.paymentMethod as string)}
                            size={24}
                            color="#4A80F0"
                        />
                    </View>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Payment Method</Text>
                        <Text style={styles.detailText}>
                            {params.paymentMethod === 'mpesa' ? 'M-Pesa' :
                                params.paymentMethod?.charAt(0).toUpperCase() + params.paymentMethod?.slice(1)}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cancellation Policy</Text>
                <Text style={styles.policyText}>
                    Free cancellation up to 24 hours before the scheduled time.
                    Cancellations within 24 hours may incur a fee.
                </Text>
            </View>

            <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmBooking}
            >
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    taskerCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskerInfo: {
        marginLeft: 15,
        flex: 1,
    },
    taskerName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    taskerDetail: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 4,
    },
    reviewsText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    detailIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f5ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    detailText: {
        fontSize: 16,
        color: '#333',
    },
    policyText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    confirmButton: {
        margin: 20,
        backgroundColor: '#4A80F0',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorText: {
        color: '#ff4444',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
}); 