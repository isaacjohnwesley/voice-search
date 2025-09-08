import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Sarvam API key not configured' },
        { status: 500 }
      );
    }

    // Create form data for Sarvam API
    const sarvamFormData = new FormData();
    sarvamFormData.append('file', audioFile);
    
    // Optional: Add prompt for better accuracy
    sarvamFormData.append('prompt', 'ride hailing, location, destination, address');
    
    // Optional: Specify model (saaras:v2.5 is latest)
    sarvamFormData.append('model', 'saaras:v2.5');

    const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sarvam API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      language: result.language_code,
      requestId: result.request_id,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
