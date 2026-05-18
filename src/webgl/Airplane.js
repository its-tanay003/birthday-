import * as THREE from 'three';

export default class Airplane {
  constructor() {
    this.mesh = new THREE.Group();
    
    // Scale down slightly to fit beautifully inside the viewport
    this.mesh.scale.set(0.4, 0.4, 0.4);
    
    this.createModel();
  }

  createModel() {
    // Premium materials with standard metallic reflection properties
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

    // 1. FUSELAGE (Main Body)
    const fuselageGeom = new THREE.CylinderGeometry(1.4, 0.8, 14, 24);
    fuselageGeom.rotateX(Math.PI / 2); // Orient along Z-axis
    const fuselage = new THREE.Mesh(fuselageGeom, aluminumMat);
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    this.mesh.add(fuselage);

    // 2. NOSE CONE (Pointy Front)
    const noseGeom = new THREE.ConeGeometry(1.4, 3.5, 24);
    noseGeom.rotateX(Math.PI / 2);
    noseGeom.translate(0, 0, 8.75);
    const nose = new THREE.Mesh(noseGeom, darkAlloyMat);
    this.mesh.add(nose);

    // 3. COCKPIT WINDSHIELD (Glowing cyan instrument display)
    const cockpitGeom = new THREE.SphereGeometry(1.0, 16, 16);
    cockpitGeom.scale(1.1, 0.7, 2.5); // Elongated glass canopy
    cockpitGeom.translate(0, 0.8, 6.2);
    const cockpit = new THREE.Mesh(cockpitGeom, cockpitGlassMat);
    this.mesh.add(cockpit);

    // 4. MAIN SWEPT-BACK WINGS
    // We construct wings symmetrically by sweeping them back using custom angled groups
    this.wingsGroup = new THREE.Group();

    // Left Wing
    const leftWingGeom = new THREE.BoxGeometry(8, 0.12, 2.2);
    leftWingGeom.translate(-4, 0, 0); // Origin at wing root
    const leftWing = new THREE.Mesh(leftWingGeom, aluminumMat);
    leftWing.rotation.y = -Math.PI / 8; // Sweep back
    leftWing.rotation.z = Math.PI / 36; // Slight dihedral angle (upwards)
    leftWing.position.set(-0.8, -0.2, 1);
    this.wingsGroup.add(leftWing);

    // Right Wing
    const rightWingGeom = new THREE.BoxGeometry(8, 0.12, 2.2);
    rightWingGeom.translate(4, 0, 0); // Origin at wing root
    const rightWing = new THREE.Mesh(rightWingGeom, aluminumMat);
    rightWing.rotation.y = Math.PI / 8; // Sweep back
    rightWing.rotation.z = -Math.PI / 36; // Dihedral angle
    rightWing.position.set(0.8, -0.2, 1);
    this.wingsGroup.add(rightWing);

    this.mesh.add(this.wingsGroup);

    // 5. JET ENGINES (Turbine Nacelles)
    const engineGeom = new THREE.CylinderGeometry(0.8, 0.65, 4.0, 16);
    engineGeom.rotateX(Math.PI / 2);

    // Left Engine
    this.engineLeft = new THREE.Mesh(engineGeom, darkAlloyMat);
    this.engineLeft.position.set(-3.2, -0.6, -0.5);
    this.mesh.add(this.engineLeft);

    // Right Engine
    this.engineRight = new THREE.Mesh(engineGeom, darkAlloyMat);
    this.engineRight.position.set(3.2, -0.6, -0.5);
    this.mesh.add(this.engineRight);

    // Turbine intake fan (Golden fan blades at front of engine)
    const fanGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.2, 12);
    fanGeom.rotateX(Math.PI / 2);
    
    this.fanLeft = new THREE.Mesh(fanGeom, goldAccentMat);
    this.fanLeft.position.set(-3.2, -0.6, 1.4);
    this.mesh.add(this.fanLeft);

