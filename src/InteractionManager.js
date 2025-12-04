import * as THREE from 'three';
import { elderVisits } from './ElderVisits.js';

export class InteractionManager {
    constructor(scene, camera, cabinPositions, controls, domElement, props) {
        this.scene = scene;
        this.camera = camera;
        this.cabinPositions = cabinPositions;
        this.controls = controls;
        this.domElement = domElement;
        this.props = props;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];
        this.currentVisit = null;
        this.currentCabinNumber = null;
        this.dialogueStep = 0;
        this.isDialogueOpen = false;
        this.completedVisits = new Set();

        // Fireplace experiences - each links to an interactive experience
        this.fireplaceExperiences = [
            {
                x: -40, z: 34,
                title: "The Infinite Loom",
                url: "experiences/infinite-loom.html",
                message: null // uses default message
            },
            {
                x: 5, z: 32,
                title: "L'esprit de Michif",
                url: "experiences/language-game.html",
                message: "Around the fire, young ones would sit with their Elders and learn the words of their ancestors. The Michif language—a beautiful blend of Cree, French, and other tongues—was passed down through stories, songs, and everyday conversation.<br><br>Step into this tradition and learn the spirit of the language.",
                buttonText: "Learn Michif →"
            },
            {
                x: 55, z: 30,
                title: "Sacred Medicines",
                url: "experiences/medicine-wheel.html",
                message: "The Métis people have always understood that the land provides everything needed for healing. Around fires like this, knowledge keepers would share the sacred gifts of Sage, Sweetgrass, Cedar, and Tobacco—each plant carrying its own spirit and purpose.<br><br>Grandmothers taught which roots eased pain, which leaves brought calm, and which flowers healed the heart. This wisdom, passed through generations, reminds us that we are forever connected to the living world around us.",
                buttonText: "Discover the Medicines →"
            },
            {
                x: 105, z: 32,
                title: "Li Perlaj Michif",
                url: "experiences/beadwork.html",
                message: "Around the fire, nimble fingers would thread beads into intricate patterns—each design carrying mathematical precision and cultural meaning. The Métis were master beadworkers, creating the stunning floral designs that earned them the name 'The Flower Beadwork People.'<br><br>Every curve, angle, and repetition in beadwork holds mathematical secrets. Explore the geometry and trigonometry hidden within these beautiful patterns.",
                buttonText: "Explore Beadwork Math →"
            },
            {
                x: -25, z: -35,
                title: "Li Nòmb dan la Natiir",
                url: "experiences/nature-math.html",
                message: "The Elders knew that the Creator's wisdom was written in the patterns of nature. In the spiral of a sunflower, the branching of rivers, and the symmetry of flowers, they saw the same sacred mathematics that guided their beadwork and designs.<br><br>The Fibonacci sequence spirals through every pine cone and seashell. Fractals repeat in every fern frond and river delta. The golden ratio appears wherever beauty dwells. Come, discover the hidden numbers that connect all living things.",
                buttonText: "Explore Nature's Math →"
            },
            {
                x: 75, z: -20,
                title: "Li Serkl di Achimowin",
                url: "experiences/circle-of-stories.html",
                message: "In Métis tradition, knowledge is never held alone—it flows in circles, connecting all things. The Elders teach that every story links to another, every skill supports its neighbor, and every person is part of a greater web of kinship.<br><br>This is <strong>Wahkotowin</strong>—the sacred understanding that all things are related. Around this fire, see how language connects to land, how craft connects to community, and how the wisdom of the ancestors weaves through everything we do.",
                buttonText: "Enter the Circle →"
            },
        ];

        // Herb bundle / Medicine box locations
        this.herbExperiences = [
            {
                x: -95, z: 45,
                title: "Li Jardaen di Michinn",
                subtitle: "The Medicine Garden",
                url: "experiences/medicine-garden.html",
                message: "Hidden among the wild grasses lies a sacred gathering of healing plants. The Métis people knew every root, leaf, and flower—their gifts passed down through whispered teachings and careful observation.<br><br>This medicine bundle holds the spirits of Sweetgrass, Sage, Saskatoon, and Cedar. Each one a teacher, each one a healer. Hold your offering to receive their wisdom.",
                buttonText: "Enter the Garden →"
            }
        ];

        // Log pile / Architecture experience locations
        this.logPileExperiences = [
            {
                x: 115, z: -65,
                title: "Li Bâtimân",
                subtitle: "The Buildings of the Métis",
                url: "experiences/architecture.html",
                message: "Among these carefully stacked logs lies the knowledge of generations of Métis builders. Our ancestors crafted homes that blended French-Canadian techniques with the practical wisdom needed for prairie life.<br><br>The Red River Frame, log cabins, hivernant lodges—each structure tells a story of ingenuity and adaptation. Learn how the Métis built homes that sheltered families through harsh winters and served as gathering places for community.",
                buttonText: "Explore Architecture →"
            }
        ];

        // Garden patch / Farming experience locations
        this.gardenExperiences = [
            {
                x: -55, z: 40,
                title: "Li Loo di Rivyair",
                subtitle: "The River Lot System",
                url: "experiences/farming.html",
                message: "The Métis developed a unique system of land division called the river lot. These long, narrow strips of land stretched back from the riverbank, ensuring every family had access to water, timber, and fertile soil.<br><br>This brilliant design reflected the Métis understanding that the land and water were inseparable—like the blending of cultures that made them who they are. Plant the fields and learn how our ancestors worked with the land.",
                buttonText: "Plant the Fields →"
            }
        ];

