import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { useThemedStyles, createThemedStyles } from '@/app/hooks/useThemedStyles';

const AboutScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>About TaskConnect</Text>
      <Text style={styles.text}>
        TaskConnect is your trusted platform for connecting with skilled service providers in your area. Whether you need help with cleaning, repairs, moving, or more, TaskConnect makes it easy to find and book reliable professionals.
      </Text>
      <Text style={styles.sectionTitle}>Our Mission</Text>
      <Text style={styles.text}>
        To empower communities by making it simple and safe to get things done, while supporting local professionals and businesses.
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
}));

export default AboutScreen; 