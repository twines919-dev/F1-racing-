import React from 'react';
import { CareerSaveData, TeamConfig, TrackConfig } from '../types/game';
import { UPGRADE_PRICING, UPGRADE_DESCRIPTIONS, saveCareerData } from '../game/trackData';
import { Wrench, Trophy, ArrowRight, Zap, Shield, Play, ChevronRight, DollarSign, Award } from 'lucide-react';

interface CareerHubProps {
  careerData: CareerSaveData;
  teams: TeamConfig[];
  tracks: TrackConfig[];
  onStartCareerRace: () => void;
  onBackToTitle: () => void;
  onUpdateCareerData: (updated: CareerSaveData) => void;
}

export const CareerHub: React.FC<CareerHubProps> = ({
  careerData,
  teams,
  tracks,
  onStartCareerRace,
  onBackToTitle,
  onUpdateCareerData,
}) => {
  const [activeTab, setActiveTab] = React.useState<'GARAGE' | 'CALENDAR' | 'STANDINGS' | 'CONTRACTS'>('GARAGE');

  const currentTeam = teams.find(t => t.id === careerData.currentTeamId) || teams[0];
  const currentRound = careerData.seasonSchedule[careerData.currentRoundIndex] || careerData.seasonSchedule[0];
  const currentTrack = tracks.find(t => t.id === currentRound.trackId) || tracks[0];

  const handlePurchaseUpgrade = (category: keyof typeof UPGRADE_PRICING) => {
    const currentLevel = careerData.upgrades[category];
    if (currentLevel >= 4) return;
    const cost = UPGRADE_PRICING[category][currentLevel];
    if (careerData.budget < cost) return;

    const newUpgrades = {
      ...careerData.upgrades,
      [category]: currentLevel + 1,
    };
    const updated: CareerSaveData = {
      ...careerData,
      budget: careerData.budget - cost,
      upgrades: newUpgrades,
    };
    saveCareerData(updated);
    onUpdateCareerData(updated);
  };

  const handleSignContract = (newTeam: TeamConfig) => {
    if (newTeam.unlockCost && careerData.budget < newTeam.unlockCost) return;

    const updated: CareerSaveData = {
      ...careerData,
      budget: careerData.budget - (newTeam.unlockCost || 0),
      currentTeamId: newTeam.id,
      unlockedTeamIds: Array.from(new Set([...careerData.unlockedTeamIds, newTeam.id])),
    };
    saveCareerData(updated);
    onUpdateCareerData(updated);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col p-6 pointer-events-auto bg-[#080b11] font-['Chakra_Petch',sans-serif] text-white overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#1b2333] pb-4 mb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToTitle}
            className="text-xs text-[#94a3b8] hover:text-white px-3 py-1.5 rounded-lg border border-[#1b2333] bg-[#0f141f] transition-colors cursor-pointer"
          >
            ← MAIN MENU
          </button>
          <div>
            <div className="text-[10px] font-bold text-[#F59E0B] tracking-widest uppercase">
              FORMULA 1 CAREER MODE • SEASON {careerData.seasonNumber}
            </div>
            <h1 className="text-2xl font-black text-white font-['Orbitron',sans-serif] flex items-center gap-2">
              {careerData.driverName}{' '}
              <span className="text-sm font-normal text-[#94a3b8]">#{careerData.driverNumber}</span>
            </h1>
          </div>
        </div>

        {/* Budget & Next Round CTA */}
        <div className="flex items-center gap-4">
          <div className="bg-[#0f141f] border border-[#1b2333] px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] text-[#7d8b9e] uppercase tracking-wider block">TEAM BUDGET</span>
            <span className="text-xl font-black text-[#10B981] tabular-nums font-mono">
              ${careerData.budget.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onStartCareerRace}
            className="bg-[#E10600] hover:bg-[#c20500] text-white font-black text-sm px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(225,6,0,0.5)] flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer font-['Orbitron',sans-serif]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RACE ROUND {careerData.currentRoundIndex + 1}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { id: 'GARAGE', label: 'R&D UPGRADES & CAR', icon: Wrench },
          { id: 'CALENDAR', label: 'SEASON SCHEDULE', icon: Trophy },
          { id: 'STANDINGS', label: 'CHAMPIONSHIP POINTS', icon: Award },
          { id: 'CONTRACTS', label: 'TEAM CONTRACTS & MARKET', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#1e2738] text-white border border-[#3b82f6]/40 shadow-md'
                  : 'text-[#94a3b8] hover:text-white bg-[#0e131d] border border-[#18202d]'
              }`}
            >
              <Icon className="w-4 h-4 text-[#38BDF8]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: R&D Upgrades */}
      {activeTab === 'GARAGE' && (
        <div className="grid grid-cols-3 gap-5">
          {/* Left 2 Cols: Upgrades list */}
          <div className="col-span-2 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">
              Research & Development Department
            </h2>

            {(['engine', 'aero', 'chassis', 'brakes', 'ersSystem'] as const).map((cat) => {
              const level = careerData.upgrades[cat];
              const maxed = level >= 4;
              const nextCost = maxed ? 0 : UPGRADE_PRICING[cat][level];
              const canAfford = careerData.budget >= nextCost && !maxed;

              const titleMap = {
                engine: 'Power Unit & Turbo Hybrid',
                aero: 'Aerodynamics & Venturi Ground Effect',
                chassis: 'Chassis & Carbon Weight Reduction',
                brakes: 'Carbon-Carbon Braking System',
                ersSystem: 'ERS Hybrid Battery & Energy Recovery',
              };

              return (
                <div
                  key={cat}
                  className="bg-[#0e131d] border border-[#1b2333] p-4 rounded-xl flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{titleMap[cat]}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2333] text-[#38BDF8] font-mono">
                        Level {level}/4
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] mb-2">{UPGRADE_DESCRIPTIONS[cat][level]}</p>

                    {/* Level Progress Segments */}
                    <div className="flex gap-1.5 w-48">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-2 flex-1 rounded-sm ${
                            step <= level ? 'bg-[#38BDF8]' : 'bg-[#1b2333]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    {maxed ? (
                      <span className="text-xs font-bold text-[#10B981] px-4 py-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
                        FACTORY SPEC MAX
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchaseUpgrade(cat)}
                        disabled={!canAfford}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-[#10B981] hover:bg-[#059669] text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                            : 'bg-[#1b2333] text-[#64748b] cursor-not-allowed'
                        }`}
                      >
                        <span>UPGRADE</span>
                        <span className="font-mono">${nextCost.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Col: Car spec overview & current round track */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Current Race Machine</h2>

            <div className="bg-[#0e131d] border border-[#1b2333] p-5 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{currentTeam.name}</h3>
                  <span className="text-xs text-[#7d8b9e]">{currentTeam.engineSpec}</span>
                </div>
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: currentTeam.primaryColor }}
                />
              </div>

              <div className="pt-3 border-t border-[#1b2333] flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Engine Level:</span>
                  <span className="font-bold text-white">Stage {careerData.upgrades.engine}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Aerodynamics:</span>
                  <span className="font-bold text-white">Stage {careerData.upgrades.aero}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Chassis Weight:</span>
                  <span className="font-bold text-white">Stage {careerData.upgrades.chassis}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Braking Force:</span>
                  <span className="font-bold text-white">Stage {careerData.upgrades.brakes}</span>
                </div>
              </div>

              <div className="mt-2 p-3 bg-[#131a26] rounded-xl border border-[#20293a]">
                <div className="text-[10px] text-[#F59E0B] uppercase font-bold">NEXT GRAND PRIX</div>
                <div className="text-sm font-bold text-white">{currentRound.name}</div>
                <div className="text-xs text-[#7d8b9e]">
                  {currentTrack.location} • {currentRound.laps} Laps • Prize Pool ${currentRound.prizePool.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Season Schedule */}
      {activeTab === 'CALENDAR' && (
        <div className="flex flex-col gap-3 max-w-3xl">
          <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
            Formula 1 Championship Calendar (Season {careerData.seasonNumber})
          </h2>

          {careerData.seasonSchedule.map((round, idx) => {
            const isCurrent = idx === careerData.currentRoundIndex;
            const isDone = round.completed;
            const trk = tracks.find(t => t.id === round.trackId) || tracks[0];

            return (
              <div
                key={round.round}
                className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
                  isCurrent
                    ? 'bg-[#1b2537] border-[#00D2BE] shadow-[0_0_15px_rgba(0,210,190,0.2)]'
                    : isDone
                    ? 'bg-[#0b0e14] border-[#18202d] text-[#64748b]'
                    : 'bg-[#0e131d] border-[#1b2333]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#141b27] border border-[#202a3a] flex items-center justify-center font-bold text-base">
                    R{round.round}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{round.name}</div>
                    <div className="text-xs text-[#7d8b9e]">
                      {trk.country} • {trk.lengthKm} km • {round.laps} Laps
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-[#10B981]">
                    Prize: ${round.prizePool.toLocaleString()}
                  </div>
                  {isDone && round.playerResult && (
                    <div className="text-xs text-[#00D2BE] font-bold">
                      Finished P{round.playerResult.finishPosition} (+{round.playerResult.points} pts)
                    </div>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-[#F59E0B] uppercase">NEXT EVENT</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Championship Standings Table */}
      {activeTab === 'STANDINGS' && (
        <div className="flex flex-col gap-3 max-w-3xl">
          <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
            Drivers' World Championship Standings
          </h2>

          <div className="bg-[#0e131d] border border-[#1b2333] rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2.5 text-xs text-[#7d8b9e] font-bold uppercase border-b border-[#1b2333]">
              <span className="col-span-1">POS</span>
              <span className="col-span-6">DRIVER & TEAM</span>
              <span className="col-span-5 text-right">POINTS</span>
            </div>

            {careerData.championshipStandings
              .sort((a, b) => b.points - a.points)
              .map((standing, idx) => (
                <div
                  key={standing.driverName}
                  className={`grid grid-cols-12 px-4 py-3 items-center border-b border-[#151c28] text-sm ${
                    standing.isPlayer ? 'bg-[#00D2BE]/10 font-bold text-white' : 'text-[#cbd5e1]'
                  }`}
                >
                  <span className="col-span-1 font-bold text-white">P{idx + 1}</span>
                  <div className="col-span-6 flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: standing.color }} />
                    <span className="truncate">{standing.driverName}</span>
                    <span className="text-xs text-[#7d8b9e] truncate">({standing.teamName})</span>
                  </div>
                  <span className="col-span-5 text-right font-mono font-bold text-base text-white">
                    {standing.points} PTS
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 4: Team Contracts & Market */}
      {activeTab === 'CONTRACTS' && (
        <div className="flex flex-col gap-3 max-w-4xl">
          <h2 className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
            Driver Market & Team Contracts
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {teams.map((team) => {
              const isCurrent = careerData.currentTeamId === team.id;
              const isUnlocked = careerData.unlockedTeamIds.includes(team.id);
              const cost = team.unlockCost || 0;
              const canAfford = careerData.budget >= cost;

              return (
                <div
                  key={team.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? 'bg-[#1b2333] border-[#00D2BE]'
                      : 'bg-[#0e131d] border-[#1b2333]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.primaryColor }} />
                      <span className="font-bold text-white">{team.name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#16202e] text-[#38BDF8]">
                      Tier {team.tier}
                    </span>
                  </div>

                  <p className="text-xs text-[#7d8b9e]">{team.engineSpec}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1b2333]">
                    {isCurrent ? (
                      <span className="text-xs font-bold text-[#00D2BE]">CURRENT CONTRACT</span>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleSignContract(team)}
                        className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-black font-bold text-xs hover:bg-[#0284c7] cursor-pointer"
                      >
                        SWITCH TEAM
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSignContract(team)}
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                          canAfford
                            ? 'bg-[#10B981] text-black hover:bg-[#059669]'
                            : 'bg-[#1b2333] text-[#64748b] cursor-not-allowed'
                        }`}
                      >
                        SIGN CONTRACT (${cost.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
