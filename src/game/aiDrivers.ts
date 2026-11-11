import * as THREE from 'three';
import { DriverStanding, TeamConfig } from '../types/game';
import { TrackInstance } from './proceduralTrack';
import { createProceduralF1Car, F1CarMeshHandles } from './proceduralCar';

/**
 * AI Drivers Engine for Apex GP
 * Manages opponent F1 cars, spline racing lines, dynamic speed, overtaking, and telemetry standings.
 */

export interface AICarInstance {
  team: TeamConfig;
  handles: F1CarMeshHandles;
  progress: number; // 0..1 along track spline
  lap: number;
  speedKmh: number;
  targetSpeedKmh: number;
  lateralOffset: number; // offset from centerline (-4..+4 meters)
  targetLateralOffset: number;
  lastLapTime: number;
  bestLapTime: number;
  lapStartTime: number;
  totalDistance: number;
  wheelRotation: number;
}

export class AIDriversManager {
  public aiCars: AICarInstance[] = [];
  private track: TrackInstance;

  constructor(teams: TeamConfig[], track: TrackInstance, playerTeamId: string) {
    this.track = track;

    // Filter out player team, take up to 5 rival teams
    const rivalTeams = teams.filter(t => t.id !== playerTeamId).slice(0, 5);

    rivalTeams.forEach((team, index) => {
      // Start in staggered grid slots behind/around player
      const gridSlot = index + 2; // Slot 2, 3, 4, 5, 6
      const gridT = (1 - (gridSlot * 8) / track.curve.getLength()) % 1;
      const handles = createProceduralF1Car(team, 'MEDIUM');
      track.trackGroup.add(handles.root);

      const offset = (gridSlot % 2 === 1) ? -2.8 : 2.8;

      this.aiCars.push({
        team,
        handles,
        progress: gridT,
        lap: 1,
        speedKmh: 0,
        targetSpeedKmh: 280,
        lateralOffset: offset,
        targetLateralOffset: (Math.random() - 0.5) * 4.0,
        lastLapTime: 0,
        bestLapTime: 84000 + index * 1200,
        lapStartTime: performance.now(),
        totalDistance: 0,
        wheelRotation: 0,
      });
    });
  }

  public resetGrid() {
    this.aiCars.forEach((ai, index) => {
      const gridSlot = index + 2;
      const gridT = (1 - (gridSlot * 8) / this.track.curve.getLength()) % 1;
      ai.progress = gridT;
      ai.lap = 1;
      ai.speedKmh = 0;
      ai.lateralOffset = (gridSlot % 2 === 1) ? -2.8 : 2.8;
      ai.targetLateralOffset = 0;
      ai.lapStartTime = performance.now();
      ai.totalDistance = 0;

      const pt = this.track.getTrackPoint(gridT);
      const tangent = this.track.getTrackTangent(gridT);
      const up = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      ai.handles.root.position.copy(pt).addScaledVector(binormal, ai.lateralOffset);
      ai.handles.root.position.y += 0.05;
      ai.handles.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
    });
  }

