import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================================
// CRYSTAL GARDEN WORLD
// Ethereal crystalline landscape with gem-like structures
// ============================================================

// Deep space gradient sky
const SkyShader = {
    uniforms: {
        topColor: { value: new THREE.Color(0x0a0015) },      // Deep purple-black
        middleColor: { value: new THREE.Color(0x1a1040) },   // Dark purple
        bottomColor: { value: new THREE.Color(0x2a3050) },   // Muted blue
        starDensity: { value: 0.3 }
    },
    vertexShader: `
        varying vec3 vPosition;
        void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 middleColor;
        uniform vec3 bottomColor;
        varying vec3 vPosition;

        // Simple star field
        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
            float h = normalize(vPosition).y;

            vec3 color;
            if (h < 0.0) {
                color = mix(bottomColor * 0.3, bottomColor, smoothstep(-0.5, 0.0, h));
            } else if (h < 0.4) {
                color = mix(bottomColor, middleColor, h / 0.4);
            } else {
                color = mix(middleColor, topColor, (h - 0.4) / 0.6);
            }

            // Add subtle stars in upper hemisphere
            if (h > 0.2) {
                vec2 starUV = vPosition.xz * 0.01;
                float star = hash(floor(starUV * 200.0));
                star = step(0.998, star) * (h - 0.2);
                color += vec3(star * 0.8);
            }

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// Crystal material shader with internal glow
const CrystalShader = {
    uniforms: {
        time: { value: 0 },
        baseColor: { value: new THREE.Color(0x4080a0) },
        glowColor: { value: new THREE.Color(0x80ffff) },
        opacity: { value: 0.85 }
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = -mvPosition.xyz;
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 glowColor;
        uniform float opacity;
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
            vec3 viewDir = normalize(vViewPosition);

            // Fresnel rim effect
            float rim = 1.0 - abs(dot(viewDir, vNormal));
            rim = pow(rim, 2.0);

            // Internal glow pulse
            float pulse = sin(time * 1.5 + vWorldPosition.y * 0.5) * 0.15 + 0.85;

            // Facet highlighting
            float facet = abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
            facet = pow(facet, 0.5) * 0.3;

            vec3 color = mix(baseColor, glowColor, rim * 0.7 + facet);
            color *= pulse;

            // Add sparkle at certain angles
            float sparkle = pow(max(dot(reflect(-viewDir, vNormal), vec3(0.5, 0.8, 0.3)), 0.0), 32.0);
            color += glowColor * sparkle * 0.5;

            gl_FragColor = vec4(color, opacity + rim * 0.15);
        }
    `
};

