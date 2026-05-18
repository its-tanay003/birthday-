/* ==========================================================================
   Procedural Cinematic Ambient Soundtrack Engine (Web Audio API)
   ========================================================================== */

export class AudioSynth {
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
    this.engineHumGain = null;
    
    // Storm Synthesis Nodes
    this.stormNoiseNode = null;
    this.stormGain = null;
    this.stormFilter = null;
    
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
    
    // Standard AudioContext fallback
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
    
    // Resume context if suspended by browser security
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
  }

  /* Layer 1: Ambient Pad Drone */
  startAmbientPads() {
    this.stopAllOscillators();
    
    const now = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIndex];
    
    // Generate soft, overlapping warm waves for each chord frequency
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Warm, smooth triangle wave
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
    
    // Pure crystal sine wave
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
    // Clean mechanical ping frequency
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
    
    // Trigger double low impact
    this.playSingleHeartPulse(80, now, 0.45);
    this.playSingleHeartPulse(110, now + 0.05, 0.3);
  }

  /* Procedural Cockpit Engine Hum */
  initEngineHum() {
    if (!this.ctx) return;
    
    // Create twin oscillators for thick detuned stereo hum
    this.engineHumOsc = this.ctx.createOscillator();
    this.engineHumOsc2 = this.ctx.createOscillator();
    this.engineHumGain = this.ctx.createGain();
    
    this.engineHumOsc.type = 'sawtooth';
    this.engineHumOsc.frequency.setValueAtTime(65, this.ctx.currentTime); // 65Hz fundamental
    this.engineHumOsc.detune.setValueAtTime(-6, this.ctx.currentTime);
    
    this.engineHumOsc2.type = 'triangle';
    this.engineHumOsc2.frequency.setValueAtTime(130, this.ctx.currentTime); // First octave overtone
    this.engineHumOsc2.detune.setValueAtTime(6, this.ctx.currentTime);
    
    // Soft volume hum
    this.engineHumGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    
    // Lowpass filter to keep it deep and non-fatiguing
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
    
    // Generate white noise programmatically
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
    
    // Modulate howling frequencies dynamically
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
