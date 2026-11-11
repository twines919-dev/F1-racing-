import * as THREE from 'three';

/**
 * High-Performance Visual & Ingress Effects System for Apex GP
 * Features:
 * 1. Titanium Skid Block Sparks Particle System (physically bouncing glowing embers)
 * 2. High-Speed Warp Streaks (radial light streaks past cockpit at >230 km/h)
 * 3. Dynamic Cockpit G-Force Micro-Shakes & Curb Vibration
 * Zero GC in update loop: pre-allocated typed arrays & vectors.
 */

export class VisualEffectsManager {
  // Sparks particle system
  private sparksPoints: THREE.Points;
  private sparksGeometry: THREE.BufferGeometry;
  private sparksPositions: Float32Array;
  private sparksVelocities: Float32Array;
  private sparksLifetimes: Float32Array;
  private sparksColors: Float32Array;
  private maxSparks: number = 90;
  private nextSparkIdx: number = 0;

  // Speed streaks system
  private streaksPoints: THREE.Points;
  private streaksGeometry: THREE.BufferGeometry;
  private streaksPositions: Float32Array;
  private maxStreaks: number = 80;

  // Reusable vectors for zero GC
  private readonly _tempVec = new THREE.Vector3();
  private readonly _carBack = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    // 1. Initialize Sparks Particle System
    this.sparksGeometry = new THREE.BufferGeometry();
    this.sparksPositions = new Float32Array(this.maxSparks * 3);
    this.sparksVelocities = new Float32Array(this.maxSparks * 3);
    this.sparksLifetimes = new Float32Array(this.maxSparks);
    this.sparksColors = new Float32Array(this.maxSparks * 3);

    // Initial spark values
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparksPositions[i * 3 + 0] = 0;
      this.sparksPositions[i * 3 + 1] = -100; // offscreen
      this.sparksPositions[i * 3 + 2] = 0;

      this.sparksLifetimes[i] = 0;

