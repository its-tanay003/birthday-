/* ==========================================================================
   WebGL Night Drive Passing Neon Light Trails (Section 4)
   ========================================================================== */

import * as THREE from 'three';
import gsap from 'gsap';

export class LightTrails {
  constructor() {
    this.mesh = new THREE.Group();
    this.trails = [];
    this.visible = false;
    
    this.init();
  }

  init() {
    // Generate 6 neon light trails at different offsets
    const trailColors = [0xff0055, 0xffb703, 0x00f5ff, 0xff007f, 0xffea00, 0x9b5de5];
    
    for (let i = 0; i < 6; i++) {
      // 1. Create a sweeping CatmullRom spline curve along Z-axis
      const points = [];
      const segmentCount = 5;
      const radiusOffset = 2.5 + Math.random() * 3.5;
      const angle = (i / 6) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      
      for (let j = 0; j < segmentCount; j++) {
        const progress = j / (segmentCount - 1);
        const z = -20 + progress * 40;
        
        // Add waving spiral offsets to curves
        const x = Math.cos(angle + progress * 2.0) * radiusOffset;
        const y = Math.sin(angle + progress * 2.0) * radiusOffset + (Math.random() - 0.5) * 0.8;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      
      // 2. Extrude curve into 3D tube geometry
      const geometry = new THREE.TubeGeometry(curve, 32, 0.05 + Math.random() * 0.04, 8, false);
      
      // 3. Apply heavy neon glow physical material (PBR)
      const material = new THREE.MeshStandardMaterial({
        color: trailColors[i],
        emissive: trailColors[i],
        emissiveIntensity: 3.5, /* High luminosity for post-bloom look */
        transparent: true,
        opacity: 0.0, // Start invisible, fade-in controlled by ScrollTrigger
        roughness: 0.1,
        metalness: 0.9
      });
      
      const tube = new THREE.Mesh(geometry, material);
      
      // Cache original positions and speed multipliers
      this.mesh.add(tube);
      this.trails.push({
        mesh: tube,
        speed: 6.0 + Math.random() * 8.0,
        originalZ: tube.position.z,
        color: trailColors[i]
      });
    }
    
    // Hide mesh initially
    this.mesh.position.z = 0;
  }

  // Fade-in or fade-out trails depending on section activity
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

  // Animate trails sweeping past camera
  update(time, delta) {
    if (!this.visible) return;
    
    this.trails.forEach(trail => {
      // Flow trails backwards along Z
      trail.mesh.position.z += delta * trail.speed;
      
      // Reset position when passed behind camera
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
