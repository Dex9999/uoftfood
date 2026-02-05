
let menuData = null;
let currentMeal = "Dinner";
let currentResidence = null;
let userSelectedMeal = null; // Track user's explicit meal choice
const DEFAULT_RESIDENCE = "Chestnut Residence";

// Valid residence names (exact display names used by API)
const RESIDENCES = [
    "CampusOne Dining Hall",
    "Chestnut Residence",
    "New College Dining Hall",
    "Oak House Dining Hall",
    "Robarts Cafeteria"
];

// Short slug -> display name mapping for clean URLs
const RESIDENCE_SLUGS = {
    campusone: 'CampusOne Dining Hall',
    chestnut: 'Chestnut Residence',
    newcollege: 'New College Dining Hall',
    oak: 'Oak House Dining Hall',
    robarts: 'Robarts Cafeteria'
};

// Residences with non-standard meal structures
const SPECIAL_RESIDENCES = {
    'Robarts Cafeteria': 'Foodie Finds featuring Taste of the Danforth'
};

// Determine residence from URL query or hash, fallback to default
function getResidenceFromURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        // support both ?residence= and ?res=
        let r = params.get('residence') || params.get('res');
        if (!r && window.location.hash) {
            r = decodeURIComponent(window.location.hash.slice(1));
        }
        if (!r) return DEFAULT_RESIDENCE;

        // try slug lookup first (normalize: remove spaces and non-alphanum)
        const slug = r.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        if (RESIDENCE_SLUGS[slug]) return RESIDENCE_SLUGS[slug];

        const norm = r.trim().toLowerCase();
        // exact match first
        for (const res of RESIDENCES) {
            if (res.toLowerCase() === norm) return res;
        }
        // partial match
        for (const res of RESIDENCES) {
            if (res.toLowerCase().includes(norm) || norm.includes(res.toLowerCase())) return res;
        }
        console.warn('⚠️ Residence from URL not recognized, using default:', r);
        return DEFAULT_RESIDENCE;
    } catch (err) {
        console.error('Error parsing residence from URL', err);
        return DEFAULT_RESIDENCE;
    }
}

// Render links for residences (nice short URLs)
function renderResidenceLinks() {
    console.log("🔗 renderResidenceLinks() called");
    const container = document.getElementById('residenceLinks');
    console.log("🔗 Container found:", container);
    if (!container) {
        console.error('❌ #residenceLinks container not found!');
        return;
    }
    container.innerHTML = '';

    Object.keys(RESIDENCE_SLUGS).forEach(slug => {
        const name = RESIDENCE_SLUGS[slug];
        const a = document.createElement('a');
        a.href = `?residence=${encodeURIComponent(slug)}`;
        a.className = 'residence-link';
        a.textContent = name;
        a.dataset.residence = name;
        if (name === currentResidence) a.classList.add('active');
        a.addEventListener('click', (ev) => {
            ev.preventDefault();
            currentResidence = name;
            // Set meal for special residences, otherwise preserve user's choice
            if (SPECIAL_RESIDENCES[currentResidence]) {
                currentMeal = SPECIAL_RESIDENCES[currentResidence];
                userSelectedMeal = null;
                renderMealSelector();
            } else {
                // Use user's selected meal if available, otherwise use next meal time
                if (userSelectedMeal) {
                    currentMeal = userSelectedMeal;
                } else {
                    currentMeal = getNextMealTime();
                    userSelectedMeal = currentMeal;
                }
                renderMealSelector();
            }
            history.pushState({}, '', `?residence=${encodeURIComponent(slug)}`);
            document.querySelectorAll('.residence-link').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            const header = document.querySelector('header h1');
            if (header) header.textContent = `🍽️ ${currentResidence} Dining Menu`;
            renderMenu();
        });
        container.appendChild(a);
        console.log("🔗 Added link for:", name);
    });

    // handle browser back/forward
    window.addEventListener('popstate', () => {
        currentResidence = getResidenceFromURL();
        if (SPECIAL_RESIDENCES[currentResidence]) {
            currentMeal = SPECIAL_RESIDENCES[currentResidence];
            userSelectedMeal = null;
            renderMealSelector();
        } else {
            // Preserve user's selected meal on back/forward
            if (userSelectedMeal) {
                currentMeal = userSelectedMeal;
            } else {
                currentMeal = getNextMealTime();
            }
            renderMealSelector();
        }
        document.querySelectorAll('.residence-link').forEach(el => el.classList.toggle('active', el.dataset.residence === currentResidence));
        const header = document.querySelector('header h1');
        if (header) header.textContent = `🍽️ ${currentResidence} Dining Menu`;
        renderMenu();
    });
    console.log("✅ renderResidenceLinks() completed");
}

