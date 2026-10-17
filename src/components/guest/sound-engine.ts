import type { MusicId } from "@/data/worlds";

/**
 * Original Indian phrases, synthesised in the browser. Nothing is downloaded, so every note is
 * rights-cleared and the page stays light on a phone. Ratios are just intonation from Sa.
 */

const RATIO: Record<string, number> = {
  S: 1,
  r: 16 / 15,
  R: 9 / 8,
  g: 6 / 5,
  G: 5 / 4,
  M: 4 / 3,
  m: 45 / 32,
  P: 3 / 2,
  d: 8 / 5,
  D: 5 / 3,
  n: 9 / 5,
  N: 15 / 8,
};

/** "S", "R'", "N," … with ' an octave up and , an octave down. "-" is a rest. */
function frequency(sa: number, note: string) {
  const base = RATIO[note[0]];
  if (!base) return null;
  const up = (note.match(/'/g) ?? []).length;
  const down = (note.match(/,/g) ?? []).length;
  return sa * base * 2 ** (up - down);
}

type Voice = "shehnai" | "nadaswaram" | "flute" | "sitar" | "santoor" | "tumbi";
type Stroke = "dhol" | "dholTa" | "dha" | "na" | "tin" | "ge" | "ghungroo" | "chimta" | "bell" | "-";

type Piece = {
  sa: number;
  bpm: number;
  voice: Voice | null;
  /** [note, beats] pairs, looped. */
  melody: [string, number][];
  /** One stroke per subdivision, looped. */
  rhythm: Stroke[];
  subdivision: number;
  drone: "tanpura" | "shruti" | null;
  gain: number;
};

const PIECES: Record<Exclude<MusicId, "none">, Piece> = {
  "bilawal-dhol": {
    sa: 233.08,
    bpm: 112,
    voice: "flute",
    melody: [["S", 1], ["R", 0.5], ["G", 0.5], ["P", 1], ["G", 1], ["R", 0.5], ["G", 0.5], ["R", 0.5], ["S", 0.5], ["S", 2], ["G", 0.5], ["P", 0.5], ["D", 1], ["P", 1], ["G", 0.5], ["R", 0.5], ["G", 1], ["R", 1], ["S", 2]],
    rhythm: ["dhol", "-", "dholTa", "dhol", "-", "dhol", "dholTa", "-"],
    subdivision: 2,
    drone: "shruti",
    gain: 0.5,
  },
  "bhimpalasi-dadra": {
    sa: 196,
    bpm: 84,
    voice: "santoor",
    melody: [["n,", 1], ["S", 1], ["g", 1], ["M", 2], ["P", 1], ["n", 1.5], ["D", 0.5], ["P", 1], ["M", 1], ["g", 1], ["R", 1], ["S", 3]],
    rhythm: ["dha", "tin", "na", "dha", "tin", "na"],
    subdivision: 1,
    drone: "tanpura",
    gain: 0.55,
  },
  "yaman-teental": {
    sa: 220,
    bpm: 128,
    voice: "sitar",
    melody: [["N,", 0.5], ["R", 0.5], ["G", 0.5], ["m", 0.5], ["P", 1], ["m", 0.5], ["G", 0.5], ["m", 0.5], ["D", 0.5], ["N", 1], ["S'", 1], ["N", 0.5], ["D", 0.5], ["P", 1], ["m", 0.5], ["G", 0.5], ["R", 1], ["S", 2]],
    rhythm: ["dha", "ge", "na", "dha", "dha", "ge", "na", "tin"],
    subdivision: 2,
    drone: "tanpura",
    gain: 0.55,
  },
  "shankarabharanam-nadaswaram": {
    sa: 233.08,
    bpm: 66,
    voice: "nadaswaram",
    melody: [["S", 2], ["R", 1], ["G", 1], ["M", 1], ["P", 2], ["D", 1], ["N", 1], ["S'", 3], ["N", 1], ["D", 1], ["P", 2], ["M", 1], ["G", 1], ["R", 1], ["S", 3]],
    rhythm: ["bell", "-", "-", "-", "ge", "-", "-", "-"],
    subdivision: 1,
    drone: "shruti",
    gain: 0.45,
  },
  tanpura: {
    sa: 130.81,
    bpm: 60,
    voice: null,
    melody: [],
    rhythm: ["-"],
    subdivision: 1,
    drone: "tanpura",
    gain: 0.75,
  },
  "bhairavi-shehnai": {
    sa: 233.08,
    bpm: 72,
    voice: "shehnai",
    melody: [["S", 1.5], ["r", 0.5], ["g", 1], ["M", 1], ["P", 2], ["d", 1], ["P", 1], ["M", 1], ["g", 1], ["r", 1], ["S", 3], ["-", 1]],
    rhythm: ["dha", "-", "na", "-", "tin", "-", "na", "-"],
    subdivision: 2,
    drone: "shruti",
    gain: 0.45,
  },
  "des-sitar": {
    sa: 207.65,
    bpm: 92,
    voice: "sitar",
    melody: [["R", 1], ["M", 1], ["P", 1], ["N", 1], ["S'", 2], ["n", 1], ["D", 1], ["P", 1], ["M", 1], ["G", 1], ["R", 1], ["G", 1], ["S", 3]],
    rhythm: ["dha", "-", "tin", "-", "na", "-", "dha", "-"],
    subdivision: 2,
    drone: "tanpura",
    gain: 0.55,
  },
  "kafi-santoor": {
    sa: 220,
    bpm: 96,
    voice: "santoor",
    melody: [["S", 0.5], ["R", 0.5], ["g", 0.5], ["M", 0.5], ["P", 1], ["D", 0.5], ["n", 0.5], ["S'", 1], ["n", 0.5], ["D", 0.5], ["P", 1], ["M", 0.5], ["g", 0.5], ["R", 1], ["S", 2]],
    rhythm: ["-"],
    subdivision: 1,
    drone: "tanpura",
    gain: 0.55,
  },
  "dhol-bhangra": {
    sa: 261.63,
    bpm: 148,
    voice: "tumbi",
    melody: [["S'", 0.5], ["S'", 0.5], ["P", 0.5], ["S'", 0.5], ["R'", 0.5], ["S'", 0.5], ["P", 1], ["G", 0.5], ["P", 0.5], ["G", 0.5], ["R", 0.5], ["S", 2]],
    rhythm: ["dhol", "-", "dholTa", "dhol", "chimta", "dhol", "dholTa", "chimta"],
    subdivision: 2,
    drone: null,
    gain: 0.5,
  },
};

export type Performance = { stop: (fade?: number) => void };

let noiseBuffer: AudioBuffer | null = null;

function noise(context: AudioContext) {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

export function play(musicId: MusicId, context: AudioContext, destination: AudioNode): Performance {
  if (musicId === "none") return { stop: () => undefined };
  const piece = PIECES[musicId];
  const out = context.createGain();
  out.gain.setValueAtTime(0.0001, context.currentTime);
  out.gain.exponentialRampToValueAtTime(piece.gain, context.currentTime + 1.2);
  // A short room so the synth sits in a space rather than in the speaker.
  const delay = context.createDelay(1);
  delay.delayTime.value = 0.23;
  const feedback = context.createGain();
  feedback.gain.value = 0.22;
  const wet = context.createGain();
  wet.gain.value = 0.22;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  out.connect(tone);
  tone.connect(destination);
  tone.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(destination);

  const live = new Set<AudioScheduledSourceNode>();
  const track = (node: AudioScheduledSourceNode) => {
    live.add(node);
    node.onended = () => live.delete(node);
    return node;
  };

  function env(time: number, peak: number, attack: number, decay: number) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    gain.connect(out);
    return gain;
  }

  function osc(type: OscillatorType, hz: number, time: number, length: number, into: AudioNode) {
    const node = context.createOscillator();
    node.type = type;
    node.frequency.setValueAtTime(hz, time);
    node.connect(into);
    node.start(time);
    node.stop(time + length + 0.05);
    return track(node) as OscillatorNode;
  }

  function burst(time: number, length: number, filterType: BiquadFilterType, hz: number, q: number, peak: number) {
    const source = context.createBufferSource();
    source.buffer = noise(context);
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = hz;
    filter.Q.value = q;
    source.connect(filter);
    filter.connect(env(time, peak, 0.002, length));
    source.start(time, Math.random() * 0.5);
    source.stop(time + length + 0.05);
    track(source);
  }

  /* --- melodic voices --- */

  function reed(time: number, hz: number, length: number, from: number | null, bright: number, peak: number) {
    const body = context.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = bright;
    body.Q.value = 1.4;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(peak, time + 0.08);
    amp.gain.setValueAtTime(peak, time + Math.max(0.1, length - 0.12));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
    body.connect(amp);
    amp.connect(out);
    const vibrato = context.createOscillator();
    vibrato.frequency.value = 5.2;
    const depth = context.createGain();
    depth.gain.value = hz * 0.012;
    vibrato.connect(depth);
    vibrato.start(time + Math.min(0.25, length / 2));
    vibrato.stop(time + length + 0.05);
    track(vibrato);
    for (const [type, mult, level] of [["sawtooth", 1, 0.6], ["square", 1.002, 0.25]] as const) {
      const node = context.createOscillator();
      node.type = type;
      // Meend: glide in from the previous swara.
      node.frequency.setValueAtTime((from ?? hz) * mult, time);
      node.frequency.exponentialRampToValueAtTime(hz * mult, time + (from ? Math.min(0.18, length / 3) : 0.01));
      depth.connect(node.frequency);
      const level_ = context.createGain();
      level_.gain.value = level;
      node.connect(level_);
      level_.connect(body);
      node.start(time);
      node.stop(time + length + 0.05);
      track(node);
    }
  }

  function flute(time: number, hz: number, length: number) {
    const amp = env(time, 0.16, 0.06, length);
    const node = osc("sine", hz, time, length, amp);
    const lfo = context.createOscillator();
    lfo.frequency.value = 5;
    const depth = context.createGain();
    depth.gain.value = hz * 0.008;
    lfo.connect(depth);
    depth.connect(node.frequency);
    lfo.start(time);
    lfo.stop(time + length + 0.05);
    track(lfo);
    burst(time, 0.05, "bandpass", hz * 3, 3, 0.03);
    osc("triangle", hz * 2, time, length, env(time, 0.025, 0.06, length));
  }

  function pluck(time: number, hz: number, bright: boolean, length: number, peak: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(bright ? 5200 : 2400, time);
    filter.frequency.exponentialRampToValueAtTime(bright ? 900 : 500, time + length);
    filter.Q.value = bright ? 6 : 2;
    filter.connect(env(time, peak, 0.004, length));
    osc("sawtooth", hz, time, length, filter);
    osc("sawtooth", hz * 1.003, time, length, filter);
  }

  function santoor(time: number, hz: number, beats: number, beat: number) {
    // Hammered strings repeat while a note is held.
    const strikes = Math.max(1, Math.round(beats * 2));
    for (let index = 0; index < strikes; index += 1) {
      const at = time + (index * beats * beat) / strikes;
      const peak = index === 0 ? 0.14 : 0.07;
      osc("sine", hz, at, 0.9, env(at, peak, 0.003, 0.9));
      osc("sine", hz * 2.01, at, 0.4, env(at, peak * 0.35, 0.002, 0.4));
      osc("triangle", hz * 3, at, 0.15, env(at, peak * 0.15, 0.002, 0.15));
    }
  }

  function melodyNote(time: number, note: string, previous: string | null, beats: number, beat: number) {
    const hz = frequency(piece.sa, note);
    if (!hz || !piece.voice) return;
    const length = beats * beat;
    const from = previous ? frequency(piece.sa, previous) : null;
    if (piece.voice === "shehnai") reed(time, hz * 2, length * 0.98, from ? from * 2 : null, 1500, 0.11);
    else if (piece.voice === "nadaswaram") reed(time, hz * 2, length * 0.98, from ? from * 2 : null, 1100, 0.12);
    else if (piece.voice === "flute") flute(time, hz * 2, length * 0.95);
    else if (piece.voice === "sitar") {
      pluck(time, hz * 2, true, Math.min(1.6, length + 0.6), 0.16);
      osc("sine", hz * 4, time, 0.3, env(time, 0.02, 0.003, 0.3));
    } else if (piece.voice === "santoor") santoor(time, hz * 2, beats, beat);
    else if (piece.voice === "tumbi") pluck(time, hz * 2, true, Math.min(0.5, length + 0.2), 0.18);
  }

  /* --- percussion --- */

  function stroke(time: number, kind: Stroke) {
    if (kind === "-") return;
    if (kind === "dhol" || kind === "ge") {
      const node = osc("sine", kind === "dhol" ? 110 : 95, time, 0.4, env(time, kind === "dhol" ? 0.55 : 0.32, 0.003, kind === "dhol" ? 0.35 : 0.45));
      node.frequency.exponentialRampToValueAtTime(48, time + 0.25);
      burst(time, 0.04, "lowpass", 400, 1, kind === "dhol" ? 0.2 : 0.08);
    } else if (kind === "dholTa") {
      burst(time, 0.07, "bandpass", 1800, 2, 0.28);
      osc("sine", 420, time, 0.08, env(time, 0.12, 0.002, 0.08));
    } else if (kind === "dha" || kind === "na" || kind === "tin") {
      const pitch = kind === "tin" ? 520 : 440;
      const ring = osc("sine", pitch, time, 0.5, env(time, kind === "na" ? 0.16 : 0.2, 0.002, kind === "na" ? 0.22 : 0.45));
      ring.frequency.setValueAtTime(pitch * 1.03, time);
      ring.frequency.exponentialRampToValueAtTime(pitch, time + 0.05);
      burst(time, 0.02, "highpass", 3000, 1, 0.06);
      if (kind === "dha") {
        const bayan = osc("sine", 120, time, 0.4, env(time, 0.28, 0.003, 0.35));
        bayan.frequency.exponentialRampToValueAtTime(70, time + 0.3);
      }
    } else if (kind === "ghungroo") {
      for (let index = 0; index < 3; index += 1) burst(time + index * 0.018, 0.05, "highpass", 6500, 1, 0.05);
    } else if (kind === "chimta") {
      burst(time, 0.09, "bandpass", 5200, 6, 0.12);
      osc("sine", 3100, time, 0.12, env(time, 0.03, 0.002, 0.12));
    } else if (kind === "bell") {
      for (const [mult, level, decay] of [[1, 0.09, 3.5], [2.76, 0.05, 2.2], [5.4, 0.025, 1.2], [8.9, 0.012, 0.8]] as const) {
        osc("sine", 523.25 * mult, time, decay, env(time, level, 0.003, decay));
      }
    }
  }

  function tanpuraString(time: number, hz: number, peak: number) {
    // A long buzzing pluck: jawari is the shimmer of upper partials blooming after the attack.
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.linearRampToValueAtTime(2600, time + 0.9);
    filter.frequency.linearRampToValueAtTime(900, time + 3.5);
    filter.connect(env(time, peak, 0.02, 3.6));
    osc("sawtooth", hz, time, 3.8, filter);
    osc("sawtooth", hz * 1.0015, time, 3.8, filter);
  }

  /* --- the scheduler --- */

  const beat = 60 / piece.bpm;
  const cycleBeats = piece.melody.reduce((sum, [, beats]) => sum + beats, 0) || 8;
  let melodyIndex = 0;
  let melodyAt = context.currentTime + 0.15;
  let previous: string | null = null;
  let strokeIndex = 0;
  let strokeAt = context.currentTime + 0.15;
  const droneSa = piece.sa / 2;
  const droneNotes = [droneSa * 1.5, droneSa * 2, droneSa * 2, droneSa];
  let droneIndex = 0;
  let droneAt = context.currentTime + 0.05;
  let rest = 0;

  function schedule() {
    const horizon = context.currentTime + 0.35;
    if (piece.voice && piece.melody.length) {
      while (melodyAt < horizon) {
        if (rest > 0) {
          melodyAt += rest;
          rest = 0;
          continue;
        }
        const [note, beats] = piece.melody[melodyIndex];
        if (note !== "-") melodyNote(melodyAt, note, previous, beats, beat);
        previous = note === "-" ? null : note;
        melodyAt += beats * beat;
        melodyIndex = (melodyIndex + 1) % piece.melody.length;
        // Breathe for a bar between phrases.
        if (melodyIndex === 0) rest = beat * (cycleBeats > 12 ? 2 : 4);
      }
    }
    if (piece.rhythm.length > 1 || piece.rhythm[0] !== "-") {
      const step = beat / piece.subdivision;
      while (strokeAt < horizon) {
        stroke(strokeAt, piece.rhythm[strokeIndex]);
        if (musicId === "yaman-teental" && strokeIndex % 2 === 0) stroke(strokeAt, "ghungroo");
        strokeAt += step;
        strokeIndex = (strokeIndex + 1) % piece.rhythm.length;
      }
    }
    if (piece.drone === "tanpura") {
      while (droneAt < horizon) {
        tanpuraString(droneAt, droneNotes[droneIndex], droneIndex === 3 ? 0.07 : 0.05);
        droneAt += droneIndex === 3 ? 1.6 : 0.8;
        droneIndex = (droneIndex + 1) % droneNotes.length;
      }
    } else if (piece.drone === "shruti") {
      while (droneAt < horizon) {
        const amp = env(droneAt, 0.035, 1.2, 6.6);
        osc("sawtooth", droneSa, droneAt, 8, (() => {
          const filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 600;
          filter.connect(amp);
          return filter;
        })());
        osc("sine", droneSa * 1.5, droneAt, 8, env(droneAt, 0.02, 1.2, 6.6));
        droneAt += 7.5;
      }
    }
  }

  schedule();
  const timer = window.setInterval(schedule, 120);

  return {
    stop(fade = 0.8) {
      window.clearInterval(timer);
      const now = context.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      window.setTimeout(() => {
        live.forEach((node) => {
          try {
            node.stop();
          } catch {
            // Already stopped.
          }
        });
        live.clear();
        out.disconnect();
        wet.disconnect();
      }, (fade + 0.1) * 1000);
    },
  };
}