        // Red River Cart experience locations
        this.cartExperiences = [
            {
                x: 30, z: 48,
                title: "La Sharette di Rivyair Roozh",
                subtitle: "The Red River Cart",
                url: "experiences/cart.html",
                message: "The Red River Cart was the heartbeat of Métis trade and travel. Its distinctive squeaking wheels could be heard for miles across the prairie—a sound that announced the arrival of traders, hunters, and families on the move.<br><br>Built entirely of wood and rawhide without a single nail, these carts could carry up to 1,000 pounds of goods. When rivers needed crossing, the wheels were removed and the cart body became a raft. This ingenious design made the Métis the masters of prairie commerce.",
                buttonText: "Explore the Cart →"
            }
        ];

        // Fishing experience locations
        this.fishingExperiences = [
            {
                x: 50, z: -50,
                title: "La Sizon di Pwason",
                subtitle: "The Fishing Season",
                url: "experiences/fishing.html",
                message: "Fishing was central to Métis life along the rivers and lakes of the prairies. The knowledge of when and where to fish—passed down through generations—ensured that communities thrived even in the harshest seasons.<br><br>Walleye, Pike, and Burbot were prized catches, often dried and smoked to preserve them for winter. Sharing the first catch of the season brought good luck to the community. Step onto the shore and learn the ways of the Métis fishers.",
                buttonText: "Cast Your Line →"
            }
        ];

        // Memorial experience locations
        this.memorialExperiences = [
            {
                x: -80, z: -60,
                title: "Li Mimwayr",
                subtitle: "Remembering & Resilience",
                url: "experiences/remembering.html",
                message: "In this quiet place, we pause to remember the history that shaped Métis communities—the trauma of residential schools, the loss of language and culture, and the incredible resilience that carried our people through.<br><br>This is a space for truth, healing, and understanding. The light of these candles honors those who suffered and celebrates those who kept the culture alive.",
                buttonText: "Enter with Care →"
            }
        ];