// Render meal selector buttons based on residence
function renderMealSelector() {
    const selector = document.querySelector('.meal-selector');
    if (!selector) return;
    selector.innerHTML = '';

    const meals = SPECIAL_RESIDENCES[currentResidence]
        ? [SPECIAL_RESIDENCES[currentResidence]]
        : ['Breakfast', 'Lunch', 'Dinner'];

    meals.forEach(meal => {
        const btn = document.createElement('button');
        btn.className = 'meal-btn';
        if (meal === currentMeal) btn.classList.add('active');
        btn.dataset.meal = meal;

        let icon = '🍽️';
        if (meal === 'Breakfast') icon = '🌅';
        else if (meal === 'Lunch') icon = '☀️';
        else if (meal === 'Dinner') icon = '🌙';

        btn.innerHTML = `<span class="meal-icon">${icon}</span><span>${meal}</span>`;
        btn.addEventListener('click', (e) => {
            currentMeal = e.currentTarget.dataset.meal;
            // Only track user selection for non-special residences
            if (!SPECIAL_RESIDENCES[currentResidence]) {
                userSelectedMeal = currentMeal;
            }
            document.querySelectorAll('.meal-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderMenu();
        });
        selector.appendChild(btn);
    });
}

// Main dishes configuration with icons
const mainDishConfig = {
    "Create Your Own Chinese Steam Bun Bao": "🥟",
    "Build Your Own Ramen": "🍜",
    "Poke Bowl": "🍲",
    "Build Your Own Loaded Baked Potato": "🥔",
    "Beef Burger": "🍔",
    "Veggie Burger": "🍔",
    "Chicken Balls": "🍗"
};

// Guess emoji for a dish name
function guessEmoji(dishName) {
    const name = dishName.toLowerCase();

    // keyword -> emoji mappings (order matters: longer keywords first)
    const keywords = [
        { pattern: /bao|steam.*bun|chinese.*bun|bun|dumpling|samosa/, emoji: '🥟' },
        { pattern: /ramen|noodle/, emoji: '🍜' },
        { pattern: /cheese/, emoji: '🧀' },
        { pattern: /poke|sushi|sashimi/, emoji: '🍣' },
        { pattern: /burger|patty/, emoji: '🍔' },
        { pattern: /chicken|poultry|pork/, emoji: '🍗' },
        { pattern: /fish|salmon|tuna|seafood/, emoji: '🐟' },
        { pattern: /shrimp|prawn/, emoji: '🦐' },
        { pattern: /tofu|vegetarian|vegan/, emoji: '🥬' },
        { pattern: /steak|rib/, emoji: '🥩' },
        { pattern: /pizza|pie/, emoji: '🍕' },
        { pattern: /sandwich|sub/, emoji: '🥪' },
        { pattern: /taco|burrito|wrap/, emoji: '🌮' },
        { pattern: /pasta|lasagna|avioli/, emoji: '🍝' },
        { pattern: /pita|naan|tortilla/, emoji: '🫓' },
        { pattern: /rice|grain/, emoji: '🍚' },
        { pattern: /salad|greens/, emoji: '🥗' },
        { pattern: /soup|broth|bowl|stew/, emoji: '🍲' },
        { pattern: /potato|fries/, emoji: '🥔' },
        { pattern: /vegetable|veggie/, emoji: '🥕' },
        { pattern: /fruit|berry/, emoji: '🍓' },
        { pattern: /bread|toast/, emoji: '🍞' },
        { pattern: /dessert|cake|cookie|pudding|brownie/, emoji: '🍰' },
        { pattern: /donut|doughnut/, emoji: '🍩' },
        { pattern: /ice cream|gelato|sorbet/, emoji: '🍨' },
        { pattern: /eggplant/, emoji: '🍆' },
        { pattern: /fish|cod|salmon|haddock/, emoji: '🐟' },
        { pattern: /egg|omelette/, emoji: '🍳' },
        { pattern: /bacon|sausage/, emoji: '🥓' },

    ];

    for (const { pattern, emoji } of keywords) {
        if (pattern.test(name)) return emoji;
    }

    return '🍽️'; // default fallback
}


// Determine next meal time
function getNextMealTime() {
    const hour = new Date().getHours();

    if (hour < 11) return "Breakfast"; // Before 11 AM = Breakfast
    if (hour < 14) return "Lunch";     // 11 AM - 5 PM = Lunch
    return "Dinner";                   // After 5 PM = Dinner
}

// Initialize page and fetch data
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOMContentLoaded fired");
    initializePage();
});

