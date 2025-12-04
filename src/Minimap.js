import * as THREE from 'three';

export class Minimap {
    constructor(camera, controls, cabinPositions, fireplacePositions = [], herbPositions = [], logPilePositions = [], gardenPositions = [], cartPositions = [], fishingPositions = [], memorialPositions = []) {
        this.camera = camera;
        this.controls = controls;
        this.cabinPositions = cabinPositions;
        this.fireplacePositions = fireplacePositions;
        this.herbPositions = herbPositions;
        this.logPilePositions = logPilePositions;
        this.gardenPositions = gardenPositions;
        this.cartPositions = cartPositions;
        this.fishingPositions = fishingPositions;
        this.memorialPositions = memorialPositions;

        // World bounds (focused on where content is, not full terrain)
        this.worldBounds = {
            minX: -120,
            maxX: 160,
            minZ: -100,
            maxZ: 100
        };

        // Get DOM elements
        this.minimapEl = document.getElementById('minimap');
        this.indicatorEl = document.getElementById('minimap-indicator');

        if (this.minimapEl && this.indicatorEl) {
            this.init();
        }
    }

    init() {
        // Add river SVG (should be first so it's behind markers)
        this.addRiverPath();

        // Add cabin markers to minimap
        this.addCabinMarkers();

        // Add fireplace markers to minimap
        this.addFireplaceMarkers();

        // Add herb bundle markers to minimap
        this.addHerbMarkers();

        // Add log pile markers to minimap
        this.addLogPileMarkers();

        // Add garden markers to minimap
        this.addGardenMarkers();

        // Add cart markers to minimap
        this.addCartMarkers();

        // Add fishing markers to minimap
        this.addFishingMarkers();

        // Add memorial markers to minimap
        this.addMemorialMarkers();

        // Set up click handler for navigation
        this.minimapEl.addEventListener('click', (e) => this.onMinimapClick(e));

        // Set up cabin jump buttons
        this.setupCabinButtons();

        // Set up overview button
        this.setupOverviewButton();

        // Update indicator position on each frame
        this.updateIndicator();

        // Store initial camera position for overview reset
        this.initialCameraPos = this.camera.position.clone();
        this.initialTarget = this.controls.target.clone();
    }

    addRiverPath() {
        // Create SVG element for the meandering river
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'minimap-river';
        svg.setAttribute('viewBox', '0 0 196 140');
        svg.setAttribute('preserveAspectRatio', 'none');

        // Generate river path using the same formula as Terrain.js:
        // riverMeander = Math.sin(x * 0.03) * 12 + Math.sin(x * 0.01) * 5
        // This gives the z-position of river center at each x
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Sample points along the river and convert to minimap coordinates
        const points = [];
        const mapWidth = 196;
        const mapHeight = 140;

        // Sample from world X bounds with some extra on each end
        for (let worldX = this.worldBounds.minX - 20; worldX <= this.worldBounds.maxX + 20; worldX += 5) {
            // Calculate river center Z using terrain formula
            const riverMeander = Math.sin(worldX * 0.03) * 12 + Math.sin(worldX * 0.01) * 5;

            // Convert to minimap coordinates
            const normalizedX = (worldX - this.worldBounds.minX) / (this.worldBounds.maxX - this.worldBounds.minX);
            const normalizedZ = (riverMeander - this.worldBounds.minZ) / (this.worldBounds.maxZ - this.worldBounds.minZ);

            const pixelX = normalizedX * mapWidth;
            const pixelY = normalizedZ * mapHeight;

            points.push({ x: pixelX, y: pixelY });
        }

        // Create smooth path using the points
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }

        path.setAttribute('d', d);
        svg.appendChild(path);

