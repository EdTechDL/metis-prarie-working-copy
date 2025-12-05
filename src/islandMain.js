import { IslandWorld } from './IslandWorld.js';
import { IslandInteractionManager } from './IslandInteractionManager.js';

// ============================================================
// FLOATING ISLAND ENVIRONMENT
// A clean, geometric, professional-quality 3D experience
// ============================================================

const CONFIG = {
    // Configuration options for future customization
    theme: 'twilight', // twilight, dawn, night
};

// ============================================================
// INITIALIZATION
// ============================================================
try {
    const container = document.body;
    const world = new IslandWorld(container, CONFIG);

    // Initialize interaction system
    const interactions = new IslandInteractionManager(
        world.scene,
        world.camera,
        world,
        world.controls,
        world.renderer.domElement
    );

    // Start animation
    world.animate();

    console.log('Floating Island Environment initialized successfully!');

    // ============================================================
    // WELCOME MODAL & PROGRESS TRACKING
    // ============================================================

    const welcomeModal = document.getElementById('welcome-modal');
    const beginBtn = document.getElementById('welcome-begin-btn');

    // Check if user has visited before
    const hasVisited = localStorage.getItem('metisPrairieVisited');
    if (!hasVisited && welcomeModal) {
        welcomeModal.classList.remove('hidden');
        world.controls.enabled = false;
    }

    // Prevent scroll events from reaching 3D scene
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

    // Progress Tracking System
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

        if (count >= TOTAL_STATIONS) {
            showCompletionMessage();
        }
    }

    function showCompletionMessage() {
        if (window.completionShown) return;
        window.completionShown = true;

        const completionDiv = document.createElement('div');
        completionDiv.id = 'completion-message';
        completionDiv.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">✦</div>
                <h2>Kihci-marsii!</h2>
                <p class="completion-subtitle">A Great Thank You!</p>
                <p>You have completed your journey across the Islands.<br>
                You have learned from the Elders and connected with the traditions of the Métis people.</p>
                <p class="completion-quote"><em>"We are all related. What we do for ourselves, we do for all."</em></p>
                <button onclick="this.parentElement.parentElement.remove()">Continue Exploring</button>
            </div>
        `;
        document.body.appendChild(completionDiv);

        if (!document.getElementById('completion-styles')) {
            const styles = document.createElement('style');
            styles.id = 'completion-styles';
            styles.textContent = `
                #completion-message {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(10, 22, 40, 0.95);
                    backdrop-filter: blur(15px);
                    z-index: 3000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .completion-content {
                    background: linear-gradient(135deg, rgba(30, 58, 95, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%);
                    border: 2px solid rgba(136, 204, 255, 0.5);
                    border-radius: 20px;
                    padding: 50px 60px;
                    text-align: center;
                    color: white;
                    max-width: 520px;
                    box-shadow: 0 0 100px rgba(136, 204, 255, 0.3);
                }
                .completion-icon {
                    font-size: 5rem;
                    margin-bottom: 20px;
                    color: #ffcc66;
                    text-shadow: 0 0 40px rgba(255, 204, 102, 0.6);
                }
                .completion-content h2 {
                    color: #ffcc66;
                    font-size: 2.8rem;
                    margin: 0;
                    font-family: 'Georgia', serif;
                }
                .completion-subtitle {
                    color: rgba(136, 204, 255, 0.8);
                    font-style: italic;
                    margin: 8px 0 25px 0;
                    font-size: 1.1rem;
                }
                .completion-content p {
                    color: #d0e0f0;
                    line-height: 1.8;
                    margin-bottom: 18px;
                    font-size: 1.05rem;
                }
                .completion-quote {
                    color: #88ccff !important;
                    font-size: 1.15rem !important;
                }
                .completion-content button {
                    background: linear-gradient(135deg, #4488cc 0%, #2266aa 100%);
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    font-size: 1.1rem;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 30px;
                    margin-top: 20px;
                    transition: all 0.3s ease;
                }
                .completion-content button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 8px 30px rgba(68, 136, 204, 0.5);
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // Initialize progress on load
    updateProgressUI();

    // Expose progress tracking to global scope
    window.metisPrairieProgress = {
        markVisited: markStationVisited,
        getVisited: getVisitedStations,
        updateUI: updateProgressUI
    };

} catch (error) {
    console.error('Failed to initialize scene:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ff6666;
        font-size: 18px;
        text-align: center;
        background: rgba(10, 22, 40, 0.95);
        padding: 40px;
        border-radius: 16px;
        border: 1px solid rgba(255, 100, 100, 0.3);
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 15px;">⚠</div>
        <strong>Error loading scene</strong><br><br>
        ${error.message}
    `;
    document.body.appendChild(errorDiv);
}
