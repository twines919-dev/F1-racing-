import { TeamConfig, TrackConfig, CareerSaveData, SeasonRaceSchedule } from '../types/game';

export const TEAMS: TeamConfig[] = [
  // Tier 3: Rookie Entry Teams
  {
    id: 'apex-lynx',
    name: 'Apex Lynx Racing',
    shortName: 'LYNX',
    tier: 3,
    primaryColor: '#00D2BE',
    secondaryColor: '#1A2332',
    accentColor: '#39FF14',
    driverName: 'Player Driver',
    driverNumber: 23,
    engineSpec: 'Apex V6 Turbo 1.6L Spec-A',
    unlocked: true,
    baseStats: {
      topSpeed: 5.5,
      acceleration: 5.8,
      corneringGrip: 5.5,
      braking: 6.0,
      ersBoost: 5.0,
    },
  },
  {
    id: 'velocity-dynamics',
    name: 'Velocity Dynamics',
    shortName: 'VELO',
    tier: 3,
    primaryColor: '#E65100',
    secondaryColor: '#212121',
    accentColor: '#FFB300',
    driverName: 'Logan Vance',
    driverNumber: 33,
    engineSpec: 'Ford Cosworth V6 Hybrid',
    unlocked: true,
    unlockCost: 80000,
    baseStats: {
      topSpeed: 6.0,
      acceleration: 5.6,
      corneringGrip: 5.2,
      braking: 5.8,
      ersBoost: 5.5,
    },
  },

  // Tier 2: Midfield Contenders
  {
    id: 'papaya-speed',
    name: 'Papaya Speed GP',
    shortName: 'MCL',
    tier: 2,
    primaryColor: '#FF8000',
    secondaryColor: '#1E232A',
    accentColor: '#00D2BE',
    driverName: 'Lando Norris',
    driverNumber: 4,
    engineSpec: 'Mercedes M15 E Performance',
    unlocked: false,
    unlockCost: 250000,
    baseStats: {
      topSpeed: 7.6,
      acceleration: 7.8,
      corneringGrip: 7.9,
      braking: 7.5,
      ersBoost: 7.8,
    },
  },
  {
    id: 'aston-emerald',
    name: 'Aston Emerald F1',
    shortName: 'AST',
    tier: 2,
    primaryColor: '#00594F',
    secondaryColor: '#CEDC00',
    accentColor: '#FFFFFF',
    driverName: 'Fernando Alonso',
    driverNumber: 14,
    engineSpec: 'Mercedes M15 High Downforce',
    unlocked: false,
    unlockCost: 280000,
    baseStats: {
      topSpeed: 7.4,
      acceleration: 7.5,
      corneringGrip: 8.0,
      braking: 7.9,
      ersBoost: 7.5,
    },
  },
  {
    id: 'alpine-strike',
    name: 'Alpine Hyperstrike',
    shortName: 'ALP',
    tier: 2,
    primaryColor: '#0090FF',
    secondaryColor: '#FD4BC7',
    accentColor: '#FFFFFF',
    driverName: 'Pierre Gasly',
    driverNumber: 10,
    engineSpec: 'Renault E-Tech RE24',
    unlocked: false,
    unlockCost: 220000,
    baseStats: {
      topSpeed: 7.8,
      acceleration: 7.2,
      corneringGrip: 7.4,
      braking: 7.2,
      ersBoost: 7.2,
    },
  },

  // Tier 1: World Championship Elite
  {
    id: 'scuderia-rosso',
    name: 'Scuderia Rosso Corsa',
    shortName: 'FER',
    tier: 1,
    primaryColor: '#E80020',
    secondaryColor: '#FFE000',
    accentColor: '#FFFFFF',
    driverName: 'Charles Leclerc',
    driverNumber: 16,
    engineSpec: 'Ferrari 066/12 Superfast',
    unlocked: false,
    unlockCost: 600000,
    baseStats: {
      topSpeed: 9.3,
      acceleration: 9.2,
      corneringGrip: 9.1,
      braking: 9.0,
      ersBoost: 9.2,
    },
  },
  {
    id: 'silver-arrow',
    name: 'Silver Arrow AMG',
    shortName: 'MER',
    tier: 1,
    primaryColor: '#C0C0C0',
    secondaryColor: '#00D2BE',
    accentColor: '#000000',
    driverName: 'Lewis Hamilton',
    driverNumber: 44,
    engineSpec: 'Mercedes M15 EQ Power+',
    unlocked: false,
    unlockCost: 650000,
    baseStats: {
      topSpeed: 9.1,
      acceleration: 9.4,
      corneringGrip: 9.2,
      braking: 9.3,
      ersBoost: 9.4,
    },
  },
  {
    id: 'apex-titan',
    name: 'Apex Titan Red RB',
    shortName: 'RBR',
    tier: 1,
    primaryColor: '#0600EF',
    secondaryColor: '#E80020',
    accentColor: '#FFD700',
    driverName: 'Max Verstappen',
    driverNumber: 1,
    engineSpec: 'Honda RBPT Powertrain HRC',
    unlocked: false,
    unlockCost: 800000,
    baseStats: {
      topSpeed: 9.6,
      acceleration: 9.5,
      corneringGrip: 9.5,
      braking: 9.4,
      ersBoost: 9.5,
    },
  },
];

