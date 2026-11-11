import * as THREE from 'three';
import { CarTelemetry, CarUpgrades, InputState, TeamConfig, TireCompound } from '../types/game';
import { TrackInstance } from './proceduralTrack';
import { audioEngine } from './audioEngine';

/**
 * Formula 1 Car Physics Simulation Engine
 * Simulates aerodynamic downforce, 8-speed gearbox, DRS, ERS battery boost,
 * tire grip, slip angles, and curb rumble.
 */

export interface CarPhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: number; // yaw angle in radians
  speedKmh: number;
  gear: number;
  rpm: number;
  steerAngle: number;
  throttle: number;
  brake: number;
  ersCharge: number; // 0..100%
  ersDeploying: boolean;
  drsActive: boolean;
  drsAvailable: boolean;
  tireWear: [number, number, number, number];
  tireTemp: [number, number, number, number];
  tireCompound: TireCompound;
  lateralG: number;
  isDrifting: boolean;
  isOnCurb: boolean;
  isOffTrack: boolean;
  damage: number;
  wheelRotation: number;
  fuelKg: number;
  maxFuelKg: number;
  pitRequested: boolean;
  inPitLane: boolean;
}

export class CarPhysics {
  public state: CarPhysicsState;
  private team: TeamConfig;
  private upgrades: CarUpgrades;
  private isManualShift: boolean = false;

  // Reusable vectors (Zero GC in animation loop per Three.js skill)
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _accel = new THREE.Vector3();

  // Gear ratios for 8-speed F1 gearbox
  private readonly GEAR_RATIOS = [3.4, 2.5, 1.95, 1.55, 1.28, 1.08, 0.92, 0.78];
  private readonly FINAL_DRIVE = 3.8;
  private readonly MAX_RPM = 15000;
  private readonly IDLE_RPM = 4000;

  constructor(team: TeamConfig, initialPos: THREE.Vector3, initialHeading: number, upgrades?: CarUpgrades, compound: TireCompound = 'SOFT') {
    this.team = team;
    this.upgrades = upgrades || { engine: 0, aero: 0, chassis: 0, brakes: 0, ersSystem: 0 };
    this.state = {
      position: initialPos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      heading: initialHeading,
      speedKmh: 0,
      gear: 1,
      rpm: this.IDLE_RPM,
      steerAngle: 0,
      throttle: 0,
      brake: 0,
      ersCharge: 100,
      ersDeploying: false,
      drsActive: false,
      drsAvailable: false,
      tireWear: [0, 0, 0, 0],
      tireTemp: [85, 85, 90, 90], // optimal operating window
      tireCompound: compound,
      lateralG: 0,
      isDrifting: false,
      isOnCurb: false,
      isOffTrack: false,
      damage: 0,
      wheelRotation: 0,
      fuelKg: 30.0,
      maxFuelKg: 50.0,
      pitRequested: false,
      inPitLane: false,
    };
  }

  public setManualShift(manual: boolean) {
    this.isManualShift = manual;
  }

  public setCompound(compound: TireCompound) {
    this.state.tireCompound = compound;
  }

  public togglePitRequest(): boolean {
    this.state.pitRequested = !this.state.pitRequested;
    if (this.state.pitRequested) {
      audioEngine.playBoxRadio();
    }
    return this.state.pitRequested;
  }

  public serviceCar(newCompound: TireCompound, fuelToAddKg: number, repairDamage: boolean = true) {
    this.state.tireWear = [0, 0, 0, 0];
    this.state.tireTemp = [85, 85, 90, 90];
    this.state.tireCompound = newCompound;
    this.state.fuelKg = Math.min(this.state.maxFuelKg, this.state.fuelKg + fuelToAddKg);
    this.state.pitRequested = false;
    this.state.inPitLane = false;
    if (repairDamage) {
      this.state.damage = 0; // 100% full repair of front wing & chassis
    }
  }