async function initializePage() {
    console.log("🚀 initializePage started");
    try {
        // Fetch menu data from API
        console.log("📡 Fetching from https://uoft-menu-api.vercel.app/api/menu");
        const response = await fetch('https://uoft-menu-api.vercel.app/api/menu');
        console.log("📡 Response status:", response.status);
        menuData = await response.json();
        console.log("✅ Menu data fetched successfully");
        console.log("📊 Menu data structure:", menuData);

        // Determine residence from URL (or default)
        currentResidence = getResidenceFromURL();
        console.log("🏠 Current residence set to:", currentResidence);

        // For special residences, set appropriate meal
        if (SPECIAL_RESIDENCES[currentResidence]) {
            currentMeal = SPECIAL_RESIDENCES[currentResidence];
            console.log("🏠 Special residence detected, meal set to:", currentMeal);
            renderMealSelector();
        } else {
            currentMeal = getNextMealTime();
            console.log("🕒 Current meal determined:", currentMeal);
        }

        // update header to reflect residence
        const header = document.querySelector('header h1');
        if (header) header.textContent = `🍽️ ${currentResidence} Dining Menu`;

        // Render residence links
        renderResidenceLinks();

        // Set active meal button
        console.log("🔘 Setting up meal buttons");
        document.querySelectorAll(".meal-btn").forEach(btn => {
            btn.classList.remove("active");
            if (btn.dataset.meal === currentMeal) {
                btn.classList.add("active");
                console.log("✅ Activated button for:", btn.dataset.meal);
            }
        });

        console.log("🎨 Calling renderMenu()");
        renderMenu();
        updateTime();

        // Event listeners for meal buttons
        console.log("🔘 Adding click listeners to meal buttons");
        document.querySelectorAll(".meal-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                console.log("🖱️ Meal button clicked:", e.currentTarget.dataset.meal);
                currentMeal = e.currentTarget.dataset.meal;
                document.querySelectorAll(".meal-btn").forEach(b => b.classList.remove("active"));
                e.currentTarget.classList.add("active");
                renderMenu();
            });
        });
        console.log("✅ initializePage completed successfully");
    } catch (error) {
        console.error('❌ Error loading menu:', error);
        document.getElementById("featuredDishes").innerHTML = "<p class='empty-state'>Error loading menu. Please refresh the page.</p>";
    }
}

