import * as THREE from 'three';
import { fbm, smoothstep } from './Utils.js';

export class Props {
    constructor(scene, terrainMesh, config) {
        this.scene = scene;
        this.terrainMesh = terrainMesh;
        this.config = config;
        this.init();
    }

    init() {
        this.fireLights = [];
        this.cabinNumbers = [];
        this.herbLights = [];
        this.logPileLights = [];
        this.fishingLights = [];
        this.memorialLights = [];

        // Core structures
        this.createCamp();
        this.createCabins();
        // Pathways are now painted on terrain (Terrain.js) instead of 3D meshes
        this.createFireplaces();
        this.createHerbBundles();
        this.createLogPiles();
        this.createFishingSpots();
        this.createMemorials();

        // Métis cultural elements
        const cultural = this.config.cultural || {};
        if (cultural.includeRedRiverCart !== false) {
            this.createRedRiverCart();
        }
        if (cultural.includeCanoe !== false) {
            this.createCanoe();
        }
        if (cultural.includeDryingRacks !== false) {
            this.createDryingRacks();
        }
        if (cultural.includeGardenPatch !== false) {
            this.createGardenPatch();
        }
    }

    // Get terrain height at position
    getHeight(x, z) {
        let h = fbm(x * 0.015, z * 0.015, 4) * 6;
        h += fbm(x * 0.05, z * 0.05, 3) * 1.5;
        const riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5;
        const riverWidth = 8 + Math.sin(x * 0.02) * 4;
        const distToRiver = Math.abs(z - riverMeander);
        const riverFactor = smoothstep(riverWidth * 0.5, riverWidth * 1.5, distToRiver);
        const riverDepth = -2.5 + smoothstep(0, riverWidth * 0.5, distToRiver) * 1.5;
        return THREE.MathUtils.lerp(riverDepth, h, riverFactor);
    }

    // Cabin positions - exported for use by Terrain.js
    // River meanders: at x=-60 river is at z≈-14, at x=-20 z≈-8, at x=30 z≈11, at x=80 z≈12, at x=130 z≈-4
    // Need 25-30 units clearance from river center to avoid water/low terrain
    static getCabinSettlementPositions() {
        return [
            { x: -60, z: 50, rot: 0 },        // River at z≈-14, cabin at z=50 (64 units north of river)
            { x: -20, z: -70, rot: Math.PI }, // River at z≈-8, cabin at z=-70 (62 units south of river)
            { x: 30, z: 70, rot: 0 },         // River at z≈11, cabin at z=70 (59 units north of river)
            { x: 80, z: -70, rot: Math.PI },  // River at z≈12, cabin at z=-70 (82 units south of river)
            { x: 130, z: 55, rot: -0.2 },     // River at z≈-4, cabin at z=55 (59 units north of river)
        ];
    }

    // Create 5 Métis-style log cabins on raised settlement platforms
    createCabins() {
        const cabinPositions = Props.getCabinSettlementPositions();
        cabinPositions.forEach((pos, index) => {
            this.createSettlement(pos.x, pos.z, pos.rot, index + 1);
        });
    }

