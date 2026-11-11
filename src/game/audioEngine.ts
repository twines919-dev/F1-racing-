/**
 * Procedural Web Audio API Engine for F1 Racing Simulation
 * Zero 404 dependencies: all audio is generated synthetically in real time.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineGain: GainNode | null = null;
  private oscBase: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private oscSub: OscillatorNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Tire squeal nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireNoiseGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  // Wind rush noise
  private windNoiseGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Curb rumble
  private curbGain: GainNode | null = null;
  private curbOsc: OscillatorNode | null = null;

  // Titanium floor scrape & spark sound
  private skidNoiseNode: AudioBufferSourceNode | null = null;
  private skidNoiseGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Pit limiter & overrun state
  private prevThrottle: number = 0;
  private lastBackfireTime: number = 0;
  private pitLimiterOsc: OscillatorNode | null = null;
  private pitLimiterGain: GainNode | null = null;

  private isRunning: boolean = false;

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master volume
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupEngineSynth();
    this.setupTireSqueal();
    this.setupWindNoise();
    this.setupCurbSynth();
    this.setupSkidScrape();
    this.setupPitLimiterSynth();
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(3200, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Fundamental V6 oscillator (sawtooth for aggressive mechanical bite)
    this.oscBase = this.ctx.createOscillator();
    this.oscBase.type = 'sawtooth';
    this.oscBase.frequency.setValueAtTime(80, this.ctx.currentTime);

    // Harmonic oscillator (triangle for mid-range body)
    this.oscHarmonic = this.ctx.createOscillator();
    this.oscHarmonic.type = 'sawtooth';
    this.oscHarmonic.frequency.setValueAtTime(160, this.ctx.currentTime);

    // Sub harmonic (square wave for cylinder firing punch)
    this.oscSub = this.ctx.createOscillator();
    this.oscSub.type = 'square';
    this.oscSub.frequency.setValueAtTime(40, this.ctx.currentTime);

    // Turbocharger high-frequency spool whine
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.turboOsc.connect(this.turboGain);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.oscSub.connect(subGain);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.oscHarmonic.connect(harmonicGain);

    this.oscBase.connect(this.engineFilter);
    subGain.connect(this.engineFilter);
    harmonicGain.connect(this.engineFilter);
    this.turboGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.oscBase.start();
    this.oscHarmonic.start();
    this.oscSub.start();
    this.turboOsc.start();
  }

  private setupTireSqueal() {
    if (!this.ctx || !this.masterGain) return;

    // Generate looping white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = buffer;
    this.tireNoiseNode.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.tireNoiseGain = this.ctx.createGain();
    this.tireNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireNoiseGain);
    this.tireNoiseGain.connect(this.masterGain);

    this.tireNoiseNode.start();
  }

  private setupWindNoise() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.windNoiseGain = this.ctx.createGain();
    this.windNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windNoiseGain);
    this.windNoiseGain.connect(this.masterGain);

    windSource.start();
  }

  private setupCurbSynth() {
    if (!this.ctx || !this.masterGain) return;

    this.curbOsc = this.ctx.createOscillator();
    this.curbOsc.type = 'triangle';
    this.curbOsc.frequency.setValueAtTime(38, this.ctx.currentTime);

    this.curbGain = this.ctx.createGain();
    this.curbGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.curbOsc.connect(this.curbGain);
    this.curbGain.connect(this.masterGain);

    this.curbOsc.start();
  }

  private setupSkidScrape() {
    if (!this.ctx || !this.masterGain) return;

    // High frequency metallic scrape for titanium floor spark contact
    const bufferSize = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.skidNoiseNode = this.ctx.createBufferSource();
    this.skidNoiseNode.buffer = buffer;
    this.skidNoiseNode.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.setValueAtTime(3600, this.ctx.currentTime);
    this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.skidNoiseGain = this.ctx.createGain();
    this.skidNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.skidNoiseNode.connect(this.skidFilter);
    this.skidFilter.connect(this.skidNoiseGain);
    this.skidNoiseGain.connect(this.masterGain);

    this.skidNoiseNode.start();
  }

  private setupPitLimiterSynth() {
    if (!this.ctx || !this.masterGain) return;

    // 22Hz staccato ignition cut LFO for authentic F1 pit limiter chatter
    this.pitLimiterOsc = this.ctx.createOscillator();
    this.pitLimiterOsc.type = 'square';
    this.pitLimiterOsc.frequency.setValueAtTime(22, this.ctx.currentTime);

    this.pitLimiterGain = this.ctx.createGain();
    this.pitLimiterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.pitLimiterOsc.connect(this.pitLimiterGain);
    this.pitLimiterOsc.start();
  }

  public ensureStarted() {
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isRunning = true;
  }

  public updateEngine(
    rpm: number,
    throttle: number,
    speedRatio: number,
    isDrifting: boolean,
    onCurb: boolean,
    inPitLane: boolean = false,
    isSparking: boolean = false
  ) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Map RPM (3000..15000) to fundamental Hz (50..310Hz)
    const baseFreq = 50 + (rpm / 15000) * 260;
    
    if (this.oscBase) this.oscBase.frequency.setTargetAtTime(baseFreq, now, 0.035);
    if (this.oscHarmonic) this.oscHarmonic.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.035);
    if (this.oscSub) this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.035);

    // Turbo spooling sound
    if (this.turboOsc && this.turboGain) {
      const turboPitch = 1300 + (rpm / 15000) * 2400;
      this.turboOsc.frequency.setTargetAtTime(turboPitch, now, 0.06);
      const turboVol = throttle * 0.09 * (rpm > 7500 ? 1 : 0.25);
      this.turboGain.gain.setTargetAtTime(turboVol, now, 0.06);
    }

    // Engine volume & Pit limiter staccato ignition cut
    if (this.engineGain) {
      let targetGain = 0.24 + throttle * 0.32 + (rpm / 15000) * 0.16;
      if (inPitLane && throttle > 0.15) {
        // Pit limiter stutter: oscillating ignition cut at 22Hz
        const flutter = Math.sin(now * 138) > 0 ? 0.08 : 0.38;
        targetGain = flutter;
      }
      this.engineGain.gain.setTargetAtTime(targetGain, now, inPitLane ? 0.015 : 0.04);
    }

    // Throttle overrun crackle detection (sharp lift-off at high RPM)
    if (this.prevThrottle > 0.65 && throttle < 0.22 && rpm > 9000 && now - this.lastBackfireTime > 1.2) {
      this.lastBackfireTime = now;
      this.playExhaustBackfires(Math.floor(2 + Math.random() * 3));
    }
    this.prevThrottle = throttle;

    // Filter frequency opens up with RPM and throttle
    if (this.engineFilter) {
      const cutoff = 1600 + (rpm / 15000) * 4800 + throttle * 1400;
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.04);
    }

    // Tire squeal sound
    if (this.tireNoiseGain) {
      const tireVol = isDrifting ? 0.36 : 0;
      this.tireNoiseGain.gain.setTargetAtTime(tireVol, now, 0.05);
    }

    // Wind turbulence & aerodynamic roar
    if (this.windNoiseGain && this.windFilter) {
      const windVol = Math.min(Math.pow(speedRatio, 1.4) * 0.26, 0.26);
      this.windNoiseGain.gain.setTargetAtTime(windVol, now, 0.08);
      this.windFilter.frequency.setTargetAtTime(320 + speedRatio * 1100, now, 0.08);
    }

    // Curb vibration sound
    if (this.curbGain && this.curbOsc) {
      const curbVol = onCurb && speedRatio > 0.1 ? 0.22 : 0;
      this.curbGain.gain.setTargetAtTime(curbVol, now, 0.04);
      if (onCurb) {
        this.curbOsc.frequency.setTargetAtTime(26 + speedRatio * 44, now, 0.04);
      }
    }

    // Titanium skid floor scrape & sparks sound
    if (this.skidNoiseGain) {
      const skidVol = isSparking ? 0.24 : 0;
      this.skidNoiseGain.gain.setTargetAtTime(skidVol, now, 0.04);
    }
  }

  /**
   * Sound effect for gear shift with brief exhaust pop and downshift crackles
   */
  public triggerGearShift(isUpshift: boolean) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Brief engine dip
    if (this.engineGain) {
      this.engineGain.gain.setValueAtTime(0.06, now);
      this.engineGain.gain.exponentialRampToValueAtTime(0.35, now + 0.06);
    }

    // Downshift aggressive bark
    if (!isUpshift) {
      this.playExhaustBackfires(2);
    }

    // Exhaust pop noise
    const popOsc = this.ctx.createOscillator();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(isUpshift ? 190 : 130, now);
    popOsc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.3, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain!);

    popOsc.start(now);
    popOsc.stop(now + 0.09);
  }

  /**
   * Multi-burst sharp exhaust backfires on throttle lift-off & downshifts
   */
  public playExhaustBackfires(burstCount: number = 3) {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < burstCount; i++) {
      const popTime = now + i * 0.055 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      const startFreq = 260 + Math.random() * 120;
      osc.frequency.setValueAtTime(startFreq, popTime);
      osc.frequency.exponentialRampToValueAtTime(35, popTime + 0.04);

      gain.gain.setValueAtTime(0.25, popTime);
      gain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(popTime);
      osc.stop(popTime + 0.06);
    }
  }

  /**
   * Race Ingress / Systems Boot telemetry sweep chime
   */
  public playRaceIngressTone() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const freqs = [440, 660, 880, 1320];
    freqs.forEach((freq, idx) => {
      const t = now + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.16);
    });
  }

  /**
   * Pit Lane Ingress Confirmation Chime
   */
  public playPitIngressTone() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(960, now);
    osc1.frequency.setValueAtTime(1280, now + 0.08);

    osc2.frequency.setValueAtTime(480, now);
    osc2.frequency.setValueAtTime(640, now + 0.08);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  /**
   * Gantry start lights beep
   */
  public playGantryBeep(isGo: boolean) {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const freq = isGo ? 1200 : 660; // high launch tone vs red light tone
    const duration = isGo ? 0.35 : 0.18;

    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Team radio chime notification
   */
  public playRadioChime() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1320, now + 0.08);

    osc2.frequency.setValueAtTime(440, now);
    osc2.frequency.setValueAtTime(660, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  /**
   * Collision impact sound
   */
  public playCollisionSound(severity: number = 0.5) {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    const vol = Math.min(0.5, 0.15 + severity * 0.35);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Pneumatic Wheel Gun drill sound effect
   */
  public playWheelGun() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Rapid stuttering burst of high-frequency pulses
    for (let i = 0; i < 6; i++) {
      const pulseTime = now + i * 0.035;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600 + Math.random() * 300, pulseTime);
      osc.frequency.exponentialRampToValueAtTime(600, pulseTime + 0.025);

      gain.gain.setValueAtTime(0.22, pulseTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(pulseTime);
      osc.stop(pulseTime + 0.032);
    }
  }

  /**
   * Pneumatic car jack drop thud
   */
  public playJackDrop() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Front wing replacement / carbon snap click sound
   */
  public playWingRepair() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Dual mechanical snap
    for (let i = 0; i < 2; i++) {
      const snapTime = now + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + i * 200, snapTime);
      osc.frequency.exponentialRampToValueAtTime(160, snapTime + 0.05);

      gain.gain.setValueAtTime(0.35, snapTime);
      gain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(snapTime);
      osc.stop(snapTime + 0.07);
    }
  }

  /**
   * Pit engineer radio call: "Box, box, box!"
   */
  public playBoxRadio() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const toneTime = now + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(750, toneTime);

      gain.gain.setValueAtTime(0.18, toneTime);
      gain.gain.exponentialRampToValueAtTime(0.001, toneTime + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(toneTime);
      osc.stop(toneTime + 0.09);
    }
  }

  /**
   * Lollipop release light / Go tone
   */
  public playLollipopGo() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Radio comms squelch start beep / click (F1 Team Radio Intro)
   */
  public playRadioSquelchStart() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.setValueAtTime(880, now + 0.04);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Radio comms squelch end click (F1 Team Radio Outro)
   */
  public playRadioSquelchEnd() {
    this.ensureStarted();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stopAll() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.tireNoiseGain && this.ctx) {
      this.tireNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.windNoiseGain && this.ctx) {
      this.windNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    if (this.curbGain && this.ctx) {
      this.curbGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    this.isRunning = false;
  }
}

export const audioEngine = new AudioEngine();
