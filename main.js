/* ==========================================================================
   Kashvi — Flight Plan 0521 — Consolidated RTX WebGL Experience
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';

// ==========================================================================
// 1. Procedural Ambient Synth & Soundscapes (Web Audio API)
// ==========================================================================
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.padOscs = [];
    this.padGains = [];
    this.sequenceTimer = null;
    
    // Engine Hum
    this.engineHumOsc = null;
    this.engineHumOsc2 = null;
    this.engineHumGain = null;
    this.engineFilter = null;
    
    // Howling Storm
    this.stormNoiseNode = null;
    this.stormGain = null;
    this.stormFilter = null;
    this.stormTimer = null;
    
    // Chords (Cmaj9 - Am9 - Fmaj9 - G13)
    this.chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66], 
      [110.00, 146.83, 174.61, 220.00, 261.63], 
      [87.31, 130.81, 174.61, 220.00, 261.63],  
      [98.00, 146.83, 196.00, 246.94, 293.66]   
    ];
    this.currentChordIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayFilter = this.ctx.createBiquadFilter();
    
    this.delayNode.delayTime.setValueAtTime(0.45, this.ctx.currentTime);
    this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    this.mainFilter = this.ctx.createBiquadFilter();
    this.mainFilter.type = 'lowpass';
    this.mainFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.mainFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    
    this.mainFilter.connect(this.masterGain);
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.initEngineHum();
    this.initStormSynth();
  }

  start() {
    if (this.isPlaying) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isPlaying = true;
    this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 3.0);
    
    this.startAmbientPads();
    this.schedulePianoDroplets();
    this.startEngineHum();
  }

  stop() {
    if (!this.isPlaying) return;
    this.masterGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.5);
    this.stopEngineHum();
    this.stopStorm();
    setTimeout(() => {
      this.stopAllOscillators();
      this.isPlaying = false;
    }, 1600);
  }

  stopAllOscillators() {
    this.padOscs.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.padOscs = [];
    this.padGains = [];
    if (this.sequenceTimer) clearTimeout(this.sequenceTimer);
    if (this.pianoTimeout) clearTimeout(this.pianoTimeout);
  }

  startAmbientPads() {
    this.stopAllOscillators();
    if (!this.isPlaying) return;
    
    const now = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIndex];
    
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((Math.random() - 0.5) * 12, now);
      
      const oscVolume = idx === 0 ? 0.05 : 0.03;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(oscVolume, now + 2.0);
      
      osc.connect(gain);
      gain.connect(this.mainFilter);
      osc.start(now);
      this.padOscs.push(osc);
      this.padGains.push(gain);
    });
    
    this.mainFilter.frequency.setValueAtTime(500 + Math.random() * 200, now);
    this.mainFilter.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, now + 8.0);
    
    this.sequenceTimer = setTimeout(() => {
      this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;
      this.transitionAmbientPads();
    }, 10000);
  }

  transitionAmbientPads() {
    if (!this.isPlaying) return;
    const now = this.ctx.currentTime;
    const oldGains = [...this.padGains];
    const oldOscs = [...this.padOscs];
    
    oldGains.forEach(gainNode => {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 2.5);
    });
    
    setTimeout(() => {
      oldOscs.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
    }, 3000);
    
    this.padOscs = [];
    this.padGains = [];
    this.startAmbientPads();
  }

  schedulePianoDroplets() {
    if (!this.isPlaying) return;
    const delay = 1500 + Math.random() * 3500;
    this.pianoTimeout = setTimeout(() => {
      this.playPianoNote();
      this.schedulePianoDroplets();
    }, delay);
  }

  playPianoNote() {
    if (!this.isPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const baseChord = this.chords[this.currentChordIndex];
    const baseFreq = baseChord[Math.floor(Math.random() * baseChord.length)];
    const freq = baseFreq * 4; 
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    gain.connect(this.delayNode);
    
    osc.start(now);
    osc.stop(now + 2.0);
  }

  /* Plays deep thud sound for golden spheres */
  playMuffledThud() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, now);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  triggerHeartbeatSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    this.playSingleHeartPulse(55, now, 0.5);      
    this.playSingleHeartPulse(48, now + 0.28, 0.4); 
  }

  playSingleHeartPulse(freq, startTime, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.22);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, startTime);
    
    gain.gain.setValueAtTime(0.0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }

  playPing() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800 + Math.random() * 400, now);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playMechanicalClick() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    this.playSingleHeartPulse(80, now, 0.45);
    this.playSingleHeartPulse(110, now + 0.05, 0.3);
  }

  initEngineHum() {
    if (!this.ctx) return;
    this.engineHumOsc = this.ctx.createOscillator();
    this.engineHumOsc2 = this.ctx.createOscillator();
    this.engineHumGain = this.ctx.createGain();
    
    this.engineHumOsc.type = 'sawtooth';
    this.engineHumOsc.frequency.setValueAtTime(65, this.ctx.currentTime);
    this.engineHumOsc.detune.setValueAtTime(-6, this.ctx.currentTime);
    
    this.engineHumOsc2.type = 'triangle';
    this.engineHumOsc2.frequency.setValueAtTime(130, this.ctx.currentTime);
    this.engineHumOsc2.detune.setValueAtTime(6, this.ctx.currentTime);
    
    this.engineHumGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(110, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);
    
    this.engineHumOsc.connect(this.engineFilter);
    this.engineHumOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineHumGain);
    this.engineHumGain.connect(this.ctx.destination);
  }

  startEngineHum() {
    if (!this.engineHumOsc) this.initEngineHum();
    try {
      this.engineHumOsc.start(this.ctx.currentTime);
      this.engineHumOsc2.start(this.ctx.currentTime);
    } catch (e) {}
    
    this.engineHumGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.engineHumGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2.0);
  }

  stopEngineHum() {
    if (this.engineHumGain) {
      this.engineHumGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.engineHumGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
    }
  }

  setEngineThrust(val) {
    if (!this.ctx || !this.engineHumOsc || !this.engineHumOsc2) return;
    const now = this.ctx.currentTime;
    const targetFreq1 = 65 + val * 45;   
    const targetFreq2 = 130 + val * 90;  
    const targetCutoff = 110 + val * 180; 
    const targetGain = 0.06 + val * 0.08; 
    
    this.engineHumOsc.frequency.linearRampToValueAtTime(targetFreq1, now + 0.25);
    this.engineHumOsc2.frequency.linearRampToValueAtTime(targetFreq2, now + 0.25);
    this.engineFilter.frequency.linearRampToValueAtTime(targetCutoff, now + 0.25);
    if (this.engineHumGain) {
      this.engineHumGain.gain.linearRampToValueAtTime(targetGain, now + 0.25);
    }
  }

  initStormSynth() {
    if (!this.ctx) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    this.stormNoiseNode = this.ctx.createBufferSource();
    this.stormNoiseNode.buffer = noiseBuffer;
    this.stormNoiseNode.loop = true;
    
    this.stormGain = this.ctx.createGain();
    this.stormGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    this.stormFilter = this.ctx.createBiquadFilter();
    this.stormFilter.type = 'bandpass';
    this.stormFilter.frequency.setValueAtTime(250, this.ctx.currentTime); 
    this.stormFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);
    
    this.stormNoiseNode.connect(this.stormFilter);
    this.stormFilter.connect(this.stormGain);
    this.stormGain.connect(this.ctx.destination);
  }

  startStorm() {
    if (!this.stormNoiseNode) this.initStormSynth();
    try {
      this.stormNoiseNode.start(this.ctx.currentTime);
    } catch (e) {}
    
    const now = this.ctx.currentTime;
    this.stormGain.gain.cancelScheduledValues(now);
    this.stormGain.gain.linearRampToValueAtTime(0.35, now + 2.0);
    this.modulateStormWind();
  }

  modulateStormWind() {
    if (!this.isPlaying || !this.stormFilter) return;
    const now = this.ctx.currentTime;
    const targetFreq = 180 + Math.random() * 240;
    this.stormFilter.frequency.linearRampToValueAtTime(targetFreq, now + 1.5);
    this.stormTimer = setTimeout(() => this.modulateStormWind(), 1500);
  }

  stopStorm() {
    if (this.stormGain) {
      this.stormGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.stormGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.5);
    }
    if (this.stormTimer) clearTimeout(this.stormTimer);
  }

  playLightning() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); 
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9); 
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
  }
}

