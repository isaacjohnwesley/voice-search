# Voice Search Setup Instructions

## Environment Configuration

To use the Sarvam AI Speech to Text Translate feature, you need to set up your API key:

### 1. Create Environment File

Create a `.env.local` file in the root directory of your project:

```bash
# Create the file
touch .env.local
```

### 2. Add Your Sarvam API Key

Add the following content to your `.env.local` file:

```env
# Sarvam AI API Key
NEXT_PUBLIC_SARVAM_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual Sarvam API key obtained from [https://sarvam.ai/](https://sarvam.ai/).

### 3. Restart Development Server

After adding the API key, restart your development server:

```bash
npm run dev
```

## Features Implemented

✅ **Audio Recording**: Records audio in WAV format (16kHz sample rate)  
✅ **Sarvam API Integration**: Sends audio to Sarvam Speech to Text Translate API  
✅ **Real-time Transcription**: Displays transcribed and translated text  
✅ **Processing States**: Shows loading states during audio processing  
✅ **Error Handling**: Comprehensive error handling for various scenarios  
✅ **Mobile Optimized**: Touch-friendly interface for mobile devices  

## How It Works

1. **Permission Request**: The app requests microphone permission when first used
2. **Audio Recording**: Records audio using the browser's MediaRecorder API
3. **Format Conversion**: Converts recorded audio to WAV format (required by Sarvam)
4. **API Call**: Sends the WAV file to Sarvam's Speech to Text Translate endpoint
5. **Display Result**: Shows the transcribed and translated text in the search input

## Supported Audio Formats

The Sarvam API supports various audio formats, but the app converts everything to WAV format for optimal compatibility:
- WAV, MP3, AAC, AIFF, OGG, OPUS, FLAC, MP4/M4A, AMR, WMA, WebM, and PCM formats

## Browser Requirements

- Modern browser with MediaRecorder API support
- HTTPS or localhost for microphone access
- Microphone permission granted by the user
