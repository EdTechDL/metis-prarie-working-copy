// Elder visits data - expanded with community focus and respectful math transitions
export const elderVisits = [
    {
        id: 0,
        name: "Nohkum (Grandmother)",
        location: "The Kitchen Table",
        greeting: [
            "Tansi, my child! Come in, come in. Sit down by the fire and warm yourself. Would you like some bannock? I just made it fresh this morning.",
            "You know, in our family, the kitchen table is where we share everything—stories, laughter, tears. My mother sat at this same table, and her mother before her.",
            "See this beadwork I'm working on? Each flower connects to the next, just like our families connect to each other. The Métis, we are a people of connection—French and Cree, Scottish and Dene, all woven together like this thread.",
            "Every bead has its place. Every pattern has meaning. When I was young, my grandmother taught me that finding the common thread is how we make beauty from many pieces.",
            "Speaking of patterns... I'm making flower clusters for a gift, and I could use some help. I have 12 red beads and 18 blue beads. I want each cluster to be identical, using all the beads with none left over. Can you help me figure out how to group them?"
        ],
        math: {
            label: "Find the Greatest Common Factor (GCF) of 12 and 18 to determine the group size.",
            question: "What is the largest number that divides evenly into both 12 and 18?",
            options: [
                { text: "2", correct: false },
                { text: "3", correct: false },
                { text: "6", correct: true },
                { text: "12", correct: false }
            ],
            success: "Maarsii, thank you! Groups of 6—now the pattern flows perfectly. You have a good mind for this. Take this thread as a gift. When you look at it, remember: we are all connected, like beads on a string."
        }
    },
    {
        id: 1,
        name: "Uncle Gabriel",
        location: "The Workshop",
        greeting: [
            "Hey hey, come on over! Watch your step—sawdust everywhere. This is where I do my thinking, right here with my hands.",
            "You ever seen a Red River Cart? No nails, no metal—just wood and rawhide. When the buffalo hunters headed west, you could hear these carts screaming for miles. 'The Singing Carts,' they called them!",
            "My grandfather built carts for the buffalo hunt. Hundreds of families would travel together—a whole community moving as one. The children running alongside, the elders keeping watch, everyone with a role.",
            "You know what makes a cart wheel work? Balance. Perfect balance. One side heavy, the wheel breaks. Life is like that too—we need balance in all things.",
            "I'm checking the balance on this axle. There's an equation carved on it from the old days: x² - 100. The way it breaks down, that's the secret. Can you help me see the balance?"
        ],
        math: {
            label: "Factor the Difference of Squares: x² - 100",
            question: "How does x² - 100 factor into two balanced parts?",
            options: [
                { text: "(x - 10)(x - 10)", correct: false },
                { text: "(x + 10)(x - 10)", correct: true },
                { text: "(x + 50)(x - 2)", correct: false },
                { text: "(x + 100)(x - 1)", correct: false }
            ],
            success: "That's it! (x + 10) and (x - 10)—perfect balance, opposite forces holding each other up. Just like community. Here, take this cart spoke. It represents strength through balance. Remember: alone we are strong, but together we are unbreakable."
        }
    },
    {
        id: 2,
        name: "Fiddler Pierre",
        location: "The Cabin",
        greeting: [
            "Hiy hiy! Come in, come in! You can hear my fiddle from the river, eh? That's how it should be—music carries across the water, brings people together.",
            "Listen to this... *plays a few bars* ...that's the Red River Jig! Scottish footwork, Cree soul, French fiddle—all mixed together. That's us Métis people. We take the best and make something new.",
            "Saturday nights, the whole settlement would gather. Didn't matter if you were rich or poor, old or young—everyone danced. The children would fall asleep on piles of coats while the adults jigged until sunrise.",
            "Music is mathematics, you know. Rhythm, harmony, patterns. A chord has three notes that work together, just like a family. You need the right combination to make it sound true.",
            "Help me tune this measure. I'm working on a new arrangement: x² + 7x + 10. To find the harmony, I need two numbers that multiply to 10 and add to 7. What do you think?"
        ],
        math: {
            label: "Factor the Trinomial: x² + 7x + 10",
            question: "Find two numbers that multiply to 10 and add to 7.",
            options: [
                { text: "(x + 2)(x + 5)", correct: true },
                { text: "(x + 1)(x + 10)", correct: false },
                { text: "(x - 2)(x - 5)", correct: false },
                { text: "(x + 3)(x + 4)", correct: false }
            ],
            success: "2 and 5! That's the tune! You've got an ear for harmony. Here, take this fiddle bow hair—it represents rhythm and joy. Remember: life needs music, and music needs community. Come back anytime and we'll play together!"
        }
    },
    {
        id: 3,
        name: "Auntie Annie",
        location: "The Garden",
        greeting: [
            "Oh, a visitor! Come, come, be careful of the squash vines. You're here at the perfect time—harvest season! The land is generous to those who listen to her.",
            "My great-grandmother planted this garden when the buffalo grew scarce. 'The land will feed us,' she said, 'if we learn her ways.' And she was right.",
            "We Métis women, we are the keepers of the seeds. Every spring, we plant. Every fall, we save seeds for the next year. This knowledge passes from mother to daughter, grandmother to grandchild.",
            "Plants don't grow in straight lines, you know. They curve toward the sun, reaching and bending. There's a mathematics to it—what they call a 'parabola' in the books. Nature knew this long before any school taught it.",
            "See this vine? It follows a perfect curve: y = x². If the vine has grown 3 meters outward along the ground, how high has it reached toward the sun?"
        ],
        math: {
            label: "Evaluate the Quadratic Function: y = x² when x = 3",
            question: "If y = x² and x = 3, what is y?",
            options: [
                { text: "6", correct: false },
                { text: "9", correct: true },
                { text: "3", correct: false },
                { text: "12", correct: false }
            ],
            success: "9 meters high! Yes, nature grows exponentially when conditions are right—just like knowledge, just like community. Here, take this seed. Plant it somewhere good. It represents growth, patience, and the gifts of the earth."
        }
    },
    {
        id: 4,
        name: "Elder Joseph",
        location: "The Sacred Fire",
        greeting: [
            "Tansi, young one. Come, sit by the fire. You've been visiting our community, learning from our people. That is good. That is the old way—Keeoukaywin, the visiting way.",
            "This fire has burned for three days now. People come and go—sharing stories, sharing food, sharing silence. The fire doesn't judge who comes to warm themselves.",
            "When I was young, my grandfather brought me to a gathering like this. 'Watch the smoke,' he said. 'It rises in a circle, carrying our prayers upward. Everything sacred moves in circles.'",
            "The seasons return. The generations return. The sun and moon travel in circles. Even the Medicine Wheel teaches us—all directions are connected, all times are connected.",
            "If we stand at the center of the Medicine Wheel, where all directions meet, and draw a circle with radius 5 to hold our gathering, what would be the equation of that sacred circle?"
        ],
        math: {
            label: "Equation of a Circle: center (0,0), radius 5",
            question: "What is the equation of a circle centered at the origin with radius 5?",
            options: [
                { text: "x² + y² = 5", correct: false },
                { text: "x² + y² = 10", correct: false },
                { text: "x² + y² = 25", correct: true },
                { text: "x + y = 5", correct: false }
            ],
            success: "25—the radius squared. Yes. You understand. The circle holds us all. Take this sage. When you burn it, remember the fire, remember the circle, remember that you are never alone. You are part of something much larger. Maarsii for visiting. You are always welcome here."
        }
    }
];
