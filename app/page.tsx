"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const [audioActive, setAudioActive] = useState(false);
  const engineRef = useRef<NatureAudioEngine | null>(null);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioActive) {
      if (!engineRef.current) {
        engineRef.current = new NatureAudioEngine();
      }
      engineRef.current.start();
    } else {
      engineRef.current?.stop();
    }
  }, [audioActive]);

  const grass = useMemo(
    () => Array.from({ length: 12 }, (_, index) => <div key={index} className="tuft" aria-hidden="true" />),
    []
  );

  return (
    <main>
      <section className="scene-container">
        <div className="scene" aria-hidden="true">
          <div className="sky-gradient" />
          <div className="sun" />
          <div className="cloud" style={{ left: "10%" }} />
          <div className="cloud is-second" />
          <div className="bird" />
          <div className="mountains" />
          <div className="mist" />
          <div className="ground">{grass}</div>
          <div className="stream-bank" />
          <div className="stream">
            <div className="stream-ripples" />
          </div>
          <div className="reflection" />
          <div className="cat" role="img" aria-label="Mèo thong dong dạo bên suối">
            <div className="cat-body" />
            <div className="cat-tail" />
            <div className="cat-head">
              <span className="cat-ear left" />
              <span className="cat-ear right" />
              <div className="cat-face">
                <span className="cat-eye" />
                <span className="cat-eye" />
                <span className="cat-nose" />
                <span className="cat-mouth" />
              </div>
            </div>
            <span className="cat-leg front-left" />
            <span className="cat-leg front-right" />
            <span className="cat-leg back-left" />
            <span className="cat-leg back-right" />
          </div>
        </div>
        <article className="caption-card">
          <h1>Mèo Bình Thản Bên Suối</h1>
          <p>
            Thưởng thức khung cảnh chú mèo nhỏ thong dong dạo bước, rồi nhẹ nhàng chìm mình trong dòng suối trong
            xanh. Xung quanh là tiếng chim hót và làn gió mơn man mang đến sự yên bình thuần khiết.
          </p>
          <button
            type="button"
            className="audio-toggle"
            aria-pressed={audioActive}
            onClick={() => setAudioActive((current) => !current)}
          >
            <span className={`toggle-switch ${audioActive ? "active" : ""}`} aria-hidden="true" />
            <span>Âm thanh thiên nhiên</span>
            <span className="sr-only">Âm thanh {audioActive ? "đang bật" : "đang tắt"}</span>
          </button>
        </article>
      </section>
    </main>
  );
}

class NatureAudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private windGain: GainNode;
  private streamGain: GainNode;
  private windSource: AudioBufferSourceNode | null = null;
  private streamSource: AudioBufferSourceNode | null = null;
  private running = false;
  private chirpTimeout: number | null = null;
  private swellInterval: number | null = null;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.75;
    this.masterGain.connect(this.ctx.destination);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.masterGain);

    this.streamGain = this.ctx.createGain();
    this.streamGain.gain.value = 0;
    this.streamGain.connect(this.masterGain);
  }

  start() {
    if (this.running) {
      this.ctx.resume().catch(() => undefined);
      return;
    }

    this.running = true;
    this.ctx.resume().catch(() => undefined);

    this.fadeParam(this.masterGain.gain, 0.8, 1.2);
    this.startWind();
    this.startStream();
    this.scheduleChirps();
    this.scheduleWindSwells();
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    const now = this.ctx.currentTime;
    [this.windGain.gain, this.streamGain.gain, this.masterGain.gain].forEach((param) => {
      param.cancelScheduledValues(now);
      param.linearRampToValueAtTime(param.value, now);
      param.linearRampToValueAtTime(0.0001, now + 2.2);
    });

    if (this.chirpTimeout !== null) {
      window.clearTimeout(this.chirpTimeout);
      this.chirpTimeout = null;
    }

    if (this.swellInterval !== null) {
      window.clearInterval(this.swellInterval);
      this.swellInterval = null;
    }
  }

  dispose() {
    this.stop();
    try {
      this.windSource?.stop();
      this.streamSource?.stop();
    } catch {
      // ignore stop errors
    }
    this.windSource = null;
    this.streamSource = null;
    this.masterGain.disconnect();
  }

  private startWind() {
    if (this.windSource) {
      return;
    }

    const buffer = NatureAudioEngine.createPinkNoiseBuffer(this.ctx, 8);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 750;
    filter.Q.value = 0.6;

    source.connect(filter);
    filter.connect(this.windGain);

    source.start();
    this.windSource = source;

    this.fadeParam(this.windGain.gain, 0.32, 2.6);
  }

  private startStream() {
    if (this.streamSource) {
      return;
    }

    const buffer = NatureAudioEngine.createWaterNoiseBuffer(this.ctx, 6);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 950;
    filter.Q.value = 1.1;

    source.connect(filter);

    const gentleGain = this.ctx.createGain();
    gentleGain.gain.value = 0.85;
    filter.connect(gentleGain);
    gentleGain.connect(this.streamGain);

    source.start();
    this.streamSource = source;

    this.fadeParam(this.streamGain.gain, 0.36, 2);
  }

  private fadeParam(param: AudioParam, target: number, seconds: number) {
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.linearRampToValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + seconds);
  }

  private scheduleChirps() {
    if (!this.running) {
      return;
    }

    const delay = 3000 + Math.random() * 5500;
    this.chirpTimeout = window.setTimeout(() => {
      if (!this.running) {
        return;
      }
      this.playBirdChirp();
      this.scheduleChirps();
    }, delay);
  }

  private scheduleWindSwells() {
    if (this.swellInterval !== null) {
      window.clearInterval(this.swellInterval);
    }

    this.swellInterval = window.setInterval(() => {
      if (!this.running) {
        return;
      }

      const now = this.ctx.currentTime;
      const peak = 0.28 + Math.random() * 0.2;
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.linearRampToValueAtTime(peak, now + 3);
      this.windGain.gain.linearRampToValueAtTime(0.24, now + 6.5);
    }, 7000);
  }

  private playBirdChirp() {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";

    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * 0.6;

    const startTime = this.ctx.currentTime + 0.05;
    const endTime = startTime + 0.75;

    osc.frequency.setValueAtTime(880 + Math.random() * 320, startTime);
    osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 600, startTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(680 + Math.random() * 240, endTime);

    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(endTime + 0.1);
  }

  private static createPinkNoiseBuffer(ctx: AudioContext, seconds: number) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < output.length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  private static createWaterNoiseBuffer(ctx: AudioContext, seconds: number) {
    const buffer = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0;
      for (let i = 0; i < data.length; i += 1) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        const pinkish = lastOut * 3.5;
        data[i] = pinkish * 0.45;
      }
    }
    return buffer;
  }
}