        // Insert at the beginning of minimap so it's behind other markers
        this.minimapEl.insertBefore(svg, this.minimapEl.firstChild);
    }

    setupCabinButtons() {
        const buttons = document.querySelectorAll('.cabin-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const cabinNum = parseInt(btn.getAttribute('data-cabin'));
                this.jumpToCabin(cabinNum);
            });
        });
    }

    setupOverviewButton() {
        const overviewBtn = document.getElementById('overview-btn');
        if (overviewBtn) {
            overviewBtn.addEventListener('click', () => this.resetToOverview());
        }
    }

    // Jump camera to specific cabin
    jumpToCabin(cabinNumber) {
        const cabin = this.cabinPositions[cabinNumber - 1];
        if (!cabin) return;

        // Position camera to look at cabin from a nice angle
        const targetX = cabin.x;
        const targetZ = cabin.z;

        // Position camera offset from cabin, looking towards it
        const cameraOffset = 25;
        const cameraHeight = 15;

        const newTarget = new THREE.Vector3(targetX, 2, targetZ);
        const newCameraPos = new THREE.Vector3(
            targetX - cameraOffset * 0.5,
            cameraHeight,
            targetZ + cameraOffset
        );

        this.animateCamera(newCameraPos, newTarget);
    }

    // Reset camera to initial overview position
    resetToOverview() {
        const overviewCameraPos = new THREE.Vector3(0, 50, 80);
        const overviewTarget = new THREE.Vector3(30, 0, 0);

        this.animateCamera(overviewCameraPos, overviewTarget);
    }

    // Mark a cabin button as visited
    markCabinVisited(cabinNumber) {
        const btn = document.querySelector(`.cabin-btn[data-cabin="${cabinNumber}"]`);
        if (btn) {
            btn.classList.add('visited');
        }
    }

    addCabinMarkers() {
        this.cabinPositions.forEach((cabin, index) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-cabin';
            marker.textContent = (index + 1).toString();

            // Convert world position to minimap position
            const pos = this.worldToMinimap(cabin.x, cabin.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addFireplaceMarkers() {
        if (!this.fireplacePositions || this.fireplacePositions.length === 0) {
            return;
        }

        this.fireplacePositions.forEach((fire) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-fire';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(fire.x, fire.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addHerbMarkers() {
        if (!this.herbPositions || this.herbPositions.length === 0) {
            return;
        }

        this.herbPositions.forEach((herb) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-herbs';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(herb.x, herb.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addLogPileMarkers() {
        if (!this.logPilePositions || this.logPilePositions.length === 0) {
            return;
        }

        this.logPilePositions.forEach((logPile) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-logpile';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(logPile.x, logPile.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addGardenMarkers() {
        if (!this.gardenPositions || this.gardenPositions.length === 0) {
            return;
        }

        this.gardenPositions.forEach((garden) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-garden';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(garden.x, garden.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addCartMarkers() {
        if (!this.cartPositions || this.cartPositions.length === 0) {
            return;
        }

        this.cartPositions.forEach((cart) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-cart';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(cart.x, cart.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addFishingMarkers() {
        if (!this.fishingPositions || this.fishingPositions.length === 0) {
            return;
        }

        this.fishingPositions.forEach((fishing) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-fishing';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(fishing.x, fishing.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    addMemorialMarkers() {
        if (!this.memorialPositions || this.memorialPositions.length === 0) {
            return;
        }

        this.memorialPositions.forEach((memorial) => {
            const marker = document.createElement('div');
            marker.className = 'minimap-memorial';

            // Convert world position to minimap position
            const pos = this.worldToMinimap(memorial.x, memorial.z);
            marker.style.left = pos.x + 'px';
            marker.style.top = pos.y + 'px';

            this.minimapEl.appendChild(marker);
        });
    }

    // Convert world coordinates to minimap pixel coordinates
    worldToMinimap(worldX, worldZ) {
        const mapWidth = this.minimapEl.offsetWidth;
        const mapHeight = this.minimapEl.offsetHeight;

        const normalizedX = (worldX - this.worldBounds.minX) / (this.worldBounds.maxX - this.worldBounds.minX);
        const normalizedZ = (worldZ - this.worldBounds.minZ) / (this.worldBounds.maxZ - this.worldBounds.minZ);

        return {
            x: normalizedX * mapWidth,
            y: normalizedZ * mapHeight
        };
    }

    // Convert minimap pixel coordinates to world coordinates
    minimapToWorld(pixelX, pixelY) {
        const mapWidth = this.minimapEl.offsetWidth;
        const mapHeight = this.minimapEl.offsetHeight;

        const normalizedX = pixelX / mapWidth;
        const normalizedZ = pixelY / mapHeight;

        return {
            x: this.worldBounds.minX + normalizedX * (this.worldBounds.maxX - this.worldBounds.minX),
            z: this.worldBounds.minZ + normalizedZ * (this.worldBounds.maxZ - this.worldBounds.minZ)
        };
    }

    onMinimapClick(event) {
        const rect = this.minimapEl.getBoundingClientRect();
        const pixelX = event.clientX - rect.left;
        const pixelY = event.clientY - rect.top;

        const worldPos = this.minimapToWorld(pixelX, pixelY);

        // Smoothly move camera to new position
        this.moveCameraTo(worldPos.x, worldPos.z);
    }

    moveCameraTo(targetX, targetZ) {
        // Get current camera distance from target
        const currentTarget = this.controls.target.clone();
        const currentPos = this.camera.position.clone();
        const offsetY = currentPos.y - currentTarget.y;
        const horizontalDist = Math.sqrt(
            Math.pow(currentPos.x - currentTarget.x, 2) +
            Math.pow(currentPos.z - currentTarget.z, 2)
        );

        // Calculate direction from current target to camera
        const direction = new THREE.Vector3(
            currentPos.x - currentTarget.x,
            0,
            currentPos.z - currentTarget.z
        ).normalize();

        // New target position
        const newTarget = new THREE.Vector3(targetX, 0, targetZ);

        // New camera position (maintain same relative offset)
        const newCameraPos = new THREE.Vector3(
            targetX + direction.x * horizontalDist,
            offsetY,
            targetZ + direction.z * horizontalDist
        );

        // Animate the transition
        this.animateCamera(newCameraPos, newTarget);
    }

    animateCamera(targetCameraPos, targetLookAt) {
        const startCameraPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 600; // milliseconds
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            // Interpolate camera position
            this.camera.position.lerpVectors(startCameraPos, targetCameraPos, eased);

            // Interpolate target
            this.controls.target.lerpVectors(startTarget, targetLookAt, eased);

            // Update controls
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateIndicator() {
        // Get the controls target (where camera is looking)
        const target = this.controls.target;

        // Convert to minimap position
        const pos = this.worldToMinimap(target.x, target.z);

        // Clamp to minimap bounds
        const mapWidth = this.minimapEl.offsetWidth;
        const mapHeight = this.minimapEl.offsetHeight;

        const clampedX = Math.max(12, Math.min(mapWidth - 12, pos.x));
        const clampedY = Math.max(9, Math.min(mapHeight - 9, pos.y));

        this.indicatorEl.style.left = clampedX + 'px';
        this.indicatorEl.style.top = clampedY + 'px';
    }

    update() {
        this.updateIndicator();
    }
}
