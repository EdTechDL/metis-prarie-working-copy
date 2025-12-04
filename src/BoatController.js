import * as THREE from 'three';

export class BoatController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // Boat position (on the water surface)
        this.position = new THREE.Vector3(0, 0.5, 0); // Start in the middle of the river
        this.velocity = new THREE.Vector3();

        // Camera rotation (looking around from the boat)
        this.yaw = 0;   // Left/right rotation
        this.pitch = 0; // Up/down rotation

        // Movement settings
        this.moveSpeed = 8;       // Units per second
        this.turnSpeed = 1.5;     // Radians per second for keyboard turning
        this.mouseSensitivity = 0.002;
        this.friction = 0.95;

        // Input state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false
        };

        this.isPointerLocked = false;

        this.init();
    }

    init() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse look (optional - click to enable)
        this.domElement.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.domElement.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.domElement;
        });

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Initial camera setup
        this.updateCamera();
    }

    onKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
        }
    }

    onMouseMove(e) {
        if (!this.isPointerLocked) return;

        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;

        // Clamp pitch to prevent flipping
        this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    }

    update(deltaTime) {
        // Handle keyboard turning (when not using mouse look)
        if (!this.isPointerLocked) {
            if (this.keys.left) this.yaw += this.turnSpeed * deltaTime;
            if (this.keys.right) this.yaw -= this.turnSpeed * deltaTime;
        }

        // Calculate forward direction based on yaw
        // Negative Z is "forward" in Three.js default camera orientation
        const forward = new THREE.Vector3(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        );

        // Apply movement
        if (this.keys.forward) {
            this.velocity.add(forward.clone().multiplyScalar(this.moveSpeed * deltaTime));
        }
        if (this.keys.backward) {
            this.velocity.add(forward.clone().multiplyScalar(-this.moveSpeed * deltaTime * 0.5)); // Slower reverse
        }

        // Only allow strafing when mouse look is active
        if (this.isPointerLocked) {
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
            if (this.keys.left) {
                this.velocity.add(right.clone().multiplyScalar(-this.moveSpeed * deltaTime * 0.5));
            }
            if (this.keys.right) {
                this.velocity.add(right.clone().multiplyScalar(this.moveSpeed * deltaTime * 0.5));
            }
        }

        // Apply friction (water drag)
        this.velocity.multiplyScalar(this.friction);

        // Update position
        this.position.add(this.velocity);

        // Keep boat on water level
        this.position.y = 0.5;

        // Constrain to expanded river area
        this.position.x = Math.max(-180, Math.min(180, this.position.x));
        this.position.z = Math.max(-15, Math.min(15, this.position.z)); // Wider river

        this.updateCamera();
    }

    updateCamera() {
        // Position camera on the boat
        this.camera.position.copy(this.position);
        this.camera.position.y = 1.5; // Eye height above water

        // Apply rotation
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    // For external access
    getPosition() {
        return this.position.clone();
    }
}
