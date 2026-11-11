import React, { useState, useEffect, useRef } from 'react';
import { CarTelemetry, PitStrategyChoice, TireCompound } from '../types/game';
import { audioEngine } from '../game/audioEngine';
import {
  Wrench,
  Fuel,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  Gauge,
  Flame,
} from 'lucide-react';

interface PitStopModalProps {
  telemetry: CarTelemetry;
  onCompletePitStop: (choice: PitStrategyChoice, finalStopTimeSec: number) => void;
  onCancelPitStop?: () => void;
}

export const PitStopModal: React.FC<PitStopModalProps> = ({
  telemetry,
  onCompletePitStop,
}) => {
  // Pit Strategy State
  const [selectedCompound, setSelectedCompound] = useState<TireCompound>('SOFT');
  const [fuelToAdd, setFuelToAdd] = useState<number>(15); // default 15 kg
  const [repairDamage, setRepairDamage] = useState<boolean>(telemetry.damage > 0);
  const [stage, setStage] = useState<'STRATEGY' | 'CREW_ACTION' | 'COMPLETE'>('STRATEGY');

  // Pit Crew Action Timing & Progress State
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [targetDurationMs, setTargetDurationMs] = useState<number>(3000);
  const [sliderPos, setSliderPos] = useState<number>(50); // 0..100
  const [timingBonusSec, setTimingBonusSec] = useState<number>(0);
  const [hasHitTiming, setHasHitTiming] = useState<boolean>(false);

  // Wheel status
  const [wheelsDone, setWheelsDone] = useState<{ fl: boolean; fr: boolean; rl: boolean; rr: boolean }>({
    fl: false,
    fr: false,
    rl: false,
    rr: false,
  });

  // Wing replacement status
  const [wingRepairPhase, setWingRepairPhase] = useState<'IDLE' | 'UNLATCHING' | 'SWAPPING' | 'SECURED'>('IDLE');
  // Fueling progress
  const [fuelDeliveredKg, setFuelDeliveredKg] = useState<number>(0);
  // Jacks status
  const [carJacked, setCarJacked] = useState<boolean>(true);
  const [lollipopGreen, setLollipopGreen] = useState<boolean>(false);

  const [finalStopTime, setFinalStopTime] = useState<number>(2.4);
  const [stopRating, setStopRating] = useState<'WORLD_RECORD' | 'EXCELLENT' | 'GOOD' | 'NORMAL'>('EXCELLENT');

  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Calculate dynamic target service duration
  const baseTireTime = 2.1;
  const wingRepairTime = repairDamage ? 2.4 : 0;
  const fuelTime = fuelToAdd * 0.035;
  const estimatedTotalSec = Number((baseTireTime + wingRepairTime + fuelTime).toFixed(2));

  // High-speed moving cursor for interactive wheel gun timing bonus during crew action
  useEffect(() => {
    if (stage !== 'CREW_ACTION' || hasHitTiming) return;

    let pos = 10;
    let speed = 2.8;
    let dir = 1;

    const loop = () => {
      pos += speed * dir;
      if (pos >= 96) {
        pos = 96;
        dir = -1;
      } else if (pos <= 4) {
        pos = 4;
        dir = 1;
      }
      setSliderPos(pos);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [stage, hasHitTiming]);

  // Handle confirming strategy and starting the pit crew sequence
  const handleConfirmStrategy = () => {
    const totalMs = Math.round(estimatedTotalSec * 1000);
    setTargetDurationMs(totalMs);
    setStage('CREW_ACTION');
    startTimeRef.current = performance.now();
    audioEngine.playBoxRadio();

    // Trigger initial wheel gun audio burst
    setTimeout(() => {
      audioEngine.playWheelGun();
    }, 250);
  };

  // Interactive Timing Hit (Spacebar / Tap during crew action)
  const handleHitTiming = () => {
    if (hasHitTiming || stage !== 'CREW_ACTION') return;

    setHasHitTiming(true);
    audioEngine.playWheelGun();

    // Distance from center (50) is error
    const error = Math.abs(sliderPos - 50);
    if (error <= 8) {
      // Purple World Record zone!
      setTimingBonusSec(-0.55);
      setStopRating('WORLD_RECORD');
    } else if (error <= 22) {
      // Green zone
      setTimingBonusSec(-0.35);
      setStopRating('EXCELLENT');
    } else if (error <= 36) {
      setTimingBonusSec(-0.15);
      setStopRating('GOOD');
    } else {
      // Red / slow nut
      setTimingBonusSec(0.45);
      setStopRating('NORMAL');
    }
  };

  // Live Pit Crew Action Timer & Synchronized Task Phases
  useEffect(() => {
    if (stage !== 'CREW_ACTION') return;

    let wingAudioPlayed = false;
    let jackDropPlayed = false;
    let lollipopPlayed = false;

    const interval = setInterval(() => {
      const now = performance.now();
      const currentElapsed = now - startTimeRef.current;
      setElapsedMs(currentElapsed);

      const progress = Math.min(1.0, currentElapsed / targetDurationMs);

      // Phase 1: 4-Wheel Tire Guns Sequence (0% -> 60%)
      if (progress >= 0.15 && !wheelsDone.fl) {
        setWheelsDone((prev) => ({ ...prev, fl: true }));
      }
      if (progress >= 0.3 && !wheelsDone.fr) {
        setWheelsDone((prev) => ({ ...prev, fr: true }));
      }
      if (progress >= 0.45 && !wheelsDone.rl) {
        setWheelsDone((prev) => ({ ...prev, rl: true }));
      }
      if (progress >= 0.6 && !wheelsDone.rr) {
        setWheelsDone((prev) => ({ ...prev, rr: true }));
      }

      // Phase 2: Front Wing Replacement (if repair selected, 10% -> 85%)
      if (repairDamage) {
        if (progress >= 0.15 && progress < 0.45) {
          setWingRepairPhase('UNLATCHING');
        } else if (progress >= 0.45 && progress < 0.78) {
          if (!wingAudioPlayed) {
            wingAudioPlayed = true;
            audioEngine.playWingRepair();
          }
          setWingRepairPhase('SWAPPING');
        } else if (progress >= 0.78) {
          setWingRepairPhase('SECURED');
        }
      }

      // Phase 3: Fueling Delivery Progress
      if (fuelToAdd > 0) {
        const delivered = Math.min(fuelToAdd, Number((progress * fuelToAdd).toFixed(1)));
        setFuelDeliveredKg(delivered);
      }

      // Phase 4: Jack Drop (88%)
      if (progress >= 0.88 && carJacked) {
        setCarJacked(false);
        if (!jackDropPlayed) {
          jackDropPlayed = true;
          audioEngine.playJackDrop();
        }
      }

      // Phase 5: Lollipop Release (96% -> 100%)
      if (progress >= 0.96 && !lollipopGreen) {
        setLollipopGreen(true);
        if (!lollipopPlayed) {
          lollipopPlayed = true;
          audioEngine.playLollipopGo();
        }
      }

      // Complete Service
      if (currentElapsed >= targetDurationMs) {
        clearInterval(interval);
        const actualSec = Number(Math.max(1.82, (targetDurationMs / 1000) + timingBonusSec).toFixed(2));
        setFinalStopTime(actualSec);
        setStage('COMPLETE');

        // Automatically return car to track after celebratory summary
        setTimeout(() => {
          onCompletePitStop(
            {
              newCompound: selectedCompound,
              fuelToAddKg: fuelToAdd,
              repairDamage,
            },
            actualSec
          );
        }, 1800);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [stage, targetDurationMs, repairDamage, fuelToAdd, timingBonusSec, carJacked, lollipopGreen, wheelsDone, onCompletePitStop, selectedCompound]);

  // Keyboard shortcut (Space / Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        if (stage === 'STRATEGY') {
          handleConfirmStrategy();
        } else if (stage === 'CREW_ACTION') {
          handleHitTiming();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, sliderPos, hasHitTiming]);

  // Visual Timer calculation
  const overallProgress = Math.min(1.0, elapsedMs / (targetDurationMs || 1));
  const circleRadius = 54;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - overallProgress * circumference;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xs font-['Chakra_Petch',sans-serif] text-white pointer-events-auto select-none">
      <div className="bg-[#0b0f17] border-2 border-[#1f293b] max-w-3xl w-full rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#1b2333] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E10600]/20 border border-[#E10600] flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#E10600]" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#E10600] uppercase tracking-widest">
                FIA FORMULA 1 PIT SERVICE LANE • BOX BOX BOX
              </div>
              <h2 className="text-2xl font-black text-white font-['Orbitron',sans-serif]">
                {stage === 'STRATEGY' ? 'PIT STOP STRATEGY & DAMAGE REPAIR' : 'PIT CREW ACTION IN PROGRESS'}
              </h2>
            </div>
          </div>

          {/* Pit Stopwatch Header */}
          <div className="bg-[#121824] px-4 py-2 rounded-xl border border-[#1f2838] flex items-center gap-3">
            <Timer className="w-5 h-5 text-[#00D2BE]" />
            <div className="text-right font-mono">
              <span className="text-[9px] text-[#7d8b9e] uppercase block font-sans">
                {stage === 'CREW_ACTION' ? 'LIVE STOPWATCH' : 'TARGET ESTIMATE'}
              </span>
              <span className="text-2xl font-bold text-[#00D2BE] tabular-nums">
                {stage === 'CREW_ACTION'
                  ? `${(elapsedMs / 1000).toFixed(2)}s`
                  : `${estimatedTotalSec.toFixed(2)}s`}
              </span>
            </div>
          </div>
        </div>

        {/* ================= STAGE 1: STRATEGY, TIRES & DAMAGE REPAIR ================= */}
        {stage === 'STRATEGY' && (
          <div className="flex flex-col gap-4">
            {/* Top Cards: Current Tires, Fuel & Damage Inspection */}
            <div className="grid grid-cols-3 gap-3">
              {/* Card 1: Tire Status */}
              <div className="bg-[#121824] p-3 rounded-2xl border border-[#1b2333] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7d8b9e] uppercase font-bold">CURRENT TIRE DEGRADATION</span>
                  <span className="text-[10px] font-bold text-[#cbd5e1]">{telemetry.tireCompound}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono font-bold my-1">
                  <div className="flex justify-between px-1.5 py-0.5 rounded bg-[#18202d]">
                    <span className="text-[#94a3b8]">FL:</span>
                    <span className={telemetry.tireWear[0] > 60 ? 'text-[#EF4444]' : 'text-white'}>
                      {telemetry.tireWear[0]}%
                    </span>
                  </div>
                  <div className="flex justify-between px-1.5 py-0.5 rounded bg-[#18202d]">
                    <span className="text-[#94a3b8]">FR:</span>
                    <span className={telemetry.tireWear[1] > 60 ? 'text-[#EF4444]' : 'text-white'}>
                      {telemetry.tireWear[1]}%
                    </span>
                  </div>
                  <div className="flex justify-between px-1.5 py-0.5 rounded bg-[#18202d]">
                    <span className="text-[#94a3b8]">RL:</span>
                    <span className={telemetry.tireWear[2] > 60 ? 'text-[#EF4444]' : 'text-white'}>
                      {telemetry.tireWear[2]}%
                    </span>
                  </div>
                  <div className="flex justify-between px-1.5 py-0.5 rounded bg-[#18202d]">
                    <span className="text-[#94a3b8]">RR:</span>
                    <span className={telemetry.tireWear[3] > 60 ? 'text-[#EF4444]' : 'text-white'}>
                      {telemetry.tireWear[3]}%
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-[#64748b]">Tires will be swapped to 0% fresh</span>
              </div>

              {/* Card 2: Damage Inspection */}
              <div className={`p-3 rounded-2xl border flex flex-col justify-between ${
                telemetry.damage > 0
                  ? 'bg-[#1a1417] border-[#EF4444]/50'
                  : 'bg-[#121824] border-[#1b2333]'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7d8b9e] uppercase font-bold flex items-center gap-1">
                    {telemetry.damage > 0 ? <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />}
                    <span>DAMAGE DIAGNOSTIC</span>
                  </span>
                  <span className={`text-[10px] font-bold ${telemetry.damage > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                    {telemetry.damage > 0 ? `${telemetry.damage}% DAMAGE` : 'NOMINAL'}
                  </span>
                </div>

                <div className="my-1">
                  {telemetry.damage > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white">Front Wing & Aero Endplate</span>
                      <span className="text-[10px] text-[#F87171]">
                        -{(telemetry.damage * 0.35).toFixed(0)}% High-Speed Downforce Loss
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#94a3b8]">Composite chassis & wings intact. Zero structural aero penalty.</p>
                  )}
                </div>

                <div className="text-[9px] text-[#64748b]">
                  {telemetry.damage > 0 ? 'Repair available in pit service' : 'No repairs required'}
                </div>
              </div>

              {/* Card 3: Fuel Level */}
              <div className="bg-[#121824] p-3 rounded-2xl border border-[#1b2333] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7d8b9e] uppercase font-bold">CURRENT FUEL CELL</span>
                  <span className="text-[10px] font-mono text-[#38BDF8] font-bold">{telemetry.fuelKg} kg</span>
                </div>
                <div className="flex items-baseline justify-between my-1">
                  <span className="text-lg font-bold font-mono text-white">
                    {telemetry.fuelPercent}%
                  </span>
                  <span className="text-xs text-[#94a3b8]">
                    ~{(telemetry.fuelKg / 2.5).toFixed(1)} Laps Left
                  </span>
                </div>
                <div className="w-full bg-[#1b2333] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#38BDF8] h-full"
                    style={{ width: `${telemetry.fuelPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Strategy Section 1: Tire Compounds */}
            <div>
              <div className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CircleDot className="w-4 h-4 text-[#00D2BE]" />
                <span>SELECT FRESH TIRE COMPOUND</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'SOFT' as TireCompound,
                    name: 'SOFT (C5 / Red)',
                    color: '#E10600',
                    badge: 'Max Pace',
                    desc: 'Fastest lap time (-0.8s), high grip, 2-3 lap life',
                  },
                  {
                    id: 'MEDIUM' as TireCompound,
                    name: 'MEDIUM (C3 / Yellow)',
                    color: '#F59E0B',
                    badge: 'Optimal',
                    desc: 'Balanced grip & wear, 4-5 lap life',
                  },
                  {
                    id: 'HARD' as TireCompound,
                    name: 'HARD (C1 / White)',
                    color: '#FFFFFF',
                    badge: 'Endurance',
                    desc: 'Longest lasting compound, durable, 6+ lap life',
                  },
                ].map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedCompound(comp.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      selectedCompound === comp.id
                        ? 'border-[#00D2BE] bg-[#00D2BE]/10 shadow-[0_0_15px_rgba(0,210,190,0.3)]'
                        : 'border-[#1b2333] bg-[#121722] hover:border-[#2a384f]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: comp.color }} />
                        <span className="font-bold text-sm text-white">{comp.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#94a3b8] px-1.5 py-0.5 rounded bg-[#18202e]">
                        {comp.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7d8b9e]">{comp.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy Section 2: Damage Repair Management */}
            <div className="bg-[#121824] p-4 rounded-2xl border border-[#1b2333]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#E10600]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    AERODYNAMIC DAMAGE REPAIR & FRONT WING SWAP
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#10B981]">
                  {repairDamage ? '+2.4s Crew Time' : '+0.0s (Skip Repair)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => setRepairDamage(true)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    repairDamage
                      ? 'border-[#10B981] bg-[#10B981]/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : 'border-[#1b2333] bg-[#0e131d] hover:border-[#253247]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    repairDamage ? 'border-[#10B981] bg-[#10B981]' : 'border-[#334155]'
                  }`}>
                    {repairDamage && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <span>REPLACE FRONT WING & REPAIR CHASSIS</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981]">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      Snaps on a brand-new carbon nosecone. Restores damage to <strong>0%</strong> and gives back <strong>100% aerodynamic downforce</strong>.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRepairDamage(false)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                    !repairDamage
                      ? 'border-[#E10600] bg-[#E10600]/10 shadow-[0_0_12px_rgba(225,6,0,0.2)]'
                      : 'border-[#1b2333] bg-[#0e131d] hover:border-[#253247]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    !repairDamage ? 'border-[#E10600] bg-[#E10600]' : 'border-[#334155]'
                  }`}>
                    {!repairDamage && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">SKIP REPAIR (KEEP DAMAGED WING)</div>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">
                      Faster pit stop turnaround (+0.0s), but front wing retains aerodynamic drag and high-speed corner understeer.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Strategy Section 3: Refuel Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-[#38BDF8]" />
                  <span>REFUEL FUEL LOAD: +{fuelToAdd} KG</span>
                </div>
                <span className="text-xs text-[#cbd5e1] font-mono">
                  Post-Stop: {Math.min(50, Number((telemetry.fuelKg + fuelToAdd).toFixed(1)))} / 50 kg (~
                  {((telemetry.fuelKg + fuelToAdd) / 2.5).toFixed(1)} Laps)
                </span>
              </div>

              <div className="flex gap-2">
                {[0, 10, 15, 25, 35].map((preset) => {
                  const maxPossible = Math.max(0, 50 - Math.round(telemetry.fuelKg));
                  const disabled = preset > maxPossible;
                  return (
                    <button
                      key={preset}
                      disabled={disabled}
                      onClick={() => setFuelToAdd(preset)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        fuelToAdd === preset
                          ? 'bg-[#38BDF8] text-black font-extrabold shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                          : disabled
                          ? 'bg-[#151c27] text-[#475569] cursor-not-allowed'
                          : 'bg-[#141b27] text-[#94a3b8] hover:text-white border border-[#1f2838]'
                      }`}
                    >
                      {preset === 0 ? 'No Refuel' : `+${preset} kg`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Confirmation Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1b2333]">
              <div className="flex items-center gap-4 text-xs text-[#94a3b8]">
                <span>Tires: <strong className="text-white">{selectedCompound}</strong></span>
                <span>Repair: <strong className={repairDamage ? 'text-[#10B981]' : 'text-[#EF4444]'}>{repairDamage ? 'YES (100% Aero)' : 'SKIPPED'}</strong></span>
                <span>Fuel: <strong className="text-[#38BDF8]">+{fuelToAdd} kg</strong></span>
              </div>

              <button
                onClick={handleConfirmStrategy}
                className="bg-[#E10600] hover:bg-[#c20500] text-white font-black text-sm px-8 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(225,6,0,0.5)] flex items-center gap-3 cursor-pointer font-['Orbitron',sans-serif] tracking-wider transition-transform hover:scale-105 active:scale-95"
              >
                <span>COMMENCE PIT CREW SEQUENCE</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal font-sans">
                  SPACE / ENTER
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 2: LIVE PIT CREW ACTION WITH VISUAL TIMER ================= */}
        {stage === 'CREW_ACTION' && (
          <div className="flex flex-col gap-6 py-2 items-center">
            {/* Visual Timer Display Centerpiece */}
            <div className="flex items-center justify-center gap-10 w-full px-4">
              {/* Radial SVG Circular Visual Timer */}
              <div className="relative flex items-center justify-center">
                <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 120 120">
                  {/* Track Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    className="stroke-[#161f2e]"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Animated Progress Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r={circleRadius}
                    className="stroke-[#00D2BE] transition-all duration-75"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Digital Stopwatch Readout */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] text-[#7d8b9e] font-bold uppercase tracking-wider">PIT TIMER</span>
                  <span className="text-3xl font-black font-['Orbitron',sans-serif] text-white tabular-nums">
                    {(elapsedMs / 1000).toFixed(2)}s
                  </span>
                  <span className="text-[9px] text-[#00D2BE] font-mono">
                    / {estimatedTotalSec.toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Live Task Progress Stations */}
              <div className="flex-1 flex flex-col gap-2.5 bg-[#121824] p-4 rounded-2xl border border-[#1b2333]">
                <div className="text-[10px] text-[#7d8b9e] font-bold uppercase tracking-wider border-b border-[#1b2333] pb-1 flex justify-between">
                  <span>PIT CREW STATIONS</span>
                  <span className="text-[#00D2BE] font-mono font-bold">
                    {Math.round(overallProgress * 100)}% COMPLETE
                  </span>
                </div>

                {/* Station 1: Front Wing & Aero Repair */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Wrench className={`w-4 h-4 ${repairDamage ? 'text-[#E10600]' : 'text-[#64748b]'}`} />
                    <span className="font-bold text-white">Front Wing Replacement</span>
                  </div>
                  {repairDamage ? (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      wingRepairPhase === 'SECURED'
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : wingRepairPhase === 'SWAPPING'
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B] animate-pulse'
                        : 'bg-[#18202e] text-[#94a3b8]'
                    }`}>
                      {wingRepairPhase === 'SECURED' ? 'LATCHED (100% Aero)' : wingRepairPhase === 'SWAPPING' ? 'SWAPPING NOSE...' : 'UNBOLTING WING...'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#64748b]">CLEAN (SKIPPED)</span>
                  )}
                </div>

                {/* Station 2: 4-Wheel Tire Guns */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-[#00D2BE]" />
                    <span className="font-bold text-white">4-Wheel Nut Guns (FL, FR, RL, RR)</span>
                  </div>
                  <div className="flex gap-1">
                    {['fl', 'fr', 'rl', 'rr'].map((w) => {
                      const done = wheelsDone[w as keyof typeof wheelsDone];
                      return (
                        <span
                          key={w}
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            done ? 'bg-[#10B981] text-black' : 'bg-[#18202e] text-[#64748b]'
                          }`}
                        >
                          {w}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Station 3: Refueling */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-[#38BDF8]" />
                    <span className="font-bold text-white">Fuel Delivery Rig</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#38BDF8] font-bold">
                    {fuelToAdd > 0 ? `+${fuelDeliveredKg} / ${fuelToAdd} kg` : 'NO FUEL REQUESTED'}
                  </span>
                </div>

                {/* Station 4: Jacks & Lollipop Release */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-[#F59E0B]" />
                    <span className="font-bold text-white">Jacks & Release Signal</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    lollipopGreen
                      ? 'bg-[#10B981] text-black font-extrabold shadow-[0_0_10px_#10B981]'
                      : 'bg-[#18202e] text-[#94a3b8]'
                  }`}>
                    {lollipopGreen ? 'GO GO GO!' : carJacked ? 'CAR JACKED UP' : 'DROPPED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Precision Reaction Bar */}
            <div className="w-full max-w-xl flex flex-col gap-1.5 bg-[#0e141f] p-4 rounded-2xl border border-[#1b2333]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#00D2BE]" />
                  <span>INTERACTIVE WHEEL GUN / RELEASE TIMING</span>
                </span>
                <span className="text-[11px] text-[#A855F7] font-bold">
                  {hasHitTiming ? 'TIMING RECORDED!' : 'PRESS SPACE TO HIT SWEET SPOT'}
                </span>
              </div>

              <div className="relative w-full h-11 bg-[#121824] rounded-2xl border border-[#20293a] overflow-hidden flex items-center">
                {/* Outer slow zone */}
                <div className="absolute left-0 w-[25%] h-full bg-[#EF4444]/20 border-r border-[#EF4444]/40" />
                <div className="absolute right-0 w-[25%] h-full bg-[#EF4444]/20 border-l border-[#EF4444]/40" />
                {/* Good zone */}
                <div className="absolute left-[25%] w-[50%] h-full bg-[#10B981]/25 flex items-center justify-center" />
                {/* Purple World Record zone */}
                <div className="absolute left-[44%] w-[12%] h-full bg-[#A855F7] shadow-[0_0_15px_#A855F7] flex items-center justify-center text-[9px] font-black tracking-widest text-white">
                  FAST
                </div>

                {/* Moving Indicator */}
                {!hasHitTiming && (
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-white shadow-[0_0_10px_#FFFFFF] rounded-full transition-none pointer-events-none"
                    style={{ left: `calc(${sliderPos}% - 5px)` }}
                  />
                )}
              </div>

              <div className="flex justify-between text-[9px] font-bold text-[#64748b] px-1">
                <span>SLOW NUT</span>
                <span className="text-[#34D399]">GOOD STOP</span>
                <span className="text-[#D8B4FE]">WORLD RECORD (1.8s)</span>
                <span className="text-[#34D399]">GOOD STOP</span>
                <span>SLOW NUT</span>
              </div>

              <button
                onClick={handleHitTiming}
                disabled={hasHitTiming}
                className={`w-full py-3 rounded-xl font-black text-sm tracking-wider uppercase transition-transform cursor-pointer font-['Orbitron',sans-serif] mt-1 ${
                  hasHitTiming
                    ? 'bg-[#15202e] text-[#64748b] cursor-default'
                    : 'bg-[#00D2BE] text-black hover:bg-[#00bda9] active:scale-95 shadow-[0_0_20px_rgba(0,210,190,0.4)]'
                }`}
              >
                {hasHitTiming ? '✓ TIMING LOCKED IN' : '⚡ HIT PRECISION SWEET SPOT (SPACE)'}
              </button>
            </div>
          </div>
        )}

        {/* ================= STAGE 3: PIT SERVICE COMPLETE ================= */}
        {stage === 'COMPLETE' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center animate-fadeIn">
            <div
              className={`text-6xl font-black font-['Orbitron',sans-serif] tracking-tight tabular-nums ${
                stopRating === 'WORLD_RECORD'
                  ? 'text-[#A855F7] drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]'
                  : stopRating === 'EXCELLENT'
                  ? 'text-[#10B981] drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                  : 'text-[#F59E0B]'
              }`}
            >
              {finalStopTime}s
            </div>

            <div className="text-xl font-bold uppercase tracking-wider text-white">
              {stopRating === 'WORLD_RECORD' && '🏆 WORLD RECORD PIT STOP! SUB-2.0s MASTERCLASS'}
              {stopRating === 'EXCELLENT' && '✨ OUTSTANDING PIT STOP! CLEAN FAST WORK'}
              {stopRating === 'GOOD' && '⚡ CLEAN SOLID PIT SERVICE'}
              {stopRating === 'NORMAL' && '⚠️ PIT CREW SERVICE COMPLETED'}
            </div>

            <div className="flex items-center gap-4 bg-[#121824] px-6 py-2.5 rounded-xl border border-[#1b2333] text-xs">
              <span className="text-white">Fitted: <strong className="text-[#00D2BE]">{selectedCompound} Tires (0% Wear)</strong></span>
              <span>•</span>
              <span className="text-white">Damage: <strong className="text-[#10B981]">{repairDamage ? '0% Repaired (100% Aero)' : `${telemetry.damage}%`}</strong></span>
              <span>•</span>
              <span className="text-white">Fuel: <strong className="text-[#38BDF8]">+{fuelToAdd} kg</strong></span>
            </div>

            <p className="text-xs text-[#94a3b8] animate-pulse">
              Lollipop Green! Accelerating out of pit lane past the white line...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