  public update(dt: number, raceActive: boolean, playerPos: THREE.Vector3): { slipstreamBoost: boolean } {
    const clampedDt = Math.min(dt, 0.05);
    const trackLength = this.track.curve.getLength();
    let slipstreamBoost = false;

    this.aiCars.forEach((ai) => {
      if (!raceActive) {
        // Grid idle revving
        ai.handles.rearLed.visible = Math.sin(performance.now() * 0.015) > 0;
        return;
      }

      // 1. Race Pace Calculation based on track curvature
      const lookAheadT = (ai.progress + 0.02) % 1;
      const curTan = this.track.getTrackTangent(ai.progress);
      const lookTan = this.track.getTrackTangent(lookAheadT);
      const turnSharpness = 1.0 - Math.max(0, curTan.dot(lookTan));

      // Straight line speed vs corner braking speed
      const baseTopSpeed = 300 + (ai.team.baseStats.topSpeed * 4.0);
      const cornerSpeed = THREE.MathUtils.lerp(baseTopSpeed, 140, Math.min(1.0, turnSharpness * 6.0));
      ai.targetSpeedKmh = cornerSpeed;

      // Accelerate / Brake towards target speed
      if (ai.speedKmh < ai.targetSpeedKmh) {
        ai.speedKmh += (48 * (ai.team.baseStats.acceleration / 8.0)) * clampedDt;
      } else {
        ai.speedKmh -= 90 * clampedDt;
      }

      // Progress along track
      const speedMs = ai.speedKmh / 3.6;
      const progressDelta = (speedMs * clampedDt) / trackLength;
      ai.progress += progressDelta;
      ai.totalDistance += speedMs * clampedDt;

      // Lap completion
      if (ai.progress >= 1.0) {
        ai.progress %= 1.0;
        ai.lap++;
        const now = performance.now();
        ai.lastLapTime = now - ai.lapStartTime;
        if (ai.bestLapTime === 0 || ai.lastLapTime < ai.bestLapTime) {
          ai.bestLapTime = ai.lastLapTime;
        }
        ai.lapStartTime = now;
      }

      // Smooth lateral racing line shift
      ai.lateralOffset = THREE.MathUtils.damp(ai.lateralOffset, ai.targetLateralOffset, 1.2, clampedDt);

      // Position AI car 3D mesh on track
      const pt = this.track.getTrackPoint(ai.progress);
      const tangent = this.track.getTrackTangent(ai.progress);
      const up = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      ai.handles.root.position.copy(pt).addScaledVector(binormal, ai.lateralOffset);
      ai.handles.root.position.y += 0.05;
      ai.handles.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);

      // Spin wheels
      ai.wheelRotation += (speedMs / 0.33) * clampedDt;
      ai.handles.wheelMeshes.forEach(w => {
        w.rotation.x = ai.wheelRotation;
      });

      // DRS flap animation on straights
      let inDrs = false;
      for (const zone of this.track.drsZones) {
        if (ai.progress >= zone.startProgress && ai.progress <= zone.endProgress) {
          inDrs = true;
          break;
        }
      }
      ai.handles.drsFlap.rotation.x = inDrs ? -0.38 : 0;

      // Check slipstream with player (if player is closely trailing directly behind AI car within 18m)
      const distToPlayer = ai.handles.root.position.distanceTo(playerPos);
      if (distToPlayer < 22 && distToPlayer > 4) {
        const toAI = new THREE.Vector3().subVectors(ai.handles.root.position, playerPos).normalize();
        if (toAI.dot(tangent) > 0.85) {
          slipstreamBoost = true;
        }
      }
    });

    return { slipstreamBoost };
  }

  public getStandings(
    playerProgress: number,
    playerLap: number,
    playerLapStartTime: number,
    playerBestLap: number,
    playerTeam: TeamConfig
  ): DriverStanding[] {
    const list: DriverStanding[] = [];

    // Player standing
    const playerDistance = (playerLap - 1) + playerProgress;
    const playerNow = performance.now();
    const playerCurrentLapTime = playerNow - playerLapStartTime;

    list.push({
      id: 'player',
      driverName: playerTeam.driverName,
      driverNumber: playerTeam.driverNumber,
      teamName: playerTeam.name,
      primaryColor: playerTeam.primaryColor,
      position: 1,
      lap: playerLap,
      lapProgress: playerProgress,
      totalDistance: playerDistance,
      lastLapTime: playerCurrentLapTime,
      bestLapTime: playerBestLap,
      gapToLeader: 'LEADER',
      isPlayer: true,
    });

    // AI standings
    this.aiCars.forEach(ai => {
      const aiDistance = (ai.lap - 1) + ai.progress;
      list.push({
        id: ai.team.id,
        driverName: ai.team.driverName,
        driverNumber: ai.team.driverNumber,
        teamName: ai.team.name,
        primaryColor: ai.team.primaryColor,
        position: 1,
        lap: ai.lap,
        lapProgress: ai.progress,
        totalDistance: aiDistance,
        lastLapTime: ai.lastLapTime,
        bestLapTime: ai.bestLapTime,
        gapToLeader: '+0.000',
        isPlayer: false,
      });
    });

    // Sort descending by total distance
    list.sort((a, b) => b.totalDistance - a.totalDistance);

    // Assign positions and time gaps
    const leader = list[0];
    list.forEach((driver, idx) => {
      driver.position = idx + 1;
      if (idx === 0) {
        driver.gapToLeader = 'LEADER';
      } else {
        const distanceDeficit = (leader.totalDistance - driver.totalDistance) * this.track.curve.getLength();
        const estSecondsGap = (distanceDeficit / 70.0).toFixed(3);
        driver.gapToLeader = `+${estSecondsGap}s`;
      }
    });

    return list;
  }

  public dispose() {
    this.aiCars.forEach(ai => {
      this.track.trackGroup.remove(ai.handles.root);
    });
    this.aiCars = [];
  }
}
