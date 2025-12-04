import * as THREE from 'three';
import { fbm, smoothstep } from './Utils.js';

// Enhanced grass shader with wind and color variation
const grassVertexShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vWindFactor;
    uniform float time;
    uniform float windSpeed;
    uniform float windStrength;

    void main() {
        vUv = uv;
        vColor = instanceColor;

        vec3 pos = position;

        // Wind effect with gusts
        float worldX = instanceMatrix[3][0];
        float worldZ = instanceMatrix[3][2];

        // Multiple wave frequencies for natural wind
        float wave1 = sin(time * windSpeed * 2.0 + worldX * 0.3 + worldZ * 0.2);
        float wave2 = sin(time * windSpeed * 3.5 + worldX * 0.5) * 0.5;
        float wave3 = cos(time * windSpeed * 1.5 + worldZ * 0.4) * 0.3;

        // Gust effect
        float gust = sin(time * 0.5 + worldX * 0.1) * 0.5 + 0.5;
        gust = pow(gust, 3.0);

        float totalWind = (wave1 + wave2 + wave3) * windStrength * (1.0 + gust * 0.5);
        vWindFactor = totalWind;

        // Only bend from base - stronger at top
        float bendFactor = pos.y * pos.y;
        pos.x += totalWind * bendFactor * 0.3;
        pos.z += totalWind * bendFactor * 0.15;

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const grassFragmentShader = `
    varying vec2 vUv;
    varying vec3 vColor;
    varying float vWindFactor;

    void main() {
        // Gradient from dark base to lighter tips
        vec3 baseColor = vColor * 0.4;
        vec3 tipColor = vColor * 1.2;
        vec3 color = mix(baseColor, tipColor, vUv.y);

        // Subtle wind-based color shift (lighter when bent)
        color += vec3(abs(vWindFactor) * 0.05);

        gl_FragColor = vec4(color, 1.0);
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
        const instanceCount = cfg.grassDensity || 50000;

        const geometry = new THREE.PlaneGeometry(0.08, 0.8, 1, 4);
        geometry.translate(0, 0.4, 0);

        const material = new THREE.ShaderMaterial({
            vertexShader: grassVertexShader,
            fragmentShader: grassFragmentShader,
            uniforms: {
                time: { value: 0 },
                windSpeed: { value: windCfg.speed || 1.0 },
                windStrength: { value: windCfg.swayAmount || 0.2 }
            },
            side: THREE.DoubleSide
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
        const instanceCount = Math.floor((cfg.grassDensity || 50000) * 0.15);

        const geometry = new THREE.PlaneGeometry(0.12, 1.5, 1, 6);
        geometry.translate(0, 0.75, 0);

        const material = new THREE.ShaderMaterial({
            vertexShader: grassVertexShader,
            fragmentShader: grassFragmentShader,
            uniforms: {
                time: { value: 0 },
                windSpeed: { value: (this.config.wind?.speed || 1.0) * 0.8 },
                windStrength: { value: (this.config.wind?.swayAmount || 0.2) * 1.3 }
            },
            side: THREE.DoubleSide
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
        // Generic deciduous trees
        const cfg = this.config.vegetation || {};
        const treeCount = Math.floor((cfg.treeCount || 80) * 0.3);

        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
        trunkGeo.translate(0, 1, 0);
        const crownGeo = new THREE.SphereGeometry(1.5, 8, 6);
        crownGeo.translate(0, 3, 0);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
        const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.8 });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);

        const dummy = new THREE.Object3D();
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
            count++;
        }

        trunks.count = count;
        crowns.count = count;
        trunks.castShadow = true;
        crowns.castShadow = true;
        crowns.receiveShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);
    }

    initWillows() {
        const cfg = this.config.vegetation || {};
        const count = Math.floor((cfg.treeCount || 80) * 0.2);

        // Willow trunk - slightly curved
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 3, 8);
        trunkGeo.translate(0, 1.5, 0);

        // Weeping crown shape
        const crownGeo = new THREE.SphereGeometry(2.5, 12, 8);
        crownGeo.scale(1, 0.6, 1);
        crownGeo.translate(0, 3.5, 0);

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 });
        const crownMat = new THREE.MeshStandardMaterial({
            color: cfg.willowColor || 0x4a6a3a,
            roughness: 0.7
        });

        const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        const crowns = new THREE.InstancedMesh(crownGeo, crownMat, count);

        const dummy = new THREE.Object3D();
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
            placed++;
        }

        trunks.count = placed;
        crowns.count = placed;
        trunks.castShadow = true;
        crowns.castShadow = true;

        this.scene.add(trunks);
        this.scene.add(crowns);
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
    }
}
