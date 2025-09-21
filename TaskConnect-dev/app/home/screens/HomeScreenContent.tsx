const fetchServicesByCategory = async (category: string) => {
    try {
        console.log('Fetching services for category:', category);
        console.log('Current user:', auth.currentUser?.uid);

        if (!auth.currentUser) {
            console.error('No authenticated user found');
            return [];
        }

        const categoryDocRef = doc(db, 'serviceCategories', category);
        console.log('Attempting to fetch document:', categoryDocRef.path);

        const categoryDoc = await getDoc(categoryDocRef);
        console.log('Document exists:', categoryDoc.exists());

        if (!categoryDoc.exists()) {
            console.log('No document found for category:', category);
            return [];
        }

        const data = categoryDoc.data();
        console.log('Retrieved data:', data);

        return data.services || [];
    } catch (error) {
        console.error('Error fetching services:', error);
        if (error.code === 'permission-denied') {
            console.error('Permission denied. User may not have access.');
        }
        throw error;
    }
}; 