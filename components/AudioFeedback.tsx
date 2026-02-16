"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Bell,
} from "lucide-react";

/* ─── localStorage keys ──────────────────────────────────────────────── */

const AUDIO_CUES_KEY = "smc_audio_cues_v1";

/* ─── Helpers ────────────────────────────────────────────────────────── */

function loadBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as boolean;
  } catch {
    /* ignore */
  }
  return fallback;
}

function saveBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* ─── AudioPlayer ────────────────────────────────────────────────────── */

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const estimatedDurationRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  /* Estimate duration based on word count and speed */
  const estimateDuration = useCallback(
    (txt: string, speed: number) => {
      const words = txt.split(/\s+/).length;
      /* Average speech rate ~150 words/min */
      return (words / (150 * speed)) * 60 * 1000;
    },
    []
  );

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startSpeech = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = SPEED_OPTIONS[speedIndex];
    utterance.lang = "en-US";

    const dur = estimateDuration(text, SPEED_OPTIONS[speedIndex]);
    estimatedDurationRef.current = dur;
    startTimeRef.current = Date.now();

    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    utterance.onerror = () => {
      setPlaying(false);
      setProgress(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setProgress(0);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / estimatedDurationRef.current) * 100, 99);
      setProgress(pct);
    }, 100);
  }, [supported, text, speedIndex, estimateDuration]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stopSpeech();
    } else {
      startSpeech();
    }
  }, [playing, stopSpeech, startSpeech]);

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % SPEED_OPTIONS.length);
    /* If playing, restart with new speed */
    if (playing) {
      stopSpeech();
      /* Small delay to let cancel take effect */
      setTimeout(() => startSpeech(), 50);
    }
  }, [playing, stopSpeech, startSpeech]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!supported) {
    return (
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--ink-muted)",
          padding: "0.35rem",
        }}
      >
        Speech synthesis not available.
      </div>
    );
  }

  return (
    <div className="audio-player-mini">
      <button className="audio-play-btn" onClick={togglePlay}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="audio-progress" onClick={() => playing && stopSpeech()}>
        <div
          className="audio-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button className="audio-speed-btn" onClick={cycleSpeed}>
        {SPEED_OPTIONS[speedIndex]}x
      </button>
    </div>
  );
}

/* ─── MarketAudioBar ─────────────────────────────────────────────────── */

const MARKET_COMMENTARY = [
  "Markets opened higher today as tech stocks led the rally. The S&P 500 gained 0.8% in early trading with strong volume across major indices.",
  "Earnings reports continue to beat expectations this quarter. Financial sector stocks are showing particular strength with several banks reporting record revenue.",
  "Federal Reserve officials signaled a cautious approach to monetary policy in their latest meeting minutes, keeping rates steady for the foreseeable future.",
  "International markets showed mixed results overnight. Asian markets closed higher while European indices pulled back on concerns over energy prices.",
  "Commodity markets saw gold prices rise to a two-week high as investors looked for safe-haven assets amid geopolitical uncertainty.",
];

export function MarketAudioBar() {
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
  }, []);

  const speak = useCallback(
    (idx: number) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(MARKET_COMMENTARY[idx]);
      utterance.rate = 1;
      utterance.lang = "en-US";
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    },
    [supported]
  );

  const togglePlay = useCallback(() => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
    } else {
      speak(currentIndex);
    }
  }, [playing, currentIndex, speak]);

  const skipForward = useCallback(() => {
    const next = (currentIndex + 1) % MARKET_COMMENTARY.length;
    setCurrentIndex(next);
    if (playing) {
      speak(next);
    }
  }, [currentIndex, playing, speak]);

  const skipBack = useCallback(() => {
    const prev =
      (currentIndex - 1 + MARKET_COMMENTARY.length) % MARKET_COMMENTARY.length;
    setCurrentIndex(prev);
    if (playing) {
      speak(prev);
    }
  }, [currentIndex, playing, speak]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <div className="market-audio-bar">
      <button
        onClick={skipBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--ink-muted)",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
        }}
        title="Previous segment"
      >
        <SkipBack size={14} />
      </button>

      <button
        className="audio-play-btn"
        onClick={togglePlay}
        style={{ width: 24, height: 24 }}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </button>

      <button
        onClick={skipForward}
        style={{
          background: "none",
          border: "none",
          color: "var(--ink-muted)",
          cursor: "pointer",
          padding: "2px",
          display: "flex",
        }}
        title="Next segment"
      >
        <SkipForward size={14} />
      </button>

      {/* Waveform animation bars */}
      <div
        className="market-audio-wave"
        style={{ opacity: playing ? 1 : 0.3 }}
      >
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="market-audio-wave-bar"
            style={{
              animationPlayState: playing ? "running" : "paused",
            }}
          />
        ))}
      </div>

      <span
        style={{
          fontSize: "0.68rem",
          color: "var(--ink-muted)",
          marginLeft: "0.2rem",
          whiteSpace: "nowrap",
        }}
      >
        Market Commentary {currentIndex + 1}/{MARKET_COMMENTARY.length}
      </span>
    </div>
  );
}

