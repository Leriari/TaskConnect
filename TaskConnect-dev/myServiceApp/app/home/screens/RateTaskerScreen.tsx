import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, runTransaction } from 'firebase/firestore';
import { db, auth } from '@/firebase-config';
import { useTheme } from '@/app/context/ThemeContext';
import { createThemedStyles, useThemedStyles } from '@/app/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';

const RateTaskerScreen = () => {
    const { jobId } = useLocalSearchParams();
    const router = useRouter();
    const { theme } = useTheme();
    const styles = useThemedStyles(createStyles);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [job, setJob] = useState<any>(null);
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchJobDetails();
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            const jobDoc = await getDoc(doc(db, 'jobs', jobId as string));
            if (!jobDoc.exists()) {
                setError('Job not found');
                return;
            }
            const jobData = jobDoc.data();
            if (jobData.rating) {
                setRating(jobData.rating.stars);
                setReview(jobData.rating.comment);
            }
            setJob({ id: jobDoc.id, ...jobData });
        } catch (e) {
            console.error('Error fetching job:', e);
            setError('Failed to fetch job details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRating = async () => {
        if (rating === 0) {
            Alert.alert('Error', 'Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) {
                throw new Error('User not authenticated');
            }

            await runTransaction(db, async (transaction) => {
                // Get the job document
                const jobRef = doc(db, 'jobs', jobId as string);
                const jobDoc = await transaction.get(jobRef);

                if (!jobDoc.exists()) {
                    throw new Error('Job not found');
                }

                // Get the tasker document
                const taskerRef = doc(db, 'taskers', job.taskerId);
                const taskerDoc = await transaction.get(taskerRef);

                if (!taskerDoc.exists()) {
                    throw new Error('Tasker not found');
                }

                const ratingData = {
                    stars: rating,
                    comment: review.trim(),
                    clientId: userId,
                    jobId: jobId,
                    createdAt: new Date().toISOString(),
                };

                // Update job with rating
                transaction.update(jobRef, {
                    rating: ratingData,
                    status: 'completed' // Update status to completed when rated
                });

                // Update tasker's ratings
                const taskerData = taskerDoc.data();
                const currentRatings = taskerData.ratings || [];
                const newAvgRating =
                    ((taskerData.averageRating || 0) * currentRatings.length + rating) /
                    (currentRatings.length + 1);

                transaction.update(taskerRef, {
                    ratings: arrayUnion(ratingData),
                    averageRating: newAvgRating,
                    totalRatings: (taskerData.totalRatings || 0) + 1
                });
            });

            Alert.alert(
                'Success',
                'Thank you for rating your tasker!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (e) {
            console.error('Error submitting rating:', e);
            Alert.alert('Error', 'Failed to submit rating. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        style={styles.starButton}
                    >
                        <Ionicons
                            name={rating >= star ? 'star' : 'star-outline'}
                            size={40}
                            color={rating >= star ? theme.colors.warning : theme.colors.textLight}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Rate Your Tasker</Text>
                <Text style={styles.subtitle}>
                    How was your experience? Your feedback helps improve our community.
                </Text>
            </View>

            {renderStars()}

            <View style={styles.reviewContainer}>
                <Text style={styles.label}>Write a Review (Optional)</Text>
                <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your experience..."
                    placeholderTextColor={theme.colors.textLight}
                    multiline
                    numberOfLines={4}
                    value={review}
                    onChangeText={setReview}
                    editable={!submitting}
                />
            </View>

            <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitRating}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.submitButtonText}>Submit Rating</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => router.back()}
                disabled={submitting}
            >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const createStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    contentContainer: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: theme.colors.background,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textLight,
        textAlign: 'center',
        lineHeight: 22,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    starButton: {
        padding: 5,
    },
    reviewContainer: {
        marginBottom: 30,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 10,
    },
    reviewInput: {
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 15,
        color: theme.colors.text,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    button: {
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    cancelButtonText: {
        color: theme.colors.primary,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
}));

export default RateTaskerScreen; 