// ==========================================================================
// 2. Global Haptic Vibration Engine (navigator.vibrate wrapper)
// ==========================================================================
class HapticEngine {
  constructor() {
    this.supported = 'vibrate' in navigator;
  }

  trigger(pattern) {
    if (!this.supported) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptic trigger ignored due to browser permission constraints.");
    }
  }

  // Micro tactile button tick
  tick() {
    this.trigger(12);
  }

  // General transition screen sweep
  sweep() {
    this.trigger([30, 40, 30]);
  }

  // Climax first hug card double-beat
  doubleThump() {
    this.trigger([140, 60, 140]);
  }

  // Heavy storm turbulence vibration
  stormRumble() {
    this.trigger([80, 120, 40, 160]);
  }
}

// ==========================================================================
// 3. Lightweight Spring Physics Solver (Inertia & Elastic Damping)
// ==========================================================================
class SpringPhysics {
  constructor(stiffness = 0.08, damping = 0.12, mass = 2.0) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    
    this.value = 0;
    this.velocity = 0;
    this.target = 0;
  }

  update() {
    const force = (this.target - this.value) * this.stiffness - this.velocity * this.damping;
    const acceleration = force / this.mass;
    this.velocity += acceleration;
    this.value += this.velocity;
    return this.value;
  }

  setTarget(targetVal) {
    this.target = targetVal;
  }
}

