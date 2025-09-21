import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

const TermsAndPoliciesScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Terms and Policies</Text>
      <Text style={styles.text}>
        Welcome to TaskConnect! Please read our terms and policies carefully. This is placeholder text. You should replace it with your actual terms of service, privacy policy, and any other legal information relevant to your users.
      </Text>
      {/* Add more sections as needed */}
    </ScrollView>
  );
};

const createStyles = createThemedStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
}));

export default TermsAndPoliciesScreen; 