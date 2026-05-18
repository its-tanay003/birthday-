import * as THREE from 'three';

export default class CloudSystem {
  constructor() {
    this.mesh = new THREE.Group();
    this.clouds = [];
    this.cloudCount = 18;
    
    this.createClouds();
  }

  createClouds() {
    // Soft, highly diffuse cloud material
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
      flatShading: false,
      depthWrite: false, // Prevents transparent sorting artifacts
      blending: THREE.NormalBlending
    });

    for (let i = 0; i < this.cloudCount; i++) {
      const cloudGroup = new THREE.Group();
      
      // Build a fluffy cluster by overlapping multiple spheres of different sizes
      const sphereCount = 5 + Math.floor(Math.random() * 5);
      const clusterWidth = 3 + Math.random() * 4;

      for (let j = 0; j < sphereCount; j++) {
        const radius = 1.0 + Math.random() * 1.8;
        const sphereGeom = new THREE.SphereGeometry(radius, 12, 12);
        const sphereMesh = new THREE.Mesh(sphereGeom, cloudMaterial);

        // Scatter spheres around the cluster center
        sphereMesh.position.set(
          (Math.random() - 0.5) * clusterWidth,
          (Math.random() - 0.5) * (clusterWidth * 0.4),
          (Math.random() - 0.5) * (clusterWidth * 0.6)
        );

        // Squeeze them slightly to look flatter/wider like real stratocumulus clouds
        sphereMesh.scale.set(1.4, 0.7, 1.0);
        sphereMesh.castShadow = false;
        sphereMesh.receiveShadow = true;
        cloudGroup.add(sphereMesh);
      }

      // Scatter the cloud banks in a 3D grid around the camera path
      const cX = (Math.random() - 0.5) * 45; // Wide spread
      const cY = -4.0 + (Math.random() - 0.5) * 12; // Vertical band
      const cZ = -10.0 - (Math.random() * 55); // Scatter forward in depth
      
      cloudGroup.position.set(cX, cY, cZ);
      
      // Assign individual floating drift speed metrics
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

  /**
   * Updates clouds based on scroll velocity and mouse hover parameters.
   * @param {number} time Elapsed time in seconds.
   * @param {number} delta Elapsed time since last frame in seconds.
   * @param {object} mouse Interactivity coordinates.
   */
  update(time, delta, mouse = { x: 0, y: 0 }) {
    // Translate clouds backwards on Z to simulate flight speed
    const baseSpeed = 5.0 + (this.scrollSpeed || 0) * 28.0;
    
    this.clouds.forEach(c => {
      // Forward translation along Z
      c.group.position.z += baseSpeed * delta * c.zSpeedFactor;

      // Recycle cloud to the far front when it passes behind the camera (Z > 12)
      if (c.group.position.z > 12.0) {
        c.group.position.z = -65.0 - (Math.random() * 10);
        c.group.position.x = (Math.random() - 0.5) * 45;
        c.group.position.y = -4.0 + (Math.random() - 0.5) * 12;
        c.baseX = c.group.position.x;
        c.baseY = c.group.position.y;
      }

      // Subtle atmospheric float drift (up/down wave)
      c.group.position.y = c.baseY + Math.sin(time * 0.5 + c.baseX) * 0.35;

      // Parallax shift linked to mouse movement & airplane bank angles
      const targetParallaxX = c.baseX - (mouse.x * 4.5) - ((this.bankAngle || 0) * 6.0);
      const targetParallaxY = c.group.position.y - (mouse.y * 1.5);
      
      // Interpolate smoothly
      c.group.position.x += (targetParallaxX - c.group.position.x) * 0.04;
      c.group.position.y += (targetParallaxY - c.group.position.y) * 0.04;
    });
  }

  /**
   * Fade cloud opacity based on active narrative sections.
   * e.g., turn darker/stormy during Chapter IV (turbulence)
   * @param {number} sectionIdx Active section number.
   * @param {object} gsap GSAP animation framework instance.
   */
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
        opacity = 0.15; // Fade almost out to expose stars
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
