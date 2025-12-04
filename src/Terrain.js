import * as THREE from 'three';
import { fbm, smoothstep } from './Utils.js';
import { Props } from './Props.js';

// Enhanced water vertex shader with realistic waves and normals
const waterVertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform float time;
    uniform float waveIntensity;
    uniform vec3 cameraPosition;

    // Simplex-like noise function for organic waves
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
        vUv = uv;
        vec3 pos = position;

        // Multi-layered realistic wave animation
        float wave1 = sin(pos.x * 0.05 + time * 0.5) * waveIntensity;
        float wave2 = sin(pos.y * 0.08 + time * 0.3) * waveIntensity * 0.5;
        float wave3 = cos((pos.x + pos.y) * 0.03 + time * 0.2) * waveIntensity * 0.3;

        // Add organic noise-based ripples
        float ripple1 = noise(vec2(pos.x * 0.1 + time * 0.2, pos.y * 0.1)) * waveIntensity * 0.3;
        float ripple2 = noise(vec2(pos.x * 0.2 - time * 0.15, pos.y * 0.2 + time * 0.1)) * waveIntensity * 0.2;

        pos.z += wave1 + wave2 + wave3 + ripple1 + ripple2;

        // Calculate normal from wave derivatives for realistic lighting
        float dx = cos(pos.x * 0.05 + time * 0.5) * 0.05 * waveIntensity +
                   cos((pos.x + pos.y) * 0.03 + time * 0.2) * 0.03 * waveIntensity * 0.3;
        float dy = cos(pos.y * 0.08 + time * 0.3) * 0.08 * waveIntensity * 0.5 +
                   cos((pos.x + pos.y) * 0.03 + time * 0.2) * 0.03 * waveIntensity * 0.3;
        vNormal = normalize(vec3(-dx, 1.0, -dy));

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;

        // View direction for fresnel calculation
        vViewDir = normalize(cameraPosition - worldPosition.xyz);

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

const waterFragmentShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    uniform vec3 waterColor;
    uniform vec3 deepColor;
    uniform vec3 skyColor;
    uniform float opacity;
    uniform float time;
    uniform float specularIntensity;
    uniform vec3 sunDirection;

    void main() {
        // Distance from river center for depth variation
        float distFromCenter = abs(vWorldPosition.z);
        float depthFactor = smoothstep(0.0, 20.0, distFromCenter);

        // Fresnel effect - more reflection at grazing angles
        float fresnel = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), 3.0);
        fresnel = mix(0.04, 1.0, fresnel); // Water has ~4% reflectance at normal incidence

        // Base water color with depth variation
        vec3 baseColor = mix(waterColor, deepColor, 1.0 - depthFactor);

        // Sky reflection color (approximated)
        vec3 reflectionColor = mix(skyColor, vec3(1.0, 0.95, 0.9), 0.3);

        // Blend base color with reflection based on fresnel
        vec3 color = mix(baseColor, reflectionColor, fresnel * 0.6);

        // Sun specular highlight
        vec3 halfDir = normalize(sunDirection + vViewDir);
        float specAngle = max(dot(vNormal, halfDir), 0.0);
        float specular = pow(specAngle, 64.0) * specularIntensity;

        // Secondary softer specular for sun path on water
        float sunPath = pow(specAngle, 8.0) * specularIntensity * 0.3;

        color += vec3(1.0, 0.95, 0.85) * specular;
        color += vec3(1.0, 0.9, 0.7) * sunPath;

        // Animated caustic-like patterns (light dappling)
        float caustic1 = sin(vWorldPosition.x * 0.5 + time * 1.5) * sin(vWorldPosition.y * 0.4 + time) * 0.5 + 0.5;
        float caustic2 = sin(vWorldPosition.x * 0.7 - time * 1.2) * sin(vWorldPosition.y * 0.6 - time * 0.8) * 0.5 + 0.5;
        float caustics = caustic1 * caustic2 * 0.15 * (1.0 - fresnel);
        color += vec3(0.8, 0.9, 1.0) * caustics;

        // Subtle flow lines
        float flowLine = sin(vWorldPosition.x * 0.3 - time * 2.0) * 0.5 + 0.5;
        flowLine = pow(flowLine, 4.0) * 0.08;
        color += vec3(flowLine);

        // Foam at edges (where shallow)
        float foam = smoothstep(0.85, 1.0, depthFactor);
        color = mix(color, vec3(0.95, 0.95, 0.9), foam * 0.3);

        gl_FragColor = vec4(color, opacity + fresnel * 0.1);
    }
