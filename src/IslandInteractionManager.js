import * as THREE from 'three';
import { elderVisits } from './ElderVisits.js';

// ============================================================
// ISLAND INTERACTION MANAGER
// Handles all user interactions with floating island stations
// ============================================================

export class IslandInteractionManager {
    constructor(scene, camera, world, controls, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.world = world;
        this.controls = controls;
        this.domElement = domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];
        this.currentVisit = null;
        this.currentCabinNumber = null;
        this.dialogueStep = 0;
        this.isDialogueOpen = false;
        this.completedVisits = new Set();

        // Get station positions from world
        const positions = world.getStationPositions();

        // Cabin experiences
        this.cabinPositions = positions.cabins;

        // Fireplace experiences
        this.fireplaceExperiences = [
            {
                ...positions.fires[0],
                title: "The Infinite Loom",
                url: "experiences/infinite-loom.html",
                message: null
            },
            {
                ...positions.fires[1],
                title: "L'esprit de Michif",
                url: "experiences/language-game.html",
                message: "Around the fire, young ones would sit with their Elders and learn the words of their ancestors. The Michif language—a beautiful blend of Cree, French, and other tongues—was passed down through stories, songs, and everyday conversation.<br><br>Step into this tradition and learn the spirit of the language.",
                buttonText: "Learn Michif →"
            },
            {
                ...positions.fires[2],
                title: "Sacred Medicines",
                url: "experiences/medicine-wheel.html",
                message: "The Métis people have always understood that the land provides everything needed for healing. Around fires like this, knowledge keepers would share the sacred gifts of Sage, Sweetgrass, Cedar, and Tobacco—each plant carrying its own spirit and purpose.",
                buttonText: "Discover the Medicines →"
            },
            {
                ...positions.fires[3],
                title: "Li Perlaj Michif",
                url: "experiences/beadwork.html",
                message: "Around the fire, nimble fingers would thread beads into intricate patterns—each design carrying mathematical precision and cultural meaning. The Métis were master beadworkers, creating the stunning floral designs that earned them the name 'The Flower Beadwork People.'",
                buttonText: "Explore Beadwork Math →"
            },
            {
                ...positions.fires[4],
                title: "Li Nòmb dan la Natiir",
                url: "experiences/nature-math.html",
                message: "The Elders knew that the Creator's wisdom was written in the patterns of nature. In the spiral of a sunflower, the branching of rivers, and the symmetry of flowers, they saw the same sacred mathematics that guided their beadwork and designs.",
                buttonText: "Explore Nature's Math →"
            },
            {
                ...positions.fires[5],
                title: "Li Serkl di Achimowin",
                url: "experiences/circle-of-stories.html",
                message: "In Métis tradition, knowledge is never held alone—it flows in circles, connecting all things. The Elders teach that every story links to another, every skill supports its neighbor, and every person is part of a greater web of kinship.",
                buttonText: "Enter the Circle →"
            },
        ];

        // Other experiences
        this.herbExperiences = [{
            ...positions.herb,
            title: "Li Jardaen di Michinn",
            subtitle: "The Medicine Garden",
            url: "experiences/medicine-garden.html",
            message: "Hidden among the wild grasses lies a sacred gathering of healing plants. The Métis people knew every root, leaf, and flower—their gifts passed down through whispered teachings and careful observation.",
            buttonText: "Enter the Garden →"
        }];

        this.logPileExperiences = [{
            ...positions.logpile,
            title: "Li Bâtimân",
            subtitle: "The Buildings of the Métis",
            url: "experiences/architecture.html",
            message: "Among these carefully stacked logs lies the knowledge of generations of Métis builders. Our ancestors crafted homes that blended French-Canadian techniques with the practical wisdom needed for prairie life.",
            buttonText: "Explore Architecture →"
        }];

        this.gardenExperiences = [{
            ...positions.garden,
            title: "Li Loo di Rivyair",
            subtitle: "The River Lot System",
            url: "experiences/farming.html",
            message: "The Métis developed a unique system of land division called the river lot. These long, narrow strips of land stretched back from the riverbank, ensuring every family had access to water, timber, and fertile soil.",
            buttonText: "Plant the Fields →"
        }];

        this.cartExperiences = [{
            ...positions.cart,
            title: "La Sharette di Rivyair Roozh",
            subtitle: "The Red River Cart",
            url: "experiences/cart.html",
            message: "The Red River Cart was the heartbeat of Métis trade and travel. Its distinctive squeaking wheels could be heard for miles across the prairie—a sound that announced the arrival of traders, hunters, and families on the move.",
            buttonText: "Explore the Cart →"
        }];

