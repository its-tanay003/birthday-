/* ==========================================================================
   WebGL Dynamic Morphing Particle System
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';

export class ParticleSystem {
  constructor(count = 10000) {
    this.count = count;
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    
    // Morph State tracking
    this.activeSection = 0;
    this.morphState = { progress: 1.0 };
    
    // Arrays to store math shape coordinate definitions
    this.shapes = {
      0: [], // Section 1: Undulating Waves (deep blue)
      1: [], // Section 2: 3D Volumetric Heart (crimson pink)
      2: [], // Section 3: Floating Star Backdrop (space nebula)
      3: [], // Section 4: Warp Speed light trails (night drive)
      4: [], // Section 5: Centered Magnetic Swarm (attraction aura)
      5: [], // Section 6: Vertical Falling Stardust Rain
      6: [], // Section 7: Sunset Dome (warm gold/crimson)
      7: []  // Section 8: Glowing "KASHVI" Constellation + Beating Heart
    };
    
    // Active morph caches
    this.sourcePositions = new Float32Array(this.count * 3);
    this.targetPositions = new Float32Array(this.count * 3);
    
    this.init();
  }

  init() {
    this.geometry = new THREE.BufferGeometry();
    
    // 1. Generate the Mathematical Shapes Coordinates
    this.generateMathShapes();
    
    // 2. Set Initial positions to Waves shape (Section 1)
    const initialPositions = new Float32Array(this.shapes[0]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
    
    // Cache the active positions
    for (let i = 0; i < this.count * 3; i++) {
      this.sourcePositions[i] = initialPositions[i];
      this.targetPositions[i] = initialPositions[i];
    }
    
    // 3. Create a beautiful glowing fuzzy stardust circle texture procedurally
    const texture = this.createFuzzyGlowTexture();
    
    // 4. Create Material using the glowing texture
    this.material = new THREE.PointsMaterial({
      size: 0.22,
      color: 0xffffff, // Tint with colors dynamically
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending, /* Beautiful cinematic light overlay blending */
      depthWrite: false
    });
    
    // 5. Assemble Points Mesh
    this.mesh = new THREE.Points(this.geometry, this.material);
    
    // Store current state
    this.activeSection = 0;
  }

  // Paint a custom 32x32 glowing stardust dot onto an offscreen canvas
  createFuzzyGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');      // Hot white center
    gradient.addColorStop(0.2, 'rgba(255, 110, 140, 0.8)');   // Romantic pink glow
    gradient.addColorStop(0.5, 'rgba(255, 10, 84, 0.2)');     // Crimson red fuzz halo
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');              // Transparent edges
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    
    return new THREE.CanvasTexture(canvas);
  }

  generateMathShapes() {
    const c = this.count;
    
    for (let i = 0; i < c; i++) {
      // Shape 0: Deep undulated ocean waves
      // Distribute randomly across a wide thin plane below text
      const wX = (Math.random() - 0.5) * 32;
      const wZ = (Math.random() - 0.5) * 28;
      const wY = -2.5 + (Math.random() - 0.5) * 0.4;
      this.shapes[0].push(wX, wY, wZ);
      
      // Shape 1: 3D Volumetric Heart Structure
      // Using parametric math for a gorgeous puffed hollow heart
      const t = Math.random() * Math.PI * 2;
      const u = (Math.random() * 2 - 1) * Math.PI; // -pi to pi
      // Parametric equations for rounded edges
      const hX = 16 * Math.pow(Math.sin(t), 3) * Math.cos(u * 0.5) * 0.25;
      const hY = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * Math.cos(u * 0.5) * 0.25;
      const hZ = 12 * Math.sin(t) * Math.sin(u * 0.5) * 0.25;
      this.shapes[1].push(hX, hY + 1.0, hZ); // Shift up slightly to fit cards
      
      // Shape 2: Drifting Nebula Backdrop (behind floating polaroids)
      const rNeb = 12 + Math.random() * 18;
      const thetaNeb = Math.random() * Math.PI * 2;
      const phiNeb = Math.acos((Math.random() * 2) - 1);
      const nX = rNeb * Math.sin(phiNeb) * Math.cos(thetaNeb);
      const nY = rNeb * Math.sin(phiNeb) * Math.sin(thetaNeb);
      const nZ = rNeb * Math.cos(phiNeb) - 6.0; // Offset back in depth
      this.shapes[2].push(nX, nY, nZ);
      
      // Shape 3: Starfield Warp Speed tunnel (night drive)
      // Long stretching cylinder along the Z-axis
      const tRadius = 1.0 + Math.random() * 5.0;
      const tAngle = Math.random() * Math.PI * 2;
      const dX = tRadius * Math.cos(tAngle);
      const dY = tRadius * Math.sin(tAngle);
      const dZ = (Math.random() - 0.5) * 45; // Deep stretch
      this.shapes[3].push(dX, dY, dZ);
      
      // Shape 4: Dense Magnetic pull cluster
      const rMag = Math.random() * 3.5;
      const thetaMag = Math.random() * Math.PI * 2;
      const phiMag = Math.acos((Math.random() * 2) - 1);
      const mX = rMag * Math.sin(phiMag) * Math.cos(thetaMag);
      const mY = rMag * Math.sin(phiMag) * Math.sin(thetaMag);
      const mZ = rMag * Math.cos(phiMag);
      this.shapes[4].push(mX, mY, mZ);
      
      // Shape 5: Rain Streaks
      const raX = (Math.random() - 0.5) * 36;
      const raY = (Math.random() - 0.5) * 22; // Vertical distribution
      const raZ = (Math.random() - 0.5) * 20;
      this.shapes[5].push(raX, raY, raZ);
      
      // Shape 6: Sunset Skyline Dome
      const sRadius = 15 + Math.random() * 15;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos((Math.random() * 1.2) - 0.2); // Concentrated upwards
      const suX = sRadius * Math.sin(sPhi) * Math.cos(sTheta);
      const suY = Math.abs(sRadius * Math.sin(sPhi) * Math.sin(sTheta)) - 4; // Shift down
      const suZ = sRadius * Math.cos(sPhi) - 10.0; // Pushed back
      this.shapes[6].push(suX, suY, suZ);

      // Shape 7: Glowing "KASHVI" Constellation + Beating Heart Outline
      // Define lines spelling K-A-S-H-V-I
      const letterSegments = [
        // K
        [
          [[-7.5, -1.5, 0], [-7.5, 1.5, 0]],
          [[-7.5, 0, 0], [-6.0, 1.5, 0]],
          [[-7.5, 0, 0], [-6.0, -1.5, 0]]
        ],
        // A
        [
          [[-4.5, -1.5, 0], [-3.75, 1.5, 0]],
          [[-3.75, 1.5, 0], [-3.0, -1.5, 0]],
          [[-4.125, -0.2, 0], [-3.375, -0.2, 0]]
        ],
        // S
        [
          [[0.0, 1.5, 0], [-1.5, 1.5, 0]],
          [[-1.5, 1.5, 0], [-1.5, 0, 0]],
          [[-1.5, 0, 0], [0.0, 0, 0]],
          [[0.0, 0, 0], [0.0, -1.5, 0]],
          [[0.0, -1.5, 0], [-1.5, -1.5, 0]]
        ],
        // H
        [
          [[1.0, -1.5, 0], [1.0, 1.5, 0]],
          [[2.5, -1.5, 0], [2.5, 1.5, 0]],
          [[1.0, 0, 0], [2.5, 0, 0]]
        ],
        // V
        [
          [[4.0, 1.5, 0], [4.75, -1.5, 0]],
          [[4.75, -1.5, 0], [5.5, 1.5, 0]]
        ],
        // I
        [
          [[7.75, -1.5, 0], [7.75, 1.5, 0]],
          [[7.0, 1.5, 0], [8.5, 1.5, 0]],
          [[7.0, -1.5, 0], [8.5, -1.5, 0]]
        ]
      ];

      if (i < 8000) {
        // Distribute first 8,000 particles to spelling "KASHVI"
        const letterIdx = i % 6;
        const segments = letterSegments[letterIdx];
        const seg = segments[Math.floor(Math.random() * segments.length)];
        const t = Math.random();
        
        const pX = THREE.MathUtils.lerp(seg[0][0], seg[1][0], t);
        const pY = THREE.MathUtils.lerp(seg[0][1], seg[1][1], t);
        const pZ = THREE.MathUtils.lerp(seg[0][2], seg[1][2], t);
        
        // Add romantic twinkle dispersion
        const noise = 0.08;
        const nX = pX + (Math.random() - 0.5) * noise;
        const nY = pY + (Math.random() - 0.5) * noise;
        const nZ = pZ + (Math.random() - 0.5) * noise;
        this.shapes[7].push(nX, nY, nZ);
      } else {
        // Distribute remaining 4,000 particles to the 3D heart outline
        const tHeart = Math.random() * Math.PI * 2;
        const hX = 16 * Math.pow(Math.sin(tHeart), 3) * 0.18;
        const hY = (13 * Math.cos(tHeart) - 5 * Math.cos(2*tHeart) - 2 * Math.cos(3*tHeart) - Math.cos(4*tHeart)) * 0.18 + 3.2;
        const hZ = (Math.random() - 0.5) * 0.4 - 1.0;
        this.shapes[7].push(hX, hY, hZ);
      }
    }
  }

  // Morph to new target geometry smoothly using GSAP
  morphTo(targetIndex, duration = 2.0) {
    if (this.activeSection === targetIndex) return;
    
    // Stop any active morph tweens
    gsap.killTweensOf(this.morphState);
    
    // Capture current particle coordinates as source
    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < this.count * 3; i++) {
      this.sourcePositions[i] = posAttr.array[i];
    }
    
    // Grab math coordinates for destination shape
    const targetArr = this.shapes[targetIndex];
    for (let i = 0; i < this.count * 3; i++) {
      this.targetPositions[i] = targetArr[i];
    }
    
    // Fade particle colors according to context
    this.updateColorsForSection(targetIndex, duration);
    
    // Reset interpolation progress and run tween
    this.morphState.progress = 0.0;
    this.activeSection = targetIndex;
    
    gsap.to(this.morphState, {
      progress: 1.0,
      duration: duration,
      ease: "power2.out",
      onUpdate: () => {
        const arr = posAttr.array;
        const p = this.morphState.progress;
        
        for (let i = 0; i < this.count * 3; i++) {
          arr[i] = THREE.MathUtils.lerp(
            this.sourcePositions[i],
            this.targetPositions[i],
            p
          );
        }
        
        posAttr.needsUpdate = true;
      }
    });
  }

  updateColorsForSection(sectionIdx, duration) {
    let colorHex = 0xffffff;
    
    switch (sectionIdx) {
      case 0: // Waves: Deep blue
        colorHex = 0x5a7cfa;
        break;
      case 1: // Heart: Crimson Red
        colorHex = 0xff2a6d;
        break;
      case 2: // Nebula: Deep purple
        colorHex = 0x9b5de5;
        break;
      case 3: // Warp: Gold/Orange drive
        colorHex = 0xfb8500;
        break;
      case 4: // Magnetic: Hot Magenta aura
        colorHex = 0xff007f;
        break;
      case 5: // Rain: Grey-Blue vulnerability
        colorHex = 0x74b9ff;
        break;
      case 6: // Sunset: Pure warm Gold
        colorHex = 0xffb703;
        break;
      case 7: // Constellation: Pure romantic Pink-Gold
        colorHex = 0xff0a54;
        break;
    }
    
    gsap.to(this.material.color, {
      r: ((colorHex >> 16) & 255) / 255,
      g: ((colorHex >> 8) & 255) / 255,
      b: (colorHex & 255) / 255,
      duration: duration
    });
    
    // Scale particle sizes for specific scenes
    let targetSize = 0.22;
    if (sectionIdx === 1) targetSize = 0.28; // Heart larger
    if (sectionIdx === 4) targetSize = 0.35; // Magnetic swarm fat dots
    if (sectionIdx === 5) targetSize = 0.16; // Rain thin stardust
    if (sectionIdx === 7) targetSize = 0.25; // Constellation medium glow
    
    gsap.to(this.material, {
      size: targetSize,
      duration: duration
    });
  }

  // Animation Update Tick (called 60 times/sec)
  update(time, delta, mouse) {
    // 1. Slow overall global rotation of points
    if (this.activeSection === 1) {
      // Rotating Heart: slow spin
      this.mesh.rotation.y = time * 0.15;
      this.mesh.rotation.x = Math.sin(time * 0.08) * 0.1;
    } else if (this.activeSection === 7) {
      // Slow beautiful spin for constellation
      this.mesh.rotation.y = time * 0.05;
      this.mesh.rotation.x = Math.sin(time * 0.03) * 0.05;
    } else {
      this.mesh.rotation.y = time * 0.03;
      this.mesh.rotation.x = 0;
    }
    
    const posAttr = this.geometry.attributes.position;
    const arr = posAttr.array;
    
    // 2. Add local dynamic effects to points based on active section
    
    // Section 1: undulating mathematical waves
    if (this.activeSection === 0 && this.morphState.progress > 0.8) {
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const x = arr[idx];
        const z = arr[idx + 2];
        
        // Add double sine/cosine undulations
        const baseHeight = -2.5;
        arr[idx + 1] = baseHeight + 
                       Math.sin(x * 0.22 + time * 1.5) * 0.45 + 
                       Math.cos(z * 0.18 + time * 1.1) * 0.35;
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 4: Warp Speed cylinder animation (driving forward)
    if (this.activeSection === 3 && this.morphState.progress > 0.8) {
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3 + 2; // Z position
        arr[idx] += delta * 12.0; // Speed forward
        
        // Wrap particles back when they pass the camera
        if (arr[idx] > 15.0) {
          arr[idx] = -30.0;
        }
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 5: Magnetic Attraction Pull swarm
    if (this.activeSection === 4 && this.morphState.progress > 0.7) {
      // Target position in WebGL space mapping to normalized mouse coordinates
      const targetX = mouse.x * 6.5;
      const targetY = mouse.y * 5.0;
      
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        
        // Attract points dynamically to mouse with individual spring offsets
        const offsetMultiplier = 0.05 + (i % 50) * 0.002;
        arr[idx] += (targetX - arr[idx]) * offsetMultiplier;
        arr[idx + 1] += (targetY - arr[idx + 1]) * offsetMultiplier;
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 6: Vertical Falling Stardust Rain
    if (this.activeSection === 5 && this.morphState.progress > 0.8) {
      const windShift = mouse.x * 3.0; // Horizontal shift matches mouse
      
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const speed = 4.0 + (i % 20) * 0.3; // Random speed categories
        
        arr[idx + 1] -= delta * speed; // Fall down
        arr[idx] += windShift * delta * 0.3; // wind angle
        
        // Reset when falling below boundary
        if (arr[idx + 1] < -11.0) {
          arr[idx + 1] = 11.0;
          arr[idx] = (Math.random() - 0.5) * 36; // re-scatter
        }
      }
      posAttr.needsUpdate = true;
    }

    // Section 8: Glowing "KASHVI" Constellation + Beating Heart Outline
    if (this.activeSection === 7 && this.morphState.progress > 0.8) {
      let beat = 0;
      const cycle = time % 1.2; // 1.2s beat loop (50 BPM)
      if (cycle < 0.15) {
        beat = Math.sin((cycle / 0.15) * Math.PI) * 0.14; // "Lub" pulse
      } else if (cycle > 0.25 && cycle < 0.40) {
        beat = Math.sin(((cycle - 0.25) / 0.15) * Math.PI) * 0.07; // "Dub" pulse
      }
      const scale = 1.0 + beat;
      
      const targetArr = this.shapes[7];
      for (let i = 8000; i < this.count; i++) {
        const idx = i * 3;
        const baseX = targetArr[idx];
        const baseY = targetArr[idx + 1];
        const baseZ = targetArr[idx + 2];
        
        // Pulse heart particles around its center (0, 3.2, -1.0)
        arr[idx] = baseX * scale;
        arr[idx + 1] = (baseY - 3.2) * scale + 3.2;
        arr[idx + 2] = (baseZ + 1.0) * scale - 1.0;
      }
      
      // Let letter particles twinkle slightly in place
      for (let i = 0; i < 8000; i++) {
        const idx = i * 3;
        const baseX = targetArr[idx];
        const baseY = targetArr[idx + 1];
        const baseZ = targetArr[idx + 2];
        
        const twinkle = Math.sin(time * 8.0 + i) * 0.015;
        arr[idx] = baseX + twinkle;
        arr[idx + 1] = baseY + twinkle;
        arr[idx + 2] = baseZ + twinkle;
      }
      
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