        this.createUI();
        this.createFireplaceUI();
        this.createHerbUI();
        this.createLogPileUI();
        this.createGardenUI();
        this.createCartUI();
        this.createFishingUI();
        this.createMemorialUI();
        this.setupInteractables();
        this.setupEvents();
    }

    createUI() {
        // Dialogue overlay
        const overlay = document.createElement('div');
        overlay.id = 'dialogue-overlay';
        overlay.innerHTML = `
            <div id="dialogue-box">
                <div id="speaker-name"></div>
                <div id="speaker-location"></div>
                <div id="story-text"></div>
                <div id="math-section" style="display:none;">
                    <div id="math-label"></div>
                    <div id="math-question"></div>
                    <div id="options-grid"></div>
                </div>
                <button id="continue-btn">Continue →</button>
                <button id="close-btn">×</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #dialogue-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.75);
                backdrop-filter: blur(8px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #dialogue-box {
                width: 85%;
                max-width: 700px;
                max-height: 80vh;
                overflow-y: auto;
                background: linear-gradient(135deg, #1a2530 0%, #0d1520 100%);
                border-top: 4px solid #BF2E1A;
                border-bottom: 4px solid #0055A4;
                border-radius: 12px;
                padding: 30px 35px;
                color: white;
                position: relative;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            }
            #speaker-name {
                font-family: 'Georgia', serif;
                font-size: 1.6rem;
                color: #FFD700;
                margin-bottom: 5px;
            }
            #speaker-location {
                font-size: 0.9rem;
                color: #888;
                margin-bottom: 20px;
                font-style: italic;
            }
            #story-text {
                font-size: 1.1rem;
                line-height: 1.8;
                margin-bottom: 25px;
                border-left: 3px solid #FFD700;
                padding-left: 20px;
                color: #e0e0e0;
            }
            #math-section {
                background: rgba(255,255,255,0.05);
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            #math-label {
                font-size: 0.9rem;
                color: #87CEEB;
                margin-bottom: 10px;
            }
            #math-question {
                font-family: 'Courier New', monospace;
                font-size: 1.2rem;
                color: #fff;
                margin-bottom: 15px;
                font-weight: bold;
            }
            #options-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }
            .option-btn {
                background: transparent;
                border: 1px solid #555;
                padding: 15px;
                color: #ddd;
                cursor: pointer;
                border-radius: 6px;
                transition: all 0.2s;
                font-size: 1rem;
            }
            .option-btn:hover {
                background: rgba(255,215,0,0.1);
                border-color: #FFD700;
            }
            .option-btn.correct {
                background: rgba(0,255,0,0.2);
                border-color: #0f0;
            }
            .option-btn.wrong {
                background: rgba(255,0,0,0.2);
                border-color: #f00;
            }
            #continue-btn {
                background: #0055A4;
                color: white;
                border: none;
                padding: 12px 30px;
                font-size: 1rem;
                cursor: pointer;
                border-radius: 6px;
                float: right;
            }
            #continue-btn:hover {
                background: #0066cc;
            }
            #close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #close-btn:hover {
                color: #fff;
            }
            .cabin-mesh {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.overlay = overlay;
        this.dialogueBox = document.getElementById('dialogue-box');
        this.speakerName = document.getElementById('speaker-name');
        this.speakerLocation = document.getElementById('speaker-location');
        this.storyText = document.getElementById('story-text');
        this.mathSection = document.getElementById('math-section');
        this.mathLabel = document.getElementById('math-label');
        this.mathQuestion = document.getElementById('math-question');
        this.optionsGrid = document.getElementById('options-grid');
        this.continueBtn = document.getElementById('continue-btn');
        this.closeBtn = document.getElementById('close-btn');
    }

    createFireplaceUI() {
        // Fireplace popup overlay
        const fireOverlay = document.createElement('div');
        fireOverlay.id = 'fireplace-overlay';
        fireOverlay.innerHTML = `
            <div id="fireplace-box">
                <button id="fire-close-btn">×</button>
                <div id="fire-icon">🔥</div>
                <h2 id="fire-title">The Gathering Fire</h2>
                <p id="fire-text">
                    In Métis tradition, the fire was the heart of the community. Around these flames,
                    Elders shared wisdom, children learned stories, and families strengthened their bonds.
                    The fire represented warmth, life, and the passing of knowledge from one generation to the next.
                    <br><br>
                    Step closer to explore the mathematical patterns and cultural teachings preserved in our traditions.
                </p>
                <button id="fire-explore-btn">Explore Experience →</button>
            </div>
        `;
        document.body.appendChild(fireOverlay);

        // Add fireplace-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #fireplace-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.8);
                backdrop-filter: blur(10px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #fireplace-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #2a1a0a 0%, #1a0f05 100%);
                border: 2px solid #ff6600;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(255, 102, 0, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #fire-icon {
                font-size: 4rem;
                margin-bottom: 15px;
                animation: flicker 1.5s ease-in-out infinite;
            }
            @keyframes flicker {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }
            #fire-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #FFD700;
                margin: 0 0 20px 0;
            }
            #fire-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #e0d0c0;
                margin-bottom: 25px;
            }
            #fire-explore-btn {
                background: linear-gradient(135deg, #ff6600 0%, #cc4400 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #fire-explore-btn:hover {
                background: linear-gradient(135deg, #ff8833 0%, #ff5500 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(255, 102, 0, 0.4);
            }
            #fire-explore-btn:disabled {
                background: #555;
                cursor: not-allowed;
                transform: none;
            }
            #fire-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #fire-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.fireOverlay = fireOverlay;
        this.fireTitle = document.getElementById('fire-title');
        this.fireText = document.getElementById('fire-text');
        this.fireExploreBtn = document.getElementById('fire-explore-btn');
        this.fireCloseBtn = document.getElementById('fire-close-btn');
    }

    createHerbUI() {
        // Herb bundle popup overlay
        const herbOverlay = document.createElement('div');
        herbOverlay.id = 'herb-overlay';
        herbOverlay.innerHTML = `
            <div id="herb-box">
                <button id="herb-close-btn">×</button>
                <div id="herb-icon">🌿</div>
                <h2 id="herb-title">Li Jardaen di Michinn</h2>
                <h3 id="herb-subtitle">The Medicine Garden</h3>
                <p id="herb-text">
                    Hidden among the wild grasses lies a sacred gathering of healing plants.
                </p>
                <button id="herb-explore-btn">Enter the Garden →</button>
            </div>
        `;
        document.body.appendChild(herbOverlay);

        // Add herb-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #herb-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #herb-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #0a1a10 0%, #051510 100%);
                border: 2px solid #a3be8c;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(163, 190, 140, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #herb-icon {
                font-size: 4rem;
                margin-bottom: 15px;
                animation: herbFloat 3s ease-in-out infinite;
            }
            @keyframes herbFloat {
                0%, 100% { transform: translateY(0) rotate(-5deg); }
                50% { transform: translateY(-8px) rotate(5deg); }
            }
            #herb-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #a3be8c;
                margin: 0 0 5px 0;
            }
            #herb-subtitle {
                font-size: 1rem;
                color: #88c0d0;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #herb-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #c0d0c0;
                margin-bottom: 25px;
            }
            #herb-explore-btn {
                background: linear-gradient(135deg, #5f8a5f 0%, #3d6a3d 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #herb-explore-btn:hover {
                background: linear-gradient(135deg, #7aa07a 0%, #5f8a5f 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(163, 190, 140, 0.4);
            }
            #herb-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #herb-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.herbOverlay = herbOverlay;
        this.herbTitle = document.getElementById('herb-title');
        this.herbSubtitle = document.getElementById('herb-subtitle');
        this.herbText = document.getElementById('herb-text');
        this.herbExploreBtn = document.getElementById('herb-explore-btn');
        this.herbCloseBtn = document.getElementById('herb-close-btn');
    }

    createLogPileUI() {
        // Log pile popup overlay
        const logPileOverlay = document.createElement('div');
        logPileOverlay.id = 'logpile-overlay';
        logPileOverlay.innerHTML = `
            <div id="logpile-box">
                <button id="logpile-close-btn">×</button>
                <div id="logpile-icon">🪵</div>
                <h2 id="logpile-title">Li Bâtimân</h2>
                <h3 id="logpile-subtitle">The Buildings of the Métis</h3>
                <p id="logpile-text">
                    Explore the architectural traditions of the Métis people.
                </p>
                <button id="logpile-explore-btn">Explore Architecture →</button>
            </div>
        `;
        document.body.appendChild(logPileOverlay);

        // Add log pile-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #logpile-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #logpile-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #2a1a0a 0%, #1a0f05 100%);
                border: 2px solid #ddaa55;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(221, 170, 85, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #logpile-icon {
                font-size: 4rem;
                margin-bottom: 15px;
            }
            #logpile-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #ddaa55;
                margin: 0 0 5px 0;
            }
            #logpile-subtitle {
                font-size: 1rem;
                color: #c9a86c;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #logpile-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #e0d0c0;
                margin-bottom: 25px;
            }
            #logpile-explore-btn {
                background: linear-gradient(135deg, #8b6914 0%, #5a4030 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #logpile-explore-btn:hover {
                background: linear-gradient(135deg, #a87d1a 0%, #8b6914 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(221, 170, 85, 0.4);
            }
            #logpile-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #logpile-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.logPileOverlay = logPileOverlay;
        this.logPileTitle = document.getElementById('logpile-title');
        this.logPileSubtitle = document.getElementById('logpile-subtitle');
        this.logPileText = document.getElementById('logpile-text');
        this.logPileExploreBtn = document.getElementById('logpile-explore-btn');
        this.logPileCloseBtn = document.getElementById('logpile-close-btn');
    }

    createGardenUI() {
        // Garden popup overlay
        const gardenOverlay = document.createElement('div');
        gardenOverlay.id = 'garden-overlay';
        gardenOverlay.innerHTML = `
            <div id="garden-box">
                <button id="garden-close-btn">×</button>
                <div id="garden-icon">🌾</div>
                <h2 id="garden-title">Li Loo di Rivyair</h2>
                <h3 id="garden-subtitle">The River Lot System</h3>
                <p id="garden-text">
                    Learn about Métis farming traditions.
                </p>
                <button id="garden-explore-btn">Plant the Fields →</button>
            </div>
        `;
        document.body.appendChild(gardenOverlay);

        // Add garden-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #garden-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #garden-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #1a2a10 0%, #0f1a08 100%);
                border: 2px solid #7CB342;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(124, 179, 66, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #garden-icon {
                font-size: 4rem;
                margin-bottom: 15px;
                animation: gardenSway 3s ease-in-out infinite;
            }
            @keyframes gardenSway {
                0%, 100% { transform: rotate(-3deg); }
                50% { transform: rotate(3deg); }
            }
            #garden-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #8BC34A;
                margin: 0 0 5px 0;
            }
            #garden-subtitle {
                font-size: 1rem;
                color: #AED581;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #garden-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #c0d8b0;
                margin-bottom: 25px;
            }
            #garden-explore-btn {
                background: linear-gradient(135deg, #558B2F 0%, #33691E 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #garden-explore-btn:hover {
                background: linear-gradient(135deg, #7CB342 0%, #558B2F 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(124, 179, 66, 0.4);
            }
            #garden-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #garden-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.gardenOverlay = gardenOverlay;
        this.gardenTitle = document.getElementById('garden-title');
        this.gardenSubtitle = document.getElementById('garden-subtitle');
        this.gardenText = document.getElementById('garden-text');
        this.gardenExploreBtn = document.getElementById('garden-explore-btn');
        this.gardenCloseBtn = document.getElementById('garden-close-btn');
    }

    createCartUI() {
        // Cart popup overlay
        const cartOverlay = document.createElement('div');
        cartOverlay.id = 'cart-overlay';
        cartOverlay.innerHTML = `
            <div id="cart-box">
                <button id="cart-close-btn">×</button>
                <h2 id="cart-title">La Sharette di Rivyair Roozh</h2>
                <h3 id="cart-subtitle">The Red River Cart</h3>
                <p id="cart-text">
                    Learn about the iconic Red River Cart.
                </p>
                <button id="cart-explore-btn">Explore the Cart →</button>
            </div>
        `;
        document.body.appendChild(cartOverlay);

        // Add cart-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #cart-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #cart-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #2a1a0a 0%, #1a0f05 100%);
                border: 2px solid #8b5a2b;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(139, 90, 43, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #cart-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #D7CCC8;
                margin: 0 0 5px 0;
            }
            #cart-subtitle {
                font-size: 1rem;
                color: #A1887F;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #cart-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #BCAAA4;
                margin-bottom: 25px;
            }
            #cart-explore-btn {
                background: linear-gradient(135deg, #6D4C41 0%, #4E342E 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #cart-explore-btn:hover {
                background: linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(139, 90, 43, 0.4);
            }
            #cart-explore-btn:disabled {
                background: #555;
                cursor: not-allowed;
                transform: none;
            }
            #cart-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #cart-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.cartOverlay = cartOverlay;
        this.cartTitle = document.getElementById('cart-title');
        this.cartSubtitle = document.getElementById('cart-subtitle');
        this.cartText = document.getElementById('cart-text');
        this.cartExploreBtn = document.getElementById('cart-explore-btn');
        this.cartCloseBtn = document.getElementById('cart-close-btn');
    }

    createFishingUI() {
        // Fishing popup overlay
        const fishingOverlay = document.createElement('div');
        fishingOverlay.id = 'fishing-overlay';
        fishingOverlay.innerHTML = `
            <div id="fishing-box">
                <button id="fishing-close-btn">×</button>
                <div id="fishing-icon">🐟</div>
                <h2 id="fishing-title">La Sizon di Pwason</h2>
                <h3 id="fishing-subtitle">The Fishing Season</h3>
                <p id="fishing-text">
                    Learn about Métis fishing traditions.
                </p>
                <button id="fishing-explore-btn">Cast Your Line →</button>
            </div>
        `;
        document.body.appendChild(fishingOverlay);

        // Add fishing-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #fishing-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(12px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #fishing-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #0a1520 0%, #051018 100%);
                border: 2px solid #4488cc;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(68, 136, 204, 0.3), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #fishing-icon {
                font-size: 4rem;
                margin-bottom: 15px;
                animation: fishSwim 2s ease-in-out infinite;
            }
            @keyframes fishSwim {
                0%, 100% { transform: translateX(-5px) rotate(-5deg); }
                50% { transform: translateX(5px) rotate(5deg); }
            }
            #fishing-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #88c0d0;
                margin: 0 0 5px 0;
            }
            #fishing-subtitle {
                font-size: 1rem;
                color: #5e81ac;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #fishing-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #b0c4de;
                margin-bottom: 25px;
            }
            #fishing-explore-btn {
                background: linear-gradient(135deg, #4488cc 0%, #2266aa 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #fishing-explore-btn:hover {
                background: linear-gradient(135deg, #66aadd 0%, #4488cc 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(68, 136, 204, 0.4);
            }
            #fishing-explore-btn:disabled {
                background: #555;
                cursor: not-allowed;
                transform: none;
            }
            #fishing-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #fishing-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.fishingOverlay = fishingOverlay;
        this.fishingTitle = document.getElementById('fishing-title');
        this.fishingSubtitle = document.getElementById('fishing-subtitle');
        this.fishingText = document.getElementById('fishing-text');
        this.fishingExploreBtn = document.getElementById('fishing-explore-btn');
        this.fishingCloseBtn = document.getElementById('fishing-close-btn');
    }

    createMemorialUI() {
        // Memorial popup overlay - somber, respectful styling
        const memorialOverlay = document.createElement('div');
        memorialOverlay.id = 'memorial-overlay';
        memorialOverlay.innerHTML = `
            <div id="memorial-box">
                <button id="memorial-close-btn">×</button>
                <div id="memorial-icon">🕯️</div>
                <h2 id="memorial-title">Li Mimwayr</h2>
                <h3 id="memorial-subtitle">Remembering & Resilience</h3>
                <p id="memorial-text">
                    A space for truth, healing, and understanding.
                </p>
                <button id="memorial-explore-btn">Enter with Care →</button>
            </div>
        `;
        document.body.appendChild(memorialOverlay);

        // Add memorial-specific styles
        const style = document.createElement('style');
        style.textContent = `
            #memorial-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.9);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #memorial-box {
                width: 85%;
                max-width: 500px;
                background: linear-gradient(135deg, #1a1510 0%, #0d0a08 100%);
                border: 2px solid #cc6600;
                border-radius: 16px;
                padding: 35px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(204, 102, 0, 0.2), 0 20px 60px rgba(0,0,0,0.8);
                text-align: center;
            }
            #memorial-icon {
                font-size: 4rem;
                margin-bottom: 15px;
                animation: candleFlicker 2s ease-in-out infinite;
            }
            @keyframes candleFlicker {
                0%, 100% { opacity: 1; transform: scale(1); }
                25% { opacity: 0.9; transform: scale(1.02); }
                50% { opacity: 0.95; transform: scale(0.98); }
                75% { opacity: 0.85; transform: scale(1.01); }
            }
            #memorial-title {
                font-family: 'Georgia', serif;
                font-size: 1.8rem;
                color: #cc6600;
                margin: 0 0 5px 0;
            }
            #memorial-subtitle {
                font-size: 1rem;
                color: #aa8866;
                margin: 0 0 20px 0;
                font-weight: normal;
                font-style: italic;
            }
            #memorial-text {
                font-size: 1rem;
                line-height: 1.7;
                color: #c0b0a0;
                margin-bottom: 25px;
            }
            #memorial-explore-btn {
                background: linear-gradient(135deg, #cc6600 0%, #994400 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1.1rem;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #memorial-explore-btn:hover {
                background: linear-gradient(135deg, #dd7711 0%, #cc6600 100%);
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(204, 102, 0, 0.4);
            }
            #memorial-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: transparent;
                border: none;
                color: #888;
                font-size: 1.5rem;
                cursor: pointer;
            }
            #memorial-close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

        // Store references
        this.memorialOverlay = memorialOverlay;
        this.memorialTitle = document.getElementById('memorial-title');
        this.memorialSubtitle = document.getElementById('memorial-subtitle');
        this.memorialText = document.getElementById('memorial-text');
        this.memorialExploreBtn = document.getElementById('memorial-explore-btn');
        this.memorialCloseBtn = document.getElementById('memorial-close-btn');
    }

    setupInteractables() {
        // Create invisible clickable zones at cabin positions
        this.cabinPositions.forEach((pos, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(6, 6, 5),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(pos.x, 3, pos.z);
            zone.userData = { visitId: index, type: 'cabin' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at fireplace positions
        this.fireplaceExperiences.forEach((fire, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(3, 3, 3),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(fire.x, 1.5, fire.z);
            zone.userData = { fireId: index, type: 'fireplace' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at herb bundle positions
        this.herbExperiences.forEach((herb, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(4, 3, 4),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(herb.x, 1.5, herb.z);
            zone.userData = { herbId: index, type: 'herb' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at log pile positions
        this.logPileExperiences.forEach((logPile, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(8, 5, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(logPile.x, 2, logPile.z);
            zone.userData = { logPileId: index, type: 'logpile' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at garden positions
        this.gardenExperiences.forEach((garden, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(8, 4, 6),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(garden.x, 1.5, garden.z);
            zone.userData = { gardenId: index, type: 'garden' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at cart positions
        this.cartExperiences.forEach((cart, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(5, 4, 4),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(cart.x, 1.5, cart.z);
            zone.userData = { cartId: index, type: 'cart' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at fishing positions
        this.fishingExperiences.forEach((fishing, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(6, 5, 5),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(fishing.x, 2, fishing.z);
            zone.userData = { fishingId: index, type: 'fishing' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Create invisible clickable zones at memorial positions
        this.memorialExperiences.forEach((memorial, index) => {
            const zone = new THREE.Mesh(
                new THREE.BoxGeometry(6, 5, 6),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(memorial.x, 2, memorial.z);
            zone.userData = { memorialId: index, type: 'memorial' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });
    }

    setupEvents() {
        // Click to interact with cabins and fireplaces
        this.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

        // Continue and close buttons for cabin dialogue
        this.continueBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.advanceDialogue();
        });
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeDialogue();
        });

        // Fireplace close button
        this.fireCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeFireplacePopup();
        });

        // Herb bundle close button
        this.herbCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeHerbPopup();
        });

        // Log pile close button
        this.logPileCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeLogPilePopup();
        });

        // Garden close button
        this.gardenCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeGardenPopup();
        });

        // Cart close button
        this.cartCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeCartPopup();
        });

        // Fishing close button
        this.fishingCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeFishingPopup();
        });

        // Memorial close button
        this.memorialCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeMemorialPopup();
        });

        // Block clicks on overlay from reaching canvas
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeDialogue();
            }
        });

        // Fireplace overlay click to close
        this.fireOverlay.addEventListener('click', (e) => {
            if (e.target === this.fireOverlay) {
                this.closeFireplacePopup();
            }
        });

        // Herb overlay click to close
        this.herbOverlay.addEventListener('click', (e) => {
            if (e.target === this.herbOverlay) {
                this.closeHerbPopup();
            }
        });

        // Log pile overlay click to close
        this.logPileOverlay.addEventListener('click', (e) => {
            if (e.target === this.logPileOverlay) {
                this.closeLogPilePopup();
            }
        });

        // Garden overlay click to close
        this.gardenOverlay.addEventListener('click', (e) => {
            if (e.target === this.gardenOverlay) {
                this.closeGardenPopup();
            }
        });

        // Cart overlay click to close
        this.cartOverlay.addEventListener('click', (e) => {
            if (e.target === this.cartOverlay) {
                this.closeCartPopup();
            }
        });

        // Fishing overlay click to close
        this.fishingOverlay.addEventListener('click', (e) => {
            if (e.target === this.fishingOverlay) {
                this.closeFishingPopup();
            }
        });

        // Memorial overlay click to close
        this.memorialOverlay.addEventListener('click', (e) => {
            if (e.target === this.memorialOverlay) {
                this.closeMemorialPopup();
            }
        });

        // Escape to close
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.isDialogueOpen) {
                    this.closeDialogue();
                }
                if (this.fireOverlay.style.display === 'flex') {
                    this.closeFireplacePopup();
                }
                if (this.herbOverlay.style.display === 'flex') {
                    this.closeHerbPopup();
                }
                if (this.logPileOverlay.style.display === 'flex') {
                    this.closeLogPilePopup();
                }
                if (this.gardenOverlay.style.display === 'flex') {
                    this.closeGardenPopup();
                }
                if (this.cartOverlay.style.display === 'flex') {
                    this.closeCartPopup();
                }
                if (this.fishingOverlay.style.display === 'flex') {
                    this.closeFishingPopup();
                }
                if (this.memorialOverlay.style.display === 'flex') {
                    this.closeMemorialPopup();
                }
            }
        });
    }

    onCanvasClick(event) {
        if (this.isDialogueOpen) return;
        if (this.fireOverlay.style.display === 'flex') return;
        if (this.herbOverlay.style.display === 'flex') return;
        if (this.logPileOverlay.style.display === 'flex') return;
        if (this.gardenOverlay.style.display === 'flex') return;
        if (this.cartOverlay.style.display === 'flex') return;
        if (this.fishingOverlay.style.display === 'flex') return;
        if (this.memorialOverlay.style.display === 'flex') return;

        // Calculate mouse position in normalized device coordinates
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast from camera
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);

        if (intersects.length > 0) {
            const userData = intersects[0].object.userData;

            if (userData.type === 'fireplace') {
                this.openFireplacePopup(userData.fireId);
                return;
            }
            if (userData.type === 'herb') {
                this.openHerbPopup(userData.herbId);
                return;
            }
            if (userData.type === 'logpile') {
                this.openLogPilePopup(userData.logPileId);
                return;
            }
            if (userData.type === 'garden') {
                this.openGardenPopup(userData.gardenId);
                return;
            }
            if (userData.type === 'cart') {
                this.openCartPopup(userData.cartId);
                return;
            }
            if (userData.type === 'fishing') {
                this.openFishingPopup(userData.fishingId);
                return;
            }
            if (userData.type === 'memorial') {
                this.openMemorialPopup(userData.memorialId);
                return;
            }
            const visitId = intersects[0].object.userData.visitId;
            this.startVisit(visitId);
        }
    }

    startVisit(visitId) {
        this.currentVisit = elderVisits[visitId];
        this.currentCabinNumber = visitId + 1; // Cabin numbers are 1-indexed
        this.dialogueStep = 0;
        this.isDialogueOpen = true;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        this.speakerName.textContent = this.currentVisit.name;
        this.speakerLocation.textContent = this.currentVisit.location;
        this.mathSection.style.display = 'none';
        this.continueBtn.style.display = 'block';

        if (this.completedVisits.has(visitId)) {
            this.storyText.textContent = "Welcome back, friend! It's good to see you again. You still carry the gift I gave you. Feel free to explore and visit the others.";
            this.continueBtn.textContent = 'Leave →';
            this.continueBtn.onclick = () => this.closeDialogue();
        } else {
            this.displayCurrentStep();
            this.continueBtn.onclick = () => this.advanceDialogue();
        }

        this.overlay.style.display = 'flex';
    }

    displayCurrentStep() {
        const greetings = this.currentVisit.greeting;

        if (this.dialogueStep < greetings.length) {
            this.storyText.textContent = greetings[this.dialogueStep];
            this.continueBtn.textContent = 'Continue →';
        }
    }

    advanceDialogue() {
        this.dialogueStep++;
        const greetings = this.currentVisit.greeting;

        if (this.dialogueStep < greetings.length) {
            this.displayCurrentStep();
        } else if (this.dialogueStep === greetings.length) {
            this.showMathQuestion();
        }
    }

    showMathQuestion() {
        this.storyText.textContent = "";
        this.mathSection.style.display = 'block';
        this.mathLabel.textContent = this.currentVisit.math.label;
        this.mathQuestion.textContent = this.currentVisit.math.question;
        this.continueBtn.style.display = 'none';

        this.optionsGrid.innerHTML = '';
        this.currentVisit.math.options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'option-btn';
            btn.textContent = opt.text;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.handleAnswer(btn, opt.correct);
            };
            this.optionsGrid.appendChild(btn);
        });
    }

    handleAnswer(btn, isCorrect) {
        if (isCorrect) {
            btn.classList.add('correct');
            setTimeout(() => this.showSuccess(), 500);
        } else {
            btn.classList.add('wrong');
            setTimeout(() => btn.classList.remove('wrong'), 500);
        }
    }

    showSuccess() {
        this.mathSection.style.display = 'none';
        this.storyText.textContent = this.currentVisit.math.success;
        this.continueBtn.style.display = 'block';
        this.continueBtn.textContent = 'Thank you →';
        this.continueBtn.onclick = () => this.completeVisit();
    }

    completeVisit() {
        this.completedVisits.add(this.currentVisit.id);

        // Mark the cabin's floating number as visited (turns off the glow)
        if (this.props && this.currentCabinNumber) {
            this.props.markCabinVisited(this.currentCabinNumber);
        }

        // Track progress
        if (window.metisPrairieProgress) {
            window.metisPrairieProgress.markVisited('cabin', this.currentCabinNumber);
        }

        this.closeDialogue();
    }

    closeDialogue() {
        this.overlay.style.display = 'none';
        this.isDialogueOpen = false;
        this.currentVisit = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Fireplace interaction methods
    openFireplacePopup(fireId) {
        const fireplace = this.fireplaceExperiences[fireId];
        this.currentFireplace = fireplace;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title if this fireplace has a specific experience
        if (fireplace.title && fireplace.title !== "Gathering Place") {
            this.fireTitle.textContent = fireplace.title;
        } else {
            this.fireTitle.textContent = "The Gathering Fire";
        }

        // Update message if custom message provided
        const defaultMessage = `In Métis tradition, the fire was the heart of the community. Around these flames,
            Elders shared wisdom, children learned stories, and families strengthened their bonds.
            The fire represented warmth, life, and the passing of knowledge from one generation to the next.
            <br><br>
            Step closer to explore the mathematical patterns and cultural teachings preserved in our traditions.`;

        this.fireText.innerHTML = fireplace.message || defaultMessage;

        // Setup explore button
        if (fireplace.url) {
            this.fireExploreBtn.disabled = false;
            this.fireExploreBtn.textContent = fireplace.buttonText || "Explore Experience →";
            this.fireExploreBtn.onclick = () => {
                // Track progress before navigating
                if (window.metisPrairieProgress) {
                    window.metisPrairieProgress.markVisited('fire', fireId);
                }
                window.location.href = fireplace.url;
            };
        } else {
            this.fireExploreBtn.disabled = true;
            this.fireExploreBtn.textContent = "Coming Soon...";
        }

        this.fireOverlay.style.display = 'flex';
    }

    closeFireplacePopup() {
        this.fireOverlay.style.display = 'none';
        this.currentFireplace = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Herb bundle interaction methods
    openHerbPopup(herbId) {
        const herb = this.herbExperiences[herbId];
        this.currentHerb = herb;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.herbTitle.textContent = herb.title;
        this.herbSubtitle.textContent = herb.subtitle;
        this.herbText.innerHTML = herb.message;

        // Setup explore button
        this.herbExploreBtn.textContent = herb.buttonText;
        this.herbExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) {
                window.metisPrairieProgress.markVisited('herb', herbId);
            }
            window.location.href = herb.url;
        };

        this.herbOverlay.style.display = 'flex';
    }

    closeHerbPopup() {
        this.herbOverlay.style.display = 'none';
        this.currentHerb = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Log pile interaction methods
    openLogPilePopup(logPileId) {
        const logPile = this.logPileExperiences[logPileId];
        this.currentLogPile = logPile;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.logPileTitle.textContent = logPile.title;
        this.logPileSubtitle.textContent = logPile.subtitle;
        this.logPileText.innerHTML = logPile.message;

        // Setup explore button
        this.logPileExploreBtn.textContent = logPile.buttonText;
        this.logPileExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) {
                window.metisPrairieProgress.markVisited('logpile', logPileId);
            }
            window.location.href = logPile.url;
        };

        this.logPileOverlay.style.display = 'flex';
    }

    closeLogPilePopup() {
        this.logPileOverlay.style.display = 'none';
        this.currentLogPile = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Garden interaction methods
    openGardenPopup(gardenId) {
        const garden = this.gardenExperiences[gardenId];
        this.currentGarden = garden;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.gardenTitle.textContent = garden.title;
        this.gardenSubtitle.textContent = garden.subtitle;
        this.gardenText.innerHTML = garden.message;

        // Setup explore button
        this.gardenExploreBtn.textContent = garden.buttonText;
        this.gardenExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) {
                window.metisPrairieProgress.markVisited('garden', gardenId);
            }
            window.location.href = garden.url;
        };

        this.gardenOverlay.style.display = 'flex';
    }

    closeGardenPopup() {
        this.gardenOverlay.style.display = 'none';
        this.currentGarden = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Cart interaction methods
    openCartPopup(cartId) {
        const cart = this.cartExperiences[cartId];
        this.currentCart = cart;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.cartTitle.textContent = cart.title;
        this.cartSubtitle.textContent = cart.subtitle;
        this.cartText.innerHTML = cart.message;

        // Setup explore button
        if (cart.url) {
            this.cartExploreBtn.disabled = false;
            this.cartExploreBtn.textContent = cart.buttonText;
            this.cartExploreBtn.onclick = () => {
                if (window.metisPrairieProgress) {
                    window.metisPrairieProgress.markVisited('cart', cartId);
                }
                window.location.href = cart.url;
            };
        } else {
            this.cartExploreBtn.disabled = true;
            this.cartExploreBtn.textContent = cart.buttonText;
        }

        this.cartOverlay.style.display = 'flex';
    }

    closeCartPopup() {
        this.cartOverlay.style.display = 'none';
        this.currentCart = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Fishing interaction methods
    openFishingPopup(fishingId) {
        const fishing = this.fishingExperiences[fishingId];
        this.currentFishing = fishing;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.fishingTitle.textContent = fishing.title;
        this.fishingSubtitle.textContent = fishing.subtitle;
        this.fishingText.innerHTML = fishing.message;

        // Setup explore button
        if (fishing.url) {
            this.fishingExploreBtn.disabled = false;
            this.fishingExploreBtn.textContent = fishing.buttonText;
            this.fishingExploreBtn.onclick = () => {
                if (window.metisPrairieProgress) {
                    window.metisPrairieProgress.markVisited('fishing', fishingId);
                }
                window.location.href = fishing.url;
            };
        } else {
            this.fishingExploreBtn.disabled = true;
            this.fishingExploreBtn.textContent = fishing.buttonText;
        }

        this.fishingOverlay.style.display = 'flex';
    }

    closeFishingPopup() {
        this.fishingOverlay.style.display = 'none';
        this.currentFishing = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Memorial interaction methods
    openMemorialPopup(memorialId) {
        const memorial = this.memorialExperiences[memorialId];
        this.currentMemorial = memorial;

        // Disable orbit controls
        if (this.controls) {
            this.controls.enabled = false;
        }

        // Update title and subtitle
        this.memorialTitle.textContent = memorial.title;
        this.memorialSubtitle.textContent = memorial.subtitle;
        this.memorialText.innerHTML = memorial.message;

        // Setup explore button
        this.memorialExploreBtn.textContent = memorial.buttonText;
        this.memorialExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) {
                window.metisPrairieProgress.markVisited('memorial', memorialId);
            }
            window.location.href = memorial.url;
        };

        this.memorialOverlay.style.display = 'flex';
    }

    closeMemorialPopup() {
        this.memorialOverlay.style.display = 'none';
        this.currentMemorial = null;

        // Re-enable orbit controls
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    // Get cabin positions - MUST MATCH Props.getCabinSettlementPositions()
    static getCabinPositions() {
        return [
            { x: -60, z: 50, rot: 0 },        // Cabin 1
            { x: -20, z: -70, rot: Math.PI }, // Cabin 2
            { x: 30, z: 70, rot: 0 },         // Cabin 3
            { x: 80, z: -70, rot: Math.PI },  // Cabin 4
            { x: 130, z: 55, rot: -0.2 },     // Cabin 5
        ];
    }
}
