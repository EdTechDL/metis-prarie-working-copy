import { World } from './World.js';

// ============================================================
// ENVIRONMENT CONFIGURATION
// ============================================================
// Educators: Adjust these values to customize the scene.
// All color values are hexadecimal (0xRRGGBB format).
// ============================================================

const CONFIG = {
    // --- SKY & ATMOSPHERE ---
    sky: {
        // Gradient colors for sky dome (bottom to top)
        horizonColor: 0xffcc88,      // Warm golden/orange at horizon (sunrise/sunset feel)
        zenithColor: 0x4488cc,       // Cool blue overhead
        turbidity: 8,                // Atmospheric haze (2-20, higher = hazier golden hour)
        rayleigh: 2,                 // Blue scattering (0-4, higher = bluer sky)
        mieCoefficient: 0.005,       // Sun glow intensity
        mieDirectionalG: 0.8,        // Sun glow spread (0-1)
    },

    // --- LIGHTING ---
    lighting: {
        sunElevation: 8,             // Sun height in degrees (0 = horizon, 90 = overhead)
        sunAzimuth: 200,             // Sun direction in degrees (0 = North, 90 = East)
        sunIntensity: 2.5,           // Main sun brightness (1-5)
        sunColor: 0xffaa55,          // Warm golden sun color
        ambientIntensity: 0.6,       // Fill light strength (0-1)
        // Elder location accent lighting
        elderLightColor: 0xff6622,   // Warm fire-like glow for Elder markers
        elderLightIntensity: 2.5,    // Brightness of Elder location lights
        elderLightRadius: 10,        // How far the light reaches
    },

    // --- FOG & ATMOSPHERE ---
    fog: {
        color: 0xeedd99,             // Warm golden fog (matches horizon)
        density: 0.012,              // Fog thickness (0.005-0.05, lower = clearer)
        nearDistance: 50,            // Where fog starts (for linear fog)
        farDistance: 300,            // Where fog is fully opaque
    },

    // --- TERRAIN ---
    terrain: {
        size: 400,                   // Total terrain size
        segments: 200,               // Detail level (higher = smoother but slower)
        // Colors
        grassColor: 0x3a5f0b,        // Deep prairie green
        dryGrassColor: 0x8f7e45,     // Dry grass / earth tones
        riverbedColor: 0x3d3d3d,     // Dark riverbed
        trailColor: 0x6b5a4a,        // Cart trail dirt color
        sandbarColor: 0xc4a87c,      // Sandy areas near water
        bluffColor: 0x7a6b5a,        // Exposed earth on cutbanks
    },

    // --- WATER ---
    water: {
        color: 0x2d7a7a,             // Main river color (teal-green)
        deepColor: 0x1a5555,         // Darker color near banks
        opacity: 0.85,               // Water transparency (0-1)
        flowSpeed: 0.3,              // How fast the water appears to flow
        waveIntensity: 0.15,         // Wave animation strength
        specularIntensity: 0.4,      // Shininess/reflection
    },

    // --- VEGETATION ---
    vegetation: {
        grassDensity: 50000,         // Number of grass blades (performance vs. detail)
        grassColor: 0x3a5f0b,        // Base grass color
        tallGrassColor: 0x4a6f1b,    // Taller prairie grass
        reedColor: 0x5a7a4a,         // Reeds near water
        willowColor: 0x4a6a3a,       // Willow trees
        poplarColor: 0x3a5a2a,       // Poplar trees
        spruceColor: 0x1a3320,       // Dark spruce/evergreen
        berryBushColor: 0x2a4a2a,    // Berry bushes
        treeCount: 80,               // Number of trees
        reedClusterCount: 30,        // Reed clusters near water
        bushCount: 40,               // Berry bushes and shrubs
    },

    // --- WIND & ANIMATION ---
    wind: {
        speed: 1.0,                  // Overall wind animation speed (0.5-2)
        gustStrength: 0.3,           // Random gust intensity
        swayAmount: 0.2,             // How much plants bend
    },

    // --- PARTICLES & AMBIENCE ---
    particles: {
        dustMoteCount: 1500,         // Floating dust/pollen particles
        dustMoteColor: 0xffddaa,     // Warm golden dust color
        fireflyCount: 200,           // Fireflies near water/fire (evening feel)
        fireflyColor: 0xffff88,      // Soft yellow-green
    },

    // --- CLOUDS ---
    clouds: {
        count: 20,                   // Number of cloud groups
        minHeight: 60,               // Lowest clouds
        maxHeight: 100,              // Highest clouds
        speed: 0.5,                  // Drift speed
        color: 0xffeedd,             // Warm-tinted clouds (golden hour)
        opacity: 0.6,                // Cloud transparency
    },

    // --- BIRDS ---
    birds: {
        flockCount: 5,               // Number of bird flocks
        birdsPerFlock: 8,            // Average birds per flock
        flightSpeed: 6,              // How fast they move
        flightHeight: 35,            // Average flight altitude
    },

    // --- ELDER LOCATIONS (5 cabins) ---
    // Each Elder location has unique visual markers
    elderLocations: [
        { id: 1, name: "Cabin 1", accent: 0xff6622, marker: "fire" },      // Fire pit marker
        { id: 2, name: "Cabin 2", accent: 0x22aaff, marker: "water" },     // Near water
        { id: 3, name: "Cabin 3", accent: 0x88ff44, marker: "garden" },    // Garden nearby
        { id: 4, name: "Cabin 4", accent: 0xffaa22, marker: "cart" },      // Red River cart
        { id: 5, name: "Cabin 5", accent: 0xcc44ff, marker: "canoe" },     // Canoe on shore
    ],

    // --- METIS CULTURAL ELEMENTS ---
    cultural: {
        sashColors: {
            primary: 0xcc0000,        // Red (Métis flag)
            secondary: 0x0055a4,      // Blue (Métis flag)
            accent: 0xffffff,         // White stripes
        },
        includeRedRiverCart: true,    // Show the iconic cart
        includeCanoe: true,           // Canoe on shore
        includeDryingRacks: true,     // Fish/meat drying racks
        includeGardenPatch: true,     // Small garden area
        beadworkAccents: true,        // Subtle floral beadwork hints
    },
};

