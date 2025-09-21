// app/(tabs)/home/components/BecomeTaskerCard.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

const BecomeTaskerCard = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  
  const handleBecomeTasker = () => {
    router.push('/tasker-onboarding/personal-details');
  };

  return (
    <View style={styles.becomeTaskerCard}>
      <View style={styles.cardContent}>
        <View style={styles.cardTextContent}>
          <Text style={styles.cardTitle}>Become a Tasker</Text>
          <Text style={styles.cardDescription}>
            Turn your skills into income. Join our community of professional taskers and start earning on your own schedule.
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.benefitText}>Flexible Schedule</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.benefitText}>Competitive Pay</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.benefitText}>Secure Platform</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.becomeTaskerButton}
            onPress={handleBecomeTasker}
          >
            <Text style={styles.becomeTaskerButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = createThemedStyles(theme => ({
  becomeTaskerCard: {
    marginLeft: 20,
    marginRight: 20,
    marginTop: 0,
    borderRadius: 20,
    backgroundColor: theme.dark ? theme.colors.card : '#f8f9fd',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.dark ? theme.colors.border : '#eee',
  },
  cardContent: {
    padding: 20,
  },
  cardTextContent: {
    gap: 15,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  benefitsList: {
    marginTop: 20,
    gap: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  becomeTaskerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 18,
    borderRadius: 12,
    marginTop: 20,
    gap: 10,
  },
  becomeTaskerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}));

export default BecomeTaskerCard;