// Render the menu based on current meal
function renderMenu() {
    console.log("🎨 renderMenu() called");
    console.log("📋 currentMeal:", currentMeal);
    console.log("🏠 currentResidence:", currentResidence);

    if (!menuData) {
        console.log("❌ menuData is null");
        document.getElementById("featuredDishes").innerHTML = "<p class='empty-state'>Loading menu...</p>";
        document.getElementById("allStations").innerHTML = "";
        return;
    }

    console.log("✅ menuData exists, keys:", Object.keys(menuData));

    // Navigate through the API structure: menuData[residence][meal]
    const residenceData = menuData[currentResidence];

    if (!residenceData) {
        console.log("❌ residenceData not found for:", currentResidence);
        document.getElementById("featuredDishes").innerHTML = "<p class='empty-state'>Residence not found.</p>";
        document.getElementById("allStations").innerHTML = "";
        return;
    }

    console.log("✅ residenceData found, meal options:", Object.keys(residenceData));

    console.log("📋 currentMeal:", currentMeal);
    const mealData = residenceData[currentMeal];
    console.log("📊 mealData:", mealData);

    if (!mealData || Object.keys(mealData).length === 0) {
        console.log("❌ No menu available for meal:", currentMeal);
        document.getElementById("featuredDishes").innerHTML = "<p class='empty-state'>No menu available for this meal.</p>";
        document.getElementById("allStations").innerHTML = "";
        return;
    }

    console.log("✅ mealData has stations:", Object.keys(mealData));

    // Special handling for Robarts: treat all items as featured
    if (currentResidence === 'Robarts Cafeteria') {
        const allItems = getAllItemsForMeal(mealData);
        const itemsWithEmojis = allItems.map(item => ({
            ...item,
            icon: guessEmoji(item.name)
        }));
        console.log("🌟 Robarts: treating all items as featured");
        renderFeaturedDishes(itemsWithEmojis);
        document.getElementById("allStations").innerHTML = "";
        console.log("✅ renderMenu() completed");
        return;
    }

    // Standard flow: grab featured items from specific stations
    // First item from Pan Station, first from Foodie Finds, first 3 from Dinner Entree
    const featured = [];

    if (mealData['Pan Station'] && mealData['Pan Station'].length > 0) {
        featured.push({
            ...mealData['Pan Station'][0],
            icon: guessEmoji(mealData['Pan Station'][0].name)
        });
        console.log("🌟 Added from Pan Station:", mealData['Pan Station'][0].name);
    }

    if (mealData['Foodie Finds'] && mealData['Foodie Finds'].length > 0) {
        featured.push({
            ...mealData['Foodie Finds'][0],
            icon: guessEmoji(mealData['Foodie Finds'][0].name)
        });
        console.log("🌟 Added from Foodie Finds:", mealData['Foodie Finds'][0].name);
    }

    if (mealData['Dinner Entree'] && mealData['Dinner Entree'].length > 0) {
        const count = Math.min(3, mealData['Dinner Entree'].length);
        for (let i = 0; i < count; i++) {
            featured.push({
                ...mealData['Dinner Entree'][i],
                icon: guessEmoji(mealData['Dinner Entree'][i].name)
            });
            console.log(`🌟 Added from Dinner Entree [${i}]:`, mealData['Dinner Entree'][i].name);
        }
    }
    if (mealData['Lunch Entree'] && mealData['Lunch Entree'].length > 0) {
        const count = Math.min(3, mealData['Lunch Entree'].length);
        for (let i = 0; i < count; i++) {
            featured.push({
                ...mealData['Lunch Entree'][i],
                icon: guessEmoji(mealData['Lunch Entree'][i].name)
            });
            console.log(`🌟 Added from Lunch Entree [${i}]:`, mealData['Lunch Entree'][i].name);
        }
    }
    if (mealData['Breakfast Entree'] && mealData['Breakfast Entree'].length > 0) {
        const count = Math.min(3, mealData['Breakfast Entree'].length);
        for (let i = 0; i < count; i++) {
            featured.push({
                ...mealData['Breakfast Entree'][i],
                icon: guessEmoji(mealData['Breakfast Entree'][i].name)
            });
            console.log(`🌟 Added from Breakfast Entree [${i}]:`, mealData['Breakfast Entree'][i].name);
        }
    }

    console.log("🌟 Featured dishes:", featured);
    renderFeaturedDishes(featured);
    renderStations(mealData);
    console.log("✅ renderMenu() completed");
}
// Get all items across all stations
function getAllItemsForMeal(mealData) {
    console.log("🔍 getAllItemsForMeal() called");
    const allItems = [];
    const stations = Object.keys(mealData);
    console.log("📍 Stations found:", stations);

    Object.keys(mealData).forEach(station => {
        console.log(`  📍 Processing station: "${station}", items count:`, mealData[station].length);
        mealData[station].forEach(item => {
            allItems.push(item);
        });
    });

    console.log("✅ getAllItemsForMeal() returning", allItems.length, "items");
    return allItems;
}