  public update(dt: number, input: InputState, track: TrackInstance) {
    // Clamp dt to avoid physics blow-ups per skill
    const clampedDt = Math.min(dt, 0.05);

    // 1. Upgrade modifiers
    const engineBonus = this.upgrades.engine * 0.06; // +24% max
    const aeroBonus = this.upgrades.aero * 0.07;     // +28% max
    const chassisBonus = this.upgrades.chassis * 0.08; // -32% tire wear & sharper turn
    const brakeBonus = this.upgrades.brakes * 0.08;   // +32% stopping power
    const ersBonus = this.upgrades.ersSystem * 0.1;

    // 2. Compound Grip Modifier
    let compoundGrip = 1.0;
    let wearRateMultiplier = 1.0;
    if (this.state.tireCompound === 'SOFT') {
      compoundGrip = 1.15;
      wearRateMultiplier = 1.6;
    } else if (this.state.tireCompound === 'HARD') {
      compoundGrip = 0.92;
      wearRateMultiplier = 0.55;
    }

    // Apply chassis upgrade reduction to tire wear
    wearRateMultiplier *= Math.max(0.65, 1.0 - chassisBonus);

    // 3. DRS Availability check based on track location
    const trackInfo = track.findClosestProgress(this.state.position);
    const progress = trackInfo.progress;
    let inDrsZone = false;
    for (const zone of track.drsZones) {
      if (progress >= zone.startProgress && progress <= zone.endProgress) {
        inDrsZone = true;
        break;
      }
    }
    this.state.drsAvailable = inDrsZone;
    if (!inDrsZone) {
      this.state.drsActive = false;
    } else if (input.drs) {
      this.state.drsActive = !this.state.drsActive;
      audioEngine.playRadioChime();
    }

    // 4. ERS Deployment
    if (input.ers && this.state.ersCharge > 2) {
      this.state.ersDeploying = true;
      this.state.ersCharge = Math.max(0, this.state.ersCharge - clampedDt * (18 / (1 + ersBonus)));
    } else {
      this.state.ersDeploying = false;
      // Passive recharge under braking
      if (this.state.brake > 0.1) {
        this.state.ersCharge = Math.min(100, this.state.ersCharge + clampedDt * (12 * (1 + ersBonus)));
      }
    }

    // 5. Track Surface Check (Tarmac, Curb, Grass/Gravel)
    const distFromCenter = trackInfo.distanceToCenter;
    const halfWidth = track.getTrackWidth() / 2;
    this.state.isOnCurb = distFromCenter > halfWidth - 0.2 && distFromCenter < halfWidth + 1.6;
    this.state.isOffTrack = distFromCenter >= halfWidth + 1.6;

    // Surface grip and drag penalty
    let surfaceGrip = 1.0;
    let surfaceDrag = 1.0;
    if (this.state.isOnCurb) {
      surfaceGrip = 0.88;
    } else if (this.state.isOffTrack) {
      surfaceGrip = 0.45;
      surfaceDrag = 2.4;
    }

    // 6. Manual or Automatic Gear Shifting
    if (this.isManualShift) {
      if (input.shiftUp && this.state.gear < 8) {
        this.state.gear++;
        this.state.rpm = Math.max(this.IDLE_RPM, this.state.rpm * 0.72);
        audioEngine.triggerGearShift(true);
      } else if (input.shiftDown && this.state.gear > 1) {
        this.state.gear--;
        this.state.rpm = Math.min(this.MAX_RPM - 500, this.state.rpm * 1.35);
        audioEngine.triggerGearShift(false);
      }
    } else {
      // Auto transmission
      if (this.state.rpm > 13400 && this.state.gear < 8) {
        this.state.gear++;
        this.state.rpm *= 0.74;
        audioEngine.triggerGearShift(true);
      } else if (this.state.rpm < 7800 && this.state.gear > 1 && this.state.speedKmh < this.getMinGearSpeed(this.state.gear)) {
        this.state.gear--;
        this.state.rpm *= 1.32;
        audioEngine.triggerGearShift(false);
      }
    }

    // 7. Steering Calculation with Speed-Sensitive Damping
    const targetSteer = (input.steerLeft ? 1 : 0) - (input.steerRight ? 1 : 0);
    const speedRatio = Math.min(this.state.speedKmh / 320, 1.0);
    // Max steering lock decreases from 0.75 rad at low speed down to 0.2 rad at 300+ km/h
    const maxLock = THREE.MathUtils.lerp(0.72, 0.18, speedRatio);
    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteer * maxLock, 14, clampedDt);

    // 8. Throttle & Brake Inputs
    this.state.throttle = THREE.MathUtils.damp(this.state.throttle, input.throttle ? 1 : 0, 12, clampedDt);
    this.state.brake = THREE.MathUtils.damp(this.state.brake, input.brake ? 1 : 0, 18, clampedDt);

    // Forward and Right vectors from heading
    this._forward.set(-Math.sin(this.state.heading), 0, -Math.cos(this.state.heading));
    this._right.set(this._forward.z, 0, -this._forward.x);

    // Current forward speed
    let currentForwardSpeed = this.state.velocity.dot(this._forward);
    let currentLateralSpeed = this.state.velocity.dot(this._right);

