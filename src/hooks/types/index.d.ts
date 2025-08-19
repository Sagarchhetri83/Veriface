export interface User {
  id: string;
  name: string;
  email?: string;
  descriptor?: Float32Array;
  photoUrl?: string;
  role?: 'admin' | 'user';
  createdAt?: Date;
}

export interface AttendanceRecord {
  id?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  confidence?: number;
  photoUrl?: string;
  status: 'present' | 'late' | 'absent';
  location?: string;
}

export interface FaceDetectionResult {
  user: User | null;
  confidence: number;
  isKnown: boolean;
  descriptor?: Float32Array;
}

export interface WebcamStatus {
  isLoading: boolean;
  isActive: boolean;
  error: string | null;
}

export interface RecognitionSettings {
  minConfidence: number;
  detectionInterval: number;
  maxDistance: number;
}

export interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
}