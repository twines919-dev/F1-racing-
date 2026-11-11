import { audioEngine } from './audioEngine';

/**
 * Voice-Based Formula 1 Race Engineer System
 * Provides authentic synthesized voice audio feedback for gap times,
 * tire degradation status, fuel levels, and pit stop tactical instructions.
 * Zero external dependencies: uses native browser Web Speech API & Web Audio squelch.
 */

export type RadioPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface RadioTransmission {
  id: string;
  speaker: string; // e.g. "RACE ENGINEER (BONO)"
  text: string;
  spokenText: string;
  priority: RadioPriority;
  timestamp: number;
}

export type RadioMessageCallback = (transmission: RadioTransmission) => void;

class RaceEngineerSystem {
  private isVoiceEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private messageQueue: RadioTransmission[] = [];
  private onMessageCallbacks: RadioMessageCallback[] = [];

  // Cooldown timers to avoid repetitive spamming
  private lastGapReportTime: number = 0;
  private lastTireReportTime: number = 0;
  private lastFuelReportTime: number = 0;
  private lastSpokenCategory: string = '';

  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Prefer British English ("en-GB") or crisp natural English voices for an authentic F1 pit wall engineer tone (e.g. Peter Bonnington / GP)
    const preferredVoice =
      voices.find((v) => v.lang === 'en-GB' && (v.name.includes('Male') || v.name.includes('Natural') || v.name.includes('George') || v.name.includes('Daniel'))) ||
      voices.find((v) => v.lang === 'en-GB') ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    this.selectedVoice = preferredVoice || null;
  }

  public subscribe(cb: RadioMessageCallback) {
    this.onMessageCallbacks.push(cb);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter((c) => c !== cb);
    };
  }

  public setVoiceEnabled(enabled: boolean) {
    this.isVoiceEnabled = enabled;
    if (!enabled && this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  public getVoiceEnabled(): boolean {
    return this.isVoiceEnabled;
  }

  /**
   * Broadcast and speak radio message
   */
  public transmit(transmission: Omit<RadioTransmission, 'id' | 'timestamp'>) {
    const fullTransmission: RadioTransmission = {
      ...transmission,
      id: `radio_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    // Notify UI listeners (subtitles/visual HUD)
    this.onMessageCallbacks.forEach((cb) => cb(fullTransmission));

    if (!this.isVoiceEnabled || audioEngine.getIsMuted() || !this.synth) {
      return;
    }

    // High priority cuts to front of queue
    if (transmission.priority === 'CRITICAL') {
      this.synth.cancel();
      this.messageQueue = [fullTransmission];
    } else {
      // Discard low priority if already busy
      if (this.messageQueue.length >= 2) return;
      this.messageQueue.push(fullTransmission);
    }

    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.messageQueue.length === 0 || !this.synth) {
      this.isSpeaking = false;
      return;
    }

    const next = this.messageQueue.shift()!;
    this.isSpeaking = true;

    // Play F1 electronic radio beep / squelch intro
    audioEngine.playRadioSquelchStart();

    const utterance = new SpeechSynthesisUtterance(next.spokenText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // F1 radio parameters: brisk motorsport cadence
    utterance.rate = 1.08;
    utterance.pitch = 0.96;
    utterance.volume = 0.9;

    utterance.onend = () => {
      // Play radio release click
      audioEngine.playRadioSquelchEnd();
      setTimeout(() => {
        this.processQueue();
      }, 350);
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    // Brief 80ms pause after squelch click before voice speaks
    setTimeout(() => {
      if (this.synth) {
        this.synth.speak(utterance);
      }
    }, 85);
  }

  // ================= TACTICAL ENGINEER RADIO CALLS =================

  /**
   * Report gap times to leader and car behind
   */
  public reportGap(position: number, gapToLeader: string, carAheadName?: string) {
    const now = Date.now();
    if (now - this.lastGapReportTime < 24000) return; // 24s cooldown
    this.lastGapReportTime = now;

    let text = '';
    let spoken = '';

    if (position === 1) {
      text = `P1. Leading the Grand Prix. Maintain consistent delta.`;
      spoken = `P1, you are leading the Grand Prix. Gap behind is safe, maintain consistent pace.`;
    } else if (position === 2) {
      text = `P2. Gap to leader is ${gapToLeader}. Pushing hard.`;
      spoken = `P2, gap to leader is ${gapToLeader.replace('+', '')}. You are closing them down. Keep pushing.`;
    } else {
      const leaderSec = gapToLeader.replace('+', '').replace('s', '');
      text = `P${position}. Gap to leader ${gapToLeader}. Keep the pressure on.`;
      spoken = `P${position}. Gap to the leader is ${leaderSec} seconds. You have good race pace, keep the pressure on.`;
    }

    this.transmit({
      speaker: 'RACE ENGINEER',
      text,
      spokenText: spoken,
      priority: 'NORMAL',
    });
  }

  /**
   * Report tire degradation and temperature status
   */
  public reportTireStatus(compound: string, maxWear: number, tireTemp: number) {
    const now = Date.now();
    if (now - this.lastTireReportTime < 28000) return;
    this.lastTireReportTime = now;

    let text = '';
    let spoken = '';
    let priority: RadioPriority = 'NORMAL';

    if (maxWear >= 70) {
      priority = 'HIGH';
      text = `WARNING: Tire wear critical at ${maxWear}%. Grip dropping rapidly. Box this lap!`;
      spoken = `Tires are critical at ${maxWear} percent wear. Grip is dropping off. Box, box this lap.`;
    } else if (maxWear >= 50) {
      text = `Tire wear is ${maxWear}%. Front degradation increasing. Manage corner entry.`;
      spoken = `Tires are at ${maxWear} percent wear. Front degradation is increasing, manage corner entry.`;
    } else {
      text = `Tire temps optimal at ${tireTemp}°C on the ${compound}s. Thermal window looks good.`;
      spoken = `Tire temps are nominal at ${tireTemp} degrees on the ${compound}s. Grip is strong.`;
    }

    this.transmit({
      speaker: 'RACE ENGINEER',
      text,
      spokenText: spoken,
      priority,
    });
  }

  /**
   * Report fuel quantity and remaining laps
   */
  public reportFuelStatus(fuelKg: number, lapsRemaining: number) {
    const now = Date.now();
    if (now - this.lastFuelReportTime < 32000) return;
    this.lastFuelReportTime = now;

    let text = '';
    let spoken = '';
    let priority: RadioPriority = 'NORMAL';

    if (fuelKg <= 5) {
      priority = 'CRITICAL';
      text = `FUEL CRITICAL: ${fuelKg} kg remaining (~${lapsRemaining.toFixed(1)} laps). Lift and coast into heavy braking!`;
      spoken = `Fuel critical! ${fuelKg} kilos remaining. Lift and coast into heavy braking zones. Box to refuel.`;
    } else if (fuelKg <= 12) {
      text = `Fuel alert: ${fuelKg} kg remaining. On target for stint plan.`;
      spoken = `Fuel update: ${fuelKg} kilos remaining, approximately ${lapsRemaining.toFixed(0)} laps. Delta looks good.`;
    }

    if (text) {
      this.transmit({
        speaker: 'RACE ENGINEER',
        text,
        spokenText: spoken,
        priority,
      });
    }
  }

  /**
   * Tactical Pit Stop Instructions
   */
  public reportPitInstruction(
    instruction: 'BOX_THIS_LAP' | 'PIT_WINDOW_OPEN' | 'WING_DAMAGE' | 'BOX_ABORT' | 'GREEN_LIGHT_GO'
  ) {
    let text = '';
    let spoken = '';
    let priority: RadioPriority = 'HIGH';

    switch (instruction) {
      case 'BOX_THIS_LAP':
        priority = 'CRITICAL';
        text = `BOX, BOX, BOX! Confirm pit entry this lap. Pit limiter 80 km/h.`;
        spoken = `Box, box, box! Box this lap. Confirm pit entry. Keep it on the limiter.`;
        break;

      case 'PIT_WINDOW_OPEN':
        text = `PIT WINDOW OPEN: In-lap available. We are ready on fresh tires.`;
        spoken = `Pit window is open. Ready on the pit wall when you decide to box.`;
        break;

      case 'WING_DAMAGE':
        priority = 'CRITICAL';
        text = `AERO DAMAGE: Front wing damage detected. Box this lap for a nose swap.`;
        spoken = `Aero damage detected on the front wing. High speed downforce compromised. Box this lap for a nose swap.`;
        break;

      case 'BOX_ABORT':
        text = `STAY OUT, STAY OUT! Pit call aborted. Continue stint.`;
        spoken = `Stay out, stay out! Pit call aborted. Continue current stint.`;
        break;

      case 'GREEN_LIGHT_GO':
        priority = 'HIGH';
        text = `GREEN LIGHT! Go, go, go! Hammer time out of pit exit!`;
        spoken = `Green light, go, go, go! Great pit stop, hammer time out of pit exit!`;
        break;
    }

    this.transmit({
      speaker: 'RACE ENGINEER',
      text,
      spokenText: spoken,
      priority,
    });
  }

  /**
   * Fastest Lap Notification
   */
  public reportFastestLap(lapTimeStr: string) {
    this.transmit({
      speaker: 'RACE ENGINEER',
      text: `FASTEST LAP: ${lapTimeStr}! Purple sector, magnificent pace.`,
      spokenText: `Fastest lap of the Grand Prix, ${lapTimeStr}. Purple sector, mega drive.`,
      priority: 'NORMAL',
    });
  }

  /**
   * Final Lap
   */
  public reportFinalLap() {
    this.transmit({
      speaker: 'RACE ENGINEER',
      text: `FINAL LAP! One lap to checkered flag. Bring it home!`,
      spokenText: `Final lap! Last lap to the checkered flag, stay focused and bring it home!`,
      priority: 'CRITICAL',
    });
  }

  /**
   * Manual Radio Check query (triggered on hotkey 'R' or clicking "RADIO CHECK" on HUD)
   */
  public requestRadioCheck(
    position: number,
    gap: string,
    tireWear: number,
    fuelKg: number,
    tireCompound: string
  ) {
    const text = `RADIO CHECK: Loud & clear. P${position}, gap ${gap}. Tires ${tireWear}% (${tireCompound}), fuel ${fuelKg}kg.`;
    const spoken = `Loud and clear. You are P${position}, gap ${gap.replace('+', '')}. Tires are at ${tireWear} percent, fuel ${fuelKg} kilos. Pace looks strong, keep pushing.`;

    this.transmit({
      speaker: 'RACE ENGINEER',
      text,
      spokenText: spoken,
      priority: 'HIGH',
    });
  }
}

export const raceEngineer = new RaceEngineerSystem();