/* ─── AudioCueManager + useAudioCue hook ─────────────────────────────── */

type CueType = "navigation" | "trade" | "alert";

interface AudioCueContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  playCue: (type: CueType) => void;
}

const AudioCueContext = createContext<AudioCueContextValue>({
  enabled: false,
  setEnabled: () => {},
  playCue: () => {},
});

export function useAudioCue() {
  return useContext(AudioCueContext);
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine") {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
    /* Close after done */
    setTimeout(() => ctx.close(), duration + 100);
  } catch {
    /* Web Audio not available */
  }
}

function playCueSound(type: CueType) {
  switch (type) {
    case "navigation":
      /* Gentle chime: two quick ascending tones */
      playTone(523, 80, "sine");
      setTimeout(() => playTone(659, 120, "sine"), 90);
      break;
    case "trade":
      /* Confirmation tone: three ascending notes */
      playTone(440, 100, "triangle");
      setTimeout(() => playTone(554, 100, "triangle"), 110);
      setTimeout(() => playTone(659, 150, "triangle"), 220);
      break;
    case "alert":
      /* Warning beep: two short staccato */
      playTone(880, 100, "square");
      setTimeout(() => playTone(880, 100, "square"), 150);
      break;
  }
}

export function AudioCueManager({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [indicator, setIndicator] = useState<{ type: CueType; visible: boolean }>({
    type: "navigation",
    visible: false,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabledState(loadBool(AUDIO_CUES_KEY, false));
    setMounted(true);
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    saveBool(AUDIO_CUES_KEY, v);
  }, []);

  const playCue = useCallback(
    (type: CueType) => {
      if (!enabled) return;
      playCueSound(type);
      setIndicator({ type, visible: true });
      setTimeout(() => setIndicator((prev) => ({ ...prev, visible: false })), 800);
    },
    [enabled]
  );

  const contextValue = useMemo(
    () => ({ enabled, setEnabled, playCue }),
    [enabled, setEnabled, playCue]
  );

  const cueLabel = useMemo(() => {
    switch (indicator.type) {
      case "navigation":
        return "Navigate";
      case "trade":
        return "Trade";
      case "alert":
        return "Alert";
      default:
        return "";
    }
  }, [indicator.type]);

  return (
    <AudioCueContext.Provider value={contextValue}>
      {children}

      {/* Floating indicator */}
      {mounted && (
        <div
          className={`audio-cue-indicator ${indicator.visible ? "visible" : ""}`}
        >
          <Bell size={10} />
          <span>{cueLabel}</span>
        </div>
      )}
    </AudioCueContext.Provider>
  );
}

/* ─── SoundEffectToggle ──────────────────────────────────────────────── */

export function SoundEffectToggle() {
  const { enabled, setEnabled, playCue } = useAudioCue();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    /* Play a sample cue when enabling */
    if (next) {
      setTimeout(() => playCue("navigation"), 100);
    }
  }, [enabled, setEnabled, playCue]);

  if (!mounted) return null;

  return (
    <button
      onClick={handleToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.3rem 0.6rem",
        borderRadius: "0.4rem",
        border: "1px solid var(--surface-border)",
        background: enabled
          ? "color-mix(in srgb, var(--accent) 10%, transparent)"
          : "transparent",
        color: enabled ? "var(--accent)" : "var(--ink-muted)",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
        transition: "all 0.15s",
      }}
      title={enabled ? "Disable sound effects" : "Enable sound effects"}
    >
      {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      <span>Sound {enabled ? "On" : "Off"}</span>
    </button>
  );
}

/* ─── Composed: AudioFeedback ────────────────────────────────────────── */

const DEMO_TEXT =
  "Today's market summary: The major indices closed higher with the S&P 500 gaining 1.2 percent. Technology and healthcare sectors led the advance. Treasury yields remained stable at 4.3 percent on the 10-year note.";

export default function AudioFeedback() {
  const { playCue } = useAudioCue();

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Volume2 size={16} style={{ color: "var(--accent)" }} />
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 800,
              color: "var(--ink)",
            }}
          >
            Audio Feedback
          </span>
        </div>
        <SoundEffectToggle />
      </div>

      {/* Narrated content player */}
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
          Narrated Summary
        </span>
        <AudioPlayer text={DEMO_TEXT} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--surface-border)" }} />

      {/* Market audio bar */}
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
          Market Commentary
        </span>
        <MarketAudioBar />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--surface-border)" }} />

      {/* Audio cue demo buttons */}
      <div>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--ink-muted)",
            marginBottom: "0.35rem",
            display: "block",
          }}
        >
          Audio Cue Preview
        </span>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
          {(["navigation", "trade", "alert"] as const).map((type) => (
            <button
              key={type}
              onClick={() => playCue(type)}
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "0.25rem 0.55rem",
                borderRadius: "0.3rem",
                border: "1px solid var(--surface-border)",
                background: "transparent",
                color: "var(--ink-muted)",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
