/* ==========================================================================
   Kashvi — Flight Plan 0521 — Consolidated App Orchestrator & WebGL Engine
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';

// ==========================================================================
// 1. Procedural Cinematic Ambient Soundtrack Engine (Web Audio API)
// ==========================================================================
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    
    // Ambient Pad & Arpeggio Synths
    this.padOscs = [];
    this.padGains = [];
    this.sequenceTimer = null;
    
    // Engine Hum Synthesis Nodes
    this.engineHumOsc = null;
    this.engineHumOsc2 = null;
    this.engineHumGain = null;
    this.engineFilter = null;
    
    // Storm Synthesis Nodes
    this.stormNoiseNode = null;
    this.stormGain = null;
    this.stormFilter = null;
    this.stormTimer = null;
    
    // Chord progression notes (frequencies for Cmaj9 - Am9 - Fmaj9 - G13)
    this.chords = [
      [130.81, 164.81, 196.00, 246.94, 293.66], // Cmaj9 (C3, E3, G3, B3, D4)
      [110.00, 146.83, 174.61, 220.00, 261.63], // Am9 (A2, D3, F3, A3, C4)
      [87.31, 130.81, 174.61, 220.00, 261.63],  // Fmaj9 (F2, C3, F3, A3, C4)
      [98.00, 146.83, 196.00, 246.94, 293.66]   // G13 (G2, D3, G3, B3, D4)
    ];
    this.currentChordIndex = 0;
  }

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create master volume node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Start silent for fade-in
    
    // High-end Stereo Delay line for crystal piano drops
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayFilter = this.ctx.createBiquadFilter();
    
    this.delayNode.delayTime.setValueAtTime(0.45, this.ctx.currentTime); // 450ms delay
    this.delayFeedback.gain.setValueAtTime(0.4, this.ctx.currentTime);   // 40% feedback
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.setValueAtTime(1200, this.ctx.currentTime); // Dampen high delay echoes
    
    // Route delay feedback loop
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    
    // Main Lowpass Filter to make the sound warm and dreamy
    this.mainFilter = this.ctx.createBiquadFilter();
    this.mainFilter.type = 'lowpass';
    this.mainFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.mainFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);
    
    // Connect routing graph: Synths -> mainFilter -> masterGain -> Context Destination
    this.mainFilter.connect(this.masterGain);
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    // Initialize Engine Hum Synth
    this.initEngineHum();
    
    // Initialize Storm Synth
    this.initStormSynth();
  }

  start() {
    if (this.isPlaying) return;
    
    this.init();
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.isPlaying = true;
    
    // Fade in master volume
    this.masterGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 3.0); // 3 seconds fade-in
    
    // Start warm background pads
    this.startAmbientPads();
    
    // Start high-end random stardust piano droplets
    this.schedulePianoDroplets();
    
    // Start procedural cockpit hum
    this.startEngineHum();
  }

  stop() {
    if (!this.isPlaying) return;
    
    // Fade out master volume
    this.masterGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.5); // 1.5s fade out
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
    
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    if (this.pianoTimeout) {
      clearTimeout(this.pianoTimeout);
      this.pianoTimeout = null;
    }
  }

  /* Layer 1: Ambient Pad Drone */
  startAmbientPads() {
    this.stopAllOscillators();
    if (!this.isPlaying) return;
    
    const now = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIndex];
    
    // Generate soft, overlapping warm waves for each chord frequency
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      // Detune slightly to create thick lush texture
      osc.detune.setValueAtTime((Math.random() - 0.5) * 12, now);
      
      // Ultra-soft individual oscillator volume
      const oscVolume = idx === 0 ? 0.05 : 0.03; // Stronger bass foundation
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(oscVolume, now + 2.0); // Smooth attack
      
      osc.connect(gain);
      gain.connect(this.mainFilter);
      
      osc.start(now);
      
      this.padOscs.push(osc);
      this.padGains.push(gain);
    });
    
    // Shift slow filter sweeps to evoke emotional moving waves
    this.mainFilter.frequency.setValueAtTime(500 + Math.random() * 200, now);
    this.mainFilter.frequency.exponentialRampToValueAtTime(800 + Math.random() * 400, now + 8.0);
    
    // Schedule next chord change every 10 seconds (cinematic pacing)
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
    
    // Fade out previous oscillators
    oldGains.forEach(gainNode => {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0.0, now + 2.5); // Fade out over 2.5s
    });
    
    // Clean up old nodes after fadeout completes
    setTimeout(() => {
      oldOscs.forEach(osc => {
        try { osc.stop(); } catch(e) {}
      });
    }, 3000);
    
    // Clear list to load new chord structure
    this.padOscs = [];
    this.padGains = [];
    
    this.startAmbientPads();
  }

  /* Layer 2: High-pitched Star Stardust Drops */
  schedulePianoDroplets() {
    if (!this.isPlaying) return;
    
    const delay = 1500 + Math.random() * 3500; // Plays every 1.5 to 5 seconds
    
    this.pianoTimeout = setTimeout(() => {
      this.playPianoNote();
      this.schedulePianoDroplets();
    }, delay);
  }

  playPianoNote() {
    if (!this.isPlaying || !this.ctx) return;
    
    const now = this.ctx.currentTime;
    
    // Pick note from the current active chord, transpose up by 2 octaves
    const baseChord = this.chords[this.currentChordIndex];
    const baseFreq = baseChord[Math.floor(Math.random() * baseChord.length)];
    const freq = baseFreq * 4; // Transpose 2 octaves up
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Dynamic volume (delicate droplets)
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);  // Instant attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // Long bell-like decay
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Also feed note into delay feedback circuit for dreamy spatial sound
    gain.connect(this.delayNode);
    
    osc.start(now);
    osc.stop(now + 2.0);
  }

  /* Interactive Effect: Deep low-frequency heartbeat sound (Haptic Fallback) */
  triggerHeartbeatSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = this.ctx.currentTime;
    
    // Heartbeat plays a double-pulse beat: "lub-dub" [Frequency 55Hz & 48Hz]
    this.playSingleHeartPulse(55, now, 0.5);      // "Lub" pulse
    this.playSingleHeartPulse(48, now + 0.28, 0.4); // "Dub" pulse
  }

  playSingleHeartPulse(freq, startTime, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.22); // Frequency drop
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, startTime);
    
    gain.gain.setValueAtTime(0.0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination); // Direct bypass master to ensure heavy deep bass
    
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }

  /* Keyboard Pings for typing interaction */
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

  /* Heavy mechanical click for Send button */
  playMechanicalClick() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = this.ctx.currentTime;
    this.playSingleHeartPulse(80, now, 0.45);
    this.playSingleHeartPulse(110, now + 0.05, 0.3);
  }

  /* Procedural Cockpit Engine Hum */
  initEngineHum() {
    if (!this.ctx) return;
    
    this.engineHumOsc = this.ctx.createOscillator();
    this.engineHumOsc2 = this.ctx.createOscillator();
    this.engineHumGain = this.ctx.createGain();
    
    this.engineHumOsc.type = 'sawtooth';
    this.engineHumOsc.frequency.setValueAtTime(65, this.ctx.currentTime); // 65Hz fundamental
    this.engineHumOsc.detune.setValueAtTime(-6, this.ctx.currentTime);
    
    this.engineHumOsc2.type = 'triangle';
    this.engineHumOsc2.frequency.setValueAtTime(130, this.ctx.currentTime); // First octave overtone
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
    } catch (e) {
      // Already running
    }
    
    this.engineHumGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.engineHumGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 2.0); // Smooth ramp
  }

  stopEngineHum() {
    if (this.engineHumGain) {
      this.engineHumGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.engineHumGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);
    }
  }

  /* Set Engine Thrust based on throttle (value ranges 0 to 1) */
  setEngineThrust(val) {
    if (!this.ctx || !this.engineHumOsc || !this.engineHumOsc2) return;
    
    const now = this.ctx.currentTime;
    
    // Modulate pitch: higher thrust raises frequency
    const targetFreq1 = 65 + val * 45;   // 65Hz to 110Hz
    const targetFreq2 = 130 + val * 90;  // 130Hz to 220Hz
    const targetCutoff = 110 + val * 180; // Filter opens up as throttle advances
    const targetGain = 0.06 + val * 0.08; // Hum gets slightly louder
    
    this.engineHumOsc.frequency.linearRampToValueAtTime(targetFreq1, now + 0.25);
    this.engineHumOsc2.frequency.linearRampToValueAtTime(targetFreq2, now + 0.25);
    this.engineFilter.frequency.linearRampToValueAtTime(targetCutoff, now + 0.25);
    
    if (this.engineHumGain) {
      this.engineHumGain.gain.linearRampToValueAtTime(targetGain, now + 0.25);
    }
  }

  /* Procedural Wind / Storm Generator */
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
    this.stormFilter.frequency.setValueAtTime(250, this.ctx.currentTime); // Low howling sound
    this.stormFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);
    
    this.stormNoiseNode.connect(this.stormFilter);
    this.stormFilter.connect(this.stormGain);
    this.stormGain.connect(this.ctx.destination);
  }

  startStorm() {
    if (!this.stormNoiseNode) this.initStormSynth();
    
    try {
      this.stormNoiseNode.start(this.ctx.currentTime);
    } catch (e) {
      // Node already started
    }
    
    const now = this.ctx.currentTime;
    this.stormGain.gain.cancelScheduledValues(now);
    this.stormGain.gain.linearRampToValueAtTime(0.35, now + 2.0); // Howling storm builds
    
    this.modulateStormWind();
  }

  modulateStormWind() {
    if (!this.isPlaying || !this.stormFilter) return;
    
    const now = this.ctx.currentTime;
    const targetFreq = 180 + Math.random() * 240; // Frequency drifts dynamically
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

  /* Lightning discharge sound effect */
  playLightning() {
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    
    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Crack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9); // Deep rumble
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 1.0);
  }
}

