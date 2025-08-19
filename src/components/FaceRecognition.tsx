'use client';

import { useState, useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { markAttendance, saveUser } from '@/hooks/lib/firebase';
import { getAttendanceStatus, generateUserId } from '@/hooks/lib/utils';
import type { User } from '@/hooks/types';

export default function FaceRecognition() {
  const {
    videoRef,
    canvasRef,
    webcamStatus,
    detectedFace,
    isProcessing,
    startWebcam,
    stopWebcam,
    registerFace,
    capturePhoto
  } = useFaceRecognition();

  const [isRegistering, setIsRegistering] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastMarkedUser, setLastMarkedUser] = useState<string | null>(null);
  const [isWebcamStarted, setIsWebcamStarted] = useState(false);

  // Auto-mark attendance when known face is detected
  useEffect(() => {
    if (detectedFace?.isKnown && detectedFace.user && detectedFace.confidence > 0.7) {
      if (lastMarkedUser !== detectedFace.user.id) {
        handleMarkAttendance(detectedFace.user);
      }
    }
  }, [detectedFace]);

  const handleStartWebcam = async () => {
    await startWebcam();
    setIsWebcamStarted(true);
    setMessage({ type: 'info', text: 'Webcam started. Position your face in front of the camera.' });
  };

  const handleStopWebcam = () => {
    stopWebcam();
    setIsWebcamStarted(false);
    setMessage(null);
  };

  const handleMarkAttendance = async (user: User) => {
    try {
      const photo = capturePhoto();
      const now = new Date();
      
      await markAttendance({
        userId: user.id,
        userName: user.name,
        timestamp: now,
        confidence: detectedFace?.confidence || 0,
        photoUrl: photo || undefined,
        status: getAttendanceStatus(now),
        location: 'Main Office'
      });
      
      setLastMarkedUser(user.id);
      setMessage({ 
        type: 'success', 
        text: `Attendance marked for ${user.name} at ${now.toLocaleTimeString()}` 
      });
      
      // Reset after 5 seconds
      setTimeout(() => {
        setLastMarkedUser(null);
      }, 5000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to mark attendance. Please try again.' 
      });
    }
  };

  const handleRegisterNewUser = async () => {
    if (!newUserName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a name' });
      return;
    }
    
    setIsRegistering(true);
    
    try {
      const registeredUser = await registerFace(newUserName);
      
      if (registeredUser && registeredUser.descriptor) {
        // Save to Firebase
        await saveUser({
          ...registeredUser,
          id: generateUserId(),
          createdAt: new Date()
        });
        
        setMessage({ 
          type: 'success', 
          text: `Successfully registered ${newUserName}` 
        });
        setNewUserName('');
      } else {
        setMessage({ 
          type: 'error', 
          text: 'No face detected. Please ensure your face is clearly visible.' 
        });
      }
    } catch (error) {
      console.error('Error registering user:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to register user. Please try again.' 
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <h2 className="text-3xl font-bold text-white">Face Recognition System</h2>
          <p className="text-white/80 mt-2">
            Automated attendance tracking with facial recognition
          </p>
        </div>
        
        <div className="p-6">
          {/* Status Messages */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
              message.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
              'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              <div className="flex items-center">
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            </div>
          )}
          
          {/* Webcam Controls */}
          <div className="mb-6 flex flex-wrap gap-4">
            {!isWebcamStarted ? (
              <button
                onClick={handleStartWebcam}
                disabled={webcamStatus.isLoading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {webcamStatus.isLoading ? 'Loading Models...' : 'Start Webcam'}
              </button>
            ) : (
              <button
                onClick={handleStopWebcam}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Stop Webcam
              </button>
            )}
          </div>
          
          {/* Main Content Area */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Video Feed */}
            <div className="relative">
              <div className="bg-gray-100 rounded-xl overflow-hidden shadow-inner">
                <div className="relative aspect-video bg-gray-900">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                  
                  {!isWebcamStarted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-400">Camera feed will appear here</p>
                      </div>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                        Processing...
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Detection Status */}
              {detectedFace && isWebcamStarted && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Detection Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${detectedFace.isKnown ? 'text-green-600' : 'text-orange-600'}`}>
                        {detectedFace.isKnown ? 'Recognized' : 'Unknown Face'}
                      </span>
                    </div>
                    {detectedFace.isKnown && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{detectedFace.user?.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Confidence:</span>
                          <span className="font-medium text-gray-900">
                            {Math.round((detectedFace.confidence || 0) * 100)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Registration Panel */}
            <div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Register New User</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Position your face clearly in the camera view and enter your name to register.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="userName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      disabled={!isWebcamStarted || isRegistering}
                    />
                  </div>
                  
                  <button
                    onClick={handleRegisterNewUser}
                    disabled={!isWebcamStarted || isRegistering || !newUserName.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? 'Registering...' : 'Register Face'}
                  </button>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Quick Tips:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure good lighting on your face</li>
                    <li>• Look directly at the camera</li>
                    <li>• Remove glasses if possible</li>
                    <li>• Keep a neutral expression</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}