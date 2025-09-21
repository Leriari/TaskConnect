import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase-config';
import { useTheme } from '@/app/context/ThemeContext';
import { createThemedStyles, useThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '@/firebase-config';

interface JobData {
    id: string;
    clientId: string;
    taskerId: string;
    amount: number;
    date: string;
    address: string;
    notes?: string;
    status: string;
    paymentStatus: string;
    createdAt: any;
    [key: string]: any;
}

/**
 * JobStatusScreen is a React component that displays the status and details of a specific job.
 * 
 * It fetches job data from Firestore using the provided `jobId` from local search parameters,
 * and polls for updates every 5 seconds. The screen shows job information such as status, amount,
 * date, address, and notes. If the job is in escrow, it allows the user to approve payment to the
 * tasker by triggering a backend API call. The UI provides feedback for loading, errors, and payment
 * approval status.
 * 
 * @component
 * @returns {JSX.Element} The rendered job status screen.
 */
const JobStatusScreen = () => {
    const { jobId, viewMode } = useLocalSearchParams();
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const insets = useSafeAreaInsets();
    const [job, setJob] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [approving, setApproving] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [mpesaNumber, setMpesaNumber] = useState('');
    const [clientInfo, setClientInfo] = useState<any>(null);
    const [taskerInfo, setTaskerInfo] = useState<any>(null);
    const [isTasker, setIsTasker] = useState(false);

    useEffect(() => {
        // Determine if current user is tasker or client
        const checkUserRole = async () => {
            const user = auth.currentUser;
            if (user && job) {
                if (job.taskerId === user.uid) {
                    setIsTasker(true);
                } else if (job.clientId === user.uid) {
                    setIsTasker(false);
                }
            }
        };
        checkUserRole();
    }, [job]);

    useEffect(() => {
        if (!jobId) return;

        setLoading(true);
        // Set up real-time listener
        const unsubscribe = onSnapshot(
            doc(db, 'jobs', jobId as string),
            async (docSnap) => {
                if (docSnap.exists()) {
                    const jobData = { id: docSnap.id, ...docSnap.data() } as JobData;
                    setJob(jobData);

                    // Fetch additional user information
                    try {
                        if (jobData.clientId) {
                            const clientDoc = await getDoc(doc(db, 'users', jobData.clientId));
                            if (clientDoc.exists()) {
                                setClientInfo(clientDoc.data());
                            }
                        }
                        if (jobData.taskerId) {
                            const taskerDoc = await getDoc(doc(db, 'taskers', jobData.taskerId));
                            if (taskerDoc.exists()) {
                                setTaskerInfo(taskerDoc.data());
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching user info:', error);
                    }

                    setError(null);
                } else {
                    setError('Job not found');
                }
                setLoading(false);
            },
            (error) => {
                console.error("Error listening to job:", error);
                setError('Failed to fetch job');
                setLoading(false);
            }
        );

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [jobId]);

    const handleInitiatePayment = async () => {
        if (!job) return;

        if (!mpesaNumber.trim()) {
            Alert.alert('M-PESA Number Required', 'Please enter your M-PESA phone number to proceed with payment.');
            return;
        }
        const mpesaRegex = /^(?:254|\\+254|0)?([71](?:(?:0[0-8])|(?:[12][0-9])|(?:9[0-9])|(?:4[0-3]))[0-9]{6})$/;
        if (!mpesaRegex.test(mpesaNumber)) {
            Alert.alert('Invalid Number', 'Please enter a valid M-PESA phone number.');
            return;
        }

        setIsPaying(true);
        try {
            console.log('Initiating STK push with:', {
                amount: job.amount,
                phoneNumber: mpesaNumber,
                accountReference: job.id,
                transactionDesc: `Payment for Job #${job.id}`,
            });

            const res = await fetch('https://d2b2-41-80-113-66.ngrok-free.app/taskconnect-30e07/us-central1/api/mpesa/stkpush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: job.amount,
                    phoneNumber: mpesaNumber,
                    accountReference: job.id,
                    transactionDesc: `Payment for Job #${job.id}`,
                }),
            });

            console.log('STK push response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('STK push failed with status:', res.status, 'Error:', errorText);
                throw new Error(`STK Push failed: ${errorText}`);
            }

            const json = await res.json();
            console.log('STK push response:', json);

            if (json.error) {
                throw new Error(json.error + (json.responseDescription ? `: ${json.responseDescription}` : ''));
            }

            if (!json.checkoutRequestId) {
                throw new Error('No checkout request ID received from server');
            }

            await updateDoc(doc(db, 'jobs', job.id), { checkoutRequestId: json.checkoutRequestId });

            // DEMO: Immediately update status to 'in_escrow' and paymentStatus to 'paid' (bypassing callback)
            await updateDoc(doc(db, 'jobs', job.id), {
                status: 'in_escrow',
                paymentStatus: 'paid',
                paymentDetails: { demoBypass: true, message: 'Status updated without callback for demo.' }
            });

            Alert.alert(
                'STK Push Sent',
                'Please check your phone and enter your M-PESA PIN to authorize the payment.'
            );
            // The onSnapshot listener will automatically update the status once the callback is processed.
        } catch (error: any) {
            console.error('Payment initiation failed:', error);
            Alert.alert('Payment Error', error.message || 'Failed to initiate payment. Please try again.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleApprovePayment = async () => {
        if (!job) return;

        setApproving(true);
        try {
            if (!job?.taskerId) {
                Alert.alert('Error', 'Tasker ID is missing from the job.');
                setApproving(false);
                return;
            }

            console.log(`Fetching tasker details for ID: ${job.taskerId}`);
            const taskerDocRef = doc(db, 'taskers', job.taskerId);
            const taskerDocSnap = await getDoc(taskerDocRef);

            if (!taskerDocSnap.exists()) {
                Alert.alert('Error', 'Tasker details not found in the database.');
                console.error(`Tasker document with ID ${job.taskerId} does not exist.`);
                setApproving(false);
                return;
            }

            const taskerData = taskerDocSnap.data();
            // Log the entire tasker object to see available fields in the console
            console.log('Retrieved tasker data:', JSON.stringify(taskerData, null, 2));

            // Make the phone number check more robust by checking common field names
            const taskerPhone = taskerData?.phoneNumber || taskerData?.phone || taskerData?.mpesaNumber;

            if (!taskerPhone) {
                Alert.alert(
                    'Tasker Phone Number Not Found',
                    'The tasker has not provided a valid phone number for payment. Please contact support.'
                );
                console.error('Tasker data does not contain a "phoneNumber", "phone", or "mpesaNumber" field.', taskerData);
                setApproving(false);
                return;
            }

            console.log(`Found tasker phone number: ${taskerPhone}. Proceeding with B2C payment.`);

            const res = await fetch('https://d2b2-41-80-113-66.ngrok-free.app/taskconnect-30e07/us-central1/api/mpesa/b2c', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: job.id,
                    taskerPhone: taskerPhone,
                    amount: job.amount
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'An unknown server error occurred' }));
                throw new Error(errorData.message || 'Failed to approve payment.');
            }

            const data = await res.json();

            if (data.success) {
                const message = data.phoneUsed && data.phoneUsed !== taskerPhone
                    ? `Payment to tasker has been initiated. (Note: Used sandbox test number: ${data.phoneUsed})`
                    : (data.message || 'Payment to tasker has been initiated.');

                Alert.alert('Success', message);
                // The onSnapshot listener will update the UI once the backend updates the status
            } else {
                Alert.alert('Error', data.message || 'Failed to initiate payment to tasker.');
            }
        } catch (e: any) {
            console.error('Payment approval error:', e);

            // Provide more specific error messages
            let errorMessage = e.message || 'An error occurred while approving payment.';

            if (e.message?.includes('Credit Party customer type')) {
                errorMessage = 'The tasker\'s phone number is not registered for M-PESA payments. Please contact support.';
            } else if (e.message?.includes('sandbox')) {
                errorMessage = 'Sandbox environment issue. Please try again or contact support.';
            } else if (e.message?.includes('initiator information is invalid') || e.message?.includes('2001')) {
                errorMessage = 'B2C configuration issue. Please contact support to verify M-PESA settings.';
            } else if (e.message?.includes('SecurityCredential')) {
                errorMessage = 'M-PESA security configuration error. Please contact support.';
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setApproving(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending_approval':
                return {
                    container: styles.statusBadgeWarning,
                    text: styles.statusText,
                    icon: 'time-outline' as const
                };
            case 'in_progress':
                return {
                    container: styles.statusBadgeInfo,
                    text: styles.statusText,
                    icon: 'play-circle-outline' as const
                };
            case 'in_escrow':
                return {
                    container: styles.statusBadgeWarning,
                    text: styles.statusText,
                    icon: 'hourglass-outline' as const
                };
            case 'processing_payment':
                return {
                    container: styles.statusBadgeInfo,
                    text: styles.statusText,
                    icon: 'sync-outline' as const
                };
            case 'completed':
                return {
                    container: styles.statusBadgeSuccess,
                    text: styles.statusText,
                    icon: 'checkmark-circle-outline' as const
                };
            case 'payment_failed':
                return {
                    container: styles.statusBadgeError,
                    text: styles.statusText,
                    icon: 'close-circle-outline' as const
                };
            case 'payout_failed':
                return {
                    container: styles.statusBadgeError,
                    text: styles.statusText,
                    icon: 'alert-circle-outline' as const
                };
            case 'cancelled':
                return {
                    container: styles.statusBadgeError,
                    text: styles.statusText,
                    icon: 'close-circle-outline' as const
                };
            case 'rejected':
                return {
                    container: styles.statusBadgeError,
                    text: styles.statusText,
                    icon: 'close-circle-outline' as const
                };
            default:
                return {
                    container: styles.statusBadgeDefault,
                    text: styles.statusText,
                    icon: 'help-circle-outline' as const
                };
        }
    };

    const renderRatingSection = () => {
        if (!job) return null;

        if (job.rating) {
            return (
                <View style={styles.ratingSection}>
                    <Text style={styles.sectionTitle}>Your Rating</Text>
                    <View style={styles.ratingContainer}>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                    key={star}
                                    name={job.rating.stars >= star ? 'star' : 'star-outline'}
                                    size={24}
                                    color={theme.colors.warning}
                                    style={styles.starIcon}
                                />
                            ))}
                            <Text style={styles.ratingText}>{job.rating.stars}/5</Text>
                        </View>
                        {job.rating.comment && (
                            <Text style={styles.reviewText}>{job.rating.comment}</Text>
                        )}
                    </View>
                </View>
            );
        }

        if (job.status === 'completed') {
            return (
                <TouchableOpacity
                    style={styles.rateButton}
                    onPress={() => router.push({
                        pathname: '/home/screens/RateTaskerScreen',
                        params: { jobId: job.id }
                    })}
                >
                    <Ionicons name="star-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Rate Your Tasker</Text>
                </TouchableOpacity>
            );
        }

        return null;
    };

    const renderPaymentSection = () => {
        if (job?.status !== 'in_progress') return null;

        return (
            <View style={styles.paymentContainer}>
                <Text style={styles.sectionTitle}>Complete Your Payment</Text>
                <Text style={styles.helperText}>The tasker has approved your request. Please pay now to confirm the booking.</Text>
                <TextInput
                    style={styles.input}
                    value={mpesaNumber}
                    onChangeText={setMpesaNumber}
                    placeholder="Enter M-PESA phone number (e.g., 254...)"
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity
                    style={[styles.button, isPaying && styles.buttonDisabled]}
                    onPress={handleInitiatePayment}
                    disabled={isPaying}
                >
                    {isPaying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Pay KES {job.amount}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderRetryPaymentSection = () => {
        if (job?.status !== 'payment_failed') return null;

        return (
            <View style={styles.paymentContainer}>
                <Text style={styles.sectionTitle}>Payment Failed</Text>
                <Text style={styles.helperText}>Your previous payment attempt failed. Please try again with a different phone number or check your M-PESA balance.</Text>
                <TextInput
                    style={styles.input}
                    value={mpesaNumber}
                    onChangeText={setMpesaNumber}
                    placeholder="Enter M-PESA phone number (e.g., 254...)"
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity
                    style={[styles.button, isPaying && styles.buttonDisabled]}
                    onPress={handleInitiatePayment}
                    disabled={isPaying}
                >
                    {isPaying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Retry Payment KES {job.amount}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderRetryBookingSection = () => {
        if (job?.status !== 'pending_approval') return null;

        return (
            <View style={styles.paymentContainer}>
                <Text style={styles.sectionTitle}>Booking Pending</Text>
                <Text style={styles.helperText}>Your booking request is waiting for the tasker's approval. You can cancel and try booking with a different tasker if needed.</Text>
                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => {
                        Alert.alert(
                            'Cancel Booking',
                            'Are you sure you want to cancel this booking?',
                            [
                                { text: 'No', style: 'cancel' },
                                {
                                    text: 'Yes',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await updateDoc(doc(db, 'jobs', job.id), {
                                                status: 'cancelled',
                                                cancelledAt: serverTimestamp()
                                            });
                                            Alert.alert('Success', 'Booking cancelled successfully');
                                        } catch (error) {
                                            console.error('Error cancelling booking:', error);
                                            Alert.alert('Error', 'Failed to cancel booking');
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel Booking</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderRetryPayoutSection = () => {
        if (job?.status !== 'payout_failed') return null;

        return (
            <View style={styles.paymentContainer}>
                <Text style={styles.sectionTitle}>Payout Failed</Text>
                <Text style={styles.helperText}>The payment to the tasker failed. You can retry the payout or contact support for assistance.</Text>
                <TouchableOpacity
                    style={[styles.button, approving && styles.buttonDisabled]}
                    onPress={handleApprovePayment}
                    disabled={approving}
                >
                    {approving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Retry Payout to Tasker</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderTaskerView = () => {
        if (!job || !clientInfo) return null;

        return (
            <View style={styles.taskerInfoCard}>
                <Text style={styles.sectionTitle}>Client Information</Text>

                <View style={styles.clientCard}>
                    <View style={styles.clientHeader}>
                        <View style={styles.clientAvatar}>
                            <Ionicons name="person" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.clientDetails}>
                            <Text style={styles.clientName}>
                                {clientInfo.firstName && clientInfo.lastName
                                    ? `${clientInfo.firstName} ${clientInfo.lastName}`.trim()
                                    : clientInfo.displayName || 'Client'
                                }
                            </Text>
                            <Text style={styles.clientEmail}>{clientInfo.email || 'No email provided'}</Text>
                        </View>
                    </View>

                    <View style={styles.jobLocationSection}>
                        <Text style={styles.locationTitle}>Job Location</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={16} color={theme.colors.textLight} />
                            <Text style={styles.locationText}>{job.address}</Text>
                        </View>
                    </View>

                    {job.notes && (
                        <View style={styles.notesSection}>
                            <Text style={styles.notesTitle}>Client Notes</Text>
                            <Text style={styles.notesText}>{job.notes}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderClientView = () => {
        if (!job || !taskerInfo) return null;

        return (
            <View style={styles.taskerInfoCard}>
                <Text style={styles.sectionTitle}>Tasker Information</Text>

                <View style={styles.taskerCard}>
                    <View style={styles.taskerHeader}>
                        <View style={styles.taskerAvatar}>
                            <Ionicons name="person" size={24} color={theme.colors.primary} />
                        </View>
                        <View style={styles.taskerDetails}>
                            <Text style={styles.taskerName}>
                                {taskerInfo.firstName && taskerInfo.lastName
                                    ? `${taskerInfo.firstName} ${taskerInfo.lastName}`.trim()
                                    : 'Tasker'
                                }
                            </Text>
                            <Text style={styles.taskerPhone}>{taskerInfo.phoneNumber || taskerInfo.phone || 'No phone provided'}</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }
    if (error) {
        return <View style={styles.loadingContainer}><Text style={styles.errorText}>{error}</Text></View>;
    }

    const jobStatus = job?.status || 'unknown';
    const statusStyle = getStatusStyle(jobStatus);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Job Status</Text>
            </View>

            {job ? (
                <View style={styles.card}>
                    <View style={[styles.statusBadge, statusStyle.container]}>
                        <Ionicons name={statusStyle.icon} size={22} color={theme.colors.text} />
                        <Text style={[styles.statusText, statusStyle.text]}>{jobStatus.replace(/_/g, ' ').toUpperCase()}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="pricetag-outline" size={20} color={theme.colors.textLight} style={styles.icon} />
                        <Text style={styles.detailText}>Ksh {job.amount}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={20} color={theme.colors.textLight} style={styles.icon} />
                        <Text style={styles.detailText}>{new Date(job.date).toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={20} color={theme.colors.textLight} style={styles.icon} />
                        <Text style={styles.detailText}>{job.address}</Text>
                    </View>
                    {job.notes && (
                        <View style={styles.detailRow}>
                            <Ionicons name="document-text-outline" size={20} color={theme.colors.textLight} style={styles.icon} />
                            <Text style={styles.detailText}>{job.notes}</Text>
                        </View>
                    )}

                    {renderRatingSection()}
                </View>
            ) : (
                <View style={styles.card}>
                    <Text>No job details found.</Text>
                </View>
            )}

            {renderPaymentSection()}
            {renderRetryPaymentSection()}

            {renderRetryBookingSection()}
            {renderRetryPayoutSection()}

            {job?.status === 'in_escrow' && (
                <View style={styles.paymentContainer}>
                    <Text style={styles.sectionTitle}>Payment in Escrow</Text>
                    <Text style={styles.helperText}>Your payment has been received and is being held securely. Click below to release the payment to the tasker.</Text>
                    <TouchableOpacity
                        style={[styles.button, approving && styles.buttonDisabled]}
                        onPress={handleApprovePayment}
                        disabled={approving}
                    >
                        {approving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Approve Payment to Tasker</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {job?.status === 'processing_payment' && (
                <View style={styles.paymentContainer}>
                    <Text style={styles.sectionTitle}>Processing Payment</Text>
                    <Text style={styles.helperText}>Payment to the tasker is being processed. This may take a few minutes. You'll be notified once it's complete.</Text>
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={styles.processingText}>Processing...</Text>
                    </View>
                </View>
            )}

            {renderTaskerView()}
            {renderClientView()}

            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => router.replace('/home')}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to Home</Text>
            </TouchableOpacity>

            {/* Bottom safe area to prevent button from clashing with phone navigation */}
            <View style={{ height: insets.bottom + 20 }} />

        </ScrollView>
    );
};

const createStyles = createThemedStyles(theme => ({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        padding: 20,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.dark ? 0.25 : 0.05,
        shadowRadius: 10,
        elevation: 5,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginBottom: 20,
        alignSelf: 'flex-start',
    },
    statusBadgeSuccess: { backgroundColor: theme.dark ? theme.colors.success : 'rgba(46, 184, 92, 0.15)' },
    statusBadgeWarning: { backgroundColor: theme.dark ? theme.colors.warning : 'rgba(255, 193, 7, 0.15)' },
    statusBadgeError: { backgroundColor: theme.dark ? theme.colors.error : 'rgba(220, 53, 69, 0.15)' },
    statusBadgeInfo: { backgroundColor: theme.colors.primaryLight },
    statusBadgeDefault: { backgroundColor: theme.colors.border },
    statusText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    icon: {
        marginRight: 15,
        marginTop: 2,
    },
    detailText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 22,
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    buttonDisabled: {
        backgroundColor: theme.colors.primaryLight,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    secondaryButtonText: {
        color: theme.colors.primary,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
        textAlign: 'center',
    },
    ratingSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 10,
    },
    ratingContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    starIcon: {
        marginRight: 2,
    },
    ratingText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    reviewText: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
    },
    rateButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginTop: 20,
    },
    buttonIcon: {
        marginRight: 8,
    },
    paymentContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
    },
    helperText: {
        fontSize: 14,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginBottom: 15,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    processingText: {
        marginLeft: 10,
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    taskerInfoCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 15,
        padding: 20,
        marginBottom: 20,
    },
    clientCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
    },
    clientHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    clientAvatar: {
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
        padding: 5,
        marginRight: 10,
    },
    clientDetails: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    clientEmail: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    jobLocationSection: {
        marginBottom: 10,
    },
    locationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 22,
    },
    notesSection: {
        marginTop: 10,
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    notesText: {
        fontSize: 16,
        color: theme.colors.text,
        lineHeight: 22,
    },
    taskerCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
    },
    taskerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    taskerAvatar: {
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
        padding: 5,
        marginRight: 10,
    },
    taskerDetails: {
        flex: 1,
    },
    taskerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    taskerPhone: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
}));

export default JobStatusScreen; 