// ==========================================================================
// 2. WebGL Dynamic Morphing Particle System (ParticleSystem)
// ==========================================================================
class ParticleSystem {
  constructor(count = 10000) {
    this.count = count;
    this.mesh = null;
    this.geometry = null;
    this.material = null;
    
    this.activeSection = 0;
    this.morphState = { progress: 1.0 };
    
    this.shapes = {
      0: [], // Undulating Waves (deep blue)
      1: [], // 3D Volumetric Heart (crimson pink)
      2: [], // Floating Star Nebula
      3: [], // Warp Speed light trails
      4: [], // Centered Magnetic Swarm
      5: [], // Vertical Falling Stardust Rain
      6: [], // Sunset Dome
      7: []  // Glowing "KASHVI" Constellation + Beating Heart
    };
    
    this.sourcePositions = new Float32Array(this.count * 3);
    this.targetPositions = new Float32Array(this.count * 3);
    
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
    }
    
    const texture = this.createFuzzyGlowTexture();
    
    this.material = new THREE.PointsMaterial({
      size: 0.22,
      color: 0x5a7cfa, // Initial Waves color
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
      const wX = (Math.random() - 0.5) * 32;
      const wZ = (Math.random() - 0.5) * 28;
      const wY = -2.5 + (Math.random() - 0.5) * 0.4;
      this.shapes[0].push(wX, wY, wZ);
      
      // Shape 1: 3D Volumetric Heart Structure
      const t = Math.random() * Math.PI * 2;
      const u = (Math.random() * 2 - 1) * Math.PI;
      const hX = 16 * Math.pow(Math.sin(t), 3) * Math.cos(u * 0.5) * 0.25;
      const hY = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * Math.cos(u * 0.5) * 0.25;
      const hZ = 12 * Math.sin(t) * Math.sin(u * 0.5) * 0.25;
      this.shapes[1].push(hX, hY + 1.0, hZ);
      
      // Shape 2: Drifting Nebula Backdrop
      const rNeb = 12 + Math.random() * 18;
      const thetaNeb = Math.random() * Math.PI * 2;
      const phiNeb = Math.acos((Math.random() * 2) - 1);
      const nX = rNeb * Math.sin(phiNeb) * Math.cos(thetaNeb);
      const nY = rNeb * Math.sin(phiNeb) * Math.sin(thetaNeb);
      const nZ = rNeb * Math.cos(phiNeb) - 6.0;
      this.shapes[2].push(nX, nY, nZ);
      
      // Shape 3: Starfield Warp Speed tunnel
      const tRadius = 1.0 + Math.random() * 5.0;
      const tAngle = Math.random() * Math.PI * 2;
      const dX = tRadius * Math.cos(tAngle);
      const dY = tRadius * Math.sin(tAngle);
      const dZ = (Math.random() - 0.5) * 45;
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
      const raY = (Math.random() - 0.5) * 22;
      const raZ = (Math.random() - 0.5) * 20;
      this.shapes[5].push(raX, raY, raZ);
      
      // Shape 6: Sunset Skyline Dome
      const sRadius = 15 + Math.random() * 15;
      const sTheta = Math.random() * Math.PI * 2;
      const sPhi = Math.acos((Math.random() * 1.2) - 0.2);
      const suX = sRadius * Math.sin(sPhi) * Math.cos(sTheta);
      const suY = Math.abs(sRadius * Math.sin(sPhi) * Math.sin(sTheta)) - 4;
      const suZ = sRadius * Math.cos(sPhi) - 10.0;
      this.shapes[6].push(suX, suY, suZ);

      // Shape 7: Glowing "KASHVI" Constellation + Beating Heart Outline
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
        const letterIdx = i % 6;
        const segments = letterSegments[letterIdx];
        const seg = segments[Math.floor(Math.random() * segments.length)];
        const t = Math.random();
        
        const pX = THREE.MathUtils.lerp(seg[0][0], seg[1][0], t);
        const pY = THREE.MathUtils.lerp(seg[0][1], seg[1][1], t);
        const pZ = THREE.MathUtils.lerp(seg[0][2], seg[1][2], t);
        
        const noise = 0.08;
        const nX = pX + (Math.random() - 0.5) * noise;
        const nY = pY + (Math.random() - 0.5) * noise;
        const nZ = pZ + (Math.random() - 0.5) * noise;
        this.shapes[7].push(nX, nY, nZ);
      } else {
        const tHeart = Math.random() * Math.PI * 2;
        const hX = 16 * Math.pow(Math.sin(tHeart), 3) * 0.18;
        const hY = (13 * Math.cos(tHeart) - 5 * Math.cos(2*tHeart) - 2 * Math.cos(3*tHeart) - Math.cos(4*tHeart)) * 0.18 + 3.2;
        const hZ = (Math.random() - 0.5) * 0.4 - 1.0;
        this.shapes[7].push(hX, hY, hZ);
      }
    }
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
    
    let targetSize = 0.22;
    if (sectionIdx === 1) targetSize = 0.28;
    if (sectionIdx === 4) targetSize = 0.35;
    if (sectionIdx === 5) targetSize = 0.16;
    if (sectionIdx === 7) targetSize = 0.25;
    
