// Suoni semplici sintetizzati con WebAudio: partono solo dopo il primo tocco.
export const Suoni = {
  ctx: null, out: null, rumore: null, attivo: true, ultimo: {},

  avvia() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      this.ctx = new C();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.55;
      // un'eco morbida che dà spazio ai suoni
      const eco = this.ctx.createDelay(); eco.delayTime.value = 0.18;
      const fb = this.ctx.createGain(); fb.gain.value = 0.28;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.out.connect(this.ctx.destination);
      this.out.connect(eco); eco.connect(lp); lp.connect(fb); fb.connect(eco); lp.connect(this.ctx.destination);
      const n = this.ctx.sampleRate;
      this.rumore = this.ctx.createBuffer(1, n, n);
      const d = this.rumore.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },

  ok(nome, minGap = 0.06) {
    if (!this.ctx || !this.attivo) return false;
    const t = this.ctx.currentTime;
    if (this.ultimo[nome] && t - this.ultimo[nome] < minGap) return false;
    this.ultimo[nome] = t;
    return true;
  },

  nota(f, dur, tipo = 'sine', vol = 0.2, dopo = 0, f2 = null) {
    const c = this.ctx, t = c.currentTime + dopo;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  },

  soffio(dur, tipo, f1, f2, vol = 0.2, dopo = 0, q = 1) {
    const c = this.ctx, t = c.currentTime + dopo;
    const s = c.createBufferSource(); s.buffer = this.rumore; s.loop = true;
    const f = c.createBiquadFilter(); f.type = tipo; f.Q.value = q;
    f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  },

  prendi() { if (this.ok('prendi')) this.nota(660, 0.09, 'sine', 0.12, 0, 880); },
  tonfo() { if (this.ok('tonfo')) { this.nota(180, 0.22, 'triangle', 0.3, 0, 70); this.soffio(0.18, 'lowpass', 600, 200, 0.12); } },
  splash() { if (this.ok('splash', 0.1)) { this.soffio(0.45, 'bandpass', 1800, 500, 0.32, 0, 0.8); this.nota(900, 0.12, 'sine', 0.08, 0.02, 1500); } },
  fiamma() { if (this.ok('fiamma', 0.15)) this.soffio(0.7, 'lowpass', 300, 2600, 0.3, 0, 0.7); },
  vento() { if (this.ok('vento', 0.2)) this.soffio(1.1, 'bandpass', 500, 1500, 0.22, 0, 2.5); },
  sfrigola() { if (this.ok('sfrigola', 0.35)) this.soffio(0.8, 'highpass', 2500, 6000, 0.12); },
  cresce() { if (this.ok('cresce', 0.12)) { this.nota(392, 0.18, 'sine', 0.1, 0, 620); this.nota(784, 0.2, 'triangle', 0.05, 0.08); } },
  pop() { if (this.ok('pop', 0.08)) this.nota(520, 0.12, 'sine', 0.16, 0, 980); },
  crollo() { if (this.ok('crollo', 0.3)) { this.nota(120, 0.4, 'triangle', 0.3, 0.05, 50); this.soffio(0.5, 'lowpass', 800, 150, 0.2, 0.05); } },
  goccia() { if (this.ok('goccia', 0.05)) this.nota(1200 + Math.random() * 600, 0.05, 'sine', 0.025, 0, 600); },
  scoperta() {
    if (!this.ok('scoperta', 0.3)) return;
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.nota(f, 0.6, 'triangle', 0.16, i * 0.085));
    [1568, 2093].forEach((f, i) => this.nota(f, 0.5, 'sine', 0.05, 0.36 + i * 0.07));
  },
  catena(n) {
    if (!this.ok('catena', 0.4)) return;
    const base = 440 * Math.pow(2, Math.min(n, 8) / 12);
    this.nota(base, 0.25, 'square', 0.04); this.nota(base * 1.5, 0.3, 'triangle', 0.08, 0.06);
  },
};
