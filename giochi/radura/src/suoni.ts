/** I suoni, tutti fabbricati al momento con formule: nessun file audio. */
export class Suoni {
  private ctx: AudioContext | null = null;
  private uscita: GainNode | null = null;
  private rumore: AudioBuffer | null = null;
  private fuocoGuadagno: GainNode | null = null;
  private crolloGuadagno: GainNode | null = null;

  /** Va chiamato dopo un tocco o un clic: i browser non fanno partire l'audio prima. */
  avvia(): void {
    if (this.ctx) {
      void this.ctx.resume().catch(() => undefined);
      return;
    }
    try {
      const ctx = new AudioContext();
      void ctx.resume().catch(() => undefined);
      this.ctx = ctx;
      this.uscita = ctx.createGain();
      this.uscita.gain.value = 0.5;
      this.uscita.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const dati = buf.getChannelData(0);
      for (let i = 0; i < dati.length; i++) dati[i] = Math.random() * 2 - 1;
      this.rumore = buf;
      // Crepitio continuo del fuoco, a volume zero finché non brucia qualcosa.
      const sorgente = ctx.createBufferSource();
      sorgente.buffer = buf;
      sorgente.loop = true;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.value = 900;
      filtro.Q.value = 0.4;
      this.fuocoGuadagno = ctx.createGain();
      this.fuocoGuadagno.gain.value = 0;
      sorgente.connect(filtro).connect(this.fuocoGuadagno).connect(this.uscita);
      sorgente.start();
      // Il rombo dei crolli: lo stesso rumore, ma cupo. Sale mentre i pezzi cadono e tace quando si fermano.
      const rombo = ctx.createBufferSource();
      rombo.buffer = buf;
      rombo.loop = true;
      const cupo = ctx.createBiquadFilter();
      cupo.type = 'lowpass';
      cupo.frequency.value = 140;
      this.crolloGuadagno = ctx.createGain();
      this.crolloGuadagno.gain.value = 0;
      rombo.connect(cupo).connect(this.crolloGuadagno).connect(this.uscita);
      rombo.start(0, 0.7);
    } catch {
      this.ctx = null;
    }
  }

  /** Riaccende l'audio se il telefono lo ha sospeso (va chiamato dentro un tocco). */
  sveglia(): void {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  volumeFuoco(quanto: number): void {
    if (!this.ctx || !this.fuocoGuadagno) return;
    this.fuocoGuadagno.gain.setTargetAtTime(Math.min(0.35, quanto), this.ctx.currentTime, 0.3);
  }

  volumeCrollo(quanto: number): void {
    if (!this.ctx || !this.crolloGuadagno) return;
    this.crolloGuadagno.gain.setTargetAtTime(Math.min(0.5, quanto), this.ctx.currentTime, 0.12);
  }

  /** Un pezzo che batte a terra. */
  tonfo(forza: number): void {
    this.nota(0.18, 90 + Math.random() * 40, 40, 0.25 * forza);
    this.fruscio(0.12, 600, 120, 0.2 * forza, 'lowpass');
  }

  /** Un luogo scoperto, una meta raggiunta. */
  scoperta(): void {
    [392, 523, 659, 784].forEach((hz, i) => this.nota(0.6, hz, hz, 0.1, 'sine', i * 0.08));
  }

  /** Un incantesimo trovato: più solenne. */
  tesoro(): void {
    [262, 392, 523, 659, 784, 1047].forEach((hz, i) => this.nota(1.1, hz, hz, 0.12, 'triangle', i * 0.11));
  }

  private fruscio(durata: number, daHz: number, aHz: number, volume: number, tipo: BiquadFilterType = 'bandpass'): void {
    const ctx = this.ctx;
    if (!ctx || !this.uscita || !this.rumore) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.rumore;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = tipo;
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(daHz, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, aHz), t + durata);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + Math.min(0.03, durata * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    s.connect(f).connect(g).connect(this.uscita);
    s.start(t, Math.random());
    s.stop(t + durata + 0.05);
  }

  private nota(durata: number, daHz: number, aHz: number, volume: number, forma: OscillatorType = 'sine', ritardo = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.uscita) return;
    const t = ctx.currentTime + ritardo;
    const o = ctx.createOscillator();
    o.type = forma;
    o.frequency.setValueAtTime(daHz, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, aHz), t + durata);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(g).connect(this.uscita);
    o.start(t);
    o.stop(t + durata + 0.05);
  }

  botto(forza: number): void {
    this.nota(0.5 + forza * 0.9, 130, 28, 0.9 * forza, 'sine');
    this.fruscio(0.4 + forza * 1.2, 1800, 90, 0.8 * forza, 'lowpass');
  }

  soffio(): void {
    this.fruscio(0.35, 500, 2200, 0.25);
  }

  vento(): void {
    this.fruscio(1.6, 240, 520, 0.22);
  }

  gelo(): void {
    this.fruscio(0.7, 7000, 2500, 0.22, 'highpass');
    for (let i = 0; i < 5; i++) this.nota(0.25, 1800 + Math.random() * 2400, 1500, 0.07, 'triangle', i * 0.05);
  }

  saetta(): void {
    this.fruscio(0.25, 6000, 400, 0.7, 'highpass');
    this.nota(1.1, 90, 30, 0.8, 'sawtooth', 0.03);
    this.fruscio(1.4, 900, 60, 0.5, 'lowpass');
  }

  fioritura(): void {
    [523, 659, 784, 1047, 1319].forEach((hz, i) => this.nota(0.7, hz, hz, 0.1, 'sine', i * 0.09));
  }

  carica(durata: number): void {
    this.nota(durata, 70, 420, 0.22, 'sawtooth');
    this.fruscio(durata, 300, 3000, 0.12);
  }

  risucchio(durata: number): void {
    this.nota(durata, 160, 34, 0.3, 'sine');
    this.fruscio(durata, 1400, 120, 0.2);
  }

  ricostruzione(): void {
    [392, 523, 659].forEach((hz, i) => this.nota(0.5, hz, hz * 1.01, 0.1, 'triangle', i * 0.07));
  }
}
