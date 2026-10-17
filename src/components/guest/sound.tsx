"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { play, type Performance } from "@/components/guest/sound-engine";
import { Icon } from "@/components/ui/icon";
import { musicLabel, type MusicId } from "@/data/worlds";

const KEY = "twh-sound";

type Sound = {
  on: boolean;
  track: MusicId;
  label: string | null;
  setTrack: (track: MusicId) => void;
  toggle: () => void;
};

const SoundContext = createContext<Sound | null>(null);

/**
 * One player for the whole guest visit. It starts silent, as the PRD asks. Once a guest turns the
 * sound on, the choice is remembered and each function page plays its own piece, crossfading.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [track, setTrackState] = useState<MusicId>("none");
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const current = useRef<{ id: MusicId; performance: Performance } | null>(null);
  const wanted = useRef<MusicId>("none");

  const ensure = useCallback(() => {
    if (!context.current) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return null;
      context.current = new Context();
      master.current = context.current.createGain();
      master.current.gain.value = 0.9;
      master.current.connect(context.current.destination);
    }
    return context.current;
  }, []);

  const start = useCallback((id: MusicId) => {
    const audio = ensure();
    if (!audio || !master.current) return;
    if (current.current?.id === id) return;
    current.current?.performance.stop(1.2);
    current.current = id === "none" ? null : { id, performance: play(id, audio, master.current) };
  }, [ensure]);

  const stop = useCallback(() => {
    current.current?.performance.stop(0.5);
    current.current = null;
  }, []);

  // A returning guest who left the sound on: start on their first touch, which browsers require.
  useEffect(() => {
    if (window.localStorage.getItem(KEY) !== "on") return;
    const resume = () => {
      const audio = ensure();
      void audio?.resume();
      setOn(true);
      start(wanted.current);
    };
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [ensure, start]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) void context.current?.suspend();
      else if (on) void context.current?.resume();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [on]);

  useEffect(() => () => {
    current.current?.performance.stop(0.1);
    void context.current?.close();
  }, []);

  const setTrack = useCallback((id: MusicId) => {
    wanted.current = id;
    setTrackState(id);
    if (on) start(id);
  }, [on, start]);

  const toggle = useCallback(() => {
    if (on) {
      stop();
      setOn(false);
      window.localStorage.setItem(KEY, "off");
      return;
    }
    const audio = ensure();
    void audio?.resume();
    setOn(true);
    window.localStorage.setItem(KEY, "on");
    start(wanted.current);
  }, [on, ensure, start, stop]);

  return (
    <SoundContext.Provider value={{ on, track, label: musicLabel(track)?.label ?? null, setTrack, toggle }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  return useContext(SoundContext);
}

/** Put on a page to choose its music. Leaving the page hands the player to the next one. */
export function Soundtrack({ music }: { music: MusicId }) {
  const sound = useSound();
  const setTrack = sound?.setTrack;
  useEffect(() => {
    setTrack?.(music);
  }, [music, setTrack]);
  return null;
}

export function SoundToggle({ inline = false }: { inline?: boolean }) {
  const sound = useSound();
  if (!sound || sound.track === "none") return null;
  const info = musicLabel(sound.track);
  return (
    <button type="button" className={inline ? "g-sound g-sound-inline" : "g-sound"} aria-pressed={sound.on} onClick={sound.toggle} title={info?.credit}>
      <span className="g-sound-icon" data-on={sound.on}>
        <Icon name={sound.on ? "volume" : "mute"} size={18} />
        {sound.on ? <span className="g-eq" aria-hidden="true"><i /><i /><i /></span> : null}
      </span>
      <span className="g-sound-text">
        <strong>{sound.on ? "Sound on" : "Play music"}</strong>
        <small>{info?.label}</small>
      </span>
    </button>
  );
}

/** For the Admin's theme studio: hear one piece without a provider. */
export function MusicPreview({ music }: { music: MusicId }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<{ context: AudioContext; performance: Performance } | null>(null);
  useEffect(() => () => {
    ref.current?.performance.stop(0.1);
    void ref.current?.context.close();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const context = new AudioContext();
    const performance = play(music, context, context.destination);
    ref.current = { context, performance };
    const timer = window.setTimeout(() => setPlaying(false), 14_000);
    return () => {
      window.clearTimeout(timer);
      performance.stop(0.3);
      window.setTimeout(() => void context.close(), 500);
      ref.current = null;
    };
  }, [playing, music]);
  if (music === "none") return null;
  return (
    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setPlaying((value) => !value)} aria-pressed={playing}>
      <Icon name={playing ? "mute" : "play"} size={15} />
      <span>{playing ? "Stop" : "Listen"}</span>
    </button>
  );
}
