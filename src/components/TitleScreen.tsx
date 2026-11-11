import React from 'react';
import { CameraViewMode, CareerSaveData, GameMode, TeamConfig, TireCompound, TrackConfig } from '../types/game';
import { Trophy, Clock, Flag, Wrench, Volume2, VolumeX, Shield, Play } from 'lucide-react';

interface TitleScreenProps {
  onStartRace: (mode: GameMode, selectedTeam: TeamConfig, selectedTrack: TrackConfig, compound: TireCompound) => void;
  onOpenCareerHub: () => void;
  teams: TeamConfig[];
  tracks: TrackConfig[];
  careerData: CareerSaveData;
  timeTrialRecords: Record<string, { bestLapTime: number; carId: string; date: string }>;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartRace,
  onOpenCareerHub,
  teams,
  tracks,
  careerData,
  timeTrialRecords,
  isMuted,
  onToggleMute,
}) => {
  const [selectedMode, setSelectedMode] = React.useState<GameMode>('GRAND_PRIX');
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>(teams[0].id);
  const [selectedTrackId, setSelectedTrackId] = React.useState<string>(tracks[0].id);
  const [selectedCompound, setSelectedCompound] = React.useState<TireCompound>('SOFT');

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0];
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  // Keyboard shortcut listener for Enter / Space
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        if (selectedMode === 'CAREER') {
          onOpenCareerHub();
        } else {
          onStartRace(selectedMode, selectedTeam, selectedTrack, selectedCompound);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMode, selectedTeam, selectedTrack, selectedCompound, onStartRace, onOpenCareerHub]);

  const formatLapTime = (ms: number) => {
    if (!ms) return '--:--.---';
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const millis = Math.floor((totalSec % 1) * 1000);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-6 pointer-events-auto bg-gradient-to-t from-black/85 via-black/40 to-black/60 font-['Chakra_Petch',sans-serif] text-white">
      {/* Top Header: Bespoke Inline SVG Title Lockup & Sound Toggle */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          {/* F1 Apex Lockup */}
          <div className="flex items-center gap-3">
            <svg className="w-10 h-10" viewBox="0 0 100 100" fill="none">
              <polygon points="10,85 45,15 65,15 30,85" fill="#E10600" />
              <polygon points="45,85 75,28 90,28 60,85" fill="#FFFFFF" />
              <circle cx="78" cy="18" r="8" fill="#00D2BE" />
            </svg>
            <div>
              <h1 className="text-3xl font-black italic tracking-wider font-['Orbitron',sans-serif] text-white flex items-center gap-2">
                APEX <span className="text-[#E10600]">GP</span>
              </h1>
              <p className="text-xs uppercase tracking-widest text-[#94a3b8]">Formula 1 Championship Simulator</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg bg-[#141b27]/80 border border-[#232e42] hover:bg-[#1f2a3c] text-white transition-colors"
            title="Toggle Mute"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-[#00D2BE]" />}
          </button>
        </div>
      </div>

      {/* Center Modal / Mode Selection */}
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-5 my-auto">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-3 bg-[#0c1017]/90 p-1.5 rounded-xl border border-[#1f2838]">
          <button
            onClick={() => setSelectedMode('GRAND_PRIX')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              selectedMode === 'GRAND_PRIX'
                ? 'bg-[#E10600] text-white shadow-[0_0_15px_rgba(225,6,0,0.5)]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#141b27]'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>GRAND PRIX</span>
          </button>

          <button
            onClick={() => setSelectedMode('TIME_TRIAL')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              selectedMode === 'TIME_TRIAL'
                ? 'bg-[#00D2BE] text-black shadow-[0_0_15px_rgba(0,210,190,0.5)]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#141b27]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>TIME TRIAL</span>
          </button>

          <button
            onClick={() => setSelectedMode('CAREER')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
              selectedMode === 'CAREER'
                ? 'bg-[#F59E0B] text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#141b27]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>CAREER MODE</span>
          </button>
        </div>

        {/* Content depending on selected mode */}
        {selectedMode === 'CAREER' ? (
          <div className="bg-[#0b0f17]/95 border border-[#20293a] rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1f2838] pb-4">
              <div>
                <div className="text-xs font-bold text-[#F59E0B] uppercase tracking-widest">
                  Season {careerData.seasonNumber} • Round {careerData.currentRoundIndex + 1} of 5
                </div>
                <h2 className="text-2xl font-black text-white">{careerData.driverName}</h2>
                <p className="text-xs text-[#94a3b8]">
                  Team: {teams.find(t => t.id === careerData.currentTeamId)?.name || 'Apex Lynx Racing'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#94a3b8] uppercase">Team Budget</div>
                <div className="text-2xl font-black text-[#10B981] tabular-nums font-mono">
                  ${careerData.budget.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-[#121824] p-3 rounded-lg border border-[#1d2738]">
                <div className="text-xs text-[#94a3b8]">Wins</div>
                <div className="text-xl font-bold text-white tabular-nums">{careerData.careerWins}</div>
              </div>
              <div className="bg-[#121824] p-3 rounded-lg border border-[#1d2738]">
                <div className="text-xs text-[#94a3b8]">Podiums</div>
                <div className="text-xl font-bold text-white tabular-nums">{careerData.careerPodiums}</div>
              </div>
              <div className="bg-[#121824] p-3 rounded-lg border border-[#1d2738]">
                <div className="text-xs text-[#94a3b8]">Races</div>
                <div className="text-xl font-bold text-white tabular-nums">{careerData.careerRaces}</div>
              </div>
              <div className="bg-[#121824] p-3 rounded-lg border border-[#1d2738]">
                <div className="text-xs text-[#94a3b8]">Titles</div>
                <div className="text-xl font-bold text-[#F59E0B] tabular-nums">{careerData.championshipTitles}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[#94a3b8]">
                Advance through seasons, sign team contracts, earn prize money, and upgrade your car's engine, aero, and chassis!
              </p>
              <button
                onClick={onOpenCareerHub}
                className="bg-[#F59E0B] text-black font-extrabold px-6 py-3 rounded-xl hover:bg-[#d97706] transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Wrench className="w-5 h-5" />
                <span>ENTER CAREER GARAGE</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Car & Team Selection */}
            <div className="bg-[#0b0f17]/95 border border-[#20293a] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1f2838] pb-2">
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">SELECT CAR & TEAM</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#16202e] text-[#00D2BE]">
                  Tier {selectedTeam.tier}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedTeamId === team.id
                        ? 'border-[#00D2BE] bg-[#00D2BE]/10 shadow-[0_0_10px_rgba(0,210,190,0.3)]'
                        : 'border-[#1b2333] bg-[#121722] hover:border-[#2a384f]'
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{team.name}</div>
                      <div className="text-[10px] text-[#7d8b9e] truncate">{team.engineSpec}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Car Performance Stats */}
              <div className="bg-[#121824] p-3 rounded-xl border border-[#1b2333] flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Top Speed:</span>
                  <div className="w-28 bg-[#1f2838] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#E10600] h-full" style={{ width: `${selectedTeam.baseStats.topSpeed * 10}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Acceleration:</span>
                  <div className="w-28 bg-[#1f2838] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00D2BE] h-full" style={{ width: `${selectedTeam.baseStats.acceleration * 10}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#94a3b8]">Cornering Grip:</span>
                  <div className="w-28 bg-[#1f2838] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#F59E0B] h-full" style={{ width: `${selectedTeam.baseStats.corneringGrip * 10}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Circuit & Tire Selection */}
            <div className="bg-[#0b0f17]/95 border border-[#20293a] rounded-2xl p-5 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1f2838] pb-2">
                <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">SELECT CIRCUIT</span>
                <span className="text-xs text-[#cbd5e1]">{selectedTrack.country}</span>
              </div>

              <div className="flex flex-col gap-2">
                {tracks.map((track) => {
                  const record = timeTrialRecords[track.id];
                  return (
                    <button
                      key={track.id}
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        selectedTrackId === track.id
                          ? 'border-[#00D2BE] bg-[#00D2BE]/10 shadow-[0_0_10px_rgba(0,210,190,0.3)]'
                          : 'border-[#1b2333] bg-[#121722] hover:border-[#2a384f]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{track.name}</div>
                        <div className="text-[10px] text-[#7d8b9e]">
                          {track.lengthKm} km • {track.drsZoneCount} DRS Zones • {track.difficulty}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-[#A855F7] uppercase font-bold">RECORD</div>
                        <div className="text-xs font-mono font-bold text-[#D8B4FE]">
                          {record ? formatLapTime(record.bestLapTime) : formatLapTime(track.lapRecordTime)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tire Compound Selection */}
              <div className="pt-2 border-t border-[#1f2838]">
                <div className="text-[10px] text-[#94a3b8] uppercase font-bold mb-1.5">TIRE COMPOUND</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedCompound('SOFT')}
                    className={`py-1.5 px-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedCompound === 'SOFT'
                        ? 'border-[#E10600] bg-[#E10600]/20 text-white'
                        : 'border-[#1f2838] bg-[#121722] text-[#94a3b8]'
                    }`}
                  >
                    <span className="text-[#E10600]">● </span>SOFT (Max Grip)
                  </button>
                  <button
                    onClick={() => setSelectedCompound('MEDIUM')}
                    className={`py-1.5 px-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedCompound === 'MEDIUM'
                        ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-white'
                        : 'border-[#1f2838] bg-[#121722] text-[#94a3b8]'
                    }`}
                  >
                    <span className="text-[#F59E0B]">● </span>MEDIUM (Balanced)
                  </button>
                  <button
                    onClick={() => setSelectedCompound('HARD')}
                    className={`py-1.5 px-2 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                      selectedCompound === 'HARD'
                        ? 'border-[#FFFFFF] bg-white/20 text-white'
                        : 'border-[#1f2838] bg-[#121722] text-[#94a3b8]'
                    }`}
                  >
                    <span className="text-white">● </span>HARD (Durable)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Start CTA Button */}
        {selectedMode !== 'CAREER' && (
          <div className="flex justify-center">
            <button
              onClick={() => onStartRace(selectedMode, selectedTeam, selectedTrack, selectedCompound)}
              className="bg-[#E10600] hover:bg-[#c20500] text-white font-black text-lg py-4 px-12 rounded-2xl shadow-[0_0_25px_rgba(225,6,0,0.6)] flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 cursor-pointer font-['Orbitron',sans-serif] tracking-wider"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>START {selectedMode === 'TIME_TRIAL' ? 'TIME TRIAL' : 'GRAND PRIX'}</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-normal font-sans">
                ENTER / SPACE
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Flat Single Control Hint Line */}
      <div className="text-center text-xs text-[#7d8b9e] tracking-widest uppercase border-t border-[#1f2838]/60 pt-4">
        WASD Drive · Space Brake · Shift ERS · F DRS · B Box · R Radio · C Cam · Esc Pause
      </div>
    </div>
  );
};
