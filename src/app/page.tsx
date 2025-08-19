import FaceRecognition from '@/components/FaceRecognition';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Face Recognition Attendance
        </h1>
        <FaceRecognition />
      </div>
    </main>
  );
}