`;

export class Terrain {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.mesh = null;
        this.waterMesh = null;
        this.init();
    }

    init() {
        const cfg = this.config.terrain || {};
        const size = cfg.size || 400;
        const segments = cfg.segments || 200;

        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position;
        const colors = [];

        // Color palette from config
        const c1 = new THREE.Color(cfg.grassColor || 0x3a5f0b);
        const c2 = new THREE.Color(cfg.dryGrassColor || 0x8f7e45);
        const c3 = new THREE.Color(cfg.riverbedColor || 0x3d3d3d);
        const c4 = new THREE.Color(cfg.sandbarColor || 0xc4a87c);
        const c5 = new THREE.Color(cfg.bluffColor || 0x7a6b5a);
        const c6 = new THREE.Color(cfg.trailColor || 0x8B4513); // Saddle brown - more visible trail

        // Get cabin positions for creating paths
        const cabinPositions = Props.getCabinSettlementPositions();

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            // === BASE TERRAIN HEIGHT ===
            // Large scale rolling hills
            let h = fbm(x * 0.015, z * 0.015, 4) * 6;
            // Medium details
            h += fbm(x * 0.05, z * 0.05, 3) * 1.5;
            // Small details
            h += fbm(x * 0.15, z * 0.15, 2) * 0.3;

            // === BLUFFS AND CUTBANKS ===
            // Create occasional steep sections along the river
            const bluffNoise = fbm(x * 0.008, z * 0.01, 2);
            const isBluffZone = bluffNoise > 0.3 && Math.abs(z) > 10 && Math.abs(z) < 25;
            if (isBluffZone) {
                // Steeper terrain near bluffs
                h += Math.abs(bluffNoise) * 4;
            }

            // === RIVER CHANNEL ===
            // Meandering river with variable width
            const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
            const riverWidth = 8 + Math.sin(x * 0.02) * 4; // Variable width
            const distToRiver = Math.abs(z - riverMeander);
            const riverFactor = smoothstep(riverWidth * 0.5, riverWidth * 1.5, distToRiver);

            // Deeper in center, shallow at edges
            const riverDepth = -2.5 + smoothstep(0, riverWidth * 0.5, distToRiver) * 1.5;
            h = THREE.MathUtils.lerp(riverDepth, h, riverFactor);

            // === SANDBARS ===
            // Occasional sandy areas in the river
            const sandbarNoise = fbm(x * 0.05 + 100, z * 0.05, 2);
            const isSandbar = sandbarNoise > 0.4 && distToRiver < riverWidth * 0.8 && distToRiver > riverWidth * 0.3;
            if (isSandbar) {
                h = Math.max(h, -0.5); // Raise sandbars above water
            }

            // === SMALL HILLS ===
            // Occasional small hills/mounds
            const hillNoise = fbm(x * 0.03 + 50, z * 0.03 + 50, 2);
            if (hillNoise > 0.5 && riverFactor > 0.8) {
                h += (hillNoise - 0.5) * 6;
            }

            // === MAIN CART TRAIL ===
            const trailZ = Math.sin(x * 0.04) * 25 + Math.cos(x * 0.02) * 10 + 25;
            const distToTrail = Math.abs(z - trailZ);
            let trailFactor = smoothstep(3, 0.5, distToTrail);

            // === CABIN PATHS - paths from each cabin to the main trail ===
            let cabinPathFactor = 0;
            for (const cabin of cabinPositions) {
                // Path runs from cabin position to main trail
                const cabinTrailZ = Math.sin(cabin.x * 0.04) * 25 + Math.cos(cabin.x * 0.02) * 10 + 25;

                // Check if we're within the x-range of this cabin's path (with some width)
                const pathWidth = 3;
                if (Math.abs(x - cabin.x) < pathWidth) {
                    // Check if z is between cabin and trail
                    const minZ = Math.min(cabin.z, cabinTrailZ);
                    const maxZ = Math.max(cabin.z, cabinTrailZ);
                    if (z >= minZ - 2 && z <= maxZ + 2) {
                        // Distance from center of path
                        const distFromPathCenter = Math.abs(x - cabin.x);
                        const pathFactor = smoothstep(pathWidth, 0.5, distFromPathCenter);
                        cabinPathFactor = Math.max(cabinPathFactor, pathFactor);
                    }
                }
            }

            // Combine main trail and cabin paths
            trailFactor = Math.max(trailFactor, cabinPathFactor);

            // Flatten and slightly lower the trail
            if (riverFactor > 0.9) { // Only on land
                h = THREE.MathUtils.lerp(h, Math.max(h * 0.7, 0.2), trailFactor);
            }

            positions.setY(i, h);

            // === VERTEX COLORS ===
            const color = new THREE.Color();

            if (h < -1.5) {
                // Deep riverbed
                color.copy(c3);
            } else if (h < -0.5) {
                // Shallow water / wet riverbed
                color.copy(c3).lerp(c4, (h + 1.5));
            } else if (isSandbar && h < 0) {
                // Sandbar
                color.copy(c4);
            } else if (trailFactor > 0.2 && riverFactor > 0.9) {
                // Trail (main trail and cabin paths) - blend based on trail factor for softer edges
                color.copy(c1).lerp(c6, Math.min(trailFactor * 1.5, 1));
            } else if (isBluffZone && h > 2) {
                // Exposed bluff earth
                color.copy(c5);
            } else if (h < 1) {
                // Lush grass near water
                color.copy(c1);
            } else if (h < 4) {
                // Regular prairie grass
                color.copy(c1).lerp(c2, (h - 1) / 3);
            } else {
                // Dry hilltops
                color.copy(c2);
            }

            // Add subtle variation
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);

            colors.push(color.r, color.g, color.b);
        }

        geometry.computeVertexNormals();
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.05,
            flatShading: false
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // Store terrain data for vegetation placement
        this.terrainData = { positions, size, segments };

        // Create animated water
        this.createWater(size);

        // Add scattered rocks
        this.createRocks();
    }

    createWater(size) {
        const waterCfg = this.config.water || {};
        const lightCfg = this.config.lighting || {};
        const skyCfg = this.config.sky || {};

        const waterGeo = new THREE.PlaneGeometry(size, 60, 150, 30);
        waterGeo.rotateX(-Math.PI / 2);

        // Calculate sun direction from config
        const sunElevation = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const sunAzimuth = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);
        const sunDirection = new THREE.Vector3();
        sunDirection.setFromSphericalCoords(1, sunElevation, sunAzimuth);

        const waterMat = new THREE.ShaderMaterial({
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            uniforms: {
                time: { value: 0 },
                waterColor: { value: new THREE.Color(waterCfg.color || 0x2d7a7a) },
                deepColor: { value: new THREE.Color(waterCfg.deepColor || 0x1a5555) },
                skyColor: { value: new THREE.Color(skyCfg.horizonColor || 0xffcc88) },
                sunDirection: { value: sunDirection },
                opacity: { value: waterCfg.opacity || 0.85 },
                waveIntensity: { value: waterCfg.waveIntensity || 0.15 },
                specularIntensity: { value: waterCfg.specularIntensity || 0.5 },
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.position.y = -0.8;
        this.scene.add(this.waterMesh);
    }

    createRocks() {
        // Scatter rocks along riverbanks and on hills
        const rockGeo = new THREE.DodecahedronGeometry(1, 0);
        const rockMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.95,
            metalness: 0.0
        });

        const rockCount = 100;
        const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);

        const dummy = new THREE.Object3D();
        let count = 0;

        for (let i = 0; i < rockCount * 2 && count < rockCount; i++) {
            const x = (Math.random() - 0.5) * 350;
            const z = (Math.random() - 0.5) * 350;

            // Calculate height at this position
            let h = fbm(x * 0.015, z * 0.015, 4) * 6;
            h += fbm(x * 0.05, z * 0.05, 3) * 1.5;

            const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
            const riverWidth = 8 + Math.sin(x * 0.02) * 4;
            const distToRiver = Math.abs(z - riverMeander);
            const riverFactor = smoothstep(riverWidth * 0.5, riverWidth * 1.5, distToRiver);
            const riverDepth = -2.5 + smoothstep(0, riverWidth * 0.5, distToRiver) * 1.5;
            h = THREE.MathUtils.lerp(riverDepth, h, riverFactor);

            // Only place rocks on land, near riverbanks, or on higher ground
            const nearRiver = distToRiver > riverWidth * 0.5 && distToRiver < riverWidth * 2;
            const onHighGround = h > 3;

            if ((nearRiver || onHighGround) && h > 0) {
                const scale = 0.2 + Math.random() * 0.6;

                dummy.position.set(x, h - scale * 0.3, z);
                dummy.scale.set(scale, scale * 0.7, scale);
                dummy.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                dummy.updateMatrix();

                rocks.setMatrixAt(count, dummy.matrix);
                count++;
            }
        }

        rocks.count = count;
        rocks.castShadow = true;
        rocks.receiveShadow = true;
        this.scene.add(rocks);
    }

    // Helper method to get height at any position
    getHeightAt(x, z) {
        let h = fbm(x * 0.015, z * 0.015, 4) * 6;
        h += fbm(x * 0.05, z * 0.05, 3) * 1.5;
        h += fbm(x * 0.15, z * 0.15, 2) * 0.3;

        const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
        const riverWidth = 8 + Math.sin(x * 0.02) * 4;
        const distToRiver = Math.abs(z - riverMeander);
        const riverFactor = smoothstep(riverWidth * 0.5, riverWidth * 1.5, distToRiver);
        const riverDepth = -2.5 + smoothstep(0, riverWidth * 0.5, distToRiver) * 1.5;
        h = THREE.MathUtils.lerp(riverDepth, h, riverFactor);

        return h;
    }

    // Check if position is near water
    isNearWater(x, z) {
        const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
        const riverWidth = 8 + Math.sin(x * 0.02) * 4;
        const distToRiver = Math.abs(z - riverMeander);
        return distToRiver < riverWidth * 2;
    }

    update(time) {
        // Animate water
        if (this.waterMesh && this.waterMesh.material.uniforms) {
            this.waterMesh.material.uniforms.time.value = time;
        }
    }
}