// ============================================================
// INITIALIZATION
// ============================================================
try {
    const container = document.body;
    const world = new World(container, CONFIG);
    world.animate();
    console.log('Métis Prairie Environment initialized successfully!');

    // ============================================================
    // WELCOME MODAL & PROGRESS TRACKING
    // ============================================================

    // Welcome Modal
    const welcomeModal = document.getElementById('welcome-modal');
    const beginBtn = document.getElementById('welcome-begin-btn');

    // Check if user has visited before
    // Modal starts hidden in HTML, only show if first visit
    const hasVisited = localStorage.getItem('metisPrairieVisited');
    if (!hasVisited) {
        // First visit - show the welcome modal
        welcomeModal.classList.remove('hidden');
        // Disable controls while modal is visible to prevent zoom interactions
        world.controls.enabled = false;
    }

    // Prevent scroll/wheel events from reaching the 3D scene when modal is open
    welcomeModal.addEventListener('wheel', (e) => {
        e.stopPropagation();
        e.preventDefault();
    }, { passive: false });

    beginBtn.addEventListener('click', () => {
        welcomeModal.classList.add('hidden');
        localStorage.setItem('metisPrairieVisited', 'true');
        // Re-enable controls when modal is dismissed
        world.controls.enabled = true;
    });

    // Progress Tracking System
    const progressBar = document.getElementById('progress-bar');
    const progressCount = document.getElementById('progress-count');
    const TOTAL_STATIONS = 18; // 5 cabins + 6 fires + 6 cultural sites + 1 memorial

    // Get visited stations from localStorage
    function getVisitedStations() {
        const saved = localStorage.getItem('metisPrairieProgress');
        return saved ? JSON.parse(saved) : [];
    }

    // Save visited station
    function markStationVisited(stationType, stationId) {
        const key = `${stationType}-${stationId}`;
        const visited = getVisitedStations();
        if (!visited.includes(key)) {
            visited.push(key);
            localStorage.setItem('metisPrairieProgress', JSON.stringify(visited));
            updateProgressUI();
        }
    }

    // Update progress bar
    function updateProgressUI() {
        const visited = getVisitedStations();
        const count = visited.length;
        const percentage = (count / TOTAL_STATIONS) * 100;
        progressBar.style.width = percentage + '%';
        progressCount.textContent = count;

        // Check for completion
        if (count >= TOTAL_STATIONS) {
            showCompletionMessage();
        }
    }

    // Show completion celebration
    function showCompletionMessage() {
        // Only show once per session
        if (window.completionShown) return;
        window.completionShown = true;

        const completionDiv = document.createElement('div');
        completionDiv.id = 'completion-message';
        completionDiv.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">🎉</div>
                <h2>Kihci-marsii!</h2>
                <p class="completion-subtitle">A Great Thank You!</p>
                <p>You have completed your journey across the Métis Prairie.<br>
                You have learned from the Elders, explored the land, and connected with the traditions of the Métis people.</p>
                <p class="completion-quote"><em>"We are all related. What we do for ourselves, we do for all."</em></p>
                <button onclick="this.parentElement.parentElement.remove()">Continue Exploring</button>
            </div>
        `;
        document.body.appendChild(completionDiv);

        // Add completion styles if not already added
        if (!document.getElementById('completion-styles')) {
            const styles = document.createElement('style');
            styles.id = 'completion-styles';
            styles.textContent = `
                #completion-message {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    backdrop-filter: blur(10px);
                    z-index: 3000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .completion-content {
                    background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
                    border: 2px solid #FFD700;
                    border-radius: 16px;
                    padding: 40px 50px;
                    text-align: center;
                    color: white;
                    max-width: 500px;
                    box-shadow: 0 0 80px rgba(255, 215, 0, 0.4);
                }
                .completion-icon { font-size: 5rem; margin-bottom: 15px; }
                .completion-content h2 {
                    color: #FFD700;
                    font-size: 2.5rem;
                    margin: 0;
                    font-family: 'Georgia', serif;
                }
                .completion-subtitle {
                    color: #c0a040;
                    font-style: italic;
                    margin: 5px 0 20px 0;
                }
                .completion-content p {
                    color: #d0d0d0;
                    line-height: 1.7;
                    margin-bottom: 15px;
                }
                .completion-quote {
                    color: #88aa66 !important;
                    font-size: 1.1rem;
                }
                .completion-content button {
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #1a1a2e;
                    border: none;
                    padding: 12px 35px;
                    font-size: 1rem;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 25px;
                    margin-top: 15px;
                    transition: transform 0.3s;
                }
                .completion-content button:hover {
                    transform: scale(1.05);
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // Initialize progress on load
    updateProgressUI();

    // Expose progress tracking to global scope for InteractionManager
    window.metisPrairieProgress = {
        markVisited: markStationVisited,
        getVisited: getVisitedStations,
        updateUI: updateProgressUI
    };

} catch (error) {
    console.error('Failed to initialize scene:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:red;font-size:20px;text-align:center;';
    errorDiv.innerHTML = `Error loading scene:<br>${error.message}`;
    document.body.appendChild(errorDiv);
}
