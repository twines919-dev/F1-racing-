import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraViewMode,
  CarTelemetry,
  CarUpgrades,
  DriverStanding,
  GameMode,
  GameState,
  InputState,
  RaceSession,
  TeamConfig,
  TireCompound,
  TrackConfig,
  CareerSaveData,
} from '../types/game';
import { TEAMS, TRACKS, loadCareerData, saveCareerData, loadTimeTrialRecords, saveTimeTrialRecord, POINTS_SYSTEM } from '../game/trackData';
import { createProceduralTrack, TrackInstance } from '../game/proceduralTrack';
import { createProceduralF1Car, F1CarMeshHandles } from '../game/proceduralCar';
import { CarPhysics } from '../game/carPhysics';
import { AIDriversManager } from '../game/aiDrivers';
import { audioEngine } from '../game/audioEngine';
import { raceEngineer } from '../game/raceEngineer';
import { VisualEffectsManager } from '../game/visualEffects';
import { TelemetryHUD } from './TelemetryHUD';
import { TitleScreen } from './TitleScreen';
import { CareerHub } from './CareerHub';
import { PostRaceModal } from './PostRaceModal';
import { ControlOverlay } from './ControlOverlay';
import { TouchControls } from './TouchControls';
import { PitStopModal } from './PitStopModal';
import { PitStrategyChoice } from '../types/game';