// Identify main dishes
function getMainDishes(allItems) {
    console.log("🌟 getMainDishes() called with", allItems.length, "items");
    const mainDishes = [];

    Object.keys(mainDishConfig).forEach(dishName => {
        console.log(`  🔍 Looking for dishes matching: "${dishName}"`);
        allItems.forEach(item => {
            if (item.name.toLowerCase().includes(dishName.toLowerCase())) {
                console.log(`    ✅ Found match: "${item.name}"`);
                mainDishes.push({
                    ...item,
                    icon: mainDishConfig[dishName]
                });
            }
        });
    });

    console.log("✅ getMainDishes() found", mainDishes.length, "main dishes");
    return mainDishes;
}

// Render featured main dishes
function renderFeaturedDishes(mainDishes) {
    console.log("🎨 renderFeaturedDishes() called with", mainDishes.length, "dishes");
    const container = document.getElementById("featuredDishes");

    if (!container) {
        console.log("❌ #featuredDishes container not found!");
        return;
    }

    if (mainDishes.length === 0) {
        console.log("⚠️ No featured dishes to display");
        container.innerHTML = "<p class='empty-state'>No featured dishes available</p>";
        return;
    }

    const html = mainDishes.map(dish => `
        <div class="featured-card" tabindex="0">
            <div class="featured-icon">${dish.icon}</div>
            <h3>${dish.name}</h3>
            ${dish.uom ? `<p>${dish.uom}</p>` : ""}
            ${hasNutritionData(dish) ? `<span class="nutrition-badge">📊 Nutrition Info</span>` : ""}
            ${hasNutritionData(dish) ? `<div class="nutrition-panel">${renderNutrition(dish)}</div>` : ""}
        </div>
    `).join("");

    container.innerHTML = html;
    console.log("✅ renderFeaturedDishes() completed");
}

