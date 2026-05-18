/* ==========================================================================
   Five Years of Us — Main Application Bootstrap & Orchestrator
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';

// WebGL sub-components
import { Engine } from './webgl/Engine.js';
import { ParticleSystem } from './webgl/ParticleSystem.js';
import { LightTrails } from './webgl/LightTrails.js';
import { SunsetSky } from './webgl/SunsetSky.js';
import CloudSystem from './webgl/CloudSystem.js';

// Procedural Audio Engine
import { AudioSynth } from './webgl/AudioSynth.js';

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
    
    // 9. Set Up Interactive Widgets & Dot Navigation
    this.setupWidgets();
    this.setupNavigation();
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
    const progressNav = document.getElementById('story-progress');
    
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
        // CORRECT BIRTHDAY CODE (May 21st)
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
            if (progressNav) progressNav.classList.remove('hidden');
            
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
    
    // ATC Live HUD Time
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
      
      // 1. Modulate sound and cloud speeds
      this.audio.setEngineThrust(thrust);
      this.clouds.scrollSpeed = thrust;
      
      // 2. Move artificial horizon pitch
      const pitchLadder = document.getElementById('hud-pitch-ladder');
      if (pitchLadder) {
        pitchLadder.style.transform = `translateY(${-thrust * 60 + 30}px) rotate(${this.bankAngle * 12}deg)`;
      }
      
      // 3. Move compass heading tape
      const compassTape = document.getElementById('hud-compass-tape');
      if (compassTape) {
        compassTape.style.transform = `translateX(${-thrust * 120}px)`;
      }
      
      // 4. Update airspeed tape reading
      const speedVal = document.getElementById('hud-speed-val');
      const speed = Math.floor(100 + thrust * 380);
      if (speedVal) speedVal.innerText = `${speed} KTS`;
      
      // 5. Update altitude tape reading
      const altVal = document.getElementById('hud-alt-val');
      const altitude = Math.floor(1000 + thrust * 23000);
      if (altVal) altVal.innerText = `${altitude} FT`;
      
      // 6. Update general instrument readings
      const gForceEl = document.getElementById('hud-gforce');
      const windEl = document.getElementById('hud-wind');
      const headingEl = document.getElementById('hud-heading');
      
      if (gForceEl) gForceEl.innerText = `${(1.0 + thrust * 0.4 + Math.sin(performance.now() * 0.005) * 0.03).toFixed(2)} G`;
      if (windEl) windEl.innerText = `${Math.floor(thrust * 25)} KT`;
      if (headingEl) headingEl.innerText = `${Math.floor(360 - thrust * 90) % 360}°`;
      
      // 7. Snap current slide based on relative progress intervals
      const waypoint = Math.max(0, Math.min(5, Math.floor(thrust * 5.99)));
      this.updateActiveSection(waypoint);
    };
    
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = 'grab';
      
      // Snap nicely to the marker coordinate of the active waypoint
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
    
    // 1. Toggle active class on narrative slides
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
    
    // 2. Toggle active marker labels
    const markers = document.querySelectorAll('.throttle-markers .marker');
    markers.forEach((marker, idx) => {
      if (idx === index) {
        marker.classList.add('active');
      } else {
        marker.classList.remove('active');
      }
    });
    
    // 3. Update progress dot active states
    const dots = document.querySelectorAll('.progress-steps .step');
    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
    
    // 4. Particle morph transitions
    let shapeIndex = index;
    if (index === 4) shapeIndex = 5; // Rain stardust shape mapping
    
    this.particles.morphTo(shapeIndex, 2.0);
    this.clouds.transitionSkyState(index, 2.0);
    
    // 5. Update Waypoint specific widget overlay blocks
    this.updateWidgetsForWaypoint(index);
    
    // 6. Slowly transition Three.js camera angles
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
    
    if (steeringWidget) steeringWidget.classList.add('hidden');
    if (polaroidOverlay) polaroidOverlay.classList.add('hidden');
    if (turbulenceGlass) turbulenceGlass.classList.add('hidden');
    
    this.trails.setVisible(index === 3);
    this.sunset.setVisible(index === 5);
    
    // Kill existing lightning loop if we leave the storm waypoint
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

  /* Typewriter Co-pilot Secure Comms Console */
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
      if (this.clouds) this.clouds.bankAngle = 0.5;
      
      this.audio.playPing();
      
      steerInterval = setInterval(() => {
        if ('vibrate' in navigator) navigator.vibrate(30);
      }, 300);
      
      this.typeComms("YOKE STABILIZED. WIND BANK MATCHED. SECURE cruise vectors locked.");
    };
    
    const stopSteering = () => {
      this.bankAngle = 0.0;
      if (this.clouds) this.clouds.bankAngle = 0.0;
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
        
        this.spawnExpandingRipple(e.clientX || e.touches && e.touches[0].clientX, e.clientY || e.touches && e.touches[0].clientY);
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
          if (audioCtrl) audioCtrl.classList.remove('playing');
        } else {
          this.audio.start();
          if (audioCtrl) audioCtrl.classList.add('playing');
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
