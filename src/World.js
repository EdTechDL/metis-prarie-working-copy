import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Lighting } from './Lighting.js';
import { Terrain } from './Terrain.js';
import { Vegetation } from './Vegetation.js';
import { Props } from './Props.js';
import { InteractionManager } from './InteractionManager.js';
import { Minimap } from './Minimap.js';

// Height-based atmospheric fog shader
const HeightFogShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'tDepth': { value: null },
        'fogColor': { value: new THREE.Color(0xeedd99) },
        'fogDensity': { value: 0.015 },
        'fogHeightFalloff': { value: 0.1 },
        'cameraPosition': { value: new THREE.Vector3() },
        'cameraNear': { value: 0.1 },
        'cameraFar': { value: 1000.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec3 fogColor;
        uniform float fogDensity;
        uniform float fogHeightFalloff;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            // Simple distance-based fog that works without depth texture
            // Applied subtly via screen position (lower = more fog)
            float heightFog = 1.0 - vUv.y;
            heightFog = pow(heightFog, 2.0) * 0.15;

            // Blend fog
            color.rgb = mix(color.rgb, fogColor, heightFog);

            gl_FragColor = color;
        }
    `
};

// God rays / volumetric light scattering shader
const GodRaysShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'sunPosition': { value: new THREE.Vector2(0.5, 0.3) },
        'exposure': { value: 0.4 },
        'decay': { value: 0.95 },
        'density': { value: 0.8 },
        'weight': { value: 0.4 },
        'samples': { value: 60 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 sunPosition;
        uniform float exposure;
        uniform float decay;
        uniform float density;
        uniform float weight;
        uniform int samples;
        varying vec2 vUv;

        void main() {
            vec2 texCoord = vUv;
            vec2 deltaTexCoord = (texCoord - sunPosition);
            deltaTexCoord *= 1.0 / float(samples) * density;

            vec4 color = texture2D(tDiffuse, texCoord);
            float illuminationDecay = 1.0;

            for (int i = 0; i < 60; i++) {
                if (i >= samples) break;
                texCoord -= deltaTexCoord;
                vec4 sampleColor = texture2D(tDiffuse, texCoord);

                // Only add bright pixels to god rays
                float brightness = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));
                sampleColor.rgb *= smoothstep(0.5, 1.0, brightness);

                sampleColor *= illuminationDecay * weight;
                color += sampleColor;
                illuminationDecay *= decay;
            }

            // Blend god rays with original
            vec4 originalColor = texture2D(tDiffuse, vUv);
            gl_FragColor = originalColor + color * exposure;
        }
    `
};

// Custom color grading shader for cinematic look
const ColorGradingShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'saturation': { value: 1.1 },
        'contrast': { value: 1.05 },
        'brightness': { value: 0.02 },
        'vignetteAmount': { value: 0.3 },
        'vignetteSize': { value: 0.5 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float saturation;
        uniform float contrast;
        uniform float brightness;
        uniform float vignetteAmount;
        uniform float vignetteSize;
        varying vec2 vUv;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            // Brightness
            color.rgb += brightness;

            // Contrast
            color.rgb = (color.rgb - 0.5) * contrast + 0.5;

            // Saturation
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(vec3(gray), color.rgb, saturation);

            // Warm color grading (golden hour boost)
            color.r *= 1.02;
            color.b *= 0.95;

            // Vignette
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float vignette = smoothstep(vignetteSize, vignetteSize - vignetteAmount, dist);
            color.rgb *= vignette;

            gl_FragColor = color;
        }
    `
};

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
            antialias: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Enable shadows for realistic lighting
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // ACES Filmic tone mapping for cinematic look
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container.appendChild(this.renderer.domElement);

        // Setup post-processing
        this.setupPostProcessing();

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

    setupPostProcessing() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);

        // Render pass - renders the scene
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass - creates glow on bright objects (sun, fire)
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.5,    // strength - increased for more visible glow
            0.5,    // radius
            0.8     // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // God rays pass - volumetric light scattering from sun
        const godRaysPass = new ShaderPass(GodRaysShader);
        this.composer.addPass(godRaysPass);
        this.godRaysPass = godRaysPass;

        // Height-based atmospheric fog pass
        const heightFogPass = new ShaderPass(HeightFogShader);
        heightFogPass.uniforms['fogColor'].value = new THREE.Color(this.config.fog?.color || 0xeedd99);
        this.composer.addPass(heightFogPass);

        // Color grading pass - saturation, contrast, vignette
        const colorGradingPass = new ShaderPass(ColorGradingShader);
        this.composer.addPass(colorGradingPass);

        // Output pass - final color space conversion
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    // Update god rays sun position based on camera and sun direction
    updateGodRays() {
        if (!this.godRaysPass || !this.lighting) return;

        const lightCfg = this.config.lighting || {};
        const phi = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const theta = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);

        // Calculate sun world position (far away)
        const sunWorldPos = new THREE.Vector3();
        sunWorldPos.setFromSphericalCoords(500, phi, theta);

        // Project to screen space
        const sunScreenPos = sunWorldPos.clone();
        sunScreenPos.project(this.camera);

        // Convert to UV coordinates (0-1 range)
        const sunUV = new THREE.Vector2(
            (sunScreenPos.x + 1) / 2,
            (sunScreenPos.y + 1) / 2
        );

        // Update god rays uniform
        this.godRaysPass.uniforms['sunPosition'].value.copy(sunUV);

        // Reduce god rays intensity when sun is off-screen or behind camera
        const sunVisible = sunScreenPos.z < 1 &&
                          sunUV.x > -0.2 && sunUV.x < 1.2 &&
                          sunUV.y > -0.2 && sunUV.y < 1.2;

        this.godRaysPass.uniforms['exposure'].value = sunVisible ? 0.35 : 0.0;
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
        this.composer.setSize(this.width, this.height);

        // Update bloom resolution
        if (this.bloomPass) {
            this.bloomPass.resolution.set(this.width, this.height);
        }
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

        // Update god rays based on sun/camera position
        this.updateGodRays();

        // Update minimap indicator position
        if (this.minimap) {
            this.minimap.update();
        }

        // Render with post-processing
        this.composer.render();
    }
}
