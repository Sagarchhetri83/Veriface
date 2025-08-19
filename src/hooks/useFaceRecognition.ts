import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { getAllUsers } from './lib/firebase';
import type { User, FaceDetectionResult, WebcamStatus } from '@/hooks/types';

const MODEL_URL = '/models';
const MIN_CONFIDENCE = 0.6;
const MAX_DESCRIPTOR_DISTANCE = 0.5;

export const useFaceRecognition = () => {
  const [webcamStatus, setWebcamStatus] = useState<WebcamStatus>({
    isLoading: true,
    isActive: false,
    error: null
  });
  
  const [detectedFace, setDetectedFace] = useState<FaceDetectionResult | null>(null);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [areModelsLoaded, setAreModelsLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api models
  const loadModels = async () => {
    try {
      setWebcamStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
      ]);
      
      console.log('Face-api models loaded successfully');
      setAreModelsLoaded(true);
      
      // Load known users from Firebase
      const users = await getAllUsers();
      setKnownUsers(users);
      
      setWebcamStatus(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error loading models:', error);
      setWebcamStatus(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load face recognition models' 
      }));
    }
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      if (!videoRef.current) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        },
        audio: false
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      setWebcamStatus(prev => ({ ...prev, isActive: true, error: null }));
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setWebcamStatus(prev => ({ 
        ...prev, 
        isActive: false, 
        error: 'Failed to access webcam. Please check permissions.' 
      }));
    }
  };

  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setWebcamStatus(prev => ({ ...prev, isActive: false }));
    setDetectedFace(null);
  }, []);

  // Compare face descriptors
  const findBestMatch = (descriptor: Float32Array): FaceDetectionResult => {
    let bestMatch: User | null = null;
    let bestDistance = Infinity;
    
    for (const user of knownUsers) {
      if (!user.descriptor) continue;
      
      const distance = faceapi.euclideanDistance(descriptor, user.descriptor);
      
      if (distance < bestDistance && distance < MAX_DESCRIPTOR_DISTANCE) {
        bestDistance = distance;
        bestMatch = user;
      }
    }
    
    const confidence = bestMatch ? (1 - bestDistance) : 0;
    
    return {
      user: bestMatch,
      confidence,
      isKnown: bestMatch !== null,
      descriptor
    };
  };

  // Detect faces in video
  const detectFace = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();
      
      const canvas = canvasRef.current;
      const displaySize = { 
        width: videoRef.current.videoWidth, 
        height: videoRef.current.videoHeight 
      };
      
      faceapi.matchDimensions(canvas, displaySize);
      
      // Clear previous drawings
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      if (detections.length > 0) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Draw detections
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        
        // Get the first detected face
        const detection = detections[0];
        const descriptor = detection.descriptor;
        
        // Find match in known users
        const result = findBestMatch(descriptor);
        setDetectedFace(result);
        
        // Draw label
        if (context) {
          const box = detection.detection.box;
          const label = result.isKnown 
            ? `${result.user?.name} (${Math.round(result.confidence * 100)}%)`
            : 'Unknown Person';
          
          context.font = '16px Arial';
          context.fillStyle = result.isKnown ? '#00ff00' : '#ff0000';
          context.fillText(label, box.x, box.y - 5);
        }
      } else {
        setDetectedFace(null);
      }
    } catch (error) {
      console.error('Error during face detection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Start continuous detection
  const startDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    
    detectionIntervalRef.current = setInterval(() => {
      detectFace();
    }, 500); // Detect every 500ms
  };

  // Register new face
  const registerFace = async (name: string): Promise<User | null> => {
    if (!videoRef.current) return null;
    
    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (!detections) {
        throw new Error('No face detected');
      }
      
      const user: User = {
        id: `user_${Date.now()}`,
        name,
        descriptor: detections.descriptor
      };
      
      // Save to Firebase (implement this in your Firebase service)
      // await saveUser(user);
      
      // Add to known users
      setKnownUsers(prev => [...prev, user]);
      
      return user;
    } catch (error) {
      console.error('Error registering face:', error);
      return null;
    }
  };

  // Capture photo from video
  const capturePhoto = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    context.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  // Initialize on mount
  useEffect(() => {
    loadModels();
    
    return () => {
      stopWebcam();
    };
  }, []);

  useEffect(() => {
    if (webcamStatus.isActive && areModelsLoaded && videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        startDetection();
      };
      // If video is already loaded, start detection
      if (video.readyState >= 3) {
        startDetection();
      }
    }
  }, [webcamStatus.isActive, areModelsLoaded]);

  return {
    videoRef,
    canvasRef,
    webcamStatus,
    detectedFace,
    knownUsers,
    isProcessing,
    startWebcam,
    stopWebcam,
    registerFace,
    capturePhoto,
    detectFace
  };
};