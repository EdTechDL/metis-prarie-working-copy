import * as THREE from 'three';
import { fbm, smoothstep } from './Utils.js';

// Enhanced grass shader with noise-based wind, alpha tips, and subsurface scattering
const grassVertexShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vWindFactor;
    varying float vHeight;
    varying vec3 vWorldPos;
    uniform float time;
    uniform float windSpeed;
    uniform float windStrength;

    // Simplex-like noise for organic wind patterns
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

    // FBM for multi-scale wind turbulence
    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    void main() {
        vUv = uv;
        vColor = instanceColor;
        vHeight = position.y;

        vec3 pos = position;

        // Wind effect with gusts
        float worldX = instanceMatrix[3][0];
        float worldZ = instanceMatrix[3][2];
        vWorldPos = vec3(worldX, pos.y, worldZ);

        // Noise-based wind field (more organic than sine waves)
        vec2 windUV = vec2(worldX * 0.05 + time * windSpeed * 0.3, worldZ * 0.05);
        float windNoise = fbm(windUV) * 2.0 - 1.0;

        // Add directional wind component
        float directionalWind = sin(time * windSpeed * 0.8 + worldX * 0.1) * 0.5;

        // Gust effect - traveling waves of stronger wind
        float gustPhase = time * 0.4 + worldX * 0.02;
        float gust = pow(sin(gustPhase) * 0.5 + 0.5, 4.0);

        float totalWind = (windNoise + directionalWind) * windStrength * (1.0 + gust * 0.8);
        vWindFactor = totalWind;

        // Quadratic bend - stronger at top, fixed at base
        float bendFactor = pos.y * pos.y;
        pos.x += totalWind * bendFactor * 0.4;
        pos.z += totalWind * bendFactor * 0.2 + windNoise * bendFactor * 0.1;

        // Slight vertical compression when bent
        pos.y *= 1.0 - abs(totalWind) * bendFactor * 0.05;

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const grassFragmentShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vWindFactor;
    varying float vHeight;
    varying vec3 vWorldPos;
    uniform vec3 sunDirection;
    uniform vec3 sunColor;

    void main() {
        // Gradient from dark base to lighter tips
        vec3 baseColor = vColor * 0.35;
        vec3 tipColor = vColor * 1.3;
        vec3 color = mix(baseColor, tipColor, pow(vUv.y, 0.8));

        // Subsurface scattering simulation - grass glows when backlit
        float backlit = max(0.0, dot(normalize(vec3(vWorldPos.x, 0.0, vWorldPos.z)), sunDirection));
        backlit = pow(backlit, 2.0) * 0.3;
        color += sunColor * backlit * vUv.y;

        // Wind-based color shift (lighter when bent, simulates light catching)
        color += vec3(0.05, 0.08, 0.02) * abs(vWindFactor) * vUv.y;

        // Subtle ambient occlusion at base
        float ao = smoothstep(0.0, 0.3, vUv.y);
        color *= 0.7 + ao * 0.3;

        // Alpha fade at tip for softer appearance
        float alpha = 1.0;
        if (vUv.y > 0.85) {
            alpha = 1.0 - smoothstep(0.85, 1.0, vUv.y);
        }

        // Discard very transparent pixels for performance
        if (alpha < 0.1) discard;

        gl_FragColor = vec4(color, alpha);
    }
`;

// Reed shader - taller, more uniform sway
const reedVertexShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    uniform float time;

    void main() {
        vUv = uv;
        vColor = instanceColor;

        vec3 pos = position;
        float worldX = instanceMatrix[3][0];

        // Slower, more uniform sway for reeds
        float sway = sin(time * 1.5 + worldX * 0.2) * 0.15;
        pos.x += sway * pos.y;

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const reedFragmentShader = `
    varying vec2 vUv;
    varying vec3 vColor;

    void main() {
        vec3 color = mix(vColor * 0.6, vColor, vUv.y);
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Tree crown shader with wind sway animation
const treeCrownVertexShader = `
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorldPos;
    uniform float time;
    uniform float windStrength;

    // Simple noise function
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
        vNormal = normalMatrix * normal;
        vColor = instanceColor;

        vec3 pos = position;

        // Get world position for wind variation
        float worldX = instanceMatrix[3][0];
        float worldZ = instanceMatrix[3][2];
        float worldY = instanceMatrix[3][1];
        vWorldPos = vec3(worldX, worldY + pos.y, worldZ);

        // Wind effect - stronger at top of tree
        float heightFactor = max(0.0, pos.y) / 3.0; // Normalize by approx crown height
        heightFactor = heightFactor * heightFactor; // Quadratic falloff

        // Noise-based wind field
        float windNoise = noise(vec2(worldX * 0.03 + time * 0.2, worldZ * 0.03));

        // Directional wind
        float windX = sin(time * 0.5 + worldX * 0.02) * windStrength;
        float windZ = cos(time * 0.4 + worldZ * 0.02) * windStrength * 0.5;

        // Gust effect
        float gust = pow(sin(time * 0.3 + worldX * 0.01) * 0.5 + 0.5, 3.0);

        // Apply wind displacement
        pos.x += (windX + windNoise * 0.5) * heightFactor * (1.0 + gust * 0.5);
        pos.z += (windZ + windNoise * 0.3) * heightFactor * (1.0 + gust * 0.3);

        // Subtle branch rustling
        float rustle = sin(time * 3.0 + pos.x * 2.0 + pos.z * 2.0) * 0.02 * heightFactor;
        pos.x += rustle;
        pos.z += rustle * 0.7;

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const treeCrownFragmentShader = `
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorldPos;
    uniform vec3 sunDirection;
    uniform vec3 sunColor;
    uniform vec3 ambientColor;

    void main() {
        // Basic diffuse lighting
        vec3 normal = normalize(vNormal);
        float diffuse = max(dot(normal, sunDirection), 0.0);

        // Ambient + diffuse lighting
        vec3 lighting = ambientColor * 0.4 + sunColor * diffuse * 0.6;

        // Subsurface scattering for leaves
        float sss = pow(max(0.0, dot(-normal, sunDirection)), 2.0) * 0.2;

        vec3 color = vColor * lighting + vColor * sss * sunColor;

        // Slight variation based on position
        color *= 0.9 + sin(vWorldPos.x * 0.5 + vWorldPos.z * 0.5) * 0.1;

        gl_FragColor = vec4(color, 1.0);
    }
`;

export class Vegetation {
    constructor(scene, terrain, config) {
        this.scene = scene;
        this.terrain = terrain;
        this.config = config;
        this.init();
    }

    init() {
        this.initGrass();
        this.initTallGrass();
        this.initReeds();
        this.initTrees();
        this.initWillows();
        this.initPoplars();
        this.initSpruce();
        this.initBerryBushes();
    }

    // Helper to get terrain height
    getHeight(x, z) {
        if (this.terrain.getHeightAt) {
            return this.terrain.getHeightAt(x, z);
        }
        // Fallback calculation
        let h = fbm(x * 0.015, z * 0.015, 4) * 6;
        h += fbm(x * 0.05, z * 0.05, 3) * 1.5;
        const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
        const riverWidth = 8 + Math.sin(x * 0.02) * 4;
        const distToRiver = Math.abs(z - riverMeander);
        const riverFactor = smoothstep(riverWidth * 0.5, riverWidth * 1.5, distToRiver);
        const riverDepth = -2.5 + smoothstep(0, riverWidth * 0.5, distToRiver) * 1.5;
        return THREE.MathUtils.lerp(riverDepth, h, riverFactor);
    }

    isNearWater(x, z) {
        const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
        const riverWidth = 8 + Math.sin(x * 0.02) * 4;
        const distToRiver = Math.abs(z - riverMeander);
        return distToRiver < riverWidth * 2.5;
    }

    initGrass() {
        const cfg = this.config.vegetation || {};
        const windCfg = this.config.wind || {};
        const lightCfg = this.config.lighting || {};
        const instanceCount = cfg.grassDensity || 50000;

        const geometry = new THREE.PlaneGeometry(0.08, 0.8, 1, 4);
        geometry.translate(0, 0.4, 0);

        // Calculate sun direction from config
        const sunElevation = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const sunAzimuth = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);
        const sunDirection = new THREE.Vector3();
        sunDirection.setFromSphericalCoords(1, sunElevation, sunAzimuth);

        const material = new THREE.ShaderMaterial({
            vertexShader: grassVertexShader,
            fragmentShader: grassFragmentShader,
            uniforms: {
                time: { value: 0 },
                windSpeed: { value: windCfg.speed || 1.0 },
                windStrength: { value: windCfg.swayAmount || 0.2 },
                sunDirection: { value: sunDirection },
                sunColor: { value: new THREE.Color(lightCfg.sunColor || 0xffaa55) }
            },
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.1,
            depthWrite: true
        });

        this.grassMesh = new THREE.InstancedMesh(geometry, material, instanceCount);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const baseColor = new THREE.Color(cfg.grassColor || 0x3a5f0b);

        let count = 0;
        for (let i = 0; i < instanceCount && count < instanceCount; i++) {
            const x = (Math.random() - 0.5) * 360;
            const z = (Math.random() - 0.5) * 360;
            const h = this.getHeight(x, z);

            // Skip underwater and very steep areas
            if (h < -0.3) continue;

            dummy.position.set(x, h, z);
            dummy.scale.setScalar(0.5 + Math.random() * 0.6);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            this.grassMesh.setMatrixAt(count, dummy.matrix);

            // Color variation based on moisture/location
            color.copy(baseColor);
            const moistureFactor = this.isNearWater(x, z) ? 0.1 : 0;
            color.offsetHSL(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.1 + moistureFactor,
                (Math.random() - 0.5) * 0.1
            );
            this.grassMesh.setColorAt(count, color);

            count++;
        }

        this.grassMesh.count = count;
        this.scene.add(this.grassMesh);
    }

    initTallGrass() {
        const cfg = this.config.vegetation || {};
        const lightCfg = this.config.lighting || {};
        const instanceCount = Math.floor((cfg.grassDensity || 50000) * 0.15);

        const geometry = new THREE.PlaneGeometry(0.12, 1.5, 1, 6);
        geometry.translate(0, 0.75, 0);

        // Calculate sun direction from config
        const sunElevation = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const sunAzimuth = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);
        const sunDirection = new THREE.Vector3();
        sunDirection.setFromSphericalCoords(1, sunElevation, sunAzimuth);

        const material = new THREE.ShaderMaterial({
            vertexShader: grassVertexShader,
            fragmentShader: grassFragmentShader,
            uniforms: {
                time: { value: 0 },
                windSpeed: { value: (this.config.wind?.speed || 1.0) * 0.8 },
                windStrength: { value: (this.config.wind?.swayAmount || 0.2) * 1.3 },
                sunDirection: { value: sunDirection },
                sunColor: { value: new THREE.Color(lightCfg.sunColor || 0xffaa55) }
            },
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.1,
            depthWrite: true
        });

        this.tallGrassMesh = new THREE.InstancedMesh(geometry, material, instanceCount);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const baseColor = new THREE.Color(cfg.tallGrassColor || 0x4a6f1b);

        let count = 0;
        for (let i = 0; i < instanceCount * 2 && count < instanceCount; i++) {
            const x = (Math.random() - 0.5) * 340;
            const z = (Math.random() - 0.5) * 340;
            const h = this.getHeight(x, z);

            // Tall grass prefers slightly higher ground
            if (h < 0.5 || h > 6) continue;

            dummy.position.set(x, h, z);
            dummy.scale.setScalar(0.8 + Math.random() * 0.4);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            this.tallGrassMesh.setMatrixAt(count, dummy.matrix);

            color.copy(baseColor);
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
            this.tallGrassMesh.setColorAt(count, color);

            count++;
        }

        this.tallGrassMesh.count = count;
        this.scene.add(this.tallGrassMesh);
    }

    initReeds() {
        const cfg = this.config.vegetation || {};
        const clusterCount = cfg.reedClusterCount || 30;

        const geometry = new THREE.PlaneGeometry(0.05, 2.5, 1, 8);
        geometry.translate(0, 1.25, 0);

        const material = new THREE.ShaderMaterial({
            vertexShader: reedVertexShader,
            fragmentShader: reedFragmentShader,
            uniforms: { time: { value: 0 } },
            side: THREE.DoubleSide
        });

        const instanceCount = clusterCount * 20;
        this.reedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const baseColor = new THREE.Color(cfg.reedColor || 0x5a7a4a);

        let count = 0;

        // Place reed clusters near water
        for (let c = 0; c < clusterCount && count < instanceCount; c++) {
            // Find a position near the river
            const baseX = (Math.random() - 0.5) * 300;
            const riverMeander = Math.sin(baseX * 0.03) * 12 + Math.sin(baseX * 0.01) * 5;
            const riverWidth = 8 + Math.sin(baseX * 0.02) * 4;

            // Place on riverbank
            const side = Math.random() > 0.5 ? 1 : -1;
            const baseZ = riverMeander + side * (riverWidth * 0.8 + Math.random() * 5);

            // Create cluster of reeds
            const reedsInCluster = 8 + Math.floor(Math.random() * 12);
            for (let r = 0; r < reedsInCluster && count < instanceCount; r++) {
                const x = baseX + (Math.random() - 0.5) * 4;
                const z = baseZ + (Math.random() - 0.5) * 4;
                const h = this.getHeight(x, z);

                if (h < -0.5 || h > 1) continue;

                dummy.position.set(x, h, z);
                dummy.scale.set(
                    0.8 + Math.random() * 0.4,
                    0.7 + Math.random() * 0.5,
                    0.8 + Math.random() * 0.4
                );
                dummy.rotation.y = Math.random() * Math.PI * 2;
                dummy.updateMatrix();

                this.reedMesh.setMatrixAt(count, dummy.matrix);

                color.copy(baseColor);
                color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
                this.reedMesh.setColorAt(count, color);

                count++;
            }
        }

        this.reedMesh.count = count;
        this.scene.add(this.reedMesh);
    }

    initTrees() {
        // Generic deciduous trees with animated crowns
        const cfg = this.config.vegetation || {};
        const lightCfg = this.config.lighting || {};
        const windCfg = this.config.wind || {};
        const treeCount = Math.floor((cfg.treeCount || 80) * 0.3);

        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
        trunkGeo.translate(0, 1, 0);
        const crownGeo = new THREE.SphereGeometry(1.5, 12, 8);
        crownGeo.translate(0, 3, 0);

        // Calculate sun direction
        const sunElevation = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const sunAzimuth = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);
        const sunDirection = new THREE.Vector3();
        sunDirection.setFromSphericalCoords(1, sunElevation, sunAzimuth);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });

        // Animated crown material
        const crownMat = new THREE.ShaderMaterial({
            vertexShader: treeCrownVertexShader,
            fragmentShader: treeCrownFragmentShader,
            uniforms: {
                time: { value: 0 },
                windStrength: { value: windCfg.swayAmount || 0.2 },
                sunDirection: { value: sunDirection },
                sunColor: { value: new THREE.Color(lightCfg.sunColor || 0xffaa55) },
                ambientColor: { value: new THREE.Color(0x6688aa) }
            }
        });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);

        const dummy = new THREE.Object3D();
        const crownColor = new THREE.Color();

        let count = 0;

        for (let i = 0; i < treeCount * 3 && count < treeCount; i++) {
            const x = (Math.random() - 0.5) * 340;
            const z = (Math.random() - 0.5) * 340;
            const h = this.getHeight(x, z);

            if (h < 1 || h > 8) continue;
            if (this.isNearWater(x, z)) continue;

            const scale = 0.8 + Math.random() * 0.8;
            dummy.position.set(x, h, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            trunks.setMatrixAt(count, dummy.matrix);
            crowns.setMatrixAt(count, dummy.matrix);

            // Vary crown color slightly
            crownColor.setHex(0x2a4a1a);
            crownColor.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
            crowns.setColorAt(count, crownColor);

            count++;
        }

        trunks.count = count;
        crowns.count = count;
        trunks.castShadow = true;
        crowns.castShadow = true;
        crowns.receiveShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);

        // Store reference for animation updates
        this.treeCrowns = crowns;
    }

    initWillows() {
        const cfg = this.config.vegetation || {};
        const lightCfg = this.config.lighting || {};
        const windCfg = this.config.wind || {};
        const count = Math.floor((cfg.treeCount || 80) * 0.2);

        // Willow trunk - slightly curved
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 3, 8);
        trunkGeo.translate(0, 1.5, 0);

        // Weeping crown shape
        const crownGeo = new THREE.SphereGeometry(2.5, 12, 8);
        crownGeo.scale(1, 0.6, 1);
        crownGeo.translate(0, 3.5, 0);

        // Calculate sun direction
        const sunElevation = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const sunAzimuth = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);
        const sunDirection = new THREE.Vector3();
        sunDirection.setFromSphericalCoords(1, sunElevation, sunAzimuth);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });

        // Animated willow crown - more sway for weeping effect
        const crownMat = new THREE.ShaderMaterial({
            vertexShader: treeCrownVertexShader,
            fragmentShader: treeCrownFragmentShader,
            uniforms: {
                time: { value: 0 },
                windStrength: { value: (windCfg.swayAmount || 0.2) * 1.5 }, // More sway for willows
                sunDirection: { value: sunDirection },
                sunColor: { value: new THREE.Color(lightCfg.sunColor || 0xffaa55) },
                ambientColor: { value: new THREE.Color(0x6688aa) }
            }
        });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);

        const dummy = new THREE.Object3D();
        const crownColor = new THREE.Color();
        let placed = 0;

        // Willows near water
        for (let i = 0; i < count * 4 && placed < count; i++) {
            const x = (Math.random() - 0.5) * 300;
            const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
            const riverWidth = 8 + Math.sin(x * 0.02) * 4;

            const side = Math.random() > 0.5 ? 1 : -1;
            const z = riverMeander + side * (riverWidth + Math.random() * 15);
            const h = this.getHeight(x, z);

            if (h < 0 || h > 3) continue;

            const scale = 0.9 + Math.random() * 0.5;
            dummy.position.set(x, h, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            trunks.setMatrixAt(placed, dummy.matrix);
            crowns.setMatrixAt(placed, dummy.matrix);

            // Willow crown color
            crownColor.setHex(cfg.willowColor || 0x4a6a3a);
            crownColor.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);
            crowns.setColorAt(placed, crownColor);

            placed++;
        }

        trunks.count = placed;
        crowns.count = placed;
        trunks.castShadow = true;
        crowns.castShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);

        // Store for animation
        this.willowCrowns = crowns;
    }

    initPoplars() {
        const cfg = this.config.vegetation || {};
        const count = Math.floor((cfg.treeCount || 80) * 0.25);

        // Tall narrow poplar shape
        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 4, 6);
        trunkGeo.translate(0, 2, 0);

        const crownGeo = new THREE.ConeGeometry(1.2, 6, 8);
        crownGeo.translate(0, 7, 0);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.85 });
        const crownMat = new THREE.MeshStandardMaterial({
            color: cfg.poplarColor || 0x3a5a2a,
            roughness: 0.75
        });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);

        const dummy = new THREE.Object3D();
        let placed = 0;

        for (let i = 0; i < count * 3 && placed < count; i++) {
            const x = (Math.random() - 0.5) * 320;
            const z = (Math.random() - 0.5) * 320;
            const h = this.getHeight(x, z);

            if (h < 0.5 || h > 7) continue;

            const scale = 0.7 + Math.random() * 0.6;
            dummy.position.set(x, h, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            trunks.setMatrixAt(placed, dummy.matrix);
            crowns.setMatrixAt(placed, dummy.matrix);
            placed++;
        }

        trunks.count = placed;
        crowns.count = placed;
        trunks.castShadow = true;
        crowns.castShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);
    }

    initSpruce() {
        const cfg = this.config.vegetation || {};
        const count = Math.floor((cfg.treeCount || 80) * 0.15);

        // Dark evergreen spruce
        const trunkGeo = new THREE.CylinderGeometry(0.1, 0.18, 2.5, 6);
        trunkGeo.translate(0, 1.25, 0);

        const crownGeo = new THREE.ConeGeometry(1.5, 5, 8);
        crownGeo.translate(0, 5, 0);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
        const crownMat = new THREE.MeshStandardMaterial({
            color: cfg.spruceColor || 0x1a3320,
            roughness: 0.85
        });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);

        const dummy = new THREE.Object3D();
        let placed = 0;

        for (let i = 0; i < count * 4 && placed < count; i++) {
            const x = (Math.random() - 0.5) * 340;
            const z = (Math.random() - 0.5) * 340;
            const h = this.getHeight(x, z);

            // Spruce on higher/drier ground
            if (h < 2 || h > 9) continue;

            const scale = 0.6 + Math.random() * 0.8;
            dummy.position.set(x, h, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            trunks.setMatrixAt(placed, dummy.matrix);
            crowns.setMatrixAt(placed, dummy.matrix);
            placed++;
        }

        trunks.count = placed;
        crowns.count = placed;
        trunks.castShadow = true;
        crowns.castShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);
    }

    initBerryBushes() {
        const cfg = this.config.vegetation || {};
        const count = cfg.bushCount || 40;

        // Low spreading bush shape
        const bushGeo = new THREE.SphereGeometry(0.8, 8, 6);
        bushGeo.scale(1, 0.6, 1);
        bushGeo.translate(0, 0.4, 0);

        const bushMat = new THREE.MeshStandardMaterial({
            color: cfg.berryBushColor || 0x2a4a2a,
            roughness: 0.8
        });

        const bushes = new THREE.InstancedMesh(bushGeo, bushMat, count);

        const dummy = new THREE.Object3D();
        let placed = 0;

        for (let i = 0; i < count * 3 && placed < count; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            const h = this.getHeight(x, z);

            // Bushes on moderate ground
            if (h < 0.3 || h > 4) continue;

            const scale = 0.6 + Math.random() * 0.8;
            dummy.position.set(x, h, z);
            dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.updateMatrix();

            bushes.setMatrixAt(placed, dummy.matrix);
            placed++;
        }

        bushes.count = placed;
        bushes.castShadow = true;
        bushes.receiveShadow = true;

        this.scene.add(bushes);
    }

    update(time) {
        // Update grass animations
        if (this.grassMesh?.material.uniforms) {
            this.grassMesh.material.uniforms.time.value = time;
        }
        if (this.tallGrassMesh?.material.uniforms) {
            this.tallGrassMesh.material.uniforms.time.value = time;
        }
        if (this.reedMesh?.material.uniforms) {
            this.reedMesh.material.uniforms.time.value = time;
        }
        // Update tree crown animations
        if (this.treeCrowns?.material.uniforms) {
            this.treeCrowns.material.uniforms.time.value = time;
        }
        if (this.willowCrowns?.material.uniforms) {
            this.willowCrowns.material.uniforms.time.value = time;
        }
        if (this.poplarCrowns?.material.uniforms) {
            this.poplarCrowns.material.uniforms.time.value = time;
        }
        if (this.spruceCrowns?.material.uniforms) {
            this.spruceCrowns.material.uniforms.time.value = time;
        }
    }
}
