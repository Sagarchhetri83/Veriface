import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VeriFace - Face Recognition Attendance System',
  description: 'Automated attendance tracking with facial recognition technology',
  keywords: 'face recognition, attendance, tracking, automated, facial recognition',
  authors: [{ name: 'VeriFace Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <Navbar />
        <main className="container mx-auto py-8">
          {children}
        </main>
      </body>
    </html>
  );
}