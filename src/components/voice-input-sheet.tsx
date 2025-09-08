"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [isInitializingRecorder, setIsInitializingRecorder] = useState(false);

  // MediaRecorder and audio stream references
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Use ref to store chunks directly to avoid state timing issues
  const audioChunksRef = useRef<Blob[]>([]);
  const hasAutoStarted = useRef(false);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to create WAV blob from audio data
  const createWavBlob = (audioData: Float32Array[], sampleRate: number): Blob => {
    const length = audioData.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float32 to int16
    let offset = 44;
    for (const chunk of audioData) {
      for (let i = 0; i < chunk.length; i++) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const requestMicrophonePermission = useCallback(async () => {
    if (isRequestingPermission) {
      return;
    }
    
    // Don't start recording if already recording
    if (isRecording) {
      return;
    }
    
    setIsRequestingPermission(true);
    
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

      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setPermissionGranted(true);
      setError(null);
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      // Auto-start recording after permission is granted
      setTimeout(() => {
        startRecording();
      }, 100);
    } catch (err: unknown) {
      
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
    } finally {
      setIsRequestingPermission(false);
    }
  }, [isRequestingPermission, isRecording]);

  const startRecording = async () => {
    if (!permissionGranted) {
      requestMicrophonePermission();
      return;
    }
    
    // Check if already recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      return;
    }
    
    // If MediaRecorder is not initialized, set it up now
    if (!mediaRecorder || !audioStream) {
      setIsInitializingRecorder(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Try different MIME types for better browser compatibility
        // Start with audio/webm (without codecs) for Sarvam API compatibility
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = ''; // Let browser choose
            }
          }
        }
        
        
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        
        setMediaRecorder(recorder);
        setAudioStream(stream);
        
        // Set up event handlers
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            // Store in ref for immediate access
            audioChunksRef.current.push(event.data);
            // Also update state for UI purposes
            setAudioChunks(prev => [...prev, event.data]);
          }
        };
        
        recorder.onstop = () => {
          handleRecordingStop();
        };
        
        recorder.onerror = () => {
          setError('Recording error occurred');
        };
        
        // Now start recording
        setIsRecording(true);
        setIsListening(true);
        setTranscribedText("");
        setError(null);
        setAudioChunks([]);
        audioChunksRef.current = []; // Clear ref chunks
        
        recorder.start(100); // Collect data every 100ms for better responsiveness
        setRecordingStartTime(Date.now());
        setIsInitializingRecorder(false);
        return;
        
      } catch {
        setError("Failed to initialize recording. Please try again.");
        setIsInitializingRecorder(false);
        return;
      }
    }
    
    setIsRecording(true);
    setIsListening(true);
    setTranscribedText("");
    setError(null);
    setAudioChunks([]);
    
    // Start recording
    mediaRecorder.start(100); // Collect data every 100ms for better responsiveness
    setRecordingStartTime(Date.now());
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      const recordingDuration = recordingStartTime ? Date.now() - recordingStartTime : 0;
      
      // Ensure minimum recording time of 500ms
      if (recordingDuration < 500) {
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 500 - recordingDuration);
      } else {
        // Request all remaining data before stopping
        mediaRecorder.requestData();
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      }
    }
    setIsRecording(false);
    setIsListening(false);
  };

  const handleRecordingStop = async () => {
    setIsTranscribing(true);
    
    try {
      // Create form data for API
      const formData = new FormData();
      
      // Use ref chunks for immediate access
      const chunksToUse = audioChunksRef.current.length > 0 ? audioChunksRef.current : audioChunks;
      
      // Create audio blob from chunks - use audio/webm without codecs for Sarvam API compatibility
      const audioBlob = new Blob(chunksToUse, { type: 'audio/webm' });
      
      if (audioBlob.size === 0) {
        
        // Try to get audio data directly from the stream
        if (audioStream) {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(audioStream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          
          const audioData: Float32Array[] = [];
          
          processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            audioData.push(new Float32Array(inputData));
          };
          
          source.connect(processor);
          processor.connect(audioContext.destination);
          
          // Wait a bit to collect some audio data
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          processor.disconnect();
          source.disconnect();
          audioContext.close();
          
          if (audioData.length > 0) {
            // Convert Float32Array to WAV format (simplified)
            const wavBlob = createWavBlob(audioData, audioContext.sampleRate);
            formData.append('audio', wavBlob, 'recording.wav');
          } else {
            throw new Error('No audio data recorded. Please check your microphone and try again.');
          }
        } else {
          throw new Error('No audio data recorded. Please speak louder or try again.');
        }
      } else {
        formData.append('audio', audioBlob, 'recording.webm');
      }
      
      
      // Send to our API route
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.transcript) {
        setTranscribedText(result.transcript);
        
        // Auto-use the transcribed text in the search input
        onResult(result.transcript);
      } else {
        setError(result.error || 'No transcript received');
      }
      
    } catch (err) {
      setError(`Failed to transcribe audio: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTranscribing(false);
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
    audioChunksRef.current = []; // Clear ref chunks
    setTranscribedText("");
    setError(null);
    setIsTranscribing(false);
    setIsRequestingPermission(false);
    setIsInitializingRecorder(false);
    setRecordingStartTime(null);
    onClose();
  };

  // Check permission status when component mounts
  useEffect(() => {
    const checkPermissionStatus = async () => {
      // Debug information

      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          
          if (permission.state === 'granted') {
            setPermissionGranted(true);
          } else if (permission.state === 'denied') {
            setError("Microphone access is blocked. Please enable it in your browser settings.");
            setPermissionGranted(false);
          }
          
          // Listen for permission changes (only set once)
          if (!permission.onchange) {
            permission.onchange = () => {
              if (permission.state === 'granted') {
                setPermissionGranted(true);
                setError(null);
              } else if (permission.state === 'denied') {
                setPermissionGranted(false);
                setError("Microphone access is blocked. Please enable it in your browser settings.");
              }
            };
          }
        } catch {
        }
      }
    };

    checkPermissionStatus();
  }, []);

  // Reset state when sheet opens and auto-start recording
  useEffect(() => {
    if (isOpen) {
      // Clear all states for new session
      setTranscribedText("");
      setError(null);
      setIsRecording(false);
      setIsListening(false);
      setIsTranscribing(false);
      setIsInitializingRecorder(false);
      setRecordingDuration(0);
      setRecordingStartTime(null);
      setAudioChunks([]);
      audioChunksRef.current = [];
      hasAutoStarted.current = false; // Reset auto-start flag
      
      // Clear any existing timeout
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
      
      // Auto-request permission and start recording (only once)
      if (!hasAutoStarted.current) {
        hasAutoStarted.current = true;
        autoStartTimeoutRef.current = setTimeout(async () => {
          // First request permission, then start recording
          await requestMicrophonePermission();
          // Start recording immediately after permission is granted
          setTimeout(() => {
            startRecording();
          }, 200); // Small delay to ensure permission is processed
        }, 100); // Small delay to ensure sheet is fully open
      }
    } else {
      // Reset auto-start flag when sheet closes
      hasAutoStarted.current = false;
      // Clear timeout if sheet closes
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    }
  }, [isOpen]); // Removed requestMicrophonePermission from dependencies

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
    };
  }, []);

  // Update recording duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 100);
    } else {
      setRecordingDuration(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingStartTime]);

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
            ) : isInitializingRecorder ? (
              <p className="text-muted-foreground">Initializing recorder...</p>
            ) : isListening ? (
              <div className="space-y-1">
                <p className="text-muted-foreground">Listening...</p>
                {recordingDuration > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Recording: {recordingDuration}s
                  </p>
                )}
              </div>
            ) : transcribedText ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Transcription:</p>
                <p className="text-foreground font-medium text-lg bg-muted p-3 rounded-lg border">
                  &ldquo;{transcribedText}&rdquo;
                </p>
              </div>
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
            ) : isInitializingRecorder ? (
              <Button disabled className="px-6 mobile-tap">
                <span className="material-symbols-outlined mr-2 animate-spin" style={{ fontSize: '16px' }}>
                  hourglass_empty
                </span>
                Initializing...
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
            ) : !permissionGranted ? (
              <Button onClick={requestMicrophonePermission} className="px-6 mobile-tap">
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>
                  mic
                </span>
                Allow Microphone
              </Button>
            ) : null}

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
