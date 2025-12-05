import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================================
// FLOATING ISLAND WORLD
// A clean, geometric, Interland-inspired environment
// ============================================================

// Beautiful gradient sky shader
const SkyShader = {
    uniforms: {
        topColor: { value: new THREE.Color(0x0a1628) },      // Deep blue top
        middleColor: { value: new THREE.Color(0x1e3a5f) },   // Mid blue
        bottomColor: { value: new THREE.Color(0xff7e47) },   // Warm orange horizon
        offset: { value: 20 },
        exponent: { value: 0.6 }
    },
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
            float h = normalize(vWorldPosition + offset).y;

            // Three-way gradient: bottom -> middle -> top
            vec3 color;
            if (h < 0.3) {
                color = mix(bottomColor, middleColor, h / 0.3);
            } else {
                color = mix(middleColor, topColor, (h - 0.3) / 0.7);
            }

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Glowing platform shader for islands
const IslandShader = {
    uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x2d5a7b) },
        glowColor: { value: new THREE.Color(0x88ccff) },
        rimPower: { value: 2.0 }
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        uniform float rimPower;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;

        void main() {
            vec3 viewDir = normalize(vViewPosition);
            float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
            rim = pow(rim, rimPower);

            // Subtle pulse
            float pulse = sin(time * 2.0) * 0.1 + 0.9;

            vec3 color = mix(baseColor, glowColor, rim * pulse);

            // Add slight gradient from center
            float centerGlow = 1.0 - length(vUv - 0.5) * 0.5;
            color += glowColor * centerGlow * 0.1;

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Bridge/connection shader
const BridgeShader = {
    uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x88ccff) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;

        void main() {
            // Flowing energy effect
            float flow = fract(vUv.x - time * 0.5);
            float glow = pow(sin(flow * 3.14159), 2.0);

            // Fade at edges
            float edgeFade = sin(vUv.x * 3.14159);

            float alpha = glow * edgeFade * 0.8;
            gl_FragColor = vec4(color, alpha);
        }
    `
};

export class IslandWorld {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.islands = [];
        this.bridges = [];
        this.stations = [];
        this.particles = null;

        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 2000);
        this.camera.position.set(0, 80, 180);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Post-processing
        this.setupPostProcessing();

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 400;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
        this.controls.target.set(0, 20, 0);

        this.clock = new THREE.Clock();

        this.init();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom for glowing elements
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.8,    // strength
            0.4,    // radius
            0.85    // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    init() {
        this.createSky();
        this.createLighting();
        this.createIslands();
        this.createBridges();
        this.createStations();
        this.createParticles();
        this.createClouds();

        window.addEventListener('resize', () => this.onResize());
    }

    createSky() {
        const skyGeo = new THREE.SphereGeometry(1000, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: SkyShader.uniforms,
            vertexShader: SkyShader.vertexShader,
            fragmentShader: SkyShader.fragmentShader,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    createLighting() {
        // Soft ambient light
        const ambient = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambient);

        // Main directional light (warm)
        const sunLight = new THREE.DirectionalLight(0xffaa66, 1.5);
        sunLight.position.set(100, 150, 50);
        this.scene.add(sunLight);

        // Fill light (cool)
        const fillLight = new THREE.DirectionalLight(0x6688cc, 0.5);
        fillLight.position.set(-100, 50, -50);
        this.scene.add(fillLight);

        // Rim light from below (mystical glow)
        const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        rimLight.position.set(0, -100, 0);
        this.scene.add(rimLight);
    }

    createIslands() {
        // Island layout - central hub with surrounding platforms
        const islandData = [
            // Central Hub Island (largest)
            { x: 0, y: 0, z: 0, scale: 2.0, type: 'hub', color: 0x2d5a7b },

            // Inner ring - 5 Cabin islands
            { x: -60, y: 15, z: -40, scale: 1.2, type: 'cabin', num: 1, color: 0x4a7c59 },
            { x: 60, y: 10, z: -40, scale: 1.2, type: 'cabin', num: 2, color: 0x7c594a },
            { x: -80, y: 5, z: 40, scale: 1.2, type: 'cabin', num: 3, color: 0x594a7c },
            { x: 80, y: 8, z: 40, scale: 1.2, type: 'cabin', num: 4, color: 0x7c6b4a },
            { x: 0, y: 20, z: -80, scale: 1.2, type: 'cabin', num: 5, color: 0x4a6b7c },

            // Outer ring - Cultural experience islands
            { x: -120, y: -5, z: 0, scale: 1.0, type: 'fire', num: 1, color: 0xff6633 },   // Infinite Loom
            { x: 120, y: -8, z: 0, scale: 1.0, type: 'fire', num: 2, color: 0xff9933 },   // Language
            { x: -100, y: 12, z: -80, scale: 1.0, type: 'fire', num: 3, color: 0x33ff66 }, // Medicine Wheel
            { x: 100, y: 15, z: -80, scale: 1.0, type: 'fire', num: 4, color: 0x6633ff }, // Beadwork
            { x: -100, y: -3, z: 80, scale: 1.0, type: 'fire', num: 5, color: 0x33ccff }, // Nature Math
            { x: 100, y: 2, z: 80, scale: 1.0, type: 'fire', num: 6, color: 0xff33cc },   // Circle Stories

            // Special islands
            { x: 0, y: -10, z: 100, scale: 1.0, type: 'herb', color: 0x66cc66 },      // Medicine Garden
            { x: -60, y: 25, z: -120, scale: 0.9, type: 'logpile', color: 0xaa8855 }, // Architecture
            { x: 60, y: 22, z: -120, scale: 0.9, type: 'garden', color: 0x88cc44 },   // Farming
            { x: -140, y: 5, z: 60, scale: 0.9, type: 'cart', color: 0x996633 },      // Cart
            { x: 140, y: 8, z: 60, scale: 0.9, type: 'fishing', color: 0x3399ff },    // Fishing
            { x: 0, y: 30, z: -140, scale: 0.9, type: 'memorial', color: 0xcc6600 },  // Memorial
        ];

        islandData.forEach(data => {
            const island = this.createIsland(data);
            this.islands.push({ mesh: island, data: data });
        });
    }

    createIsland(data) {
        const group = new THREE.Group();

        // Main platform - hexagonal prism
        const platformGeo = new THREE.CylinderGeometry(
            15 * data.scale,      // top radius
            18 * data.scale,      // bottom radius (slightly larger for stability look)
            8 * data.scale,       // height
            6,                    // hexagonal
            1
        );

        const platformMat = new THREE.ShaderMaterial({
            uniforms: {
                ...IslandShader.uniforms,
                baseColor: { value: new THREE.Color(data.color) },
                glowColor: { value: new THREE.Color(data.color).multiplyScalar(1.5) }
            },
            vertexShader: IslandShader.vertexShader,
            fragmentShader: IslandShader.fragmentShader
        });

        const platform = new THREE.Mesh(platformGeo, platformMat);
        group.add(platform);

        // Floating crystals underneath (decorative)
        const crystalCount = Math.floor(3 + Math.random() * 3);
        for (let i = 0; i < crystalCount; i++) {
            const crystalGeo = new THREE.OctahedronGeometry(1.5 * data.scale + Math.random() * 2);
            const crystalMat = new THREE.MeshStandardMaterial({
                color: data.color,
                emissive: data.color,
                emissiveIntensity: 0.3,
                metalness: 0.3,
                roughness: 0.4
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);

            const angle = (i / crystalCount) * Math.PI * 2;
            const radius = 8 * data.scale + Math.random() * 5;
            crystal.position.set(
                Math.cos(angle) * radius,
                -6 * data.scale - Math.random() * 8,
                Math.sin(angle) * radius
            );
            crystal.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(crystal);
        }

        // Add glowing rim ring on top
        const ringGeo = new THREE.TorusGeometry(14 * data.scale, 0.3, 8, 6);
        const ringMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(data.color).multiplyScalar(2),
            transparent: true,
            opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 4 * data.scale;
        group.add(ring);

        // Store reference to animated materials
        group.userData = {
            platformMat: platformMat,
            type: data.type,
            num: data.num
        };

        group.position.set(data.x, data.y, data.z);
        this.scene.add(group);

        return group;
    }

    createBridges() {
        // Connect islands with glowing energy bridges
        const connections = [
            // Hub to inner ring (cabins)
            [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
            // Inner to outer ring
            [1, 6], [2, 7], [3, 11], [4, 12], [5, 13],
            // Additional connections for accessibility
            [1, 8], [2, 9], [3, 10], [4, 15], [5, 16], [5, 17]
        ];

        connections.forEach(([fromIdx, toIdx]) => {
            if (this.islands[fromIdx] && this.islands[toIdx]) {
                const bridge = this.createBridge(
                    this.islands[fromIdx].data,
                    this.islands[toIdx].data
                );
                this.bridges.push(bridge);
            }
        });
    }

    createBridge(from, to) {
        const start = new THREE.Vector3(from.x, from.y + 4, from.z);
        const end = new THREE.Vector3(to.x, to.y + 4, to.z);

        // Create curved path
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y += 10; // Arc upward

        const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);

        // Create tube geometry along curve
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.5, 8, false);
        const tubeMat = new THREE.ShaderMaterial({
            uniforms: {
                ...BridgeShader.uniforms,
                color: { value: new THREE.Color(0x88ccff) }
            },
            vertexShader: BridgeShader.vertexShader,
            fragmentShader: BridgeShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        const bridge = new THREE.Mesh(tubeGeo, tubeMat);
        this.scene.add(bridge);

        return { mesh: bridge, material: tubeMat };
    }

    createStations() {
        // Create visual markers for each station type
        this.islands.forEach((island, idx) => {
            if (idx === 0) return; // Skip hub

            const marker = this.createStationMarker(island.data);
            marker.position.set(
                island.data.x,
                island.data.y + 8 * island.data.scale,
                island.data.z
            );
            this.scene.add(marker);
            this.stations.push(marker);
        });
    }

    createStationMarker(data) {
        const group = new THREE.Group();

        // Different marker styles based on type
        let geometry, material, light;

        switch(data.type) {
            case 'cabin':
                // Floating number orb for cabins
                geometry = new THREE.IcosahedronGeometry(3, 1);
                material = new THREE.MeshStandardMaterial({
                    color: 0xffaa44,
                    emissive: 0xffaa44,
                    emissiveIntensity: 0.8,
                    metalness: 0.5,
                    roughness: 0.2
                });
                light = new THREE.PointLight(0xffaa44, 2, 30);

                // Add number
                this.addNumberToMarker(group, data.num);
                break;

            case 'fire':
                // Flame-like crystal
                geometry = new THREE.ConeGeometry(2, 6, 4);
                material = new THREE.MeshStandardMaterial({
                    color: data.color,
                    emissive: data.color,
                    emissiveIntensity: 0.6,
                    metalness: 0.3,
                    roughness: 0.4
                });
                light = new THREE.PointLight(data.color, 1.5, 25);
                break;

            case 'herb':
                // Leaf-like diamond
                geometry = new THREE.OctahedronGeometry(3);
                material = new THREE.MeshStandardMaterial({
                    color: 0x66cc66,
                    emissive: 0x44aa44,
                    emissiveIntensity: 0.5
                });
                light = new THREE.PointLight(0x66cc66, 1.5, 25);
                break;

            case 'memorial':
                // Candle-like pillar
                geometry = new THREE.CylinderGeometry(1, 1.5, 5, 8);
                material = new THREE.MeshStandardMaterial({
                    color: 0xcc6600,
                    emissive: 0xff8800,
                    emissiveIntensity: 0.4
                });
                light = new THREE.PointLight(0xff8800, 1, 20);
                break;

            default:
                // Generic glowing orb
                geometry = new THREE.SphereGeometry(2.5, 16, 16);
                material = new THREE.MeshStandardMaterial({
                    color: data.color,
                    emissive: data.color,
                    emissiveIntensity: 0.5,
                    metalness: 0.4,
                    roughness: 0.3
                });
                light = new THREE.PointLight(data.color, 1.5, 25);
        }

        const marker = new THREE.Mesh(geometry, material);
        group.add(marker);

        if (light) {
            light.position.y = 2;
            group.add(light);
        }

        // Store data for interaction
        group.userData = {
            type: data.type,
            num: data.num,
            isStation: true
        };

        return group;
    }

    addNumberToMarker(group, num) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(num.toString(), 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(4, 4, 1);
        sprite.position.y = 0;
        group.add(sprite);
    }

    createParticles() {
        // Floating particles throughout the scene
        const particleCount = 2000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color1 = new THREE.Color(0x88ccff);
        const color2 = new THREE.Color(0xffaa66);

        for (let i = 0; i < particleCount; i++) {
            // Spread particles in a large volume
            positions[i * 3] = (Math.random() - 0.5) * 500;
            positions[i * 3 + 1] = Math.random() * 150 - 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 500;

            // Random color blend
            const blend = Math.random();
            const color = new THREE.Color().lerpColors(color1, color2, blend);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createClouds() {
        // Soft volumetric clouds
        const cloudCount = 30;
        const cloudGeo = new THREE.SphereGeometry(1, 8, 8);

        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();

            // Each cloud is a cluster of spheres
            const sphereCount = 5 + Math.floor(Math.random() * 5);
            for (let j = 0; j < sphereCount; j++) {
                const cloudMat = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.15 + Math.random() * 0.1
                });

                const sphere = new THREE.Mesh(cloudGeo, cloudMat);
                const scale = 8 + Math.random() * 15;
                sphere.scale.set(scale, scale * 0.5, scale);
                sphere.position.set(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 20
                );
                cloudGroup.add(sphere);
            }

            cloudGroup.position.set(
                (Math.random() - 0.5) * 600,
                50 + Math.random() * 80,
                (Math.random() - 0.5) * 600
            );

            cloudGroup.userData.speed = 0.5 + Math.random() * 1;
            this.scene.add(cloudGroup);
        }
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);

        if (this.bloomPass) {
            this.bloomPass.resolution.set(this.width, this.height);
        }
    }

    update(time) {
        // Animate island materials
        this.islands.forEach((island, idx) => {
            if (island.mesh.userData.platformMat) {
                island.mesh.userData.platformMat.uniforms.time.value = time;
            }

            // Gentle floating motion
            island.mesh.position.y = island.data.y + Math.sin(time * 0.5 + idx) * 2;
        });

        // Animate bridges
        this.bridges.forEach(bridge => {
            if (bridge.material.uniforms) {
                bridge.material.uniforms.time.value = time;
            }
        });

        // Animate station markers
        this.stations.forEach((station, idx) => {
            station.rotation.y = time * 0.5 + idx;
            station.position.y += Math.sin(time * 2 + idx * 0.5) * 0.02;
        });

        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time + positions[i] * 0.01) * 0.02;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y = time * 0.02;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = this.clock.getElapsedTime();

        this.controls.update();
        this.update(time);
        this.composer.render();
    }

    // Get station positions for InteractionManager
    getStationPositions() {
        return {
            cabins: [
                { x: -60, y: 15, z: -40 },   // Cabin 1
                { x: 60, y: 10, z: -40 },    // Cabin 2
                { x: -80, y: 5, z: 40 },     // Cabin 3
                { x: 80, y: 8, z: 40 },      // Cabin 4
                { x: 0, y: 20, z: -80 },     // Cabin 5
            ],
            fires: [
                { x: -120, y: -5, z: 0 },    // Fire 1 - Infinite Loom
                { x: 120, y: -8, z: 0 },     // Fire 2 - Language
                { x: -100, y: 12, z: -80 },  // Fire 3 - Medicine Wheel
                { x: 100, y: 15, z: -80 },   // Fire 4 - Beadwork
                { x: -100, y: -3, z: 80 },   // Fire 5 - Nature Math
                { x: 100, y: 2, z: 80 },     // Fire 6 - Circle Stories
            ],
            herb: { x: 0, y: -10, z: 100 },
            logpile: { x: -60, y: 25, z: -120 },
            garden: { x: 60, y: 22, z: -120 },
            cart: { x: -140, y: 5, z: 60 },
            fishing: { x: 140, y: 8, z: 60 },
            memorial: { x: 0, y: 30, z: -140 }
        };
    }
}
