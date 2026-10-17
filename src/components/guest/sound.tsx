"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { play, type Performance } from "@/components/guest/sound-engine";
import { Icon } from "@/components/ui/icon";
import { musicLabel, type MusicId } from "@/data/worlds";

const KEY = "twh-sound";

type Sound = {
  on: boolean;
  /** On, but the browser is waiting for the guest's first touch before it allows sound. */
  blocked: boolean;
  track: MusicId;
  label: string | null;
  setTrack: (track: MusicId) => void;
  toggle: () => void;
};

const SoundContext = createContext<Sound | null>(null);

/**
 * One player for the whole guest visit. Music is on by default and every function has a piece chosen
 * for it. Browsers only allow sound after a person touches the page, so it starts on the first tap or
 * key press anywhere. A guest who mutes is remembered, and nothing plays for them after that.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(true);
  const [blocked, setBlocked] = useState(true);
  const [track, setTrackState] = useState<MusicId>("none");
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);
  const current = useRef<{ id: MusicId; performance: Performance } | null>(null);
  const wanted = useRef<MusicId>("none");
  const wantOn = useRef(true);

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

  /** The guest has touched the page: from here on the button mutes, whether or not the device plays. */
  const unlock = useCallback(() => {
    setBlocked(false);
    const audio = ensure();
    if (!audio) return;
    void audio.resume().catch(() => undefined);
    if (wantOn.current) start(wanted.current);
  }, [ensure, start]);

  // Try to play straight away; if the browser holds it, the first touch anywhere starts it.
  useEffect(() => {
    const muted = window.localStorage.getItem(KEY) === "off";
    wantOn.current = !muted;
    const timer = window.setTimeout(() => {
      if (muted) {
        setOn(false);
        return;
      }
      const audio = ensure();
      if (!audio) return;
      start(wanted.current);
      void audio.resume().then(() => {
        if (audio.state === "running") setBlocked(false);
      }).catch(() => undefined);
    }, 0);
    const onFirstTouch = (event: Event) => {
      // A first tap on the mute button itself should mute, not start the music.
      if (event.target instanceof Element && event.target.closest(".g-sound")) return;
      if (!wantOn.current) return;
      unlock();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, onFirstTouch, { capture: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, onFirstTouch, { capture: true }));
    };
  }, [ensure, start, unlock]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) void context.current?.suspend();
      else if (wantOn.current) void context.current?.resume();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  useEffect(() => () => {
    current.current?.performance.stop(0.1);
    void context.current?.close();
  }, []);

  const setTrack = useCallback((id: MusicId) => {
    wanted.current = id;
    setTrackState(id);
    if (wantOn.current) start(id);
  }, [start]);

  const toggle = useCallback(() => {
    if (on && blocked) {
      // The guest pressed play before touching anything else: let the music in.
      unlock();
      return;
    }
    if (on) {
      stop();
      setOn(false);
      wantOn.current = false;
      window.localStorage.setItem(KEY, "off");
      return;
    }
    setOn(true);
    wantOn.current = true;
    window.localStorage.setItem(KEY, "on");
    unlock();
  }, [on, blocked, unlock, stop]);

  return (
    <SoundContext.Provider value={{ on, blocked, track, label: musicLabel(track)?.label ?? null, setTrack, toggle }}>
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
  const waiting = sound.on && sound.blocked;
  return (
    <button
      type="button"
      className={inline ? "g-sound g-sound-inline" : "g-sound"}
      aria-pressed={sound.on}
      data-waiting={waiting}
      onClick={sound.toggle}
      title={info ? `${info.credit} ${sound.on ? "Tap to mute." : "Tap to play."}` : undefined}
      aria-label={waiting ? `Tap for music: ${info?.label}` : sound.on ? `Mute ${info?.label}` : `Play ${info?.label}`}
    >
      <span className="g-sound-icon" data-on={sound.on && !waiting}>
        <Icon name={sound.on ? "volume" : "mute"} size={18} />
        {sound.on && !waiting ? <span className="g-eq" aria-hidden="true"><i /><i /><i /></span> : null}
      </span>
      <span className="g-sound-text">
        <strong>{waiting ? "Tap for music" : sound.on ? "Music on" : "Music off"}</strong>
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
