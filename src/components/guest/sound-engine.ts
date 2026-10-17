import type { MusicId } from "@/data/worlds";

/**
 * Original phrases in the ragas and rhythms that fill Indian weddings, north and south, synthesised
 * in the browser. Nothing is downloaded, so every note is rights-cleared and the page stays light on
 * a phone. Ratios are just intonation from Sa. No piece copies a known song.
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

type Voice = "shehnai" | "nadaswaram" | "flute" | "sitar" | "santoor" | "tumbi" | "sarangi" | "harmonium" | "veena";

type Stroke =
  | "dhol" | "dholTa"
  | "dha" | "na" | "tin" | "ge" | "ka"
  | "dhe" | "ta"
  | "thom" | "nam" | "dhin" | "ki"
  | "valam" | "thoppi"
  | "ghungroo" | "chimta" | "manjira" | "dandiya" | "taali" | "bell"
  | "-";

type Step = Stroke | Stroke[];

type Piece = {
  sa: number;
  bpm: number;
  voice: Voice | null;
  /** [note, beats] pairs, looped. */
  melody: [string, number][];
  /** Strokes per subdivision, looped. A step can hold several strokes. */
  rhythm: Step[];
  subdivision: number;
  drone: "tanpura" | "shruti" | null;
  /** Something that sounds once every few cycles of the melody. */
  accent?: { every: number; sound: "shankh" | "bell" };
  /** Rest after each melodic cycle, in beats. */
  breath?: number;
  gain: number;
};

const keherwaTabla: Step[] = ["dha", "ge", "na", "tin", "na", "ka", "dha", "na"];
const keherwaDholak: Step[] = ["dhe", "-", "ta", "dhe", "-", "dhe", "ta", "-"];
const dadraTabla: Step[] = ["dha", "tin", "na", "dha", "tin", "na"];
const dadraDholak: Step[] = [["dhe", "manjira"], "ta", "ta", "dhe", "ta", "-"];
const adiMridangam: Step[] = ["thom", "nam", "dhin", "nam", "thom", "ki", "nam", "dhin"];

