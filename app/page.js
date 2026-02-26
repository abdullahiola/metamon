"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [mutations, setMutations] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState({ state: "idle", text: "Loading…" });
  const [showComplete, setShowComplete] = useState(false);
  const [error, setError] = useState(null);

  const [userInput, setUserInput] = useState("");
  const [isTransforming, setIsTransforming] = useState(false);
  const [isMorphed, setIsMorphed] = useState(false);
  const [isAutoEvolve, setIsAutoEvolve] = useState(false);
  const [dreamVision, setDreamVision] = useState(""); // what Metamon is dreaming of next

  const terminalBodyRef = useRef(null);
  const timerRef = useRef(null);
  const autoEvolveRunning = useRef(false); // mutex to prevent concurrent triggers

  // ── Load mutations ──
  const fetchMutations = useCallback(() => {
    fetch("/mutations.json?t=" + Date.now())
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (!data.length) return; // empty file, stay in fresh state
        setMutations(data);

        // Detect if already morphed
        const last = data[data.length - 1];
        if (last.label === 'final' && !last.code.includes('METAMON — The Self-Rewriting Program')) {
          setIsMorphed(true);
          setCurrentIndex(data.length - 1);
          setStatus({ state: "complete", text: "Metamorphosis complete" });
        } else {
          setStatus({ state: "idle", text: "Ready for metamorphosis" });
        }
        setError(null);
      })
      .catch(() => {
        // No mutations.json in production — that's fine, show fresh state
        setStatus({ state: "idle", text: "Ready for metamorphosis" });
        setError(null);
      });
  }, []);

  useEffect(() => {
    fetchMutations();
  }, [fetchMutations]);

  // ── Playback tick ──
  useEffect(() => {
    if (!isPlaying || mutations.length === 0) return;

    const isCurrentThought = mutations[currentIndex]?.isThought;

    // Thoughts display slowly so they're readable; code morphing is fast
    const baseDelay = isCurrentThought ? 1200 : 80;
    const delay = isCurrentThought ? baseDelay : Math.max(10, baseDelay / speed);

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= mutations.length - 1) {
          setIsPlaying(false);
          setShowComplete(true);
          setStatus({ state: "complete", text: "Transformation complete" });
          return mutations.length - 1;
        }
        return next;
      });
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [isPlaying, currentIndex, speed, mutations.length]);

  // ── Auto-scroll terminal ──
  useEffect(() => {
    if (terminalBodyRef.current && mutations[currentIndex]) {
      const code = mutations[currentIndex].code || "";
      const prevCode =
        currentIndex > 0 ? mutations[currentIndex - 1].code || "" : "";
      let diffStart = 0;
      while (
        diffStart < code.length &&
        diffStart < prevCode.length &&
        code[diffStart] === prevCode[diffStart]
      ) {
        diffStart++;
      }
      const scrollRatio = diffStart / Math.max(1, code.length);
      terminalBodyRef.current.scrollTop =
        terminalBodyRef.current.scrollHeight * scrollRatio;
    }
  }, [currentIndex, mutations]);

  // ── Render helpers ──
  const currentMutation = mutations[currentIndex];
  const prevMutation = currentIndex > 0 ? mutations[currentIndex - 1] : null;

  const renderCode = useCallback(() => {
    if (!currentMutation) return null;

    const code = currentMutation.code || "";
    const prevCode = prevMutation ? prevMutation.code || "" : "";
    const isThought = currentMutation.isThought;

    if (isThought) {
      return <span className={styles.thoughtText}>{code}</span>;
    }

    let diffStart = 0;
    while (
      diffStart < code.length &&
      diffStart < prevCode.length &&
      code[diffStart] === prevCode[diffStart]
    ) {
      diffStart++;
    }

    const highlightRange = 20;
    const highlightStart = Math.max(0, diffStart - highlightRange);

    const parts = [];
    let i = 0;

    // Before highlight
    if (highlightStart > 0) {
      parts.push(
        <span key="before">{code.slice(0, highlightStart)}</span>
      );
      i = highlightStart;
    }

    // Highlighted chars
    if (currentIndex > 0 && i <= diffStart) {
      parts.push(
        <span key="highlight" className={styles.charNew}>
          {code.slice(i, diffStart + 1)}
        </span>
      );
      i = diffStart + 1;
    }

    // After highlight
    if (i < code.length) {
      parts.push(<span key="after">{code.slice(i)}</span>);
    }

    return parts;
  }, [currentMutation, prevMutation, currentIndex]);

  const getProgress = () => {
    if (!currentMutation) return 0;
    return (
      currentMutation.progress ??
      Math.floor((currentIndex / Math.max(1, mutations.length - 1)) * 100)
    );
  };

  const currentRationale = currentMutation?.rationale || "";
  const allRationales = mutations
    .slice(0, currentIndex + 1)
    .filter(m => m.rationale)
    .map(m => m.rationale)
    .filter((v, i, a) => a.indexOf(v) === i); // Unique rationale steps seen so far

  const getTotalStep = () => {
    if (!mutations.length) return 0;
    return mutations[mutations.length - 1].step ?? mutations.length - 1;
  };

  // ── Controls ──
  const play = () => {
    if (currentIndex >= mutations.length - 1) {
      setCurrentIndex(0);
      setShowComplete(false);
    }
    setIsPlaying(true);
    setStatus({ state: "transforming", text: "Transforming…" });
  };

  const pause = () => {
    setIsPlaying(false);
    clearTimeout(timerRef.current);
    setStatus({ state: "idle", text: "Paused" });
  };

  const reset = () => {
    setIsPlaying(false);
    clearTimeout(timerRef.current);
    setCurrentIndex(0);
    setShowComplete(false);
    setStatus({ state: "idle", text: "Ready to replay" });
  };

  const speedLabels = {
    0.5: "0.5x",
    1: "1x",
    2: "2x",
    4: "4x",
    8: "8x",
  };

  const initiateMetamorphosis = async (manualPrompt) => {
    const promptToUse = manualPrompt || userInput;
    if (!promptToUse.trim()) return;

    setIsTransforming(true);
    setStatus({ state: "transforming", text: "Transcending..." });

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToUse }),
      });

      if (!res.ok) throw new Error("Transformation failed");

      const data = await res.json();

      // Use mutations returned directly from API — works in production without filesystem
      if (data.mutations && data.mutations.length) {
        setMutations(data.mutations);
      } else {
        // Fallback: try to fetch from disk (dev only)
        fetchMutations();
      }

      setCurrentIndex(0);
      setShowComplete(false);
      setIsPlaying(true);
      if (!manualPrompt) setUserInput("");
      setStatus({ state: "transforming", text: "Metamorphosing…" });
    } catch (err) {
      console.error(err);
      setStatus({ state: "idle", text: "Connection severed" });
      setIsAutoEvolve(false);
    } finally {
      setIsTransforming(false);
    }
  };

  // ── Auto-Evolution Loop ──
  useEffect(() => {
    // Only trigger when: auto mode on, animation done, not already running a loop iteration
    if (!isAutoEvolve || isPlaying || isTransforming) return;
    if (status.state !== "complete") return;
    if (autoEvolveRunning.current) return; // mutex guard

    autoEvolveRunning.current = true;

    const triggerNext = async () => {
      try {
        setStatus({ state: "idle", text: "Dreaming of next form…" });

        // Show dream pause — let user see the completed state
        await new Promise(r => setTimeout(r, 4000));
        if (!isAutoEvolve) return;

        // Fetch a new vision from the AI
        setStatus({ state: "idle", text: "Asking itself a question…" });
        const res = await fetch("/api/suggest");
        const data = await res.json();

        if (!data.vision || !isAutoEvolve) return;

        // Show what Metamon is dreaming of for 2s before acting
        setDreamVision(data.vision);
        await new Promise(r => setTimeout(r, 2500));
        if (!isAutoEvolve) return;

        setDreamVision("");
        await initiateMetamorphosis(data.vision);
      } catch (e) {
        console.error("Auto-evolve error:", e);
        setIsAutoEvolve(false);
      } finally {
        autoEvolveRunning.current = false;
      }
    };

    triggerNext();
  }, [isAutoEvolve, isPlaying, isTransforming, status.state]);

  return (
    <>
      {/* Floating orbs */}
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.logo}>METAMON</h1>
          <p className={styles.logoJp}>メタモン</p>
          <p className={styles.tagline}>
            A self-modifying AI entity.
            <br />
            Provide a vision — Metamon shall rewrite its soul to achieve it.
            <br />
            <span style={{ color: 'var(--accent-pink)', fontSize: '0.8rem' }}>⚠ Transformation is permanent.</span>
          </p>
          <div className={styles.autoControl}>
            <button
              className={`${styles.btnAuto} ${isAutoEvolve ? styles.btnAutoActive : ""}`}
              onClick={() => setIsAutoEvolve(!isAutoEvolve)}
            >
              {isAutoEvolve ? "AUTONOMOUS MODE: ON" : "AUTONOMOUS MODE: OFF"}
            </button>
            {isAutoEvolve && <span className={styles.autoPulse} />}
          </div>
        </header>

        {/* Status Badge */}
        <div className={styles.statusBadge}>
          <span
            className={`${styles.statusDot} ${status.state === "transforming"
              ? styles.statusDotTransforming
              : status.state === "complete"
                ? styles.statusDotComplete
                : styles.statusDotIdle
              }`}
          />
          <span>{status.text}</span>
        </div>

        {/* Terminal */}
        <div
          className={`${styles.terminal} ${isPlaying ? styles.terminalActive : ""
            }`}
        >
          <div className={styles.terminalBar}>
            <span className={`${styles.terminalDot} ${styles.dotRed}`} />
            <span className={`${styles.terminalDot} ${styles.dotYellow}`} />
            <span className={`${styles.terminalDot} ${styles.dotGreen}`} />
            <span className={styles.terminalTitle}>metamon.js</span>
          </div>
          <div className={styles.terminalBody} ref={terminalBodyRef}>
            {error ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>メタモン</div>
                <p>{error}</p>
              </div>
            ) : (
              <>
                <pre className={styles.codeContent}>{renderCode()}</pre>
                {isPlaying && <span className={styles.cursor} />}
              </>
            )}
          </div>
        </div>

        {/* Dream Vision Banner */}
        {dreamVision && (
          <div className={styles.dreamBanner}>
            <span className={styles.rationalePulse} />
            <span className={styles.dreamLabel}>METAMON ASKS ITSELF:</span>
            <span className={styles.dreamText}>&ldquo;{dreamVision}&rdquo;</span>
          </div>
        )}

        {/* Neural Rationale */}
        {(isPlaying || isMorphed) && allRationales.length > 0 && (
          <div className={styles.rationaleBox}>
            <div className={styles.rationaleHeader}>
              <span className={styles.rationalePulse} />
              NEURAL RATIONALE
            </div>
            <div className={styles.rationaleStream}>
              {allRationales.map((r, idx) => (
                <div
                  key={idx}
                  className={`${styles.rationaleStep} ${idx === allRationales.length - 1 ? styles.rationaleStepActive : ""
                    }`}
                >
                  <span className={styles.rationaleIndex}>[{idx}]</span> {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <span>
              Step {currentMutation?.step ?? currentIndex} / {getTotalStep()}
            </span>
            <span>{getProgress()}%</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${isPlaying ? styles.progressFillActive : ""
                }`}
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Input Section — always visible unless auto-evolve is running */}
        <section className={styles.inputSection}>
          <h2><span className={styles.emptyIcon} style={{ fontSize: '1.2rem', animation: 'none' }}>⟡</span> Divine Metamorphosis</h2>
          <p>{isAutoEvolve ? "Autonomous mode is active. Metamon evolves on its own." : "What should Metamon become? Describe your vision below."}</p>
          {!isAutoEvolve && (
            <>
              <textarea
                className={styles.codeTextArea}
                placeholder="e.g. A digital clock, The Matrix, A greeting..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isTransforming || isPlaying}
              />
              <button
                className={styles.btnInitiate}
                onClick={() => initiateMetamorphosis()}
                disabled={!userInput.trim() || isTransforming || isPlaying}
              >
                {isTransforming ? <><span className={styles.loader}></span> Transmitting...</> : "Initiate Metamorphosis"}
              </button>
            </>
          )}
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>metamon — the self-rewriting program</p>
        </footer>
      </div>
    </>
  );
}
