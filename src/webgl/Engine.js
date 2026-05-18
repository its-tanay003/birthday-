/* ==========================================================================
   WebGL Core Engine (Three.js Orchestrator)
   ========================================================================== */

import * as THREE from 'three';

export class Engine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.container = document.getElementById('webgl-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.timer = null;
    
    // Normalized Mouse Coordinates (-1 to 1) for WebGL Parallax and Swarms
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    
    // Registered sub-scene components (ParticleSystem, Polaroid3D, etc.)
    this.components = [];
    
    this.init();
  }

  init() {
    // 1. Create Scene
    this.scene = new THREE.Scene();
    
    // Add linear fog to create elegant deep cosmic perspective
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.015);
    
    // 2. Set Up Perspective Camera (Field of View: 60)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 12);
    
    // 3. Initialize WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,      /* Let CSS linear gradients show through background */
      powerPreference: "high-performance"
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); /* Limit to 2 for performance */
    
    // Premium Color Correction Settings (r152+)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // 4. Set Up Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 8, 10);
    this.scene.add(directionalLight);
    
    // Soft glowing colored lights to illuminate floating elements
    this.redGlowLight = new THREE.PointLight(0xff0a54, 3, 30);
    this.redGlowLight.position.set(-5, 3, 2);
    this.scene.add(this.redGlowLight);
    
    this.goldGlowLight = new THREE.PointLight(0xffb703, 3, 30);
    this.goldGlowLight.position.set(5, -3, 2);
    this.scene.add(this.goldGlowLight);
    
    // 5. Add System Resize & Mouse Listeners
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    
    // 6. Start Render Tick
    this.startTick();
  }

  // Register and inject WebGL scene sub-systems
  registerComponent(component) {
    this.components.push(component);
    if (component.mesh) {
      this.scene.add(component.mesh);
    }
  }

  // Smooth lerping of mouse target values for cinematic sub-pixel lag
  updateMouse() {
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.08;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.08;
  }

  startTick() {
    let lastTime = 0;
    
    const tick = (time) => {
      // Calculate elapsed delta time in seconds
      const delta = (time - lastTime) * 0.001;
      lastTime = time;
      
      // 1. Smooth mouse coordinate interpolation
      this.updateMouse();
      
      // 2. Perform slow camera parallax shift based on mouse hover coordinates
      this.camera.position.x += (this.mouse.x * 1.5 - this.camera.position.x) * 0.04;
      this.camera.position.y += (this.mouse.y * 1.2 - this.camera.position.y) * 0.04;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      
      // 3. Tick and update registered components
      this.components.forEach(comp => {
        if (typeof comp.update === 'function') {
          comp.update(time * 0.001, delta, this.mouse);
        }
      });
      
      // 4. Render frame
      this.renderer.render(this.scene, this.camera);
    };
    
    // Modern r183+ high-compatibility animation loop handler
    this.renderer.setAnimationLoop(tick);
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Propagate resize events to subcomponents
    this.components.forEach(comp => {
      if (typeof comp.onResize === 'function') {
        comp.onResize(width, height);
      }
    });
  }

  onMouseMove(event) {
    this.targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onTouchMove(event) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    }
  }

  // Clean up WebGL resources
  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    
    this.components.forEach(comp => {
      if (typeof comp.dispose === 'function') {
        comp.dispose();
      }
    });
    
    this.scene.clear();
    this.renderer.dispose();
  }
}
