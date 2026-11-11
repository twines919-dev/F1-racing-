import React from 'react';
import confetti from 'canvas-confetti';
import { DriverStanding, GameMode, RaceSession } from '../types/game';
import { Trophy, Clock, Flag, RotateCcw, Home, Award, ArrowRight } from 'lucide-react';

interface PostRaceModalProps {
  mode: GameMode;
  session: RaceSession;
  standings: DriverStanding[];
  isNewPersonalBest: boolean;
  prizeMoneyWon: number;
  pointsEarned: number;
  onRestart: () => void;
  onContinue: () => void;
  onMainMenu: () => void;
}

export const PostRaceModal: React.FC<PostRaceModalProps> = ({
  mode,
  session,
  standings,
  isNewPersonalBest,
  prizeMoneyWon,
  pointsEarned,
  onRestart,
  onContinue,
  onMainMenu,
}) => {
  const playerStanding = standings.find(s => s.isPlayer);
  const position = playerStanding ? playerStanding.position : 1;
  const isPodium = position <= 3;

  React.useEffect(() => {
    if (isPodium || isNewPersonalBest) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#E10600', '#00D2BE', '#FFD700', '#FFFFFF'],
      });
    }
  }, [isPodium, isNewPersonalBest]);

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '--:--.---';
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const millis = Math.floor((totalSec % 1) * 1000);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xs font-['Chakra_Petch',sans-serif] text-white pointer-events-auto">
      <div className="bg-[#0b0f17] border border-[#20293a] max-w-2xl w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1b2333] pb-4">
          <div>
            <div className="text-xs font-bold text-[#E10600] uppercase tracking-widest">
              {mode === 'TIME_TRIAL' ? 'TIME TRIAL SESSION COMPLETE' : 'CHECKERED FLAG'}
            </div>
            <h2 className="text-3xl font-black text-white font-['Orbitron',sans-serif]">
              {mode === 'TIME_TRIAL'
                ? isNewPersonalBest
                  ? '🏆 NEW PERSONAL BEST!'
                  : 'SESSION RESULTS'
                : position === 1
                ? '🏁 VICTORY! P1 FINISH'
                : isPodium
                ? `PODIUM FINISH! P${position}`
                : `FINISHED P${position}`}
            </h2>
          </div>

          {mode === 'CAREER' && prizeMoneyWon > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-[#7d8b9e] uppercase block">PRIZE EARNINGS</span>
              <span className="text-2xl font-black text-[#10B981] font-mono">
                +${prizeMoneyWon.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Highlight Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#121824] p-3 rounded-xl border border-[#1d2738] text-center">
            <span className="text-[10px] text-[#7d8b9e] uppercase">YOUR BEST LAP</span>
            <div className="text-xl font-bold font-mono text-[#00D2BE] tabular-nums mt-0.5">
              {formatTime(session.bestLapTime)}
            </div>
          </div>

          <div className="bg-[#121824] p-3 rounded-xl border border-[#1d2738] text-center">
            <span className="text-[10px] text-[#7d8b9e] uppercase">TOTAL LAPS</span>
            <div className="text-xl font-bold font-mono text-white tabular-nums mt-0.5">
              {session.currentLap} LAPS
            </div>
          </div>

          <div className="bg-[#121824] p-3 rounded-xl border border-[#1d2738] text-center">
            <span className="text-[10px] text-[#7d8b9e] uppercase">
              {mode === 'CAREER' ? 'POINTS EARNED' : 'FINISH POSITION'}
            </span>
            <div className="text-xl font-bold font-mono text-[#F59E0B] tabular-nums mt-0.5">
              {mode === 'CAREER' ? `+${pointsEarned} PTS` : `P${position}`}
            </div>
          </div>
        </div>

        {/* Classification Table */}
        {mode !== 'TIME_TRIAL' && (
          <div className="bg-[#0e131d] border border-[#1b2333] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] font-bold text-[#7d8b9e] uppercase border-b border-[#1b2333]">
              <span className="col-span-1">POS</span>
              <span className="col-span-5">DRIVER & TEAM</span>
              <span className="col-span-3 text-right">BEST LAP</span>
              <span className="col-span-3 text-right">GAP</span>
            </div>

            {standings.map((driver) => (
              <div
                key={driver.id}
                className={`grid grid-cols-12 px-3 py-2 items-center text-xs border-b border-[#141b27] ${
                  driver.isPlayer ? 'bg-[#00D2BE]/10 font-bold text-white' : 'text-[#94a3b8]'
                }`}
              >
                <span className="col-span-1 font-bold text-white">P{driver.position}</span>
                <div className="col-span-5 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: driver.primaryColor }} />
                  <span className="truncate">{driver.driverName}</span>
                </div>
                <span className="col-span-3 text-right font-mono text-[#cbd5e1]">
                  {formatTime(driver.bestLapTime)}
                </span>
                <span className="col-span-3 text-right font-mono text-[#94a3b8]">
                  {driver.gapToLeader}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onMainMenu}
              className="px-4 py-2.5 rounded-xl border border-[#1f2838] bg-[#121824] hover:bg-[#1b2436] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>MAIN MENU</span>
            </button>
            <button
              onClick={onRestart}
              className="px-4 py-2.5 rounded-xl border border-[#1f2838] bg-[#121824] hover:bg-[#1b2436] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESTART</span>
            </button>
          </div>

          <button
            onClick={onContinue}
            className="bg-[#E10600] hover:bg-[#c20500] text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer font-['Orbitron',sans-serif]"
          >
            <span>{mode === 'CAREER' ? 'RETURN TO GARAGE' : 'CONTINUE'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
