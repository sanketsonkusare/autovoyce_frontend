"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Web Speech API type declarations (not included in TypeScript by default)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionInterface, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface UseWebSpeechOptions {
  onPartialTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseWebSpeechReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  isSupported: boolean;
}

/**
 * Custom hook for Web Speech API - replaces ElevenLabs useScribe
 * Free, no API key needed, works in modern browsers
 */
export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const {
    onPartialTranscript,
    onFinalTranscript,
    onError,
    language = "en-US",
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const accumulatedTranscriptRef = useRef("");

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      setIsSupported(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Speech recognition not supported in this browser");
      return;
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onError?.("Microphone access denied");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    accumulatedTranscriptRef.current = "";
    setTranscript("");

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      console.log("🎤 Speech recognition started");
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // Handle final transcript
      if (finalTranscript) {
        accumulatedTranscriptRef.current += " " + finalTranscript;
        const fullText = accumulatedTranscriptRef.current.trim();
        setTranscript(fullText);
        onFinalTranscript?.(fullText);
      }

      // Handle interim/partial transcript
      if (interimTranscript) {
        const currentText = (accumulatedTranscriptRef.current + " " + interimTranscript).trim();
        onPartialTranscript?.(currentText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      // Ignore recoverable errors
      if (event.error === "no-speech" || event.error === "aborted") {
        // no-speech: just silence, network: temporary, aborted: user stopped
        return;
      }

      // Network errors on localhost are common - show a helpful message
      if (event.error === "network") {
        console.warn("⚠️ Network error - this is common on localhost. Try using Chrome and ensure you have internet.");
        onError?.("Network error - please ensure you have internet connection and try Chrome browser");
        setIsListening(false);
        return;
      }

      onError?.(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("🎤 Speech recognition ended");
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Error starting recognition:", err);
      onError?.("Failed to start speech recognition");
    }
  }, [language, onPartialTranscript, onFinalTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}
