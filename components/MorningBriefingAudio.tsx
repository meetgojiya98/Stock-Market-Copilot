"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  FastForward,
  Headphones,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SpeedOption = 0.75 | 1 | 1.25 | 1.5;

interface BriefingState {
  paragraphs: string[];
  sentences: string[];
  generatedDate: string;
}

/* ------------------------------------------------------------------ */
/*  Deterministic seed helpers                                         */
/* ------------------------------------------------------------------ */

function dateSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

/* ------------------------------------------------------------------ */
/*  Mock data pools                                                    */
/* ------------------------------------------------------------------ */

const INDEX_NAMES = ["S&P 500", "Nasdaq Composite", "Dow Jones", "Russell 2000"];
const INDEX_CHANGES = ["+0.4%", "+1.1%", "-0.3%", "+0.7%", "-0.6%", "+1.5%", "+0.2%", "-0.8%"];
const SECTORS = ["Technology", "Healthcare", "Financials", "Energy", "Consumer Discretionary", "Industrials"];
const TOP_MOVERS_UP = ["NVDA", "AAPL", "TSLA", "AMZN", "CRM", "AVGO", "NFLX", "META"];
const TOP_MOVERS_DOWN = ["INTC", "BA", "WBA", "VZ", "PFE", "DIS", "PYPL", "SNAP"];
const EARNINGS_COMPANIES = [
  "Apple Inc.", "Microsoft Corp.", "Alphabet Inc.", "Amazon.com Inc.",
  "NVIDIA Corp.", "Tesla Inc.", "Meta Platforms", "JPMorgan Chase",
  "Walmart Inc.", "Costco Wholesale", "Salesforce Inc.", "Adobe Inc.",
];
const MACRO_EVENTS = [
  "Federal Reserve meeting minutes released today showing a continued hawkish stance on interest rates.",
  "Consumer Price Index data came in slightly above expectations, raising concerns about persistent inflation.",
  "U.S. jobless claims fell to 210,000, signaling continued labor market strength.",
  "Treasury yields edged higher with the 10-year reaching 4.35% amid global bond sell-offs.",
  "Oil prices climbed 2.1% on OPEC supply cut extension talks, pushing energy names higher.",
  "U.S. retail sales beat estimates by 0.3%, suggesting consumer spending remains resilient.",
  "The European Central Bank held rates steady, diverging from market expectations of a cut.",
  "China's manufacturing PMI came in at 50.8, signaling modest expansion in the world's second-largest economy.",
];
const PORTFOLIO_IMPACTS = [
  "Your tech-heavy portfolio is positioned to benefit from today's sector rotation back into growth stocks.",
  "With rising yields, your financial holdings like JPM and GS should see margin improvement.",
  "The energy rally is a tailwind for your XOM and CVX positions, which are up over 3% pre-market.",
  "Your NVDA position is the standout performer, contributing roughly 40% of today's portfolio gains.",
  "Defensive names in your portfolio like PG and JNJ are providing stability amid the broader volatility.",
  "Your recent addition of AMD is paying off as semiconductor demand forecasts were revised upward.",
];
const OUTLOOKS = [
  "Looking ahead, the market appears poised for continued upside if earnings season delivers. Key resistance for the S&P 500 sits at 5,200, while support holds around 5,050. Monitor the Fed's upcoming commentary for any shifts in rate cut timing.",
  "The near-term outlook is cautiously optimistic. Breadth is improving with more stocks participating in the rally. However, valuations remain stretched in mega-cap tech, suggesting a potential rotation into value names. Watch the VIX for signs of complacency.",
  "Markets face a pivotal week with several catalysts on deck. The combination of earnings releases and economic data could set the tone for the rest of the quarter. Consider maintaining a balanced exposure and keeping some dry powder for any pullback opportunities.",
  "Despite the recent run-up, internal market indicators suggest momentum is fading. The advance-decline line has diverged from the index, which historically precedes a consolidation. This does not mean a crash, but tempering expectations for the short term is prudent.",
];

