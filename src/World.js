import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Lighting } from './Lighting.js';
import { Terrain } from './Terrain.js';
import { Vegetation } from './Vegetation.js';
import { Props } from './Props.js';
import { InteractionManager } from './InteractionManager.js';
import { Minimap } from './Minimap.js';

export class World {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 15, 40); // Elevated view

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "low-power",
            failIfMajorPerformanceCaveat: false
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Orbit controls for pan/rotate/zoom
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 150;
        this.controls.target.set(0, 0, 0);

        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // Initialize components - order matters!
        this.lighting = new Lighting(this.scene, this.config);
        this.terrain = new Terrain(this.scene, this.config);

        // Pass full terrain object (not just mesh) so vegetation can use getHeightAt()
        this.vegetation = new Vegetation(this.scene, this.terrain, this.config);
        this.props = new Props(this.scene, this.terrain.mesh, this.config);

        // Cabin positions for click-based interaction - pass controls and props so we can track visits
        const cabinPositions = InteractionManager.getCabinPositions();
        this.interactions = new InteractionManager(this.scene, this.camera, cabinPositions, this.controls, this.renderer.domElement, this.props);

        // Get fireplace positions for minimap (defined here to avoid circular dependency)
        const fireplacePositions = [
            { x: -40, z: 34 },   // Between cabin 1 and 2 trail (moved inland)
            { x: 5, z: 32 },     // Near the camp area (moved inland)
            { x: 55, z: 38 },    // Between cabin 3 and 4 trail (moved inland)
            { x: 105, z: 32 },   // Between cabin 4 and 5 trail
            { x: -25, z: -35 },  // Near cabin 2's path (moved from z=-18)
            { x: 75, z: -20 },   // Near cabin 4's path
        ];

        // Herb bundle / Medicine box positions
        const herbPositions = [
            { x: -95, z: 45 },   // Left of cabin 1 - The Medicine Garden
        ];

        // Log pile / Architecture experience positions
        const logPilePositions = [
            { x: 115, z: -65 },   // Right of cabin 4 - Architecture Experience
        ];

        // Garden patch positions
        const gardenPositions = [
            { x: -55, z: 40 },   // Near cabin 1 - River Lot Farming
        ];

        // Red River cart positions
        const cartPositions = [
            { x: 30, z: 48 },   // Near cabin 3 - Red River Cart Experience
        ];

        // Fishing spot positions
        const fishingPositions = [
            { x: 50, z: -50 },   // Left of cabin 4 - Fishing Experience
        ];

        // Memorial positions
        const memorialPositions = [
            { x: -80, z: -60 },   // Quiet area - Remembering & Resilience
        ];

        // Initialize minimap for quick navigation
        this.minimap = new Minimap(this.camera, this.controls, cabinPositions, fireplacePositions, herbPositions, logPilePositions, gardenPositions, cartPositions, fishingPositions, memorialPositions);

        // Event listeners
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();

        // Update orbit controls (only if not in dialogue)
        if (!this.interactions.isDialogueOpen) {
            this.controls.update();
        }

        // Update components
        this.terrain.update(elapsedTime);
        this.vegetation.update(elapsedTime);
        this.props.update(elapsedTime, this.camera);
        this.lighting.update(elapsedTime);

        // Update minimap indicator position
        if (this.minimap) {
            this.minimap.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
