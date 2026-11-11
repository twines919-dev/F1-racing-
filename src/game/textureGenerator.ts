import * as THREE from 'three';

/**
 * Procedural Texture Generator for Apex GP
 * Complies with Three.js skill: 100% procedural textures in Canvas2D,
 * SRGBColorSpace, zero 404s, sharp anisotropy.
 */

export class TextureGenerator {
  private static asphaltTexture: THREE.CanvasTexture | null = null;
  private static curbTexture: THREE.CanvasTexture | null = null;
  private static grassTexture: THREE.CanvasTexture | null = null;
  private static gravelTexture: THREE.CanvasTexture | null = null;
  private static carbonTexture: THREE.CanvasTexture | null = null;
  private static finishLineTexture: THREE.CanvasTexture | null = null;
  private static tireTexture: THREE.CanvasTexture | null = null;

  public static getAsphaltTexture(): THREE.CanvasTexture {
    if (this.asphaltTexture) return this.asphaltTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dark asphalt
    ctx.fillStyle = '#222326';
    ctx.fillRect(0, 0, 512, 512);

    // Fine aggregate grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle dark racing groove rubber lines
    ctx.fillStyle = 'rgba(10, 10, 12, 0.28)';
    ctx.fillRect(80, 0, 90, 512);
    ctx.fillRect(340, 0, 90, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    this.asphaltTexture = texture;
    return texture;
  }

  public static getCurbTexture(): THREE.CanvasTexture {
    if (this.curbTexture) return this.curbTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const segmentHeight = 64;
    for (let y = 0; y < 256; y += segmentHeight) {
      const isRed = (y / segmentHeight) % 2 === 0;
      ctx.fillStyle = isRed ? '#E01824' : '#F4F4F6';
      ctx.fillRect(0, y, 256, segmentHeight);

      // Bevel highlight
      ctx.fillStyle = isRed ? '#FF4D58' : '#FFFFFF';
      ctx.fillRect(0, y, 256, 6);
      ctx.fillStyle = isRed ? '#8F0A11' : '#B8B8BA';
      ctx.fillRect(0, y + segmentHeight - 6, 256, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 60);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    this.curbTexture = texture;
    return texture;
  }

  public static getGrassTexture(): THREE.CanvasTexture {
    if (this.grassTexture) return this.grassTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#2A5A28';
    ctx.fillRect(0, 0, 256, 256);

    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + noise * 0.4));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.3));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.grassTexture = texture;
    return texture;
  }

  public static getGravelTexture(): THREE.CanvasTexture {
    if (this.gravelTexture) return this.gravelTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9C7844';
    ctx.fillRect(0, 0, 256, 256);

    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 50;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.gravelTexture = texture;
    return texture;
  }

  public static getCarbonTexture(): THREE.CanvasTexture {
    if (this.carbonTexture) return this.carbonTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = '#2A2A2E';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.carbonTexture = texture;
    return texture;
  }

  public static getFinishLineTexture(): THREE.CanvasTexture {
    if (this.finishLineTexture) return this.finishLineTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const squareSize = 32;
    for (let x = 0; x < 512; x += squareSize) {
      for (let y = 0; y < 64; y += squareSize) {
        const isWhite = ((x / squareSize) + (y / squareSize)) % 2 === 0;
        ctx.fillStyle = isWhite ? '#FFFFFF' : '#111111';
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.finishLineTexture = texture;
    return texture;
  }

  public static createSponsorBoardTexture(sponsorText: string, bgColor: string, textColor: string = '#FFFFFF'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Motorsport stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(80, 0);
    ctx.lineTo(40, 128);
    ctx.lineTo(0, 128);
    ctx.fill();

    ctx.font = 'bold 56px "Orbitron", sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sponsorText, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  public static createDistanceMarkerTexture(distance: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0F1218';
    ctx.fillRect(0, 0, 256, 128);

    // Border
    ctx.strokeStyle = '#00D2BE';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 244, 116);

    ctx.font = 'bold 72px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(distance, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