    gsap.to(this.material, {
      size: targetSize,
      duration: duration
    });
  }

  update(time, delta, mouse) {
    if (this.activeSection === 1) {
      this.mesh.rotation.y = time * 0.15;
      this.mesh.rotation.x = Math.sin(time * 0.08) * 0.1;
    } else if (this.activeSection === 7) {
      this.mesh.rotation.y = time * 0.05;
      this.mesh.rotation.x = Math.sin(time * 0.03) * 0.05;
    } else {
      this.mesh.rotation.y = time * 0.03;
      this.mesh.rotation.x = 0;
    }
    
    const posAttr = this.geometry.attributes.position;
    const arr = posAttr.array;
    
    // Section 1: undulating waves
    if (this.activeSection === 0 && this.morphState.progress > 0.8) {
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const x = arr[idx];
        const z = arr[idx + 2];
        const baseHeight = -2.5;
        arr[idx + 1] = baseHeight + 
                       Math.sin(x * 0.22 + time * 1.5) * 0.45 + 
                       Math.cos(z * 0.18 + time * 1.1) * 0.35;
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 4: Warp Speed cylinder driving
    if (this.activeSection === 3 && this.morphState.progress > 0.8) {
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3 + 2;
        arr[idx] += delta * 12.0;
        if (arr[idx] > 15.0) {
          arr[idx] = -30.0;
        }
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 5: Magnetic Attraction Pull
    if (this.activeSection === 4 && this.morphState.progress > 0.7) {
      const targetX = mouse.x * 6.5;
      const targetY = mouse.y * 5.0;
      
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const offsetMultiplier = 0.05 + (i % 50) * 0.002;
        arr[idx] += (targetX - arr[idx]) * offsetMultiplier;
        arr[idx + 1] += (targetY - arr[idx + 1]) * offsetMultiplier;
      }
      posAttr.needsUpdate = true;
    }
    
    // Section 6: Falling Stardust Rain
    if (this.activeSection === 5 && this.morphState.progress > 0.8) {
      const windShift = mouse.x * 3.0;
      
      for (let i = 0; i < this.count; i++) {
        const idx = i * 3;
        const speed = 4.0 + (i % 20) * 0.3;
        
        arr[idx + 1] -= delta * speed;
        arr[idx] += windShift * delta * 0.3;
        
        if (arr[idx + 1] < -11.0) {
          arr[idx + 1] = 11.0;
          arr[idx] = (Math.random() - 0.5) * 36;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Section 8: Spelling "KASHVI" + Heart Beating
    if (this.activeSection === 7 && this.morphState.progress > 0.8) {
      let beat = 0;
      const cycle = time % 1.2;
      if (cycle < 0.15) {
        beat = Math.sin((cycle / 0.15) * Math.PI) * 0.14; // Lub
      } else if (cycle > 0.25 && cycle < 0.40) {
        beat = Math.sin(((cycle - 0.25) / 0.15) * Math.PI) * 0.07; // Dub
      }
      const scale = 1.0 + beat;
      
      const targetArr = this.shapes[7];
      for (let i = 8000; i < this.count; i++) {
        const idx = i * 3;
        const baseX = targetArr[idx];
        const baseY = targetArr[idx + 1];
        const baseZ = targetArr[idx + 2];
        
        arr[idx] = baseX * scale;
        arr[idx + 1] = (baseY - 3.2) * scale + 3.2;
        arr[idx + 2] = (baseZ + 1.0) * scale - 1.0;
      }
      
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

// ==========================================================================
// 3. Procedural Metallic Airplane Model Builder (Airplane)
// ==========================================================================
class Airplane {
  constructor() {
    this.mesh = new THREE.Group();
    this.mesh.scale.set(0.4, 0.4, 0.4);
    this.createModel();
  }

  createModel() {
    const aluminumMat = new THREE.MeshStandardMaterial({
      color: 0xe0e6ed,
      metalness: 0.9,
      roughness: 0.15,
      flatShading: false
    });

    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.9,
      roughness: 0.25,
      flatShading: false
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.2,
      flatShading: false
    });

    const cockpitGlassMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0088cc,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.65,
      roughness: 0.05
    });

    // 1. FUSELAGE
    const fuselageGeom = new THREE.CylinderGeometry(1.4, 0.8, 14, 24);
    fuselageGeom.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeom, aluminumMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.mesh.add(fuselage);

    // 2. NOSE CONE
    const noseGeom = new THREE.ConeGeometry(1.4, 3.5, 24);
    noseGeom.rotateX(Math.PI / 2);
    noseGeom.translate(0, 0, 8.75);
    const nose = new THREE.Mesh(noseGeom, darkAlloyMat);
    this.mesh.add(nose);

    // 3. COCKPIT GLASS
    const cockpitGeom = new THREE.SphereGeometry(1.0, 16, 16);
    cockpitGeom.scale(1.1, 0.7, 2.5);
    cockpitGeom.translate(0, 0.8, 6.2);
    const cockpit = new THREE.Mesh(cockpitGeom, cockpitGlassMat);
    this.mesh.add(cockpit);

    // 4. WINGS
    this.wingsGroup = new THREE.Group();

    const leftWingGeom = new THREE.BoxGeometry(8, 0.12, 2.2);
    leftWingGeom.translate(-4, 0, 0);
    const leftWing = new THREE.Mesh(leftWingGeom, aluminumMat);
    leftWing.rotation.y = -Math.PI / 8;
    leftWing.rotation.z = Math.PI / 36;
    leftWing.position.set(-0.8, -0.2, 1);
    this.wingsGroup.add(leftWing);

    const rightWingGeom = new THREE.BoxGeometry(8, 0.12, 2.2);
    rightWingGeom.translate(4, 0, 0);
    const rightWing = new THREE.Mesh(rightWingGeom, aluminumMat);
    rightWing.rotation.y = Math.PI / 8;
    rightWing.rotation.z = -Math.PI / 36;
    rightWing.position.set(0.8, -0.2, 1);
    this.wingsGroup.add(rightWing);

    this.mesh.add(this.wingsGroup);

    // 5. JET ENGINES & FANS
    const engineGeom = new THREE.CylinderGeometry(0.8, 0.65, 4.0, 16);
    engineGeom.rotateX(Math.PI / 2);

    this.engineLeft = new THREE.Mesh(engineGeom, darkAlloyMat);
    this.engineLeft.position.set(-3.2, -0.6, -0.5);
    this.mesh.add(this.engineLeft);

    this.engineRight = new THREE.Mesh(engineGeom, darkAlloyMat);
    this.engineRight.position.set(3.2, -0.6, -0.5);
    this.mesh.add(this.engineRight);

    const fanGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.2, 12);
    fanGeom.rotateX(Math.PI / 2);
    
    this.fanLeft = new THREE.Mesh(fanGeom, goldAccentMat);
    this.fanLeft.position.set(-3.2, -0.6, 1.4);
    this.mesh.add(this.fanLeft);

    this.fanRight = new THREE.Mesh(fanGeom, goldAccentMat);
    this.fanRight.position.set(3.2, -0.6, 1.4);
    this.mesh.add(this.fanRight);

    // 6. ENGINE PLUMES (Thrust glow)
    const plumeGeom = new THREE.ConeGeometry(0.55, 2.5, 12);
    plumeGeom.rotateX(-Math.PI / 2);
    plumeGeom.translate(0, 0, -2.85);

    this.plumeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.plumeLeft = new THREE.Mesh(plumeGeom, this.plumeMat);
    this.plumeLeft.position.set(-3.2, -0.6, -0.5);
    this.mesh.add(this.plumeLeft);

    this.plumeRight = new THREE.Mesh(plumeGeom, this.plumeMat);
    this.plumeRight.position.set(3.2, -0.6, -0.5);
    this.mesh.add(this.plumeRight);

    // 7. TAILFINS
    const tailFlapGeom = new THREE.BoxGeometry(4.5, 0.08, 1.2);
    const tailFlaps = new THREE.Mesh(tailFlapGeom, aluminumMat);
    tailFlaps.position.set(0, 0.2, -5.6);
    tailFlaps.rotation.y = -Math.PI / 18;
    this.mesh.add(tailFlaps);

    const tailFinGeom = new THREE.BoxGeometry(0.12, 3.2, 1.8);
    const vertFin = new THREE.Mesh(tailFinGeom, darkAlloyMat);
    vertFin.position.set(0, 1.6, -5.4);
    vertFin.rotation.x = Math.PI / 12;
    this.mesh.add(vertFin);

    // 8. FAA LIGHTS
    const navLightGeom = new THREE.SphereGeometry(0.16, 8, 8);

    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    this.leftLight = new THREE.Mesh(navLightGeom, redLightMat);
    this.leftLight.position.set(-8.4, -0.15, 0.5);
    this.mesh.add(this.leftLight);

    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    this.rightLight = new THREE.Mesh(navLightGeom, greenLightMat);
    this.rightLight.position.set(8.4, -0.15, 0.5);
    this.mesh.add(this.rightLight);

    const whiteStrobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.tailStrobe = new THREE.Mesh(navLightGeom, whiteStrobeMat);
    this.tailStrobe.position.set(0, 3.1, -6.0);
    this.mesh.add(this.tailStrobe);
  }

  update(time, scrollSpeed = 0) {
    const spinFactor = 25.0 + scrollSpeed * 40.0;
    if (this.fanLeft && this.fanRight) {
      this.fanLeft.rotation.y += spinFactor * 0.016;
      this.fanRight.rotation.y += spinFactor * 0.016;
    }

    if (this.tailStrobe) {
      const cycle = time % 1.5;
      const isFlashing = (cycle > 0.0 && cycle < 0.1) || (cycle > 0.25 && cycle < 0.35);
      this.tailStrobe.visible = isFlashing;
    }

    const flicker = 1.0 + Math.sin(time * 65.0) * 0.08 + scrollSpeed * 0.8;
    if (this.plumeLeft && this.plumeRight) {
      this.plumeLeft.scale.set(flicker, flicker, flicker);
      this.plumeRight.scale.set(flicker, flicker, flicker);
      
      if (scrollSpeed > 0.25) {
        this.plumeMat.color.setHex(0x00ffff);
      } else {
        this.plumeMat.color.setHex(0x00aaff);
      }
    }
  }
}

// ==========================================================================
// 4. Volumetric Cloud System (CloudSystem)
// ==========================================================================
class CloudSystem {
  constructor() {
    this.mesh = new THREE.Group();
    this.clouds = [];
    this.cloudCount = 18;
    this.scrollSpeed = 0;
    this.bankAngle = 0;
    
    this.createClouds();
  }

  createClouds() {
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe4cc, // Start Warm Golden takeoff
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      flatShading: false,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    for (let i = 0; i < this.cloudCount; i++) {
      const cloudGroup = new THREE.Group();
      const sphereCount = 5 + Math.floor(Math.random() * 5);
      const clusterWidth = 3 + Math.random() * 4;

      for (let j = 0; j < sphereCount; j++) {
        const radius = 1.0 + Math.random() * 1.8;
        const sphereGeom = new THREE.SphereGeometry(radius, 12, 12);
        const sphereMesh = new THREE.Mesh(sphereGeom, cloudMaterial.clone()); // individual clones to permit color tweens

        sphereMesh.position.set(
          (Math.random() - 0.5) * clusterWidth,
          (Math.random() - 0.5) * (clusterWidth * 0.4),
          (Math.random() - 0.5) * (clusterWidth * 0.6)
        );

        sphereMesh.scale.set(1.4, 0.7, 1.0);
        sphereMesh.receiveShadow = true;
        cloudGroup.add(sphereMesh);
      }

      const cX = (Math.random() - 0.5) * 45;
      const cY = -4.0 + (Math.random() - 0.5) * 12;
      const cZ = -10.0 - (Math.random() * 55);
      
      cloudGroup.position.set(cX, cY, cZ);
      
      this.clouds.push({
        group: cloudGroup,
        baseX: cX,
        baseY: cY,
        driftSpeed: 0.1 + Math.random() * 0.25,
        zSpeedFactor: 1.0 + Math.random() * 0.5
      });

      this.mesh.add(cloudGroup);
    }
  }

  update(time, delta, mouse = { x: 0, y: 0 }) {
    const baseSpeed = 5.0 + this.scrollSpeed * 28.0;
    
    this.clouds.forEach(c => {
      c.group.position.z += baseSpeed * delta * c.zSpeedFactor;

      if (c.group.position.z > 12.0) {
        c.group.position.z = -65.0 - (Math.random() * 10);
        c.group.position.x = (Math.random() - 0.5) * 45;
        c.group.position.y = -4.0 + (Math.random() - 0.5) * 12;
        c.baseX = c.group.position.x;
        c.baseY = c.group.position.y;
      }

      c.group.position.y = c.baseY + Math.sin(time * 0.5 + c.baseX) * 0.35;

      const targetParallaxX = c.baseX - (mouse.x * 4.5) - (this.bankAngle * 6.0);
      const targetParallaxY = c.group.position.y - (mouse.y * 1.5);
      
      c.group.position.x += (targetParallaxX - c.group.position.x) * 0.04;
      c.group.position.y += (targetParallaxY - c.group.position.y) * 0.04;
    });
  }

  transitionSkyState(sectionIdx, duration = 2.0) {
    let cloudColor = 0xffffff;
    let opacity = 0.45;
    
    switch (sectionIdx) {
      case 0: // Takeoff: Golden Hour Warmth
        cloudColor = 0xffe4cc;
        opacity = 0.55;
        break;
      case 1: // Cruise: Bright White
        cloudColor = 0xffffff;
        opacity = 0.5;
        break;
      case 2: // Memories: Translucent Soft White
        cloudColor = 0xffffff;
        opacity = 0.35;
        break;
      case 3: // Turbulence: Stormy Dark Purple/Indigo
        cloudColor = 0x3d2b5c;
        opacity = 0.7;
        break;
      case 4: // Horizon: Starry Deep Space Violet
        cloudColor = 0x221a36;
        opacity = 0.15;
        break;
    }

    this.clouds.forEach(c => {
      c.group.children.forEach(mesh => {
        gsap.to(mesh.material.color, {
          r: ((cloudColor >> 16) & 255) / 255,
          g: ((cloudColor >> 8) & 255) / 255,
          b: (cloudColor & 255) / 255,
          duration: duration,
          overwrite: "auto"
        });

        gsap.to(mesh.material, {
          opacity: opacity,
          duration: duration,
          overwrite: "auto"
        });
      });
    });
  }

  dispose() {
    this.clouds.forEach(c => {
      c.group.children.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
    });
  }
}

// ==========================================================================
// 5. Passing Neon Light Trails (LightTrails)
// ==========================================================================
class LightTrails {
  constructor() {
    this.mesh = new THREE.Group();
    this.trails = [];
    this.visible = false;
    
    this.init();
  }

  init() {
    const trailColors = [0xff0055, 0xffb703, 0x00f5ff, 0xff007f, 0xffea00, 0x9b5de5];
    
    for (let i = 0; i < 6; i++) {
      const points = [];
      const segmentCount = 5;
      const radiusOffset = 2.5 + Math.random() * 3.5;
      const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      
      for (let j = 0; j < segmentCount; j++) {
        const progress = j / (segmentCount - 1);
        const z = -20 + progress * 40;
        const x = Math.cos(angle + progress * 2.0) * radiusOffset;
        const y = Math.sin(angle + progress * 2.0) * radiusOffset + (Math.random() - 0.5) * 0.8;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 32, 0.05 + Math.random() * 0.04, 8, false);
      
      const material = new THREE.MeshStandardMaterial({
        color: trailColors[i],
        emissive: trailColors[i],
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.0,
        roughness: 0.1,
        metalness: 0.9
      });
      
      const tube = new THREE.Mesh(geometry, material);
      
      this.mesh.add(tube);
      this.trails.push({
        mesh: tube,
        speed: 6.0 + Math.random() * 8.0,
        originalZ: tube.position.z,
        color: trailColors[i]
      });
    }
    
    this.mesh.position.z = 0;
  }

  setVisible(isVisible) {
    this.visible = isVisible;
    
    this.trails.forEach(trail => {
      gsap.to(trail.mesh.material, {
        opacity: isVisible ? 0.75 : 0.0,
        duration: 1.5,
        overwrite: "auto"
      });
    });
  }

  update(time, delta) {
    if (!this.visible) return;
    
    this.trails.forEach(trail => {
      trail.mesh.position.z += delta * trail.speed;
      if (trail.mesh.position.z > 22.0) {
        trail.mesh.position.z = -22.0;
      }
    });
  }

  dispose() {
    this.trails.forEach(trail => {
      trail.mesh.geometry.dispose();
      trail.mesh.material.dispose();
    });
  }
}

// ==========================================================================
// 6. Sunset Sky PBR Flight Integration (SunsetSky)
// ==========================================================================
class SunsetSky {
  constructor() {
    this.mesh = new THREE.Group();
    this.airplane = new THREE.Group();
    this.airplaneModel = null;
    this.visible = false;
    
    this.init();
  }

  init() {
    this.airplaneModel = new Airplane();
    this.airplane.add(this.airplaneModel.mesh);
    
    this.airplane.position.set(-6, -4, -12);
    this.airplane.rotation.set(-0.3, 0.6, -0.45);
    
    this.mesh.add(this.airplane);
    
    this.airplane.traverse(child => {
      if (child.isMesh && child.material) {
        if (!child.userData.originalOpacity) {
          child.userData.originalOpacity = child.material.opacity !== undefined ? child.material.opacity : 1.0;
        }
        child.material.transparent = true;
        child.material.opacity = 0.0;
      }
    });
  }

  setVisible(isVisible) {
    this.visible = isVisible;
    
    this.airplane.traverse(child => {
      if (child.isMesh && child.material) {
        const targetOpacity = isVisible ? (child.userData.originalOpacity || 1.0) : 0.0;
        
        gsap.to(child.material, {
          opacity: targetOpacity,
          duration: 2.0,
          overwrite: "auto"
        });
      }
    });
    
    if (isVisible) {
      this.airplane.position.set(-8, -5, -15);
    }
  }

  update(time, delta) {
    if (!this.visible) return;
    
    this.airplane.position.x += delta * 1.1;
    this.airplane.position.y += delta * 0.7;
    this.airplane.position.z -= delta * 0.8;
    
    this.airplane.rotation.z = -0.45 + Math.sin(time * 2.0) * 0.03;
    this.airplane.rotation.x = -0.3 + Math.cos(time * 1.5) * 0.02;
    
    if (this.airplaneModel) {
      this.airplaneModel.update(time, 0.45);
    }
  }

  dispose() {
    this.airplane.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

// ==========================================================================
// 7. WebGL Core Engine (Three.js Orchestrator)
// ==========================================================================
class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById('webgl-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.timer = null;
    
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    
    this.components = [];
    this.hasGyro = false;
    
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.015);
    
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 12);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 10);
    this.scene.add(directionalLight);
    
    this.redGlowLight = new THREE.PointLight(0xff0a54, 3, 30);
    this.redGlowLight.position.set(-5, 3, 2);
    this.scene.add(this.redGlowLight);
    
    this.goldGlowLight = new THREE.PointLight(0xffb703, 3, 30);
    this.goldGlowLight.position.set(5, -3, 2);
    this.scene.add(this.goldGlowLight);
    
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    
    // Check if Gyroscope sensor is available, if not fallback immediately
    this.setupGyroDetection();
    
    this.startTick();
  }

  setupGyroDetection() {
    // If not mobile device or orientation API is absent, fallback to mouse
    if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', this.onDeviceOrientation.bind(this));
    }
  }

  onDeviceOrientation(event) {
    if (!event.gamma || !event.beta) return;
    this.hasGyro = true;
    
    // Map roll/pitch beautifully to normalized coords
    const normalizedX = event.gamma / 45;
    const normalizedY = (event.beta - 65) / 45; // assume standard comfortable holding angle
    
    this.targetMouse.x = Math.max(-1, Math.min(1, normalizedX));
    this.targetMouse.y = -Math.max(-1, Math.min(1, normalizedY));
  }

  registerComponent(component) {
    this.components.push(component);
    if (component.mesh) {
      this.scene.add(component.mesh);
    }
  }

  updateMouse() {
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;
  }

  startTick() {
    let lastTime = 0;
    
    const tick = (time) => {
      const delta = (time - lastTime) * 0.001;
      lastTime = time;
      
      this.updateMouse();
      
      // Perform camera tilt & parallax
      // If we don't have gyro, mouse coordinates clientX fallback governs it perfectly
      const damping = 0.05; // 0.05 damping as requested in directive
      this.camera.position.x += (this.mouse.x * 1.5 - this.camera.position.x) * damping;
      this.camera.position.y += (this.mouse.y * 1.2 - this.camera.position.y) * damping;
      
      // Dynamic camera rotation tilt
      this.camera.rotation.z += (-this.mouse.x * 0.04 - this.camera.rotation.z) * damping;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      
      this.components.forEach(comp => {
        if (typeof comp.update === 'function') {
          comp.update(time * 0.001, delta, this.mouse);
        }
      });
      
      this.renderer.render(this.scene, this.camera);
    };
    
    this.renderer.setAnimationLoop(tick);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.components.forEach(comp => {
      if (typeof comp.onResize === 'function') {
        comp.onResize(width, height);
      }
    });
  }

  onMouseMove(event) {
    // Only use mouse if gyroscope input is inactive or absent
    if (!this.hasGyro) {
      this.targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
  }

  onTouchMove(event) {
    if (!this.hasGyro && event.touches.length > 0) {
      const touch = event.touches[0];
      this.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    
    this.components.forEach(comp => {
      if (typeof comp.dispose === 'function') {
        comp.dispose();
      }
    });
    
    this.scene.clear();
    this.renderer.dispose();
  }
}

// ==========================================================================
// 8. Main Application Controller & UI Binder (App)
// ==========================================================================
class App {
  constructor() {
    this.engine = null;
    this.particles = null;
    this.trails = null;
    this.sunset = null;
    this.clouds = null;
    this.audio = null;
    
    this.currentSectionIndex = -1;
    this.isMuted = true;
    this.bankAngle = 0.0;
    
    this.commsTimeline = null;
    this.stormShakeTimeline = null;
    this.lightningTimeout = null;
    this.heartbeatLoop = null;
    
    this.init();
  }

  async init() {
    // 1. Initialize WebGL Core Engine
    this.engine = new Engine('webgl-canvas');
    
    // 2. Initialize and Register Particles System (12,000 points)
    this.particles = new ParticleSystem(12000);
    this.engine.registerComponent(this.particles);
    
    // 3. Initialize and Register Light Trails (sparks)
    this.trails = new LightTrails();
    this.engine.registerComponent(this.trails);
    
    // 4. Initialize and Register Sunset airplane PBR model
    this.sunset = new SunsetSky();
    this.engine.registerComponent(this.sunset);
    
    // 5. Initialize and Register Volumetric Cloud System
    this.clouds = new CloudSystem();
    this.engine.registerComponent(this.clouds);
    
    // 6. Initialize Procedural Audio Synthesizer
    this.audio = new AudioSynth();
    
    // 7. Set Up ATC Radar & Keypad Authentication
    this.setupSquawkKeypad();
    
    // 8. Set Up Custom Cursor
    this.setupCursor();
    
    // 9. Set Up Interactive Widgets & Progress Navigation
    this.setupWidgets();
    this.setupNavigation();
    
    // 10. Bind Gyro Permission Button for mobile overrides
    this.setupGyroPermission();
  }

  setupGyroPermission() {
    const gyroBtn = document.getElementById('enable-gyro-btn');
    const gyroOverlay = document.getElementById('gyro-permission');
    
    // Auto show if mobile safari/android context
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      gyroOverlay.classList.remove('hidden');
    }
    
    if (gyroBtn && gyroOverlay) {
      gyroBtn.addEventListener('click', async () => {
        this.audio.playMechanicalClick();
        try {
          const permissionState = await DeviceOrientationEvent.requestPermission();
          if (permissionState === 'granted') {
            this.engine.setupGyroDetection();
          }
        } catch (error) {
          console.error("DeviceOrientation permission error:", error);
        }
        
        gsap.to(gyroOverlay, {
          opacity: 0,
          duration: 0.6,
          onComplete: () => {
            gyroOverlay.classList.add('hidden');
          }
        });
      });
    }
  }

  /* Phase 1: Squawk Keypad Entry & Engine Startup */
  setupSquawkKeypad() {
    const display = document.getElementById('squawk-code-display');
    const keys = document.querySelectorAll('.key-btn[data-val]');
    const clearBtn = document.getElementById('key-clear');
    const sendBtn = document.getElementById('key-send');
    const preloader = document.getElementById('preloader');
    const storyCards = document.getElementById('story-cards-container');
    const audioCtrl = document.getElementById('audio-controller');
    
    let squawkInput = "";
    
    keys.forEach(key => {
      key.addEventListener('click', () => {
        if (squawkInput.length >= 4) return;
        
        this.audio.playPing();
        squawkInput += key.getAttribute('data-val');
        display.innerText = squawkInput.padEnd(4, '_');
        
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      });
    });
    
    clearBtn.addEventListener('click', () => {
      this.audio.playMechanicalClick();
      squawkInput = "";
      display.innerText = "____";
    });
    
    sendBtn.addEventListener('click', () => {
      this.audio.playMechanicalClick();
      
      const keypad = document.querySelector('.dialer-keypad');
      
      if (squawkInput === "0521") {
        // CORRECT BIRTHDAY CODE (Kashvi's Birthday May 21st)
        this.triggerHapticHeartbeat();
        
        this.audio.start();
        this.audio.setEngineThrust(0.0);
        this.isMuted = false;
        if (audioCtrl) audioCtrl.classList.add('playing');
        
        gsap.to(preloader, {
          opacity: 0,
          duration: 1.5,
          ease: "power2.inOut",
          onComplete: () => {
            preloader.style.display = 'none';
            if (storyCards) storyCards.classList.remove('hidden');
            if (audioCtrl) audioCtrl.classList.remove('hidden');
            
            // Activate Flight Deck!
            this.updateActiveSection(0);
            this.setupThrottleDrag();
          }
        });
      } else {
        // DENIED SQUAWK
        gsap.to(keypad, {
          x: 10,
          duration: 0.08,
          repeat: 5,
          yoyo: true,
          onComplete: () => {
            gsap.set(keypad, { x: 0 });
          }
        });
        
        display.innerText = "DENY";
        display.style.color = "#ff4d6d";
        
        setTimeout(() => {
          squawkInput = "";
          display.innerText = "____";
          display.style.color = "";
        }, 1200);
      }
    });
    
    // ATC Live HUD Time (Zulu Clock)
    const liveTime = document.getElementById('live-time');
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toISOString().substr(11, 8);
      if (liveTime) liveTime.innerText = `UTC ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  /* Phase 2: Snapping Waypoint Drag-Throttle Lever */
  setupThrottleDrag() {
    const handle = document.getElementById('throttle-handle');
    if (!handle) return;
    const track = handle.parentElement;
    
    let isDragging = false;
    let startY = 0;
    let startBottom = 0;
    
    const onStart = (e) => {
      isDragging = true;
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      startBottom = parseFloat(handle.style.bottom) || 0;
      handle.style.cursor = 'grabbing';
      
      e.preventDefault();
    };
    
    const onMove = (e) => {
      if (!isDragging) return;
      
      const currentY = e.clientY || (e.touches && e.touches[0].clientY);
      const deltaY = startY - currentY; // Pull up increases thrust
      const trackHeight = track.clientHeight;
      const deltaPercent = (deltaY / trackHeight) * 100;
      
      let newBottom = Math.max(0, Math.min(100, startBottom + deltaPercent));
      handle.style.bottom = `${newBottom}%`;
      
      const thrust = newBottom / 100;
      
      // Modulate sound and cloud speeds
      this.audio.setEngineThrust(thrust);
      this.clouds.scrollSpeed = thrust;
      
      // Move artificial horizon pitch
      const pitchLadder = document.getElementById('hud-pitch-ladder');
      if (pitchLadder) {
        pitchLadder.style.transform = `translateY(${-thrust * 60 + 30}px) rotate(${this.bankAngle * 12}deg)`;
      }
      
      // Move compass heading tape
      const compassTape = document.getElementById('hud-compass-tape');
      if (compassTape) {
        compassTape.style.transform = `translateX(${-thrust * 120}px)`;
      }
      
      // Update HUD airspeed
      const speedVal = document.getElementById('hud-speed-val');
      const speed = Math.floor(100 + thrust * 380);
      if (speedVal) speedVal.innerText = `${speed} KTS`;
      
      // Update HUD altitude
      const altVal = document.getElementById('hud-alt-val');
      const altitude = Math.floor(1000 + thrust * 23000);
      if (altVal) altVal.innerText = `${altitude} FT`;
      
      // Update instrument parameters
      const gForceEl = document.getElementById('hud-gforce');
      const windEl = document.getElementById('hud-wind');
      const headingEl = document.getElementById('hud-heading');
      
      if (gForceEl) gForceEl.innerText = `${(1.0 + thrust * 0.4 + Math.sin(performance.now() * 0.005) * 0.03).toFixed(2)} G`;
      if (windEl) windEl.innerText = `${Math.floor(thrust * 25)} KT`;
      if (headingEl) headingEl.innerText = `${Math.floor(360 - thrust * 90) % 360}°`;
      
      // Snap waypoint on track intervals
      const waypoint = Math.max(0, Math.min(5, Math.floor(thrust * 5.99)));
      this.updateActiveSection(waypoint);
    };
    
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = 'grab';
      
      const snappedPercent = (this.currentSectionIndex / 5) * 100;
      gsap.to(handle, {
        bottom: `${snappedPercent}%`,
        duration: 0.4,
        ease: "power2.out",
        onUpdate: () => {
          const currentBottom = parseFloat(handle.style.bottom);
          const thrust = currentBottom / 100;
          this.audio.setEngineThrust(thrust);
          this.clouds.scrollSpeed = thrust;
        }
      });
    };
    
    handle.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    
    handle.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  /* Phase 3: Slide Narrative & Waypoint Transitions */
  updateActiveSection(index) {
    if (this.currentSectionIndex === index) return;
    
    this.currentSectionIndex = index;
    
    // Toggle active class on story slides
    const slides = document.querySelectorAll('.story-slide');
    slides.forEach((slide, idx) => {
      if (idx === index) {
        slide.classList.add('active');
        gsap.to(slide, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.6 });
      } else {
        slide.classList.remove('active');
        gsap.to(slide, { opacity: 0, y: 15, pointerEvents: 'none', duration: 0.6 });
      }
    });
    
    // Toggle marker labels
    const markers = document.querySelectorAll('.throttle-markers .marker');
    markers.forEach((marker, idx) => {
      if (idx === index) {
        marker.classList.add('active');
      } else {
        marker.classList.remove('active');
      }
    });
    
    // Particle morphing triggers
    let shapeIndex = index;
    if (index === 4) shapeIndex = 5; // Rain stardust shape
    
    this.particles.morphTo(shapeIndex, 2.0);
    this.clouds.transitionSkyState(index, 2.0);
    
    this.updateWidgetsForWaypoint(index);
    this.transitionCameraAngle(index);
  }

  transitionCameraAngle(index) {
    let targetZ = 12.0;
    let targetY = 0.0;
    
    switch (index) {
      case 0: // Waves Takeoff
        targetZ = 12.0;
        targetY = -0.5;
        break;
      case 1: // Heart cruise
        targetZ = 8.5;
        targetY = 0.5;
        break;
      case 2: // Drive lesson steering
        targetZ = 13.0;
        targetY = 0.0;
        break;
      case 3: // Polaroids warp
        targetZ = 9.5;
        targetY = 0.0;
        break;
      case 4: // Storm turbulence
        targetZ = 11.5;
        targetY = 0.8;
        break;
      case 5: // Horizon sunset PBR plane
        targetZ = 15.0;
        targetY = -1.0;
        break;
    }
    
    gsap.to(this.engine.camera.position, {
      z: targetZ,
      y: targetY,
      duration: 2.2,
      ease: "power2.inOut"
    });
  }

  updateWidgetsForWaypoint(index) {
    const steeringWidget = document.getElementById('steering-widget');
    const polaroidOverlay = document.getElementById('polaroid-overlay');
    const turbulenceGlass = document.getElementById('turbulence-glass');
    const hudOverlay = document.getElementById('hud-overlay');
    
    if (steeringWidget) steeringWidget.classList.add('hidden');
    if (polaroidOverlay) polaroidOverlay.classList.add('hidden');
    if (turbulenceGlass) turbulenceGlass.classList.add('hidden');
    
    // Ensure HUD is visible once out of preload
    if (hudOverlay) hudOverlay.classList.remove('hidden');
    
    this.trails.setVisible(index === 3);
    this.sunset.setVisible(index === 5);
    
    if (index !== 4) {
      if (this.lightningTimeout) clearTimeout(this.lightningTimeout);
      const horizon = document.querySelector('.hud-horizon');
      if (this.stormShakeTimeline) this.stormShakeTimeline.kill();
      if (horizon) gsap.set(horizon, { x: 0, y: 0, rotation: 0 });
      this.audio.stopStorm();
    }
    
    let commsMsg = "";
    
    switch (index) {
      case 0:
        commsMsg = "SQUAWK NOMINAL. INITIAL DEPARTURE STABLE. ENGINE INTAKES RUNNING IN CLEAN ATMOSPHERE.";
        break;
      case 1:
        commsMsg = "WP1: CRUISE HEIGHT. DETECTING INTENSE ROMANTIC GRAVITY NEAR FLIGHT COORDINATES.";
        break;
      case 2:
        if (steeringWidget) steeringWidget.classList.remove('hidden');
        commsMsg = "WP2: STEERING TORQUE DESYNC DETECTED. HOLD THE YOKE CONTROL BUTTON TO LOCK SYNC.";
        break;
      case 3:
        if (polaroidOverlay) polaroidOverlay.classList.remove('hidden');
        commsMsg = "WP3: MEMORY BANKS ACCESSED. WAVE SENSORS ACTIVE. TRY TAP TO INJECT HUG METADATA.";
        break;
      case 4:
        if (turbulenceGlass) turbulenceGlass.classList.remove('hidden');
        commsMsg = "WP4: ALERT! HEAVY TURBULENCE SYSTEMS IMMINENT. PLACE POINTER ON STABILIZER NOW!";
        this.triggerStormEvents();
        break;
      case 5:
        commsMsg = "WP5: CELESTIAL HORIZON CLEARED. AWAITING BIRTHDAY CLIMAX INITIATION SEQUENCE.";
        break;
    }
    
    this.typeComms(commsMsg);
  }

  typeComms(text) {
    const el = document.getElementById('comms-text');
    if (!el) return;
    
    if (this.commsTimeline) this.commsTimeline.kill();
    
    el.innerText = "";
    
    this.commsTimeline = gsap.to({}, {
      duration: text.length * 0.02,
      ease: "none",
      onUpdate: () => {
        const progress = Math.floor(this.commsTimeline.progress() * text.length);
        el.innerText = text.substr(0, progress);
      }
    });
  }

  /* Waypoint 4: Storm Turbulence Wobble Engine & Lightning Loop */
  triggerStormEvents() {
    this.audio.startStorm();
    
    const horizon = document.querySelector('.hud-horizon');
    if (!horizon) return;
    
    gsap.killTweensOf(horizon);
    this.stormShakeTimeline = gsap.to(horizon, {
      x: () => (Math.random() - 0.5) * 14,
      y: () => (Math.random() - 0.5) * 14,
      rotation: () => (Math.random() - 0.5) * 3,
      duration: 0.05,
      repeat: -1,
      yoyo: true,
      ease: "none"
    });
    
    const flashScreen = () => {
      if (this.currentSectionIndex !== 4) return;
      
      this.audio.playLightning();
      
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100vw';
      flash.style.height = '100vh';
      flash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      flash.style.zIndex = '9999';
      flash.style.pointerEvents = 'none';
      document.body.appendChild(flash);
      
      gsap.to(flash, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => flash.remove()
      });
      
      if ('vibrate' in navigator) {
        navigator.vibrate([60, 30, 60]);
      }
      
      this.lightningTimeout = setTimeout(flashScreen, 3500 + Math.random() * 4000);
    };
    
    this.lightningTimeout = setTimeout(flashScreen, 2000);
  }

  /* Phase 4: Waypoints Widget Click Event Setup */
  setupWidgets() {
    // 1. Waypoint 2: Steering Telemetry Lock
    const steerBtn = document.getElementById('steering-wheel-btn');
    let steerInterval = null;
    
    const startSteering = () => {
      this.bankAngle = 0.5;
      this.clouds.bankAngle = 0.5;
      
      this.audio.playPing();
      
      steerInterval = setInterval(() => {
        if ('vibrate' in navigator) navigator.vibrate(30);
      }, 300);
      
      this.typeComms("YOKE STABILIZED. WIND BANK MATCHED. SECURE cruise vectors locked.");
    };
    
    const stopSteering = () => {
      this.bankAngle = 0.0;
      this.clouds.bankAngle = 0.0;
      if (steerInterval) clearInterval(steerInterval);
    };
    
    if (steerBtn) {
      steerBtn.addEventListener('mousedown', startSteering);
      steerBtn.addEventListener('mouseup', stopSteering);
      steerBtn.addEventListener('mouseleave', stopSteering);
      
      steerBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startSteering(); });
      steerBtn.addEventListener('touchend', stopSteering);
    }
    
    // 2. Waypoint 3: Polaroid Clicks & Parallax
    const polaroidHug = document.getElementById('polaroid-hug');
    if (polaroidHug) {
      polaroidHug.addEventListener('click', (e) => {
        this.triggerHapticHeartbeat();
        this.audio.playPing();
        
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100vw';
        flash.style.height = '100vh';
        flash.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
        flash.style.zIndex = '9999';
        flash.style.pointerEvents = 'none';
        document.body.appendChild(flash);
        
        gsap.to(flash, {
          opacity: 0,
          duration: 0.8,
          onComplete: () => flash.remove()
        });
        
        this.typeComms("FIRST HUG SNAPSHOT DEPLOYED. HEARTBEAT VECTORS PEAKING. DUAL TRANSMISSION ACTIVE.");
        this.spawnToast("Holding on... ♥", polaroidHug);
      });
      
      const cards = document.querySelectorAll('.polaroid-card');
      cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          gsap.to(card, {
            rotateY: x * 0.12,
            rotateX: -y * 0.12,
            scale: 1.06,
            duration: 0.3
          });
        });
        
        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            scale: 1.0,
            duration: 0.4
          });
        });
      });
    }
    
    // 3. Waypoint 4: Storm Handprint Stabilizer
    const handprint = document.getElementById('handprint-stabilizer');
    let stabilizeTimer = null;
    
    const startStabilizing = () => {
      this.audio.playPing();
      
      const horizon = document.querySelector('.hud-horizon');
      if (this.stormShakeTimeline) {
        gsap.to(this.stormShakeTimeline, { timeScale: 0.15, duration: 0.5 });
      }
      
      this.spawnToast("Stabilizing cockpit...", handprint);
      
      stabilizeTimer = setTimeout(() => {
        if (this.stormShakeTimeline) this.stormShakeTimeline.kill();
        if (this.lightningTimeout) clearTimeout(this.lightningTimeout);
        this.audio.stopStorm();
        
        if (horizon) gsap.to(horizon, { x: 0, y: 0, rotation: 0, duration: 0.4 });
        
        const turbulenceGlass = document.getElementById('turbulence-glass');
        if (turbulenceGlass) turbulenceGlass.classList.add('hidden');
        
        this.triggerHapticHeartbeat();
        this.typeComms("CO-PILOT BYPASS APOLOGY ENCRYPTION DECRYPTED. SECURE WING PATH LOCKED EN ROUTE.");
      }, 2000);
    };
    
    const stopStabilizing = () => {
      if (stabilizeTimer) clearTimeout(stabilizeTimer);
      if (this.currentSectionIndex === 4 && this.stormShakeTimeline) {
        gsap.to(this.stormShakeTimeline, { timeScale: 1.0, duration: 0.3 });
      }
    };
    
    if (handprint) {
      handprint.addEventListener('mousedown', startStabilizing);
      handprint.addEventListener('mouseup', stopStabilizing);
      handprint.addEventListener('mouseleave', stopStabilizing);
      
      handprint.addEventListener('touchstart', (e) => { e.preventDefault(); startStabilizing(); });
      handprint.addEventListener('touchend', stopStabilizing);
    }
    
    // 4. Waypoint 5: Climax Constellation Activation
    const finalHeart = document.getElementById('final-heart');
    if (finalHeart) {
      finalHeart.addEventListener('click', (e) => {
        this.triggerHapticHeartbeat();
        this.audio.playPing();
        
        this.particles.morphTo(7, 2.5);
        
        if (this.heartbeatLoop) clearInterval(this.heartbeatLoop);
        this.heartbeatLoop = setInterval(() => {
          if (this.currentSectionIndex === 5) {
            this.triggerHapticHeartbeat();
          } else {
            clearInterval(this.heartbeatLoop);
          }
        }, 1200);
        
        this.typeComms("CONSTELLATION 'KASHVI' HAS COMPLETED MATRICULATING. HAPPY BIRTHDAY, KASHVI. ♥");
        this.spawnToast("I Love You! ♥", finalHeart);
        
        gsap.to(this.particles.material, {
          size: 0.55,
          duration: 0.15,
          yoyo: true,
          repeat: 1
        });
        
        this.spawnExpandingRipple(e.clientX || (e.touches && e.touches[0].clientX), e.clientY || (e.touches && e.touches[0].clientY));
      });
    }
  }

  /* Phase 5: Steps Dot Navigation Click Snapping */
  setupNavigation() {
    const dots = document.querySelectorAll('.progress-steps .step');
    
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const secIndex = parseInt(dot.getAttribute('data-section'));
        const handle = document.getElementById('throttle-handle');
        if (!handle) return;
        const snappedPercent = (secIndex / 5) * 100;
        
        gsap.to(handle, {
          bottom: `${snappedPercent}%`,
          duration: 0.8,
          ease: "power2.out",
          onUpdate: () => {
            const currentBottom = parseFloat(handle.style.bottom);
            const thrust = currentBottom / 100;
            this.audio.setEngineThrust(thrust);
            this.clouds.scrollSpeed = thrust;
          },
          onComplete: () => {
            this.updateActiveSection(secIndex);
          }
        });
      });
    });

    const audioBtn = document.getElementById('audio-toggle');
    const audioCtrl = document.getElementById('audio-controller');
    
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
          this.audio.stop();
          audioCtrl.classList.remove('playing');
        } else {
          this.audio.start();
          audioCtrl.classList.add('playing');
        }
      });
    }
  }

  /* Premium Magnetic Custom Cursor logic */
  setupCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    
    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let ringX = 0, ringY = 0;
    
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const updateCursorPositions = () => {
      dotX += (mouseX - dotX) * 0.25;
      dotY += (mouseY - dotY) * 0.25;
      
      ringX += (mouseX - ringX) * 0.09;
      ringY += (mouseY - ringY) * 0.09;
      
      if (dot) dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      
      requestAnimationFrame(updateCursorPositions);
    };
    requestAnimationFrame(updateCursorPositions);

    const selectInteractive = () => {
      const elements = document.querySelectorAll('button, .step, .polaroid-card, #handprint-stabilizer, #steering-wheel-btn');
      elements.forEach(elem => {
        elem.addEventListener('mouseenter', () => {
          document.body.classList.add('hovering');
        });
        elem.addEventListener('mouseleave', () => {
          document.body.classList.remove('hovering');
        });
      });
    };
    selectInteractive();
  }

  triggerHapticHeartbeat() {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    if (this.audio) {
      this.audio.triggerHeartbeatSound();
    }
  }

  spawnExpandingRipple(x, y) {
    const container = document.getElementById('ripple-container');
    if (!container) return;
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x || window.innerWidth / 2}px`;
    ripple.style.top = `${y || window.innerHeight / 2}px`;
    
    container.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 1000);
  }

  spawnToast(text, parentElement) {
    if (!parentElement) return;
    const toast = document.createElement('span');
    toast.innerText = text;
    toast.style.position = 'absolute';
    toast.style.color = '#ff4d6d';
    toast.style.fontSize = '0.85rem';
    toast.style.fontFamily = 'var(--font-mono)';
    toast.style.fontWeight = '600';
    toast.style.textShadow = '0 0 10px rgba(255, 77, 109, 0.6)';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    toast.style.transition = 'transform 1.8s ease-out, opacity 1.8s ease-out';
    toast.style.pointerEvents = 'none';
    toast.style.zIndex = '999';
    
    parentElement.appendChild(toast);
    
    setTimeout(() => {
      toast.style.transform = 'translateY(-40px)';
      toast.style.opacity = '0';
    }, 50);
    
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }
}

// Instantiate and launch App on window load
window.addEventListener('DOMContentLoaded', () => {
  window.AppInstance = new App();
});
