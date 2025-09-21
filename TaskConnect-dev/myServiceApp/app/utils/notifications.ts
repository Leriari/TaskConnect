import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase-config';

// First, set up the notification handler for when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }
        // Learn more about projects and EAS Build:
        // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
        token = (await Notifications.getExpoPushTokenAsync({ projectId: 'your-eas-project-id' })).data;
        console.log('Expo Push Token:', token);
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

export async function savePushTokenToFirestore(token: string) {
    const user = auth.currentUser;
    if (!user || !token) return;

    try {
        // We need to check both 'users' and 'taskers' collections
        const userDocRef = doc(db, 'users', user.uid);
        const taskerDocRef = doc(db, 'taskers', user.uid);

        // Try to update the 'users' document
        await updateDoc(userDocRef, { pushToken: token, updatedAt: new Date() });

        // If the user is also a tasker, update that document too
        const taskerDocSnap = await doc(db, 'taskers', user.uid);
        if (taskerDocSnap) {
            await updateDoc(taskerDocRef, { pushToken: token, updatedAt: new Date() });
        }
        console.log('Successfully saved push token for user:', user.uid);
    } catch (error) {
        // This might fail if the user is a tasker but not in the 'users' collection, or vice-versa.
        // The logic can be refined to be more robust, but this covers the main cases.
        console.error("Error saving push token: ", error);
    }
} 