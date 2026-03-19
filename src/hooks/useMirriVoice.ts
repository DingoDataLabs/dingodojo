import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseMirriVoiceOptions {
  isChampion: boolean;
  onTranscript: (text: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function useMirriVoice({ isChampion, onTranscript, onSpeakingChange }: UseMirriVoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sttUnsupported] = useState(!SpeechRecognitionAPI);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZFRlYW0gQ3JlYXRpdmUgQ29tbW9ucyBBdHRyaWJ1dGlvbgBURU5DAAAAHQAAA1N3aXRjaCBQbHVzACBodHRwOi8vd3d3LnN3aXRjaHBsdXMuY29tAFRJVDIAAAAGAAADMC4wMDAAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

  // Synchronous unlock — must be called inside a user-gesture handler
  // before any await, so iOS Safari considers the audio element activated.
  const unlockAudio = useCallback(() => {
    if (!audioRef.current) return;
    const a = audioRef.current;
    a.src = SILENT_MP3;
    a.play().then(() => {
      a.pause();
      a.src = "";
    }).catch(() => {});
    audioUnlockedRef.current = true;
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        try { recognitionRef.current.stop(); } catch {}
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI || !isChampion) return;

    unlockAudio();
    stopRecognition();

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-AU";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript?.trim()) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // No auto-restart — user must press push-to-talk again
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("STT error:", event.error);
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }, [isChampion, onTranscript, stopRecognition, unlockAudio]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  const cancelSpeech = useCallback(() => {
    abortControllerRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    onSpeakingChange(false);
  }, [onSpeakingChange]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    stopRecognition();
    setIsSpeaking(true);
    onSpeakingChange(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) return;
      audioRef.current.src = url;

      await new Promise<void>((resolve, reject) => {
        if (!audioRef.current) return reject();
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audioRef.current.onerror = () => {
          URL.revokeObjectURL(url);
          reject();
        };
        audioRef.current.play().catch(reject);
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Speak error:", err);
    } finally {
      setIsSpeaking(false);
      onSpeakingChange(false);
      // No auto-restart — user must press push-to-talk again
    }
  }, [onSpeakingChange, stopRecognition]);

  useEffect(() => {
    return () => {
      stopRecognition();
      abortControllerRef.current?.abort();
    };
  }, [stopRecognition]);

  return {
    isListening,
    isSpeaking,
    sttUnsupported,
    unlockAudio,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
}
