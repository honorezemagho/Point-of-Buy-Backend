import * as admin from 'firebase-admin';

import serviceAccount from '../firebase-service-account.json';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const db = admin.firestore();
