// utils/seedCategories.ts
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase-config'; // Adjust this path if needed

export const seedCategories = async () => {
  console.log('Starting to seed categories (name and icon only)...');

  if (!db) {
    console.error('Firestore instance not initialized. Make sure firebaseConfig is correctly set up.');
    return;
  }

  const mockCategories = [ // You can inline your mock data here or import from mockData.ts
    { name: 'All', icon: 'grid' },
    { name: 'Cleaning', icon: 'md-shield-checkmark' },
    { name: 'Plumbing', icon: 'water' },
    { name: 'Electrical', icon: 'flash' },
    { name: 'Chef', icon: 'restaurant' },
    { name: 'Moving', icon: 'cube' },
    { name: 'Gardening', icon: 'leaf' },
    { name: 'Painting', icon: 'color-palette' },
    { name: 'Baby Sitting', icon: 'happy' },
    { name: 'Hair Stylist', icon: 'cut' },
    { name: 'AC Repair', icon: 'thermometer' },
    { name: 'Tech Help', icon: 'laptop' },
  ];

  const categoriesCollectionRef = collection(db, 'serviceCategories');

  for (const category of mockCategories) {
    const categoryData = {
      name: category.name,
      icon: category.icon,
    };

    try {
      await setDoc(doc(categoriesCollectionRef, categoryData.name), categoryData);
      console.log(`Successfully added category: ${categoryData.name}`);
    } catch (error) {
      console.error(`Error adding category ${categoryData.name}:`, error);
    }
  }

  console.log('Category seeding complete (name and icon only).');
};