    this.fanRight = new THREE.Mesh(fanGeom, goldAccentMat);
    this.fanRight.position.set(3.2, -0.6, 1.4);
    this.mesh.add(this.fanRight);

    // 6. TURBINE EXHAUST CONES (Glowing blue rocket thruster plasma)
    const plumeGeom = new THREE.ConeGeometry(0.55, 2.5, 12);
    plumeGeom.rotateX(-Math.PI / 2); // Exits to the rear
    plumeGeom.translate(0, 0, -2.85); // Extend backward from center

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

    // 7. TAIL SECTION (Horizontal and Vertical Stabilizers)
    // Horizontal Tailfins
    const tailFlapGeom = new THREE.BoxGeometry(4.5, 0.08, 1.2);
    const tailFlaps = new THREE.Mesh(tailFlapGeom, aluminumMat);
    tailFlaps.position.set(0, 0.2, -5.6);
    tailFlaps.rotation.y = -Math.PI / 18; // Slight backward sweep
    this.mesh.add(tailFlaps);

    // Vertical Tailfin
    const tailFinGeom = new THREE.BoxGeometry(0.12, 3.2, 1.8);
    // Offset vertices slightly to skew it back like a real rudder stabilizer
    const vertFin = new THREE.Mesh(tailFinGeom, darkAlloyMat);
    vertFin.position.set(0, 1.6, -5.4);
    vertFin.rotation.x = Math.PI / 12; // Skew backward
    this.mesh.add(vertFin);

    // 8. FAA COLOR NAVIGATION & STROBE LIGHTS
    const navLightGeom = new THREE.SphereGeometry(0.16, 8, 8);

    // LEFT WINGTIP: RED FAA light
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    this.leftLight = new THREE.Mesh(navLightGeom, redLightMat);
    this.leftLight.position.set(-8.4, -0.15, 0.5);
    this.mesh.add(this.leftLight);

    // RIGHT WINGTIP: GREEN FAA light
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    this.rightLight = new THREE.Mesh(navLightGeom, greenLightMat);
    this.rightLight.position.set(8.4, -0.15, 0.5);
    this.mesh.add(this.rightLight);

    // TAILFIN VERTICAL TIP: Pulsing WHITE strobe light
    const whiteStrobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.tailStrobe = new THREE.Mesh(navLightGeom, whiteStrobeMat);
    this.tailStrobe.position.set(0, 3.1, -6.0);
    this.mesh.add(this.tailStrobe);
  }

  /**
   * Animation update tick called from main WebGL frame loops.
   * @param {number} time Elapsed time in seconds.
   * @param {number} scrollSpeed Normalized relative scrolling velocity (0 to 1).
   */
  update(time, scrollSpeed = 0) {
    // 1. Spin turbine fan blades inside the engines
    const spinFactor = 25.0 + scrollSpeed * 40.0;
    if (this.fanLeft && this.fanRight) {
      this.fanLeft.rotation.y += spinFactor * 0.016;
      this.fanRight.rotation.y += spinFactor * 0.016;
    }

    // 2. Pulse white FAA tail strobe light (short double flash every 1.5 seconds)
    if (this.tailStrobe) {
      const cycle = time % 1.5;
      const isFlashing = (cycle > 0.0 && cycle < 0.1) || (cycle > 0.25 && cycle < 0.35);
      this.tailStrobe.visible = isFlashing;
    }

    // 3. Scale, flicker and change engine plume glow based on velocity
    const flicker = 1.0 + Math.sin(time * 65.0) * 0.08 + scrollSpeed * 0.8;
    if (this.plumeLeft && this.plumeRight) {
      this.plumeLeft.scale.set(flicker, flicker, flicker);
      this.plumeRight.scale.set(flicker, flicker, flicker);
      
      // Shift colors towards fiery orange/cyan based on speed
      if (scrollSpeed > 0.25) {
        this.plumeMat.color.setHex(0x00ffff);
      } else {
        this.plumeMat.color.setHex(0x00aaff);
      }
    }
  }
}
