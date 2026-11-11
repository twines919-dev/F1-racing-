import * as THREE from 'three';
import { TrackConfig } from '../types/game';
import { TextureGenerator } from './textureGenerator';

/**
 * 3D Procedural Circuit Generator for Apex GP
 * Generates ribbon track meshes, curbs, barriers, distance signs, and start gantry lights.
 */

export interface DRSZone {
  startProgress: number; // 0..1
  endProgress: number;   // 0..1
}

export interface TrackInstance {
  curve: THREE.CatmullRomCurve3;
  trackWidth: number;
  drsZones: DRSZone[];
  sectorProgress: [number, number]; // [s1End, s2End]
  gantryMesh: THREE.Group;
  gantryLights: THREE.Mesh[];
  trackGroup: THREE.Group;
  pitBoxPosition: THREE.Vector3;
  pitIngressPosition: THREE.Vector3;
  updatePitIngressPulse: (time: number, isRequested: boolean) => void;
  getTrackPoint: (t: number) => THREE.Vector3;
  getTrackTangent: (t: number) => THREE.Vector3;
  getTrackWidth: () => number;
  findClosestProgress: (pos: THREE.Vector3) => { progress: number; distanceToCenter: number; centerPoint: THREE.Vector3 };
}

// Track curve definitions
function getTrackCurvePoints(trackId: string): THREE.Vector3[] {
  if (trackId === 'monza') {
    // Autodromo Nazionale Monza: Long start-finish straight, Variante del Rettifilo chicane,
    // Curva Grande, Variante della Roggia, Lesmo 1 & 2, Ascari chicane, Parabolica curve
    return [
      new THREE.Vector3(0, 0, 0),         // Start/Finish straight
      new THREE.Vector3(0, 0, -220),      // Approaching Turn 1
      new THREE.Vector3(15, 0, -260),     // Rettifilo chicane turn 1
      new THREE.Vector3(5, 0, -300),      // Rettifilo chicane turn 2
      new THREE.Vector3(45, 0, -420),     // Curva Grande sweeping right
      new THREE.Vector3(95, 0, -560),     // Curva Grande exit
      new THREE.Vector3(90, 0, -700),     // Roggia straight
      new THREE.Vector3(65, 0, -760),     // Roggia chicane
      new THREE.Vector3(30, 0, -820),     // Lesmo 1 entry
      new THREE.Vector3(-40, 0, -860),    // Lesmo 1
      new THREE.Vector3(-110, 0, -870),   // Straight to Lesmo 2
      new THREE.Vector3(-180, 0, -830),   // Lesmo 2 entry
      new THREE.Vector3(-220, 0, -740),   // Serraglio straight
      new THREE.Vector3(-230, 0, -560),   // Under bridge towards Ascari
      new THREE.Vector3(-200, 0, -420),   // Ascari chicane left
      new THREE.Vector3(-160, 0, -380),   // Ascari middle
      new THREE.Vector3(-170, 0, -320),   // Ascari exit
      new THREE.Vector3(-190, 0, -180),   // Back straight towards Parabolica
      new THREE.Vector3(-185, 0, -60),    // Braking into Parabolica
      new THREE.Vector3(-140, 0, 40),     // Parabolica apex
      new THREE.Vector3(-70, 0, 50),      // Parabolica exit
      new THREE.Vector3(-20, 0, 30),      // Onto main straight
    ];
  } else if (trackId === 'silverstone') {
    // Silverstone: Abbey, Farm, Village, Loop, Wellington Straight, Brooklands, Luffield, Woodcote, Copse, Maggotts, Becketts, Chapel, Hangar Straight, Stowe, Vale, Club
    return [
      new THREE.Vector3(0, 0, 0),         // Hamilton Straight (Start/Finish)
      new THREE.Vector3(0, 0, -180),      // Abbey right hander
      new THREE.Vector3(60, 0, -240),     // Farm curve
      new THREE.Vector3(120, 0, -280),    // Village hairpin
      new THREE.Vector3(140, 0, -340),    // The Loop
      new THREE.Vector3(90, 0, -390),     // Aintree exit
      new THREE.Vector3(-20, 0, -520),    // Wellington Straight
      new THREE.Vector3(-120, 0, -620),   // Brooklands
      new THREE.Vector3(-180, 0, -590),   // Luffield long right
      new THREE.Vector3(-170, 0, -500),   // Woodcote exit
      new THREE.Vector3(-150, 0, -380),   // National Pit Straight
      new THREE.Vector3(-155, 0, -220),   // Copse flat out right
      new THREE.Vector3(-220, 0, -140),   // Maggotts high speed S
      new THREE.Vector3(-270, 0, -70),    // Becketts apex
      new THREE.Vector3(-280, 0, 30),     // Chapel exit
      new THREE.Vector3(-250, 0, 190),    // Hangar Straight (DRS Zone)
      new THREE.Vector3(-200, 0, 320),    // Stowe corner entry
      new THREE.Vector3(-120, 0, 350),    // Stowe exit
      new THREE.Vector3(-50, 0, 280),     // Vale braking
      new THREE.Vector3(-20, 0, 160),     // Club corner entry
      new THREE.Vector3(-5, 0, 70),       // Club corner exit
    ];
  } else {
    // Monaco: Sainte Devote, Beau Rivage, Massenet, Casino, Mirabeau, Fairmont Hairpin, Portier, Tunnel, Nouvelle Chicane, Tabac, Swimming Pool, Rascasse, Antony Noghes
    return [
      new THREE.Vector3(0, 0, 0),         // Boulevard Albert 1er (Main straight)
      new THREE.Vector3(0, 0, -140),      // Sainte Devote Turn 1
      new THREE.Vector3(45, 6, -200),     // Beau Rivage climb
      new THREE.Vector3(90, 12, -260),    // Massenet curve
      new THREE.Vector3(120, 11, -310),   // Casino Square
      new THREE.Vector3(90, 8, -370),     // Mirabeau Haute downhill
      new THREE.Vector3(50, 4, -410),     // Fairmont Hairpin (Tightest turn in F1!)
      new THREE.Vector3(15, 2, -390),     // Mirabeau Bas
      new THREE.Vector3(-20, 0, -420),    // Portier
      new THREE.Vector3(-80, 0, -410),    // Tunnel entrance
      new THREE.Vector3(-160, 0, -350),   // Tunnel sweeping right
      new THREE.Vector3(-220, 0, -260),   // Tunnel exit
      new THREE.Vector3(-230, 0, -180),   // Nouvelle Chicane
      new THREE.Vector3(-210, 0, -110),   // Towards Tabac
      new THREE.Vector3(-190, 0, -40),    // Tabac corner
      new THREE.Vector3(-160, 0, 30),     // Swimming pool chicane 1
      new THREE.Vector3(-120, 0, 70),     // Swimming pool chicane 2
      new THREE.Vector3(-60, 0, 80),      // La Rascasse entry
      new THREE.Vector3(-30, 0, 50),      // Antony Noghes final turn
    ];
  }
}

