"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Sarvam API integration
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    
    // Create a new blob with the correct MIME type for the API
    let apiBlob = audioBlob;
    let fileName = 'recording.wav';
    
    if (audioBlob.type.includes('webm')) {
      // Convert webm;codecs=opus to plain webm for API compatibility
      apiBlob = new Blob([audioBlob], { type: 'audio/webm' });
      fileName = 'recording.webm';
    } else if (audioBlob.type.includes('mp4')) {
      fileName = 'recording.mp4';
    }
    
    formData.append('file', apiBlob, fileName);
    
    // Add optional parameters to improve transcription
    formData.append('model', 'saaras:v2.5');
    
    // Add a prompt to help with context (as suggested in documentation)
    formData.append('prompt', 'User is asking for directions or location information. This is a voice search for navigation.');
    
    const apiKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;
    console.log('API Key available:', !!apiKey);
    console.log('Original audio blob size:', audioBlob.size, 'bytes');
    console.log('Original audio blob type:', audioBlob.type);
    console.log('API blob type:', apiBlob.type);
    console.log('File name:', fileName);
    
    try {
      const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey || '',
        },
        body: formData,
      });

      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`Sarvam API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      console.log('Transcript:', data.transcript);
      console.log('Language detected:', data.language_code);
      
      // If transcript is empty, provide a helpful message
      if (!data.transcript || data.transcript.trim() === '') {
        console.warn('Empty transcript received from API');
        return 'No speech detected. Please try speaking more clearly and loudly.';
      }
      
      return data.transcript || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  };

  // Convert audio blob to WAV format
  const convertToWav = async (audioBlob: Blob): Promise<Blob> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Set sample rate to 16kHz as required by Sarvam
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Resample to 16kHz if needed
      let processedBuffer = audioBuffer;
      if (audioBuffer.sampleRate !== 16000) {
        console.log(`Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        processedBuffer = await resampleAudioBuffer(audioBuffer, 16000);
      }
      
      // Convert to WAV format
      const wavBuffer = audioBufferToWav(processedBuffer);
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
      console.error('WAV conversion error:', error);
      // Fallback: return original blob if conversion fails
      return audioBlob;
    }
  };

  // Helper function to resample audio buffer
  const resampleAudioBuffer = async (audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    return await offlineContext.startRendering();
  };

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const numberOfChannels = buffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const requestMicrophonePermission = async () => {
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
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
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
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      requestMicrophonePermission();
      return;
    }
    
    try {
      // Get media stream with optimized settings for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // 16kHz as recommended by Sarvam
          channelCount: 1, // Mono audio
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Create MediaRecorder with WebM format (most compatible with browsers)
      // We'll convert to WAV later for the API
      let mimeType = 'audio/webm';
      
      // Check which WebM format is supported
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      console.log('Using MIME type:', mimeType);
      console.log('MediaRecorder supported types:', [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ].filter(type => MediaRecorder.isTypeSupported(type)));
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);
          setError(null);
          
          console.log('Audio recording stopped, processing...');
          console.log('Audio chunks count:', audioChunksRef.current.length);
          
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Original audio blob size:', audioBlob.size, 'bytes');
          console.log('Original audio blob type:', audioBlob.type);
          
          // Try sending the original audio first (WebM is supported by Sarvam)
          console.log('Sending original audio to Sarvam API...');
          let transcript = '';
          
          try {
            transcript = await transcribeAudio(audioBlob);
            console.log('Received transcript from original audio:', transcript);
          } catch (error) {
            console.log('Original audio failed, trying WAV conversion...');
            // Fallback to WAV conversion
            const wavBlob = await convertToWav(audioBlob);
            console.log('WAV blob size:', wavBlob.size, 'bytes');
            transcript = await transcribeAudio(wavBlob);
            console.log('Received transcript from WAV:', transcript);
          }
          
          setTranscribedText(transcript);
          setIsProcessing(false);
        } catch (error) {
          console.error('Processing error:', error);
          setError(error instanceof Error ? error.message : 'Failed to process audio');
          setIsProcessing(false);
        } finally {
          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        }
      };
      
      setIsRecording(true);
      setIsListening(true);
      setTranscribedText("");
      setError(null);
      
      // Start recording with time slices for better quality
      mediaRecorder.start(100); // Record in 100ms chunks
    } catch (error) {
      console.error('Recording error:', error);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Check if we have enough audio data
      const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log('Total audio size before stopping:', totalSize, 'bytes');
      
      if (totalSize < 1000) { // Less than 1KB is probably too short
        setError('Recording too short. Please speak for at least 2-3 seconds.');
        setIsRecording(false);
        setIsListening(false);
        return;
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
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
    
    // Clean up any remaining stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setTranscribedText("");
    setError(null);
    setIsProcessing(false);
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
            ) : isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-muted-foreground">Processing audio...</p>
              </div>
            ) : isListening ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">Listening... Speak clearly</p>
                <p className="text-xs text-muted-foreground">Speak for at least 2-3 seconds for best results</p>
              </div>
            ) : transcribedText ? (
              <div className="space-y-2">
                <p className="text-foreground font-medium">&ldquo;{transcribedText}&rdquo;</p>
                <p className="text-xs text-muted-foreground">Transcribed and translated to English</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {permissionGranted 
                    ? "Tap the microphone to start speaking" 
                    : "Allow microphone access to use voice search"
                  }
                </p>
                {permissionGranted && (
                  <p className="text-xs text-muted-foreground">Speak clearly and loudly for best results</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            {!permissionGranted ? (
              <Button onClick={requestMicrophonePermission} className="px-6 mobile-tap">
                Allow Microphone
              </Button>
            ) : isProcessing ? (
              <Button disabled className="px-6 mobile-tap">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
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

            {transcribedText && !isProcessing && (
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
