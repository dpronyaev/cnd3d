// Music + SFX engine.
// Tracks are 60 Hz channel-state sequences re-derived from the original game's sound engine and
// re-synthesised here with our own instruments (softened pulses, warm triangle bass, filtered noise, hall reverb).
// Format: { channels: { p1:{frames,loop,ev:[[len,timer,vol,duty]..]}, p2:{..}, tri:{frames,loop,ev:[[len,timer]..]}, noise:{frames,loop,ev:[[len,period,vol,mode]..]} } }
const CPU = 1789773;
const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
const FRAME = 1 / 60.0988;
const CHANNELS = ['p1', 'p2', 'tri', 'noise'];

function makeDutyWave(ctx, duty) {
  const N = 40; const real = new Float32Array(N), imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    const a = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    const soft = 1 / (1 + (n / 18) ** 2);
    imag[n] = a * soft;
  }
  return ctx.createPeriodicWave(real, imag);
}
function makeNoiseBuffer(ctx, mode) {
  const len = mode ? 93 * 16 : 32767; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
  let sr = 1;
  for (let i = 0; i < len; i++) {
    const fb = (sr & 1) ^ ((sr >> (mode ? 6 : 1)) & 1);
    sr = (sr >> 1) | (fb << 14);
    d[i] = (sr & 1) ? 0.5 : -0.5;
  }
  return buf;
}
function makeImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds); const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return buf;
}