export const TRACKS: TrackConfig[] = [
  {
    id: 'monza',
    name: 'Autodromo Nazionale Monza',
    country: 'Italy 🇮🇹',
    location: 'Monza, Lombardy',
    lengthKm: 5.793,
    totalLaps: 3,
    drsZoneCount: 2,
    difficulty: 'Beginner',
    previewColor: '#009246',
    ambientLightColor: '#FFF5E4',
    skyColor: '#6BB5FF',
    lapRecordTime: 81450, // 1:21.450
    lapRecordHolder: 'Lewis Hamilton (1:21.450)',
    unlocked: true,
  },
  {
    id: 'silverstone',
    name: 'Silverstone Grand Prix Circuit',
    country: 'United Kingdom 🇬🇧',
    location: 'Northamptonshire',
    lengthKm: 5.891,
    totalLaps: 3,
    drsZoneCount: 2,
    difficulty: 'Intermediate',
    previewColor: '#00247D',
    ambientLightColor: '#F0F4F8',
    skyColor: '#78AACC',
    lapRecordTime: 87097, // 1:27.097
    lapRecordHolder: 'Max Verstappen (1:27.097)',
    unlocked: true,
  },
  {
    id: 'monaco',
    name: 'Circuit de Monaco',
    country: 'Monaco 🇲🇨',
    location: 'Monte Carlo',
    lengthKm: 3.337,
    totalLaps: 3,
    drsZoneCount: 1,
    difficulty: 'Expert',
    previewColor: '#C8102E',
    ambientLightColor: '#FFF9EE',
    skyColor: '#5EAFFF',
    lapRecordTime: 72909, // 1:12.909
    lapRecordHolder: 'Lewis Hamilton (1:12.909)',
    unlocked: true,
  },
];

export const UPGRADE_PRICING = {
  engine: [40000, 90000, 180000, 320000],
  aero: [35000, 85000, 170000, 300000],
  chassis: [30000, 75000, 150000, 260000],
  brakes: [25000, 60000, 120000, 220000],
  ersSystem: [30000, 70000, 140000, 250000],
};

export const UPGRADE_DESCRIPTIONS = {
  engine: [
    'Baseline 1.6L V6 Turbo spec',
    'Stage 1: High-Flow Turbo Compressor (+5 km/h Top Speed)',
    'Stage 2: Carbon Plenum & Optimized Combustion (+8 km/h Top Speed, +6% Accel)',
    'Stage 3: Titanium Crankshaft & MGU-H Tuning (+12 km/h Top Speed, +12% Accel)',
    'Stage 4 Factory Spec: Extreme Boost Redline 15,500 RPM (+18 km/h Top Speed, +20% Accel)',
  ],
  aero: [
    'Standard aerodynamic package',
    'Stage 1: Multi-Element Front Wing Flaps (+5% High-Speed Grip)',
    'Stage 2: Sculpted Venturi Floor Tunnels (+10% Ground Effect Grip)',
    'Stage 3: Shark Fin & Active DRS Gurney Flap (+15% Cornering & DRS Speed)',
    'Stage 4 Factory Spec: Wind-Tunnel Sculpted Carbon Bodywork (+22% Cornering Grip)',
  ],
  chassis: [
    'Stock composite safety cell',
    'Stage 1: Ultra-Lightweight Carbon Monocoque (-15 kg Weight, Better Handling)',
    'Stage 2: Titanium Suspension Wishbones (-25 kg, Reduced Tire Wear 10%)',
    'Stage 3: Dynamic Anti-Roll Sway Bars (Crisp Turn-in, Reduced Tire Wear 20%)',
    'Stage 4 Factory Spec: Formula 1 Aerospace Honeycomb Core (-40 kg, -30% Tire Wear)',
  ],
  brakes: [
    'Conventional carbon discs',
    'Stage 1: Drilled Carbon-Carbon Rotors (+8% Brake Force)',
    'Stage 2: Monobloc 6-Piston Calipers (+15% Stopping Power, Shorter Braking Distance)',
    'Stage 3: Active Brake-by-Wire Cooling Ducts (Zero Fade, +22% Stopping Power)',
    'Stage 4 Factory Spec: Formula 1 Ceramic Brake Matrix (+32% Braking Power)',
  ],
  ersSystem: [
    'Stock 4MJ battery pack',
    'Stage 1: Optimized Lithium-Ion Cells (+15% Capacity)',
    'Stage 2: MGU-K Kinetic Energy Recovery Unit (+25% Faster Recharge)',
    'Stage 3: High-Voltage Bus & Boost Inverter (+20% Boost Power Output)',
    'Stage 4 Factory Spec: 8MJ Hybrid Ultracapacitor Matrix (+40% Boost Duration & Power)',
  ],
};

