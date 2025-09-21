import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '@/firebase-config';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { useRouter } from 'expo-router';

interface Review {
    id: string;
    jobId: string;
    clientId: string;
    stars: number;
    comment: string;
    createdAt: any;
    clientName: string;
    jobDate: string;
}

interface RatingStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
    recentRating: number;
}

const TaskerRatingsScreen = () => {
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);
    const router = useRouter();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<RatingStats>({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        recentRating: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'top'>('all');

    useEffect(() => {
        loadRatingsAndReviews();
    }, []);

    const loadRatingsAndReviews = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Get all jobs for this tasker that have ratings
            const jobsRef = collection(db, 'jobs');
            const jobsQuery = query(
                jobsRef,
                where('taskerId', '==', user.uid),
                where('rating', '!=', null)
            );
            const jobsSnapshot = await getDocs(jobsQuery);

            const reviewsData: Review[] = [];
            let totalRating = 0;
            const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

            for (const jobDoc of jobsSnapshot.docs) {
                const jobData = jobDoc.data();
                if (jobData.rating) {
                    // Get client information
                    const clientDoc = await getDoc(doc(db, 'users', jobData.clientId));
                    const clientData = clientDoc.exists() ? clientDoc.data() : {};
                    const clientName = clientData.firstName && clientData.lastName
                        ? `${clientData.firstName} ${clientData.lastName}`.trim()
                        : clientData.displayName || 'Client';

                    const review: Review = {
                        id: jobDoc.id,
                        jobId: jobDoc.id,
                        clientId: jobData.clientId,
                        stars: jobData.rating.stars,
                        comment: jobData.rating.comment || '',
                        createdAt: jobData.rating.createdAt || jobData.createdAt,
                        clientName,
                        jobDate: jobData.date
                    };

                    reviewsData.push(review);
                    totalRating += jobData.rating.stars;
                    ratingDistribution[jobData.rating.stars]++;
                }
            }

            // Sort reviews by date (newest first)
            reviewsData.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });

            setReviews(reviewsData);

            // Calculate statistics
            const averageRating = reviewsData.length > 0 ? totalRating / reviewsData.length : 0;
            const recentRating = reviewsData.length > 0 ? reviewsData[0].stars : 0;

            setStats({
                averageRating,
                totalReviews: reviewsData.length,
                ratingDistribution,
                recentRating
            });

        } catch (error) {
            console.error('Error loading ratings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredReviews = () => {
        switch (selectedFilter) {
            case 'recent':
                return reviews.slice(0, 10);
            case 'top':
                return reviews.filter((review: Review) => review.stars >= 4).slice(0, 10);
            default:
                return reviews;
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

    const renderRatingDistribution = () => {
        return (
            <View style={styles.distributionContainer}>
                {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.ratingDistribution[rating] || 0;
                    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

                    return (
                        <View key={rating} style={styles.distributionRow}>
                            <Text style={styles.distributionLabel}>{rating}★</Text>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${percentage}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.distributionCount}>{count}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderReviewItem = ({ item }: { item: Review }) => (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                        <Ionicons name="person" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.reviewerDetails}>
                        <Text style={styles.reviewerName}>{item.clientName}</Text>
                        <Text style={styles.reviewDate}>
                            {new Date(item.jobDate).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                {renderStars(item.stars)}
            </View>

            {item.comment && (
                <Text style={styles.reviewComment}>{item.comment}</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.loadingText}>Loading your ratings...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Ratings & Reviews</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Overall Rating Card */}
                <View style={styles.overallRatingCard}>
                    <View style={styles.ratingHeader}>
                        <Text style={styles.ratingTitle}>Overall Rating</Text>
                        <Text style={styles.ratingSubtitle}>{stats.totalReviews} reviews</Text>
                    </View>

                    <View style={styles.ratingDisplay}>
                        <Text style={styles.averageRating}>{stats.averageRating.toFixed(1)}</Text>
                        {renderStars(Math.round(stats.averageRating), 24)}
                    </View>

                    {/* Rating Distribution */}
                    {renderRatingDistribution()}
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
                        onPress={() => setSelectedFilter('all')}
                    >
                        <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                            All ({stats.totalReviews})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, selectedFilter === 'recent' && styles.filterTabActive]}
                        onPress={() => setSelectedFilter('recent')}
                    >
                        <Text style={[styles.filterText, selectedFilter === 'recent' && styles.filterTextActive]}>
                            Recent
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterTab, selectedFilter === 'top' && styles.filterTabActive]}
                        onPress={() => setSelectedFilter('top')}
                    >
                        <Text style={[styles.filterText, selectedFilter === 'top' && styles.filterTextActive]}>
                            Top Rated
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Reviews List */}
                <View style={styles.reviewsContainer}>
                    <Text style={styles.reviewsTitle}>Reviews</Text>
                    {getFilteredReviews().length > 0 ? (
                        <FlatList
                            data={getFilteredReviews()}
                            renderItem={renderReviewItem}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="star-outline" size={48} color={theme.colors.textLight} />
                            <Text style={styles.emptyText}>
                                {selectedFilter === 'all'
                                    ? "You haven't received any reviews yet."
                                    : `No ${selectedFilter} reviews found.`
                                }
                            </Text>
                        </View>
                    )}
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
        fontSize: 18,
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
    overallRatingCard: {
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
    ratingHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    ratingTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    ratingSubtitle: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
    ratingDisplay: {
        alignItems: 'center',
        marginBottom: 20,
    },
    averageRating: {
        fontSize: 48,
        fontWeight: 'bold',
        color: theme.colors.primary,
        marginBottom: 8,
    },
    starsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starIcon: {
        marginHorizontal: 2,
    },
    distributionContainer: {
        marginTop: 10,
    },
    distributionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    distributionLabel: {
        width: 30,
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '600',
    },
    progressBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.border,
        borderRadius: 4,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.warning,
        borderRadius: 4,
    },
    distributionCount: {
        width: 30,
        fontSize: 14,
        color: theme.colors.textLight,
        textAlign: 'right',
    },
    filterContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 4,
    },
    filterTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    filterTabActive: {
        backgroundColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
    filterTextActive: {
        color: '#fff',
    },
    reviewsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    reviewsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 16,
    },
    reviewCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.dark ? 0.2 : 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    reviewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    reviewerDetails: {
        flex: 1,
    },
    reviewerName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    reviewDate: {
        fontSize: 12,
        color: theme.colors.textLight,
    },
    reviewComment: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 20,
        fontStyle: 'italic',
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
}));

export default TaskerRatingsScreen; 