export class CrystalWorld {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.crystals = [];
        this.stations = [];
        this.particles = null;

        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 2000);
        this.camera.position.set(0, 60, 150);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        this.setupPostProcessing();

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 40;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
        this.controls.target.set(0, 10, 0);

        this.clock = new THREE.Clock();

        this.init();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Strong bloom for crystal glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            1.2,    // strength - higher for crystals
            0.5,    // radius
            0.7     // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    init() {
        this.createSky();
        this.createLighting();
        this.createGround();
        this.createCrystalFormations();
        this.createStations();
        this.createAmbientCrystals();
        this.createParticles();

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
        // Ambient - cool tint
        const ambient = new THREE.AmbientLight(0x303050, 0.4);
        this.scene.add(ambient);

        // Main light - warm gold from above
        const mainLight = new THREE.DirectionalLight(0xffddaa, 1.2);
        mainLight.position.set(50, 100, 30);
        this.scene.add(mainLight);

        // Accent light - cool cyan from side
        const accentLight = new THREE.DirectionalLight(0x40ffff, 0.6);
        accentLight.position.set(-80, 40, -50);
        this.scene.add(accentLight);

        // Purple rim light from below
        const rimLight = new THREE.DirectionalLight(0x8040ff, 0.3);
        rimLight.position.set(0, -50, 0);
        this.scene.add(rimLight);
    }

    createGround() {
        // Faceted crystalline ground plane
        const groundGeo = new THREE.PlaneGeometry(400, 400, 80, 80);
        groundGeo.rotateX(-Math.PI / 2);

        const positions = groundGeo.attributes.position;
        const colors = [];

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);

            // Create crystalline height variation
            let h = 0;
            h += Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3;
            h += Math.sin(x * 0.1 + z * 0.1) * 2;

            // Add some sharp facets
            const facetNoise = Math.sin(x * 0.2) * Math.sin(z * 0.2);
            if (facetNoise > 0.7) {
                h += facetNoise * 4;
            }

            positions.setY(i, h);

            // Color gradient - deep purple to teal
            const distFromCenter = Math.sqrt(x * x + z * z) / 200;
            const baseColor = new THREE.Color(0x1a1030);
            const edgeColor = new THREE.Color(0x203040);
            const color = baseColor.clone().lerp(edgeColor, distFromCenter);

            // Add slight variation
            color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
            colors.push(color.r, color.g, color.b);
        }

        groundGeo.computeVertexNormals();
        groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const groundMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.3,
            metalness: 0.7,
            flatShading: true  // Gives faceted crystal look
        });

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createCrystalFormations() {
        // Main station crystal clusters - positioned for the 18 experiences
        const stationData = [
            // 5 Elder crystals (large, prominent)
            { x: -50, z: -30, scale: 1.5, type: 'cabin', num: 1, color: 0xffaa44 },
            { x: 50, z: -30, scale: 1.5, type: 'cabin', num: 2, color: 0xffaa44 },
            { x: -70, z: 30, scale: 1.5, type: 'cabin', num: 3, color: 0xffaa44 },
            { x: 70, z: 30, scale: 1.5, type: 'cabin', num: 4, color: 0xffaa44 },
            { x: 0, z: -60, scale: 1.5, type: 'cabin', num: 5, color: 0xffaa44 },

            // 6 Fire experience crystals
            { x: -100, z: 0, scale: 1.2, type: 'fire', num: 1, color: 0xff6644 },
            { x: 100, z: 0, scale: 1.2, type: 'fire', num: 2, color: 0xff8844 },
            { x: -80, z: -60, scale: 1.2, type: 'fire', num: 3, color: 0x44ff88 },
            { x: 80, z: -60, scale: 1.2, type: 'fire', num: 4, color: 0x8844ff },
            { x: -80, z: 60, scale: 1.2, type: 'fire', num: 5, color: 0x44ddff },
            { x: 80, z: 60, scale: 1.2, type: 'fire', num: 6, color: 0xff44aa },

            // Special experience crystals
            { x: 0, z: 80, scale: 1.0, type: 'herb', color: 0x66dd66 },
            { x: -50, z: -90, scale: 1.0, type: 'logpile', color: 0xddaa55 },
            { x: 50, z: -90, scale: 1.0, type: 'garden', color: 0x99dd44 },
            { x: -120, z: 50, scale: 1.0, type: 'cart', color: 0xaa8866 },
            { x: 120, z: 50, scale: 1.0, type: 'fishing', color: 0x4488dd },
            { x: 0, z: -100, scale: 1.0, type: 'memorial', color: 0xdd8844 },
        ];

        stationData.forEach(data => {
            const crystal = this.createCrystalCluster(data);
            this.crystals.push({ group: crystal, data: data });
        });
    }

    createCrystalCluster(data) {
        const group = new THREE.Group();

        // Main crystal spire
        const mainHeight = 15 * data.scale;
        const mainGeo = new THREE.ConeGeometry(3 * data.scale, mainHeight, 6, 1);

        const crystalMat = new THREE.ShaderMaterial({
            uniforms: {
                ...CrystalShader.uniforms,
                baseColor: { value: new THREE.Color(data.color).multiplyScalar(0.5) },
                glowColor: { value: new THREE.Color(data.color) }
            },
            vertexShader: CrystalShader.vertexShader,
            fragmentShader: CrystalShader.fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        const mainCrystal = new THREE.Mesh(mainGeo, crystalMat);
        mainCrystal.position.y = mainHeight / 2 + 2;
        mainCrystal.rotation.y = Math.random() * Math.PI;
        group.add(mainCrystal);

        // Surrounding smaller crystals
        const smallCount = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < smallCount; i++) {
            const height = 5 + Math.random() * 8 * data.scale;
            const smallGeo = new THREE.ConeGeometry(1 + Math.random() * 1.5, height, 5, 1);

            const smallMat = crystalMat.clone();
            smallMat.uniforms = {
                ...CrystalShader.uniforms,
                baseColor: { value: new THREE.Color(data.color).multiplyScalar(0.4) },
                glowColor: { value: new THREE.Color(data.color).multiplyScalar(0.8) }
            };

            const smallCrystal = new THREE.Mesh(smallGeo, smallMat);

            const angle = (i / smallCount) * Math.PI * 2 + Math.random() * 0.5;
            const radius = 4 + Math.random() * 3;
            smallCrystal.position.set(
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
            );
            smallCrystal.rotation.set(
                (Math.random() - 0.5) * 0.3,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.3
            );
            group.add(smallCrystal);
        }

        // Point light inside crystal
        const light = new THREE.PointLight(data.color, 2, 30);
        light.position.y = mainHeight / 2;
        group.add(light);

        group.position.set(data.x, 0, data.z);
        group.userData = { type: data.type, num: data.num };
        this.scene.add(group);

        return group;
    }

    createStations() {
        // Station markers are integrated into the crystal formations
        // The crystals themselves serve as the clickable stations
    }

    createAmbientCrystals() {
        // Scatter small decorative crystals around
        const ambientCount = 80;
        const crystalGeo = new THREE.ConeGeometry(0.5, 3, 5, 1);

        for (let i = 0; i < ambientCount; i++) {
            const x = (Math.random() - 0.5) * 350;
            const z = (Math.random() - 0.5) * 350;

            // Skip if too close to center or stations
            if (Math.sqrt(x*x + z*z) < 30) continue;

            const hue = 0.5 + Math.random() * 0.3; // Teal to purple range
            const color = new THREE.Color().setHSL(hue, 0.6, 0.4);

            const mat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                metalness: 0.8,
                roughness: 0.2,
                transparent: true,
                opacity: 0.7
            });

            const crystal = new THREE.Mesh(crystalGeo, mat);
            crystal.position.set(x, 1.5 + Math.random() * 2, z);
            crystal.rotation.set(
                (Math.random() - 0.5) * 0.4,
                Math.random() * Math.PI,
                (Math.random() - 0.5) * 0.4
            );
            crystal.scale.setScalar(0.5 + Math.random() * 1);
            this.scene.add(crystal);
        }
    }

    createParticles() {
        // Floating luminescent particles
        const particleCount = 1500;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 400;
            positions[i * 3 + 1] = Math.random() * 100 + 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

            // Color range: cyan to purple to gold
            const hue = Math.random() < 0.7 ?
                0.5 + Math.random() * 0.2 :  // Cyan/teal
                0.1 + Math.random() * 0.1;   // Gold
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
        this.composer.setSize(this.width, this.height);
    }

    update(time) {
        // Animate crystal materials
        this.crystals.forEach((crystal, idx) => {
            crystal.group.children.forEach(child => {
                if (child.material && child.material.uniforms && child.material.uniforms.time) {
                    child.material.uniforms.time.value = time;
                }
            });
            // Gentle floating
            crystal.group.position.y = Math.sin(time * 0.5 + idx) * 0.5;
        });

        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time + positions[i] * 0.01) * 0.02;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y = time * 0.01;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = this.clock.getElapsedTime();
        this.controls.update();
        this.update(time);
        this.composer.render();
    }

    getStationPositions() {
        return {
            cabins: [
                { x: -50, y: 8, z: -30 },
                { x: 50, y: 8, z: -30 },
                { x: -70, y: 8, z: 30 },
                { x: 70, y: 8, z: 30 },
                { x: 0, y: 8, z: -60 },
            ],
            fires: [
                { x: -100, y: 6, z: 0 },
                { x: 100, y: 6, z: 0 },
                { x: -80, y: 6, z: -60 },
                { x: 80, y: 6, z: -60 },
                { x: -80, y: 6, z: 60 },
                { x: 80, y: 6, z: 60 },
            ],
            herb: { x: 0, y: 5, z: 80 },
            logpile: { x: -50, y: 5, z: -90 },
            garden: { x: 50, y: 5, z: -90 },
            cart: { x: -120, y: 5, z: 50 },
            fishing: { x: 120, y: 5, z: 50 },
            memorial: { x: 0, y: 5, z: -100 }
        };
    }
}