      // Bright titanium amber / white spark gradient
      this.sparksColors[i * 3 + 0] = 1.0;
      this.sparksColors[i * 3 + 1] = 0.75 + Math.random() * 0.25;
      this.sparksColors[i * 3 + 2] = 0.2 + Math.random() * 0.4;
    }

    this.sparksGeometry.setAttribute('position', new THREE.BufferAttribute(this.sparksPositions, 3));
    this.sparksGeometry.setAttribute('color', new THREE.BufferAttribute(this.sparksColors, 3));

    // Custom procedural spark particle texture (bright star flare)
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 32;
    sparkCanvas.height = 32;
    const ctx = sparkCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 200, 80, 0.9)');
    grad.addColorStop(0.7, 'rgba(255, 100, 20, 0.4)');
    grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const sparkTexture = new THREE.CanvasTexture(sparkCanvas);

    const sparksMaterial = new THREE.PointsMaterial({
      size: 0.35,
      map: sparkTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.sparksPoints = new THREE.Points(this.sparksGeometry, sparksMaterial);
    this.sparksPoints.frustumCulled = false;
    scene.add(this.sparksPoints);

    // 2. Initialize High-Speed Warp Streaks
    this.streaksGeometry = new THREE.BufferGeometry();
    this.streaksPositions = new Float32Array(this.maxStreaks * 3);

    for (let i = 0; i < this.maxStreaks; i++) {
      this.streaksPositions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      this.streaksPositions[i * 3 + 1] = Math.random() * 3 + 0.5;
      this.streaksPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    this.streaksGeometry.setAttribute('position', new THREE.BufferAttribute(this.streaksPositions, 3));

    const streakMaterial = new THREE.PointsMaterial({
      size: 0.18,
      color: 0x00d2be,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.streaksPoints = new THREE.Points(this.streaksGeometry, streakMaterial);
    this.streaksPoints.frustumCulled = false;
    scene.add(this.streaksPoints);
  }

  /**
   * Emit new titanium sparks from the rear floor diffuser
   */
  public emitSparks(carPos: THREE.Vector3, carHeading: number, count: number = 4) {
    this._carBack.set(Math.sin(carHeading), 0, Math.cos(carHeading)).multiplyScalar(1.9);

    for (let c = 0; c < count; c++) {
      const idx = this.nextSparkIdx;
      this.nextSparkIdx = (this.nextSparkIdx + 1) % this.maxSparks;

      // Spawn at road level directly underneath the titanium plank
      this.sparksPositions[idx * 3 + 0] = carPos.x + this._carBack.x + (Math.random() - 0.5) * 0.45;
      this.sparksPositions[idx * 3 + 1] = Math.max(0.04, carPos.y + 0.05);
      this.sparksPositions[idx * 3 + 2] = carPos.z + this._carBack.z + (Math.random() - 0.5) * 0.45;

      // Backward velocity sprayed at road angle
      const spread = 4.0;
      this.sparksVelocities[idx * 3 + 0] = this._carBack.x * 12 + (Math.random() - 0.5) * spread;
      this.sparksVelocities[idx * 3 + 1] = 1.2 + Math.random() * 2.2; // upward bounce
      this.sparksVelocities[idx * 3 + 2] = this._carBack.z * 12 + (Math.random() - 0.5) * spread;

      this.sparksLifetimes[idx] = 0.22 + Math.random() * 0.18; // lifetime in seconds
    }
  }

  /**
   * Update particle positions, physics, and high speed streaks
   */
  public update(
    dt: number,
    carPos: THREE.Vector3,
    carHeading: number,
    speedKmh: number,
    isOnCurb: boolean,
    isSoftwareGl: boolean = false
  ) {
    // 1. Check if conditions warrant titanium sparks (bottoming out at high downforce or hitting curbs)
    const shouldSpark =
      (speedKmh > 268 && Math.random() < 0.6) ||
      (isOnCurb && speedKmh > 130 && Math.random() < 0.75) ||
      (speedKmh > 310 && Math.random() < 0.85);

    if (shouldSpark && !isSoftwareGl) {
      this.emitSparks(carPos, carHeading, Math.floor(3 + (speedKmh / 350) * 4));
    }

    // 2. Physics update for active sparks
    let hasActiveSparks = false;
    for (let i = 0; i < this.maxSparks; i++) {
      if (this.sparksLifetimes[i] > 0) {
        hasActiveSparks = true;
        this.sparksLifetimes[i] -= dt;

        // Apply velocity and gravity
        this.sparksPositions[i * 3 + 0] += this.sparksVelocities[i * 3 + 0] * dt;
        this.sparksPositions[i * 3 + 1] += this.sparksVelocities[i * 3 + 1] * dt;
        this.sparksPositions[i * 3 + 2] += this.sparksVelocities[i * 3 + 2] * dt;

        // Gravity pull
        this.sparksVelocities[i * 3 + 1] -= 9.81 * dt;

        // Ground collision bounce
        if (this.sparksPositions[i * 3 + 1] < 0.03) {
          this.sparksPositions[i * 3 + 1] = 0.03;
          this.sparksVelocities[i * 3 + 1] = -this.sparksVelocities[i * 3 + 1] * 0.45; // restitution
        }
      } else {
        this.sparksPositions[i * 3 + 1] = -100; // bury offscreen
      }
    }

    if (hasActiveSparks || shouldSpark) {
      this.sparksGeometry.attributes.position.needsUpdate = true;
    }

    // 3. Update High Speed Warp Streaks around the car
    const streakMat = this.streaksPoints.material as THREE.PointsMaterial;
    if (speedKmh > 210 && !isSoftwareGl) {
      const speedAlpha = Math.min(0.75, (speedKmh - 210) / 110);
      streakMat.opacity = THREE.MathUtils.damp(streakMat.opacity, speedAlpha, 6, dt);

      // Follow car closely
      this.streaksPoints.position.copy(carPos);
      this.streaksPoints.rotation.y = carHeading;

      // Animate streaks rushing backwards past the cockpit
      const flowSpeed = (speedKmh / 360) * 35 * dt;
      for (let s = 0; s < this.maxStreaks; s++) {
        this.streaksPositions[s * 3 + 2] += flowSpeed;
        if (this.streaksPositions[s * 3 + 2] > 10) {
          this.streaksPositions[s * 3 + 2] = -14;
          this.streaksPositions[s * 3 + 0] = (Math.random() - 0.5) * 8;
          this.streaksPositions[s * 3 + 1] = Math.random() * 2.8 + 0.4;
        }
      }
      this.streaksGeometry.attributes.position.needsUpdate = true;
    } else {
      streakMat.opacity = THREE.MathUtils.damp(streakMat.opacity, 0, 8, dt);
    }
  }

  /**
   * Get cockpit camera vibration offset (engine RPM resonance & curb rumble)
   */
  public getCameraShake(speedKmh: number, rpm: number, isOnCurb: boolean, time: number): THREE.Vector3 {
    this._tempVec.set(0, 0, 0);

    // Subtle engine RPM idle & rev vibration
    const engineVibe = (rpm / 15000) * 0.008;
    this._tempVec.y += Math.sin(time * 0.08) * engineVibe;
    this._tempVec.x += Math.cos(time * 0.09) * engineVibe * 0.5;

    // Intense high-speed buffetting (>270 km/h)
    if (speedKmh > 260) {
      const speedBuffet = ((speedKmh - 260) / 90) * 0.022;
      this._tempVec.x += (Math.random() - 0.5) * speedBuffet;
      this._tempVec.y += (Math.random() - 0.5) * speedBuffet;
    }

    // Heavy curb rumble vibration
    if (isOnCurb && speedKmh > 40) {
      const curbShake = Math.min(0.045, (speedKmh / 200) * 0.045);
      this._tempVec.y += Math.sin(time * 0.25) * curbShake;
      this._tempVec.x += Math.cos(time * 0.22) * curbShake * 0.6;
    }

    return this._tempVec;
  }

  public dispose(scene: THREE.Scene) {
    scene.remove(this.sparksPoints);
    scene.remove(this.streaksPoints);
    this.sparksGeometry.dispose();
    this.streaksGeometry.dispose();
    (this.sparksPoints.material as THREE.Material).dispose();
    (this.streaksPoints.material as THREE.Material).dispose();
  }
}
