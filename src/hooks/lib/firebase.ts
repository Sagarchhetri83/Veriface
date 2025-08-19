import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import type { User, AttendanceRecord } from '@/hooks/types';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export const storage = firebase.storage();

// Firestore Collections
const ATTENDANCE_COLLECTION = 'attendance';
const USERS_COLLECTION = 'users';

// Attendance Functions
export const markAttendance = async (record: Omit<AttendanceRecord, 'id'>): Promise<string> => {
  try {
    // Check if user already marked attendance today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayQuery = db
      .collection(ATTENDANCE_COLLECTION)
      .where('userId', '==', record.userId)
      .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(today))
      .limit(1);
    
    const existingRecords = await todayQuery.get();
    
    if (!existingRecords.empty) {
      console.log('Attendance already marked for today');
      return existingRecords.docs[0].id;
    }
    
    const docRef = await db.collection(ATTENDANCE_COLLECTION).add({
      ...record,
      timestamp: firebase.firestore.Timestamp.fromDate(record.timestamp)
    });
    
    console.log('Attendance marked with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
};

export const getAttendanceRecords = async (limitCount: number = 50): Promise<AttendanceRecord[]> => {
  try {
    const q = db
      .collection(ATTENDANCE_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limitCount);
    
    const querySnapshot = await q.get();
    const records: AttendanceRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        timestamp: data.timestamp.toDate(),
        confidence: data.confidence,
        photoUrl: data.photoUrl,
        status: data.status || 'present',
        location: data.location
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    throw error;
  }
};

export const getTodayAttendance = async (): Promise<AttendanceRecord[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = db
      .collection(ATTENDANCE_COLLECTION)
      .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(today))
      .orderBy('timestamp', 'desc');
    
    const querySnapshot = await q.get();
    const records: AttendanceRecord[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        timestamp: data.timestamp.toDate(),
        confidence: data.confidence,
        photoUrl: data.photoUrl,
        status: data.status || 'present',
        location: data.location
      });
    });
    
    return records;
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    throw error;
  }
};

// User Functions
export const saveUser = async (user: User): Promise<void> => {
  try {
    const userRef = db.collection(USERS_COLLECTION).doc(user.id);
    await userRef.set({
      ...user,
      descriptor: user.descriptor ? Array.from(user.descriptor) : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('User saved successfully');
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const userSnap = await userRef.get();
    
    if (userSnap.exists) {
      const data = userSnap.data();
      if (data) {
        return {
          id: userSnap.id,
          name: data.name,
          email: data.email,
          descriptor: data.descriptor ? new Float32Array(data.descriptor) : undefined,
          photoUrl: data.photoUrl,
          role: data.role,
          createdAt: data.createdAt?.toDate()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const querySnapshot = await db.collection(USERS_COLLECTION).get();
    const users: User[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        descriptor: data.descriptor ? new Float32Array(data.descriptor) : undefined,
        photoUrl: data.photoUrl,
        role: data.role,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};
