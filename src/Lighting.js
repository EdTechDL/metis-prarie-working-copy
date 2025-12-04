import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class Lighting {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;

        this.init();
    }

    init() {
        const lightCfg = this.config.lighting || {};
        const fogCfg = this.config.fog || {};
        const skyCfg = this.config.sky || {};

        // Ambient Light (Soft fill) - hemisphere light for natural outdoor feel
        this.ambientLight = new THREE.HemisphereLight(
            skyCfg.horizonColor || 0xffcc88,
            this.config.terrain?.grassColor || 0x3a5f0b,
            lightCfg.ambientIntensity || 0.6
        );
        this.scene.add(this.ambientLight);

        // Sun (Directional Light)
        this.sunLight = new THREE.DirectionalLight(
            lightCfg.sunColor || 0xffaa55,
            lightCfg.sunIntensity || 2.5
        );
        this.sunLight.position.set(-10, 5, 10);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.bias = -0.0001;

        // Shadow camera bounds
        const d = 40;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;

        this.scene.add(this.sunLight);

        // Fog - exponential fog for depth
        this.scene.fog = new THREE.FogExp2(
            fogCfg.color || 0xeedd99,
            fogCfg.density || 0.012
        );

        // Sky Shader
        this.initSky();
        this.initParticles();
        this.initClouds();
        this.initBirds();
    }

    initSky() {
        const skyCfg = this.config.sky || {};

        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);

        const uniforms = this.sky.material.uniforms;
        uniforms['turbidity'].value = skyCfg.turbidity || 8;
        uniforms['rayleigh'].value = skyCfg.rayleigh || 2;
        uniforms['mieCoefficient'].value = skyCfg.mieCoefficient || 0.005;
        uniforms['mieDirectionalG'].value = skyCfg.mieDirectionalG || 0.8;

        this.updateSunPosition();
    }

    initClouds() {
        const cloudCfg = this.config.clouds || {};

        // Create fluffy clouds using sprite-like planes
        this.clouds = [];
        const cloudCount = cloudCfg.count || 20;
        const minHeight = cloudCfg.minHeight || 60;
        const maxHeight = cloudCfg.maxHeight || 100;
        const baseSpeed = cloudCfg.speed || 0.5;

        // Cloud material - soft white/orange tinted for golden hour
        const cloudMat = new THREE.MeshBasicMaterial({
            color: cloudCfg.color || 0xffeedd,
            transparent: true,
            opacity: cloudCfg.opacity || 0.6,
            side: THREE.DoubleSide,
            fog: false
        });

        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = new THREE.Group();

            // Each cloud is made of several overlapping ellipsoids
            const puffs = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < puffs; j++) {
                const puff = new THREE.Mesh(
                    new THREE.SphereGeometry(15 + Math.random() * 20, 8, 6),
                    cloudMat
                );
                puff.scale.set(1 + Math.random() * 0.5, 0.4 + Math.random() * 0.3, 1 + Math.random() * 0.5);
                puff.position.set(
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 30
                );
                cloudGroup.add(puff);
            }

            cloudGroup.position.set(
                (Math.random() - 0.5) * 400,
                minHeight + Math.random() * (maxHeight - minHeight),
                (Math.random() - 0.5) * 400
            );

            cloudGroup.userData.speed = baseSpeed + Math.random() * baseSpeed;
            this.clouds.push(cloudGroup);
            this.scene.add(cloudGroup);
        }
    }

    initBirds() {
        const birdCfg = this.config.birds || {};

        // Simple birds as small triangles flying in flocks
        this.birds = [];
        const flockCount = birdCfg.flockCount || 5;
        const birdsPerFlock = birdCfg.birdsPerFlock || 8;
        const flightSpeed = birdCfg.flightSpeed || 6;
        const flightHeight = birdCfg.flightHeight || 35;

        for (let f = 0; f < flockCount; f++) {
            const flock = new THREE.Group();
            const birdCount = Math.floor(birdsPerFlock * 0.6) + Math.floor(Math.random() * birdsPerFlock * 0.8);

            const birdMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });

            for (let i = 0; i < birdCount; i++) {
                // Simple V-shaped bird
                const birdGeo = new THREE.BufferGeometry();
                const vertices = new Float32Array([
                    0, 0, 0,
                    -0.5, 0, 0.2,
                    0, 0, 0.1,
                    0.5, 0, 0.2
                ]);
                const indices = [0, 1, 2, 0, 2, 3];
                birdGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                birdGeo.setIndex(indices);

                const bird = new THREE.Mesh(birdGeo, birdMat);
                bird.position.set(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 10
                );
                bird.userData.wingPhase = Math.random() * Math.PI * 2;
                flock.add(bird);
            }

            flock.position.set(
                (Math.random() - 0.5) * 200,
                flightHeight - 10 + Math.random() * 20,
                (Math.random() - 0.5) * 200
            );
            flock.userData.speed = flightSpeed * 0.7 + Math.random() * flightSpeed * 0.6;
            flock.userData.angle = Math.random() * Math.PI * 2;

            this.birds.push(flock);
            this.scene.add(flock);
        }
    }

    initParticles() {
        const particleCfg = this.config.particles || {};

        // Dust motes / Fireflies
        const geometry = new THREE.BufferGeometry();
        const count = particleCfg.dustMoteCount || 1500;
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 15;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
            speeds[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));

        const material = new THREE.PointsMaterial({
            color: particleCfg.dustMoteColor || 0xffddaa,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particleCount = count;
        this.scene.add(this.particles);
    }

    updateSunPosition() {
        const lightCfg = this.config.lighting || {};
        const phi = THREE.MathUtils.degToRad(90 - (lightCfg.sunElevation || 8));
        const theta = THREE.MathUtils.degToRad(lightCfg.sunAzimuth || 200);

        const sunPosition = new THREE.Vector3();
        sunPosition.setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['sunPosition'].value.copy(sunPosition);
        this.sunLight.position.copy(sunPosition).multiplyScalar(20);
    }

    update(time) {
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            const speeds = this.particles.geometry.attributes.speed.array;
            const count = this.particleCount || 1500;

            for (let i = 0; i < count; i++) {
                positions[i * 3 + 1] += Math.sin(time + speeds[i] * 10) * 0.01 + 0.01;
                positions[i * 3] += Math.cos(time * 0.5 + speeds[i]) * 0.01;
                if (positions[i * 3 + 1] > 15) positions[i * 3 + 1] = 0;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Animate clouds drifting
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * 0.02;
            if (cloud.position.x > 250) cloud.position.x = -250;
        });

        // Animate birds flying
        this.birds.forEach(flock => {
            flock.position.x += Math.cos(flock.userData.angle) * flock.userData.speed * 0.01;
            flock.position.z += Math.sin(flock.userData.angle) * flock.userData.speed * 0.01;

            // Wrap around
            if (flock.position.x > 150) flock.position.x = -150;
            if (flock.position.x < -150) flock.position.x = 150;
            if (flock.position.z > 150) flock.position.z = -150;
            if (flock.position.z < -150) flock.position.z = 150;

            // Slight bobbing and wing flap simulation
            flock.children.forEach(bird => {
                bird.rotation.z = Math.sin(time * 8 + bird.userData.wingPhase) * 0.3;
            });
        });
    }
}
