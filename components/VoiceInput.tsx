"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Web Speech API type shim                                           */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as Record<string, SpeechRecognitionConstructor>)
      .SpeechRecognition ||
    (window as unknown as Record<string, SpeechRecognitionConstructor>)
      .webkitSpeechRecognition ||
    null
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VoiceInput({ onTranscript, className }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  /* Check browser support on mount */
  useEffect(() => {
    if (!getSpeechRecognition()) {
      setSupported(false);
    }
  }, []);

  const handleClick = useCallback(() => {
    const SR = getSpeechRecognition();

    if (!SR) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
      return;
    }

    /* If already listening, stop */
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      if (!supported) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 2500);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, onTranscript, supported]);

  return (
    <div style={{ position: "relative", display: "inline-flex" }} className={className}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={listening ? "Stop listening" : "Start voice input"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "6px 8px",
          borderRadius: 8,
          color: listening ? "#ef4444" : "var(--ink-muted, #888)",
          transition: "color 0.15s",
          fontFamily: "inherit",
          fontSize: 13,
          animation: listening ? "voicePulse 1.2s ease-in-out infinite" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!listening) {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--accent-2, #3b82f6)";
          }
        }}
        onMouseLeave={(e) => {
          if (!listening) {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--ink-muted, #888)";
          }
        }}
      >
        <Mic size={16} />
        {listening && (
          <span style={{ fontSize: 12, fontWeight: 500 }}>Listening...</span>
        )}
      </button>

      {/* Tooltip for unsupported browsers */}
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            padding: "6px 12px",
            borderRadius: 8,
            background: "rgba(30,30,46,0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--ink, #e0e0e0)",
            fontSize: 12,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            animation: "voiceTooltipIn 0.15s ease",
            zIndex: 100,
          }}
        >
          Voice not supported
        </div>
      )}

      <style>{`
        @keyframes voicePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes voiceTooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