export const F1Game: React.FC = () => {
  // DOM container ref for Three.js WebGL canvas (isolated from React state updates)
  const mountRef = useRef<HTMLDivElement>(null);

  // Game UI State
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [gameMode, setGameMode] = useState<GameMode>('GRAND_PRIX');
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('CHASE');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isManualShift, setIsManualShift] = useState<boolean>(false);
  const [isRadioVoiceEnabled, setIsRadioVoiceEnabled] = useState<boolean>(true);

  // Career & Time Trial storage state
  const [careerData, setCareerData] = useState<CareerSaveData>(() => loadCareerData());
  const [timeTrialRecords, setTimeTrialRecords] = useState(() => loadTimeTrialRecords());

  // Active configurations
  const [activeTeam, setActiveTeam] = useState<TeamConfig>(TEAMS[0]);
  const [activeTrackConfig, setActiveTrackConfig] = useState<TrackConfig>(TRACKS[0]);
  const [activeCompound, setActiveCompound] = useState<TireCompound>('SOFT');

  // Live telemetry & session state for HUD (updated at throttled intervals for smooth 60fps)
  const [telemetry, setTelemetry] = useState<CarTelemetry>({
    speedKmh: 0,
    rpm: 4000,
    maxRpm: 15000,
    gear: 1,
    throttle: 0,
    brake: 0,
    steer: 0,
    drsAvailable: false,
    drsActive: false,
    ersCharge: 100,
    ersDeploying: false,
    tireWear: [0, 0, 0, 0],
    tireTemp: [85, 85, 90, 90],
    tireCompound: 'SOFT',
    fuelKg: 30,
    maxFuelKg: 50,
    fuelPercent: 60,
    lateralG: 0,
    damage: 0,
    isOffTrack: false,
    isOnCurb: false,
    pitRequested: false,
    inPitLane: false,
  });

  const [standings, setStandings] = useState<DriverStanding[]>([]);
  const [gantryCount, setGantryCount] = useState<number>(0);
  const [radioMessage, setRadioMessage] = useState<string | null>(null);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState<boolean>(false);
  const [prizeMoneyWon, setPrizeMoneyWon] = useState<number>(0);
  const [pointsEarned, setPointsEarned] = useState<number>(0);

  const [session, setSession] = useState<RaceSession>({
    mode: 'GRAND_PRIX',
    currentLap: 1,
    totalLaps: 3,
    lapStartTime: performance.now(),
    currentLapTime: 0,
    lastLapTime: 0,
    bestLapTime: 0,
    overallBestLapTime: 0,
    currentSector: 1,
    currentSectorTime: 0,
    sectorHistory: [],
    position: 1,
    totalCars: 6,
    drsZoneActive: false,
  });

  // Mutable Game Engine References
  const inputRef = useRef<InputState>({
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    drs: false,
    ers: false,
    shiftUp: false,
    shiftDown: false,
    cameraToggle: false,
    pause: false,
  });

  const physicsRef = useRef<CarPhysics | null>(null);
  const aiManagerRef = useRef<AIDriversManager | null>(null);
  const playerCarHandlesRef = useRef<F1CarMeshHandles | null>(null);
  const trackInstanceRef = useRef<TrackInstance | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Timing & Lap state refs (to avoid stale closures in requestAnimationFrame)
  const raceActiveRef = useRef<boolean>(false);
  const lapStartTimeRef = useRef<number>(performance.now());
  const currentLapRef = useRef<number>(1);
  const bestLapTimeRef = useRef<number>(0);
  const lastLapTimeRef = useRef<number>(0);
  const lapProgressRef = useRef<number>(0);
  const prevProgressRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const cameraModeRef = useRef<CameraViewMode>(cameraMode);
  cameraModeRef.current = cameraMode;
  const standingsRef = useRef<DriverStanding[]>(standings);
  standingsRef.current = standings;
  const prevDamageRef = useRef<number>(0);

  // Sync Voice Race Engineer radio transmissions with UI subtitles
  useEffect(() => {
    let timeoutId: number | undefined;
    const unsubscribe = raceEngineer.subscribe((transmission) => {
      setRadioMessage(transmission.text);
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setRadioMessage((cur) => (cur === transmission.text ? null : cur));
      }, 5500);
    });
    return () => {
      unsubscribe();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Radio toast helper
  const showRadio = useCallback((msg: string) => {
    setRadioMessage(msg);
    audioEngine.playRadioChime();
    setTimeout(() => {
      setRadioMessage((cur) => (cur === msg ? null : cur));
    }, 3800);
  }, []);

  const handleToggleRadioVoice = useCallback(() => {
    setIsRadioVoiceEnabled((prev) => {
      const next = !prev;
      raceEngineer.setVoiceEnabled(next);
      return next;
    });
  }, []);

  // Tactical Engineer Radio Check
  const handleRequestRadioCheck = useCallback(() => {
    if (physicsRef.current && (gameStateRef.current === 'RACING' || gameStateRef.current === 'GRID_START')) {
      const phys = physicsRef.current;
      const pStanding = standingsRef.current.find((s) => s.isPlayer);
      const pos = pStanding ? pStanding.position : 1;
      const gap = pStanding ? pStanding.gapToLeader : 'LEADER';
      const maxWear = Math.round(Math.max(...phys.state.tireWear));
      raceEngineer.requestRadioCheck(
        pos,
        gap,
        maxWear,
        Math.round(phys.state.fuelKg),
        phys.state.tireCompound
      );
    }
  }, []);

  // Tactical Pit Call Toggle
  const handleTogglePitStop = useCallback(() => {
    if (physicsRef.current && (gameStateRef.current === 'RACING' || gameStateRef.current === 'GRID_START')) {
      const requested = physicsRef.current.togglePitRequest();
      if (requested) {
        raceEngineer.reportPitInstruction('BOX_THIS_LAP');
      } else {
        raceEngineer.reportPitInstruction('BOX_ABORT');
      }
    }
  }, []);

  // Keyboard input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inp.throttle = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inp.brake = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inp.steerLeft = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inp.steerRight = true;
          break;
        case 'Space':
          inp.brake = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inp.ers = true;
          break;
        case 'KeyF':
          inp.drs = true;
          break;
        case 'KeyE':
          inp.shiftUp = true;
          break;
        case 'KeyQ':
          inp.shiftDown = true;
          break;
        case 'KeyC':
          // Toggle camera
          setCameraMode((prev) => {
            if (prev === 'CHASE') return 'COCKPIT';
            if (prev === 'COCKPIT') return 'NOSE';
            if (prev === 'NOSE') return 'BROADCAST';
            return 'CHASE';
          });
          break;
        case 'KeyR':
          handleRequestRadioCheck();
          break;
        case 'KeyB':
          handleTogglePitStop();
          break;
        case 'Escape':
        case 'KeyP':
          if (gameStateRef.current === 'RACING') {
            setIsPaused((prev) => !prev);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inp.throttle = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inp.brake = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inp.steerLeft = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inp.steerRight = false;
          break;
        case 'Space':
          inp.brake = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inp.ers = false;
          break;
        case 'KeyF':
          inp.drs = false;
          break;
        case 'KeyE':
          inp.shiftUp = false;
          break;
        case 'KeyQ':
          inp.shiftDown = false;
          break;
      }
    };

    const handleBlur = () => {
      // Clear all inputs on window blur
      inputRef.current = {
        throttle: false,
        brake: false,
        steerLeft: false,
        steerRight: false,
        drs: false,
        ers: false,
        shiftUp: false,
        shiftDown: false,
        cameraToggle: false,
        pause: false,
      };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Initialize Three.js Scene, Renderer, and Track
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Software WebGL detection per Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. High-performance PBR Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Scene & Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeTrackConfig.skyColor);
    scene.fog = new THREE.FogExp2(activeTrackConfig.skyColor, 0.0016);
    sceneRef.current = scene;

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1200);
    cameraRef.current = camera;

    // 5. Studio Environment Map (RoomEnvironment) per Three.js skill
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 6. Lighting Rig: Warm Key Light, Cool Sky Fill, Rim Light
    const sunLight = new THREE.DirectionalLight(0xfff8e8, 2.2);
    sunLight.position.set(120, 180, 100);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    const shadowD = 80;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xcee6ff, 0x3d4a36, 1.2);
    scene.add(hemiLight);

    // 7. Track Setup
    const trackInstance = createProceduralTrack(activeTrackConfig);
    scene.add(trackInstance.trackGroup);
    trackInstanceRef.current = trackInstance;

    // 8. Player F1 Car Setup (Grid slot #1 on pole)
    const startPoint = trackInstance.getTrackPoint(0);
    const startTangent = trackInstance.getTrackTangent(0);
    const initialHeading = Math.atan2(-startTangent.x, -startTangent.z);

    // Apply career upgrades if in Career mode
    const carUpgrades: CarUpgrades =
      gameMode === 'CAREER'
        ? careerData.upgrades
        : { engine: 2, aero: 2, chassis: 2, brakes: 2, ersSystem: 2 };

    const playerHandles = createProceduralF1Car(activeTeam, activeCompound);
    scene.add(playerHandles.root);
    playerCarHandlesRef.current = playerHandles;

    const initialPos = startPoint.clone();
    initialPos.y = 0.05;
    const physics = new CarPhysics(activeTeam, initialPos, initialHeading, carUpgrades, activeCompound);
    physics.setManualShift(isManualShift);
    physicsRef.current = physics;

    // 9. AI Rivals Manager
    const aiManager = new AIDriversManager(TEAMS, trackInstance, activeTeam.id);
    aiManagerRef.current = aiManager;

    // 10. Visual Effects Manager (Titanium Floor Sparks, Warp Streaks, G-Shakes)
    const vfx = new VisualEffectsManager(scene);

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // 11. Animation Game Loop
    let animationFrameId = 0;
    let lastTime = performance.now();
    let hudThrottleTimer = 0;

    // Reusable math helpers (Zero GC in animation loop per Three.js skill)
    const _camTarget = new THREE.Vector3();
    const _camIdealPos = new THREE.Vector3();
    const _headingVec = new THREE.Vector3();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animationFrameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          animationFrameId = window.setTimeout(cb, 80);
        }
      };
      animationFrameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const curGameState = gameStateRef.current;
      const curIsPaused = isPausedRef.current;

      if (!curIsPaused && physicsRef.current && trackInstanceRef.current && playerCarHandlesRef.current) {
        const phys = physicsRef.current;
        const track = trackInstanceRef.current;
        const playerHandles = playerCarHandlesRef.current;

        // Title Screen Camera Orbit
        if (curGameState === 'TITLE') {
          const orbitAngle = now * 0.0004;
          const carPos = phys.state.position;
          camera.position.set(
            carPos.x + Math.sin(orbitAngle) * 9.5,
            carPos.y + 2.8 + Math.sin(now * 0.0008) * 0.4,
            carPos.z + Math.cos(orbitAngle) * 9.5
          );
          camera.lookAt(carPos.x, carPos.y + 0.9, carPos.z);
        } else if (curGameState === 'PIT_STOP') {
          // Stationary in Pit Box with cinematic close-up pit stop camera
          const pb = track.pitBoxPosition;
          playerHandles.root.position.lerp(pb, 0.15);
          camera.position.set(pb.x + 3.4, pb.y + 1.8, pb.z + 4.2);
          camera.lookAt(pb.x, pb.y + 0.6, pb.z);

          // Advance AI competitors on track during pit stop
          if (aiManagerRef.current && gameMode !== 'TIME_TRIAL') {
            aiManagerRef.current.update(dt, true, pb);
          }
        } else {
          // Live Racing / Grid Start
          const isRaceRunning = curGameState === 'RACING';
          phys.update(dt, inputRef.current, track);

          // Pit Ingress Entry & Service Detection
          if (phys.state.pitRequested && track.pitBoxPosition) {
            const distToPit = phys.state.position.distanceTo(track.pitBoxPosition);
            if (distToPit < 55 && (lapProgressRef.current > 0.85 || lapProgressRef.current < 0.15)) {
              if (!phys.state.inPitLane) {
                phys.state.inPitLane = true;
                audioEngine.playPitIngressTone();
                showRadio('PIT INGRESS // SPEED LIMITER 80 KM/H ENGAGED');
              }
              phys.state.speedKmh = Math.min(phys.state.speedKmh, 80);
              // Guide smoothly towards pit box position
              phys.state.position.x = THREE.MathUtils.damp(phys.state.position.x, track.pitBoxPosition.x, 3.2, dt);
              phys.state.position.z = THREE.MathUtils.damp(phys.state.position.z, track.pitBoxPosition.z, 3.2, dt);

              if (distToPit < 4.2 && phys.state.speedKmh < 50) {
                phys.state.speedKmh = 0;
                phys.state.velocity.set(0, 0, 0);
                setGameState('PIT_STOP');
                showRadio('STOP IN THE BOX! SERVICE IN PROGRESS');
              }
            }
          }

          // Update Player 3D Mesh
          playerHandles.root.position.copy(phys.state.position);
          playerHandles.root.position.y += 0.04;
          playerHandles.root.rotation.y = phys.state.heading;

          // Wheel steer and spin
          playerHandles.wheels.frontLeft.rotation.y = phys.state.steerAngle;
          playerHandles.wheels.frontRight.rotation.y = phys.state.steerAngle;
          playerHandles.wheelMeshes.forEach((w) => {
            w.rotation.x = phys.state.wheelRotation;
          });

          // DRS Flap animation
          playerHandles.drsFlap.rotation.x = phys.state.drsActive ? -0.42 : 0;

          // Glowing brake discs during braking
          const brakeIntensity = phys.state.brake * 2.5;
          playerHandles.brakeDiscs.forEach((disc) => {
            const mat = disc.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, brakeIntensity, 8, dt);
          });

          // Rear rain LED flash
          playerHandles.rearLed.visible =
            phys.state.speedKmh < 40 || phys.state.brake > 0.3 || Math.sin(now * 0.02) > 0.2;

          // Update AI Competitors
          if (aiManagerRef.current && gameMode !== 'TIME_TRIAL') {
            const aiResult = aiManagerRef.current.update(dt, isRaceRunning, phys.state.position);
            if (aiResult.slipstreamBoost && isRaceRunning) {
              // Slipstream boost!
              phys.state.speedKmh = Math.min(360, phys.state.speedKmh + dt * 14);
            }
          }

          // Lap Progress & Timing
          const trackProgressInfo = track.findClosestProgress(phys.state.position);
          const curProgress = trackProgressInfo.progress;
          lapProgressRef.current = curProgress;

          // Check lap finish line crossing
          if (prevProgressRef.current > 0.88 && curProgress < 0.12 && isRaceRunning) {
            const lapTime = now - lapStartTimeRef.current;
            lastLapTimeRef.current = lapTime;
            if (bestLapTimeRef.current === 0 || lapTime < bestLapTimeRef.current) {
              bestLapTimeRef.current = lapTime;
              const totalSec = lapTime / 1000;
              const m = Math.floor(totalSec / 60);
              const s = Math.floor(totalSec % 60);
              const ms = Math.floor((totalSec % 1) * 1000);
              const timeStr = `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
              raceEngineer.reportFastestLap(timeStr);
            }

            currentLapRef.current++;
            lapStartTimeRef.current = now;

            // Check race completion
            const totalRequiredLaps = gameMode === 'TIME_TRIAL' ? 5 : activeTrackConfig.totalLaps;
            if (currentLapRef.current > totalRequiredLaps) {
              // Finished!
              setGameState('FINISHED');
              audioEngine.playRadioChime();

              // Calculate rewards
              if (gameMode === 'TIME_TRIAL') {
                const isPB = saveTimeTrialRecord(activeTrackConfig.id, {
                  bestLapTime: bestLapTimeRef.current,
                  carId: activeTeam.id,
                  date: 'Just Now',
                  s1: Math.round(bestLapTimeRef.current * 0.32),
                  s2: Math.round(bestLapTimeRef.current * 0.36),
                  s3: Math.round(bestLapTimeRef.current * 0.32),
                });
                setIsNewPersonalBest(isPB);
                setTimeTrialRecords(loadTimeTrialRecords());
              } else if (gameMode === 'CAREER') {
                const finishPos = 1; // player finish
                const pts = POINTS_SYSTEM[finishPos - 1] || 0;
                const prize = 150000;
                setPrizeMoneyWon(prize);
                setPointsEarned(pts);

                // Update career state
                const newSchedule = [...careerData.seasonSchedule];
                const roundIdx = careerData.currentRoundIndex;
                if (newSchedule[roundIdx]) {
                  newSchedule[roundIdx].completed = true;
                  newSchedule[roundIdx].playerResult = {
                    finishPosition: finishPos,
                    points: pts,
                    prizeWon: prize,
                    fastestLap: true,
                    bestLapTime: bestLapTimeRef.current,
                  };
                }

                // Update championship standings
                const updatedStandings = careerData.championshipStandings.map((s) => {
                  if (s.isPlayer) {
                    return { ...s, points: s.points + pts };
                  }
                  return { ...s, points: s.points + Math.floor(Math.random() * 18) };
                });

                const updatedCareer: CareerSaveData = {
                  ...careerData,
                  budget: careerData.budget + prize,
                  reputation: careerData.reputation + 40,
                  careerWins: finishPos === 1 ? careerData.careerWins + 1 : careerData.careerWins,
                  careerPodiums: finishPos <= 3 ? careerData.careerPodiums + 1 : careerData.careerPodiums,
                  careerRaces: careerData.careerRaces + 1,
                  currentRoundIndex: Math.min(newSchedule.length - 1, roundIdx + 1),
                  seasonSchedule: newSchedule,
                  championshipStandings: updatedStandings,
                };
                saveCareerData(updatedCareer);
                setCareerData(updatedCareer);
              }
            } else if (currentLapRef.current === totalRequiredLaps) {
              raceEngineer.reportFinalLap();
            } else {
              const pStanding = standingsRef.current.find((s) => s.isPlayer);
              const pos = pStanding ? pStanding.position : 1;
              const gap = pStanding ? pStanding.gapToLeader : '+0.0s';
              raceEngineer.reportGap(pos, gap);
            }
          }
          prevProgressRef.current = curProgress;

          // Camera Dynamic Positioning
          const activeCamMode = cameraModeRef.current;
          const carPos = phys.state.position;
          const heading = phys.state.heading;
          _headingVec.set(-Math.sin(heading), 0, -Math.cos(heading));

          if (activeCamMode === 'CHASE') {
            // High speed follow cam with dynamic FOV speed warp
            const speedRatio = Math.min(1.0, phys.state.speedKmh / 320);
            camera.fov = THREE.MathUtils.lerp(65, 78, speedRatio);
            camera.updateProjectionMatrix();

            const chaseDist = 5.2;
            const chaseHeight = 2.1;
            _camIdealPos.copy(carPos).addScaledVector(_headingVec, -chaseDist);
            _camIdealPos.y += chaseHeight;

            camera.position.lerp(_camIdealPos, 0.14);
            _camTarget.copy(carPos).addScaledVector(_headingVec, 6.0);
            _camTarget.y += 0.8;
            camera.lookAt(_camTarget);
          } else if (activeCamMode === 'COCKPIT') {
            // Authentic F1 broadcast T-Cam over driver's helmet looking over the Halo
            camera.fov = 74;
            camera.updateProjectionMatrix();

            _camIdealPos.copy(carPos);
            _camIdealPos.y += 0.82;
            _camIdealPos.addScaledVector(_headingVec, 0.1);

            camera.position.copy(_camIdealPos);
            _camTarget.copy(carPos).addScaledVector(_headingVec, 15.0);
            _camTarget.y += 0.5;
            camera.lookAt(_camTarget);
          } else if (activeCamMode === 'NOSE') {
            // Low nose cone perspective
            camera.fov = 82;
            camera.updateProjectionMatrix();

            _camIdealPos.copy(carPos).addScaledVector(_headingVec, 1.8);
            _camIdealPos.y += 0.35;

            camera.position.copy(_camIdealPos);
            _camTarget.copy(carPos).addScaledVector(_headingVec, 20.0);
            _camTarget.y += 0.3;
            camera.lookAt(_camTarget);
          } else {
            // BROADCAST Trackside Camera (snaps to trackside towers)
            camera.fov = 45;
            camera.updateProjectionMatrix();

            const towerProgress = (Math.floor(curProgress * 12) / 12);
            const towerPoint = track.getTrackPoint(towerProgress);
            camera.position.set(towerPoint.x, towerPoint.y + 6.0, towerPoint.z);
            camera.lookAt(carPos.x, carPos.y + 0.5, carPos.z);
          }

          // Apply camera dynamic G-force micro-shake & cockpit vibration
          if (curGameState === 'RACING') {
            const camShake = vfx.getCameraShake(phys.state.speedKmh, phys.state.rpm, phys.state.isOnCurb, now);
            camera.position.add(camShake);
          }

          // Update Visual Effects (Titanium floor sparks, high speed streaks)
          vfx.update(dt, carPos, phys.state.heading, phys.state.speedKmh, phys.state.isOnCurb, isSoftwareGl);

          // Update 3D Pit Ingress Hologram & Chevrons pulse
          track.updatePitIngressPulse(now, phys.state.pitRequested);

          // Throttle React state updates to ~25Hz for silky smooth HUD without re-render overhead
          hudThrottleTimer += dt;
          if (hudThrottleTimer >= 0.04) {
            hudThrottleTimer = 0;
            setTelemetry(phys.getTelemetry());

            const curLapTime = isRaceRunning ? now - lapStartTimeRef.current : 0;
            setSession((s) => ({
              ...s,
              currentLap: currentLapRef.current,
              currentLapTime: curLapTime,
              lastLapTime: lastLapTimeRef.current,
              bestLapTime: bestLapTimeRef.current,
              totalLaps: gameMode === 'TIME_TRIAL' ? 5 : activeTrackConfig.totalLaps,
            }));

            if (aiManagerRef.current && gameMode !== 'TIME_TRIAL') {
              const liveStandings = aiManagerRef.current.getStandings(
                curProgress,
                currentLapRef.current,
                lapStartTimeRef.current,
                bestLapTimeRef.current,
                activeTeam
              );
              setStandings(liveStandings);
              standingsRef.current = liveStandings;
            }

            // Proactive race engineer voice alerts (wear, fuel, wing damage)
            if (isRaceRunning) {
              const maxWear = Math.round(Math.max(...phys.state.tireWear));
              if (maxWear >= 65) {
                raceEngineer.reportTireStatus(phys.state.tireCompound, maxWear, Math.round(phys.state.tireTemp[0]));
              }
              if (phys.state.fuelKg <= 6.5) {
                const lapsRem = Math.max(0.2, phys.state.fuelKg / 2.3);
                raceEngineer.reportFuelStatus(Math.round(phys.state.fuelKg), lapsRem);
              }
              if (phys.state.damage >= 15 && prevDamageRef.current < 15) {
                raceEngineer.reportPitInstruction('WING_DAMAGE');
              }
              prevDamageRef.current = phys.state.damage;
            }
          }
        }
      }

      // Render Scene
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else animationFrameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) afterDraw(tick);
    else animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      vfx.dispose(scene);
      renderer.dispose();
      audioEngine.stopAll();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeTrackConfig, activeTeam, activeCompound, gameMode, isManualShift]);

  // Start Race Sequence with Gantry Lights
  const handleStartRace = (mode: GameMode, team: TeamConfig, track: TrackConfig, compound: TireCompound) => {
    setActiveTeam(team);
    setActiveTrackConfig(track);
    setActiveCompound(compound);
    setGameMode(mode);

    audioEngine.ensureStarted();
    audioEngine.playRaceIngressTone();

    // Reset session
    currentLapRef.current = 1;
    bestLapTimeRef.current = 0;
    lastLapTimeRef.current = 0;
    lapProgressRef.current = 0;
    prevProgressRef.current = 0;

    // Reposition player at pole
    if (physicsRef.current && trackInstanceRef.current) {
      const p = trackInstanceRef.current.getTrackPoint(0);
      const tan = trackInstanceRef.current.getTrackTangent(0);
      const heading = Math.atan2(-tan.x, -tan.z);
      physicsRef.current.state.position.copy(p);
      physicsRef.current.state.position.y = 0.05;
      physicsRef.current.state.heading = heading;
      physicsRef.current.state.velocity.set(0, 0, 0);
      physicsRef.current.state.speedKmh = 0;
      physicsRef.current.state.gear = 1;
      physicsRef.current.state.damage = 0;
      physicsRef.current.setCompound(compound);
    }

    if (aiManagerRef.current) {
      aiManagerRef.current.resetGrid();
    }

    setGameState('GRID_START');
    setGantryCount(0);
    raceActiveRef.current = false;

    // Gantry countdown sequence (5 red lights count up, then extinguish!)
    const lightSequence = [
      setTimeout(() => {
        setGantryCount(1);
        audioEngine.playGantryBeep(false);
      }, 700),
      setTimeout(() => {
        setGantryCount(2);
        audioEngine.playGantryBeep(false);
      }, 1400),
      setTimeout(() => {
        setGantryCount(3);
        audioEngine.playGantryBeep(false);
      }, 2100),
      setTimeout(() => {
        setGantryCount(4);
        audioEngine.playGantryBeep(false);
      }, 2800),
      setTimeout(() => {
        setGantryCount(5);
        audioEngine.playGantryBeep(false);
      }, 3500),
      setTimeout(() => {
        // LIGHTS OUT!
        setGantryCount(6);
        audioEngine.playGantryBeep(true);
        setGameState('RACING');
        raceActiveRef.current = true;
        lapStartTimeRef.current = performance.now();
        showRadio('LIGHTS OUT AND AWAY WE GO!');
      }, 4300 + Math.random() * 800),
    ];
  };

  const handleRestartRace = () => {
    handleStartRace(gameMode, activeTeam, activeTrackConfig, activeCompound);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleManualShift = () => {
    const next = !isManualShift;
    setIsManualShift(next);
    if (physicsRef.current) {
      physicsRef.current.setManualShift(next);
    }
  };

  const handleCompletePitStop = (choice: PitStrategyChoice, finalStopTimeSec: number) => {
    if (physicsRef.current && trackInstanceRef.current && playerCarHandlesRef.current) {
      const phys = physicsRef.current;
      phys.serviceCar(choice.newCompound, choice.fuelToAddKg, choice.repairDamage);
      setActiveCompound(choice.newCompound);

      // Launch car out of pit box with pit limiter speed (80 km/h)
      const tan = trackInstanceRef.current.getTrackTangent(0.01);
      phys.state.speedKmh = 80;
      phys.state.velocity.copy(tan).multiplyScalar(80 / 3.6);
      phys.state.position.copy(trackInstanceRef.current.pitBoxPosition).addScaledVector(tan, 6);

      // Resume racing
      setGameState('RACING');
      raceEngineer.reportPitInstruction('GREEN_LIGHT_GO');

      // Advance AI rivals on track by the stationary stop time
      if (aiManagerRef.current && gameMode !== 'TIME_TRIAL') {
        aiManagerRef.current.aiCars.forEach((ai) => {
          const lapGain = (finalStopTimeSec * 70.0) / trackInstanceRef.current!.curve.getLength();
          ai.progress = (ai.progress + lapGain) % 1.0;
          ai.totalDistance += finalStopTimeSec * 70.0;
        });
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Isolated Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStartRace={handleStartRace}
          onOpenCareerHub={() => setGameState('CAREER_HUB')}
          teams={TEAMS}
          tracks={TRACKS}
          careerData={careerData}
          timeTrialRecords={timeTrialRecords}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Career Mode Progression Hub */}
      {gameState === 'CAREER_HUB' && (
        <CareerHub
          careerData={careerData}
          teams={TEAMS}
          tracks={TRACKS}
          onStartCareerRace={() => {
            const currentRound = careerData.seasonSchedule[careerData.currentRoundIndex] || careerData.seasonSchedule[0];
            const trk = TRACKS.find((t) => t.id === currentRound.trackId) || TRACKS[0];
            const currentTm = TEAMS.find((t) => t.id === careerData.currentTeamId) || TEAMS[0];
            handleStartRace('CAREER', currentTm, trk, 'SOFT');
          }}
          onBackToTitle={() => setGameState('TITLE')}
          onUpdateCareerData={(updated) => setCareerData(updated)}
        />
      )}

      {/* Live Racing HUD */}
      {(gameState === 'RACING' || gameState === 'GRID_START' || gameState === 'PAUSED') && (
        <>
          <TelemetryHUD
            telemetry={telemetry}
            session={session}
            standings={standings}
            mode={gameMode}
            radioMessage={radioMessage}
            gantryCount={gantryCount}
            onRequestPitStop={handleTogglePitStop}
            onRequestRadioCheck={handleRequestRadioCheck}
          />

          <ControlOverlay
            cameraMode={cameraMode}
            onSetCameraMode={(mode) => setCameraMode(mode)}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((prev) => !prev)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isManualShift={isManualShift}
            onToggleManualShift={handleToggleManualShift}
            isRadioVoiceEnabled={isRadioVoiceEnabled}
            onToggleRadioVoice={handleToggleRadioVoice}
            onRestart={handleRestartRace}
          />

          <TouchControls inputState={inputRef} />
        </>
      )}

      {/* Interactive Pit Stop Interface & Timing Mini-Game Modal */}
      {gameState === 'PIT_STOP' && (
        <PitStopModal
          telemetry={telemetry}
          onCompletePitStop={handleCompletePitStop}
        />
      )}

      {/* Pause Modal */}
      {isPaused && gameState === 'RACING' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs font-['Chakra_Petch',sans-serif] text-white pointer-events-auto">
          <div className="bg-[#0b0f17] border border-[#20293a] p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full">
            <h2 className="text-2xl font-black font-['Orbitron',sans-serif] tracking-wider">RACE PAUSED</h2>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setIsPaused(false)}
                className="bg-[#E10600] hover:bg-[#c20500] text-white py-3 rounded-xl font-bold text-sm tracking-wider cursor-pointer"
              >
                RESUME RACE (Esc)
              </button>
              <button
                onClick={handleRestartRace}
                className="bg-[#141b27] hover:bg-[#1f2838] border border-[#222e42] py-3 rounded-xl font-bold text-sm text-[#cbd5e1] cursor-pointer"
              >
                RESTART RACE
              </button>
              <button
                onClick={() => {
                  setIsPaused(false);
                  setGameState('TITLE');
                }}
                className="bg-[#141b27] hover:bg-[#1f2838] border border-[#222e42] py-3 rounded-xl font-bold text-sm text-[#cbd5e1] cursor-pointer"
              >
                EXIT TO TITLE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Race / Finish Results Modal */}
      {gameState === 'FINISHED' && (
        <PostRaceModal
          mode={gameMode}
          session={session}
          standings={standings}
          isNewPersonalBest={isNewPersonalBest}
          prizeMoneyWon={prizeMoneyWon}
          pointsEarned={pointsEarned}
          onRestart={handleRestartRace}
          onContinue={() => {
            if (gameMode === 'CAREER') {
              setGameState('CAREER_HUB');
            } else {
              setGameState('TITLE');
            }
          }}
          onMainMenu={() => setGameState('TITLE')}
        />
      )}
    </div>
  );
};
