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

// Metal covers: the same notes rendered by a small "band" - lead guitar (pulse 1), power-chord rhythm guitar (pulse 2),
// overdriven bass (triangle) with a kick drum on every bass note, snare/hi-hat from the noise channel.
function distortionCurve(k) { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); } return c; }
function whiteNoise(ctx, sec) { const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; return b; }

export class Audio {
  constructor() {
    this.ctx = null; this.tracks = {}; this.current = null; this.muted = false; this.volume = 0.8;
    this.style = 'original'; try { this.style = localStorage.getItem('cnd3d_music') || 'original'; } catch (e) { }
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
    this.distHeavy = distortionCurve(60); this.distLead = distortionCurve(28); this.distBass = distortionCurve(6); this.white = whiteNoise(ctx, 1.0);
  }
  // 'original' (NES-style instruments) or 'metal'; the current tune restarts in the new style
  setStyle(style) {
    this.style = style; try { localStorage.setItem('cnd3d_music', style); } catch (e) { }
    if (this.current && !this.current.ended) { const { name, loop, vol, onEnd } = this.current; this.stopMusic(); this.playMusic(name, { loop, volume: vol }); if (this.current) this.current.onEnd = onEnd; }
  }
  // one distorted guitar: oscillators (frequency multipliers) -> drive -> waveshaper -> cabinet EQ -> output gain
  _guitar(bus, mults, curve, drive, cab, detuneCents, vibrato) {
    const ctx = this.ctx; const out = ctx.createGain(); out.gain.value = 0;
    const pre = ctx.createGain(); pre.gain.value = drive; const sh = ctx.createWaveShaper(); sh.curve = curve; sh.oversample = '4x';
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
    const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 750; mid.gain.value = -5; mid.Q.value = 0.9;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2400; pres.gain.value = 4;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cab; lp.Q.value = 0.8;
    pre.connect(sh); sh.connect(hp); hp.connect(mid); mid.connect(pres); pres.connect(lp); lp.connect(out); out.connect(bus);
    const osc = []; const mix = ctx.createGain(); mix.gain.value = 1 / (mults.length * 2); mix.connect(pre);
    let lfo = null; if (vibrato) { lfo = ctx.createOscillator(); lfo.frequency.value = 5.6; const lg = ctx.createGain(); lg.gain.value = vibrato; lfo.connect(lg); lfo.start(); lfo.out = lg; }
    for (const m of mults) for (const d of [-detuneCents, detuneCents]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = d; if (lfo) lfo.out.connect(o.detune); o.connect(mix); o.start(); osc.push([o, m]); }
    return { g: out, osc, last: null, stop() { for (const [o] of osc) { try { o.stop(); } catch (e) { } } if (lfo) try { lfo.stop(); } catch (e) { } } };
  }
  _makeMetalVoice(outBus) {
    const ctx = this.ctx; const bus = ctx.createGain(); bus.gain.value = 0.6; bus.connect(outBus); /* trim: match the loudness of the NES style */
    const lead = this._guitar(bus, [1], this.distLead, 9, 4800, 7, 14);
    const rhythm = this._guitar(bus, [1, 1.5, 2], this.distHeavy, 16, 3600, 9, 0);
    const bass = this._guitar(bus, [1, 0.5], this.distBass, 2.2, 1100, 4, 0);
    const drums = ctx.createGain(); drums.gain.value = 1; drums.connect(bus);
    return { metal: true, p1: lead, p2: rhythm, tri: bass, nz: { g: drums }, drums, nzLast: 0, stop() { lead.stop(); rhythm.stop(); bass.stop(); } };
  }
  _kick(v, time, amp) {
    const ctx = this.ctx; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
    g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(amp, time + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.3); o.connect(g); g.connect(v.drums); o.start(time); o.stop(time + 0.32);
    const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = this.white; hp.type = 'highpass'; hp.frequency.value = 2500; ng.gain.setValueAtTime(amp * 0.35, time); ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.012); n.connect(hp); hp.connect(ng); ng.connect(v.drums); n.start(time, Math.random() * 0.5); n.stop(time + 0.02);
  }
  _snare(v, time, amp) {
    const ctx = this.ctx; const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = this.white; bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    g.gain.setValueAtTime(amp, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2); n.connect(bp); bp.connect(g); g.connect(v.drums); n.start(time, Math.random() * 0.5); n.stop(time + 0.22);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, time); o.frequency.exponentialRampToValueAtTime(150, time + 0.08); og.gain.setValueAtTime(amp * 0.8, time); og.gain.exponentialRampToValueAtTime(0.0001, time + 0.1); o.connect(og); og.connect(v.drums); o.start(time); o.stop(time + 0.12);
  }
  _hat(v, time, amp) {
    const ctx = this.ctx; const n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = this.white; hp.type = 'highpass'; hp.frequency.value = 7500;
    g.gain.setValueAtTime(amp, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05); n.connect(hp); hp.connect(g); g.connect(v.drums); n.start(time, Math.random() * 0.5); n.stop(time + 0.06);
  }
  _scheduleMetal(st) {
    const time = st.time, v = st.v, vol = st.vol;
    const guitar = (ch, ev, kind) => {
      const on = ev && ev[2] > 0 && ev[1] >= 8;
      if (!on) { if (ch.last) ch.g.gain.setTargetAtTime(0, time, 0.03); ch.last = null; return; }
      let f = CPU / (16 * (ev[1] + 1)); if (kind === 'rhythm') { while (f > 230) f /= 2; } else { while (f > 1250) f /= 2; }
      const onset = !ch.last || ch.last.t !== ev[1] || ev[2] > ch.last.v;
      const lvl = (ev[2] / 15) * vol * (kind === 'rhythm' ? 0.2 : 0.24);
      if (onset) { for (const [o, m] of ch.osc) o.frequency.setTargetAtTime(f * m, time, kind === 'lead' && ch.last ? 0.012 : 0.002); ch.g.gain.cancelScheduledValues(time); ch.g.gain.setTargetAtTime(lvl, time, 0.004); ch.g.gain.setTargetAtTime(lvl * (kind === 'rhythm' ? 0.45 : 0.8), time + 0.03, kind === 'rhythm' ? 0.07 : 0.25); }
      else if (ev[2] < ch.last.v) ch.g.gain.setTargetAtTime(lvl * 0.8, time, 0.04);
      ch.last = { t: ev[1], v: ev[2] };
    };
    guitar(v.p1, this._advance(st, 'p1'), 'lead'); guitar(v.p2, this._advance(st, 'p2'), 'rhythm');
    const te = this._advance(st, 'tri');
    if (te && te[1] >= 2) {
      let f = CPU / (32 * (te[1] + 1)); while (f > 180) f /= 2; const onset = !v.tri.last || v.tri.last.t !== te[1];
      if (onset) { for (const [o, m] of v.tri.osc) o.frequency.setValueAtTime(f * m, time); v.tri.g.gain.cancelScheduledValues(time); v.tri.g.gain.setTargetAtTime(0.5 * vol, time, 0.003); v.tri.g.gain.setTargetAtTime(0.32 * vol, time + 0.04, 0.15); this._kick(v, time, 0.9 * vol); }
      v.tri.last = { t: te[1] };
    } else { if (v.tri.last) v.tri.g.gain.setTargetAtTime(0, time, 0.03); v.tri.last = null; }
    const ne = this._advance(st, 'noise'); const nv = ne ? ne[2] : 0;
    if (ne && nv >= 4 && (nv > v.nzLast + 2 || v.nzLast === 0)) { const amp = (nv / 15) * vol; if (ne[1] >= 8) this._snare(v, time, 0.75 * amp); else this._hat(v, time, 0.35 * amp); }
    v.nzLast = nv;
    st.time += FRAME;
    if (CHANNELS.every(ch => st.cur[ch].ended)) st.ended = true;
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
    if (st.v.metal) { this._scheduleMetal(st); return; }
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
    const v = this.style === 'metal' ? this._makeMetalVoice(this.musicBus) : this._makeVoice(this.musicBus);
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