    // 9. Aerodynamic Downforce & Grip (Damage to front wing reduces downforce!)
    const damageDownforceFactor = Math.max(0.65, 1.0 - (this.state.damage / 100) * 0.35);
    const aeroDownforce = (currentForwardSpeed * currentForwardSpeed) * 0.0035 * (1 + aeroBonus) * damageDownforceFactor;
    const totalGrip = (1.8 + aeroDownforce) * compoundGrip * surfaceGrip;

    // 10. Engine Power & Acceleration with Fuel Consumption
    const basePower = 720 * (1 + engineBonus) * (this.team.baseStats.acceleration / 8.0);
    const ersBoostPower = this.state.ersDeploying ? 180 * (1 + ersBonus) : 0;
    const gearRatio = this.GEAR_RATIOS[this.state.gear - 1];
    const wheelTorque = (basePower + ersBoostPower) * (gearRatio / 1.5);

    // Fuel consumption: burns ~2.5 kg per lap at full throttle
    const fuelBurn = clampedDt * (0.05 + this.state.throttle * 0.22) * (this.state.rpm / 15000);
    this.state.fuelKg = Math.max(0, this.state.fuelKg - fuelBurn);

    let driveForce = this.state.throttle * wheelTorque;
    // Out of fuel limp home mode
    if (this.state.fuelKg <= 0) {
      driveForce *= 0.16;
    }
    if (this.state.brake > 0.05) {
      driveForce = 0;
    }

    // Aerodynamic Drag Force (DRS reduces drag by 28%!)
    const dragCoeff = this.state.drsActive ? 0.00065 : 0.00092;
    const aeroDrag = currentForwardSpeed * Math.abs(currentForwardSpeed) * dragCoeff;
    const rollingResistance = 12.0 * surfaceDrag;

    // Braking Force
    const brakeForce = this.state.brake * (1800 * (1 + brakeBonus));

    // Net Longitudinal Force (Fuel weight directly influences mass & acceleration!)
    const netLongitudinalForce = driveForce - (brakeForce * Math.sign(currentForwardSpeed || 1)) - aeroDrag - rollingResistance;
    const mass = 798 + (this.state.fuelKg * 1.0) - chassisBonus * 40; // F1 min weight ~798kg + fuel mass
    const forwardAccel = netLongitudinalForce / mass;

    currentForwardSpeed += forwardAccel * clampedDt;
    if (currentForwardSpeed < 0 && !input.brake) {
      currentForwardSpeed = 0;
    }

    // Pit lane speed limiter (80 km/h)
    if (this.state.inPitLane && currentForwardSpeed > (80 / 3.6)) {
      currentForwardSpeed = 80 / 3.6;
    }

    // 11. Steering & Lateral Grip (Cornering)
    const turnRate = (currentForwardSpeed / 3.6) * Math.sin(this.state.steerAngle) * (1.2 + chassisBonus * 0.2);
    this.state.heading += turnRate * clampedDt;

    // Lateral tire slip
    const maxLateralGripSpeed = totalGrip * 8.5;
    const isSlipping = Math.abs(currentLateralSpeed) > maxLateralGripSpeed;
    this.state.isDrifting = isSlipping && currentForwardSpeed > 40;

    // Lateral friction bringing lateral speed towards zero
    const lateralDamping = isSlipping ? 3.5 : 12.0;
    currentLateralSpeed = THREE.MathUtils.damp(currentLateralSpeed, 0, lateralDamping * surfaceGrip, clampedDt);

    // Reconstruct velocity
    this.state.velocity.copy(this._forward).multiplyScalar(currentForwardSpeed);
    this.state.velocity.addScaledVector(this._right, currentLateralSpeed);

    // Update position
    this.state.position.addScaledVector(this.state.velocity, clampedDt);
    this.state.speedKmh = Math.max(0, currentForwardSpeed * 3.6);

    // 12. RPM calculation from gear and speed
    const calculatedRpm = (this.state.speedKmh * 38 * gearRatio * this.FINAL_DRIVE) / 8.0;
    const targetRpm = Math.min(this.MAX_RPM, Math.max(this.IDLE_RPM, calculatedRpm));
    this.state.rpm = THREE.MathUtils.damp(this.state.rpm, targetRpm, 15, clampedDt);

    // 13. Lateral G-force calculation
    const currentLateralG = (turnRate * (currentForwardSpeed / 9.81));
    this.state.lateralG = THREE.MathUtils.damp(this.state.lateralG, currentLateralG, 8, clampedDt);

