import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase-config';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

interface TaskerInfo {
    name: string;
    image: string | null;
}

interface BookedJob {
    id: string;
    taskerId: string;
    date: string;
    status: string;
    taskerInfo: TaskerInfo | null;
    rating?: {
        stars: number;
        comment: string;
    };
    amount?: number;
}

const STATUS_META = [
    { key: 'in_escrow', label: 'In Escrow', color: 'primary', icon: 'hourglass-outline' },
    { key: 'processing_payment', label: 'Processing', color: 'primary', icon: 'sync-outline' },
    { key: 'paid', label: 'Paid', color: 'success', icon: 'checkmark-circle-outline' },
    { key: 'completed', label: 'Completed', color: 'success', icon: 'checkmark-done-circle-outline' },
    { key: 'failed', label: 'Failed', color: 'error', icon: 'close-circle-outline' },
];

const getLegendColor = (color: string, theme: any) => {
    if (color === 'primary') return theme.colors.primary;
    if (color === 'success') return theme.colors.success;
    if (color === 'error') return theme.colors.error;
    return theme.colors.primary;
};

const BookedTasksList = () => {
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const [jobs, setJobs] = useState<BookedJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            try {
                const user = auth.currentUser;
                if (!user) {
                    setJobs([]);
                    setLoading(false);
                    return;
                }
                const jobsQ = query(collection(db, 'jobs'), where('clientId', '==', user.uid));
                const jobsSnap = await getDocs(jobsQ);
                const jobsData: BookedJob[] = [];
                for (const jobDoc of jobsSnap.docs) {
                    const job = jobDoc.data();
                    let taskerInfo: TaskerInfo | null = null;
                    if (job.taskerId) {
                        const taskerSnap = await getDoc(doc(db, 'taskers', job.taskerId));
                        if (taskerSnap.exists()) {
                            const t = taskerSnap.data();
                            taskerInfo = {
                                name: `${t.firstName || ''} ${t.lastName || ''}`.trim(),
                                image: t.profileImageBase64 || t.profileImage || null,
                            };
                        }
                    }
                    jobsData.push({
                        id: jobDoc.id,
                        taskerId: job.taskerId,
                        date: job.date,
                        status: job.status,
                        taskerInfo,
                        rating: job.rating,
                        amount: job.amount,
                    });
                }
                // Sort by date descending
                jobsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setJobs(jobsData);
            } catch (e) {
                console.error('Error fetching jobs:', e);
                setJobs([]);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    const getStatusBadge = (status: string) => {
        let color = theme.colors.primary;
        let bg = theme.colors.primaryLight;
        let icon = 'hourglass-outline';
        if (status === 'paid') {
            color = theme.colors.success;
            bg = theme.dark ? theme.colors.success : 'rgba(46, 184, 92, 0.15)';
            icon = 'checkmark-circle-outline';
        } else if (status === 'failed') {
            color = theme.colors.error;
            bg = theme.dark ? theme.colors.error : 'rgba(220, 53, 69, 0.15)';
            icon = 'close-circle-outline';
        } else if (status === 'processing_payment') {
            color = theme.colors.primary;
            bg = theme.colors.primaryLight;
            icon = 'sync-outline';
        }
        return (
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={16} color={color} />
                <Text style={[styles.statusText, { color }]}>{status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
        );
    };

    const renderLegend = () => (
        <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Status Legend:</Text>
            <View style={styles.legendRow}>
                {STATUS_META.map(meta => (
                    <View key={meta.key} style={styles.legendItem}>
                        <View style={[styles.legendBadge, { backgroundColor: meta.color === 'primary' ? theme.colors.primaryLight : meta.color === 'success' ? (theme.dark ? theme.colors.success : 'rgba(46, 184, 92, 0.15)') : meta.color === 'error' ? (theme.dark ? theme.colors.error : 'rgba(220, 53, 69, 0.15)') : theme.colors.primaryLight }]}>
                            <Ionicons name={meta.icon as any} size={14} color={getLegendColor(meta.color, theme)} />
                        </View>
                        <Text style={[styles.legendLabel, { color: getLegendColor(meta.color, theme) }]}>{meta.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const handleDeleteBooking = async (jobId: string, status: string) => {
        // Don't allow deletion of jobs that are in progress or completed
        if (['in_escrow', 'processing_payment', 'paid', 'completed'].includes(status)) {
            Alert.alert(
                'Cannot Delete',
                'Jobs that are in progress, paid, or completed cannot be deleted.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Delete Booking',
            'Are you sure you want to delete this booking? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, 'jobs', jobId));
                            // Update the local state to remove the deleted job
                            setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
                        } catch (error) {
                            console.error('Error deleting booking:', error);
                            Alert.alert('Error', 'Failed to delete the booking. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (jobs.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="notifications-outline" size={48} color={theme.colors.textLight} />
                <Text style={styles.emptyText}>You haven't booked any tasks yet. Book a service to see it here!</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            {renderLegend()}
            <FlatList
                data={jobs}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: '/home/screens/JobStatusScreen', params: { jobId: item.id } })}
                        onLongPress={() => handleDeleteBooking(item.id, item.status)}
                    >
                        <View style={styles.cardTop}>
                            <View style={styles.imageContainer}>
                                {item.taskerInfo?.image ? (
                                    <Image
                                        source={item.taskerInfo.image.startsWith('data:image') ?
                                            { uri: item.taskerInfo.image } :
                                            { uri: `data:image/jpeg;base64,${item.taskerInfo.image}` }
                                        }
                                        style={styles.image}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Ionicons name="person" size={36} color={theme.colors.primary} />
                                )}
                            </View>
                            <View style={styles.infoContainer}>
                                <Text style={styles.taskerName}>{item.taskerInfo?.name || 'Tasker'}</Text>
                                <Text style={styles.dateText}>{new Date(item.date).toLocaleString()}</Text>
                                {getStatusBadge(item.status)}
                                {item.amount && (
                                    <Text style={styles.amountText}>Amount: KSh {item.amount.toLocaleString()}</Text>
                                )}
                                {item.status === 'pending_payment' && (
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteBooking(item.id, item.status)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                        <Text style={styles.deleteButtonText}>Cancel Booking</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Show rating if exists */}
                                {item.rating && (
                                    <View style={styles.ratingContainer}>
                                        <Ionicons name="star" size={16} color={theme.colors.warning} />
                                        <Text style={styles.ratingText}>{item.rating.stars}/5</Text>
                                    </View>
                                )}

                                {/* Show Rate Tasker button for paid jobs without rating */}
                                {item.status === 'paid' && !item.rating && (
                                    <TouchableOpacity
                                        style={styles.rateButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            router.push({
                                                pathname: '/home/screens/RateTaskerScreen',
                                                params: { jobId: item.id }
                                            });
                                        }}
                                    >
                                        <Ionicons name="star-outline" size={16} color={theme.colors.primary} />
                                        <Text style={styles.rateButtonText}>Rate Tasker</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <Ionicons name="chevron-forward" size={22} color={theme.colors.textLight} style={styles.chevron} />
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const createStyles = createThemedStyles(theme => ({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 12,
        color: theme.colors.textLight,
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.2 : 0.06,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    imageContainer: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: theme.dark ? 'rgba(92, 189, 106, 0.15)' : '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    image: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    infoContainer: {
        flex: 1,
    },
    taskerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        marginTop: 2,
    },
    statusText: {
        marginLeft: 6,
        fontSize: 13,
        fontWeight: 'bold',
    },
    chevron: {
        marginLeft: 10,
        alignSelf: 'center',
    },
    legendContainer: {
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 2,
    },
    legendTitle: {
        fontSize: 13,
        color: theme.colors.textLight,
        fontWeight: '600',
        marginBottom: 2,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 18,
    },
    legendBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    legendLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    rateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${theme.colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    rateButtonText: {
        marginLeft: 6,
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${theme.colors.error}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    deleteButtonText: {
        marginLeft: 6,
        color: theme.colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    amountText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
        marginTop: 4,
    },
}));

export default BookedTasksList; 