const PIECES: Record<Exclude<MusicId, "none">, Piece> = {
  /* ---- North ---- */
  "bhairavi-shehnai": {
    sa: 233.08, bpm: 72, voice: "shehnai", subdivision: 2, drone: "shruti", gain: 0.45, breath: 2,
    melody: [["S", 1.5], ["r", 0.5], ["g", 1], ["M", 1], ["P", 2], ["d", 1], ["P", 1], ["M", 1], ["g", 1], ["r", 1], ["S", 3]],
    rhythm: keherwaDholak,
  },
  "yaman-shehnai-baraat": {
    sa: 233.08, bpm: 112, voice: "shehnai", subdivision: 2, drone: "shruti", gain: 0.45, breath: 1,
    melody: [["N,", 0.5], ["R", 0.5], ["G", 1], ["m", 1], ["D", 1], ["N", 1], ["S'", 2], ["N", 0.5], ["D", 0.5], ["P", 1], ["m", 1], ["G", 1], ["R", 1], ["S", 2]],
    rhythm: [["dhol", "manjira"], "-", "dholTa", "dhol", "-", "dhol", "dholTa", "dholTa"],
  },
  "phera-shankh": {
    sa: 220, bpm: 60, voice: "shehnai", subdivision: 1, drone: "shruti", gain: 0.55, breath: 2, accent: { every: 2, sound: "shankh" },
    melody: [["S", 2], ["r", 1], ["g", 1], ["M", 2], ["P", 2], ["d", 1], ["P", 1], ["g", 1], ["r", 1], ["S", 4]],
    rhythm: [["manjira", "bell"], "-", "manjira", "-", "manjira", "-", "manjira", "-"],
  },
  "dholak-boliyan": {
    sa: 261.63, bpm: 132, voice: "harmonium", subdivision: 2, drone: null, gain: 0.45, breath: 1,
    melody: [["G", 0.5], ["M", 0.5], ["P", 1], ["D", 0.5], ["P", 0.5], ["M", 0.5], ["G", 0.5], ["R", 1], ["S", 1], ["G", 0.5], ["M", 0.5], ["P", 0.5], ["D", 0.5], ["n", 1], ["D", 0.5], ["P", 0.5], ["M", 1], ["G", 2]],
    rhythm: [["dhe", "taali"], "ta", "-", ["ta", "chimta"], ["dhe", "taali"], "dhe", "ta", "chimta"],
  },
  "bilawal-dhol": {
    sa: 233.08, bpm: 112, voice: "flute", subdivision: 2, drone: "shruti", gain: 0.5, breath: 2,
    melody: [["S", 1], ["R", 0.5], ["G", 0.5], ["P", 1], ["G", 1], ["R", 0.5], ["G", 0.5], ["R", 0.5], ["S", 0.5], ["S", 2], ["G", 0.5], ["P", 0.5], ["D", 1], ["P", 1], ["G", 0.5], ["R", 0.5], ["G", 1], ["R", 1], ["S", 2]],
    rhythm: ["dhol", "-", "dholTa", "dhol", "-", "dhol", "dholTa", "-"],
  },
  "ghoomar-mand": {
    sa: 220, bpm: 88, voice: "sarangi", subdivision: 1, drone: "tanpura", gain: 0.5, breath: 2,
    melody: [["S", 1], ["G", 1], ["M", 0.5], ["G", 0.5], ["R", 1], ["S", 1], ["N,", 1], ["S", 2], ["G", 1], ["P", 1], ["D", 0.5], ["P", 0.5], ["M", 1], ["G", 1], ["R", 1], ["S", 3]],
    rhythm: dadraDholak,
  },
  "bhimpalasi-dadra": {
    sa: 196, bpm: 84, voice: "santoor", subdivision: 1, drone: "tanpura", gain: 0.55, breath: 2,
    melody: [["n,", 1], ["S", 1], ["g", 1], ["M", 2], ["P", 1], ["n", 1.5], ["D", 0.5], ["P", 1], ["M", 1], ["g", 1], ["R", 1], ["S", 3]],
    rhythm: dadraTabla,
  },
  "pilu-sarangi": {
    sa: 207.65, bpm: 80, voice: "sarangi", subdivision: 1, drone: "tanpura", gain: 0.5, breath: 2,
    melody: [["N,", 1], ["S", 1], ["g", 1], ["R", 1], ["S", 1], ["N,", 1], ["P,", 1], ["N,", 1], ["S", 2], ["G", 1], ["M", 1], ["P", 1], ["n", 1], ["D", 1], ["P", 1], ["g", 1], ["R", 1], ["S", 3]],
    rhythm: dadraTabla,
  },
  "yaman-teental": {
    sa: 220, bpm: 128, voice: "sitar", subdivision: 2, drone: "tanpura", gain: 0.46, breath: 2,
    melody: [["N,", 0.5], ["R", 0.5], ["G", 0.5], ["m", 0.5], ["P", 1], ["m", 0.5], ["G", 0.5], ["m", 0.5], ["D", 0.5], ["N", 1], ["S'", 1], ["N", 0.5], ["D", 0.5], ["P", 1], ["m", 0.5], ["G", 0.5], ["R", 1], ["S", 2]],
    rhythm: [["dha", "ghungroo"], "ge", ["na", "ghungroo"], "dha", ["dha", "ghungroo"], "ge", ["na", "ghungroo"], "tin"],
  },
  "garba-dandiya": {
    sa: 246.94, bpm: 126, voice: "harmonium", subdivision: 2, drone: null, gain: 0.45, breath: 1,
    melody: [["S", 0.5], ["G", 0.5], ["P", 1], ["G", 0.5], ["P", 0.5], ["D", 1], ["P", 0.5], ["G", 0.5], ["R", 1], ["S", 1], ["R", 0.5], ["G", 0.5], ["M", 1], ["G", 0.5], ["R", 0.5], ["S", 2]],
    rhythm: ["dhol", "-", "dandiya", "dholTa", "-", "dandiya", "dhol", "dholTa", "dandiya", "dholTa", "-", "dandiya"],
  },
  "dhol-bhangra": {
    sa: 261.63, bpm: 148, voice: "tumbi", subdivision: 2, drone: null, gain: 0.4, breath: 1,
    melody: [["S'", 0.5], ["S'", 0.5], ["P", 0.5], ["S'", 0.5], ["R'", 0.5], ["S'", 0.5], ["P", 1], ["G", 0.5], ["P", 0.5], ["G", 0.5], ["R", 0.5], ["S", 2]],
    rhythm: ["dhol", "-", "dholTa", "dhol", "chimta", "dhol", "dholTa", "chimta"],
  },
  "qawwali-taali": {
    sa: 233.08, bpm: 104, voice: "harmonium", subdivision: 2, drone: "shruti", gain: 0.45, breath: 1,
    melody: [["S", 0.5], ["R", 0.5], ["g", 1], ["R", 0.5], ["g", 0.5], ["M", 1], ["P", 1], ["M", 0.5], ["g", 0.5], ["R", 1], ["S", 1], ["n,", 1], ["S", 2]],
    rhythm: [["dhe", "taali"], "-", "ta", "dhe", ["dhe", "taali"], "ta", "-", "ta"],
  },
  "des-sitar": {
    sa: 207.65, bpm: 92, voice: "sitar", subdivision: 2, drone: "tanpura", gain: 0.46, breath: 2,
    melody: [["R", 1], ["M", 1], ["P", 1], ["N", 1], ["S'", 2], ["n", 1], ["D", 1], ["P", 1], ["M", 1], ["G", 1], ["R", 1], ["G", 1], ["S", 3]],
    rhythm: keherwaTabla,
  },
  "kafi-santoor": {
    sa: 220, bpm: 96, voice: "santoor", subdivision: 1, drone: "tanpura", gain: 0.7, breath: 2,
    melody: [["S", 0.5], ["R", 0.5], ["g", 0.5], ["M", 0.5], ["P", 1], ["D", 0.5], ["n", 0.5], ["S'", 1], ["n", 0.5], ["D", 0.5], ["P", 1], ["M", 0.5], ["g", 0.5], ["R", 1], ["S", 2]],
    rhythm: ["-"],
  },
  "bageshri-bansuri": {
    sa: 233.08, bpm: 66, voice: "flute", subdivision: 2, drone: "tanpura", gain: 0.5, breath: 3,
    melody: [["D,", 1], ["n,", 1], ["S", 1], ["M", 2], ["g", 1], ["M", 1], ["D", 2], ["n", 1], ["D", 1], ["M", 1], ["g", 1], ["R", 1], ["S", 3]],
    rhythm: ["dha", "-", "tin", "-", "na", "-", "dha", "-"],
  },
  tanpura: {
    sa: 130.81, bpm: 60, voice: null, subdivision: 1, drone: "tanpura", gain: 0.85,
    melody: [],
    rhythm: ["-"],
  },

  /* ---- South ---- */
  "kalyani-nadaswaram-thavil": {
    sa: 233.08, bpm: 96, voice: "nadaswaram", subdivision: 2, drone: "shruti", gain: 0.42, breath: 1,
    melody: [["S", 1], ["R", 1], ["G", 1], ["m", 1], ["P", 2], ["D", 1], ["N", 1], ["S'", 2], ["N", 1], ["D", 1], ["P", 1], ["m", 1], ["G", 1], ["R", 1], ["S", 2]],
    rhythm: ["thoppi", "valam", "-", "valam", "thoppi", "-", "valam", "valam"],
  },
  kettimelam: {
    sa: 233.08, bpm: 168, voice: "nadaswaram", subdivision: 2, drone: "shruti", gain: 0.38, breath: 0, accent: { every: 1, sound: "bell" },
    melody: [["S'", 0.5], ["N", 0.5], ["S'", 0.5], ["R'", 0.5], ["S'", 0.5], ["N", 0.5], ["D", 0.5], ["N", 0.5], ["S'", 1], ["P", 0.5], ["D", 0.5], ["N", 0.5], ["S'", 0.5], ["R'", 0.5], ["G'", 0.5], ["S'", 2]],
    rhythm: [["valam", "manjira"], "valam", "valam", ["thoppi", "valam"], ["valam", "manjira"], "valam", ["thoppi", "valam"], "valam"],
  },
  "shankarabharanam-nadaswaram": {
    sa: 233.08, bpm: 66, voice: "nadaswaram", subdivision: 1, drone: "shruti", gain: 0.75, breath: 2,
    melody: [["S", 2], ["R", 1], ["G", 1], ["M", 1], ["P", 2], ["D", 1], ["N", 1], ["S'", 3], ["N", 1], ["D", 1], ["P", 2], ["M", 1], ["G", 1], ["R", 1], ["S", 3]],
    rhythm: ["bell", "-", "-", "-", "thoppi", "-", "-", "-"],
  },
  "mohanam-veena": {
    sa: 196, bpm: 84, voice: "veena", subdivision: 2, drone: "tanpura", gain: 0.45, breath: 2,
    melody: [["S", 0.5], ["R", 0.5], ["G", 1], ["P", 1], ["D", 0.5], ["P", 0.5], ["G", 1], ["R", 0.5], ["G", 0.5], ["P", 1], ["D", 1], ["S'", 2], ["D", 0.5], ["P", 0.5], ["G", 1], ["R", 1], ["S", 2]],
    rhythm: adiMridangam,
  },
  "hamsadhwani-flute": {
    sa: 261.63, bpm: 100, voice: "flute", subdivision: 2, drone: "tanpura", gain: 0.5, breath: 2,
    melody: [["S", 0.5], ["R", 0.5], ["G", 0.5], ["P", 0.5], ["N", 1], ["S'", 1], ["N", 0.5], ["P", 0.5], ["G", 1], ["R", 0.5], ["G", 0.5], ["P", 1], ["R", 1], ["S", 2]],
    rhythm: adiMridangam,
  },
  "kolattam-sticks": {
    sa: 246.94, bpm: 120, voice: "flute", subdivision: 2, drone: "shruti", gain: 0.5, breath: 1,
    melody: [["S", 0.5], ["R", 0.5], ["G", 0.5], ["M", 0.5], ["P", 1], ["M", 0.5], ["G", 0.5], ["R", 1], ["S", 1], ["G", 0.5], ["P", 0.5], ["D", 1], ["P", 1], ["G", 1], ["S", 2]],
    rhythm: [["thom", "dandiya"], "nam", ["dhin", "dandiya"], "nam", ["thom", "dandiya"], "ki", ["nam", "dandiya"], "dhin"],
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
  if (musicId === "none" || !(musicId in PIECES)) return { stop: () => undefined };
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
  wet.gain.value = 0.2;
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3600;
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

  function vibratoFor(node: OscillatorNode, time: number, length: number, rate: number, depthHz: number, delayBy: number) {
    const lfo = context.createOscillator();
    lfo.frequency.value = rate;
    const depth = context.createGain();
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(depthHz, time + Math.min(delayBy, length * 0.6));
    lfo.connect(depth);
    depth.connect(node.frequency);
    lfo.start(time);
    lfo.stop(time + length + 0.05);
    track(lfo);
  }

  /* --- melodic voices --- */

  /** Shehnai and nadaswaram: double-reed, bright, with meend from the last note. */
  function reed(time: number, hz: number, length: number, from: number | null, bright: number, peak: number) {
    const body = context.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = bright;
    body.Q.value = 1.3;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(peak, time + 0.07);
    amp.gain.setValueAtTime(peak, time + Math.max(0.1, length - 0.1));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
    body.connect(amp);
    amp.connect(out);
    for (const [type, mult, level] of [["sawtooth", 1, 0.6], ["square", 1.002, 0.25]] as const) {
      const node = context.createOscillator();
      node.type = type;
      node.frequency.setValueAtTime((from ?? hz) * mult, time);
      node.frequency.exponentialRampToValueAtTime(hz * mult, time + (from ? Math.min(0.16, length / 3) : 0.01));
      vibratoFor(node, time, length, 5.2, hz * 0.012, 0.25);
      const level_ = context.createGain();
      level_.gain.value = level;
      node.connect(level_);
      level_.connect(body);
      node.start(time);
      node.stop(time + length + 0.05);
      track(node);
    }
  }

  /** Sarangi: bowed, slow to speak, singing vibrato, sliding between notes. */
  function sarangi(time: number, hz: number, length: number, from: number | null) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2300;
    filter.Q.value = 3;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(0.13, time + 0.16);
    amp.gain.setValueAtTime(0.12, time + Math.max(0.2, length - 0.15));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length + 0.05);
    filter.connect(amp);
    amp.connect(out);
    for (const detune of [1, 1.004]) {
      const node = context.createOscillator();
      node.type = "sawtooth";
      node.frequency.setValueAtTime((from ?? hz) * detune, time);
      node.frequency.exponentialRampToValueAtTime(hz * detune, time + (from ? Math.min(0.22, length / 2) : 0.02));
      vibratoFor(node, time, length, 5.6, hz * 0.018, 0.35);
      node.connect(filter);
      node.start(time);
      node.stop(time + length + 0.1);
      track(node);
    }
    burst(time, Math.min(length, 0.4), "bandpass", hz * 4, 2, 0.012);
  }

  /** Harmonium: two reeds a hair apart, steady, with a little bellows breath. */
  function harmonium(time: number, hz: number, length: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1900;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(0.07, time + 0.04);
    amp.gain.setValueAtTime(0.07, time + Math.max(0.06, length - 0.06));
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
    filter.connect(amp);
    amp.connect(out);
    for (const [type, mult] of [["square", 1], ["sawtooth", 1.003], ["square", 2.001]] as const) osc(type, hz * mult, time, length, filter);
    const breath = context.createOscillator();
    breath.frequency.value = 4.5;
    const depth = context.createGain();
    depth.gain.value = 0.012;
    breath.connect(depth);
    depth.connect(amp.gain);
    breath.start(time);
    breath.stop(time + length + 0.05);
    track(breath);
  }

  function flute(time: number, hz: number, length: number) {
    const amp = env(time, 0.16, 0.06, length);
    const node = osc("sine", hz, time, length, amp);
    vibratoFor(node, time, length, 5, hz * 0.009, 0.3);
    burst(time, 0.06, "bandpass", hz * 3, 3, 0.03);
    osc("triangle", hz * 2, time, length, env(time, 0.022, 0.06, length));
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

  /** Veena: a deep pluck that bends up into the note, the gamaka of Carnatic music. */
  function veena(time: number, hz: number, length: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3000, time);
    filter.frequency.exponentialRampToValueAtTime(600, time + 1.6);
    filter.Q.value = 4;
    filter.connect(env(time, 0.17, 0.005, Math.min(2, length + 0.9)));
    for (const detune of [1, 1.002]) {
      const node = osc("sawtooth", hz * 0.97 * detune, time, Math.min(2, length + 0.9), filter);
      node.frequency.exponentialRampToValueAtTime(hz * detune, time + 0.09);
    }
    osc("sine", hz * 0.5, time, 1.2, env(time, 0.05, 0.005, 1.2));
  }

  function santoor(time: number, hz: number, beats: number, beat: number) {
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
    switch (piece.voice) {
      case "shehnai":
        return reed(time, hz * 2, length * 0.98, from ? from * 2 : null, 1500, 0.11);
      case "nadaswaram":
        return reed(time, hz * 2, length * 0.98, from ? from * 2 : null, 1100, 0.12);
      case "sarangi":
        return sarangi(time, hz * 2, length * 0.98, from ? from * 2 : null);
      case "harmonium":
        return harmonium(time, hz * 2, length * 0.95);
      case "flute":
        return flute(time, hz * 2, length * 0.95);
      case "sitar":
        pluck(time, hz * 2, true, Math.min(1.6, length + 0.6), 0.16);
        osc("sine", hz * 4, time, 0.3, env(time, 0.02, 0.003, 0.3));
        return;
      case "veena":
        return veena(time, hz, length);
      case "santoor":
        return santoor(time, hz * 2, beats, beat);
      case "tumbi":
        return pluck(time, hz * 2, true, Math.min(0.5, length + 0.2), 0.18);
    }
  }

  /* --- percussion --- */

  function drum(time: number, pitch: number, drop: number, peak: number, decay: number) {
    const node = osc("sine", pitch, time, decay + 0.05, env(time, peak, 0.003, decay));
    node.frequency.exponentialRampToValueAtTime(drop, time + decay * 0.7);
  }

  function ring(time: number, pitch: number, peak: number, decay: number) {
    const node = osc("sine", pitch * 1.03, time, decay + 0.05, env(time, peak, 0.002, decay));
    node.frequency.exponentialRampToValueAtTime(pitch, time + 0.05);
  }

  function stroke(time: number, kind: Stroke) {
    switch (kind) {
      case "-":
        return;
      case "dhol":
      case "ge":
        drum(time, kind === "dhol" ? 110 : 95, 48, kind === "dhol" ? 0.55 : 0.32, kind === "dhol" ? 0.35 : 0.45);
        return burst(time, 0.04, "lowpass", 400, 1, kind === "dhol" ? 0.2 : 0.08);
      case "dholTa":
        burst(time, 0.07, "bandpass", 1800, 2, 0.28);
        return void osc("sine", 420, time, 0.08, env(time, 0.12, 0.002, 0.08));
      case "dha":
      case "na":
      case "tin":
      case "ka":
        if (kind === "ka") return burst(time, 0.03, "bandpass", 2400, 3, 0.07);
        ring(time, kind === "tin" ? 520 : 440, kind === "na" ? 0.16 : 0.2, kind === "na" ? 0.22 : 0.45);
        burst(time, 0.02, "highpass", 3000, 1, 0.06);
        if (kind === "dha") drum(time, 120, 70, 0.28, 0.35);
        return;
      case "dhe":
        drum(time, 165, 90, 0.4, 0.28);
        return burst(time, 0.03, "lowpass", 600, 1, 0.08);
      case "ta":
        burst(time, 0.05, "bandpass", 2600, 2.5, 0.22);
        return void osc("sine", 720, time, 0.06, env(time, 0.08, 0.002, 0.06));
      case "thom":
        return drum(time, 92, 60, 0.45, 0.4);
      case "nam":
        ring(time, 620, 0.16, 0.5);
        return burst(time, 0.02, "highpass", 3500, 1, 0.05);
      case "dhin":
        ring(time, 560, 0.14, 0.35);
        return drum(time, 100, 64, 0.3, 0.3);
      case "ki":
        return burst(time, 0.035, "bandpass", 3000, 3, 0.09);
      case "valam":
        burst(time, 0.05, "bandpass", 1300, 1.5, 0.3);
        return void osc("sine", 880, time, 0.07, env(time, 0.1, 0.002, 0.07));
      case "thoppi":
        drum(time, 80, 45, 0.5, 0.3);
        return burst(time, 0.03, "lowpass", 300, 1, 0.12);
      case "ghungroo":
        for (let index = 0; index < 3; index += 1) burst(time + index * 0.018, 0.05, "highpass", 6500, 1, 0.05);
        return;
      case "chimta":
        burst(time, 0.09, "bandpass", 5200, 6, 0.12);
        return void osc("sine", 3100, time, 0.12, env(time, 0.03, 0.002, 0.12));
      case "manjira":
        for (const [hz, level] of [[2637, 0.03], [3953, 0.02], [5274, 0.012]] as const) osc("sine", hz, time, 1.4, env(time, level, 0.002, 1.4));
        return burst(time, 0.12, "highpass", 7000, 1, 0.04);
      case "dandiya":
        return burst(time, 0.025, "bandpass", 2200, 8, 0.32);
      case "taali":
        for (const offset of [0, 0.008, 0.016]) burst(time + offset, 0.05, "bandpass", 1200, 1.2, 0.12);
        return;
      case "bell":
        for (const [mult, level, decay] of [[1, 0.09, 3.5], [2.76, 0.05, 2.2], [5.4, 0.025, 1.2], [8.9, 0.012, 0.8]] as const) {
          osc("sine", 523.25 * mult, time, decay, env(time, level, 0.003, decay));
        }
        return;
    }
  }

  /** Shankh: the conch, a breathy horn that swells and rises a little at the end. */
  function shankh(time: number) {
    const length = 2.4;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.1;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(0.16, time + 0.5);
    amp.gain.setValueAtTime(0.16, time + length - 0.6);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
    filter.connect(amp);
    amp.connect(out);
    for (const [type, mult] of [["sawtooth", 1], ["square", 2.003]] as const) {
      const node = context.createOscillator();
      node.type = type;
      node.frequency.setValueAtTime(207 * mult, time);
      node.frequency.linearRampToValueAtTime(220 * mult, time + length * 0.7);
      node.frequency.linearRampToValueAtTime(232 * mult, time + length);
      node.connect(filter);
      node.start(time);
      node.stop(time + length + 0.05);
      track(node);
    }
    burst(time, length, "bandpass", 1500, 0.8, 0.02);
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
  let melodyIndex = 0;
  let melodyAt = context.currentTime + 0.15;
  let previous: string | null = null;
  let cycles = 0;
  let strokeIndex = 0;
  let strokeAt = context.currentTime + 0.15;
  const droneSa = piece.sa / 2;
  const droneNotes = [droneSa * 1.5, droneSa * 2, droneSa * 2, droneSa];
  let droneIndex = 0;
  let droneAt = context.currentTime + 0.05;
  if (piece.accent?.sound === "shankh") shankh(context.currentTime + 0.1);

  function schedule() {
    const horizon = context.currentTime + 0.35;
    if (piece.voice && piece.melody.length) {
      while (melodyAt < horizon) {
        const [note, beats] = piece.melody[melodyIndex];
        if (note !== "-") melodyNote(melodyAt, note, previous, beats, beat);
        previous = note === "-" ? null : note;
        melodyAt += beats * beat;
        melodyIndex = (melodyIndex + 1) % piece.melody.length;
        if (melodyIndex === 0) {
          cycles += 1;
          // Breathe between phrases, and mark the cycle with the accent.
          melodyAt += (piece.breath ?? 2) * beat;
          previous = null;
          if (piece.accent && cycles % piece.accent.every === 0) {
            if (piece.accent.sound === "shankh") shankh(melodyAt - beat);
            else stroke(melodyAt, "bell");
          }
        }
      }
    }
    if (piece.rhythm.length > 1 || piece.rhythm[0] !== "-") {
      const step = beat / piece.subdivision;
      while (strokeAt < horizon) {
        const current = piece.rhythm[strokeIndex];
        for (const item of Array.isArray(current) ? current : [current]) stroke(strokeAt, item);
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
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        filter.connect(amp);
        osc("sawtooth", droneSa, droneAt, 8, filter);
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