// ==========================================================================
// 4. Custom GLSL Sky, Nebula Dust & Atmospheric Shader System
// ==========================================================================
const customAtmosphereShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    uniform float uTime;
    uniform vec3 uColorBase;
    uniform vec3 uColorGlow;
    
    void main() {
      // Glow calculation based on view normal angle
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float intensity = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);
      
      // Dynamic color banding representing cockpit atmospheric sunset
      vec3 finalColor = mix(uColorBase, uColorGlow, intensity + sin(uTime * 0.2) * 0.1);
      gl_FragColor = vec4(finalColor, 0.4 + intensity * 0.6);
    }
  `
};

const customNebulaShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform vec3 uColor;
    
    // 3D fractal-like noise generator
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(p+vec3(0,0,0)), hash(p+vec3(1,0,0)), f.x),
                     mix(hash(p+vec3(0,1,0)), hash(p+vec3(1,1,0)), f.x), f.x),
                 mix(mix(hash(p+vec3(0,0,1)), hash(p+vec3(1,0,1)), f.x),
                     mix(hash(p+vec3(0,1,1)), hash(p+vec3(1,1,1)), f.x), f.x), f.z);
    }
    
    void main() {
      vec3 coord = vPosition * 0.12 + vec3(0.0, 0.0, uTime * 0.08);
      float n = noise(coord) * 0.5 + noise(coord * 2.0) * 0.25;
      float alpha = smoothstep(0.2, 0.65, n) * 0.45;
      vec3 finalColor = mix(uColor, vec3(1.0, 0.7, 0.8), n * 0.45);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

// ==========================================================================
// 5. Dynamic Morphing Particle Spelling System (ParticleSystem)
// ==========================================================================
class ParticleSystem {
  constructor(count = 15000) {
    this.count = count;
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    
    this.activeSection = 0;
    this.morphState = { progress: 1.0 };
    
    this.shapes = {
      0: [], // Departure Waves (deep blue)
      1: [], // New Year Floating Starry Dust
      2: [], // Steering Lesson Horizon
      3: [], // Mall Constellation Cylinder
      4: [], // Rain Storm Cluster
      5: []  // Finale "HAPPY BIRTHDAY, KASHVI" magnetic coordinates
    };
    
    this.sourcePositions = new Float32Array(this.count * 3);
    this.targetPositions = new Float32Array(this.count * 3);
    
    this.velocities = new Float32Array(this.count * 3);
    this.init();
  }

  init() {
    this.geometry = new THREE.BufferGeometry();
    this.generateMathShapes();
    
    const initialPositions = new Float32Array(this.shapes[0]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
    
    for (let i = 0; i < this.count * 3; i++) {
      this.sourcePositions[i] = initialPositions[i];
      this.targetPositions[i] = initialPositions[i];
      this.velocities[i] = 0.0;
    }
    
    const texture = this.createFuzzyGlowTexture();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      color: 0x5a7cfa,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.activeSection = 0;
  }

  createFuzzyGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(57, 255, 20, 0.7)'); 
    grad.addColorStop(0.5, 'rgba(0, 20, 5, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  generateMathShapes() {
    const c = this.count;
    const letterPositions = this.generateSpelledPositions();
    
    for (let i = 0; i < c; i++) {
      // Shape 0: Takeoff Undulated Waves
      const wX = (Math.random() - 0.5) * 35;
      const wZ = (Math.random() - 0.5) * 35;
      const wY = -2.8 + (Math.random() - 0.5) * 0.3;
      this.shapes[0].push(wX, wY, wZ);
      
      // Shape 1: New Year Floating Starry Dust
      const nX = (Math.random() - 0.5) * 25;
      const nY = (Math.random() - 0.5) * 20;
      const nZ = (Math.random() - 0.5) * 20 - 4;
      this.shapes[1].push(nX, nY, nZ);
      
      // Shape 2: Steering Lesson Horizon
      const sRadius = 14 + Math.random() * 12;
      const sAngle = Math.random() * Math.PI * 2;
      const sX = sRadius * Math.cos(sAngle);
      const sY = Math.sin(timeScaleOsc(i) * 0.05) * 2.0;
      const sZ = sRadius * Math.sin(sAngle) - 10.0;
      this.shapes[2].push(sX, sY, sZ);
      
      // Shape 3: Polaroid Constellation Cylinder
      const cylRadius = 7.5;
      const cylAngle = (i / c) * Math.PI * 2;
      const cyX = cylRadius * Math.cos(cylAngle);
      const cyY = (Math.random() - 0.5) * 12;
      const cyZ = cylRadius * Math.sin(cylAngle) - 3.0;
      this.shapes[3].push(cyX, cyY, cyZ);
      
      // Shape 4: Storm volumetric falling rain
      const rX = (Math.random() - 0.5) * 32;
      const rY = (Math.random() - 0.5) * 24;
      const rZ = (Math.random() - 0.5) * 24;
      this.shapes[4].push(rX, rY, rZ);
      
      // Shape 5: Finale magnetic spelled constellation + heart
      if (i < letterPositions.length) {
        this.shapes[5].push(letterPositions[i][0], letterPositions[i][1], letterPositions[i][2]);
      } else {
        const tHeart = Math.random() * Math.PI * 2;
        const hX = 16 * Math.pow(Math.sin(tHeart), 3) * 0.22;
        const hY = (13 * Math.cos(tHeart) - 5 * Math.cos(2*tHeart) - 2 * Math.cos(3*tHeart) - Math.cos(4*tHeart)) * 0.22 + 4.5;
        const hZ = (Math.random() - 0.5) * 0.5 - 1.0;
        this.shapes[5].push(hX, hY, hZ);
      }
    }
    
    function timeScaleOsc(index) {
      return index * 0.01;
    }
  }

  generateSpelledPositions() {
    const list = [];
    const scale = 0.4;
    const addLetter = (char, xOffset, yOffset) => {
      const paths = [];
      switch (char) {
        case 'H':
          paths.push([[-2, 3], [-2, -3]], [[2, 3], [[2, -3]]], [[-2, 0], [2, 0]]);
          break;
        case 'A':
          paths.push([[-2, -3], [0, 3]], [[0, 3], [2, -3]], [[-1.2, -0.8], [1.2, -0.8]]);
          break;
        case 'P':
          paths.push([[-2, -3], [-2, 3]], [[-2, 3], [1, 3]], [[1, 3], [1, 0]], [[1, 0], [-2, 0]]);
          break;
        case 'B':
          paths.push([[-2, -3], [-2, 3]], [[-2, 3], [1, 3]], [[1, 3], [1, 0.2]], [[1, 0.2], [-2, 0.2]], [[-2, 0.2], [1.5, 0.2]], [[1.5, 0.2], [1.5, -3]], [[1.5, -3], [-2, -3]]);
          break;
        case 'I':
          paths.push([[0, 3], [0, -3]], [[-1.5, 3], [1.5, 3]], [[-1.5, -3], [1.5, -3]]);
          break;
        case 'R':
          paths.push([[-2, -3], [-2, 3]], [[-2, 3], [1.5, 3]], [[1.5, 3], [1.5, 0]], [[1.5, 0], [-2, 0]], [[-2, 0], [2, -3]]);
          break;
        case 'T':
          paths.push([[0, 3], [0, -3]], [[-2, 3], [2, 3]]);
          break;
        case 'D':
          paths.push([[-2, -3], [-2, 3]], [[-2, 3], [0.8, 3]], [[0.8, 3], [2.2, 1.2]], [[2.2, 1.2], [2.2, -1.2]], [[2.2, -1.2], [0.8, -3]], [[0.8, -3], [-2, -3]]);
          break;
        case 'Y':
          paths.push([[-2, 3], [0, 0]], [[2, 3], [0, 0]], [[0, 0], [0, -3]]);
          break;
        case 'K':
          paths.push([[-2, -3], [-2, 3]], [[-2, 0], [1.8, 3]], [[-2, 0], [1.8, -3]]);
          break;
        case 'S':
          paths.push([[2, 2.5], [-1.8, 2.5]], [[-1.8, 2.5], [-1.8, 0.2]], [[-1.8, 0.2], [1.8, 0.2]], [[1.8, 0.2], [1.8, -2.5]], [[1.8, -2.5], [-2, -2.5]]);
          break;
        case 'V':
          paths.push([[-2, 3], [0, -3]], [[0, -3], [2, 3]]);
          break;
      }
      
      const countPerSegment = 110;
      paths.forEach(p => {
        const start = p[0];
        const end = p[1];
        for (let j = 0; j < countPerSegment; j++) {
          const t = j / countPerSegment;
          const noise = (Math.random() - 0.5) * 0.18;
          const x = (start[0] + (end[0] - start[0]) * t) * scale + xOffset + noise;
          const y = (start[1] + (end[1] - start[1]) * t) * scale + yOffset + noise;
          const z = (Math.random() - 0.5) * 0.2;
          list.push([x, y, z]);
        }
      });
    };

    // Spell: HAPPY
    const hY = 1.6;
    addLetter('H', -11.0, hY);
    addLetter('A', -6.0, hY);
    addLetter('P', -1.0, hY);
    addLetter('P', 4.0, hY);
    addLetter('Y', 9.0, hY);

    // Spell: BIRTHDAY
    const bY = -1.2;
    addLetter('B', -16.5, bY);
    addLetter('I', -12.5, bY);
    addLetter('R', -8.5, bY);
    addLetter('T', -4.5, bY);
    addLetter('H', -0.5, bY);
    addLetter('D', 4.5, bY);
    addLetter('A', 9.5, bY);
    addLetter('Y', 14.5, bY);

    // Spell: KASHVI
    const kY = -3.8;
    addLetter('K', -13.0, kY);
    addLetter('A', -8.0, kY);
    addLetter('S', -3.0, kY);
    addLetter('H', 2.0, kY);
    addLetter('V', 7.0, kY);
    addLetter('I', 11.5, kY);

    return list;
  }

  morphTo(targetIndex, duration = 2.0) {
    if (this.activeSection === targetIndex) return;
    
    gsap.killTweensOf(this.morphState);
    const posAttr = this.geometry.attributes.position;
    for (let i = 0; i < this.count * 3; i++) {
      this.sourcePositions[i] = posAttr.array[i];
    }
    
    const targetArr = this.shapes[targetIndex];
    for (let i = 0; i < this.count * 3; i++) {
      this.targetPositions[i] = targetArr[i];
    }
    
    this.updateColorsForSection(targetIndex, duration);
    
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
        colorHex = 0x39ff14;
        break;
      case 1: // New Year Party: Gold/Yellow
        colorHex = 0xffa600;
        break;
      case 2: // Driving Lesson: Bright Green
        colorHex = 0x39ff14;
        break;
      case 3: // Photos: Sunset Magenta
        colorHex = 0xff0a54;
        break;
      case 4: // Rain Storm: Storm Teal
        colorHex = 0x00f5d4;
        break;
      case 5: // Finale Spelled Constellation: Sunset Gold/Magenta
        colorHex = 0xff0050;
        break;
    }
    
    gsap.to(this.material.color, {
      r: ((colorHex >> 16) & 255) / 255,
      g: ((colorHex >> 8) & 255) / 255,
      b: (colorHex & 255) / 255,
      duration: duration
    });
  }

  // Particle updates, implementing custom Interactive Spring Repulsion forces
  update(time, delta, mouse, isTurbulent) {
    if (this.activeSection === 5) {
      this.mesh.rotation.y = time * 0.08;
      this.mesh.rotation.x = Math.sin(time * 0.04) * 0.06;
    } else {
      this.mesh.rotation.y = time * 0.02;
    }
    
    const posAttr = this.geometry.attributes.position;
    const arr = posAttr.array;
    
    // Dynamic particle ripple under active mouse coordinates
    const mouseXWorld = mouse.x * 12.0;
    const mouseYWorld = mouse.y * 8.0;
    
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const x = arr[idx];
      const y = arr[idx + 1];
      const z = arr[idx + 2];
      
      // Calculate distance from cursor
      const dx = x - mouseXWorld;
      const dy = y - mouseYWorld;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < 3.2 && this.activeSection !== 5) {
        // Physical repulsion force pushes particles away
        const forceFactor = (3.2 - dist) * 0.14;
        arr[idx] += (dx / dist) * forceFactor;
        arr[idx + 1] += (dy / dist) * forceFactor;
      }
      
      // Turbulence specific rain falling translations
      if (this.activeSection === 4) {
        arr[idx + 1] -= 0.65; 
        if (arr[idx + 1] < -12.0) {
          arr[idx + 1] = 12.0;
          arr[idx] = (Math.random() - 0.5) * 32.0;
        }
      }
      
      // Waves undulation simulation
      if (this.activeSection === 0 && this.morphState.progress > 0.8) {
        arr[idx + 1] = -2.8 + Math.sin(x * 0.25 + time * 2.2) * 0.35 + Math.cos(z * 0.2 + time * 1.5) * 0.25;
      }
    }
    
    posAttr.needsUpdate = true;
  }
}

// ==========================================================================
// 6. Complete Cinematic WebGL 3D Cockpit Engine (Engine)
// ==========================================================================
class Engine {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.container = document.getElementById('webgl-container');
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    this.particles = null;
    this.clock = new THREE.Clock();
    
    // Hybrid Mouse & Gyro Camera Spring Physics system
    this.springCamX = new SpringPhysics(0.06, 0.14, 2.5);
    this.springCamY = new SpringPhysics(0.06, 0.14, 2.5);
    
    this.mouse = { x: 0, y: 0 };
    this.gyro = { x: 0, y: 0 };
    this.hasGyro = false;
    
    this.activeWaypoint = 0;
    this.isTurbulent = false;
    this.stormCleared = false;
    
    // Volumetric 3D cockpit models (Swept-wing jet and glowing glass consoles)
    this.airplaneGroup = null;
    this.cockpitHUDGroup = null;
    this.interactiveSpheres = [];
    
    this.steeringYoke = null;
    this.yokeRotation = 0;
    this.yokeTargetRot = 0;
    this.isHoldingYoke = false;
    
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020503, 0.015);
    
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 8);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    
    this.scene.add(new THREE.AmbientLight(0x0c1e11));
    
    const dirLight = new THREE.DirectionalLight(0xffa600, 1.5);
    dirLight.position.set(5, 8, 4);
    this.scene.add(dirLight);
    
    const cockpitLight = new THREE.PointLight(0x39ff14, 2.0, 15);
    cockpitLight.position.set(0, 0, 3);
    this.scene.add(cockpitLight);
    
    this.particles = new ParticleSystem(15000);
    this.scene.add(this.particles.mesh);
    
    this.initCustomAtmosphere();
    this.initCockpitMeshes();
    
    this.setupEventListeners();
    
    gsap.ticker.add(() => this.animate());
  }

  // High-performance customized sky atmosphere shader
  initCustomAtmosphere() {
    const skyGeom = new THREE.SphereGeometry(30, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: customAtmosphereShader.vertexShader,
      fragmentShader: customAtmosphereShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorBase: { value: new THREE.Color(0x020503) },
        uColorGlow: { value: new THREE.Color(0x39ff14) }
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const skyDome = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(skyDome);
    this.skyMaterial = skyMat;
    
    // Add custom GLSL Volumetric Nebula clouds
    const cloudGeom = new THREE.BoxGeometry(10, 8, 10);
    const cloudMat = new THREE.ShaderMaterial({
      vertexShader: customNebulaShader.vertexShader,
      fragmentShader: customNebulaShader.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x39ff14) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.nebulaCloud = new THREE.Mesh(cloudGeom, cloudMat);
    this.nebulaCloud.position.set(0, 2, -12);
    this.scene.add(this.nebulaCloud);
    this.nebulaMaterial = cloudMat;
  }

  // Volumetric procedural cockpit assets (3D Swept-Wing Jet aircraft + cockpit frames)
  initCockpitMeshes() {
    this.airplaneGroup = new THREE.Group();
    
    // Swept-Wing 3D Jet
    const fuselageGeom = new THREE.CylinderGeometry(0.18, 0.12, 3.2, 12);
    fuselageGeom.rotateX(Math.PI * 0.5);
    const alloyMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      roughness: 0.15,
      metalness: 0.95,
      envMapIntensity: 2.0
    });
    const fuselage = new THREE.Mesh(fuselageGeom, alloyMat);
    this.airplaneGroup.add(fuselage);
    
    // Left & Right swept wings
    const wingGeom = new THREE.BoxGeometry(3.5, 0.03, 0.6);
    const leftWing = new THREE.Mesh(wingGeom, alloyMat);
    leftWing.position.set(-1.8, 0, -0.3);
    leftWing.rotation.y = -Math.PI * 0.12; 
    leftWing.rotation.z = -Math.PI * 0.03; 
    this.airplaneGroup.add(leftWing);
    
    const rightWing = leftWing.clone();
    rightWing.position.x = 1.8;
    rightWing.rotation.y = Math.PI * 0.12;
    rightWing.rotation.z = Math.PI * 0.03;
    this.airplaneGroup.add(rightWing);
    
    // Cockpit glowing glass canopy dome
    const canopyGeom = new THREE.SphereGeometry(0.16, 16, 16);
    canopyGeom.scale(1.0, 1.0, 2.2);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x39ff14,
      emissive: 0x00ff00,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.45,
      roughness: 0.05
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.14, 0.4);
    this.airplaneGroup.add(canopy);
    
    this.airplaneGroup.position.set(0, -1.8, -5.0);
    this.scene.add(this.airplaneGroup);
    
    // 3D Glassmorphic HUD Cockpit dashboard widgets
    this.cockpitHUDGroup = new THREE.Group();
    
    const consolePlateGeom = new THREE.BoxGeometry(4.2, 0.8, 0.06);
    const consoleGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x030d05,
      transparent: true,
      opacity: 0.65,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.5,
      side: THREE.DoubleSide
    });
    const consolePlate = new THREE.Mesh(consolePlateGeom, consoleGlassMat);
    consolePlate.position.set(0, -1.3, 3.2);
    this.cockpitHUDGroup.add(consolePlate);
    
    // 3D Yoke/Steering wheel mesh
    const yokeRingGeom = new THREE.TorusGeometry(0.35, 0.04, 12, 32);
    const yokeAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x08180d,
      roughness: 0.25,
      metalness: 0.85
    });
    this.steeringYoke = new THREE.Mesh(yokeRingGeom, yokeAlloyMat);
    this.steeringYoke.position.set(0, -1.1, 3.8);
    this.cockpitHUDGroup.add(this.steeringYoke);
    
    const yokeStemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12);
    yokeStemGeom.rotateX(Math.PI * 0.5);
    const yokeStem = new THREE.Mesh(yokeStemGeom, yokeAlloyMat);
    yokeStem.position.set(0, -1.3, 3.5);
    this.cockpitHUDGroup.add(yokeStem);
    
    this.scene.add(this.cockpitHUDGroup);
    
    // Spawn floating 3D glass spheres in Waypoint 1
    const sphereGeom = new THREE.SphereGeometry(0.55, 32, 32);
    const goldOrbMat = new THREE.MeshPhysicalMaterial({
      color: 0xffa600,
      emissive: 0xff3e00,
      emissiveIntensity: 0.35,
      roughness: 0.04,
      metalness: 0.95,
      transmission: 0.5,
      thickness: 0.5
    });
    
    const positions = [
      [-3.2, 1.8, -4.5],
      [3.5, 1.2, -5.2],
      [-1.8, 2.5, -6.0],
      [2.2, 2.8, -4.0]
    ];
    
    positions.forEach(pos => {
      const orb = new THREE.Mesh(sphereGeom, goldOrbMat);
      orb.position.fromArray(pos);
      orb.visible = false;
      this.scene.add(orb);
      this.interactiveSpheres.push(orb);
    });
  }

  setupEventListeners() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 - 1;
      
      this.springCamX.setTarget(this.mouse.x * 0.85);
      this.springCamY.setTarget(this.mouse.y * 0.55);
      
      // Perform raycast click check for Waypoint 1 light spheres
      this.checkSpheresCollision();
    });
    
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta !== null && e.gamma !== null) {
        this.hasGyro = true;
        
        // beta maps pitch angle [-180, 180], gamma maps roll angle [-90, 90]
        const roll = e.gamma / 45.0; 
        const pitch = (e.beta - 45.0) / 45.0; 
        
        this.gyro.x = THREE.MathUtils.clamp(roll, -1.2, 1.2);
        this.gyro.y = THREE.MathUtils.clamp(pitch, -0.8, 0.8);
        
        this.springCamX.setTarget(this.gyro.x);
        this.springCamY.setTarget(this.gyro.y);
      }
    });
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Click collision rippling solver for Waypoint 1 golden orbs
  checkSpheresCollision() {
    if (this.activeWaypoint !== 1) return;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersects = raycaster.intersectObjects(this.interactiveSpheres);
    if (intersects.length > 0) {
      const hitOrb = intersects[0].object;
      
      if (!hitOrb.userData.hit) {
        hitOrb.userData.hit = true;
        
        // Haptic feedback tick
        window.haptic.tick();
        
        // Audio sound thud
        window.audio.playMuffledThud();
        
        // Animate elastic ripple scaling
        gsap.to(hitOrb.scale, {
          x: 1.55, y: 1.55, z: 1.55,
          duration: 0.15,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
          onComplete: () => {
            hitOrb.userData.hit = false;
          }
        });
      }
    }
  }

  setWaypoint(index) {
    this.activeWaypoint = index;
    this.particles.morphTo(index, 2.0);
    
    // Toggle Golden Spheres Visibility for Waypoint 1
    this.interactiveSpheres.forEach(orb => {
      orb.visible = (index === 1);
    });
    
    // Atmosphere adjustments
    if (index === 4) {
      // Turbulence storm atmosphere
      this.isTurbulent = true;
      window.audio.startStorm();
      
      this.skyMaterial.uniforms.uColorBase.value.setHex(0x020005);
      this.skyMaterial.uniforms.uColorGlow.value.setHex(0xff0a54);
    } else {
      this.isTurbulent = false;
      window.audio.stopStorm();
      
      if (index === 5) {
        // Constellation starfield
        this.skyMaterial.uniforms.uColorBase.value.setHex(0x02030d);
        this.skyMaterial.uniforms.uColorGlow.value.setHex(0xff0a54);
      } else {
        this.skyMaterial.uniforms.uColorBase.value.setHex(0x020503);
        this.skyMaterial.uniforms.uColorGlow.value.setHex(0x39ff14);
      }
    }
  }

  animate() {
    const time = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();
    
    // Solve camera dynamic spring mechanics
    const springX = this.springCamX.update();
    const springY = this.springCamY.update();
    
    this.camera.position.x = springX * 1.5;
    this.camera.position.y = springY * 1.1;
    this.camera.lookAt(0, 0.4, 0);
    
    // Shake viewport dynamically inside storms
    if (this.isTurbulent && !this.stormCleared) {
      this.camera.position.x += (Math.random() - 0.5) * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * 0.35;
      this.camera.position.z = 8 + (Math.random() - 0.5) * 0.18;
      
      // Heavy storm rumbles
      if (Math.random() < 0.08) {
        window.haptic.stormRumble();
      }
      
      // Random lightning flash triggers
      if (Math.random() < 0.005) {
        window.audio.playLightning();
        gsap.fromTo(this.scene.fog, { density: 0.015 }, {
          density: 0.065, duration: 0.1, yoyo: true, repeat: 1
        });
      }
    } else {
      this.camera.position.z = 8;
    }
    
    // Tilt 3D glass Console plate
    this.cockpitHUDGroup.rotation.y = springX * 0.15;
    this.steeringYoke.rotation.z = this.yokeRotation;
    
    // Steering yoke damp rotation
    if (this.isHoldingYoke) {
      this.yokeRotation += (this.yokeTargetRot - this.yokeRotation) * 0.1;
      
      // Steer heading tape readout
      const headingSpan = document.getElementById('hud-heading');
      if (headingSpan) {
        const headingDeg = Math.round(360 + (this.yokeRotation * (180 / Math.PI))) % 360;
        headingSpan.innerText = `${headingDeg}°`;
      }
    }
    
    // Update atmospheres GLSL uniform times
    if (this.skyMaterial) this.skyMaterial.uniforms.uTime.value = time;
    if (this.nebulaMaterial) this.nebulaMaterial.uniforms.uTime.value = time;
    
    // Animate swept wings bank
    if (this.airplaneGroup) {
      this.airplaneGroup.rotation.z = -springX * 0.28;
      this.airplaneGroup.rotation.x = springY * 0.18;
    }
    
    // Animate volumetric clouds undulation
    if (this.nebulaCloud) {
      this.nebulaCloud.position.y = 2 + Math.sin(time * 0.5) * 0.5;
    }
    
    // Particle system spring update
    this.particles.update(time, delta, this.mouse, this.isTurbulent);
    
    this.renderer.render(this.scene, this.camera);
  }
}

// ==========================================================================
// 7. Dynamic Entry Radar Scope Solver
// ==========================================================================
class EntryRadar {
  constructor() {
    this.canvas = document.getElementById('radar-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sweepAngle = 0;
    this.targetDetected = false;
    this.points = [];
    
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Seed tactical blip points representing historical moments
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = (0.2 + Math.random() * 0.6) * (this.canvas.width / 2);
      this.points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        size: 3 + Math.random() * 3,
        alpha: 0
      });
    }
    
    gsap.ticker.add(() => this.draw());
  }

  resize() {
    const parent = this.canvas.parentElement;
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMax = w / 2;
    
    this.ctx.clearRect(0, 0, w, h);
    
    // Dynamic green grid layout
    this.ctx.strokeStyle = 'rgba(57, 255, 20, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    
    // Draw circles
    this.ctx.arc(cx, cy, rMax * 0.25, 0, Math.PI*2);
    this.ctx.arc(cx, cy, rMax * 0.5, 0, Math.PI*2);
    this.ctx.arc(cx, cy, rMax * 0.75, 0, Math.PI*2);
    this.ctx.arc(cx, cy, rMax - 2, 0, Math.PI*2);
    this.ctx.stroke();
    
    // Draw cross hairs
    this.ctx.beginPath();
    this.ctx.moveTo(cx - rMax, cy); this.ctx.lineTo(cx + rMax, cy);
    this.ctx.moveTo(cx, cy - rMax); this.ctx.lineTo(cx, cy + rMax);
    this.ctx.stroke();
    
    // Sweep line
    this.sweepAngle += 0.025;
    const sx = cx + Math.cos(this.sweepAngle) * rMax;
    const sy = cy + Math.sin(this.sweepAngle) * rMax;
    
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, rMax);
    gradient.addColorStop(0, 'rgba(57, 255, 20, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 20, 5, 0.0)');
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, rMax, this.sweepAngle - 0.5, this.sweepAngle);
    this.ctx.lineTo(cx, cy);
    this.ctx.fill();
    
    this.ctx.strokeStyle = 'rgba(57, 255, 20, 0.85)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#39ff14';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(sx, sy);
    this.ctx.stroke();
    
    // Draw tactical moment blips
    this.ctx.fillStyle = 'rgba(57, 255, 20, 0.8)';
    this.points.forEach(p => {
      const pAngle = Math.atan2(p.y, p.x);
      const angleDiff = mod(pAngle - this.sweepAngle, Math.PI*2);
      
      if (angleDiff < 0.4) {
        p.alpha = 1.0 - (angleDiff / 0.4);
      } else {
        p.alpha *= 0.98; // slow decay
      }
      
      if (p.alpha > 0.01) {
        this.ctx.fillStyle = `rgba(57, 255, 20, ${p.alpha * 0.95})`;
        this.ctx.beginPath();
        this.ctx.arc(cx + p.x, cy + p.y, p.size, 0, Math.PI*2);
        this.ctx.fill();
      }
    });
    
    this.ctx.shadowBlur = 0; // reset
    
    function mod(n, m) {
      return ((n % m) + m) % m;
    }
  }
}

// ==========================================================================
// 8. Application Bootstrap & Scene Director (Orchestrator)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Global sensor instances
  window.audio = new AudioSynth();
  window.haptic = new HapticEngine();
  
  // Custom cursor follow
  const cursor = document.getElementById('custom-cursor');
  const ring = cursor.querySelector('.cursor-ring');
  const dot = cursor.querySelector('.cursor-dot');
  
  window.addEventListener('mousemove', (e) => {
    gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.05 });
    gsap.to(ring, { x: e.clientX, y: e.clientY, duration: 0.18 });
  });
  
  // key sound triggers
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      document.body.classList.add('hovering');
      window.haptic.tick();
    });
    btn.addEventListener('mouseleave', () => {
      document.body.classList.remove('hovering');
    });
  });
  
  // Radar Scope Loader
  const radar = new EntryRadar();
  const squawkCodeDisplay = document.getElementById('squawk-code-display');
  let typedCode = "";
  
  document.querySelectorAll('.key-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typedCode.length < 4) {
        typedCode += btn.getAttribute('data-val');
        squawkCodeDisplay.innerText = typedCode.padEnd(4, '_');
        window.audio.playPing();
        window.haptic.tick();
      }
    });
  });
  
  document.getElementById('key-clear').addEventListener('click', () => {
    typedCode = "";
    squawkCodeDisplay.innerText = "____";
    window.audio.playPing();
    window.haptic.tick();
  });
  
  document.getElementById('key-send').addEventListener('click', () => {
    window.audio.playMechanicalClick();
    if (typedCode === "0521") {
      // Code unlocked! Show Biometric Fingerprint hold scanner
      document.querySelector('.squawk-keyboard').classList.add('hidden');
      document.getElementById('biometric-scanner').classList.remove('hidden');
      
      const prompt = document.querySelector('.biometric-desc');
      prompt.innerText = "SQUAWK NOMINAL. PRESS & HOLD THUMB TO INITIATE CO-PILOT COGNITIVE SYNC...";
      prompt.classList.add('active');
    } else {
      typedCode = "";
      squawkCodeDisplay.innerText = "____";
      gsap.fromTo(".squawk-input-box", { x: -8 }, { x: 8, duration: 0.05, repeat: 5, yoyo: true });
    }
  });

  // Biometric hold fingerprint scanner
  const fingerBtn = document.getElementById('biometric-touch-btn');
  let holdTimer = null;
  let heartbeatInterval = null;
  let holdProgress = 0;
  
  const startBiometricHold = (e) => {
    e.preventDefault();
    fingerBtn.classList.add('scanning');
    window.haptic.sweep();
    window.audio.init(); 
    if (window.audio.ctx.state === 'suspended') window.audio.ctx.resume();
    
    holdProgress = 0;
    let pulseRate = 600; // start slow heartbeat (600ms interval)
    
    const triggerHeartbeatLoop = () => {
      window.audio.triggerHeartbeatSound();
      window.haptic.trigger(50);
      
      // Accelerate pulse rate
      holdProgress += 1;
      pulseRate = Math.max(120, 600 - (holdProgress * 65)); 
      
      heartbeatInterval = setTimeout(triggerHeartbeatLoop, pulseRate);
    };
    
    triggerHeartbeatLoop();
    
    holdTimer = setTimeout(() => {
      // Biometric Scan Complete! Explode preloader
      endBiometricHold();
      
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = 0; flash.style.left = 0; flash.style.width = '100vw'; flash.style.height = '100vh';
      flash.style.backgroundColor = '#ffffff'; flash.style.zIndex = 99999; flash.style.opacity = 1.0;
      document.body.appendChild(flash);
      
      // Double thump heartbeat
      window.haptic.doubleThump();
      
      gsap.to(flash, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
          flash.remove();
        }
      });
      
      // Initialize Three.js Engine
      window.engine = new Engine();
      window.audio.start();
      
      // Shatter Glass Canvas transition solver
      initShatterTransition();
      
      // Fade out Loader
      gsap.to("#preloader", {
        opacity: 0,
        y: -150,
        duration: 1.2,
        ease: "power4.inOut",
        onComplete: () => {
          document.getElementById('preloader').remove();
          
          // Fade in cockpit HUD
          document.getElementById('hud-overlay').classList.remove('hidden');
          document.getElementById('story-cards-container').classList.remove('hidden');
          document.getElementById('audio-controller').classList.remove('hidden');
          
          // Print Co-pilot Comms
          typeComms("Captain Kashvi, systems online. Grab the throttle when you're ready to fly.");
        }
      });
      
    }, 1800); 
  };
  
  const endBiometricHold = () => {
    fingerBtn.classList.remove('scanning');
    if (holdTimer) clearTimeout(holdTimer);
    if (heartbeatInterval) clearTimeout(heartbeatInterval);
  };
  
  fingerBtn.addEventListener('mousedown', startBiometricHold);
  fingerBtn.addEventListener('mouseup', endBiometricHold);
  fingerBtn.addEventListener('mouseleave', endBiometricHold);
  
  fingerBtn.addEventListener('touchstart', startBiometricHold);
  fingerBtn.addEventListener('touchend', endBiometricHold);

  // Audio hum floating controller
  const audioToggle = document.getElementById('audio-toggle');
  audioToggle.addEventListener('click', () => {
    window.haptic.tick();
    const ctrl = document.getElementById('audio-controller');
    if (window.audio.isPlaying) {
      window.audio.stop();
      ctrl.classList.remove('playing');
    } else {
      window.audio.start();
      ctrl.classList.add('playing');
    }
  });

  // Mechanical throttle lever dragging
  const handle = document.getElementById('throttle-handle');
  const track = document.querySelector('.throttle-track');
  const markers = document.querySelectorAll('.throttle-markers .marker');
  const slides = document.querySelectorAll('#story-cards-container .story-slide');
  
  let isDragging = false;
  
  const onDragStart = (e) => {
    isDragging = true;
    window.haptic.tick();
  };
  
  const onDragMove = (e) => {
    if (!isDragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const trackRect = track.getBoundingClientRect();
    
    let percent = 1 - ((clientY - trackRect.top) / trackRect.height);
    percent = THREE.MathUtils.clamp(percent, 0, 1);
    
    // Move visual handle
    gsap.set(handle, { bottom: `${percent * 100}%` });
    
    // Update live engine thrust synthesis
    window.audio.setEngineThrust(percent);
    
    // Snap to nearest waypoint marker
    const snappedWp = Math.round(percent * 5);
    updateWaypointSnap(snappedWp);
  };
  
  const onDragEnd = () => {
    isDragging = false;
  };
  
  handle.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
  
  handle.addEventListener('touchstart', onDragStart);
  window.addEventListener('touchmove', onDragMove);
  window.addEventListener('touchend', onDragEnd);
  
  let currentActiveWp = 0;
  
  const updateWaypointSnap = (wpIndex) => {
    if (wpIndex === currentActiveWp) return;
    currentActiveWp = wpIndex;
    
    // Update dashboard marker glow
    markers.forEach(m => {
      m.classList.toggle('active', parseInt(m.getAttribute('data-wp')) === wpIndex);
    });
    
    // Morph dynamic 3D Particle system shape
    if (window.engine) {
      window.engine.setWaypoint(wpIndex);
      
      // Update visual flight HUD speeds & altitudes
      const ias = document.getElementById('hud-speed-val');
      const alt = document.getElementById('hud-alt-val');
      
      if (ias) ias.innerText = `${140 + wpIndex * 40} KT`;
      if (alt) alt.innerText = `0${521 + wpIndex * 1250} FT`;
    }
    
    // Swipe storytelling slides
    slides.forEach(s => {
      s.classList.toggle('active', parseInt(s.getAttribute('data-index')) === wpIndex);
    });
    
    // Waypoint specific trigger elements
    document.getElementById('steering-widget').classList.toggle('hidden', wpIndex !== 2);
    document.getElementById('polaroid-overlay').classList.toggle('hidden', wpIndex !== 3);
    document.getElementById('turbulence-glass').classList.toggle('hidden', wpIndex !== 4);
    
    // Co-pilot speech readouts
    let speech = "";
    switch (wpIndex) {
      case 0:
        speech = "Captain Kashvi, systems online. Grab the throttle when you're ready to fly.";
        break;
      case 1:
        speech = "WP1 reached: The New Year Room was packed, but everything was silent. I was only looking at you.";
        break;
      case 2:
        speech = "WP2 reached: Night driving lessons. You were so focused. I was just completely mesmerized.";
        break;
      case 3:
        speech = "WP3 reached: Hover close, tap our first hug photo, and initiate 'The Pull' warp gravity.";
        break;
      case 4:
        speech = "WP4 alert: Severe turbulence detected. Swipe down rain glass handprint to stabilize cockpit wing!";
        break;
      case 5:
        speech = "WP5 Final: Break clouds. Happy Birthday, Kashvi. You are my absolute everything. I love you.";
        break;
    }
    typeComms(speech);
    window.haptic.sweep();
  };

  // Co-pilot Comms retro text typewriter
  let typingTimer = null;
  const typeComms = (text) => {
    const el = document.getElementById('comms-text');
    if (!el) return;
    
    if (typingTimer) clearInterval(typingTimer);
    el.innerText = "";
    
    let i = 0;
    typingTimer = setInterval(() => {
      if (i < text.length) {
        el.innerText += text.charAt(i);
        i++;
      } else {
        clearInterval(typingTimer);
      }
    }, 25); 
  };

  // Physical shattered glass canvas solver (Phase 2)
  const initShatterTransition = () => {
    const canvas = document.getElementById('shatter-canvas');
    canvas.classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    
    const center = { x: canvas.width / 2, y: canvas.height / 2 };
    const cracks = [];
    const linesCount = 20;
    
    for (let i = 0; i < linesCount; i++) {
      const angle = (i / linesCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const length = Math.max(canvas.width, canvas.height);
      cracks.push({
        angle: angle,
        length: length,
        points: [{ x: center.x, y: center.y }]
      });
    }
    
    cracks.forEach(c => {
      let cx = center.x;
      let cy = center.y;
      const segments = 6;
      for (let s = 0; s < segments; s++) {
        const segLen = (c.length / segments) * (0.8 + Math.random() * 0.4);
        cx += Math.cos(c.angle) * segLen;
        cy += Math.sin(c.angle) * segLen;
        c.points.push({ x: cx, y: cy });
      }
    });
    
    let drawProg = 0;
    const animateCracks = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#39ff14';
      ctx.lineWidth = 1.8;
      
      cracks.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.points[0].x, c.points[0].y);
        
        const visiblePts = Math.min(c.points.length, Math.floor(drawProg * c.points.length));
        for (let p = 1; p < visiblePts; p++) {
          ctx.lineTo(c.points[p].x, c.points[p].y);
        }
        ctx.stroke();
      });
      
      drawProg += 0.08;
      if (drawProg <= 1.0) {
        requestAnimationFrame(animateCracks);
      } else {
        // Explode fractures away
        gsap.to(canvas, {
          opacity: 0,
          scale: 1.25,
          duration: 0.8,
          ease: "power2.in",
          onComplete: () => {
            canvas.remove();
          }
        });
      }
    };
    
    animateCracks();
  };

  // Waypoint 2: Steering Yoke drag stabilization
  const yokeBtn = document.getElementById('steering-wheel-btn');
  let activeYokeHold = false;
  let yokeHumInterval = null;
  
  const startYokeHold = (e) => {
    activeYokeHold = true;
    yokeBtn.classList.add('holding');
    if (window.engine) window.engine.isHoldingYoke = true;
    
    // Low frequency engine hum rumbles
    yokeHumInterval = setInterval(() => {
      window.haptic.trigger([20, 15]);
    }, 55);
  };
  
  const stopYokeHold = () => {
    activeYokeHold = false;
    yokeBtn.classList.remove('holding');
    if (window.engine) {
      window.engine.isHoldingYoke = false;
      window.engine.yokeTargetRot = 0;
    }
    if (yokeHumInterval) clearInterval(yokeHumInterval);
  };
  
  yokeBtn.addEventListener('mousedown', startYokeHold);
  window.addEventListener('mouseup', stopYokeHold);
  
  yokeBtn.addEventListener('touchstart', startYokeHold);
  window.addEventListener('touchend', stopYokeHold);
  
  window.addEventListener('mousemove', (e) => {
    if (!activeYokeHold || !window.engine) return;
    const clientX = e.clientX;
    const deltaX = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    window.engine.yokeTargetRot = deltaX * Math.PI * 0.45; // limits tilt rot
  });
  
  window.addEventListener('touchmove', (e) => {
    if (!activeYokeHold || !window.engine) return;
    const clientX = e.touches[0].clientX;
    const deltaX = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    window.engine.yokeTargetRot = deltaX * Math.PI * 0.45;
  });

  // Waypoint 3: Tap Polaroid cards Climax "The Pull"
  document.getElementById('polaroid-hug').addEventListener('click', () => {
    window.haptic.doubleThump();
    
    // Zoom camera in violently
    if (window.engine) {
      gsap.to(window.engine.camera.position, {
        z: 2.8,
        duration: 0.7,
        ease: "power4.in",
        onComplete: () => {
          // Glow and warp transition
          const card = document.getElementById('polaroid-hug');
          card.classList.add('enveloped');
          
          typeComms("THE PULL: Gravity threshold bypassed. Cozy space fields stable.");
          
          setTimeout(() => {
            gsap.to(window.engine.camera.position, {
              z: 8.0,
              duration: 1.5,
              ease: "power2.out"
            });
            card.classList.remove('enveloped');
          }, 2000);
        }
      });
    }
  });

  // Waypoint 4: Storm handprint wiper swipe clear glass solver
  const handprint = document.getElementById('handprint-stabilizer');
  let wipeStartY = 0;
  
  handprint.addEventListener('mousedown', (e) => {
    wipeStartY = e.clientY;
  });
  
  handprint.addEventListener('mouseup', (e) => {
    const wipeEndY = e.clientY;
    if (wipeStartY - wipeEndY > 80) {
      // Clear rain storm!
      window.haptic.doubleThump();
      
      const glass = document.getElementById('turbulence-glass');
      gsap.to(glass, {
        opacity: 0,
        y: -100,
        duration: 0.6,
        onComplete: () => {
          glass.classList.add('hidden');
          if (window.engine) {
            window.engine.stormCleared = true;
            window.engine.isTurbulent = false;
            window.audio.stopStorm();
            
            // Speed up speed tape to escape
            const ias = document.getElementById('hud-speed-val');
            if (ias) ias.innerText = "300 KT";
            
            typeComms("Storm cleared. Celestial horizon within visual ranges. Prepare for take-off finale.");
          }
        }
      });
    }
  });

  handprint.addEventListener('touchstart', (e) => {
    wipeStartY = e.touches[0].clientY;
  });
  
  handprint.addEventListener('touchend', (e) => {
    const wipeEndY = e.changedTouches[0].clientY;
    if (wipeStartY - wipeEndY > 80) {
      window.haptic.doubleThump();
      const glass = document.getElementById('turbulence-glass');
      gsap.to(glass, {
        opacity: 0,
        y: -100,
        duration: 0.6,
        onComplete: () => {
          glass.classList.add('hidden');
          if (window.engine) {
            window.engine.stormCleared = true;
            window.engine.isTurbulent = false;
            window.audio.stopStorm();
            
            const ias = document.getElementById('hud-speed-val');
            if (ias) ias.innerText = "300 KT";
            
            typeComms("Storm cleared. Celestial horizon within visual ranges. Prepare for take-off finale.");
          }
        }
      });
    }
  });

  // Waypoint 5 Climax Interactive Constellation Activation
  const finalHeartBtn = document.getElementById('final-heart');
  finalHeartBtn.addEventListener('click', () => {
    window.haptic.doubleThump();
    window.audio.triggerHeartbeatSound();
    
    // Scale heart outline pulsing
    gsap.fromTo(finalHeartBtn, { scale: 0.9 }, { scale: 1.15, duration: 0.1, yoyo: true, repeat: 1 });
    
    // Pulse camera violently to evoke massive warmth
    if (window.engine) {
      gsap.fromTo(window.engine.camera.position, { z: 8 }, { z: 6.5, duration: 0.3, yoyo: true, repeat: 1, ease: "power2.inOut" });
      
      // Explode stars spelled constellation glow
      window.engine.particles.morphTo(5, 3.5); 
    }
    
    typeComms("Happy Birthday, Kashvi. You are going to be the most brilliant pilot in the sky. Fly high. I love you.");
  });
  
  // Live Zulu UTC Clock setup
  const updateZuluTime = () => {
    const timeSpan = document.getElementById('live-time');
    if (!timeSpan) return;
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    timeSpan.innerText = `UTC ${hrs}:${mins}:${secs}`;
  };
  
  setInterval(updateZuluTime, 1000);
  updateZuluTime();
});
