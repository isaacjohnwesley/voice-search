"use client";

import { useState, useEffect, useCallback } from "react";
// import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface VoiceInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

export function VoiceInputSheet({ isOpen, onClose, onResult }: VoiceInputSheetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // MediaRecorder and audio stream references
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Check if it's an older browser with different API
        const getUserMedia = navigator.mediaDevices?.getUserMedia || 
                           (navigator as unknown as { getUserMedia?: unknown }).getUserMedia || 
                           (navigator as unknown as { webkitGetUserMedia?: unknown }).webkitGetUserMedia || 
                           (navigator as unknown as { mozGetUserMedia?: unknown }).mozGetUserMedia || 
                           (navigator as unknown as { msGetUserMedia?: unknown }).msGetUserMedia;
        
        if (!getUserMedia) {
          setError("Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.");
          return;
        }
      }

      // Check if we're in a secure context (HTTPS or localhost)
      const isSecureContext = window.isSecureContext || 
                              location.protocol === 'https:' || 
                              location.hostname === 'localhost' || 
                              location.hostname === '127.0.0.1' ||
                              location.hostname.endsWith('.localhost');
      
      if (!isSecureContext) {
        setError("Microphone access requires a secure connection. Please use localhost or HTTPS.");
        return;
      }

      console.log("Requesting microphone permission...");
      console.log("Current URL:", location.href);
      console.log("Is secure context:", window.isSecureContext);
      console.log("Protocol:", location.protocol);
      console.log("Hostname:", location.hostname);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log("Microphone permission granted");
      setPermissionGranted(true);
      setError(null);
      
      // Set up MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      setMediaRecorder(recorder);
      setAudioStream(stream);
      
      // Set up event handlers
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        handleRecordingStop();
      };
      
      // Auto-start recording after permission is granted
      setTimeout(() => {
        startRecording();
      }, 500); // Small delay to ensure UI updates
    } catch (err: unknown) {
      console.error("Microphone permission error:", err);
      
      let errorMessage = "Microphone permission denied.";
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No microphone found. Please connect a microphone and try again.";
        } else if (err.name === 'NotSupportedError') {
          errorMessage = "Microphone access is not supported in this browser.";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "Microphone is being used by another application. Please close other apps and try again.";
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = "Microphone constraints cannot be satisfied. Please try again.";
        } else if (err.name === 'SecurityError') {
          errorMessage = "Microphone access blocked due to security restrictions. Please use HTTPS.";
        }
      }
      
      setError(errorMessage);
      setPermissionGranted(false);
    }
  }, []);

  const startRecording = () => {
    if (!permissionGranted) {
      requestMicrophonePermission();
      return;
    }
    
    if (!mediaRecorder) {
      setError("MediaRecorder not initialized");
      return;
    }
    
    setIsRecording(true);
    setIsListening(true);
    setTranscribedText("");
    setError(null);
    setAudioChunks([]);
    
    // Start recording
    mediaRecorder.start(1000); // Collect data every second
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const handleRecordingStop = async () => {
    setIsTranscribing(true);
    
    try {
      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
      
      // Create form data for API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      // Send to our API route
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Transcription failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setTranscribedText(result.transcript);
        console.log('Transcription result:', result);
      } else {
        setError(result.error || 'Transcription failed');
      }
      
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSubmit = () => {
    if (transcribedText.trim()) {
      onResult(transcribedText);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up audio stream
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    
    setMediaRecorder(null);
    setAudioChunks([]);
    setTranscribedText("");
    setError(null);
    setIsTranscribing(false);
    onClose();
  };

  // Check permission status when component mounts
  useEffect(() => {
    const checkPermissionStatus = async () => {
      // Debug information
      console.log("=== MICROPHONE DEBUG INFO ===");
      console.log("Current URL:", location.href);
      console.log("Protocol:", location.protocol);
      console.log("Hostname:", location.hostname);
      console.log("Is secure context:", window.isSecureContext);
      console.log("navigator.mediaDevices exists:", !!navigator.mediaDevices);
      console.log("getUserMedia exists:", !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
      console.log("=============================");

      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log("Microphone permission status:", permission.state);
          
          if (permission.state === 'granted') {
            setPermissionGranted(true);
          } else if (permission.state === 'denied') {
            setError("Microphone access is blocked. Please enable it in your browser settings.");
            setPermissionGranted(false);
          }
          
          // Listen for permission changes
          permission.onchange = () => {
            console.log("Permission changed to:", permission.state);
            if (permission.state === 'granted') {
              setPermissionGranted(true);
              setError(null);
            } else if (permission.state === 'denied') {
              setPermissionGranted(false);
              setError("Microphone access is blocked. Please enable it in your browser settings.");
            }
          };
        } catch (err) {
          console.log("Could not check permission status:", err);
        }
      }
    };

    checkPermissionStatus();
  }, []);

  // Reset state when sheet opens and auto-request permission
  useEffect(() => {
    if (isOpen) {
      setTranscribedText("");
      setError(null);
      setIsRecording(false);
      setIsListening(false);
      
      // Auto-request microphone permission when sheet opens
      if (!permissionGranted) {
        requestMicrophonePermission();
      }
    }
  }, [isOpen, permissionGranted, requestMicrophonePermission]);

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Voice Search</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center justify-center flex-1 space-y-6 px-4">
          {/* Microphone Icon */}
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording || isListening 
                ? "bg-red-100 dark:bg-red-900/20 animate-pulse" 
                : "bg-muted"
            }`}>
              {isRecording || isListening ? (
                <span className="material-symbols-outlined text-red-500" style={{ fontSize: '48px' }}>
                  mic
                </span>
              ) : (
                <span className="material-symbols-outlined text-muted-foreground" style={{ fontSize: '48px' }}>
                  mic
                </span>
              )}
            </div>
            
            {/* Recording indicator */}
            {(isRecording || isListening) && (
              <div className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            {error ? (
              <div className="space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                {(error.includes("HTTPS") || error.includes("secure connection")) && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Try accessing via:</p>
                    <p>• http://localhost:3000 (for development)</p>
                    <p>• https://your-domain.com (for production)</p>
                  </div>
                )}
                {error.includes("browser settings") && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>On mobile Chrome:</p>
                    <p>1. Tap the lock icon in address bar</p>
                    <p>2. Allow microphone access</p>
                    <p>3. Refresh the page</p>
                  </div>
                )}
              </div>
            ) : isTranscribing ? (
              <p className="text-muted-foreground">Transcribing...</p>
            ) : isListening ? (
              <p className="text-muted-foreground">Listening...</p>
            ) : transcribedText ? (
              <p className="text-foreground font-medium">&ldquo;{transcribedText}&rdquo;</p>
            ) : (
              <p className="text-muted-foreground">
                {permissionGranted 
                  ? "Tap the microphone to start speaking" 
                  : "Allow microphone access to use voice search"
                }
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {isTranscribing ? (
              <Button disabled className="px-6 mobile-tap">
                <span className="material-symbols-outlined mr-2 animate-spin" style={{ fontSize: '16px' }}>
                  hourglass_empty
                </span>
                Transcribing...
              </Button>
            ) : isRecording || isListening ? (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                className="px-6 mobile-tap"
              >
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>
                  stop
                </span>
                Stop Recording
              </Button>
            ) : permissionGranted ? (
              <Button onClick={startRecording} className="px-6 mobile-tap">
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>
                  mic
                </span>
                Start Recording
              </Button>
            ) : (
              <Button onClick={requestMicrophonePermission} className="px-6 mobile-tap">
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>
                  mic
                </span>
                Allow Microphone
              </Button>
            )}

            {transcribedText && !isTranscribing && (
              <Button onClick={handleSubmit} className="px-6 mobile-tap">
                Use This Text
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
