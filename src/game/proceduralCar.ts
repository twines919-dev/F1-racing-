import * as THREE from 'three';
import { TeamConfig, TireCompound } from '../types/game';
import { TextureGenerator } from './textureGenerator';

/**
 * 3D Procedural Formula 1 Car Assembly
 * Complies with Three.js skill:
 * - Composite 12+ part procedural model in THREE.Group
 * - Primary silhouette, secondary reads, accent details
 * - High-end PBR materials with varied roughness/metalness
 * - Animated DRS flap, spinning wheels, steering pivots, glowing brake discs, rear rain LED
 * - Bottom-center grounded pivot
 */

export interface F1CarMeshHandles {
  root: THREE.Group;
  wheels: {
    frontLeft: THREE.Group;
    frontRight: THREE.Group;
    rearLeft: THREE.Group;
    rearRight: THREE.Group;
  };
  wheelMeshes: THREE.Mesh[];
  drsFlap: THREE.Mesh;
  rearLed: THREE.Mesh;
  brakeDiscs: THREE.Mesh[];
  driverHelmet: THREE.Group;
  exhaustPuffs: THREE.Mesh[];
}

export function createProceduralF1Car(team: TeamConfig, compound: TireCompound = 'SOFT'): F1CarMeshHandles {
  const root = new THREE.Group();
  root.name = `f1_car_${team.id}`;

  const primaryCol = new THREE.Color(team.primaryColor);
  const secondaryCol = new THREE.Color(team.secondaryColor);
  const accentCol = new THREE.Color(team.accentColor);

  // Carbon fiber texture
  const carbonTex = TextureGenerator.getCarbonTexture();

  // 1. PBR Materials with high physical contrast
  // Bodywork: Glossy metallic automotive paint
  const bodyPaintMaterial = new THREE.MeshStandardMaterial({
    color: primaryCol,
    metalness: 0.85,
    roughness: 0.18,
  });

  // Secondary body accent material
  const secondaryPaintMaterial = new THREE.MeshStandardMaterial({
    color: secondaryCol,
    metalness: 0.6,
    roughness: 0.35,
  });

  // Carbon aero parts (wings, floor, diffuser, suspension)
  const carbonMaterial = new THREE.MeshStandardMaterial({
    map: carbonTex,
    color: 0x1f2124,
    metalness: 0.3,
    roughness: 0.65,
  });

  // Halo titanium roll cage
  const titaniumMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2e35,
    metalness: 0.9,
    roughness: 0.25,
  });

  // Rubber slick tires
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.85,
    metalness: 0.05,
  });

  // Tire compound colored stripe (Soft=Red, Medium=Yellow, Hard=White)
  const compoundColors: Record<TireCompound, number> = {
    SOFT: 0xe10600,
    MEDIUM: 0xffd700,
    HARD: 0xffffff,
  };
  const tireStripeMaterial = new THREE.MeshBasicMaterial({
    color: compoundColors[compound],
  });

  // Wheel rim alloy
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111317,
    metalness: 0.8,
    roughness: 0.3,
  });

  // Glowing brake disc material (glows during hard braking)
  const brakeDiscMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0xff3300,
    emissiveIntensity: 0.0,
    metalness: 0.7,
    roughness: 0.4,
  });

  // Rear safety rain light LED
  const rearLedMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
  });

  // 2. Primary Silhouette: Monocoque Chassis
  const chassisGroup = new THREE.Group();
  chassisGroup.position.set(0, 0.22, 0); // Grounded above road clearance

  // Main nose cone tapering forward (length: ~2.8m, z: -1.4 to 0.4)
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-0.16, -1.8);
  noseShape.lineTo(0.16, -1.8);
  noseShape.lineTo(0.38, -0.6);
  noseShape.lineTo(0.42, 0.6);
  noseShape.lineTo(0.36, 1.4);
  noseShape.lineTo(-0.36, 1.4);
  noseShape.lineTo(-0.42, 0.6);
  noseShape.lineTo(-0.38, -0.6);
  noseShape.closePath();

  const noseExtrudeSettings = {
    depth: 0.28,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  };

  const noseGeom = new THREE.ExtrudeGeometry(noseShape, noseExtrudeSettings);
  noseGeom.rotateX(Math.PI / 2);
  noseGeom.translate(0, 0.12, 0);
  const noseMesh = new THREE.Mesh(noseGeom, bodyPaintMaterial);
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  chassisGroup.add(noseMesh);

  // Cockpit top cowl with team livery stripes
  const cowlGeom = new THREE.BoxGeometry(0.56, 0.22, 1.1);
  const cowlMesh = new THREE.Mesh(cowlGeom, secondaryPaintMaterial);
  cowlMesh.position.set(0, 0.22, -0.1);
  cowlMesh.castShadow = true;
  chassisGroup.add(cowlMesh);

  // 3. Sidepods (Left & Right radiator intakes with aerodynamic undercuts)
  const sidepodGeom = new THREE.BoxGeometry(0.34, 0.32, 1.4);
  const leftSidepod = new THREE.Mesh(sidepodGeom, bodyPaintMaterial);
  leftSidepod.position.set(-0.54, 0.14, 0.2);
  leftSidepod.castShadow = true;
  chassisGroup.add(leftSidepod);

  const rightSidepod = new THREE.Mesh(sidepodGeom, bodyPaintMaterial);
  rightSidepod.position.set(0.54, 0.14, 0.2);
  rightSidepod.castShadow = true;
  chassisGroup.add(rightSidepod);

  // Radiator intake grilles (black matte)
  const intakeGeom = new THREE.BoxGeometry(0.28, 0.22, 0.04);
  const leftIntake = new THREE.Mesh(intakeGeom, carbonMaterial);
  leftIntake.position.set(-0.54, 0.15, -0.5);
  chassisGroup.add(leftIntake);

  const rightIntake = new THREE.Mesh(intakeGeom, carbonMaterial);
  rightIntake.position.set(0.54, 0.15, -0.5);
  chassisGroup.add(rightIntake);

  // 4. Floor / Underfloor Venturi Strakes
  const floorGeom = new THREE.BoxGeometry(1.5, 0.04, 3.2);
  const floorMesh = new THREE.Mesh(floorGeom, carbonMaterial);
  floorMesh.position.set(0, -0.02, 0.1);
  floorMesh.receiveShadow = true;
  chassisGroup.add(floorMesh);

  // 5. Airbox Intake (Above cockpit) & Engine Shark Fin
  const airboxGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.45, 8);
  const airboxMesh = new THREE.Mesh(airboxGeom, bodyPaintMaterial);
  airboxMesh.rotation.x = Math.PI / 2;
  airboxMesh.position.set(0, 0.44, 0.25);
  chassisGroup.add(airboxMesh);

  // Shark Fin (Vertical carbon fin down the spine)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.3);
  finShape.lineTo(0, 0.6);
  finShape.lineTo(0.9, 0.35);
  finShape.lineTo(0.9, 0.1);
  finShape.closePath();
  const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: 0.02, bevelEnabled: false });
  finGeom.rotateY(Math.PI / 2);
  finGeom.translate(0.01, 0.15, 0.2);
  const finMesh = new THREE.Mesh(finGeom, secondaryPaintMaterial);
  finMesh.castShadow = true;
  chassisGroup.add(finMesh);

  // 6. Halo Titanium Safety Cage
  const haloGroup = new THREE.Group();
  // Central pillar
  const haloPillarGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6);
  const haloPillar = new THREE.Mesh(haloPillarGeom, titaniumMaterial);
  haloPillar.position.set(0, 0.38, -0.28);
  haloPillar.rotation.x = 0.25;
  haloGroup.add(haloPillar);

  // Curved loop
  const haloTorusGeom = new THREE.TorusGeometry(0.24, 0.025, 6, 12, Math.PI);
  const haloLoop = new THREE.Mesh(haloTorusGeom, titaniumMaterial);
  haloLoop.rotation.x = -Math.PI / 2;
  haloLoop.position.set(0, 0.44, -0.06);
  haloGroup.add(haloLoop);
  chassisGroup.add(haloGroup);

  // 7. Driver Cockpit & Helmet
  const helmetGroup = new THREE.Group();
  const helmetGeom = new THREE.SphereGeometry(0.12, 12, 10);
  const helmetMesh = new THREE.Mesh(helmetGeom, new THREE.MeshStandardMaterial({
    color: accentCol,
    roughness: 0.2,
    metalness: 0.4,
  }));
  helmetMesh.castShadow = true;
  helmetGroup.add(helmetMesh);

  // Visor (dark iridium gold/black)
  const visorGeom = new THREE.BoxGeometry(0.14, 0.05, 0.08);
  const visorMesh = new THREE.Mesh(visorGeom, new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.95,
    roughness: 0.1,
  }));
  visorMesh.position.set(0, 0.02, -0.09);
  helmetGroup.add(visorMesh);

  helmetGroup.position.set(0, 0.34, -0.05);
  chassisGroup.add(helmetGroup);

  // 8. Front Wing Assembly (Cascades, Endplates, Pylons)
  const frontWingGroup = new THREE.Group();
  frontWingGroup.position.set(0, 0.06, -1.82);

  // Main front aerofoil flap
  const frontWingGeom = new THREE.BoxGeometry(1.68, 0.03, 0.34);
  const frontWingMesh = new THREE.Mesh(frontWingGeom, carbonMaterial);
  frontWingMesh.castShadow = true;
  frontWingGroup.add(frontWingMesh);

  // Upper cascade flap (team color)
  const upperFlapGeom = new THREE.BoxGeometry(1.6, 0.02, 0.16);
  const upperFlapMesh = new THREE.Mesh(upperFlapGeom, bodyPaintMaterial);
  upperFlapMesh.position.set(0, 0.06, 0.04);
  frontWingGroup.add(upperFlapMesh);

  // Endplates (vertical sideplates)
  const endplateGeom = new THREE.BoxGeometry(0.02, 0.22, 0.38);
  const leftEndplate = new THREE.Mesh(endplateGeom, bodyPaintMaterial);
  leftEndplate.position.set(-0.84, 0.08, 0);
  frontWingGroup.add(leftEndplate);

  const rightEndplate = new THREE.Mesh(endplateGeom, bodyPaintMaterial);
  rightEndplate.position.set(0.84, 0.08, 0);
  frontWingGroup.add(rightEndplate);

  chassisGroup.add(frontWingGroup);

  // 9. Rear Wing Assembly & Dynamic DRS Actuator Flap
  const rearWingGroup = new THREE.Group();
  rearWingGroup.position.set(0, 0.62, 1.45);

  // Lower beam wing
  const lowerBeamGeom = new THREE.BoxGeometry(1.15, 0.03, 0.22);
  const lowerBeam = new THREE.Mesh(lowerBeamGeom, carbonMaterial);
  lowerBeam.position.set(0, -0.22, 0);
  rearWingGroup.add(lowerBeam);

  // Main fixed aerofoil
  const mainWingGeom = new THREE.BoxGeometry(1.25, 0.04, 0.24);
  const mainRearWing = new THREE.Mesh(mainWingGeom, secondaryPaintMaterial);
  mainRearWing.castShadow = true;
  rearWingGroup.add(mainRearWing);

  // Movable DRS Flap (rotates up when DRS is opened)
  const drsFlapGeom = new THREE.BoxGeometry(1.22, 0.025, 0.18);
  const drsFlap = new THREE.Mesh(drsFlapGeom, bodyPaintMaterial);
  drsFlap.position.set(0, 0.08, 0.06);
  rearWingGroup.add(drsFlap);

  // Vertical rear wing endplates
  const rearEndplateGeom = new THREE.BoxGeometry(0.02, 0.44, 0.38);
  const rearLeftPlate = new THREE.Mesh(rearEndplateGeom, bodyPaintMaterial);
  rearLeftPlate.position.set(-0.62, -0.06, 0);
  rearWingGroup.add(rearLeftPlate);

  const rearRightPlate = new THREE.Mesh(rearEndplateGeom, bodyPaintMaterial);
  rearRightPlate.position.set(0.62, -0.06, 0);
  rearWingGroup.add(rearRightPlate);

  // Central pylon mount
  const pylonGeom = new THREE.BoxGeometry(0.05, 0.4, 0.12);
  const pylonMesh = new THREE.Mesh(pylonGeom, carbonMaterial);
  pylonMesh.position.set(0, -0.16, -0.04);
  rearWingGroup.add(pylonMesh);

  chassisGroup.add(rearWingGroup);

  // 10. Rear Diffuser & Flashing LED Rain Light
  const diffuserGeom = new THREE.BoxGeometry(0.85, 0.08, 0.3);
  const diffuserMesh = new THREE.Mesh(diffuserGeom, carbonMaterial);
  diffuserMesh.position.set(0, 0.02, 1.55);
  diffuserMesh.rotation.x = 0.2;
  chassisGroup.add(diffuserMesh);

  const rearLedGeom = new THREE.BoxGeometry(0.08, 0.05, 0.03);
  const rearLed = new THREE.Mesh(rearLedGeom, rearLedMaterial);
  rearLed.position.set(0, 0.06, 1.66);
  chassisGroup.add(rearLed);

  // 11. Exhaust Pipes & Backfire Flashes
  const exhaustGeom = new THREE.CylinderGeometry(0.035, 0.04, 0.12, 8);
  const exhaustMesh = new THREE.Mesh(exhaustGeom, titaniumMaterial);
  exhaustMesh.rotation.x = Math.PI / 2;
  exhaustMesh.position.set(0, 0.28, 1.48);
  chassisGroup.add(exhaustMesh);

  const flameGeom = new THREE.ConeGeometry(0.05, 0.2, 6);
  flameGeom.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, visible: false });
  const flameMesh = new THREE.Mesh(flameGeom, flameMat);
  flameMesh.position.set(0, 0.28, 1.6);
  chassisGroup.add(flameMesh);

  root.add(chassisGroup);

  // 12. Four F1 Wheels with Carbon Suspension Wishbones and Glowing Brake Discs
  const wheelMeshes: THREE.Mesh[] = [];
  const brakeDiscs: THREE.Mesh[] = [];

  const createWheel = (isFront: boolean, isLeft: boolean) => {
    const wheelAssembly = new THREE.Group();
    // Wheel geometry: Radius 0.33m, Width 0.34m (rear) or 0.28m (front)
    const tireWidth = isFront ? 0.28 : 0.34;
    const tireRadius = 0.33;

    // Tire mesh
    const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 18);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, tireMaterial);
    tireMesh.castShadow = true;
    wheelAssembly.add(tireMesh);
    wheelMeshes.push(tireMesh);

    // Compound color ring on sidewall
    const ringGeom = new THREE.RingGeometry(0.2, 0.24, 18);
    const ringMesh = new THREE.Mesh(ringGeom, tireStripeMaterial);
    ringMesh.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
    ringMesh.position.x = isLeft ? -tireWidth / 2 - 0.002 : tireWidth / 2 + 0.002;
    wheelAssembly.add(ringMesh);

    // Rim hub cover
    const rimGeom = new THREE.CylinderGeometry(0.18, 0.18, tireWidth * 0.9, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, rimMaterial);
    wheelAssembly.add(rimMesh);

    // Brake disc inside wheel
    const discGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.02, 12);
    discGeom.rotateZ(Math.PI / 2);
    const discMesh = new THREE.Mesh(discGeom, brakeDiscMaterial);
    wheelAssembly.add(discMesh);
    brakeDiscs.push(discMesh);

    return wheelAssembly;
  };

  // Wheel positions (grounded at y = 0.33)
  const trackWidthFront = 0.88;
  const trackWidthRear = 0.92;
  const wheelbaseFront = -1.22;
  const wheelbaseRear = 1.18;
  const wheelY = 0.33;

  const frontLeftGroup = new THREE.Group();
  frontLeftGroup.position.set(-trackWidthFront, wheelY, wheelbaseFront);
  const flWheel = createWheel(true, true);
  frontLeftGroup.add(flWheel);
  root.add(frontLeftGroup);

  const frontRightGroup = new THREE.Group();
  frontRightGroup.position.set(trackWidthFront, wheelY, wheelbaseFront);
  const frWheel = createWheel(true, false);
  frontRightGroup.add(frWheel);
  root.add(frontRightGroup);

  const rearLeftGroup = new THREE.Group();
  rearLeftGroup.position.set(-trackWidthRear, wheelY, wheelbaseRear);
  const rlWheel = createWheel(false, true);
  rearLeftGroup.add(rlWheel);
  root.add(rearLeftGroup);

  const rearRightGroup = new THREE.Group();
  rearRightGroup.position.set(trackWidthRear, wheelY, wheelbaseRear);
  const rrWheel = createWheel(false, false);
  rearRightGroup.add(rrWheel);
  root.add(rearRightGroup);

  // Carbon suspension wishbone arms connecting wheels to chassis
  const wishboneGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4);
  wishboneGeom.rotateZ(Math.PI / 2);

  // Front left wishbone
  const flArm = new THREE.Mesh(wishboneGeom, carbonMaterial);
  flArm.position.set(-trackWidthFront * 0.55, wheelY, wheelbaseFront);
  root.add(flArm);

  // Front right wishbone
  const frArm = new THREE.Mesh(wishboneGeom, carbonMaterial);
  frArm.position.set(trackWidthFront * 0.55, wheelY, wheelbaseFront);
  root.add(frArm);

  // Rear wishbones
  const rlArm = new THREE.Mesh(wishboneGeom, carbonMaterial);
  rlArm.position.set(-trackWidthRear * 0.55, wheelY, wheelbaseRear);
  root.add(rlArm);

  const rrArm = new THREE.Mesh(wishboneGeom, carbonMaterial);
  rrArm.position.set(trackWidthRear * 0.55, wheelY, wheelbaseRear);
  root.add(rrArm);

  return {
    root,
    wheels: {
      frontLeft: frontLeftGroup,
      frontRight: frontRightGroup,
      rearLeft: rearLeftGroup,
      rearRight: rearRightGroup,
    },
    wheelMeshes,
    drsFlap,
    rearLed,
    brakeDiscs,
    driverHelmet: helmetGroup,
    exhaustPuffs: [flameMesh],
  };
}