    // Create a full settlement with raised platform, cabin, and details
    createSettlement(x, z, rotationOffset, cabinNumber) {
        const settlementGroup = new THREE.Group();

        // Fixed platform height - settlements sit at a consistent level above terrain
        const platformHeight = 3.5;

        // Materials
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x6b4423,
            roughness: 0.9
        });
        const darkWoodMat = new THREE.MeshStandardMaterial({
            color: 0x4a3018,
            roughness: 0.85
        });

        // === RAISED WOODEN PLATFORM ===
        // Main deck
        const platformGeo = new THREE.BoxGeometry(12, 0.3, 10);
        const platform = new THREE.Mesh(platformGeo, woodMat);
        platform.position.y = platformHeight;
        platform.receiveShadow = true;
        settlementGroup.add(platform);

        // Platform edge trim
        const trimGeo = new THREE.BoxGeometry(12.2, 0.15, 0.2);
        const trimFront = new THREE.Mesh(trimGeo, darkWoodMat);
        trimFront.position.set(0, platformHeight + 0.15, 5);
        settlementGroup.add(trimFront);
        const trimBack = new THREE.Mesh(trimGeo, darkWoodMat);
        trimBack.position.set(0, platformHeight + 0.15, -5);
        settlementGroup.add(trimBack);

        const trimSideGeo = new THREE.BoxGeometry(0.2, 0.15, 10);
        const trimLeft = new THREE.Mesh(trimSideGeo, darkWoodMat);
        trimLeft.position.set(-6, platformHeight + 0.15, 0);
        settlementGroup.add(trimLeft);
        const trimRight = new THREE.Mesh(trimSideGeo, darkWoodMat);
        trimRight.position.set(6, platformHeight + 0.15, 0);
        settlementGroup.add(trimRight);

        // === SUPPORT POSTS (stilts) ===
        const postGeo = new THREE.CylinderGeometry(0.2, 0.25, platformHeight + 0.5, 8);
        const postPositions = [
            [-5, -4], [-5, 0], [-5, 4],
            [0, -4], [0, 4],
            [5, -4], [5, 0], [5, 4]
        ];

        postPositions.forEach(([px, pz]) => {
            const post = new THREE.Mesh(postGeo, darkWoodMat);
            post.position.set(px, platformHeight / 2 - 0.1, pz);
            post.castShadow = true;
            settlementGroup.add(post);
        });

        // === CROSS BRACES between posts ===
        const braceGeo = new THREE.BoxGeometry(0.1, 0.1, 4);
        const brace1 = new THREE.Mesh(braceGeo, darkWoodMat);
        brace1.position.set(-5, 0.5, 0);
        settlementGroup.add(brace1);
        const brace2 = new THREE.Mesh(braceGeo, darkWoodMat);
        brace2.position.set(5, 0.5, 0);
        settlementGroup.add(brace2);

        // === STEPS leading up to platform ===
        const stepMat = woodMat;
        for (let i = 0; i < 3; i++) {
            const step = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.2, 0.6),
                stepMat
            );
            step.position.set(0, 0.3 + i * 0.4, 5.5 + i * 0.5);
            settlementGroup.add(step);
        }

        // === CABIN on platform ===
        const cabinGroup = this.createCabinStructure(cabinNumber);
        cabinGroup.position.y = platformHeight + 0.15;
        cabinGroup.position.z = -1; // Set back on platform
        settlementGroup.add(cabinGroup);

        // === FENCE POSTS around platform ===
        const fencePostGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6);
        const fencePositions = [
            [-5.5, 4.5], [-3, 4.5], [3, 4.5], [5.5, 4.5],
            [-5.5, -4.5], [-3, -4.5], [3, -4.5], [5.5, -4.5],
            [-5.8, 2], [-5.8, -2],
            [5.8, 2], [5.8, -2]
        ];

        fencePositions.forEach(([fx, fz]) => {
            const fencePost = new THREE.Mesh(fencePostGeo, darkWoodMat);
            fencePost.position.set(fx, platformHeight + 0.6, fz);
            settlementGroup.add(fencePost);
        });

        // Fence rails
        const railGeo = new THREE.BoxGeometry(0.06, 0.06, 3);
        // Back fence rails
        const rail1 = new THREE.Mesh(railGeo, darkWoodMat);
        rail1.position.set(-4.25, platformHeight + 0.9, -4.5);
        rail1.rotation.y = Math.PI / 2;
        settlementGroup.add(rail1);
        const rail2 = new THREE.Mesh(railGeo, darkWoodMat);
        rail2.position.set(4.25, platformHeight + 0.9, -4.5);
        rail2.rotation.y = Math.PI / 2;
        settlementGroup.add(rail2);

        // === SETTLEMENT DETAILS ===
        // Woodpile
        this.addWoodpile(settlementGroup, 4, platformHeight + 0.15, 3);

        // Barrel
        this.addBarrel(settlementGroup, -4, platformHeight + 0.15, 3);

        // Add Métis sash to cabin 1 (hanging from a post)
        if (cabinNumber === 1) {
            this.addMetisSash(settlementGroup, -5, platformHeight + 0.5, 2);
        }

        // Position the entire settlement
        settlementGroup.position.set(x, 0, z);
        settlementGroup.rotation.y = rotationOffset;

        this.scene.add(settlementGroup);
    }

    // Create just the cabin structure (separated for clarity)
    createCabinStructure(cabinNumber) {
        const cabinGroup = new THREE.Group();

        // === CABIN BODY - Black walls ===
        const logMat = new THREE.MeshStandardMaterial({
            color: 0x111111,  // Black walls
            roughness: 0.85,
            metalness: 0.0
        });
        const cabinBody = new THREE.Mesh(
            new THREE.BoxGeometry(4, 2.5, 3),
            logMat
        );
        cabinBody.position.y = 1.25; // Sits directly on platform
        cabinBody.castShadow = true;
        cabinBody.receiveShadow = true;
        cabinGroup.add(cabinBody);

        // === COLORFUL TRIM - Red/Blue accents ===
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xcc3333,  // Red trim (Métis colors)
            roughness: 0.6
        });
        // Trim along the front
        const trim1 = new THREE.Mesh(
            new THREE.BoxGeometry(4.1, 0.15, 0.1),
            trimMat
        );
        trim1.position.set(0, 2.4, 1.5);
        cabinGroup.add(trim1);

        // === ROOF - Dark brown ===
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x2a1a0a,  // Dark brown roof
            roughness: 0.85,
            side: THREE.DoubleSide
        });
        const roofGeo = new THREE.PlaneGeometry(4.5, 2.2);

        const roofLeft = new THREE.Mesh(roofGeo, roofMat);
        roofLeft.position.set(0, 3.0, -0.7);
        roofLeft.rotation.x = Math.PI / 4;
        roofLeft.castShadow = true;
        cabinGroup.add(roofLeft);

        const roofRight = new THREE.Mesh(roofGeo, roofMat);
        roofRight.position.set(0, 3.0, 0.7);
        roofRight.rotation.x = -Math.PI / 4;
        roofRight.castShadow = true;
        cabinGroup.add(roofRight);

        // === CHIMNEY - Red brick ===
        const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brick red-brown
        const chimney = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.5, 0.5),
            chimneyMat
        );
        chimney.position.set(1.5, 3.7, 0);
        chimney.castShadow = true;
        cabinGroup.add(chimney);

        // === DOOR - Blue painted door ===
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x2255aa,  // Blue door
            roughness: 0.5
        });
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 1.8, 0.1),
            doorMat
        );
        door.position.set(0, 0.9, 1.55);
        cabinGroup.add(door);

        // === FLOATING CABIN NUMBER with glowing orb ===
        const numberGroup = new THREE.Group();

        // Larger, brighter glowing orb
        const orbGeo = new THREE.SphereGeometry(1.2, 20, 20);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0xffaa44,
            transparent: true,
            opacity: 0.85
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        numberGroup.add(orb);

        // Outer glow ring for extra visibility
        const glowRingGeo = new THREE.RingGeometry(1.3, 1.8, 32);
        const glowRingMat = new THREE.MeshBasicMaterial({
            color: 0xffcc66,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
        numberGroup.add(glowRing);
        numberGroup.userData.glowRing = glowRing;

        // Number texture on a plane (double-sided so visible from all angles)
        const numberCanvas = document.createElement('canvas');
        numberCanvas.width = 128;
        numberCanvas.height = 128;
        const ctx = numberCanvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 90px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cabinNumber.toString(), 64, 64);

        const numberTexture = new THREE.CanvasTexture(numberCanvas);
        const numberMat = new THREE.MeshBasicMaterial({
            map: numberTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const numberPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1.4, 1.4),
            numberMat
        );
        numberGroup.add(numberPlane);

        // Stronger point light for warm glow effect
        const numberLight = new THREE.PointLight(0xffaa44, 8, 20);
        numberGroup.add(numberLight);

        // Position floating higher above the cabin (relative to cabin base on platform)
        numberGroup.position.set(0, 6, 0);

        // Store reference for tracking visited state
        numberGroup.userData = {
            cabinNumber: cabinNumber,
            visited: false,
            orb: orb,
            glowRing: glowRing,
            light: numberLight,
            numberPlane: numberPlane
        };

        cabinGroup.add(numberGroup);

        // Store reference to number group for later access
        if (!this.cabinNumbers) this.cabinNumbers = [];
        this.cabinNumbers.push(numberGroup);

        // === WINDOWS - Warm glow ===
        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffdd88,
            emissive: 0xffaa44,
            emissiveIntensity: 0.4
        });
        const window1 = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.6),
            windowMat
        );
        window1.position.set(-1.2, 1.5, 1.51);
        cabinGroup.add(window1);

        const window2 = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6, 0.6),
            windowMat
        );
        window2.position.set(1.2, 1.5, 1.51);
        cabinGroup.add(window2);

        return cabinGroup;
    }

    // Helper: Add woodpile to settlement
    addWoodpile(parent, x, y, z) {
        const logMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
        const logGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6);

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4 - row; col++) {
                const log = new THREE.Mesh(logGeo, logMat);
                log.rotation.z = Math.PI / 2;
                log.position.set(
                    x,
                    y + 0.15 + row * 0.22,
                    z - 0.8 + col * 0.28 + row * 0.14
                );
                parent.add(log);
            }
        }
    }

    // Helper: Add barrel to settlement
    addBarrel(parent, x, y, z) {
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 });

        // Barrel body
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.35, 0.9, 12),
            barrelMat
        );
        barrel.position.set(x, y + 0.45, z);
        parent.add(barrel);

        // Metal bands
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 });
        const bandGeo = new THREE.TorusGeometry(0.38, 0.03, 8, 16);

        const band1 = new THREE.Mesh(bandGeo, bandMat);
        band1.rotation.x = Math.PI / 2;
        band1.position.set(x, y + 0.25, z);
        parent.add(band1);

        const band2 = new THREE.Mesh(bandGeo, bandMat);
        band2.rotation.x = Math.PI / 2;
        band2.position.set(x, y + 0.65, z);
        parent.add(band2);
    }

    // Helper: Add Métis sash (ceinture fléchée) - draped from a wooden post
    addMetisSash(parent, x, y, z) {
        const sashGroup = new THREE.Group();

        // Wooden post to hang the sash from
        const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 1.8, 8),
            postMat
        );
        post.position.set(0, 0.9, 0);
        sashGroup.add(post);

        // Post cap
        const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            postMat
        );
        cap.position.set(0, 1.85, 0);
        sashGroup.add(cap);

        // Create sash texture with arrow pattern (ceinture fléchée)
        const sashCanvas = document.createElement('canvas');
        sashCanvas.width = 128;
        sashCanvas.height = 512;
        const ctx = sashCanvas.getContext('2d');

        // Background - red base
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(0, 0, 128, 512);

        // Draw arrow/chevron pattern typical of Métis sash
        const colors = ['#ffffff', '#2244aa', '#ffcc00', '#228833'];
        const arrowHeight = 32;

        for (let row = 0; row < 16; row++) {
            const yPos = row * arrowHeight;
            const colorIndex = row % colors.length;

            // Draw chevron/arrow pointing down
            ctx.fillStyle = colors[colorIndex];
            ctx.beginPath();
            ctx.moveTo(0, yPos);
            ctx.lineTo(64, yPos + arrowHeight * 0.6);
            ctx.lineTo(128, yPos);
            ctx.lineTo(128, yPos + 8);
            ctx.lineTo(64, yPos + arrowHeight * 0.6 + 8);
            ctx.lineTo(0, yPos + 8);
            ctx.closePath();
            ctx.fill();

            // Second smaller arrow
            ctx.beginPath();
            ctx.moveTo(20, yPos + arrowHeight * 0.3);
            ctx.lineTo(64, yPos + arrowHeight * 0.75);
            ctx.lineTo(108, yPos + arrowHeight * 0.3);
            ctx.lineTo(108, yPos + arrowHeight * 0.3 + 6);
            ctx.lineTo(64, yPos + arrowHeight * 0.75 + 6);
            ctx.lineTo(20, yPos + arrowHeight * 0.3 + 6);
            ctx.closePath();
            ctx.fill();
        }

        // Add vertical stripes on edges
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 8, 512);
        ctx.fillRect(120, 0, 8, 512);
        ctx.fillStyle = '#2244aa';
        ctx.fillRect(8, 0, 6, 512);
        ctx.fillRect(114, 0, 6, 512);

        const sashTexture = new THREE.CanvasTexture(sashCanvas);
        sashTexture.wrapS = THREE.RepeatWrapping;
        sashTexture.wrapT = THREE.RepeatWrapping;

        const sashMat = new THREE.MeshStandardMaterial({
            map: sashTexture,
            side: THREE.DoubleSide,
            roughness: 0.8
        });

        // Create the sash as a curved/draped ribbon using a curved plane
        // Main hanging part - slightly curved
        const sashWidth = 0.25;
        const sashLength = 1.4;

        // Create a curved path for the sash
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.7, 0),        // Top at post
            new THREE.Vector3(0.1, 1.4, 0.05),   // Slight outward curve
            new THREE.Vector3(0.15, 1.0, 0.08),  // Middle bulge
            new THREE.Vector3(0.1, 0.6, 0.05),   // Coming back
            new THREE.Vector3(0.05, 0.3, 0.02),  // Lower
            new THREE.Vector3(0, 0.1, 0),        // Bottom tip
        ]);

        // Create tube geometry following the curve (like a ribbon)
        const tubeGeo = new THREE.TubeGeometry(curve, 20, sashWidth / 2, 8, false);
        const sashTube = new THREE.Mesh(tubeGeo, sashMat);
        sashGroup.add(sashTube);

        // Add fringe at the bottom (traditional sash detail)
        const fringeMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
            const fringe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.005, 0.15, 4),
                fringeMat
            );
            fringe.position.set(
                0.02 + (i - 2) * 0.04,
                0.02,
                0
            );
            sashGroup.add(fringe);
        }

        // Second draped section going the other direction (sash wraps around)
        const curve2 = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.65, 0),
            new THREE.Vector3(-0.08, 1.35, -0.05),
            new THREE.Vector3(-0.12, 0.9, -0.08),
            new THREE.Vector3(-0.08, 0.5, -0.04),
            new THREE.Vector3(-0.03, 0.25, 0),
        ]);

        const tubeGeo2 = new THREE.TubeGeometry(curve2, 16, sashWidth / 2.5, 8, false);
        const sashTube2 = new THREE.Mesh(tubeGeo2, sashMat);
        sashGroup.add(sashTube2);

        // Position the sash group
        sashGroup.position.set(x, y, z);

        parent.add(sashGroup);
    }

    createCamp() {
        const campGroup = new THREE.Group();

        // Position camp near the trail but not on it
        // Trail is at z ~ 20
        campGroup.position.set(5, 0, 25);

        // Firepit
        const stoneGeo = new THREE.DodecahedronGeometry(0.2);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x555555 });

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(Math.cos(angle) * 0.6, 0.1, Math.sin(angle) * 0.6);
            stone.castShadow = true;
            campGroup.add(stone);
        }

        // Fire Light
        const fireLight = new THREE.PointLight(0xff6600, 5, 10);
        fireLight.position.set(0, 0.5, 0);
        fireLight.castShadow = true;
        campGroup.add(fireLight);
        this.fireLight = fireLight;

        // Tripod
        const stickGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
        const stickMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });

        const stick1 = new THREE.Mesh(stickGeo, stickMat);
        stick1.rotation.z = 0.3;
        stick1.rotation.y = 0;
        stick1.position.set(0.4, 1.2, 0);

        const stick2 = new THREE.Mesh(stickGeo, stickMat);
        stick2.rotation.z = -0.3;
        stick2.rotation.y = 2; // roughly 120 deg
        stick2.position.set(-0.2, 1.2, 0.35);

        const stick3 = new THREE.Mesh(stickGeo, stickMat);
        stick3.rotation.z = -0.3;
        stick3.rotation.y = -2;
        stick3.position.set(-0.2, 1.2, -0.35);

        campGroup.add(stick1, stick2, stick3);

        // Pot
        const potGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.4);
        const potMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.set(0, 0.8, 0);
        campGroup.add(pot);

        // Sash (Simple textured plane draped)
        const sashGeo = new THREE.PlaneGeometry(0.5, 1.5, 4, 4);
        // Bend it a bit
        const pos = sashGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getY(i) > 0) {
                pos.setZ(i, -0.2); // Fold over
            }
        }
        sashGeo.computeVertexNormals();

        // Create a procedural sash texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cc0000'; // Red base
        ctx.fillRect(0, 0, 64, 256);
        // Stripes
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 256; i += 10) ctx.fillRect(0, i, 64, 2);

        const tex = new THREE.CanvasTexture(canvas);
        const sashMat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide });
        const sash = new THREE.Mesh(sashGeo, sashMat);
        sash.position.set(2, 0.8, 1);
        sash.rotation.x = -0.5;
        sash.rotation.y = 0.5;
        sash.castShadow = true;
        campGroup.add(sash);

        // Crate for sash
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
        );
        crate.position.set(2, 0.4, 1);
        crate.castShadow = true;
        campGroup.add(crate);

        this.scene.add(campGroup);
    }

    // Create additional campfires along the pathways near settlements
    // Static method to get fireplace positions (for minimap)
    static getFireplacePositions() {
        return [
            // Along the main trail between cabins
            { x: -40, z: 34 },   // Between cabin 1 and 2 trail (moved from z=28 to be more inland)
            { x: 5, z: 32 },     // Near the camp area (moved from z=26 to be more inland)
            { x: 55, z: 38 },    // Between cabin 3 and 4 trail (moved from z=30 to be more inland)
            { x: 105, z: 32 },   // Between cabin 4 and 5 trail
            // Near south bank cabins (cabins 2 and 4)
            { x: -25, z: -35 },  // Near cabin 2's path (moved from z=-18 to avoid river)
            { x: 75, z: -20 },   // Near cabin 4's path
        ];
    }

    createFireplaces() {
        // Position fireplaces along pathways between cabin settlements
        const fireplacePositions = Props.getFireplacePositions();

        fireplacePositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createFireplace(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createFireplace(x, z, terrainHeight) {
        const group = new THREE.Group();

        // Use provided terrain height, ensure it's above ground
        const h = Math.max(terrainHeight, 0.5);

        // Stone ring
        const stoneGeo = new THREE.DodecahedronGeometry(0.25);
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(Math.cos(angle) * 0.7, 0.15, Math.sin(angle) * 0.7);
            stone.castShadow = true;
            group.add(stone);
        }

        // Logs
        const logGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6);
        const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3520 });

        for (let i = 0; i < 3; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            log.rotation.z = Math.PI / 2;
            log.rotation.y = (i / 3) * Math.PI;
            log.position.y = 0.15;
            group.add(log);
        }

        // Fire glow
        const fireLight = new THREE.PointLight(0xff5500, 3, 12);
        fireLight.position.set(0, 0.5, 0);
        group.add(fireLight);
        this.fireLights.push(fireLight);

        group.position.set(x, h, z);
        this.scene.add(group);
    }

    // Static method to get herb bundle positions (for minimap)
    static getHerbBundlePositions() {
        return [
            { x: -95, z: 45 },   // Left of cabin 1 - The Medicine Garden
        ];
    }

    // Static method to get log pile positions (for minimap)
    static getLogPilePositions() {
        return [
            { x: 115, z: -65 },   // Right of cabin 4 - Architecture Experience
        ];
    }

    // Static method to get garden patch positions (for minimap)
    static getGardenPositions() {
        return [
            { x: -55, z: 40 },   // Near cabin 1 - River Lot Farming
        ];
    }

    // Static method to get Red River cart positions (for minimap)
    static getCartPositions() {
        return [
            { x: 30, z: 48 },   // Near cabin 3 - Red River Cart Experience
        ];
    }

    // Static method to get fishing spot positions (for minimap)
    static getFishingPositions() {
        return [
            { x: 50, z: -50 },   // Left of cabin 4 - Fishing Experience
        ];
    }

    // Static method to get memorial positions (for minimap)
    static getMemorialPositions() {
        return [
            { x: -80, z: -60 },   // Quiet area - Remembering & Resilience
        ];
    }

    createHerbBundles() {
        const herbPositions = Props.getHerbBundlePositions();
        herbPositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createHerbBundle(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createHerbBundle(x, z, terrainHeight) {
        const group = new THREE.Group();
        const h = Math.max(terrainHeight, 0.5);

        // Medicine chest/box base
        const chestMat = new THREE.MeshStandardMaterial({
            color: 0x5a4030,
            roughness: 0.8
        });
        const chestLidMat = new THREE.MeshStandardMaterial({
            color: 0x6b4423,
            roughness: 0.7
        });

        // Main chest body
        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.7, 0.8),
            chestMat
        );
        chest.position.y = 0.35;
        chest.castShadow = true;
        group.add(chest);

        // Chest lid (slightly open)
        const lid = new THREE.Mesh(
            new THREE.BoxGeometry(1.25, 0.1, 0.85),
            chestLidMat
        );
        lid.position.set(0, 0.75, -0.3);
        lid.rotation.x = -0.4; // Lid slightly open
        group.add(lid);

        // Metal bands on chest
        const bandMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.6,
            roughness: 0.4
        });
        const bandGeo = new THREE.BoxGeometry(1.25, 0.05, 0.82);
        const band1 = new THREE.Mesh(bandGeo, bandMat);
        band1.position.set(0, 0.2, 0);
        group.add(band1);
        const band2 = new THREE.Mesh(bandGeo, bandMat);
        band2.position.set(0, 0.55, 0);
        group.add(band2);

        // Herb bundles spilling out of chest
        const herbColors = [0x5a8a4a, 0x7aaa6a, 0x4a7a3a, 0x8a9a5a];
        const leafMat = new THREE.MeshStandardMaterial({
            color: 0x4a7a3a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });

        // Create several herb bundles
        for (let i = 0; i < 5; i++) {
            const bundleGroup = new THREE.Group();
            const color = herbColors[i % herbColors.length];
            const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });

            // Stem bundle
            for (let j = 0; j < 3; j++) {
                const stem = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.015, 0.5, 4),
                    mat
                );
                stem.position.set((j - 1) * 0.05, 0.25, 0);
                stem.rotation.z = (Math.random() - 0.5) * 0.3;
                bundleGroup.add(stem);
            }

            // Leaf clusters at top
            const leafGeo = new THREE.SphereGeometry(0.12, 6, 4);
            const leaves = new THREE.Mesh(leafGeo, mat);
            leaves.scale.set(1, 0.6, 0.8);
            leaves.position.y = 0.5;
            bundleGroup.add(leaves);

            // Position bundles around and on chest
            const angle = (i / 5) * Math.PI * 0.6 - 0.3;
            bundleGroup.position.set(
                Math.cos(angle) * 0.4,
                0.7 + Math.random() * 0.2,
                0.3 + Math.sin(angle) * 0.3
            );
            bundleGroup.rotation.x = -0.3 + Math.random() * 0.2;
            bundleGroup.rotation.z = (Math.random() - 0.5) * 0.5;
            group.add(bundleGroup);
        }

        // Scattered dried herbs on ground around chest
        for (let i = 0; i < 8; i++) {
            const scatterMat = new THREE.MeshStandardMaterial({
                color: herbColors[i % herbColors.length],
                roughness: 0.95
            });
            const scatter = new THREE.Mesh(
                new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 5, 3),
                scatterMat
            );
            scatter.scale.set(1, 0.4, 1);
            const angle = (i / 8) * Math.PI * 2;
            const dist = 0.8 + Math.random() * 0.4;
            scatter.position.set(
                Math.cos(angle) * dist,
                0.05,
                Math.sin(angle) * dist
            );
            group.add(scatter);
        }

        // Glowing aura to make it visible
        const auraGeo = new THREE.SphereGeometry(1.5, 16, 12);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x88cc88,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 0.5;
        group.add(aura);

        // Floating particles effect (like fireflies but green)
        const particleGeo = new THREE.BufferGeometry();
        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0xaaffaa,
            size: 0.08,
            transparent: true,
            opacity: 0.8
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        particles.position.y = 0.5;
        group.add(particles);
        group.userData.particles = particles;

        // Green glow light
        const herbLight = new THREE.PointLight(0x88cc88, 4, 15);
        herbLight.position.set(0, 1, 0);
        group.add(herbLight);
        this.herbLights.push({ light: herbLight, particles: particles });

        // Add floating marker above (like cabins but green)
        const markerGroup = new THREE.Group();

        // Glowing orb
        const orbGeo = new THREE.SphereGeometry(0.6, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0x88cc88,
            transparent: true,
            opacity: 0.7
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        markerGroup.add(orb);

        // Herb icon (leaf shape)
        const iconGeo = new THREE.ConeGeometry(0.25, 0.5, 4);
        const iconMat = new THREE.MeshBasicMaterial({ color: 0x226622 });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.rotation.z = Math.PI;
        markerGroup.add(icon);

        // Marker light
        const markerLight = new THREE.PointLight(0x88cc88, 5, 20);
        markerGroup.add(markerLight);

        markerGroup.position.y = 4;
        markerGroup.userData = { orb, markerLight };
        group.add(markerGroup);
        group.userData.marker = markerGroup;

        group.position.set(x, h, z);
        this.scene.add(group);
    }

    createLogPiles() {
        const logPilePositions = Props.getLogPilePositions();
        logPilePositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createLogPile(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createLogPile(x, z, terrainHeight) {
        const group = new THREE.Group();
        const h = Math.max(terrainHeight, 0.5);

        // Materials
        const logMat = new THREE.MeshStandardMaterial({
            color: 0x8b6914,
            roughness: 0.9
        });
        const darkLogMat = new THREE.MeshStandardMaterial({
            color: 0x5a4030,
            roughness: 0.85
        });
        const barkMat = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.95
        });

        // Create a large impressive log pile structure
        // Base layer - large foundation logs
        const baseLogGeo = new THREE.CylinderGeometry(0.35, 0.38, 5, 8);
        for (let i = 0; i < 6; i++) {
            const log = new THREE.Mesh(baseLogGeo, darkLogMat);
            log.rotation.z = Math.PI / 2;
            log.position.set(0, 0.4, -2 + i * 0.75);
            log.castShadow = true;
            group.add(log);
        }

        // Second layer - slightly offset
        const midLogGeo = new THREE.CylinderGeometry(0.3, 0.32, 4.5, 8);
        for (let i = 0; i < 5; i++) {
            const log = new THREE.Mesh(midLogGeo, logMat);
            log.rotation.z = Math.PI / 2;
            log.position.set(0, 1.0, -1.6 + i * 0.75);
            log.castShadow = true;
            group.add(log);
        }

        // Third layer
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(midLogGeo, darkLogMat);
            log.rotation.z = Math.PI / 2;
            log.position.set(0, 1.6, -1.2 + i * 0.75);
            log.castShadow = true;
            group.add(log);
        }

        // Top layer - smaller logs
        const topLogGeo = new THREE.CylinderGeometry(0.25, 0.28, 4, 8);
        for (let i = 0; i < 3; i++) {
            const log = new THREE.Mesh(topLogGeo, logMat);
            log.rotation.z = Math.PI / 2;
            log.position.set(0, 2.15, -0.7 + i * 0.7);
            log.castShadow = true;
            group.add(log);
        }

        // Cross-stacked logs on the side (perpendicular)
        const sideLogGeo = new THREE.CylinderGeometry(0.28, 0.3, 3.5, 8);
        for (let layer = 0; layer < 3; layer++) {
            for (let i = 0; i < 3 - layer; i++) {
                const log = new THREE.Mesh(sideLogGeo, layer % 2 === 0 ? barkMat : logMat);
                log.rotation.x = Math.PI / 2;
                log.position.set(3.5, 0.35 + layer * 0.55, -0.8 + i * 0.7 + layer * 0.35);
                log.castShadow = true;
                group.add(log);
            }
        }

        // Additional scattered logs around the main pile
        const scatterLogGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.5, 6);
        const scatterPositions = [
            { x: -3, z: 0.5, rotY: 0.3 },
            { x: -2.8, z: -0.8, rotY: -0.2 },
            { x: 2, z: 2, rotY: 0.8 },
            { x: -1.5, z: 2.2, rotY: -0.5 },
        ];
        scatterPositions.forEach(pos => {
            const log = new THREE.Mesh(scatterLogGeo, darkLogMat);
            log.rotation.z = Math.PI / 2;
            log.rotation.y = pos.rotY;
            log.position.set(pos.x, 0.25, pos.z);
            log.castShadow = true;
            group.add(log);
        });

        // Sawbuck/sawhorse for cutting logs
        const sawbuckGroup = new THREE.Group();
        const legGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6);

        // X-shaped legs
        const leg1 = new THREE.Mesh(legGeo, barkMat);
        leg1.position.set(-0.3, 0.7, 0);
        leg1.rotation.z = 0.4;
        sawbuckGroup.add(leg1);

        const leg2 = new THREE.Mesh(legGeo, barkMat);
        leg2.position.set(0.3, 0.7, 0);
        leg2.rotation.z = -0.4;
        sawbuckGroup.add(leg2);

        const leg3 = new THREE.Mesh(legGeo, barkMat);
        leg3.position.set(-0.3, 0.7, 0.8);
        leg3.rotation.z = 0.4;
        sawbuckGroup.add(leg3);

        const leg4 = new THREE.Mesh(legGeo, barkMat);
        leg4.position.set(0.3, 0.7, 0.8);
        leg4.rotation.z = -0.4;
        sawbuckGroup.add(leg4);

        // Cross beam
        const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
        const beam = new THREE.Mesh(beamGeo, barkMat);
        beam.rotation.x = Math.PI / 2;
        beam.position.set(0, 1.2, 0.4);
        sawbuckGroup.add(beam);

        sawbuckGroup.position.set(-4.5, 0, -0.5);
        group.add(sawbuckGroup);

        // Axe leaning against logs
        const axeGroup = new THREE.Group();
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.035, 1.2, 6);
        const handle = new THREE.Mesh(handleGeo, barkMat);
        axeGroup.add(handle);

        const headGeo = new THREE.BoxGeometry(0.08, 0.25, 0.15);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.6,
            roughness: 0.4
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.55;
        axeGroup.add(head);

        axeGroup.position.set(-2.2, 0.6, 1.5);
        axeGroup.rotation.z = -0.5;
        axeGroup.rotation.y = 0.3;
        group.add(axeGroup);

        // Wood shavings / sawdust on ground
        const shavingsGeo = new THREE.CircleGeometry(2.5, 16);
        const shavingsMat = new THREE.MeshStandardMaterial({
            color: 0xc9a86c,
            roughness: 1,
            transparent: true,
            opacity: 0.6
        });
        const shavings = new THREE.Mesh(shavingsGeo, shavingsMat);
        shavings.rotation.x = -Math.PI / 2;
        shavings.position.set(-1, 0.02, 0);
        group.add(shavings);

        // Glowing amber aura to make it visible
        const auraGeo = new THREE.SphereGeometry(3, 16, 12);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xddaa66,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 1.5;
        group.add(aura);

        // Warm amber light
        const pileLight = new THREE.PointLight(0xddaa66, 4, 18);
        pileLight.position.set(0, 2, 0);
        group.add(pileLight);
        this.logPileLights.push(pileLight);

        // Add floating marker above (amber/brown color scheme for building/architecture)
        const markerGroup = new THREE.Group();

        // Glowing orb
        const orbGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0xddaa55,
            transparent: true,
            opacity: 0.75
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        markerGroup.add(orb);

        // Building icon (small house shape)
        const iconGroup = new THREE.Group();
        // Base
        const iconBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.25, 0.25),
            new THREE.MeshBasicMaterial({ color: 0x553311 })
        );
        iconGroup.add(iconBase);
        // Roof
        const roofGeo = new THREE.ConeGeometry(0.28, 0.2, 4);
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshBasicMaterial({ color: 0x442200 }));
        roof.position.y = 0.2;
        roof.rotation.y = Math.PI / 4;
        iconGroup.add(roof);
        markerGroup.add(iconGroup);

        // Outer glow ring
        const glowRingGeo = new THREE.RingGeometry(0.8, 1.1, 32);
        const glowRingMat = new THREE.MeshBasicMaterial({
            color: 0xeecc77,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
        markerGroup.add(glowRing);

        // Marker light
        const markerLight = new THREE.PointLight(0xddaa55, 6, 25);
        markerGroup.add(markerLight);

        markerGroup.position.y = 5;
        markerGroup.userData = { orb, markerLight, glowRing };
        group.add(markerGroup);
        group.userData.marker = markerGroup;

        group.position.set(x, h, z);
        this.scene.add(group);
    }

    createFishingSpots() {
        const fishingPositions = Props.getFishingPositions();
        fishingPositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createFishingSpot(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createFishingSpot(x, z, terrainHeight) {
        const group = new THREE.Group();
        const h = Math.max(terrainHeight, 0.5);

        // Materials
        const fishMat = new THREE.MeshStandardMaterial({
            color: 0x6a8a9a,
            roughness: 0.6,
            metalness: 0.1
        });
        const silverFishMat = new THREE.MeshStandardMaterial({
            color: 0x9abacc,
            roughness: 0.4,
            metalness: 0.3
        });
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x5a4030,
            roughness: 0.9
        });

        // Create wooden drying rack with fish
        const rackGroup = new THREE.Group();

        // Main support poles (A-frame style)
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6);

        // Left A-frame
        const poleL1 = new THREE.Mesh(poleGeo, woodMat);
        poleL1.position.set(-1.2, 1.2, -0.3);
        poleL1.rotation.z = 0.2;
        rackGroup.add(poleL1);

        const poleL2 = new THREE.Mesh(poleGeo, woodMat);
        poleL2.position.set(-1.2, 1.2, 0.3);
        poleL2.rotation.z = 0.2;
        rackGroup.add(poleL2);

        // Right A-frame
        const poleR1 = new THREE.Mesh(poleGeo, woodMat);
        poleR1.position.set(1.2, 1.2, -0.3);
        poleR1.rotation.z = -0.2;
        rackGroup.add(poleR1);

        const poleR2 = new THREE.Mesh(poleGeo, woodMat);
        poleR2.position.set(1.2, 1.2, 0.3);
        poleR2.rotation.z = -0.2;
        rackGroup.add(poleR2);

        // Horizontal bar for hanging fish
        const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
        const bar = new THREE.Mesh(barGeo, woodMat);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(0, 2.2, 0);
        rackGroup.add(bar);

        // Hanging fish on the rack
        for (let i = 0; i < 6; i++) {
            const fishGroup = new THREE.Group();

            // Fish body (elongated ellipsoid)
            const bodyGeo = new THREE.SphereGeometry(0.15, 8, 6);
            const body = new THREE.Mesh(bodyGeo, i % 2 === 0 ? fishMat : silverFishMat);
            body.scale.set(1, 0.5, 2.5);
            fishGroup.add(body);

            // Tail fin
            const tailGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
            const tail = new THREE.Mesh(tailGeo, i % 2 === 0 ? fishMat : silverFishMat);
            tail.rotation.x = Math.PI / 2;
            tail.position.z = 0.35;
            fishGroup.add(tail);

            // String to hang
            const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4);
            const stringMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
            const string = new THREE.Mesh(stringGeo, stringMat);
            string.position.y = 0.2;
            fishGroup.add(string);

            fishGroup.position.set(-1.2 + i * 0.5, 1.85, 0);
            fishGroup.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
            fishGroup.rotation.z = (Math.random() - 0.5) * 0.3;
            rackGroup.add(fishGroup);
        }

        group.add(rackGroup);

        // Pile of fresh fish on the ground
        const pileGroup = new THREE.Group();

        for (let i = 0; i < 8; i++) {
            const fishGroup = new THREE.Group();

            // Fish body
            const bodyGeo = new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 8, 6);
            const body = new THREE.Mesh(bodyGeo, Math.random() > 0.5 ? fishMat : silverFishMat);
            body.scale.set(1, 0.4, 2.2 + Math.random() * 0.5);
            fishGroup.add(body);

            // Tail fin
            const tailGeo = new THREE.ConeGeometry(0.08, 0.2, 4);
            const tail = new THREE.Mesh(tailGeo, Math.random() > 0.5 ? fishMat : silverFishMat);
            tail.rotation.x = Math.PI / 2;
            tail.position.z = 0.28;
            fishGroup.add(tail);

            // Random position in pile
            const angle = (i / 8) * Math.PI * 2;
            const dist = 0.3 + Math.random() * 0.4;
            fishGroup.position.set(
                Math.cos(angle) * dist + 1.5,
                0.1 + (i % 3) * 0.08,
                Math.sin(angle) * dist
            );
            fishGroup.rotation.x = (Math.random() - 0.5) * 0.5;
            fishGroup.rotation.y = Math.random() * Math.PI * 2;
            fishGroup.rotation.z = (Math.random() - 0.5) * 0.4;
            pileGroup.add(fishGroup);
        }

        group.add(pileGroup);

        // Wooden bucket/basket nearby
        const bucketGeo = new THREE.CylinderGeometry(0.25, 0.2, 0.4, 12);
        const bucket = new THREE.Mesh(bucketGeo, woodMat);
        bucket.position.set(-1.5, 0.2, 0.8);
        group.add(bucket);

        // Metal bands on bucket
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
        const bandGeo = new THREE.TorusGeometry(0.24, 0.02, 6, 16);
        const band1 = new THREE.Mesh(bandGeo, bandMat);
        band1.rotation.x = Math.PI / 2;
        band1.position.set(-1.5, 0.1, 0.8);
        group.add(band1);
        const band2 = new THREE.Mesh(bandGeo, bandMat);
        band2.rotation.x = Math.PI / 2;
        band2.position.set(-1.5, 0.35, 0.8);
        group.add(band2);

        // Fishing net draped nearby
        const netGeo = new THREE.PlaneGeometry(1.5, 1);
        const netMat = new THREE.MeshStandardMaterial({
            color: 0x8b7355,
            roughness: 0.9,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const net = new THREE.Mesh(netGeo, netMat);
        net.position.set(-0.5, 0.3, 1.2);
        net.rotation.x = -0.8;
        net.rotation.z = 0.2;
        group.add(net);

        // Glowing blue aura (water-themed)
        const auraGeo = new THREE.SphereGeometry(3, 16, 12);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x4488aa,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 1;
        group.add(aura);

        // Blue/teal light
        const fishingLight = new THREE.PointLight(0x4488aa, 4, 18);
        fishingLight.position.set(0, 2, 0);
        group.add(fishingLight);
        this.fishingLights.push(fishingLight);

        // Add floating marker above (blue color scheme for fishing)
        const markerGroup = new THREE.Group();

        // Glowing orb
        const orbGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0x4488cc,
            transparent: true,
            opacity: 0.75
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        markerGroup.add(orb);

        // Fish icon
        const iconGroup = new THREE.Group();
        const iconBodyGeo = new THREE.SphereGeometry(0.2, 8, 6);
        const iconMat = new THREE.MeshBasicMaterial({ color: 0x225588 });
        const iconBody = new THREE.Mesh(iconBodyGeo, iconMat);
        iconBody.scale.set(1, 0.5, 1.5);
        iconGroup.add(iconBody);
        const iconTailGeo = new THREE.ConeGeometry(0.1, 0.15, 4);
        const iconTail = new THREE.Mesh(iconTailGeo, iconMat);
        iconTail.rotation.x = Math.PI / 2;
        iconTail.position.z = 0.25;
        iconGroup.add(iconTail);
        markerGroup.add(iconGroup);

        // Outer glow ring
        const glowRingGeo = new THREE.RingGeometry(0.9, 1.2, 32);
        const glowRingMat = new THREE.MeshBasicMaterial({
            color: 0x66aadd,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
        markerGroup.add(glowRing);

        // Marker light
        const markerLight = new THREE.PointLight(0x4488cc, 6, 25);
        markerGroup.add(markerLight);

        markerGroup.position.y = 5;
        markerGroup.userData = { orb, markerLight, glowRing };
        group.add(markerGroup);
        group.userData.marker = markerGroup;

        group.position.set(x, h, z);
        this.scene.add(group);
    }

    createMemorials() {
        const memorialPositions = Props.getMemorialPositions();
        memorialPositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createMemorial(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createMemorial(x, z, terrainHeight) {
        const group = new THREE.Group();
        const h = Math.max(terrainHeight, 0.5);

        // Materials
        const stoneMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.9,
            metalness: 0.1
        });
        const darkStoneMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.85
        });

        // Central memorial stone (tall standing stone)
        const mainStoneGeo = new THREE.BoxGeometry(1.2, 3, 0.4);
        const mainStone = new THREE.Mesh(mainStoneGeo, stoneMat);
        mainStone.position.y = 1.5;
        mainStone.rotation.y = Math.PI / 12;
        group.add(mainStone);

        // Stone base
        const baseGeo = new THREE.BoxGeometry(2, 0.3, 1.2);
        const base = new THREE.Mesh(baseGeo, darkStoneMat);
        base.position.y = 0.15;
        group.add(base);

        // Smaller surrounding stones (memorial circle)
        for (let i = 0; i < 7; i++) {
            const angle = (i / 7) * Math.PI * 2;
            const dist = 2.5 + Math.random() * 0.5;
            const stoneGeo = new THREE.BoxGeometry(
                0.3 + Math.random() * 0.3,
                0.4 + Math.random() * 0.6,
                0.2 + Math.random() * 0.2
            );
            const stone = new THREE.Mesh(stoneGeo, Math.random() > 0.5 ? stoneMat : darkStoneMat);
            stone.position.set(
                Math.cos(angle) * dist,
                0.2 + Math.random() * 0.15,
                Math.sin(angle) * dist
            );
            stone.rotation.y = Math.random() * Math.PI;
            stone.rotation.z = (Math.random() - 0.5) * 0.2;
            group.add(stone);
        }

        // Small candle/light holders around base
        const candleMat = new THREE.MeshStandardMaterial({ color: 0xffcc88, emissive: 0xff6600, emissiveIntensity: 0.5 });
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const candleGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8);
            const candle = new THREE.Mesh(candleGeo, candleMat);
            candle.position.set(Math.cos(angle) * 1.3, 0.35, Math.sin(angle) * 1.3);
            group.add(candle);

            // Candle flame
            const flameGeo = new THREE.ConeGeometry(0.05, 0.15, 6);
            const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
            const flame = new THREE.Mesh(flameGeo, flameMat);
            flame.position.set(Math.cos(angle) * 1.3, 0.55, Math.sin(angle) * 1.3);
            group.add(flame);
        }

        // Soft orange/amber glow (warm, solemn)
        const auraGeo = new THREE.SphereGeometry(4, 16, 12);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xcc6600,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 1.5;
        group.add(aura);

        // Warm amber light
        const memorialLight = new THREE.PointLight(0xcc6600, 3, 15);
        memorialLight.position.set(0, 2, 0);
        group.add(memorialLight);
        this.memorialLights.push(memorialLight);

        // Floating marker above (amber/orange color scheme)
        const markerGroup = new THREE.Group();

        // Glowing orb - candle-like
        const orbGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0xcc6600,
            transparent: true,
            opacity: 0.7
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        markerGroup.add(orb);

        // Candle icon inside
        const iconGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.3, 8);
        const iconMat = new THREE.MeshBasicMaterial({ color: 0xffeecc });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.y = -0.05;
        markerGroup.add(icon);

        const flameIconGeo = new THREE.ConeGeometry(0.06, 0.18, 6);
        const flameIconMat = new THREE.MeshBasicMaterial({ color: 0xff8844 });
        const flameIcon = new THREE.Mesh(flameIconGeo, flameIconMat);
        flameIcon.position.y = 0.18;
        markerGroup.add(flameIcon);

        // Outer glow ring
        const glowRingGeo = new THREE.RingGeometry(0.85, 1.1, 32);
        const glowRingMat = new THREE.MeshBasicMaterial({
            color: 0xdd8844,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
        markerGroup.add(glowRing);

        // Marker light
        const markerLight = new THREE.PointLight(0xcc6600, 5, 20);
        markerGroup.add(markerLight);

        markerGroup.position.y = 5;
        markerGroup.userData = { orb, markerLight, glowRing };
        group.add(markerGroup);
        group.userData.marker = markerGroup;

        group.position.set(x, h, z);
        this.scene.add(group);
    }

    // Mark a cabin as visited - call this when player finishes visiting an elder
    markCabinVisited(cabinNumber) {
        if (!this.cabinNumbers) return;

        const numberGroup = this.cabinNumbers.find(
            ng => ng.userData.cabinNumber === cabinNumber
        );

        if (numberGroup && !numberGroup.userData.visited) {
            numberGroup.userData.visited = true;

            // Turn off the glow
            numberGroup.userData.orb.material.opacity = 0.15;
            numberGroup.userData.orb.material.color.setHex(0x444444);
            numberGroup.userData.light.intensity = 0;

            // Dim the number
            numberGroup.userData.numberPlane.material.opacity = 0.4;
        }
    }

    // Check if cabin has been visited
    isCabinVisited(cabinNumber) {
        if (!this.cabinNumbers) return false;
        const numberGroup = this.cabinNumbers.find(
            ng => ng.userData.cabinNumber === cabinNumber
        );
        return numberGroup ? numberGroup.userData.visited : false;
    }

    // === MÉTIS CULTURAL ELEMENTS ===

    createRedRiverCart() {
        // Iconic Red River cart - positioned near cabin 3 on the trail
        const cartGroup = new THREE.Group();

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.85 });

        // Large wooden wheels (iconic feature of Red River carts)
        const wheelRadius = 1.0;
        const wheelThickness = 0.12;

        const createWheel = (zOffset) => {
            const wheelGroup = new THREE.Group();

            // Outer wooden rim
            const rimGeo = new THREE.TorusGeometry(wheelRadius, wheelThickness, 8, 24);
            const rim = new THREE.Mesh(rimGeo, wheelMat);
            wheelGroup.add(rim);

            // Center hub
            const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12);
            const hub = new THREE.Mesh(hubGeo, wheelMat);
            hub.rotation.x = Math.PI / 2;
            wheelGroup.add(hub);

            // Spokes - 8 spokes radiating from hub
            const spokeGeo = new THREE.BoxGeometry(0.06, wheelRadius * 0.85, 0.06);
            for (let i = 0; i < 8; i++) {
                const spoke = new THREE.Mesh(spokeGeo, wheelMat);
                const angle = (i / 8) * Math.PI * 2;
                spoke.position.set(
                    Math.cos(angle) * wheelRadius * 0.45,
                    Math.sin(angle) * wheelRadius * 0.45,
                    0
                );
                spoke.rotation.z = angle;
                wheelGroup.add(spoke);
            }

            // Position wheel on the side of cart
            wheelGroup.position.set(0, wheelRadius, zOffset);
            return wheelGroup;
        };

        // Add two wheels on either side
        cartGroup.add(createWheel(0.9));   // Right wheel
        cartGroup.add(createWheel(-0.9));  // Left wheel

        // Axle connecting the wheels
        const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8);
        const axle = new THREE.Mesh(axleGeo, woodMat);
        axle.rotation.x = Math.PI / 2;
        axle.position.set(0, wheelRadius, 0);
        cartGroup.add(axle);

        // Cart bed/platform - sits above axle
        const bedHeight = wheelRadius + 0.15;
        const bed = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.12, 1.4),
            woodMat
        );
        bed.position.y = bedHeight;
        bed.castShadow = true;
        cartGroup.add(bed);

        // Side rails
        const railGeo = new THREE.BoxGeometry(2.2, 0.25, 0.06);
        const rail1 = new THREE.Mesh(railGeo, woodMat);
        rail1.position.set(0, bedHeight + 0.18, 0.65);
        cartGroup.add(rail1);

        const rail2 = new THREE.Mesh(railGeo, woodMat);
        rail2.position.set(0, bedHeight + 0.18, -0.65);
        cartGroup.add(rail2);

        // Front and back rails
        const endRailGeo = new THREE.BoxGeometry(0.06, 0.25, 1.4);
        const endRail1 = new THREE.Mesh(endRailGeo, woodMat);
        endRail1.position.set(1.05, bedHeight + 0.18, 0);
        cartGroup.add(endRail1);

        const endRail2 = new THREE.Mesh(endRailGeo, woodMat);
        endRail2.position.set(-1.05, bedHeight + 0.18, 0);
        cartGroup.add(endRail2);

        // Corner posts
        const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
        const cornerPositions = [[1.0, 0.6], [1.0, -0.6], [-1.0, 0.6], [-1.0, -0.6]];
        cornerPositions.forEach(([px, pz]) => {
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(px, bedHeight + 0.3, pz);
            cartGroup.add(post);
        });

        // Shafts (for hitching to animal) - extend from front
        const shaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.5, 6);
        const shaft1 = new THREE.Mesh(shaftGeo, woodMat);
        shaft1.rotation.z = Math.PI / 2 - 0.12; // Slight downward angle
        shaft1.position.set(2.2, bedHeight - 0.3, 0.35);
        cartGroup.add(shaft1);

        const shaft2 = new THREE.Mesh(shaftGeo, woodMat);
        shaft2.rotation.z = Math.PI / 2 - 0.12;
        shaft2.position.set(2.2, bedHeight - 0.3, -0.35);
        cartGroup.add(shaft2);

        // Add cargo
        const cultural = this.config.cultural || {};
        const sashColors = cultural.sashColors || { primary: 0xcc0000, secondary: 0x0055a4 };

        // Cargo - bundle/sack
        const bundleGeo = new THREE.SphereGeometry(0.35, 8, 6);
        const bundleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });
        const bundle = new THREE.Mesh(bundleGeo, bundleMat);
        bundle.scale.set(1.2, 0.8, 1);
        bundle.position.set(-0.3, bedHeight + 0.35, 0);
        cartGroup.add(bundle);

        // Small crate
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.4), crateMat);
        crate.position.set(0.5, bedHeight + 0.25, 0.2);
        crate.rotation.y = 0.15;
        cartGroup.add(crate);

        // Sash draped over cargo
        const sashCanvas = document.createElement('canvas');
        sashCanvas.width = 64;
        sashCanvas.height = 128;
        const ctx = sashCanvas.getContext('2d');
        ctx.fillStyle = '#' + sashColors.primary.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 64, 128);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 128; i += 12) ctx.fillRect(0, i, 64, 3);
        ctx.fillStyle = '#' + sashColors.secondary.toString(16).padStart(6, '0');
        ctx.fillRect(24, 0, 16, 128);

        const sashTex = new THREE.CanvasTexture(sashCanvas);
        const sashMat = new THREE.MeshStandardMaterial({ map: sashTex, side: THREE.DoubleSide });
        const sash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), sashMat);
        sash.position.set(0, bedHeight + 0.55, 0.1);
        sash.rotation.x = -0.4;
        sash.rotation.z = 0.15;
        cartGroup.add(sash);

        // Position cart near cabin 3 (x=30, z=55) on higher ground
        // Place it along the path leading to cabin 3
        const cartX = 30;
        const cartZ = 48; // Between cabin 3 and the main trail
        cartGroup.position.set(cartX, 0, cartZ);
        cartGroup.rotation.y = -0.2;

        this.scene.add(cartGroup);
    }

    createCanoe() {
        // Birchbark-style canoe pulled up on shore
        const canoeGroup = new THREE.Group();

        // Hull - elongated ellipsoid shape
        const hullGeo = new THREE.CylinderGeometry(0.4, 0.5, 4, 12, 1, true);
        hullGeo.scale(1, 0.4, 1);

        const hullMat = new THREE.MeshStandardMaterial({
            color: 0xc4a87c, // Birchbark tan
            roughness: 0.7,
            side: THREE.DoubleSide
        });

        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.z = Math.PI / 2;
        hull.position.y = 0.3;
        canoeGroup.add(hull);

        // Gunwales (top edges)
        const gunwaleGeo = new THREE.TorusGeometry(0.4, 0.03, 8, 32, Math.PI);
        const gunwaleMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a });

        const gunwale1 = new THREE.Mesh(gunwaleGeo, gunwaleMat);
        gunwale1.rotation.y = Math.PI / 2;
        gunwale1.position.set(1.8, 0.4, 0);
        canoeGroup.add(gunwale1);

        const gunwale2 = new THREE.Mesh(gunwaleGeo, gunwaleMat);
        gunwale2.rotation.y = -Math.PI / 2;
        gunwale2.position.set(-1.8, 0.4, 0);
        canoeGroup.add(gunwale2);

        // Thwarts (cross-pieces)
        const thwartGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
        for (let i = -1; i <= 1; i++) {
            const thwart = new THREE.Mesh(thwartGeo, gunwaleMat);
            thwart.rotation.z = Math.PI / 2;
            thwart.position.set(i * 1.2, 0.4, 0);
            canoeGroup.add(thwart);
        }

        // Paddle resting in canoe
        const paddleShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6),
            gunwaleMat
        );
        paddleShaft.rotation.z = Math.PI / 2 + 0.1;
        paddleShaft.position.set(0.5, 0.5, 0.2);
        canoeGroup.add(paddleShaft);

        const paddleBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.4, 0.15),
            gunwaleMat
        );
        paddleBlade.position.set(1.2, 0.55, 0.2);
        canoeGroup.add(paddleBlade);

        // Position canoe near water on south bank
        const canoeX = -40;
        const riverMeander = Math.sin(canoeX * 0.03) * 12 + Math.sin(canoeX * 0.01) * 5;
        const riverWidth = 8 + Math.sin(canoeX * 0.02) * 4;
        const canoeZ = riverMeander - riverWidth - 2;
        const h = this.getHeight(canoeX, canoeZ);

        canoeGroup.position.set(canoeX, Math.max(h, -0.3), canoeZ);
        canoeGroup.rotation.y = 0.5;
        canoeGroup.rotation.x = 0.1; // Tilted slightly

        this.scene.add(canoeGroup);
    }

    createDryingRacks() {
        // Fish/meat drying racks near the river
        const rackGroup = new THREE.Group();

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
        const fishMat = new THREE.MeshStandardMaterial({ color: 0x8a6a5a, roughness: 0.8 });

        // Create A-frame rack
        const createRack = (offsetX) => {
            const rack = new THREE.Group();

            // Vertical poles
            const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 2, 6);

            const pole1 = new THREE.Mesh(poleGeo, woodMat);
            pole1.position.set(-0.5, 1, 0);
            pole1.rotation.z = 0.15;
            rack.add(pole1);

            const pole2 = new THREE.Mesh(poleGeo, woodMat);
            pole2.position.set(0.5, 1, 0);
            pole2.rotation.z = -0.15;
            rack.add(pole2);

            // Horizontal bar
            const bar = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
                woodMat
            );
            bar.rotation.z = Math.PI / 2;
            bar.position.y = 1.8;
            rack.add(bar);

            // Hanging fish shapes
            for (let i = 0; i < 4; i++) {
                const fish = new THREE.Mesh(
                    new THREE.ConeGeometry(0.08, 0.4, 4),
                    fishMat
                );
                fish.rotation.z = Math.PI;
                fish.position.set(-0.5 + i * 0.35, 1.5, 0);
                rack.add(fish);
            }

            rack.position.x = offsetX;
            return rack;
        };

        rackGroup.add(createRack(-1));
        rackGroup.add(createRack(1));

        // Position near river
        const rackX = 15;
        const riverMeander = Math.sin(rackX * 0.03) * 12 + Math.sin(rackX * 0.01) * 5;
        const riverWidth = 8 + Math.sin(rackX * 0.02) * 4;
        const rackZ = riverMeander + riverWidth + 4;
        const h = this.getHeight(rackX, rackZ);

        rackGroup.position.set(rackX, Math.max(h, 0.2), rackZ);

        this.scene.add(rackGroup);
    }

    createGardenPatch() {
        // Get garden positions and create each one
        const gardenPositions = Props.getGardenPositions();
        gardenPositions.forEach(pos => {
            const h = this.getHeight(pos.x, pos.z);
            this.createGarden(pos.x, pos.z, Math.max(h, 0.5));
        });
    }

    createGarden(x, z, terrainHeight) {
        // Small garden patch with vegetables/plants
        const gardenGroup = new THREE.Group();
        const h = Math.max(terrainHeight, 0.5);

        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1.0 });
        const plantMat = new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 });

        // Garden bed
        const bedGeo = new THREE.BoxGeometry(6, 0.15, 4);
        const bed = new THREE.Mesh(bedGeo, dirtMat);
        bed.receiveShadow = true;
        gardenGroup.add(bed);

        // Raised rows
        const rowGeo = new THREE.BoxGeometry(5.5, 0.2, 0.5);
        for (let i = -1.5; i <= 1.5; i += 1) {
            const row = new THREE.Mesh(rowGeo, dirtMat);
            row.position.set(0, 0.15, i);
            gardenGroup.add(row);

            // Plants on each row
            for (let j = -2; j <= 2; j += 0.6) {
                const plant = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 6, 4),
                    plantMat
                );
                plant.scale.set(1, 0.7, 1);
                plant.position.set(j, 0.35, i);
                gardenGroup.add(plant);
            }
        }

        // Fence posts around garden
        const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });

        const positions = [
            [-3.2, 0, -2.2], [3.2, 0, -2.2],
            [-3.2, 0, 2.2], [3.2, 0, 2.2],
            [0, 0, -2.2], [0, 0, 2.2]
        ];

        positions.forEach(pos => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(pos[0], 0.4, pos[2]);
            gardenGroup.add(post);
        });

        // Glowing aura to make it visible
        const auraGeo = new THREE.SphereGeometry(4, 16, 12);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x66aa44,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.y = 1;
        gardenGroup.add(aura);

        // Warm garden light
        const gardenLight = new THREE.PointLight(0x88aa44, 4, 18);
        gardenLight.position.set(0, 2, 0);
        gardenGroup.add(gardenLight);

        // Add floating marker above (green/brown color scheme for farming)
        const markerGroup = new THREE.Group();

        // Glowing orb
        const orbGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
            color: 0x66aa44,
            transparent: true,
            opacity: 0.75
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        markerGroup.add(orb);

        // Garden/plant icon (sprouting plant shape)
        const iconGroup = new THREE.Group();
        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 6);
        const stemMat = new THREE.MeshBasicMaterial({ color: 0x336622 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        iconGroup.add(stem);
        // Leaves
        const leafGeo = new THREE.SphereGeometry(0.15, 6, 4);
        const leafMat = new THREE.MeshBasicMaterial({ color: 0x44aa33 });
        const leaf1 = new THREE.Mesh(leafGeo, leafMat);
        leaf1.scale.set(1, 0.5, 0.5);
        leaf1.position.set(0.12, 0.15, 0);
        leaf1.rotation.z = -0.4;
        iconGroup.add(leaf1);
        const leaf2 = new THREE.Mesh(leafGeo, leafMat);
        leaf2.scale.set(1, 0.5, 0.5);
        leaf2.position.set(-0.12, 0.18, 0);
        leaf2.rotation.z = 0.4;
        iconGroup.add(leaf2);
        markerGroup.add(iconGroup);

        // Outer glow ring
        const glowRingGeo = new THREE.RingGeometry(0.9, 1.2, 32);
        const glowRingMat = new THREE.MeshBasicMaterial({
            color: 0x88cc66,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
        markerGroup.add(glowRing);

        // Marker light
        const markerLight = new THREE.PointLight(0x66aa44, 6, 25);
        markerGroup.add(markerLight);

        markerGroup.position.y = 5;
        markerGroup.userData = { orb, markerLight, glowRing };
        gardenGroup.add(markerGroup);
        gardenGroup.userData.marker = markerGroup;

        // Position garden at terrain height
        gardenGroup.position.set(x, h, z);

        this.scene.add(gardenGroup);
    }

    update(time, camera) {
        // Animate main fire
        if (this.fireLight) {
            this.fireLight.intensity = 5 + Math.sin(time * 10) * 2 + Math.cos(time * 23) * 1;
        }

        // Animate all fireplace lights
        this.fireLights.forEach((light, i) => {
            light.intensity = 3 + Math.sin(time * 8 + i) * 1.5 + Math.cos(time * 15 + i * 2) * 0.8;
        });

        // Animate herb bundle lights and particles
        this.herbLights.forEach((herbData, i) => {
            herbData.light.intensity = 4 + Math.sin(time * 2 + i) * 1.5;
            if (herbData.particles) {
                herbData.particles.rotation.y = time * 0.3;
                // Make particles float up and down
                const positions = herbData.particles.geometry.attributes.position.array;
                for (let j = 1; j < positions.length; j += 3) {
                    positions[j] += Math.sin(time * 2 + j) * 0.002;
                }
                herbData.particles.geometry.attributes.position.needsUpdate = true;
            }
        });

        // Animate log pile lights
        this.logPileLights.forEach((light, i) => {
            light.intensity = 4 + Math.sin(time * 1.5 + i) * 1;
        });

        // Animate fishing spot lights (gentle water-like shimmer)
        this.fishingLights.forEach((light, i) => {
            light.intensity = 4 + Math.sin(time * 1.8 + i) * 1.2 + Math.cos(time * 2.5 + i) * 0.5;
        });

        // Animate memorial lights (gentle flickering candle effect)
        this.memorialLights.forEach((light, i) => {
            light.intensity = 3 + Math.sin(time * 3 + i) * 0.8 + Math.cos(time * 7 + i) * 0.4;
        });

        // Make floating numbers always face camera (billboard effect)
        if (this.cabinNumbers && camera) {
            this.cabinNumbers.forEach(numberGroup => {
                // Make the number plane and glow ring face the camera
                numberGroup.userData.numberPlane.lookAt(camera.position);
                if (numberGroup.userData.glowRing) {
                    numberGroup.userData.glowRing.lookAt(camera.position);
                }

                // Animation for unvisited cabins
                if (!numberGroup.userData.visited) {
                    // Floating bob animation
                    numberGroup.position.y = 6 + Math.sin(time * 2 + numberGroup.userData.cabinNumber) * 0.3;

                    // Pulsing light - stronger effect
                    numberGroup.userData.light.intensity = 8 + Math.sin(time * 3) * 3;

                    // Pulse the orb opacity slightly
                    numberGroup.userData.orb.material.opacity = 0.75 + Math.sin(time * 2.5) * 0.15;

                    // Pulse the glow ring
                    if (numberGroup.userData.glowRing) {
                        numberGroup.userData.glowRing.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
                    }
                }
            });
        }
    }
}
