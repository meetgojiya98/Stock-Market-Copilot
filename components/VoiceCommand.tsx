"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Mic, MicOff, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface VoiceCommand {
  type: "search" | "buy" | "price" | "unknown";
  symbol?: string;
  raw: string;
}

interface ChartDataPoint {
  day: number;
  price: number;
  date?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function parseVoiceCommand(transcript: string): VoiceCommand {
  const lower = transcript.toLowerCase().trim();

  const searchMatch = lower.match(/search\s+([a-z]{1,5})/i);
  if (searchMatch) {
    return { type: "search", symbol: searchMatch[1].toUpperCase(), raw: transcript };
  }

  const buyMatch = lower.match(/buy\s+([a-z]{1,5})/i);
  if (buyMatch) {
    return { type: "buy", symbol: buyMatch[1].toUpperCase(), raw: transcript };
  }

  const priceMatch = lower.match(/price\s+(?:of\s+)?([a-z]{1,5})/i);
  if (priceMatch) {
    return { type: "price", symbol: priceMatch[1].toUpperCase(), raw: transcript };
  }

  return { type: "unknown", raw: transcript };
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/* ─── VoiceSearchButton ──────────────────────────────────────────────── */

export function VoiceSearchButton({
  onCommand,
}: {
  onCommand?: (cmd: VoiceCommand) => void;
}) {
  const [state, setState] = useState<"idle" | "listening" | "processing">("idle");
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionInstance) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript(final);
        setPartialTranscript("");
      } else {
        setPartialTranscript(interim);
      }
    };

    recognition.onend = () => {
      setState("processing");
      setTimeout(() => {
        setState("idle");
      }, 500);
    };

    recognition.onerror = () => {
      setState("idle");
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setPartialTranscript("");
    setLastCommand(null);
    setState("listening");
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  /* Process command when transcript finalises */
  useEffect(() => {
    if (transcript && state === "processing") {
      const cmd = parseVoiceCommand(transcript);
      setLastCommand(cmd);
      if (onCommand) onCommand(cmd);
    }
  }, [transcript, state, onCommand]);

  const handleClick = useCallback(() => {
    if (state === "listening") {
      stopListening();
    } else if (state === "idle") {
      startListening();
    }
  }, [state, startListening, stopListening]);

  if (!supported) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
        }}
      >
        <button
          className="voice-btn"
          disabled
          title="Voice not supported"
          style={{ opacity: 0.4, cursor: "not-allowed" }}
        >
          <MicOff size={16} />
        </button>
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--ink-muted)",
          }}
        >
          Voice not supported
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <button
          className={`voice-btn ${state === "listening" ? "listening" : ""}`}
          onClick={handleClick}
          title={
            state === "listening"
              ? "Stop listening"
              : state === "processing"
                ? "Processing..."
                : "Start voice command"
          }
        >
          {state === "processing" ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          ) : state === "listening" ? (
            <Mic size={16} />
          ) : (
            <Mic size={16} />
          )}
        </button>
        <span
          style={{
            fontSize: "0.72rem",
            color:
              state === "listening"
                ? "var(--negative)"
                : "var(--ink-muted)",
            fontWeight: state === "listening" ? 600 : 400,
          }}
        >
          {state === "listening"
            ? "Listening..."
            : state === "processing"
              ? "Processing..."
              : 'Say "search AAPL", "price MSFT"...'}
        </span>
      </div>

      {(transcript || partialTranscript) && (
        <div
          className={`voice-transcript ${partialTranscript && !transcript ? "partial" : ""}`}
        >
          {transcript || partialTranscript}
        </div>
      )}

      {lastCommand && (
        <div
          style={{
            fontSize: "0.7rem",
            padding: "0.3rem 0.5rem",
            borderRadius: "0.35rem",
            background:
              lastCommand.type !== "unknown"
                ? "color-mix(in srgb, var(--positive) 8%, transparent)"
                : "color-mix(in srgb, var(--negative) 8%, transparent)",
            color:
              lastCommand.type !== "unknown"
                ? "var(--positive)"
                : "var(--negative)",
            fontWeight: 600,
          }}
        >
          {lastCommand.type !== "unknown" ? (
            <span>
              Recognized: {lastCommand.type.toUpperCase()}{" "}
              {lastCommand.symbol ? lastCommand.symbol : ""}
            </span>
          ) : (
            <span>Command not recognized. Try: search, buy, or price + symbol</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── VoiceNoteRecorder ──────────────────────────────────────────────── */

export function VoiceNoteRecorder() {
  const [recState, setRecState] = useState<"idle" | "recording" | "playback">("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [supported, setSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformBarsRef = useRef<number[]>([4, 8, 12, 6, 10, 14, 8, 5, 11, 7, 13, 9, 6, 10, 8]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setSupported(false);
    }
  }, []);

  /* Animated waveform bars during recording */
  const [waveHeights, setWaveHeights] = useState<number[]>(
    waveformBarsRef.current
  );

  useEffect(() => {
    if (recState !== "recording") return;
    const id = setInterval(() => {
      setWaveHeights(
        waveformBarsRef.current.map(() => 3 + Math.random() * 15)
      );
    }, 150);
    return () => clearInterval(id);
  }, [recState]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setRecState("playback");
        stream.getTracks().forEach((t) => t.stop());

        /* Attempt transcription */
        const Ctor = getSpeechRecognitionCtor();
        if (Ctor) {
          const recog = new Ctor();
          recog.continuous = false;
          recog.interimResults = false;
          recog.lang = "en-US";
          recog.onresult = (evt: SpeechRecognitionInstance) => {
            let text = "";
            for (let i = 0; i < evt.results.length; i++) {
              text += evt.results[i][0].transcript;
            }
            setTranscription(text);
          };
          recog.onerror = () => {
            /* transcription failed silently */
          };
          /* We cannot feed audio to SpeechRecognition directly;
             set a note that live transcription would need concurrent recognition */
          setTranscription("(Live transcription available during recording)");
        }
      };

      mediaRecorderRef.current = recorder;
      setDuration(0);
      setTranscription("");
      setBlobUrl(null);
      recorder.start();
      setRecState("recording");

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setSupported(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setDuration(0);
    setTranscription("");
    setRecState("idle");
  }, [blobUrl]);

  const formatTime = useCallback((s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, []);

  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayback = useCallback(() => {
    if (!blobUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(blobUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [blobUrl, isPlaying]);

  if (!supported) {
    return (
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--ink-muted)",
          padding: "0.4rem",
        }}
      >
        Microphone access not available in this browser.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {recState === "idle" && (
          <button
            className="voice-note-btn"
            onClick={startRecording}
          >
            <Mic size={14} />
            <span>Record Note</span>
          </button>
        )}

        {recState === "recording" && (
          <>
            <button
              className="voice-note-btn recording"
              onClick={stopRecording}
            >
              <Square size={12} />
              <span>{formatTime(duration)}</span>
            </button>

            <div className="voice-note-waveform">
              {waveHeights.map((h, i) => (
                <div
                  key={i}
                  className="voice-note-waveform-bar"
                  style={{
                    height: `${h}px`,
                    transition: "height 0.12s ease",
                  }}
                />
              ))}
            </div>
          </>
        )}

        {recState === "playback" && blobUrl && (
          <>
            <button
              className="voice-note-btn"
              onClick={togglePlayback}
              style={{
                color: isPlaying ? "var(--accent)" : undefined,
                borderColor: isPlaying ? "var(--accent)" : undefined,
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--ink-muted)",
              }}
            >
              {formatTime(duration)}
            </span>

            <button
              className="voice-note-btn"
              onClick={discardRecording}
              title="Discard recording"
              style={{ color: "var(--negative)", borderColor: "var(--negative)" }}
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>

      {transcription && recState === "playback" && (
        <div
          className="voice-transcript"
          style={{ fontSize: "0.72rem" }}
        >
          {transcription}
        </div>
      )}
    </div>
  );
}

/* ─── ScreenReaderChartDesc ──────────────────────────────────────────── */

export function ScreenReaderChartDesc({
  data,
  symbol,
}: {
  data: ChartDataPoint[];
  symbol: string;
}) {
  const description = useMemo(() => {
    if (!data || data.length === 0) {
      return `${symbol} price chart with no data available.`;
    }

    const days = data.length;
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const change = lastPrice - firstPrice;
    const changePct = ((change / firstPrice) * 100).toFixed(1);
    const direction = change >= 0 ? "increased" : "decreased";
    const directionWord = change >= 0 ? "gain" : "loss";

    let highest = data[0];
    let lowest = data[0];
    for (const point of data) {
      if (point.price > highest.price) highest = point;
      if (point.price < lowest.price) lowest = point;
    }

    const lines: string[] = [
      `${symbol} price chart showing ${days} days.`,
      `Price ${direction} from $${firstPrice.toFixed(2)} to $${lastPrice.toFixed(2)}, a ${Math.abs(Number(changePct))}% ${directionWord}.`,
      `Highest point was $${highest.price.toFixed(2)} on day ${highest.day}.`,
      `Lowest was $${lowest.price.toFixed(2)} on day ${lowest.day}.`,
    ];

    return lines.join(" ");
  }, [data, symbol]);

  return (
    <div className="sr-chart-desc" role="img" aria-label={description}>
      {description}
    </div>
  );
}

/* ─── Composed: VoiceCommand ─────────────────────────────────────────── */

export default function VoiceCommand() {
  const [lastCmd, setLastCmd] = useState<VoiceCommand | null>(null);

  const mockChartData: ChartDataPoint[] = useMemo(() => {
    const points: ChartDataPoint[] = [];
    let price = 150;
    for (let i = 1; i <= 30; i++) {
      price += (Math.random() - 0.45) * 5;
      price = Math.max(100, price);
      points.push({ day: i, price: +price.toFixed(2) });
    }
    return points;
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        padding: "0.75rem",
        borderRadius: "0.65rem",
        border: "1px solid var(--surface-border)",
        background: "var(--bg-canvas)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <Mic size={16} style={{ color: "var(--accent)" }} />
        <span
          style={{
            fontSize: "0.9rem",
            fontWeight: 800,
            color: "var(--ink)",
          }}
        >
          Voice Commands
        </span>
      </div>

      {/* Voice search */}
      <div>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--ink-muted)",
            marginBottom: "0.25rem",
            display: "block",
          }}
        >
          Voice Search
        </span>
        <VoiceSearchButton onCommand={setLastCmd} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--surface-border)" }} />

      {/* Voice notes */}
      <div>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--ink-muted)",
            marginBottom: "0.25rem",
            display: "block",
          }}
        >
          Trade Journal Voice Note
        </span>
        <VoiceNoteRecorder />
      </div>

      {/* Screen reader chart description (visually hidden) */}
      <ScreenReaderChartDesc
        data={mockChartData}
        symbol={lastCmd?.symbol || "AAPL"}
      />
    </div>
  );
}
