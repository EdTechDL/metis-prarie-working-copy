import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================================
// ISOMETRIC DIORAMA WORLD
// A warm, paper-craft style miniature village scene
// ============================================================

export class DioramaWorld {
    constructor(container, config) {
        this.container = container;
        this.config = config;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.buildings = [];
        this.trees = [];

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5e6d3); // Warm paper color

        // Isometric-ish camera
        this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.1, 1000);
        this.camera.position.set(120, 100, 120);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        this.setupPostProcessing();

        // Controls - limited for diorama feel
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 80;
        this.controls.maxDistance = 200;
        this.controls.maxPolarAngle = Math.PI / 2.5;
        this.controls.minPolarAngle = Math.PI / 6;
        this.controls.target.set(0, 0, 0);

        this.clock = new THREE.Clock();

        this.init();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Subtle bloom for warmth
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.3,
            0.8,
            0.9
        );
        this.composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    init() {
        this.createLighting();
        this.createBase();
        this.createTerrain();
        this.createBuildings();
        this.createPaths();
        this.createTrees();
        this.createDecorations();

        window.addEventListener('resize', () => this.onResize());
    }

    createLighting() {
        // Warm ambient
        const ambient = new THREE.AmbientLight(0xffeedd, 0.5);
        this.scene.add(ambient);

        // Main sun light - warm golden
        const sunLight = new THREE.DirectionalLight(0xffddaa, 1.2);
        sunLight.position.set(50, 80, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.camera.left = -80;
        sunLight.shadow.camera.right = 80;
        sunLight.shadow.camera.top = 80;
        sunLight.shadow.camera.bottom = -80;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        // Fill light - cool blue
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
        fillLight.position.set(-30, 40, -20);
        this.scene.add(fillLight);

        // Hemisphere light for natural feel
        const hemiLight = new THREE.HemisphereLight(0xffeebb, 0x8d7a5a, 0.4);
        this.scene.add(hemiLight);
    }

    createBase() {
        // Circular base platform - like a museum diorama
        const baseGeo = new THREE.CylinderGeometry(75, 78, 4, 64);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.8,
            metalness: 0.1
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -2;
        base.receiveShadow = true;
        this.scene.add(base);

        // Wooden rim
        const rimGeo = new THREE.TorusGeometry(76.5, 1.5, 8, 64);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033,
            roughness: 0.6,
            metalness: 0.2
        });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0;
        this.scene.add(rim);
    }

    createTerrain() {
        // Grass layer - stylized low-poly
        const terrainGeo = new THREE.CylinderGeometry(72, 72, 2, 32);
        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0x7cb342,
            roughness: 0.9,
            metalness: 0,
            flatShading: true
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.position.y = 0;
        terrain.receiveShadow = true;
        this.scene.add(terrain);

        // Small river/stream through center
        this.createRiver();
    }

    createRiver() {
        const riverPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-75, 1.1, 10),
            new THREE.Vector3(-40, 1.1, 5),
            new THREE.Vector3(-10, 1.1, -5),
            new THREE.Vector3(20, 1.1, 0),
            new THREE.Vector3(50, 1.1, 10),
            new THREE.Vector3(75, 1.1, 15)
        ]);

        const riverGeo = new THREE.TubeGeometry(riverPath, 50, 3, 8, false);
        const riverMat = new THREE.MeshStandardMaterial({
            color: 0x4a90a4,
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.9
        });
        const river = new THREE.Mesh(riverGeo, riverMat);
        this.scene.add(river);
    }

    createBuildings() {
        // Building positions for 18 stations
        const buildingData = [
            // 5 Elder huts - larger, distinctive
            { x: -35, z: -25, type: 'elder', num: 1, color: 0xd4a574, roofColor: 0x8b4513 },
            { x: 35, z: -25, type: 'elder', num: 2, color: 0xc9a86c, roofColor: 0x6b3a0a },
            { x: -45, z: 25, type: 'elder', num: 3, color: 0xdeb887, roofColor: 0x8b5a2b },
            { x: 45, z: 25, type: 'elder', num: 4, color: 0xd2b48c, roofColor: 0x704214 },
            { x: 0, z: -45, type: 'elder', num: 5, color: 0xcdb891, roofColor: 0x8b6914 },

            // 6 Fire circles
            { x: -55, z: 0, type: 'fire', num: 1, color: 0xff6633 },
            { x: 55, z: 0, type: 'fire', num: 2, color: 0xff8844 },
            { x: -40, z: -45, type: 'fire', num: 3, color: 0x44aa66 },
            { x: 40, z: -45, type: 'fire', num: 4, color: 0x6644aa },
            { x: -50, z: 40, type: 'fire', num: 5, color: 0x44aacc },
            { x: 50, z: 40, type: 'fire', num: 6, color: 0xcc44aa },

            // Special buildings
            { x: 0, z: 50, type: 'herb', color: 0x66aa55 },
            { x: -25, z: -55, type: 'logpile', color: 0xaa8855 },
            { x: 25, z: -55, type: 'garden', color: 0x88bb44 },
            { x: -60, z: 30, type: 'cart', color: 0x996644 },
            { x: 60, z: -20, type: 'fishing', color: 0x4488bb },
            { x: 0, z: -60, type: 'memorial', color: 0xcc8844 },
        ];

        buildingData.forEach(data => {
            const building = this.createBuilding(data);
            this.buildings.push({ group: building, data: data });
        });
    }

    createBuilding(data) {
        const group = new THREE.Group();

        if (data.type === 'elder') {
            // Paper-craft style hut
            const hut = this.createHut(data);
            group.add(hut);
        } else if (data.type === 'fire') {
            // Fire circle with stones
            const fireCircle = this.createFireCircle(data);
            group.add(fireCircle);
        } else if (data.type === 'herb') {
            // Garden bed
            const garden = this.createGardenBed(data, 'herb');
            group.add(garden);
        } else if (data.type === 'garden') {
            const garden = this.createGardenBed(data, 'crops');
            group.add(garden);
        } else if (data.type === 'logpile') {
            const logs = this.createLogPile(data);
            group.add(logs);
        } else if (data.type === 'cart') {
            const cart = this.createCart(data);
            group.add(cart);
        } else if (data.type === 'fishing') {
            const dock = this.createDock(data);
            group.add(dock);
        } else if (data.type === 'memorial') {
            const memorial = this.createMemorial(data);
            group.add(memorial);
        }

        group.position.set(data.x, 1, data.z);
        group.userData = { type: data.type, num: data.num };
        this.scene.add(group);

        return group;
    }

    createHut(data) {
        const group = new THREE.Group();

        // Base/walls - simple box
        const wallGeo = new THREE.BoxGeometry(10, 6, 10);
        const wallMat = new THREE.MeshStandardMaterial({
            color: data.color,
            roughness: 0.9,
            flatShading: true
        });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.position.y = 3;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);

        // Roof - pyramid
        const roofGeo = new THREE.ConeGeometry(8, 5, 4);
        const roofMat = new THREE.MeshStandardMaterial({
            color: data.roofColor,
            roughness: 0.8,
            flatShading: true
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 8.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Door
        const doorGeo = new THREE.BoxGeometry(2.5, 4, 0.5);
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x4a3728,
            roughness: 0.7
        });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 2, 5.3);
        group.add(door);

        // Number marker
        const markerGeo = new THREE.CircleGeometry(2, 16);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0xffcc44,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.set(0, 12, 0);
        marker.rotation.x = -Math.PI / 4;
        group.add(marker);

        return group;
    }

    createFireCircle(data) {
        const group = new THREE.Group();

        // Stone ring
        const stoneCount = 8;
        const stoneGeo = new THREE.DodecahedronGeometry(1.2, 0);

        for (let i = 0; i < stoneCount; i++) {
            const stoneMat = new THREE.MeshStandardMaterial({
                color: 0x888888,
                roughness: 0.9,
                flatShading: true
            });
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            const angle = (i / stoneCount) * Math.PI * 2;
            stone.position.set(Math.cos(angle) * 4, 0.6, Math.sin(angle) * 4);
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            stone.castShadow = true;
            group.add(stone);
        }

        // Fire glow
        const fireGeo = new THREE.ConeGeometry(1.5, 3, 6);
        const fireMat = new THREE.MeshBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.8
        });
        const fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.y = 1.5;
        group.add(fire);

        // Point light
        const light = new THREE.PointLight(data.color, 1, 15);
        light.position.y = 2;
        group.add(light);

        return group;
    }

    createGardenBed(data, type) {
        const group = new THREE.Group();

        // Raised bed
        const bedGeo = new THREE.BoxGeometry(8, 1.5, 8);
        const bedMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033,
            roughness: 0.9
        });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = 0.75;
        bed.castShadow = true;
        group.add(bed);

        // Soil top
        const soilGeo = new THREE.BoxGeometry(7, 0.3, 7);
        const soilMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 1
        });
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.position.y = 1.5;
        group.add(soil);

        // Plants
        const plantColor = type === 'herb' ? 0x66aa55 : 0x88bb44;
        for (let i = 0; i < 9; i++) {
            const plantGeo = new THREE.ConeGeometry(0.5, 1.5, 4);
            const plantMat = new THREE.MeshStandardMaterial({
                color: plantColor,
                flatShading: true
            });
            const plant = new THREE.Mesh(plantGeo, plantMat);
            const row = Math.floor(i / 3) - 1;
            const col = (i % 3) - 1;
            plant.position.set(col * 2, 2.2, row * 2);
            group.add(plant);
        }

        return group;
    }

    createLogPile(data) {
        const group = new THREE.Group();

        const logGeo = new THREE.CylinderGeometry(0.8, 0.8, 6, 8);
        const logMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            roughness: 0.9
        });

        // Stack of logs
        const positions = [
            [0, 0.8, 0], [1.8, 0.8, 0], [-1.8, 0.8, 0],
            [0.9, 2.2, 0], [-0.9, 2.2, 0],
            [0, 3.4, 0]
        ];

        positions.forEach(pos => {
            const log = new THREE.Mesh(logGeo, logMat);
            log.position.set(pos[0], pos[1], pos[2]);
            log.rotation.z = Math.PI / 2;
            log.castShadow = true;
            group.add(log);
        });

        return group;
    }

    createCart(data) {
        const group = new THREE.Group();

        // Cart body
        const bodyGeo = new THREE.BoxGeometry(6, 2, 4);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,
            roughness: 0.8
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2.5;
        body.castShadow = true;
        group.add(body);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033,
            roughness: 0.7
        });

        [-2.5, 2.5].forEach(x => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(x, 1.5, 2.5);
            wheel.rotation.x = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
        });

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
        const handle = new THREE.Mesh(handleGeo, wheelMat);
        handle.position.set(0, 2, -6);
        handle.rotation.x = Math.PI / 6;
        group.add(handle);

        return group;
    }

    createDock(data) {
        const group = new THREE.Group();

        // Dock planks
        const plankGeo = new THREE.BoxGeometry(8, 0.5, 2);
        const plankMat = new THREE.MeshStandardMaterial({
            color: 0xa0826d,
            roughness: 0.9
        });

        for (let i = 0; i < 4; i++) {
            const plank = new THREE.Mesh(plankGeo, plankMat);
            plank.position.set(0, 0.5, i * 2.2);
            plank.castShadow = true;
            group.add(plank);
        }

        // Posts
        const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
        const postMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033
        });

        [[-3.5, 0], [3.5, 0], [-3.5, 6], [3.5, 6]].forEach(([x, z]) => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(x, 0, z);
            group.add(post);
        });

        // Fishing rod
        const rodGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
        const rod = new THREE.Mesh(rodGeo, postMat);
        rod.position.set(3, 3, 6);
        rod.rotation.z = -Math.PI / 4;
        group.add(rod);

        return group;
    }

    createMemorial(data) {
        const group = new THREE.Group();

        // Stone base
        const baseGeo = new THREE.CylinderGeometry(4, 4.5, 1, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            flatShading: true
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.5;
        base.castShadow = true;
        group.add(base);

        // Central pillar
        const pillarGeo = new THREE.CylinderGeometry(1, 1.2, 6, 8);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x999999,
            roughness: 0.7
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.y = 4;
        pillar.castShadow = true;
        group.add(pillar);

        // Flame on top
        const flameGeo = new THREE.ConeGeometry(0.8, 2, 6);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0xff8844,
            transparent: true,
            opacity: 0.8
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = 8;
        group.add(flame);

        // Light
        const light = new THREE.PointLight(0xff8844, 0.5, 10);
        light.position.y = 8;
        group.add(light);

        return group;
    }

    createPaths() {
        // Simple dirt paths connecting buildings
        const pathMat = new THREE.MeshStandardMaterial({
            color: 0xc4a777,
            roughness: 1
        });

        // Create radial paths from center
        const pathWidth = 3;
        const pathPoints = [
            [[0, 0], [-35, -25]],
            [[0, 0], [35, -25]],
            [[0, 0], [-45, 25]],
            [[0, 0], [45, 25]],
            [[0, 0], [0, -45]],
            [[0, 0], [0, 50]],
        ];

        pathPoints.forEach(([start, end]) => {
            const length = Math.sqrt(
                Math.pow(end[0] - start[0], 2) +
                Math.pow(end[1] - start[1], 2)
            );
            const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

            const pathGeo = new THREE.BoxGeometry(length, 0.2, pathWidth);
            const path = new THREE.Mesh(pathGeo, pathMat);

            path.position.set(
                (start[0] + end[0]) / 2,
                1.05,
                (start[1] + end[1]) / 2
            );
            path.rotation.y = -angle + Math.PI / 2;
            path.receiveShadow = true;
            this.scene.add(path);
        });
    }

    createTrees() {
        // Simple low-poly trees scattered around
        const treePositions = [
            [-60, -35], [60, -35], [-65, 20], [65, 15],
            [-30, 50], [30, 55], [-50, -50], [50, -55],
            [-20, 40], [20, -35], [-55, -15], [55, -40],
            [10, 55], [-10, -50], [65, 40], [-65, -45]
        ];

        treePositions.forEach(([x, z]) => {
            // Check if position is on the platform
            if (Math.sqrt(x*x + z*z) < 68) {
                const tree = this.createTree();
                tree.position.set(x, 1, z);
                this.scene.add(tree);
                this.trees.push(tree);
            }
        });
    }

    createTree() {
        const group = new THREE.Group();

        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 6);
        const trunkMat = new THREE.MeshStandardMaterial({
            color: 0x6b4423,
            roughness: 0.9,
            flatShading: true
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage - stacked cones
        const foliageColor = 0x4a8c4a;
        const foliageMat = new THREE.MeshStandardMaterial({
            color: foliageColor,
            roughness: 0.9,
            flatShading: true
        });

        const layers = [
            { y: 5, radius: 3, height: 3 },
            { y: 7, radius: 2.3, height: 2.5 },
            { y: 8.5, radius: 1.5, height: 2 }
        ];

        layers.forEach(layer => {
            const coneGeo = new THREE.ConeGeometry(layer.radius, layer.height, 6);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = layer.y;
            cone.castShadow = true;
            group.add(cone);
        });

        // Random rotation and scale
        group.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.7 + Math.random() * 0.5;
        group.scale.setScalar(scale);

        return group;
    }

    createDecorations() {
        // Small rocks, bushes, flowers scattered around
        const decorCount = 40;

        for (let i = 0; i < decorCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + Math.random() * 50;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            // Skip if too close to buildings or outside platform
            if (Math.sqrt(x*x + z*z) > 68) continue;

            const decorType = Math.random();

            if (decorType < 0.4) {
                // Small rock
                const rockGeo = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.5, 0);
                const rockMat = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    roughness: 0.9,
                    flatShading: true
                });
                const rock = new THREE.Mesh(rockGeo, rockMat);
                rock.position.set(x, 1.3, z);
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                rock.castShadow = true;
                this.scene.add(rock);
            } else if (decorType < 0.7) {
                // Bush
                const bushGeo = new THREE.IcosahedronGeometry(1 + Math.random() * 0.5, 0);
                const bushMat = new THREE.MeshStandardMaterial({
                    color: 0x5a8a5a,
                    roughness: 0.9,
                    flatShading: true
                });
                const bush = new THREE.Mesh(bushGeo, bushMat);
                bush.position.set(x, 1.5, z);
                bush.scale.y = 0.7;
                bush.castShadow = true;
                this.scene.add(bush);
            } else {
                // Flower
                const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 4);
                const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a6a3a });
                const stem = new THREE.Mesh(stemGeo, stemMat);
                stem.position.set(x, 1.4, z);
                this.scene.add(stem);

                const petalGeo = new THREE.CircleGeometry(0.3, 6);
                const colors = [0xff6688, 0xffaa44, 0xffff66, 0xaa88ff, 0x88aaff];
                const petalMat = new THREE.MeshBasicMaterial({
                    color: colors[Math.floor(Math.random() * colors.length)],
                    side: THREE.DoubleSide
                });
                const petal = new THREE.Mesh(petalGeo, petalMat);
                petal.position.set(x, 1.9, z);
                petal.rotation.x = -Math.PI / 3;
                this.scene.add(petal);
            }
        }
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
        // Gentle sway for trees
        this.trees.forEach((tree, idx) => {
            tree.rotation.z = Math.sin(time * 0.5 + idx * 0.5) * 0.02;
        });

        // Flicker fires
        this.buildings.forEach(building => {
            if (building.data.type === 'fire' || building.data.type === 'memorial') {
                building.group.traverse(child => {
                    if (child.isPointLight) {
                        child.intensity = 0.8 + Math.sin(time * 5) * 0.3;
                    }
                });
            }
        });
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
                { x: -35, y: 5, z: -25 },
                { x: 35, y: 5, z: -25 },
                { x: -45, y: 5, z: 25 },
                { x: 45, y: 5, z: 25 },
                { x: 0, y: 5, z: -45 },
            ],
            fires: [
                { x: -55, y: 3, z: 0 },
                { x: 55, y: 3, z: 0 },
                { x: -40, y: 3, z: -45 },
                { x: 40, y: 3, z: -45 },
                { x: -50, y: 3, z: 40 },
                { x: 50, y: 3, z: 40 },
            ],
            herb: { x: 0, y: 3, z: 50 },
            logpile: { x: -25, y: 3, z: -55 },
            garden: { x: 25, y: 3, z: -55 },
            cart: { x: -60, y: 3, z: 30 },
            fishing: { x: 60, y: 3, z: -20 },
            memorial: { x: 0, y: 5, z: -60 }
        };
    }
}
