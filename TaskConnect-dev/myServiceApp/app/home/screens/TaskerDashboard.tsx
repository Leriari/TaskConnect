import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase-config';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'expo-router';

interface DashboardStats {
    totalEarnings: number;
    monthlyEarnings: number;
    totalJobs: number;
    completedJobs: number;
    pendingJobs: number;
    averageRating: number;
    totalReviews: number;
    responseRate: number;
    completionRate: number;
}

interface RecentJob {
    id: string;
    amount: number;
    status: string;
    date: string;
    clientName: string;
}

const TaskerDashboard = () => {
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats>({
        totalEarnings: 0,
        monthlyEarnings: 0,
        totalJobs: 0,
        completedJobs: 0,
        pendingJobs: 0,
        averageRating: 0,
        totalReviews: 0,
        responseRate: 0,
        completionRate: 0
    });
    const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Get all jobs for this tasker
            const jobsRef = collection(db, 'jobs');
            const jobsQuery = query(
                jobsRef,
                where('taskerId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const jobsSnapshot = await getDocs(jobsQuery);

            let totalEarnings = 0;
            let monthlyEarnings = 0;
            let totalJobs = 0;
            let completedJobs = 0;
            let pendingJobs = 0;
            let totalRating = 0;
            let totalReviews = 0;
            let respondedJobs = 0;
            const recentJobsData: RecentJob[] = [];

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();

            for (const jobDoc of jobsSnapshot.docs) {
                const jobData = jobDoc.data();
                totalJobs++;

                // Calculate earnings
                if (jobData.amount) {
                    totalEarnings += jobData.amount;

                    // Check if job is from current month
                    const jobDate = new Date(jobData.date);
                    if (jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear) {
                        monthlyEarnings += jobData.amount;
                    }
                }

                // Count job statuses
                if (jobData.status === 'completed') {
                    completedJobs++;
                } else if (['pending_approval', 'in_progress', 'in_escrow', 'processing_payment'].includes(jobData.status)) {
                    pendingJobs++;
                }

                // Count responded jobs (approved or rejected)
                if (['in_progress', 'rejected'].includes(jobData.status)) {
                    respondedJobs++;
                }

                // Calculate ratings
                if (jobData.rating) {
                    totalRating += jobData.rating.stars;
                    totalReviews++;
                }

                // Get recent jobs for display
                if (recentJobsData.length < 5) {
                    const clientDoc = await getDoc(doc(db, 'users', jobData.clientId));
                    const clientData = clientDoc.exists() ? clientDoc.data() : {};
                    const clientName = clientData.firstName && clientData.lastName
                        ? `${clientData.firstName} ${clientData.lastName}`.trim()
                        : clientData.displayName || 'Client';

                    recentJobsData.push({
                        id: jobDoc.id,
                        amount: jobData.amount || 0,
                        status: jobData.status,
                        date: jobData.date,
                        clientName
                    });
                }
            }

            const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;
            const responseRate = totalJobs > 0 ? (respondedJobs / totalJobs) * 100 : 0;
            const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

            setStats({
                totalEarnings,
                monthlyEarnings,
                totalJobs,
                completedJobs,
                pendingJobs,
                averageRating,
                totalReviews,
                responseRate,
                completionRate
            });

            setRecentJobs(recentJobsData);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (stars: number, size: number = 16) => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                        key={star}
                        name={stars >= star ? 'star' : 'star-outline'}
                        size={size}
                        color={theme.colors.warning}
                        style={styles.starIcon}
                    />
                ))}
            </View>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return theme.colors.success;
            case 'pending_approval':
                return theme.colors.warning;
            case 'in_progress':
                return theme.colors.primary;
            case 'rejected':
                return theme.colors.error;
            default:
                return theme.colors.textLight;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'pending_approval':
                return 'Pending';
            case 'in_progress':
                return 'In Progress';
            case 'rejected':
                return 'Rejected';
            default:
                return status.replace(/_/g, ' ').toUpperCase();
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Tasker Dashboard</Text>
                    <TouchableOpacity onPress={() => router.push('/home/screens/TaskerRatingsScreen')}>
                        <Ionicons name="star-outline" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Earnings Overview */}
                <View style={styles.earningsCard}>
                    <Text style={styles.cardTitle}>Earnings Overview</Text>
                    <View style={styles.earningsRow}>
                        <View style={styles.earningItem}>
                            <Text style={styles.earningLabel}>Total Earnings</Text>
                            <Text style={styles.earningAmount}>KSh {stats.totalEarnings.toLocaleString()}</Text>
                        </View>
                        <View style={styles.earningItem}>
                            <Text style={styles.earningLabel}>This Month</Text>
                            <Text style={styles.earningAmount}>KSh {stats.monthlyEarnings.toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Performance Metrics */}
                <View style={styles.metricsContainer}>
                    <Text style={styles.sectionTitle}>Performance Metrics</Text>

                    <View style={styles.metricsGrid}>
                        <View style={styles.metricCard}>
                            <Ionicons name="briefcase-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.metricValue}>{stats.totalJobs}</Text>
                            <Text style={styles.metricLabel}>Total Jobs</Text>
                        </View>

                        <View style={styles.metricCard}>
                            <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.success} />
                            <Text style={styles.metricValue}>{stats.completedJobs}</Text>
                            <Text style={styles.metricLabel}>Completed</Text>
                        </View>

                        <View style={styles.metricCard}>
                            <Ionicons name="time-outline" size={24} color={theme.colors.warning} />
                            <Text style={styles.metricValue}>{stats.pendingJobs}</Text>
                            <Text style={styles.metricLabel}>Pending</Text>
                        </View>

                        <View style={styles.metricCard}>
                            <Ionicons name="star-outline" size={24} color={theme.colors.warning} />
                            <Text style={styles.metricValue}>{stats.averageRating.toFixed(1)}</Text>
                            <Text style={styles.metricLabel}>Rating</Text>
                        </View>
                    </View>

                    {/* Progress Bars */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressItem}>
                            <Text style={styles.progressLabel}>Completion Rate</Text>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${stats.completionRate}%`, backgroundColor: theme.colors.success }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressValue}>{stats.completionRate.toFixed(1)}%</Text>
                        </View>

                        <View style={styles.progressItem}>
                            <Text style={styles.progressLabel}>Response Rate</Text>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${stats.responseRate}%`, backgroundColor: theme.colors.primary }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressValue}>{stats.responseRate.toFixed(1)}%</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Jobs */}
                <View style={styles.recentJobsContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Jobs</Text>
                        <TouchableOpacity onPress={() => router.push('/home/screens/NotificationsScreen')}>
                            <Text style={styles.viewAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {recentJobs.length > 0 ? (
                        recentJobs.map((job) => (
                            <TouchableOpacity
                                key={job.id}
                                style={styles.jobCard}
                                onPress={() => router.push({
                                    pathname: '/home/screens/JobStatusScreen',
                                    params: { jobId: job.id, viewMode: 'tasker' }
                                })}
                            >
                                <View style={styles.jobInfo}>
                                    <Text style={styles.jobClient}>{job.clientName}</Text>
                                    <Text style={styles.jobDate}>
                                        {new Date(job.date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.jobDetails}>
                                    <Text style={styles.jobAmount}>KSh {job.amount.toLocaleString()}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                                            {getStatusText(job.status)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="briefcase-outline" size={48} color={theme.colors.textLight} />
                            <Text style={styles.emptyText}>No jobs yet. Start accepting requests!</Text>
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/home/screens/NotificationsScreen')}
                        >
                            <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.actionText}>View Requests</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/home/screens/TaskerRatingsScreen')}
                        >
                            <Ionicons name="star-outline" size={24} color={theme.colors.warning} />
                            <Text style={styles.actionText}>My Ratings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/home/screens/ProfileScreen')}
                        >
                            <Ionicons name="person-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.actionText}>Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => router.push('/home/screens/HelpSupportScreen')}
                        >
                            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
                            <Text style={styles.actionText}>Support</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = createThemedStyles(theme => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.textLight,
    },
    earningsCard: {
        backgroundColor: theme.colors.card,
        margin: 20,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.dark ? 0.25 : 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    earningsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    earningItem: {
        flex: 1,
        alignItems: 'center',
    },
    earningLabel: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    earningAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    metricsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.dark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: 8,
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    progressSection: {
        marginTop: 10,
    },
    progressItem: {
        marginBottom: 16,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    progressValue: {
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'right',
    },
    recentJobsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    jobCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.dark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    jobInfo: {
        flex: 1,
    },
    jobClient: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4,
    },
    jobDate: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    jobDetails: {
        alignItems: 'flex-end',
    },
    jobAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    quickActionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        width: '48%',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.dark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionText: {
        fontSize: 12,
        color: theme.colors.text,
        marginTop: 8,
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starIcon: {
        marginHorizontal: 1,
    },
}));

export default TaskerDashboard; 