export class Audio {
  constructor() {
    this.ctx = null; this.tracks = {}; this.current = null; this.muted = false; this.volume = 0.8;
    this._timer = null; this._sfxVoices = []; this.musicVolume = 0.55;
  }
  init() {
    if (this.ctx) return;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 4;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.reverb = ctx.createConvolver(); this.reverb.buffer = makeImpulse(ctx, 1.4, 3.5);
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.16; this.reverb.connect(this.revGain); this.revGain.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicVolume; this.musicBus.connect(this.master); this.musicBus.connect(this.reverb);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.7; this.sfxBus.connect(this.master); this.sfxBus.connect(this.reverb);
    this.waves = [makeDutyWave(ctx, 0.125), makeDutyWave(ctx, 0.25), makeDutyWave(ctx, 0.5), makeDutyWave(ctx, 0.75)];
    this.noiseBufs = [makeNoiseBuffer(ctx, 0), makeNoiseBuffer(ctx, 1)];
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
  async loadTrack(name, url) {
    if (this.tracks[name]) return this.tracks[name];
    try { const r = await fetch(url); const t = await r.json(); this.tracks[name] = t; return t; } catch (e) { console.warn('track load failed', name, e); return null; }
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : this.volume; return this.muted; }
  setMusicDucked(d) { if (this.musicBus) this.musicBus.gain.setTargetAtTime(d ? this.musicVolume * 0.35 : this.musicVolume, this.ctx.currentTime, 0.1); }

  _makeVoice(bus) {
    const ctx = this.ctx;
    const mk = () => { const o = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(bus); o.start(); return { o, g, duty: -1 }; };
    const p1 = mk(), p2 = mk(); p1.o.setPeriodicWave(this.waves[2]); p2.o.setPeriodicWave(this.waves[2]);
    const tri = mk(); tri.o.type = 'triangle';
    const triFilt = ctx.createBiquadFilter(); triFilt.type = 'lowpass'; triFilt.frequency.value = 2200; tri.g.disconnect(); tri.g.connect(triFilt); triFilt.connect(bus);
    const nz = { g: ctx.createGain(), filt: ctx.createBiquadFilter() }; nz.g.gain.value = 0; nz.filt.type = 'highpass'; nz.filt.frequency.value = 250;
    nz.g.connect(nz.filt); nz.filt.connect(bus);
    nz.src = []; nz.srcGain = [];
    for (let m = 0; m < 2; m++) { const s = ctx.createBufferSource(); s.buffer = this.noiseBufs[m]; s.loop = true; const sg = ctx.createGain(); sg.gain.value = m ? 0 : 1; s.connect(sg); sg.connect(nz.g); s.start(); nz.src.push(s); nz.srcGain.push(sg); }
    return { p1, p2, tri, nz, stop() { try { p1.o.stop(); p2.o.stop(); tri.o.stop(); nz.src[0].stop(); nz.src[1].stop(); } catch (e) { } } };
  }
  _newState(name, t, v, loop, vol) {
    const st = { name, t, v, time: this.ctx.currentTime + 0.05, loop, vol, ended: false, cur: {} };
    for (const ch of CHANNELS) st.cur[ch] = { i: 0, k: 0, frame: 0, ended: !t.channels[ch] || t.channels[ch].frames === 0 };
    return st;
  }
  _advance(st, ch) {
    const c = st.cur[ch]; const chan = st.t.channels[ch];
    if (c.ended) return null;
    const ev = chan.ev[c.i]; c.k++; c.frame++;
    if (c.k >= ev[0]) { c.i++; c.k = 0; }
    if (c.frame >= chan.frames) {
      if (st.loop && chan.loop != null) { this._seek(st, ch, chan.loop); }
      else if (st.loop && chan.loop == null && chan.frames > 900) { this._seek(st, ch, 0); }
      else c.ended = true;
    }
    return ev;
  }
  _seek(st, ch, frame) {
    const chan = st.t.channels[ch]; let f = 0, i = 0; while (i < chan.ev.length && f + chan.ev[i][0] <= frame) { f += chan.ev[i][0]; i++; }
    st.cur[ch] = { i, k: frame - f, frame, ended: false };
  }
  _scheduleFrame(st) {
    const time = st.time; const v = st.v; const vol = st.vol;
    const setPulse = (ch, ev) => {
      if (!ev) { ch.g.gain.setTargetAtTime(0, time, 0.004); return; }
      const [, t, vl, duty] = ev; const f = t >= 8 ? CPU / (16 * (t + 1)) : 0;
      if (f > 0 && vl > 0) { ch.o.frequency.setValueAtTime(f, time); if (ch.duty !== duty) { ch.o.setPeriodicWave(this.waves[duty]); ch.duty = duty; } }
      ch.g.gain.setTargetAtTime((vl / 15) * 0.2 * vol * (f > 0 ? 1 : 0), time, 0.004);
    };
    setPulse(v.p1, this._advance(st, 'p1')); setPulse(v.p2, this._advance(st, 'p2'));
    const te = this._advance(st, 'tri');
    if (te && te[1] >= 2) { v.tri.o.frequency.setValueAtTime(CPU / (32 * (te[1] + 1)), time); v.tri.g.gain.setTargetAtTime(0.42 * vol, time, 0.004); }
    else v.tri.g.gain.setTargetAtTime(0, time, 0.004);
    const ne = this._advance(st, 'noise');
    if (ne && ne[2] > 0) {
      const [, per, vl, mode] = ne; const rate = (CPU / NOISE_PERIODS[per]) / this.ctx.sampleRate;
      v.nz.src[0].playbackRate.setValueAtTime(Math.min(rate, 16), time); v.nz.src[1].playbackRate.setValueAtTime(Math.min(rate, 16), time);
      v.nz.srcGain[0].gain.setValueAtTime(mode ? 0 : 1, time); v.nz.srcGain[1].gain.setValueAtTime(mode ? 1 : 0, time);
      v.nz.g.gain.setTargetAtTime((vl / 15) * 0.15 * vol, time, 0.003);
    } else v.nz.g.gain.setTargetAtTime(0, time, 0.003);
    st.time += FRAME;
    if (CHANNELS.every(ch => st.cur[ch].ended)) st.ended = true;
  }

  playMusic(name, { loop = true, volume = 1 } = {}) {
    if (!this.ctx) return; const t = this.tracks[name]; if (!t) { console.warn('no track', name); return; }
    if (this.current && this.current.name === name && !this.current.ended) return;
    this.stopMusic();
    const v = this._makeVoice(this.musicBus);
    const st = this.current = this._newState(name, t, v, loop, volume);
    const schedule = () => {
      if (this.current !== st) return;
      const ahead = this.ctx.currentTime + 0.3;
      while (st.time < ahead && !st.ended) this._scheduleFrame(st);
      if (st.ended && !st.finishing) { st.finishing = true; setTimeout(() => { if (this.current === st) { this.stopMusic(); if (st.onEnd) st.onEnd(); } }, Math.max(0, (st.time - this.ctx.currentTime) * 1000) + 150); }
    };
    schedule(); this._timer = setInterval(schedule, 80);
  }
  stopMusic() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this.current) {
      const v = this.current.v; const t = this.ctx.currentTime;
      for (const ch of [v.p1, v.p2, v.tri]) { ch.g.gain.cancelScheduledValues(t); ch.g.gain.setTargetAtTime(0, t, 0.01); }
      v.nz.g.gain.cancelScheduledValues(t); v.nz.g.gain.setTargetAtTime(0, t, 0.01);
      setTimeout(() => v.stop(), 200); this.current = null;
    }
  }
  playJingle(name, onEnd) {
    if (!this.ctx || !this.tracks[name]) { if (onEnd) setTimeout(onEnd, 800); return; }
    this.stopMusic(); this.playMusic(name, { loop: false });
    if (this.current) this.current.onEnd = onEnd; else if (onEnd) setTimeout(onEnd, 100);
  }
  isPlaying(name) { return !!(this.current && this.current.name === name); }

  playSfx(name) {
    if (!this.ctx) return; const t = this.tracks[name]; if (!t) return;
    this._sfxVoices = this._sfxVoices.filter(x => !x.done);
    if (this._sfxVoices.length > 6) { const old = this._sfxVoices.shift(); old.stopNow(); }
    const v = this._makeVoice(this.sfxBus);
    const st = this._newState(name, t, v, false, 1); st.time = this.ctx.currentTime + 0.01;
    st.stopNow = () => { v.stop(); st.done = true; };
    let guard = 0; while (!st.ended && guard++ < 600) this._scheduleFrame(st);
    setTimeout(() => { v.stop(); st.done = true; }, (st.time - this.ctx.currentTime) * 1000 + 300);
    this._sfxVoices.push(st);
  }
}
