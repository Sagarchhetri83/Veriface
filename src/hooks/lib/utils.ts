import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

export function getAttendanceStatus(timestamp: Date): 'present' | 'late' | 'absent' {
  const hour = timestamp.getHours();
  const minute = timestamp.getMinutes();
  
  // Define your attendance rules
  if (hour < 9 || (hour === 9 && minute <= 15)) {
    return 'present';
  } else if (hour < 10) {
    return 'late';
  }
  
  return 'absent';
}

export function calculateSimilarity(desc1: Float32Array, desc2: Float32Array): number {
  if (!desc1 || !desc2) return 0;
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  
  return Math.sqrt(sum);
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// For development: Create mock face descriptors
export function createMockDescriptor(): Float32Array {
  const descriptor = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    descriptor[i] = Math.random() * 2 - 1;
  }
  return descriptor;
}

// Install these packages first:
// npm install clsx tailwind-merge