    // 14. Tire wear & temperature simulation
    const speedRatioNorm = this.state.speedKmh / 350;
    const wearDelta = clampedDt * 0.008 * wearRateMultiplier * (1 + Math.abs(this.state.lateralG) * 0.8 + (this.state.isDrifting ? 3.0 : 0));
    this.state.tireWear[0] = Math.min(100, this.state.tireWear[0] + wearDelta * 1.1); // FL
    this.state.tireWear[1] = Math.min(100, this.state.tireWear[1] + wearDelta * 1.0); // FR
    this.state.tireWear[2] = Math.min(100, this.state.tireWear[2] + wearDelta * 1.2 * (this.state.throttle > 0.8 ? 1.4 : 1)); // RL
    this.state.tireWear[3] = Math.min(100, this.state.tireWear[3] + wearDelta * 1.2 * (this.state.throttle > 0.8 ? 1.4 : 1)); // RR

    // Tire temp: rises with slip and braking, cools with straight-line airflow
    const targetTemp = 85 + (this.state.brake * 25) + (Math.abs(this.state.lateralG) * 20);
    this.state.tireTemp[0] = THREE.MathUtils.damp(this.state.tireTemp[0], targetTemp, 1.5, clampedDt);
    this.state.tireTemp[1] = THREE.MathUtils.damp(this.state.tireTemp[1], targetTemp, 1.5, clampedDt);
    this.state.tireTemp[2] = THREE.MathUtils.damp(this.state.tireTemp[2], targetTemp, 1.5, clampedDt);
    this.state.tireTemp[3] = THREE.MathUtils.damp(this.state.tireTemp[3], targetTemp, 1.5, clampedDt);

    // 15. Wheel Spin Rotation
    this.state.wheelRotation += (currentForwardSpeed / 0.33) * clampedDt;

    // 16. Sound Engine Update (with pit limiter stutter and floor sparks)
    const isSparking = (this.state.speedKmh > 265 && this.state.throttle > 0.8) || (this.state.isOnCurb && this.state.speedKmh > 130);
    audioEngine.updateEngine(
      this.state.rpm,
      this.state.throttle,
      speedRatioNorm,
      this.state.isDrifting,
      this.state.isOnCurb,
      this.state.inPitLane,
      isSparking
    );

    // Track barrier collision detection (boundary radius ~14m from centerline)
    if (distFromCenter > halfWidth + 8.5) {
      // Rebound towards track center
      const toCenter = new THREE.Vector3().subVectors(trackInfo.centerPoint, this.state.position).normalize();
      this.state.velocity.reflect(toCenter.clone().negate()).multiplyScalar(0.4);
      this.state.position.addScaledVector(toCenter, 1.2);
      this.state.damage = Math.min(100, this.state.damage + 8);
      audioEngine.playCollisionSound(0.6);
    }
  }

  private getMinGearSpeed(gear: number): number {
    const speeds = [0, 45, 80, 120, 165, 210, 260, 305];
    return speeds[gear - 1] || 0;
  }

  public getTelemetry(): CarTelemetry {
    return {
      speedKmh: Math.round(this.state.speedKmh),
      rpm: Math.round(this.state.rpm),
      maxRpm: this.MAX_RPM,
      gear: this.state.gear,
      throttle: this.state.throttle,
      brake: this.state.brake,
      steer: this.state.steerAngle,
      drsAvailable: this.state.drsAvailable,
      drsActive: this.state.drsActive,
      ersCharge: Math.round(this.state.ersCharge),
      ersDeploying: this.state.ersDeploying,
      tireWear: [
        Math.round(this.state.tireWear[0]),
        Math.round(this.state.tireWear[1]),
        Math.round(this.state.tireWear[2]),
        Math.round(this.state.tireWear[3]),
      ],
      tireTemp: [
        Math.round(this.state.tireTemp[0]),
        Math.round(this.state.tireTemp[1]),
        Math.round(this.state.tireTemp[2]),
        Math.round(this.state.tireTemp[3]),
      ],
      tireCompound: this.state.tireCompound,
      fuelKg: Number(this.state.fuelKg.toFixed(1)),
      maxFuelKg: this.state.maxFuelKg,
      fuelPercent: Math.round((this.state.fuelKg / this.state.maxFuelKg) * 100),
      lateralG: Number(this.state.lateralG.toFixed(2)),
      damage: Math.round(this.state.damage),
      isOffTrack: this.state.isOffTrack,
      isOnCurb: this.state.isOnCurb,
      pitRequested: this.state.pitRequested,
      inPitLane: this.state.inPitLane,
    };
  }
}
