'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AttendanceList from '@/components/AttendanceList';
import { AttendanceLog } from '@/types';

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'attendance'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attendanceLogs: AttendanceLog[] = [];
      snapshot.forEach((doc) => {
        attendanceLogs.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceLog);
      });
      setLogs(attendanceLogs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Attendance Dashboard
        </h1>
        
        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading attendance logs...</p>
          </div>
        ) : (
          <AttendanceList logs={logs} />
        )}
      </div>
    </main>
  );
}