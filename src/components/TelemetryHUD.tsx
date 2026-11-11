import React from 'react';
import { CarTelemetry, DriverStanding, GameMode, RaceSession } from '../types/game';

interface TelemetryHUDProps {
  telemetry: CarTelemetry;
  session: RaceSession;
  standings: DriverStanding[];
  mode: GameMode;
  radioMessage: string | null;
  gantryCount: number; // 0..5, 6 = GO
  onRequestPitStop: () => void;
  onRequestRadioCheck?: () => void;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  telemetry,
  session,
  standings,
  mode,
  radioMessage,
  gantryCount,
  onRequestPitStop,
  onRequestRadioCheck,
}) => {
  // Format milliseconds into MM:SS.mmm
  const formatTime = (ms: number) => {
    if (ms <= 0) return '--:--.---';
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const millis = Math.floor((totalSec % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  // RPM LEDs (9 segments)
  const rpmRatio = telemetry.rpm / telemetry.maxRpm;
  const activeLeds = Math.min(9, Math.floor(rpmRatio * 11));

  // Player position
  const playerStanding = standings.find(s => s.isPlayer);
  const position = playerStanding ? playerStanding.position : 1;

  // High speed edge vignette intensity
  const speedRatio = Math.min(1.0, Math.max(0, (telemetry.speedKmh - 200) / 130));
  // High lateral G-force stress intensity
  const gStressRatio = Math.min(1.0, Math.max(0, (Math.abs(telemetry.lateralG) - 2.2) / 1.6));

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-['Chakra_Petch',sans-serif] text-white">
      {/* Dynamic High-Speed Tunnel Vignette */}
      {speedRatio > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: speedRatio * 0.75,
            background: 'radial-gradient(circle at center, transparent 45%, rgba(0, 210, 190, 0.08) 75%, rgba(2, 6, 23, 0.6) 100%)',
          }}
        />
      )}

      {/* Dynamic Cockpit Lateral G-Force Stress Vignette */}
      {gStressRatio > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: gStressRatio * 0.65,
            background: 'radial-gradient(circle at center, transparent 55%, rgba(239, 68, 68, 0.12) 80%, rgba(225, 6, 0, 0.45) 100%)',
          }}
        />
      )}

      {/* 1. Gantry Lights Countdown & Race Ingress Diagnostics Banner */}
      {gantryCount > 0 && gantryCount <= 6 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 z-40">
          <div className="bg-[#0b0e14] border-2 border-[#1f2633] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((lightIdx) => {
              const isOn = gantryCount < 6 && lightIdx <= gantryCount;
              return (
                <div key={lightIdx} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full border-2 transition-colors duration-100 ${
                      isOn
                        ? 'bg-[#FF0018] border-[#FF4D58] shadow-[0_0_20px_#FF0018]'
                        : 'bg-[#1a0507] border-[#380e12]'
                    }`}
                  />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1a2332]" />
                </div>
              );
            })}
          </div>

          {/* Ingress Systems Check Graphic */}
          {gantryCount < 6 && (
            <div className="bg-[#0c1017]/95 border border-[#00D2BE]/50 px-4 py-1.5 rounded-lg flex items-center gap-2.5 text-[11px] font-mono text-[#00D2BE] tracking-wider shadow-[0_0_15px_rgba(0,210,190,0.25)]">
              <span className="font-bold">SYSTEMS INGRESS</span>
              <span className="text-[#475569]">·</span>
              <span>MGU-K READY</span>
              <span className="text-[#475569]">·</span>
              <span>ERS 100%</span>
              <span className="text-[#475569]">·</span>
              <span className="text-[#F59E0B]">DRS STANDBY</span>
            </div>
          )}

          {gantryCount === 6 && (
            <div className="bg-[#00D2BE] text-black font-extrabold tracking-widest text-lg px-6 py-1.5 rounded-full shadow-[0_0_25px_#00D2BE]">
              LIGHTS OUT AND AWAY WE GO!
            </div>
          )}
        </div>
      )}

      {/* Pit Lane Ingress & Speed Limiter Active Banner */}
      {telemetry.inPitLane && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#0b0e14]/95 border-2 border-[#F59E0B] px-5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center gap-4 z-40 animate-fadeIn">
          <div className="w-3.5 h-3.5 bg-[#F59E0B] rounded-full shadow-[0_0_10px_#F59E0B]" />
          <div className="flex flex-col">
            <span className="text-xs font-black text-[#F59E0B] tracking-widest uppercase font-['Orbitron',sans-serif]">
              PIT INGRESS // SPEED LIMITER ENGAGED
            </span>
            <span className="text-[11px] text-[#cbd5e1] font-mono">
              LIMIT: 80 KM/H · SERVICE CREW READY AT BOX
            </span>
          </div>
          <div className="bg-[#F59E0B] text-black font-black px-2.5 py-1 rounded text-xs font-mono">
            80 KM/H
          </div>
        </div>
      )}

      {/* Approaching Pit Entry Ingress Notification */}
      {telemetry.pitRequested && !telemetry.inPitLane && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#0b0e14]/95 border border-[#00D2BE] px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(0,210,190,0.3)] flex items-center gap-3 z-30">
          <span className="text-xs font-bold text-[#00D2BE] font-mono">
            PIT INGRESS CONFIRMED ▼ FOLLOW HOLOGRAPHIC CHEVRONS INTO PIT LANE
          </span>
        </div>
      )}

      {/* 2. Top Perimeter Bar: Position, Laps, Times & Sector Deltas */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        {/* Left: Position & Lap */}
        <div className="flex items-center gap-3">
          {mode !== 'TIME_TRIAL' ? (
            <div className="flex items-stretch rounded-lg overflow-hidden border border-[#2a3547] bg-[#0c1017]">
              <div className="bg-[#e10600] text-white px-3.5 py-1.5 flex items-center justify-center font-bold text-xl tracking-wider">
                P{position}
              </div>
              <div className="px-3 py-1.5 flex flex-col justify-center">
                <span className="text-[10px] text-[#7d8b9e] uppercase tracking-widest">POSITION</span>
                <span className="text-sm font-bold text-[#e1e7f0]">
                  {position} / {session.totalCars}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#00D2BE]/40 bg-[#0c1017]">
              <div className="w-3 h-3 rounded-full bg-[#00D2BE]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#00D2BE] uppercase tracking-widest font-bold">TIME TRIAL</span>
                <span className="text-xs text-white">HOTLAP MODE</span>
              </div>
            </div>
          )}

          {/* Lap Counter */}
          <div className="px-3.5 py-1.5 rounded-lg border border-[#2a3547] bg-[#0c1017] flex flex-col">
            <span className="text-[10px] text-[#7d8b9e] uppercase tracking-widest">
              {mode === 'TIME_TRIAL' ? 'LAPS COMPLETED' : 'LAP'}
            </span>
            <span className="text-base font-bold text-white tabular-nums">
              {session.currentLap} {mode !== 'TIME_TRIAL' ? `/ ${session.totalLaps}` : ''}
            </span>
          </div>
        </div>

        {/* Center: Team Radio Pop-up Broadcast Graphic */}
        {radioMessage && (
          <div className="bg-[#0b0e14]/95 border-2 border-[#00D2BE] px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(0,210,190,0.3)] flex items-center gap-3 animate-fadeIn max-w-md">
            {/* Animated Audio Waveform */}
            <div className="flex items-center gap-0.5 h-4">
              <span className="w-1 bg-[#00D2BE] h-full rounded-full animate-pulse" />
              <span className="w-1 bg-[#00D2BE] h-2.5 rounded-full animate-pulse" />
              <span className="w-1 bg-[#00D2BE] h-3.5 rounded-full animate-pulse" />
              <span className="w-1 bg-[#00D2BE] h-2 rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[#00D2BE] tracking-widest uppercase flex items-center gap-1.5">
                <span>TEAM RADIO // RACE ENGINEER</span>
              </span>
              <span className="text-xs font-bold text-white tracking-wide">{radioMessage}</span>
            </div>
          </div>
        )}

        {/* Right: Lap Times & Sector Splits */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg border border-[#2a3547] bg-[#0c1017] flex flex-col items-end">
            <span className="text-[10px] text-[#7d8b9e] uppercase tracking-widest">CURRENT LAP</span>
            <span className="text-base font-bold text-white tabular-nums tracking-wide">
              {formatTime(session.currentLapTime)}
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-lg border border-[#2a3547] bg-[#0c1017] flex flex-col items-end">
            <span className="text-[10px] text-[#A855F7] uppercase tracking-widest">BEST LAP</span>
            <span className="text-base font-bold text-[#D8B4FE] tabular-nums tracking-wide">
              {formatTime(session.bestLapTime)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Off-Track & Curb Warning Indicators */}
      {telemetry.isOffTrack && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#D97706] text-black font-extrabold text-xs tracking-widest px-4 py-1 rounded shadow-lg uppercase">
          OFF-TRACK LIMITS WARNING
        </div>
      )}

      {/* 4. Bottom F1 Steering Wheel Telemetry Cluster (Unobstructed center viewport) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30">
        <div className="bg-[#0b0e14] border border-[#1f2838] px-5 py-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
          {/* RPM LED Rev Bar (9 segments) */}
          <div className="flex items-center gap-1.5 w-full justify-between px-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const active = i < activeLeds;
              let colorClass = 'bg-[#1c2433]';
              if (active) {
                if (i < 3) colorClass = 'bg-[#10B981] shadow-[0_0_8px_#10B981]'; // Green
                else if (i < 6) colorClass = 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]'; // Yellow
                else if (i < 8) colorClass = 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'; // Red
                else colorClass = 'bg-[#A855F7] shadow-[0_0_10px_#A855F7]'; // Purple shift point
              }
              return <div key={i} className={`h-2 flex-1 rounded-sm transition-colors duration-75 ${colorClass}`} />;
            })}
          </div>

          {/* Main Cluster: Speed, Gear, DRS, ERS */}
          <div className="flex items-center gap-6">
            {/* Speedometer */}
            <div className="flex flex-col items-center min-w-[90px]">
              <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight font-['Orbitron',sans-serif]">
                {telemetry.speedKmh}
              </span>
              <span className="text-[9px] text-[#7d8b9e] uppercase tracking-widest">KM/H</span>
            </div>

            {/* Gear Indicator */}
            <div className="flex flex-col items-center bg-[#141b27] border border-[#232e42] px-4 py-1.5 rounded-lg">
              <span className="text-2xl font-black text-[#00D2BE] font-['Orbitron',sans-serif]">
                {telemetry.gear === 0 ? 'N' : telemetry.gear === -1 ? 'R' : telemetry.gear}
              </span>
              <span className="text-[8px] text-[#7d8b9e] tracking-widest">GEAR</span>
            </div>

            {/* DRS & ERS Status Cluster */}
            <div className="flex flex-col gap-1.5 min-w-[100px]">
              {/* DRS Badge */}
              <div
                className={`text-[10px] font-bold text-center px-2 py-0.5 rounded border transition-colors ${
                  telemetry.drsActive
                    ? 'bg-[#10B981] border-[#34D399] text-black font-extrabold shadow-[0_0_10px_#10B981]'
                    : telemetry.drsAvailable
                    ? 'bg-[#14231b] border-[#10B981] text-[#34D399]'
                    : 'bg-[#141821] border-[#222a38] text-[#556377]'
                }`}
              >
                DRS {telemetry.drsActive ? 'ACTIVE' : telemetry.drsAvailable ? 'READY' : 'CLOSED'}
              </div>

              {/* ERS Battery Gauge */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] text-[#7d8b9e] font-semibold">
                  <span>ERS BOOST</span>
                  <span className="text-[#00D2BE] tabular-nums">{telemetry.ersCharge}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#141924] rounded-full overflow-hidden border border-[#20293a]">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      telemetry.ersDeploying
                        ? 'bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]'
                        : 'bg-[#00D2BE]'
                    }`}
                    style={{ width: `${telemetry.ersCharge}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fuel Gauge */}
            <div className="flex flex-col gap-1 min-w-[75px] pl-2 border-l border-[#20293a]">
              <div className="flex justify-between text-[8px] text-[#7d8b9e] font-semibold">
                <span>FUEL</span>
                <span className={`tabular-nums ${telemetry.fuelKg < 5 ? 'text-[#EF4444] font-bold' : 'text-[#38BDF8]'}`}>
                  {telemetry.fuelKg} kg
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#141924] rounded-full overflow-hidden border border-[#20293a]">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    telemetry.fuelKg < 5 ? 'bg-[#EF4444]' : 'bg-[#38BDF8]'
                  }`}
                  style={{ width: `${telemetry.fuelPercent}%` }}
                />
              </div>
              <span className="text-[7px] text-[#64748b] text-center">
                ~{(telemetry.fuelKg / 2.5).toFixed(1)} LAPS
              </span>
            </div>

            {/* 4 Tires Temperature & Wear Preview */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#20293a]">
              <div className="flex flex-col gap-1">
                <div
                  className={`w-3.5 h-4 rounded-xs border text-[7px] flex items-center justify-center font-bold ${
                    telemetry.tireWear[0] > 70
                      ? 'bg-[#EF4444] text-white border-[#F87171]'
                      : 'bg-[#131a26] text-[#7d8b9e] border-[#253247]'
                  }`}
                  title={`FL: ${telemetry.tireWear[0]}% wear, ${telemetry.tireTemp[0]}°C`}
                >
                  FL
                </div>
                <div
                  className={`w-3.5 h-4 rounded-xs border text-[7px] flex items-center justify-center font-bold ${
                    telemetry.tireWear[2] > 70
                      ? 'bg-[#EF4444] text-white border-[#F87171]'
                      : 'bg-[#131a26] text-[#7d8b9e] border-[#253247]'
                  }`}
                  title={`RL: ${telemetry.tireWear[2]}% wear, ${telemetry.tireTemp[2]}°C`}
                >
                  RL
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div
                  className={`w-3.5 h-4 rounded-xs border text-[7px] flex items-center justify-center font-bold ${
                    telemetry.tireWear[1] > 70
                      ? 'bg-[#EF4444] text-white border-[#F87171]'
                      : 'bg-[#131a26] text-[#7d8b9e] border-[#253247]'
                  }`}
                  title={`FR: ${telemetry.tireWear[1]}% wear, ${telemetry.tireTemp[1]}°C`}
                >
                  FR
                </div>
                <div
                  className={`w-3.5 h-4 rounded-xs border text-[7px] flex items-center justify-center font-bold ${
                    telemetry.tireWear[3] > 70
                      ? 'bg-[#EF4444] text-white border-[#F87171]'
                      : 'bg-[#131a26] text-[#7d8b9e] border-[#253247]'
                  }`}
                  title={`RR: ${telemetry.tireWear[3]}% wear, ${telemetry.tireTemp[3]}°C`}
                >
                  RR
                </div>
              </div>
            </div>

            {/* Damage Indicator */}
            {telemetry.damage > 0 && (
              <div className="flex flex-col items-center justify-center px-2 border-l border-[#20293a]">
                <span className="text-[7px] text-[#EF4444] font-bold tracking-widest uppercase">WING DMG</span>
                <span className="text-xs font-black font-mono text-[#EF4444]">
                  {telemetry.damage}%
                </span>
                <span className="text-[6px] text-[#F87171]">BOX TO REPAIR</span>
              </div>
            )}

            {/* Pit Stop Button / Call */}
            <div className="pl-2 border-l border-[#20293a]">
              <button
                onClick={onRequestPitStop}
                className={`px-2.5 py-2 rounded-lg text-[10px] font-bold tracking-wider pointer-events-auto transition-all cursor-pointer flex flex-col items-center justify-center ${
                  telemetry.pitRequested
                    ? 'bg-[#E10600] text-white shadow-[0_0_12px_#E10600]'
                    : telemetry.damage > 0 || telemetry.tireWear.some((w) => w > 55) || telemetry.fuelKg < 8
                    ? 'bg-[#F59E0B]/20 border border-[#F59E0B] text-[#F59E0B] animate-pulse'
                    : 'bg-[#141b27] border border-[#232e42] text-[#94a3b8] hover:text-white'
                }`}
                title="Toggle Pit Stop Request (B)"
              >
                <span>{telemetry.pitRequested ? 'BOXING!' : 'BOX (B)'}</span>
                <span className="text-[7px] text-white/70">PIT STOP</span>
              </button>
            </div>

            {/* Radio Check Button */}
            <div className="pl-2 border-l border-[#20293a]">
              <button
                onClick={onRequestRadioCheck}
                className="px-2.5 py-2 rounded-lg text-[10px] font-bold tracking-wider pointer-events-auto transition-all cursor-pointer flex flex-col items-center justify-center bg-[#141b27] border border-[#232e42] text-[#00D2BE] hover:bg-[#1a2538] hover:border-[#00D2BE]"
                title="Ask Race Engineer Status (R)"
              >
                <span>RADIO (R)</span>
                <span className="text-[7px] text-white/70">COMMS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Standings Ladder (Top 5 cars on mid-left, compact and semi-transparent) */}
      {mode !== 'TIME_TRIAL' && (
        <div className="absolute top-20 left-4 flex flex-col gap-1 w-44">
          <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider px-1">LEADERBOARD</div>
          {standings.slice(0, 5).map((driver) => (
            <div
              key={driver.id}
              className={`flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                driver.isPlayer
                  ? 'bg-[#00D2BE]/20 border border-[#00D2BE]/60 text-white font-bold'
                  : 'bg-[#0d121c]/80 border border-[#1b2333]/80 text-[#94a3b8]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-4 text-[10px] text-[#64748b] font-bold">P{driver.position}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: driver.primaryColor }}
                />
                <span className="truncate">{driver.driverName.split(' ').pop()}</span>
              </div>
              <span className="text-[10px] tabular-nums font-mono text-[#cbd5e1]">
                {driver.gapToLeader}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
