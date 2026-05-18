/* ==========================================================================
   WebGL Sunset Ascent Airplane PBR Integration (Section 7)
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';
import Airplane from './Airplane.js';

export class SunsetSky {
  constructor() {
    this.mesh = new THREE.Group();
    this.airplane = new THREE.Group();
    this.airplaneModel = null;
    this.visible = false;
    
    this.init();
  }

  init() {
    // 1. Build and add the detailed metallic PBR airplane model
    this.airplaneModel = new Airplane();
    this.airplane.add(this.airplaneModel.mesh);
    
    // 2. Position the Airplane Group initially for standard climbing vector
    this.airplane.position.set(-6, -4, -12); // Start down left, pushed back in depth
    this.airplane.rotation.set(-0.3, 0.6, -0.45); // Tilted up-right climbing angle
    
    this.mesh.add(this.airplane);
    
    // Ensure all materials are initially transparent and invisible
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

  // Fade-in or fade-out airplane based on scroll visibility
  setVisible(isVisible) {
    this.visible = isVisible;
    
    // Grab all materials in group and transition their opacities
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
    
    // If active, reset starting flight coordinates to trigger the animation fresh
    if (isVisible) {
      this.airplane.position.set(-8, -5, -15);
    }
  }

  // Animate the airplane climbing slowly diagonally
  update(time, delta) {
    if (!this.visible) return;
    
    // Slowly climb up, right, and fly away into space depth
    this.airplane.position.x += delta * 1.1; // fly right
    this.airplane.position.y += delta * 0.7; // climb up
    this.airplane.position.z -= delta * 0.8; // move further away
    
    // Add micro-wobbles from air turbulence
    this.airplane.rotation.z = -0.45 + Math.sin(time * 2.0) * 0.03;
    this.airplane.rotation.x = -0.3 + Math.cos(time * 1.5) * 0.02;
    
    // Update internal components (turbines, FAA lights, thruster plumes)
    if (this.airplaneModel) {
      this.airplaneModel.update(time, 0.45); // Spin blades and pulse strobes
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