/* ------------------------------------------------------------------ */
/*  Generate daily briefing                                            */
/* ------------------------------------------------------------------ */

function generateBriefing(): BriefingState {
  const seed = dateSeed();
  const rand = seededRandom(seed);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const idx1 = pick(INDEX_NAMES, rand);
  const idx2 = pick(INDEX_NAMES.filter((n) => n !== idx1), rand);
  const ch1 = pick(INDEX_CHANGES, rand);
  const ch2 = pick(INDEX_CHANGES, rand);
  const leadSector = pick(SECTORS, rand);

  const p1 = `Good morning! Here is your market briefing for ${today}. U.S. equity futures are signaling a mixed open with ${idx1} futures ${ch1} and ${idx2} futures ${ch2}. Overnight, Asian markets closed mostly higher while European indices are trading flat. The ${leadSector} sector is leading the pre-market action, while utilities and real estate are lagging. Overall market sentiment sits at a neutral-to-slightly-bullish reading this morning.`;

  const up1 = pick(TOP_MOVERS_UP, rand);
  const up2 = pick(TOP_MOVERS_UP.filter((s) => s !== up1), rand);
  const dn1 = pick(TOP_MOVERS_DOWN, rand);
  const dn2 = pick(TOP_MOVERS_DOWN.filter((s) => s !== dn1), rand);
  const upPct1 = (rand() * 4 + 1).toFixed(1);
  const upPct2 = (rand() * 3 + 0.5).toFixed(1);
  const dnPct1 = (rand() * 3 + 0.5).toFixed(1);
  const dnPct2 = (rand() * 2 + 0.3).toFixed(1);

  const p2 = `Top movers this morning include ${up1}, up ${upPct1}% on strong analyst upgrades, and ${up2}, gaining ${upPct2}% after reporting better-than-expected quarterly results. On the downside, ${dn1} is falling ${dnPct1}% following a revenue miss, and ${dn2} is down ${dnPct2}% amid concerns over regulatory headwinds. Trading volume is running about 12% above the 20-day average, suggesting institutional participation is picking up.`;

  const earningsCo1 = pick(EARNINGS_COMPANIES, rand);
  const earningsCo2 = pick(EARNINGS_COMPANIES.filter((c) => c !== earningsCo1), rand);
  const epsB1 = (rand() * 2 + 0.5).toFixed(2);
  const epsB2 = (rand() * 1.5 + 0.3).toFixed(2);

  const p3 = `In earnings news, ${earningsCo1} reported after yesterday's close, beating EPS estimates by $${epsB1} and guiding above consensus for next quarter. The stock is responding positively in pre-market. Meanwhile, ${earningsCo2} is scheduled to report after today's close, with the street expecting EPS of $${epsB2}. Options markets are implying a ${(rand() * 5 + 3).toFixed(1)}% move in either direction, making it one of the more anticipated reports this week.`;

  const p4 = pick(MACRO_EVENTS, rand) + " " + pick(
    MACRO_EVENTS.filter((e) => e !== MACRO_EVENTS[0]),
    rand
  );

  const p5 = pick(PORTFOLIO_IMPACTS, rand) + " Overall, your portfolio is tracking roughly " +
    (rand() > 0.5 ? "+" : "-") + (rand() * 1.5 + 0.1).toFixed(2) +
    "% in pre-market activity. Consider reviewing any open limit orders to ensure they still align with today's price action.";

  const p6 = pick(OUTLOOKS, rand);

  const paragraphs = [p1, p2, p3, p4, p5, p6];
  const sentences: string[] = [];
  paragraphs.forEach((p) => {
    const parts = p.match(/[^.!?]+[.!?]+/g) || [p];
    parts.forEach((s) => sentences.push(s.trim()));
  });

  return { paragraphs, sentences, generatedDate: today };
}

/* ------------------------------------------------------------------ */
/*  Waveform bar heights                                               */
/* ------------------------------------------------------------------ */

