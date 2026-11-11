/**
 * Comprehensive Types for Apex GP - Formula 1 Racing Championship
 * Supporting Grand Prix, Time Trial Mode, and Full Career Progression Mode.
 */

export type GameMode = 'GRAND_PRIX' | 'TIME_TRIAL' | 'CAREER';

export type GameState = 'TITLE' | 'CAREER_HUB' | 'GARAGE_UPGRADES' | 'GRID_START' | 'RACING' | 'PIT_STOP' | 'PAUSED' | 'FINISHED';

export type CameraViewMode = 'CHASE' | 'COCKPIT' | 'NOSE' | 'BROADCAST';

export type TireCompound = 'SOFT' | 'MEDIUM' | 'HARD';

export interface PitStrategyChoice {
  newCompound: TireCompound;
  fuelToAddKg: number; // e.g. 10 to 45kg
  repairDamage: boolean; // Repair front wing & chassis damage to 0%
}

export interface CarPerformanceStats {
  topSpeed: number;     // 1 to 10
  acceleration: number; // 1 to 10
  corneringGrip: number;// 1 to 10
  braking: number;      // 1 to 10
  ersBoost: number;     // 1 to 10
}

export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  tier: 1 | 2 | 3; // 3 = Rookie, 2 = Midfield, 1 = Elite
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  driverName: string;
  driverNumber: number;
  engineSpec: string;
  unlocked: boolean;
  unlockCost?: number;
  baseStats: CarPerformanceStats;
}

export interface TrackConfig {
  id: string;
  name: string;
  country: string;
  location: string;
  lengthKm: number;
  totalLaps: number;
  drsZoneCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Expert';
  previewColor: string;
  ambientLightColor: string;
  skyColor: string;
  lapRecordTime: number; // in milliseconds (default target)
  lapRecordHolder: string;
  unlocked: boolean;
}

export interface CarTelemetry {
  speedKmh: number;
  rpm: number;
  maxRpm: number;
  gear: number; // -1 = R, 0 = N, 1-8
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  drsAvailable: boolean;
  drsActive: boolean;
  ersCharge: number; // 0..100%
  ersDeploying: boolean;
  tireWear: [number, number, number, number]; // FL, FR, RL, RR 0..100%
  tireTemp: [number, number, number, number]; // Celsius
  tireCompound: TireCompound;
  fuelKg: number;        // Current fuel in kg (0..50)
  maxFuelKg: number;     // Tank capacity (50kg)
  fuelPercent: number;   // 0..100%
  lateralG: number;
  damage: number; // 0..100%
  isOffTrack: boolean;
  isOnCurb: boolean;
  pitRequested: boolean;
  inPitLane: boolean;
}

export interface DriverStanding {
  id: string;
  driverName: string;
  driverNumber: number;
  teamName: string;
  primaryColor: string;
  position: number;
  lap: number;
  lapProgress: number; // 0..1
  totalDistance: number;
  lastLapTime: number;
  bestLapTime: number;
  gapToLeader: string;
  isPlayer: boolean;
  points?: number;
}

export interface SectorTimes {
  s1: number;
  s2: number;
  s3: number;
  isPurple: [boolean, boolean, boolean];
}

export interface RaceSession {
  mode: GameMode;
  currentLap: number;
  totalLaps: number;
  lapStartTime: number;
  currentLapTime: number;
  lastLapTime: number;
  bestLapTime: number;
  overallBestLapTime: number;
  currentSector: 1 | 2 | 3;
  currentSectorTime: number;
  sectorHistory: SectorTimes[];
  position: number;
  totalCars: number;
  drsZoneActive: boolean;
}

export interface InputState {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  drs: boolean;
  ers: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  cameraToggle: boolean;
  pause: boolean;
}

// ================= Career Mode Types =================

export interface CarUpgrades {
  engine: number;       // Level 0..4 (Top speed & high gear acceleration)
  aero: number;         // Level 0..4 (High-speed downforce & cornering)
  chassis: number;      // Level 0..4 (Weight reduction & tire preservation)
  brakes: number;       // Level 0..4 (Stopping power & trail braking)
  ersSystem: number;    // Level 0..4 (Battery capacity & recharge rate)
}

export interface SeasonRaceSchedule {
  round: number;
  trackId: string;
  name: string;
  laps: number;
  prizePool: number;
  completed: boolean;
  playerResult?: {
    finishPosition: number;
    points: number;
    prizeWon: number;
    fastestLap: boolean;
    bestLapTime: number;
  };
}

export interface CareerSaveData {
  driverName: string;
  driverNumber: number;
  seasonNumber: number;
  budget: number;       // in USD $
  reputation: number;   // 0 to 1000 XP
  currentTeamId: string;
  unlockedTeamIds: string[];
  unlockedTrackIds: string[];
  upgrades: CarUpgrades;
  championshipStandings: {
    driverName: string;
    teamName: string;
    points: number;
    isPlayer: boolean;
    color: string;
  }[];
  currentRoundIndex: number;
  seasonSchedule: SeasonRaceSchedule[];
  careerWins: number;
  careerPodiums: number;
  careerRaces: number;
  championshipTitles: number;
}

// ================= Time Trial Types =================

export interface TimeTrialRecord {
  trackId: string;
  carId: string;
  bestLapTime: number;
  date: string;
  s1: number;
  s2: number;
  s3: number;
}

export interface TimeTrialStorage {
  records: Record<string, TimeTrialRecord>; // key: trackId
}
