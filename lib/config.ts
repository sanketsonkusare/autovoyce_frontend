// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  UPLOAD: `${API_BASE_URL}/upload`,
  UPLOAD_PROCESS: `${API_BASE_URL}/upload/process`,
  UPLOAD_STATUS: `${API_BASE_URL}/upload/status`, // SSE endpoint for processing status
  TRANSCRIPT: `${API_BASE_URL}/transcript`, // Backend transcript fetching endpoint
  QUERY: `${API_BASE_URL}/query`,
  SCRIBE_TOKEN: `${API_BASE_URL}/scribe-token`, // DEPRECATED - using Web Speech API now
  TTS: `${API_BASE_URL}/tts`, // Edge TTS text-to-speech endpoint (free)
} as const;