        this.fishingExperiences = [{
            ...positions.fishing,
            title: "La Sizon di Pwason",
            subtitle: "The Fishing Season",
            url: "experiences/fishing.html",
            message: "Fishing was central to Métis life along the rivers and lakes of the prairies. The knowledge of when and where to fish—passed down through generations—ensured that communities thrived even in the harshest seasons.",
            buttonText: "Cast Your Line →"
        }];

        this.memorialExperiences = [{
            ...positions.memorial,
            title: "Li Mimwayr",
            subtitle: "Remembering & Resilience",
            url: "experiences/remembering.html",
            message: "In this quiet place, we pause to remember the history that shaped Métis communities—the trauma of residential schools, the loss of language and culture, and the incredible resilience that carried our people through.",
            buttonText: "Enter with Care →"
        }];

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
        // Dialogue overlay for Elder visits
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

        // Styles
        const style = document.createElement('style');
        style.textContent = `
            #dialogue-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(10, 22, 40, 0.9);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #dialogue-box {
                width: 85%;
                max-width: 650px;
                max-height: 80vh;
                overflow-y: auto;
                background: linear-gradient(135deg, rgba(30, 58, 95, 0.95) 0%, rgba(10, 22, 40, 0.98) 100%);
                border: 2px solid rgba(136, 204, 255, 0.4);
                border-radius: 16px;
                padding: 35px 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 60px rgba(136, 204, 255, 0.2), 0 25px 80px rgba(0,0,0,0.6);
            }
            #speaker-name {
                font-family: 'Georgia', serif;
                font-size: 1.7rem;
                color: #ffcc66;
                margin-bottom: 8px;
                text-shadow: 0 0 20px rgba(255, 204, 102, 0.5);
            }
            #speaker-location {
                font-size: 0.95rem;
                color: rgba(136, 204, 255, 0.8);
                margin-bottom: 25px;
                font-style: italic;
            }
            #story-text {
                font-size: 1.15rem;
                line-height: 1.85;
                margin-bottom: 30px;
                border-left: 3px solid rgba(136, 204, 255, 0.5);
                padding-left: 22px;
                color: #e8f0f8;
            }
            #math-section {
                background: rgba(136, 204, 255, 0.08);
                padding: 25px;
                border-radius: 12px;
                margin-bottom: 25px;
                border: 1px solid rgba(136, 204, 255, 0.2);
            }
            #math-label {
                font-size: 0.95rem;
                color: #88ccff;
                margin-bottom: 12px;
            }
            #math-question {
                font-family: 'Courier New', monospace;
                font-size: 1.25rem;
                color: #fff;
                margin-bottom: 18px;
                font-weight: bold;
            }
            #options-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 14px;
            }
            .option-btn {
                background: rgba(136, 204, 255, 0.1);
                border: 1px solid rgba(136, 204, 255, 0.3);
                padding: 16px;
                color: #e0f0ff;
                cursor: pointer;
                border-radius: 8px;
                transition: all 0.25s ease;
                font-size: 1.05rem;
            }
            .option-btn:hover {
                background: rgba(136, 204, 255, 0.2);
                border-color: #88ccff;
                transform: translateY(-2px);
            }
            .option-btn.correct {
                background: rgba(100, 255, 150, 0.25);
                border-color: #66ff99;
            }
            .option-btn.wrong {
                background: rgba(255, 100, 100, 0.25);
                border-color: #ff6666;
            }
            #continue-btn {
                background: linear-gradient(135deg, #4488cc 0%, #2266aa 100%);
                color: white;
                border: none;
                padding: 14px 35px;
                font-size: 1.05rem;
                cursor: pointer;
                border-radius: 8px;
                float: right;
                transition: all 0.3s ease;
            }
            #continue-btn:hover {
                background: linear-gradient(135deg, #55aadd 0%, #3388cc 100%);
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(68, 136, 204, 0.4);
            }
            #close-btn {
                position: absolute;
                top: 18px;
                right: 22px;
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.6rem;
                cursor: pointer;
                transition: color 0.2s;
            }
            #close-btn:hover {
                color: #fff;
            }
        `;
        document.head.appendChild(style);

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
        const fireOverlay = document.createElement('div');
        fireOverlay.id = 'fireplace-overlay';
        fireOverlay.innerHTML = `
            <div id="fireplace-box">
                <button id="fire-close-btn">×</button>
                <div id="fire-icon">✦</div>
                <h2 id="fire-title">Experience Station</h2>
                <p id="fire-text">Explore this station to learn more.</p>
                <button id="fire-explore-btn">Explore →</button>
            </div>
        `;
        document.body.appendChild(fireOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #fireplace-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(10, 22, 40, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #fireplace-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(50, 30, 15, 0.95) 0%, rgba(25, 15, 8, 0.98) 100%);
                border: 2px solid rgba(255, 150, 80, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(255, 120, 50, 0.25), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #fire-icon {
                font-size: 3.5rem;
                margin-bottom: 18px;
                color: #ff9944;
                animation: pulse 2s ease-in-out infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }
            #fire-title {
                font-family: 'Georgia', serif;
                font-size: 1.9rem;
                color: #ffcc66;
                margin: 0 0 22px 0;
                text-shadow: 0 0 30px rgba(255, 200, 100, 0.5);
            }
            #fire-text {
                font-size: 1.05rem;
                line-height: 1.75;
                color: #e8d8c8;
                margin-bottom: 28px;
            }
            #fire-explore-btn {
                background: linear-gradient(135deg, #ff7744 0%, #cc5522 100%);
                color: white;
                border: none;
                padding: 16px 40px;
                font-size: 1.15rem;
                cursor: pointer;
                border-radius: 10px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #fire-explore-btn:hover {
                background: linear-gradient(135deg, #ff9966 0%, #ff6633 100%);
                transform: scale(1.05);
                box-shadow: 0 8px 30px rgba(255, 120, 50, 0.5);
            }
            #fire-close-btn {
                position: absolute;
                top: 18px;
                right: 22px;
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.6rem;
                cursor: pointer;
            }
            #fire-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.fireOverlay = fireOverlay;
        this.fireTitle = document.getElementById('fire-title');
        this.fireText = document.getElementById('fire-text');
        this.fireExploreBtn = document.getElementById('fire-explore-btn');
        this.fireCloseBtn = document.getElementById('fire-close-btn');
    }

    createHerbUI() {
        const herbOverlay = document.createElement('div');
        herbOverlay.id = 'herb-overlay';
        herbOverlay.innerHTML = `
            <div id="herb-box">
                <button id="herb-close-btn">×</button>
                <div id="herb-icon">❖</div>
                <h2 id="herb-title">Medicine Garden</h2>
                <h3 id="herb-subtitle">Healing Traditions</h3>
                <p id="herb-text">Explore the healing plants.</p>
                <button id="herb-explore-btn">Enter →</button>
            </div>
        `;
        document.body.appendChild(herbOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #herb-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(10, 25, 20, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #herb-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(20, 50, 35, 0.95) 0%, rgba(10, 30, 20, 0.98) 100%);
                border: 2px solid rgba(100, 200, 120, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(100, 200, 120, 0.2), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #herb-icon {
                font-size: 3.5rem;
                margin-bottom: 18px;
                color: #66cc77;
            }
            #herb-title {
                font-family: 'Georgia', serif;
                font-size: 1.9rem;
                color: #88dd99;
                margin: 0 0 8px 0;
            }
            #herb-subtitle {
                font-size: 1rem;
                color: rgba(136, 221, 153, 0.7);
                margin: 0 0 22px 0;
                font-weight: normal;
                font-style: italic;
            }
            #herb-text {
                font-size: 1.05rem;
                line-height: 1.75;
                color: #c8e8d0;
                margin-bottom: 28px;
            }
            #herb-explore-btn {
                background: linear-gradient(135deg, #55aa66 0%, #338844 100%);
                color: white;
                border: none;
                padding: 16px 40px;
                font-size: 1.15rem;
                cursor: pointer;
                border-radius: 10px;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            #herb-explore-btn:hover {
                background: linear-gradient(135deg, #77cc88 0%, #55aa66 100%);
                transform: scale(1.05);
                box-shadow: 0 8px 30px rgba(100, 200, 120, 0.4);
            }
            #herb-close-btn {
                position: absolute;
                top: 18px;
                right: 22px;
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.5);
                font-size: 1.6rem;
                cursor: pointer;
            }
            #herb-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.herbOverlay = herbOverlay;
        this.herbTitle = document.getElementById('herb-title');
        this.herbSubtitle = document.getElementById('herb-subtitle');
        this.herbText = document.getElementById('herb-text');
        this.herbExploreBtn = document.getElementById('herb-explore-btn');
        this.herbCloseBtn = document.getElementById('herb-close-btn');
    }

    createLogPileUI() {
        const logPileOverlay = document.createElement('div');
        logPileOverlay.id = 'logpile-overlay';
        logPileOverlay.innerHTML = `
            <div id="logpile-box">
                <button id="logpile-close-btn">×</button>
                <div id="logpile-icon">◈</div>
                <h2 id="logpile-title">Architecture</h2>
                <h3 id="logpile-subtitle">Building Traditions</h3>
                <p id="logpile-text">Explore architecture.</p>
                <button id="logpile-explore-btn">Explore →</button>
            </div>
        `;
        document.body.appendChild(logPileOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #logpile-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(25, 18, 10, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #logpile-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(60, 40, 25, 0.95) 0%, rgba(35, 22, 12, 0.98) 100%);
                border: 2px solid rgba(180, 140, 80, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(180, 140, 80, 0.2), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #logpile-icon { font-size: 3.5rem; margin-bottom: 18px; color: #ddaa66; }
            #logpile-title { font-family: 'Georgia', serif; font-size: 1.9rem; color: #eebb77; margin: 0 0 8px 0; }
            #logpile-subtitle { font-size: 1rem; color: rgba(238, 187, 119, 0.7); margin: 0 0 22px 0; font-style: italic; }
            #logpile-text { font-size: 1.05rem; line-height: 1.75; color: #e8d8c0; margin-bottom: 28px; }
            #logpile-explore-btn {
                background: linear-gradient(135deg, #aa7733 0%, #886622 100%);
                color: white; border: none; padding: 16px 40px; font-size: 1.15rem;
                cursor: pointer; border-radius: 10px; transition: all 0.3s ease; font-weight: bold;
            }
            #logpile-explore-btn:hover { background: linear-gradient(135deg, #cc9944 0%, #aa7733 100%); transform: scale(1.05); }
            #logpile-close-btn { position: absolute; top: 18px; right: 22px; background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 1.6rem; cursor: pointer; }
            #logpile-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.logPileOverlay = logPileOverlay;
        this.logPileTitle = document.getElementById('logpile-title');
        this.logPileSubtitle = document.getElementById('logpile-subtitle');
        this.logPileText = document.getElementById('logpile-text');
        this.logPileExploreBtn = document.getElementById('logpile-explore-btn');
        this.logPileCloseBtn = document.getElementById('logpile-close-btn');
    }

    createGardenUI() {
        const gardenOverlay = document.createElement('div');
        gardenOverlay.id = 'garden-overlay';
        gardenOverlay.innerHTML = `
            <div id="garden-box">
                <button id="garden-close-btn">×</button>
                <div id="garden-icon">✿</div>
                <h2 id="garden-title">River Lot</h2>
                <h3 id="garden-subtitle">Farming Traditions</h3>
                <p id="garden-text">Learn about farming.</p>
                <button id="garden-explore-btn">Plant →</button>
            </div>
        `;
        document.body.appendChild(gardenOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #garden-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(15, 30, 15, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #garden-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(30, 55, 30, 0.95) 0%, rgba(15, 35, 15, 0.98) 100%);
                border: 2px solid rgba(140, 200, 80, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(140, 200, 80, 0.2), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #garden-icon { font-size: 3.5rem; margin-bottom: 18px; color: #99dd55; }
            #garden-title { font-family: 'Georgia', serif; font-size: 1.9rem; color: #aaee66; margin: 0 0 8px 0; }
            #garden-subtitle { font-size: 1rem; color: rgba(170, 238, 102, 0.7); margin: 0 0 22px 0; font-style: italic; }
            #garden-text { font-size: 1.05rem; line-height: 1.75; color: #d0e8c0; margin-bottom: 28px; }
            #garden-explore-btn {
                background: linear-gradient(135deg, #77aa33 0%, #558822 100%);
                color: white; border: none; padding: 16px 40px; font-size: 1.15rem;
                cursor: pointer; border-radius: 10px; transition: all 0.3s ease; font-weight: bold;
            }
            #garden-explore-btn:hover { background: linear-gradient(135deg, #99cc55 0%, #77aa33 100%); transform: scale(1.05); }
            #garden-close-btn { position: absolute; top: 18px; right: 22px; background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 1.6rem; cursor: pointer; }
            #garden-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.gardenOverlay = gardenOverlay;
        this.gardenTitle = document.getElementById('garden-title');
        this.gardenSubtitle = document.getElementById('garden-subtitle');
        this.gardenText = document.getElementById('garden-text');
        this.gardenExploreBtn = document.getElementById('garden-explore-btn');
        this.gardenCloseBtn = document.getElementById('garden-close-btn');
    }

    createCartUI() {
        const cartOverlay = document.createElement('div');
        cartOverlay.id = 'cart-overlay';
        cartOverlay.innerHTML = `
            <div id="cart-box">
                <button id="cart-close-btn">×</button>
                <div id="cart-icon">◎</div>
                <h2 id="cart-title">Red River Cart</h2>
                <h3 id="cart-subtitle">Trade & Travel</h3>
                <p id="cart-text">Explore the cart.</p>
                <button id="cart-explore-btn">Explore →</button>
            </div>
        `;
        document.body.appendChild(cartOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #cart-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(30, 20, 12, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #cart-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(70, 50, 30, 0.95) 0%, rgba(45, 30, 18, 0.98) 100%);
                border: 2px solid rgba(160, 120, 70, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(160, 120, 70, 0.2), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #cart-icon { font-size: 3.5rem; margin-bottom: 18px; color: #cc9966; }
            #cart-title { font-family: 'Georgia', serif; font-size: 1.9rem; color: #ddaa77; margin: 0 0 8px 0; }
            #cart-subtitle { font-size: 1rem; color: rgba(221, 170, 119, 0.7); margin: 0 0 22px 0; font-style: italic; }
            #cart-text { font-size: 1.05rem; line-height: 1.75; color: #e8d8c8; margin-bottom: 28px; }
            #cart-explore-btn {
                background: linear-gradient(135deg, #996644 0%, #774422 100%);
                color: white; border: none; padding: 16px 40px; font-size: 1.15rem;
                cursor: pointer; border-radius: 10px; transition: all 0.3s ease; font-weight: bold;
            }
            #cart-explore-btn:hover { background: linear-gradient(135deg, #bb8866 0%, #996644 100%); transform: scale(1.05); }
            #cart-close-btn { position: absolute; top: 18px; right: 22px; background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 1.6rem; cursor: pointer; }
            #cart-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.cartOverlay = cartOverlay;
        this.cartTitle = document.getElementById('cart-title');
        this.cartSubtitle = document.getElementById('cart-subtitle');
        this.cartText = document.getElementById('cart-text');
        this.cartExploreBtn = document.getElementById('cart-explore-btn');
        this.cartCloseBtn = document.getElementById('cart-close-btn');
    }

    createFishingUI() {
        const fishingOverlay = document.createElement('div');
        fishingOverlay.id = 'fishing-overlay';
        fishingOverlay.innerHTML = `
            <div id="fishing-box">
                <button id="fishing-close-btn">×</button>
                <div id="fishing-icon">≋</div>
                <h2 id="fishing-title">Fishing Season</h2>
                <h3 id="fishing-subtitle">River Traditions</h3>
                <p id="fishing-text">Learn fishing traditions.</p>
                <button id="fishing-explore-btn">Cast →</button>
            </div>
        `;
        document.body.appendChild(fishingOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #fishing-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(10, 25, 40, 0.92);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #fishing-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(20, 50, 80, 0.95) 0%, rgba(10, 30, 55, 0.98) 100%);
                border: 2px solid rgba(80, 160, 220, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(80, 160, 220, 0.2), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #fishing-icon { font-size: 3.5rem; margin-bottom: 18px; color: #66aadd; }
            #fishing-title { font-family: 'Georgia', serif; font-size: 1.9rem; color: #88ccee; margin: 0 0 8px 0; }
            #fishing-subtitle { font-size: 1rem; color: rgba(136, 204, 238, 0.7); margin: 0 0 22px 0; font-style: italic; }
            #fishing-text { font-size: 1.05rem; line-height: 1.75; color: #c8e0f0; margin-bottom: 28px; }
            #fishing-explore-btn {
                background: linear-gradient(135deg, #4488bb 0%, #336699 100%);
                color: white; border: none; padding: 16px 40px; font-size: 1.15rem;
                cursor: pointer; border-radius: 10px; transition: all 0.3s ease; font-weight: bold;
            }
            #fishing-explore-btn:hover { background: linear-gradient(135deg, #66aadd 0%, #4488bb 100%); transform: scale(1.05); }
            #fishing-close-btn { position: absolute; top: 18px; right: 22px; background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 1.6rem; cursor: pointer; }
            #fishing-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.fishingOverlay = fishingOverlay;
        this.fishingTitle = document.getElementById('fishing-title');
        this.fishingSubtitle = document.getElementById('fishing-subtitle');
        this.fishingText = document.getElementById('fishing-text');
        this.fishingExploreBtn = document.getElementById('fishing-explore-btn');
        this.fishingCloseBtn = document.getElementById('fishing-close-btn');
    }

    createMemorialUI() {
        const memorialOverlay = document.createElement('div');
        memorialOverlay.id = 'memorial-overlay';
        memorialOverlay.innerHTML = `
            <div id="memorial-box">
                <button id="memorial-close-btn">×</button>
                <div id="memorial-icon">❋</div>
                <h2 id="memorial-title">Memorial</h2>
                <h3 id="memorial-subtitle">Remembering & Resilience</h3>
                <p id="memorial-text">A space for reflection.</p>
                <button id="memorial-explore-btn">Enter →</button>
            </div>
        `;
        document.body.appendChild(memorialOverlay);

        const style = document.createElement('style');
        style.textContent = `
            #memorial-overlay {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(20, 15, 10, 0.94);
                backdrop-filter: blur(15px);
                z-index: 1000;
                justify-content: center;
                align-items: center;
            }
            #memorial-box {
                width: 85%;
                max-width: 520px;
                background: linear-gradient(135deg, rgba(45, 30, 20, 0.95) 0%, rgba(25, 15, 10, 0.98) 100%);
                border: 2px solid rgba(200, 120, 60, 0.5);
                border-radius: 16px;
                padding: 40px;
                color: white;
                position: relative;
                box-shadow: 0 0 80px rgba(200, 120, 60, 0.15), 0 25px 80px rgba(0,0,0,0.6);
                text-align: center;
            }
            #memorial-icon { font-size: 3.5rem; margin-bottom: 18px; color: #dd9944; animation: flicker 3s ease-in-out infinite; }
            @keyframes flicker {
                0%, 100% { opacity: 1; }
                25% { opacity: 0.85; }
                75% { opacity: 0.9; }
            }
            #memorial-title { font-family: 'Georgia', serif; font-size: 1.9rem; color: #ddaa66; margin: 0 0 8px 0; }
            #memorial-subtitle { font-size: 1rem; color: rgba(221, 170, 102, 0.7); margin: 0 0 22px 0; font-style: italic; }
            #memorial-text { font-size: 1.05rem; line-height: 1.75; color: #d8c8b8; margin-bottom: 28px; }
            #memorial-explore-btn {
                background: linear-gradient(135deg, #cc7733 0%, #aa5522 100%);
                color: white; border: none; padding: 16px 40px; font-size: 1.15rem;
                cursor: pointer; border-radius: 10px; transition: all 0.3s ease; font-weight: bold;
            }
            #memorial-explore-btn:hover { background: linear-gradient(135deg, #dd8844 0%, #cc7733 100%); transform: scale(1.05); }
            #memorial-close-btn { position: absolute; top: 18px; right: 22px; background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 1.6rem; cursor: pointer; }
            #memorial-close-btn:hover { color: #fff; }
        `;
        document.head.appendChild(style);

        this.memorialOverlay = memorialOverlay;
        this.memorialTitle = document.getElementById('memorial-title');
        this.memorialSubtitle = document.getElementById('memorial-subtitle');
        this.memorialText = document.getElementById('memorial-text');
        this.memorialExploreBtn = document.getElementById('memorial-explore-btn');
        this.memorialCloseBtn = document.getElementById('memorial-close-btn');
    }

    setupInteractables() {
        // Create clickable zones for each station
        // Cabins
        this.cabinPositions.forEach((pos, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(pos.x, pos.y + 8, pos.z);
            zone.userData = { visitId: index, type: 'cabin' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Fires
        this.fireplaceExperiences.forEach((fire, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(fire.x, fire.y + 8, fire.z);
            zone.userData = { fireId: index, type: 'fireplace' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Herb
        this.herbExperiences.forEach((herb, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(herb.x, herb.y + 8, herb.z);
            zone.userData = { herbId: index, type: 'herb' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // LogPile
        this.logPileExperiences.forEach((item, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(item.x, item.y + 8, item.z);
            zone.userData = { logPileId: index, type: 'logpile' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Garden
        this.gardenExperiences.forEach((item, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(item.x, item.y + 8, item.z);
            zone.userData = { gardenId: index, type: 'garden' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Cart
        this.cartExperiences.forEach((item, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(item.x, item.y + 8, item.z);
            zone.userData = { cartId: index, type: 'cart' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Fishing
        this.fishingExperiences.forEach((item, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(item.x, item.y + 8, item.z);
            zone.userData = { fishingId: index, type: 'fishing' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });

        // Memorial
        this.memorialExperiences.forEach((item, index) => {
            const zone = new THREE.Mesh(
                new THREE.SphereGeometry(12, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            zone.position.set(item.x, item.y + 8, item.z);
            zone.userData = { memorialId: index, type: 'memorial' };
            this.scene.add(zone);
            this.interactables.push(zone);
        });
    }

    setupEvents() {
        this.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

        // Elder dialogue buttons
        this.continueBtn.addEventListener('click', (e) => { e.stopPropagation(); this.advanceDialogue(); });
        this.closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeDialogue(); });

        // Close buttons for all overlays
        this.fireCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeFireplacePopup(); });
        this.herbCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeHerbPopup(); });
        this.logPileCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeLogPilePopup(); });
        this.gardenCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeGardenPopup(); });
        this.cartCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeCartPopup(); });
        this.fishingCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeFishingPopup(); });
        this.memorialCloseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.closeMemorialPopup(); });

        // Click outside to close
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.closeDialogue(); });
        this.fireOverlay.addEventListener('click', (e) => { if (e.target === this.fireOverlay) this.closeFireplacePopup(); });
        this.herbOverlay.addEventListener('click', (e) => { if (e.target === this.herbOverlay) this.closeHerbPopup(); });
        this.logPileOverlay.addEventListener('click', (e) => { if (e.target === this.logPileOverlay) this.closeLogPilePopup(); });
        this.gardenOverlay.addEventListener('click', (e) => { if (e.target === this.gardenOverlay) this.closeGardenPopup(); });
        this.cartOverlay.addEventListener('click', (e) => { if (e.target === this.cartOverlay) this.closeCartPopup(); });
        this.fishingOverlay.addEventListener('click', (e) => { if (e.target === this.fishingOverlay) this.closeFishingPopup(); });
        this.memorialOverlay.addEventListener('click', (e) => { if (e.target === this.memorialOverlay) this.closeMemorialPopup(); });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.closeDialogue();
                this.closeFireplacePopup();
                this.closeHerbPopup();
                this.closeLogPilePopup();
                this.closeGardenPopup();
                this.closeCartPopup();
                this.closeFishingPopup();
                this.closeMemorialPopup();
            }
        });
    }

    onCanvasClick(event) {
        // Check if any overlay is open
        if (this.isDialogueOpen) return;
        const overlays = [this.fireOverlay, this.herbOverlay, this.logPileOverlay, this.gardenOverlay, this.cartOverlay, this.fishingOverlay, this.memorialOverlay];
        if (overlays.some(o => o.style.display === 'flex')) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);

        if (intersects.length > 0) {
            const userData = intersects[0].object.userData;

            switch(userData.type) {
                case 'cabin': this.startVisit(userData.visitId); break;
                case 'fireplace': this.openFireplacePopup(userData.fireId); break;
                case 'herb': this.openHerbPopup(userData.herbId); break;
                case 'logpile': this.openLogPilePopup(userData.logPileId); break;
                case 'garden': this.openGardenPopup(userData.gardenId); break;
                case 'cart': this.openCartPopup(userData.cartId); break;
                case 'fishing': this.openFishingPopup(userData.fishingId); break;
                case 'memorial': this.openMemorialPopup(userData.memorialId); break;
            }
        }
    }

    // Elder visit methods
    startVisit(visitId) {
        this.currentVisit = elderVisits[visitId];
        this.currentCabinNumber = visitId + 1;
        this.dialogueStep = 0;
        this.isDialogueOpen = true;
        if (this.controls) this.controls.enabled = false;

        this.speakerName.textContent = this.currentVisit.name;
        this.speakerLocation.textContent = this.currentVisit.location;
        this.mathSection.style.display = 'none';
        this.continueBtn.style.display = 'block';

        if (this.completedVisits.has(visitId)) {
            this.storyText.textContent = "Welcome back, friend! It's good to see you again.";
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
            btn.onclick = (e) => { e.stopPropagation(); this.handleAnswer(btn, opt.correct); };
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
        if (window.metisPrairieProgress) {
            window.metisPrairieProgress.markVisited('cabin', this.currentCabinNumber);
        }
        this.closeDialogue();
    }

    closeDialogue() {
        this.overlay.style.display = 'none';
        this.isDialogueOpen = false;
        this.currentVisit = null;
        if (this.controls) this.controls.enabled = true;
    }

    // Popup methods for each type
    openFireplacePopup(fireId) {
        const fire = this.fireplaceExperiences[fireId];
        if (this.controls) this.controls.enabled = false;

        this.fireTitle.textContent = fire.title || "Experience Station";
        this.fireText.innerHTML = fire.message || "Explore this station to learn more.";
        this.fireExploreBtn.textContent = fire.buttonText || "Explore →";
        this.fireExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('fire', fireId);
            window.location.href = fire.url;
        };
        this.fireOverlay.style.display = 'flex';
    }

    closeFireplacePopup() {
        this.fireOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openHerbPopup(herbId) {
        const herb = this.herbExperiences[herbId];
        if (this.controls) this.controls.enabled = false;
        this.herbTitle.textContent = herb.title;
        this.herbSubtitle.textContent = herb.subtitle;
        this.herbText.innerHTML = herb.message;
        this.herbExploreBtn.textContent = herb.buttonText;
        this.herbExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('herb', herbId);
            window.location.href = herb.url;
        };
        this.herbOverlay.style.display = 'flex';
    }

    closeHerbPopup() {
        this.herbOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openLogPilePopup(logPileId) {
        const item = this.logPileExperiences[logPileId];
        if (this.controls) this.controls.enabled = false;
        this.logPileTitle.textContent = item.title;
        this.logPileSubtitle.textContent = item.subtitle;
        this.logPileText.innerHTML = item.message;
        this.logPileExploreBtn.textContent = item.buttonText;
        this.logPileExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('logpile', logPileId);
            window.location.href = item.url;
        };
        this.logPileOverlay.style.display = 'flex';
    }

    closeLogPilePopup() {
        this.logPileOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openGardenPopup(gardenId) {
        const item = this.gardenExperiences[gardenId];
        if (this.controls) this.controls.enabled = false;
        this.gardenTitle.textContent = item.title;
        this.gardenSubtitle.textContent = item.subtitle;
        this.gardenText.innerHTML = item.message;
        this.gardenExploreBtn.textContent = item.buttonText;
        this.gardenExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('garden', gardenId);
            window.location.href = item.url;
        };
        this.gardenOverlay.style.display = 'flex';
    }

    closeGardenPopup() {
        this.gardenOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openCartPopup(cartId) {
        const item = this.cartExperiences[cartId];
        if (this.controls) this.controls.enabled = false;
        this.cartTitle.textContent = item.title;
        this.cartSubtitle.textContent = item.subtitle;
        this.cartText.innerHTML = item.message;
        this.cartExploreBtn.textContent = item.buttonText;
        this.cartExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('cart', cartId);
            window.location.href = item.url;
        };
        this.cartOverlay.style.display = 'flex';
    }

    closeCartPopup() {
        this.cartOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openFishingPopup(fishingId) {
        const item = this.fishingExperiences[fishingId];
        if (this.controls) this.controls.enabled = false;
        this.fishingTitle.textContent = item.title;
        this.fishingSubtitle.textContent = item.subtitle;
        this.fishingText.innerHTML = item.message;
        this.fishingExploreBtn.textContent = item.buttonText;
        this.fishingExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('fishing', fishingId);
            window.location.href = item.url;
        };
        this.fishingOverlay.style.display = 'flex';
    }

    closeFishingPopup() {
        this.fishingOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }

    openMemorialPopup(memorialId) {
        const item = this.memorialExperiences[memorialId];
        if (this.controls) this.controls.enabled = false;
        this.memorialTitle.textContent = item.title;
        this.memorialSubtitle.textContent = item.subtitle;
        this.memorialText.innerHTML = item.message;
        this.memorialExploreBtn.textContent = item.buttonText;
        this.memorialExploreBtn.onclick = () => {
            if (window.metisPrairieProgress) window.metisPrairieProgress.markVisited('memorial', memorialId);
            window.location.href = item.url;
        };
        this.memorialOverlay.style.display = 'flex';
    }

    closeMemorialPopup() {
        this.memorialOverlay.style.display = 'none';
        if (this.controls) this.controls.enabled = true;
    }
}