export function createProceduralTrack(config: TrackConfig): TrackInstance {
  const points = getTrackCurvePoints(config.id);
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const trackGroup = new THREE.Group();
  trackGroup.name = `track_${config.id}`;

  const trackWidth = 14.0; // 14m wide track
  const curbWidth = 1.2;
  const barrierOffset = 11.0;
  const numSegments = 300;

  // Materials with procedural textures
  const asphaltTex = TextureGenerator.getAsphaltTexture();
  const curbTex = TextureGenerator.getCurbTexture();
  const grassTex = TextureGenerator.getGrassTexture();
  const finishLineTex = TextureGenerator.getFinishLineTexture();

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.82,
    metalness: 0.1,
  });

  const curbMaterial = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.7,
    metalness: 0.1,
  });

  const barrierMaterial = new THREE.MeshStandardMaterial({
    color: 0x223344,
    metalness: 0.8,
    roughness: 0.3,
  });

  const barrierArmcoMaterial = new THREE.MeshStandardMaterial({
    color: 0x99a5b3,
    metalness: 0.9,
    roughness: 0.25,
  });

  // Track Road Ribbon Mesh
  const roadGeom = new THREE.BufferGeometry();
  const roadVertices: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  // Curbs Meshes
  const leftCurbVertices: number[] = [];
  const rightCurbVertices: number[] = [];
  const curbIndices: number[] = [];

  const leftBarrierPositions: THREE.Vector3[] = [];
  const rightBarrierPositions: THREE.Vector3[] = [];

  // Up vector for calculating normal and binormal
  const upVec = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const pt = curve.getPointAt(t % 1);
    const tangent = curve.getTangentAt(t % 1).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, upVec).normalize();

    // Road vertices: left and right
    const halfW = trackWidth / 2;
    const leftPt = new THREE.Vector3().copy(pt).addScaledVector(binormal, -halfW);
    const rightPt = new THREE.Vector3().copy(pt).addScaledVector(binormal, halfW);

    roadVertices.push(leftPt.x, leftPt.y + 0.01, leftPt.z);
    roadVertices.push(rightPt.x, rightPt.y + 0.01, rightPt.z);

    roadNormals.push(0, 1, 0, 0, 1, 0);
    roadUvs.push(0, t * 80, 1, t * 80);

    // Curbs on edges (slightly raised)
    const curbLeftOuter = new THREE.Vector3().copy(leftPt).addScaledVector(binormal, -curbWidth);
    const curbRightOuter = new THREE.Vector3().copy(rightPt).addScaledVector(binormal, curbWidth);

    leftCurbVertices.push(leftPt.x, leftPt.y + 0.04, leftPt.z);
    leftCurbVertices.push(curbLeftOuter.x, curbLeftOuter.y + 0.02, curbLeftOuter.z);

    rightCurbVertices.push(rightPt.x, rightPt.y + 0.04, rightPt.z);
    rightCurbVertices.push(curbRightOuter.x, curbRightOuter.y + 0.02, curbRightOuter.z);

    if (i < numSegments) {
      const idx = i * 2;
      roadIndices.push(idx, idx + 1, idx + 2);
      roadIndices.push(idx + 1, idx + 3, idx + 2);

      curbIndices.push(idx, idx + 1, idx + 2);
      curbIndices.push(idx + 1, idx + 3, idx + 2);
    }

    // Barrier points
    if (i % 3 === 0) {
      leftBarrierPositions.push(new THREE.Vector3().copy(pt).addScaledVector(binormal, -barrierOffset));
      rightBarrierPositions.push(new THREE.Vector3().copy(pt).addScaledVector(binormal, barrierOffset));
    }
  }

  roadGeom.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
  roadGeom.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeom.setIndex(roadIndices);

  const roadMesh = new THREE.Mesh(roadGeom, roadMaterial);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  // Left & Right Curbs
  const leftCurbGeom = new THREE.BufferGeometry();
  leftCurbGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftCurbVertices, 3));
  leftCurbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  leftCurbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  leftCurbGeom.setIndex(curbIndices);
  const leftCurbMesh = new THREE.Mesh(leftCurbGeom, curbMaterial);
  leftCurbMesh.receiveShadow = true;
  trackGroup.add(leftCurbMesh);

  const rightCurbGeom = new THREE.BufferGeometry();
  rightCurbGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightCurbVertices, 3));
  rightCurbGeom.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  rightCurbGeom.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  rightCurbGeom.setIndex(curbIndices);
  const rightCurbMesh = new THREE.Mesh(rightCurbGeom, curbMaterial);
  rightCurbMesh.receiveShadow = true;
  trackGroup.add(rightCurbMesh);

  // Finish Line Checkered Strip
  const finishGeom = new THREE.PlaneGeometry(trackWidth, 3.5);
  finishGeom.rotateX(-Math.PI / 2);
  const finishMesh = new THREE.Mesh(finishGeom, new THREE.MeshBasicMaterial({ map: finishLineTex }));
  const startPt = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0);
  finishMesh.position.copy(startPt);
  finishMesh.position.y += 0.025;
  finishMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), startTangent);
  trackGroup.add(finishMesh);

  // Start Grid Slots (1 to 6)
  const gridSlotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  for (let gridPos = 1; gridPos <= 6; gridPos++) {
    const gridT = (1 - (gridPos * 8) / curve.getLength()) % 1;
    const gPt = curve.getPointAt(gridT);
    const gTangent = curve.getTangentAt(gridT).normalize();
    const gBinormal = new THREE.Vector3().crossVectors(gTangent, upVec).normalize();
    const laneOffset = (gridPos % 2 === 1) ? -2.8 : 2.8;

    const slotGeom = new THREE.PlaneGeometry(2.4, 5.0);
    slotGeom.rotateX(-Math.PI / 2);
    const slotMesh = new THREE.Mesh(slotGeom, gridSlotMaterial);
    slotMesh.position.copy(gPt).addScaledVector(gBinormal, laneOffset);
    slotMesh.position.y += 0.022;
    slotMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gTangent);
    trackGroup.add(slotMesh);
  }

  // Safety Barriers with Sponsor Advertising Banners
  const sponsors = [
    { text: 'PIRELLI', bg: '#D40000', textCol: '#FFE600' },
    { text: 'ARAMCO', bg: '#00594F', textCol: '#FFFFFF' },
    { text: 'ROLEX', bg: '#006039', textCol: '#DFB04B' },
    { text: 'APEX GP', bg: '#00D2BE', textCol: '#000000' },
    { text: 'DHL', bg: '#FFCC00', textCol: '#D40000' },
    { text: 'EMIRATES', bg: '#D00000', textCol: '#FFFFFF' },
  ];

  const barrierGeom = new THREE.BoxGeometry(0.5, 1.2, 7.5);
  for (let b = 0; b < leftBarrierPositions.length - 1; b++) {
    const p1 = leftBarrierPositions[b];
    const p2 = leftBarrierPositions[b + 1];
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);

    if (dist < 40) {
      const bMesh = new THREE.Mesh(barrierGeom, barrierArmcoMaterial);
      bMesh.position.set(mid.x, mid.y + 0.6, mid.z);
      bMesh.lookAt(p2);
      bMesh.castShadow = true;
      trackGroup.add(bMesh);

      // Add sponsor banner to every 2nd barrier
      if (b % 2 === 0) {
        const sponsor = sponsors[b % sponsors.length];
        const sponsorTex = TextureGenerator.createSponsorBoardTexture(sponsor.text, sponsor.bg, sponsor.textCol);
        const bannerGeom = new THREE.PlaneGeometry(6.5, 1.0);
        const bannerMat = new THREE.MeshStandardMaterial({ map: sponsorTex, roughness: 0.3 });
        const bannerMesh = new THREE.Mesh(bannerGeom, bannerMat);
        bannerMesh.position.set(mid.x, mid.y + 0.6, mid.z);
        bannerMesh.lookAt(p2);
        bannerMesh.rotateY(Math.PI / 2);
        trackGroup.add(bannerMesh);
      }
    }
  }

  for (let b = 0; b < rightBarrierPositions.length - 1; b++) {
    const p1 = rightBarrierPositions[b];
    const p2 = rightBarrierPositions[b + 1];
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dist = p1.distanceTo(p2);

    if (dist < 40) {
      const bMesh = new THREE.Mesh(barrierGeom, barrierArmcoMaterial);
      bMesh.position.set(mid.x, mid.y + 0.6, mid.z);
      bMesh.lookAt(p2);
      bMesh.castShadow = true;
      trackGroup.add(bMesh);
    }
  }

  // Ground Terrain (Surrounding grassy arena plane extending into the distance)
  const terrainGeom = new THREE.PlaneGeometry(1600, 1600);
  terrainGeom.rotateX(-Math.PI / 2);
  const terrainMesh = new THREE.Mesh(terrainGeom, new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.9,
    metalness: 0.05,
  }));
  terrainMesh.position.set(0, -0.05, 0);
  terrainMesh.receiveShadow = true;
  trackGroup.add(terrainMesh);

  // Distance braking signs (150m, 100m, 50m) before heavy braking zones
  const brakeDistances = ['150', '100', '50'];
  // Key braking points at t = 0.2, 0.45, 0.8
  const brakePoints = [0.2, 0.48, 0.82];
  brakePoints.forEach((brakeT) => {
    brakeDistances.forEach((distStr, dIdx) => {
      const dt = brakeT - (dIdx + 1) * 0.015;
      if (dt > 0) {
        const pt = curve.getPointAt(dt);
        const tangent = curve.getTangentAt(dt).normalize();
        const binormal = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
        const signPos = new THREE.Vector3().copy(pt).addScaledVector(binormal, -(trackWidth / 2 + 2.5));

        const signTex = TextureGenerator.createDistanceMarkerTexture(distStr);
        const signGeom = new THREE.PlaneGeometry(2.0, 1.0);
        const signMat = new THREE.MeshBasicMaterial({ map: signTex });
        const signMesh = new THREE.Mesh(signGeom, signMat);
        signMesh.position.set(signPos.x, signPos.y + 1.2, signPos.z);
        signMesh.lookAt(signPos.clone().add(tangent));
        signMesh.rotateY(Math.PI);
        trackGroup.add(signMesh);

        // Signpost
        const poleGeom = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
        const poleMesh = new THREE.Mesh(poleGeom, barrierMaterial);
        poleMesh.position.set(signPos.x, signPos.y + 0.6, signPos.z);
        trackGroup.add(poleMesh);
      }
    });
  });

  // Start / Finish Gantry with 5 Red LED Starting Lights
  const gantryGroup = new THREE.Group();
  const gantryPt = curve.getPointAt(0);
  const gantryTangent = curve.getTangentAt(0).normalize();
  const gantryBinormal = new THREE.Vector3().crossVectors(gantryTangent, upVec).normalize();

  // Bridge structure across the track
  const bridgeBeamGeom = new THREE.BoxGeometry(trackWidth + 6, 1.2, 1.8);
  const bridgeBeam = new THREE.Mesh(bridgeBeamGeom, barrierMaterial);
  bridgeBeam.position.set(0, 6.5, 0);
  bridgeBeam.castShadow = true;
  gantryGroup.add(bridgeBeam);

  // Left & Right Support Pillars
  const pillarGeom = new THREE.BoxGeometry(1.2, 7.0, 1.8);
  const leftPillar = new THREE.Mesh(pillarGeom, barrierMaterial);
  leftPillar.position.set(-(trackWidth / 2 + 2.5), 3.5, 0);
  gantryGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeom, barrierMaterial);
  rightPillar.position.set(trackWidth / 2 + 2.5, 3.5, 0);
  gantryGroup.add(rightPillar);

  // 5 Red Gantry Lights (FIA Starting Lights standard)
  const gantryLights: THREE.Mesh[] = [];
  const lightHousingGeom = new THREE.BoxGeometry(6.0, 1.4, 0.4);
  const lightHousing = new THREE.Mesh(lightHousingGeom, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }));
  lightHousing.position.set(0, 6.2, -1.0);
  gantryGroup.add(lightHousing);

  for (let l = 0; l < 5; l++) {
    const lightGeom = new THREE.SphereGeometry(0.35, 12, 10);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x330000 }); // initially dim/off
    const lightMesh = new THREE.Mesh(lightGeom, lightMat);
    lightMesh.position.set(-2.0 + l * 1.0, 6.2, -1.2);
    gantryGroup.add(lightMesh);
    gantryLights.push(lightMesh);
  }

  gantryGroup.position.copy(gantryPt);
  gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  trackGroup.add(gantryGroup);

  // Grandstand alongside main straight
  const grandstandGeom = new THREE.BoxGeometry(10, 8, 70);
  const grandstandMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6 });
  const grandstandMesh = new THREE.Mesh(grandstandGeom, grandstandMat);
  const gsPos = new THREE.Vector3().copy(gantryPt).addScaledVector(gantryBinormal, trackWidth / 2 + 12);
  grandstandMesh.position.set(gsPos.x, gsPos.y + 4, gsPos.z - 20);
  grandstandMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  trackGroup.add(grandstandMesh);

  // 3D Pit Lane Bay, Pit Wall & Pit Box Station
  const pitLaneOffset = -(trackWidth / 2 + 5.5);
  const pitBoxPosition = new THREE.Vector3().copy(gantryPt).addScaledVector(gantryBinormal, pitLaneOffset);
  pitBoxPosition.addScaledVector(gantryTangent, -14); // 14m before start line

  // 1. Pit Lane Road Strip
  const pitRoadGeom = new THREE.PlaneGeometry(7.5, 140);
  pitRoadGeom.rotateX(-Math.PI / 2);
  const pitRoadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.85,
  });
  const pitRoadMesh = new THREE.Mesh(pitRoadGeom, pitRoadMat);
  const pitCenter = new THREE.Vector3().copy(gantryPt).addScaledVector(gantryBinormal, pitLaneOffset);
  pitRoadMesh.position.set(pitCenter.x, pitCenter.y + 0.02, pitCenter.z);
  pitRoadMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  pitRoadMesh.receiveShadow = true;
  trackGroup.add(pitRoadMesh);

  // 1b. 3D Holographic Pit Ingress Gate & Illuminated Runway Chevrons
  const pitIngressPosition = new THREE.Vector3().copy(pitCenter).addScaledVector(gantryTangent, -52);
  const pitIngressGroup = new THREE.Group();

  // Ingress Arch Beam
  const portalArchGeom = new THREE.BoxGeometry(6.4, 0.35, 0.35);
  const portalArchMat = new THREE.MeshStandardMaterial({
    color: 0x00d2be,
    emissive: 0x00d2be,
    emissiveIntensity: 0.9,
  });
  const portalArch = new THREE.Mesh(portalArchGeom, portalArchMat);
  portalArch.position.set(0, 4.2, 0);
  pitIngressGroup.add(portalArch);

  // Ingress Support Pillars
  const postGeom = new THREE.CylinderGeometry(0.16, 0.16, 4.2, 8);
  const postLeft = new THREE.Mesh(postGeom, barrierMaterial);
  postLeft.position.set(-3.1, 2.1, 0);
  pitIngressGroup.add(postLeft);

  const postRight = new THREE.Mesh(postGeom, barrierMaterial);
  postRight.position.set(3.1, 2.1, 0);
  pitIngressGroup.add(postRight);

  // Ingress Sign ("PIT INGRESS - 80 KM/H")
  const ingressSignGeom = new THREE.PlaneGeometry(5.2, 1.1);
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sCtx = signCanvas.getContext('2d')!;
  sCtx.fillStyle = '#06101e';
  sCtx.fillRect(0, 0, 512, 128);
  sCtx.strokeStyle = '#00d2be';
  sCtx.lineWidth = 6;
  sCtx.strokeRect(4, 4, 504, 120);
  sCtx.fillStyle = '#00d2be';
  sCtx.font = 'bold 36px sans-serif';
  sCtx.textAlign = 'center';
  sCtx.fillText('PIT INGRESS  ▼  80 KM/H', 256, 52);
  sCtx.fillStyle = '#f59e0b';
  sCtx.font = 'bold 24px sans-serif';
  sCtx.fillText('PIT SPEED LIMITER ACTIVE', 256, 96);

  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const ingressSignMat = new THREE.MeshBasicMaterial({
    map: signTex,
    transparent: true,
    opacity: 0.92,
  });
  const ingressSignMesh = new THREE.Mesh(ingressSignGeom, ingressSignMat);
  ingressSignMesh.position.set(0, 3.4, -0.05);
  pitIngressGroup.add(ingressSignMesh);

  // Holographic Pit Runway Guideway Chevrons
  const chevronMeshes: THREE.Mesh[] = [];
  for (let c = 0; c < 5; c++) {
    const chevGeom = new THREE.PlaneGeometry(2.4, 0.8);
    chevGeom.rotateX(-Math.PI / 2);
    const chevMat = new THREE.MeshBasicMaterial({
      color: 0x00d2be,
      transparent: true,
      opacity: 0.65,
    });
    const chevMesh = new THREE.Mesh(chevGeom, chevMat);
    chevMesh.position.set(0, 0.04, 6 + c * 7.5);
    pitIngressGroup.add(chevMesh);
    chevronMeshes.push(chevMesh);
  }

  pitIngressGroup.position.copy(pitIngressPosition);
  pitIngressGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  trackGroup.add(pitIngressGroup);

  const updatePitIngressPulse = (time: number, isRequested: boolean) => {
    const basePulse = Math.sin(time * 0.005) * 0.3 + 0.7;
    const intensity = isRequested ? 1.0 + Math.sin(time * 0.012) * 0.5 : basePulse;
    portalArchMat.emissiveIntensity = intensity;
    chevronMeshes.forEach((ch, idx) => {
      const mat = ch.material as THREE.MeshBasicMaterial;
      const wave = Math.sin(time * 0.008 - idx * 0.8) * 0.35 + 0.65;
      mat.opacity = isRequested ? wave * 0.95 : wave * 0.5;
      mat.color.setHex(isRequested ? 0xffd700 : 0x00d2be);
    });
  };

  // 2. Pit Wall separating Pit Lane from Racing Track
  const pitWallGeom = new THREE.BoxGeometry(0.8, 1.4, 120);
  const pitWallMat = new THREE.MeshStandardMaterial({
    color: 0x223344,
    metalness: 0.8,
    roughness: 0.25,
  });
  const pitWallMesh = new THREE.Mesh(pitWallGeom, pitWallMat);
  const pitWallPos = new THREE.Vector3().copy(gantryPt).addScaledVector(gantryBinormal, -(trackWidth / 2 + 1.2));
  pitWallMesh.position.set(pitWallPos.x, pitWallPos.y + 0.7, pitWallPos.z);
  pitWallMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  pitWallMesh.castShadow = true;
  trackGroup.add(pitWallMesh);

  // 3. Pit Box Service Slot Markings (Yellow & Red Box)
  const pitBoxSlotGeom = new THREE.PlaneGeometry(3.6, 6.5);
  pitBoxSlotGeom.rotateX(-Math.PI / 2);
  const pitBoxSlotMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.85,
  });
  const pitBoxSlotMesh = new THREE.Mesh(pitBoxSlotGeom, pitBoxSlotMat);
  pitBoxSlotMesh.position.copy(pitBoxPosition);
  pitBoxSlotMesh.position.y += 0.03;
  pitBoxSlotMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  trackGroup.add(pitBoxSlotMesh);

  // 4. Overhead Pit Service Gantry Cantilever Arm & Pneumatic Lines
  const pitGantryGroup = new THREE.Group();
  const pitPostGeom = new THREE.BoxGeometry(0.5, 5.0, 0.5);
  const pitPost = new THREE.Mesh(pitPostGeom, barrierMaterial);
  pitPost.position.set(-3.6, 2.5, 0);
  pitGantryGroup.add(pitPost);

  const cantileverGeom = new THREE.BoxGeometry(4.2, 0.35, 0.35);
  const cantilever = new THREE.Mesh(cantileverGeom, barrierMaterial);
  cantilever.position.set(-1.8, 4.8, 0);
  pitGantryGroup.add(cantilever);

  // Hanging Lollipop light
  const lollipopGeom = new THREE.SphereGeometry(0.2, 8, 8);
  const lollipopMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const lollipop = new THREE.Mesh(lollipopGeom, lollipopMat);
  lollipop.position.set(0, 3.2, 0);
  pitGantryGroup.add(lollipop);

  // 5. Procedural Pit Crew Mechanics in Team Overalls (Front Jack, Rear Jack, 4 Wheel Gunners)
  const crewUniformMat = new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.5 });
  const crewHelmetMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

  const createPitMechanic = (x: number, z: number, isKneeling: boolean = false) => {
    const mechanic = new THREE.Group();
    const height = isKneeling ? 0.9 : 1.7;
    const bodyGeom = new THREE.CylinderGeometry(0.22, 0.22, height, 6);
    const body = new THREE.Mesh(bodyGeom, crewUniformMat);
    body.position.y = height / 2;
    mechanic.add(body);

    const headGeom = new THREE.SphereGeometry(0.16, 8, 8);
    const head = new THREE.Mesh(headGeom, crewHelmetMat);
    head.position.y = height + 0.14;
    mechanic.add(head);

    mechanic.position.set(x, 0, z);
    return mechanic;
  };

  // Front Jack & Rear Jack operators
  pitGantryGroup.add(createPitMechanic(0, -3.8)); // Front jack
  pitGantryGroup.add(createPitMechanic(0, 3.8));  // Rear jack
  // 4 Wheel Gun mechanics (kneeling at wheels)
  pitGantryGroup.add(createPitMechanic(-1.4, -1.5, true)); // Front Left
  pitGantryGroup.add(createPitMechanic(1.4, -1.5, true));  // Front Right
  pitGantryGroup.add(createPitMechanic(-1.4, 1.5, true));  // Rear Left
  pitGantryGroup.add(createPitMechanic(1.4, 1.5, true));   // Rear Right

  pitGantryGroup.position.copy(pitBoxPosition);
  pitGantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), gantryTangent);
  trackGroup.add(pitGantryGroup);

  // DRS Zones for this track
  const drsZones: DRSZone[] = [
    { startProgress: 0.05, endProgress: 0.22 }, // Main straight
    { startProgress: 0.55, endProgress: 0.72 }, // Back straight
  ];

  // Helper functions
  const getTrackPoint = (t: number) => curve.getPointAt(((t % 1) + 1) % 1);
  const getTrackTangent = (t: number) => curve.getTangentAt(((t % 1) + 1) % 1).normalize();
  const getTrackWidth = () => trackWidth;

  // Pre-sample 200 points for fast closest-point projection
  const sampleSteps = 200;
  const sampledPoints: THREE.Vector3[] = [];
  for (let s = 0; s < sampleSteps; s++) {
    sampledPoints.push(curve.getPointAt(s / sampleSteps));
  }

  const findClosestProgress = (pos: THREE.Vector3) => {
    let closestDistSq = Infinity;
    let closestIdx = 0;
    for (let s = 0; s < sampleSteps; s++) {
      const dSq = pos.distanceToSquared(sampledPoints[s]);
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestIdx = s;
      }
    }

    // Refine around closest sample
    let bestT = closestIdx / sampleSteps;
    let bestDistSq = closestDistSq;
    const stepDelta = 1 / (sampleSteps * 4);
    for (let sub = -3; sub <= 3; sub++) {
      const testT = (((bestT + sub * stepDelta) % 1) + 1) % 1;
      const testPt = curve.getPointAt(testT);
      const testDistSq = pos.distanceToSquared(testPt);
      if (testDistSq < bestDistSq) {
        bestDistSq = testDistSq;
        bestT = testT;
      }
    }

    const centerPoint = curve.getPointAt(bestT);
    const distanceToCenter = pos.distanceTo(centerPoint);

    return {
      progress: bestT,
      distanceToCenter,
      centerPoint,
    };
  };

  return {
    curve,
    trackWidth,
    drsZones,
    sectorProgress: [0.33, 0.66],
    gantryMesh: gantryGroup,
    gantryLights,
    trackGroup,
    pitBoxPosition,
    pitIngressPosition,
    updatePitIngressPulse,
    getTrackPoint,
    getTrackTangent,
    getTrackWidth,
    findClosestProgress,
  };
}