const DEFAULT_SCHEDULE: SeasonRaceSchedule[] = [
  {
    round: 1,
    trackId: 'monza',
    name: 'Italian Grand Prix',
    laps: 3,
    prizePool: 120000,
    completed: false,
  },
  {
    round: 2,
    trackId: 'silverstone',
    name: 'British Grand Prix',
    laps: 3,
    prizePool: 150000,
    completed: false,
  },
  {
    round: 3,
    trackId: 'monaco',
    name: 'Monaco Grand Prix',
    laps: 3,
    prizePool: 220000,
    completed: false,
  },
  {
    round: 4,
    trackId: 'monza',
    name: 'European Masters Grand Prix',
    laps: 3,
    prizePool: 180000,
    completed: false,
  },
  {
    round: 5,
    trackId: 'silverstone',
    name: 'World Championship Season Finale',
    laps: 4,
    prizePool: 300000,
    completed: false,
  },
];

export function getInitialCareerData(): CareerSaveData {
  return {
    driverName: 'Rookie Prodigy',
    driverNumber: 23,
    seasonNumber: 1,
    budget: 95000, // starting rookie balance
    reputation: 50,
    currentTeamId: 'apex-lynx',
    unlockedTeamIds: ['apex-lynx', 'velocity-dynamics'],
    unlockedTrackIds: ['monza', 'silverstone', 'monaco'],
    upgrades: {
      engine: 0,
      aero: 0,
      chassis: 0,
      brakes: 0,
      ersSystem: 0,
    },
    championshipStandings: [
      { driverName: 'Max Verstappen', teamName: 'Apex Titan Red RB', points: 0, isPlayer: false, color: '#0600EF' },
      { driverName: 'Lewis Hamilton', teamName: 'Silver Arrow AMG', points: 0, isPlayer: false, color: '#C0C0C0' },
      { driverName: 'Charles Leclerc', teamName: 'Scuderia Rosso Corsa', points: 0, isPlayer: false, color: '#E80020' },
      { driverName: 'Lando Norris', teamName: 'Papaya Speed GP', points: 0, isPlayer: false, color: '#FF8000' },
      { driverName: 'Fernando Alonso', teamName: 'Aston Emerald F1', points: 0, isPlayer: false, color: '#00594F' },
      { driverName: 'Rookie Prodigy', teamName: 'Apex Lynx Racing', points: 0, isPlayer: true, color: '#00D2BE' },
    ],
    currentRoundIndex: 0,
    seasonSchedule: DEFAULT_SCHEDULE,
    careerWins: 0,
    careerPodiums: 0,
    careerRaces: 0,
    championshipTitles: 0,
  };
}

export const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const CAREER_STORAGE_KEY = 'apex_f1_career_data_v2';
export const TIME_TRIAL_STORAGE_KEY = 'apex_f1_timetrial_data_v2';

export function loadCareerData(): CareerSaveData {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.seasonSchedule) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  const initial = getInitialCareerData();
  saveCareerData(initial);
  return initial;
}

export function saveCareerData(data: CareerSaveData) {
  try {
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function loadTimeTrialRecords(): Record<string, { bestLapTime: number; carId: string; date: string; s1: number; s2: number; s3: number }> {
  try {
    const raw = localStorage.getItem(TIME_TRIAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  // Default records
  return {
    monza: {
      bestLapTime: 82140,
      carId: 'apex-titan',
      date: 'Formula 1 Record',
      s1: 26400,
      s2: 27800,
      s3: 27940,
    },
    silverstone: {
      bestLapTime: 87650,
      carId: 'silver-arrow',
      date: 'Formula 1 Record',
      s1: 28100,
      s2: 30250,
      s3: 29300,
    },
    monaco: {
      bestLapTime: 73400,
      carId: 'scuderia-rosso',
      date: 'Formula 1 Record',
      s1: 21200,
      s2: 28400,
      s3: 23800,
    },
  };
}

export function saveTimeTrialRecord(trackId: string, record: { bestLapTime: number; carId: string; date: string; s1: number; s2: number; s3: number }) {
  try {
    const current = loadTimeTrialRecords();
    if (!current[trackId] || record.bestLapTime < current[trackId].bestLapTime) {
      current[trackId] = record;
      localStorage.setItem(TIME_TRIAL_STORAGE_KEY, JSON.stringify(current));
      return true; // New Personal Best!
    }
  } catch {
    // ignore
  }
  return false;
}
