# Rapido Voice Search

A voice-powered ride-hailing search prototype built with Next.js and Sarvam AI's Speech to Text Translate API.

## Features

- 🎤 **Real-time voice recording** using MediaRecorder API
- 🌍 **Multi-language support** with automatic translation to English
- 📱 **Mobile-optimized** interface with Material Design icons
- 🎯 **Ride-hailing focused** with location search capabilities

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Sarvam AI API

1. Get your API key from [Sarvam AI](https://sarvam.ai/)
2. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Add your Sarvam API key to `.env.local`:
   ```
   SARVAM_API_KEY=your_actual_api_key_here
   ```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Integration

This app uses [Sarvam AI's Speech to Text Translate API](https://docs.sarvam.ai/api-reference-docs/speech-to-text/translate) which:

- **Automatically detects** the input language
- **Transcribes** speech to text
- **Translates** to English
- **Supports** multiple audio formats (WAV, MP3, WebM, etc.)

## Usage

1. **Click the microphone icon** in the search input
2. **Allow microphone access** when prompted
3. **Speak your destination** (e.g., "Take me to Central Park")
4. **Wait for transcription** to complete
5. **Click "Use This Text"** to insert the result

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Material Icons** - Icon system
- **Sarvam AI** - Speech to text API

## Deployment

The app is ready for deployment on Vercel, Netlify, or any other platform that supports Next.js.

Make sure to set the `SARVAM_API_KEY` environment variable in your deployment platform.