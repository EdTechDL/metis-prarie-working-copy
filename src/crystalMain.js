import { CrystalWorld } from './CrystalWorld.js';
import { IslandInteractionManager } from './IslandInteractionManager.js';

// ============================================================
// CRYSTAL GARDEN ENVIRONMENT
// Ethereal crystalline landscape
// ============================================================

try {
    const container = document.body;
    const world = new CrystalWorld(container, {});

    // Reuse island interaction manager with crystal positions
    const interactions = new IslandInteractionManager(
        world.scene,
        world.camera,
        world,
        world.controls,
        world.renderer.domElement
    );

    world.animate();
    console.log('Crystal Garden initialized!');

    // Welcome modal handling
    const welcomeModal = document.getElementById('welcome-modal');
    const beginBtn = document.getElementById('welcome-begin-btn');

    const hasVisited = localStorage.getItem('metisPrairieVisited');
    if (!hasVisited && welcomeModal) {
        welcomeModal.classList.remove('hidden');
        world.controls.enabled = false;
    }

    if (welcomeModal) {
        welcomeModal.addEventListener('wheel', (e) => {
            e.stopPropagation();
            e.preventDefault();
        }, { passive: false });
    }

    if (beginBtn) {
        beginBtn.addEventListener('click', () => {
            welcomeModal.classList.add('hidden');
            localStorage.setItem('metisPrairieVisited', 'true');
            world.controls.enabled = true;
        });
    }

    // Progress tracking
    const progressBar = document.getElementById('progress-bar');
    const progressCount = document.getElementById('progress-count');
    const TOTAL_STATIONS = 18;

    function getVisitedStations() {
        const saved = localStorage.getItem('metisPrairieProgress');
        return saved ? JSON.parse(saved) : [];
    }

    function markStationVisited(stationType, stationId) {
        const key = `${stationType}-${stationId}`;
        const visited = getVisitedStations();
        if (!visited.includes(key)) {
            visited.push(key);
            localStorage.setItem('metisPrairieProgress', JSON.stringify(visited));
            updateProgressUI();
        }
    }

    function updateProgressUI() {
        const visited = getVisitedStations();
        const count = visited.length;
        const percentage = (count / TOTAL_STATIONS) * 100;
        if (progressBar) progressBar.style.width = percentage + '%';
        if (progressCount) progressCount.textContent = count;
    }

    updateProgressUI();

    window.metisPrairieProgress = {
        markVisited: markStationVisited,
        getVisited: getVisitedStations,
        updateUI: updateProgressUI
    };

} catch (error) {
    console.error('Failed to initialize:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        color: #ff6666; font-size: 18px; text-align: center;
        background: rgba(10, 0, 20, 0.95); padding: 40px;
        border-radius: 16px; border: 1px solid rgba(128, 64, 255, 0.3);
    `;
    errorDiv.innerHTML = `<strong>Error loading Crystal Garden</strong><br><br>${error.message}`;
    document.body.appendChild(errorDiv);
}