function generateWaveHeights(count: number, rand: () => number): number[] {
  return Array.from({ length: count }, () => Math.floor(rand() * 28) + 4);
}

/* ------------------------------------------------------------------ */
/*  Format seconds -> mm:ss                                            */
/* ------------------------------------------------------------------ */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MorningBriefingAudio() {
  const [briefing, setBriefing] = useState<BriefingState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);
  const sentenceQueueRef = useRef<string[]>([]);
  const currentQueueIdxRef = useRef(0);
  const waveHeightsRef = useRef<number[]>([]);
  const transcriptRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /* Generate briefing on mount */
  useEffect(() => {
    const b = generateBriefing();
    setBriefing(b);
    const wordsPerMinute = 150;
    const wordCount = b.paragraphs.join(" ").split(/\s+/).length;
    setTotalDuration(Math.ceil((wordCount / wordsPerMinute) * 60));
    const rand = seededRandom(dateSeed() + 999);
    waveHeightsRef.current = generateWaveHeights(30, rand);
  }, []);

  /* Scroll active sentence into view */
  useEffect(() => {
    if (currentSentenceIdx >= 0 && transcriptRefs.current[currentSentenceIdx]) {
      transcriptRefs.current[currentSentenceIdx]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentSentenceIdx]);

  /* Clean up on unmount */
  useEffect(() => {
    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  /* Elapsed timer */
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const raw = pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000;
      setElapsed(Math.min(raw, totalDuration));
    }, 250);
  }, [totalDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedElapsedRef.current =
      pausedElapsedRef.current + (Date.now() - startTimeRef.current) / 1000;
  }, []);

  /* Speak a single sentence, then move to the next */
  const speakSentence = useCallback(
    (idx: number) => {
      if (!briefing || !synthRef.current) return;
      if (idx >= briefing.sentences.length) {
        /* Done */
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIdx(-1);
        stopTimer();
        pausedElapsedRef.current = 0;
        setElapsed(totalDuration);
        return;
      }
      currentQueueIdxRef.current = idx;
      setCurrentSentenceIdx(idx);
      const utt = new SpeechSynthesisUtterance(briefing.sentences[idx]);
      utt.rate = speed;
      utt.volume = isMuted ? 0 : 1;
      utt.onend = () => {
        speakSentence(idx + 1);
      };
      utteranceRef.current = utt;
      synthRef.current.speak(utt);
    },
    [briefing, speed, isMuted, stopTimer, totalDuration],
  );

  /* Play */
  const handlePlay = useCallback(() => {
    if (!briefing) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    synthRef.current = window.speechSynthesis;

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      startTimer();
      return;
    }

    synthRef.current.cancel();
    sentenceQueueRef.current = briefing.sentences;
    pausedElapsedRef.current = 0;
    setElapsed(0);
    setIsPlaying(true);
    setIsPaused(false);
    startTimer();
    speakSentence(0);
  }, [briefing, isPaused, speakSentence, startTimer]);

  /* Pause */
  const handlePause = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.pause();
    }
    setIsPlaying(false);
    setIsPaused(true);
    stopTimer();
  }, [stopTimer]);

  /* Stop / Reset */
  const handleStop = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    stopTimer();
    pausedElapsedRef.current = 0;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIdx(-1);
    setElapsed(0);
  }, [stopTimer]);

  /* Skip forward / back by 5 sentences */
  const handleSkip = useCallback(
    (direction: 1 | -1) => {
      if (!briefing || !synthRef.current) return;
      synthRef.current.cancel();
      const next = Math.max(0, Math.min(briefing.sentences.length - 1, currentQueueIdxRef.current + direction * 5));
      speakSentence(next);
    },
    [briefing, speakSentence],
  );

  /* Change speed */
  const cycleSpeed = useCallback(() => {
    const speeds: SpeedOption[] = [0.75, 1, 1.25, 1.5];
    setSpeed((prev) => {
      const idx = speeds.indexOf(prev);
      return speeds[(idx + 1) % speeds.length];
    });
  }, []);

  /* Toggle mute */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  /* Progress percentage */
  const progress = totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0;

  if (!briefing) return null;

  return (
    <div className="briefing-player" style={{ background: "var(--card, #1e1e2f)", borderRadius: 16, padding: 24, color: "var(--foreground, #e2e2e2)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <Headphones size={22} style={{ color: "#a78bfa" }} />
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Morning Briefing</h3>
          <span style={{ fontSize: 12, opacity: 0.6, display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={12} /> {briefing.generatedDate}
          </span>
        </div>
      </div>

      {/* Waveform */}
      <div
        className="briefing-waveform"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          height: 48,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        {waveHeightsRef.current.map((h, i) => {
          const activeBar = isPlaying && i <= Math.floor((progress / 100) * 30);
          return (
            <div
              key={i}
              className="briefing-wave-bar"
              style={{
                width: 4,
                borderRadius: 2,
                height: isPlaying ? h + Math.sin(Date.now() / 200 + i) * 4 : h,
                background: activeBar ? "#a78bfa" : "rgba(167,139,250,0.25)",
                transition: "height 0.15s ease, background 0.2s ease",
                animation: isPlaying ? `wave-pulse 0.6s ease-in-out ${i * 0.04}s infinite alternate` : "none",
              }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 6 }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "#a78bfa", borderRadius: 2, transition: "width 0.3s linear" }} />
      </div>

      {/* Time display */}
      <div className="briefing-time" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.55, marginBottom: 16 }}>
        <span>{formatTime(elapsed)}</span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
        <button
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.6 }}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <button
          onClick={() => handleSkip(-1)}
          title="Back 5 sentences"
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.6 }}
        >
          <SkipBack size={20} />
        </button>

        <button
          className="briefing-play-btn"
          onClick={isPlaying ? handlePause : handlePlay}
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: "#a78bfa",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 0,
            boxShadow: "0 0 20px rgba(167,139,250,0.35)",
          }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 2 }} />}
        </button>

        <button
          onClick={() => handleSkip(1)}
          title="Forward 5 sentences"
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.6 }}
        >
          <SkipForward size={20} />
        </button>

        <button
          onClick={cycleSpeed}
          title="Playback speed"
          style={{
            background: "rgba(167,139,250,0.15)",
            border: "1px solid rgba(167,139,250,0.3)",
            borderRadius: 8,
            color: "#a78bfa",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            minWidth: 48,
          }}
        >
          {speed}x
        </button>

        {(isPlaying || isPaused) && (
          <button
            onClick={handleStop}
            title="Stop"
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", opacity: 0.7, fontSize: 12, fontWeight: 600 }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Transcript */}
      <div
        className="briefing-transcript"
        style={{
          background: "rgba(0,0,0,0.2)",
          borderRadius: 12,
          padding: 20,
          maxHeight: 320,
          overflowY: "auto",
          lineHeight: 1.8,
          fontSize: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 13, fontWeight: 600, opacity: 0.7 }}>
          <Clock size={14} /> Transcript
        </div>
        <div>
          {briefing.sentences.map((sentence, idx) => {
            const isActive = idx === currentSentenceIdx;
            const isPast = currentSentenceIdx >= 0 && idx < currentSentenceIdx;
            return (
              <span
                key={idx}
                ref={(el) => {
                  transcriptRefs.current[idx] = el;
                }}
                style={{
                  background: isActive ? "rgba(167,139,250,0.2)" : "transparent",
                  color: isActive ? "#a78bfa" : isPast ? "rgba(255,255,255,0.45)" : "inherit",
                  fontWeight: isActive ? 600 : 400,
                  borderRadius: 4,
                  padding: isActive ? "2px 4px" : "0 1px",
                  transition: "all 0.3s ease",
                }}
              >
                {sentence}{" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes wave-pulse {
          0% { transform: scaleY(0.7); }
          100% { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
}