// Render all station cards
function renderStations(mealData) {
    console.log("🎨 renderStations() called");
    const container = document.getElementById("allStations");

    if (!container) {
        console.log("❌ #allStations container not found!");
        return;
    }

    // Define station order
    const stationOrder = [
        'Pan Station',
        'Foodie Finds',
        'Dinner Entree',
        'Lunch Entree',
        'Breakfast Entree',
        'Soup',
        'Pizza and Bake Station',
        'Grill',
        'Deli Bar',
        'Salad Bar',
        'Dessert'
    ];

    // Sort stations by specified order, then add any remaining stations
    const sortedStations = stationOrder.filter(s => mealData[s]);
    const remainingStations = Object.keys(mealData).filter(s => !stationOrder.includes(s));
    const allStations = [...sortedStations, ...remainingStations];

    let html = "";

    allStations.forEach(stationName => {
        const items = mealData[stationName];
        console.log(`  📍 Rendering station: "${stationName}" with ${items.length} items`);

        const itemsHtml = items.map((item, idx) => `
            <div class="item ${idx >= 4 ? 'hidden-item' : ''}" tabindex="0">
                <div class="item-name">${item.name}</div>
                ${item.uom ? `<div class="item-uom">${item.uom}</div>` : ""}
                ${hasNutritionData(item) ? `<span class="nutrition-badge">📊 ${item.nutrition[0]} cal</span>` : ""}
                ${hasNutritionData(item) ? `<div class="nutrition-panel">${renderNutrition(item)}</div>` : ""}
            </div>
        `).join("");

        const showMoreBtn = items.length > 4 ? `<button class="expand-btn" data-station="${stationName}">Show more (${items.length - 4})</button>` : '';

        html += `
            <div class="station-card" data-station="${stationName}">
                <div class="station-header">${stationName}</div>
                <div class="station-items">
                    ${itemsHtml}
                </div>
                ${showMoreBtn}
            </div>
        `;
    });

    container.innerHTML = html;

    // Attach expand/collapse handlers to buttons
    document.querySelectorAll('.expand-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const stationCard = e.target.closest('.station-card');
            const isExpanded = stationCard.classList.toggle('expanded');
            const itemCount = stationCard.querySelectorAll('.item').length;
            const hiddenCount = itemCount - 4;
            e.target.textContent = isExpanded ? `Show less` : `Show more (${hiddenCount})`;
            console.log(`📂 Toggled station: "${e.target.dataset.station}", expanded: ${isExpanded}`);
        });
    });

    // Attach expand/collapse handlers to station headers
    document.querySelectorAll('.station-header').forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', (e) => {
            const stationCard = e.target.closest('.station-card');
            const isExpanded = stationCard.classList.toggle('expanded');
            const btn = stationCard.querySelector('.expand-btn');
            if (btn) {
                const itemCount = stationCard.querySelectorAll('.item').length;
                const hiddenCount = itemCount - 4;
                btn.textContent = isExpanded ? `Show less` : `Show more (${hiddenCount})`;
            }
            console.log(`📂 Header clicked: "${stationCard.dataset.station}", expanded: ${isExpanded}`);
        });

        console.log("✅ renderStations() completed");
    })
}

// Check if item has valid nutrition data
function hasNutritionData(item) {
    return item.nutrition && item.nutrition[0] && item.nutrition[0] !== "";
}

// Render nutrition HTML for an item
function renderNutrition(item) {
    if (!item || !item.nutrition) return "";
    const labels = [
        'Calories',
        'Fat (g)',
        'Saturated Fat (g)',
        'Cholesterol (mg)',
        'Sodium (mg)',
        'Carbohydrate (g)',
        'Total Fibre (g)',
        'Sugars (g)',
        'Protein (g)',
        'Vitamin C (mg)',
        'Calcium (mg)',
        'Iron (mg)'
    ];

    const vals = item.nutrition.map(v => (v !== null && v !== undefined && v !== '') ? v : '—');
    const rows = labels.map((label, i) => {
        const value = vals[i] || '—';
        return `<div style="display:flex;justify-content:space-between;padding:2px 0"><span>${label}</span><strong>${value}</strong></div>`;
    }).join('');

    return `<div class="nutrition-grid">${rows}</div>`;
}

// Delegated click handler to toggle nutrition panels
document.addEventListener('click', (e) => {
    const card = e.target.closest('.item, .featured-card');
    if (!card) return;
    // If click originated inside a nutrition-panel, ignore
    if (e.target.closest('.nutrition-panel')) return;
    card.classList.toggle('open');
    console.log('🔁 Toggled nutrition panel for:', card.querySelector('.item-name') ? card.querySelector('.item-name').textContent : card.querySelector('h3')?.textContent);
});

// Keyboard support: toggle on Enter/Space when focused
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const focused = document.activeElement;
    if (!focused) return;
    if (focused.classList.contains('item') || focused.classList.contains('featured-card')) {
        focused.classList.toggle('open');
        e.preventDefault();
    }
});

// Update last updated time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    document.getElementById("updateTime").textContent = timeString;
}

// Update time every minute
setInterval(updateTime, 60000);
