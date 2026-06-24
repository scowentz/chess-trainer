'use client'

/**
 * Lightweight chess sound effects synthesized with the Web Audio API.
 *
 * No binary assets: every sound is generated from oscillators + noise, so it
 * works offline and stays tiny. All entry points are guarded so importing or
 * calling them in SSR / jsdom (no AudioContext) is a safe no-op.
 */

export type SoundType =
  | 'move'
  | 'capture'
  | 'castle'
  | 'check'
  | 'blunder'
  | 'gameEnd'
  | 'correct'
  | 'incorrect'

const STORAGE_KEY = 'chess-trainer:muted'

let ctx: AudioContext | null = null
let muted = false

function hasAudio(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !==
      'undefined'
  )
}

// Initialize mute state from storage on first load (browser only).
if (typeof window !== 'undefined') {
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    muted = false
  }
}

function getCtx(): AudioContext | null {
  if (!hasAudio()) return null
  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  // Browsers suspend the context until a user gesture; resume opportunistically.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* ignore storage failures */
    }
  }
}

/** Warm a suspended AudioContext from inside a user gesture (e.g. first click). */
export function primeAudio(): void {
  getCtx()
}

/** A short tonal blip: sine/triangle with a fast percussive envelope. */
function blip(
  audio: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType = 'sine',
  endFreq?: number,
): void {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(audio.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

/** A filtered noise burst — gives moves a "wooden" click / capture crunch. */
function knock(
  audio: AudioContext,
  start: number,
  duration: number,
  peak: number,
  cutoff: number,
): void {
  const frames = Math.floor(audio.sampleRate * duration)
  const buffer = audio.createBuffer(1, frames, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    // Exponentially decaying white noise.
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.5)
  }
  const src = audio.createBufferSource()
  src.buffer = buffer
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  const gain = audio.createGain()
  gain.gain.setValueAtTime(peak, start)
  src.connect(filter).connect(gain).connect(audio.destination)
  src.start(start)
  src.stop(start + duration + 0.02)
}

export function playSound(type: SoundType): void {
  if (muted) return
  const audio = getCtx()
  if (!audio) return
  const t = audio.currentTime

  switch (type) {
    case 'move':
      knock(audio, t, 0.09, 0.32, 2200)
      blip(audio, 180, t, 0.07, 0.10, 'sine')
      break
    case 'capture':
      knock(audio, t, 0.13, 0.5, 1500)
      blip(audio, 130, t, 0.10, 0.14, 'triangle')
      break
    case 'castle':
      knock(audio, t, 0.08, 0.28, 2000)
      knock(audio, t + 0.1, 0.08, 0.28, 2000)
      break
    case 'check':
      blip(audio, 880, t, 0.12, 0.16, 'sine')
      blip(audio, 1320, t + 0.1, 0.16, 0.16, 'sine')
      break
    case 'blunder':
      blip(audio, 220, t, 0.32, 0.18, 'sawtooth', 110)
      blip(audio, 233, t, 0.32, 0.12, 'sawtooth', 116)
      break
    case 'gameEnd':
      blip(audio, 523, t, 0.2, 0.16, 'sine') // C5
      blip(audio, 659, t + 0.16, 0.2, 0.16, 'sine') // E5
      blip(audio, 784, t + 0.32, 0.34, 0.18, 'sine') // G5
      break
    case 'correct':
      blip(audio, 660, t, 0.1, 0.14, 'sine') // E5
      blip(audio, 990, t + 0.09, 0.16, 0.14, 'sine') // B5 — rising "ding"
      break
    case 'incorrect':
      blip(audio, 300, t, 0.18, 0.16, 'sawtooth', 200)
      break
  }
}
