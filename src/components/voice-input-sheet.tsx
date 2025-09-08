"use client";

import { useState, useEffect } from "react";
import { Mic, Square } from "lucide-react";
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

  // Mock speech recognition for now (will be replaced with Sarvam API)
  const [mockRecognition] = useState({
    start: () => {
      setIsListening(true);
      setError(null);
      // Simulate transcription after 2 seconds
      setTimeout(() => {
        setTranscribedText("Take me to Central Park");
        setIsListening(false);
        setIsRecording(false);
      }, 2000);
    },
    stop: () => {
      setIsListening(false);
      setIsRecording(false);
    },
    abort: () => {
      setIsListening(false);
      setIsRecording(false);
    }
  });

  const requestMicrophonePermission = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Check if it's an older browser with different API
        const getUserMedia = navigator.mediaDevices?.getUserMedia || 
                           (navigator as any).getUserMedia || 
                           (navigator as any).webkitGetUserMedia || 
                           (navigator as any).mozGetUserMedia || 
                           (navigator as any).msGetUserMedia;
        
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
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      console.error("Microphone permission error:", err);
      
      let errorMessage = "Microphone permission denied.";
      
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
      
      setError(errorMessage);
      setPermissionGranted(false);
    }
  };

  const startRecording = () => {
    if (!permissionGranted) {
      requestMicrophonePermission();
      return;
    }
    
    setIsRecording(true);
    setTranscribedText("");
    setError(null);
    mockRecognition.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsListening(false);
    mockRecognition.stop();
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
    setTranscribedText("");
    setError(null);
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

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTranscribedText("");
      setError(null);
      setIsRecording(false);
      setIsListening(false);
    }
  }, [isOpen]);

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
                <Mic className="h-12 w-12 text-red-500" />
              ) : (
                <Mic className="h-12 w-12 text-muted-foreground" />
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
            ) : isListening ? (
              <p className="text-muted-foreground">Listening...</p>
            ) : transcribedText ? (
              <p className="text-foreground font-medium">"{transcribedText}"</p>
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
            {!permissionGranted ? (
              <Button onClick={requestMicrophonePermission} className="px-6 mobile-tap">
                Allow Microphone
              </Button>
            ) : isRecording || isListening ? (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                className="px-6 mobile-tap"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            ) : (
              <Button onClick={startRecording} className="px-6 mobile-tap">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            )}

            {transcribedText && (
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
