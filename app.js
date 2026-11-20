/**
 * Pokédex Application Logic
 *
 * Handles data fetching, client-side searching, sorting, UI rendering,
 * preference persistence (localStorage), PWA installation, and Service Worker registration.
 */

// =============================================================================
// 1. DOM ELEMENT REFERENCES
// =============================================================================
const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('table-body');
const infoPanel = document.getElementById('info-panel');
const checkboxes = document.querySelectorAll('input[name="search-field"]');
const headers = document.querySelectorAll('th[data-sort]');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const installBtn = document.getElementById('install-btn');

// =============================================================================
// 2. USER PREFERENCES (LOCALSTORAGE INITIALIZATION)
// =============================================================================
// Restore theme preference (defaults to dark mode if no preference has been saved yet)
const savedDarkMode = localStorage.getItem('pokedex-dark-mode');
const isDarkMode = savedDarkMode !== null ? savedDarkMode === 'true' : true;
document.body.classList.toggle('dark-theme', isDarkMode);
darkModeToggle.checked = isDarkMode;

// Restore saved search filter checkbox preferences
const savedSearchFields = localStorage.getItem('pokedex-search-fields');
if (savedSearchFields) {
    try {
        const activeList = JSON.parse(savedSearchFields);
        checkboxes.forEach(chk => {
            chk.checked = activeList.includes(chk.value);
        });
    } catch (e) {
        console.warn('Could not parse saved search fields:', e);
    }
}

// =============================================================================
// 3. APPLICATION STATE & CONSTANTS
// =============================================================================
let allPokemon = [];
let currentSortColumn = 'id';
let sortDirection = 1; // 1 for ascending, -1 for descending
let deferredPrompt;    // Stashes the beforeinstallprompt event for PWA installation

/**
 * Elemental type color mapping for styling badge tags
 */
const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    steel: '#B8B8D0',
    fairy: '#EE99AC'
};

/**
 * Converts a comma-separated type string (e.g. "grass, poison") into HTML badges
 * @param {string} typeString - Comma-separated type names
 * @returns {string} HTML markup string containing colored type badges
 */
function formatTypes(typeString) {
    return typeString.split(',').map(t => {
        const type = t.trim().toLowerCase();
        const color = typeColors[type] || '#777777';
        return `<span class="type-badge" style="background-color: ${color};">${type}</span>`;
    }).join(' ');
}

// =============================================================================
// 4. DATA FETCHING & FILTER/SORT LOGIC
// =============================================================================

/**
 * Loads the Pokémon dataset from the local JSON file and initiates initial render
 */
async function loadLocalPokedex() {
    try {
        const response = await fetch('pokemon.json');
        allPokemon = await response.json();
        updateDisplay();
    } catch (error) {
        console.error('Error loading local JSON data:', error);
    }
}

/**
 * Filters and sorts the Pokémon dataset based on search term, active checkboxes, and sort headers
 */
function updateDisplay() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const activeFields = Array.from(checkboxes)
        .filter(chk => chk.checked)
        .map(chk => chk.value);

    // Filter by selected criteria
    const filtered = allPokemon.filter(pokemon => {
        if (!searchTerm) return true;

        let match = false;
        if (activeFields.includes('number') && String(pokemon.id).includes(searchTerm)) match = true;
        if (activeFields.includes('name') && pokemon.name.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('type') && pokemon.type.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('description') && pokemon.description && pokemon.description.toLowerCase().includes(searchTerm)) match = true;

        return match;
    });

    // Sort according to current column and direction
    filtered.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

        // Strip units for numeric comparisons (e.g., "0.7 m" -> 0.7, "6.9 kg" -> 6.9)
        if (currentSortColumn === 'height' || currentSortColumn === 'weight') {
            valA = parseFloat(valA);
            valB = parseFloat(valB);
        }

        if (typeof valA === 'string') {
            return valA.localeCompare(valB) * sortDirection;
        }
        return (valA - valB) * sortDirection;
    });

    renderTable(filtered);
    renderInfoPanel(filtered);
}

// =============================================================================
// 5. VIEW RENDERING (TABLE & INFO PANEL)
// =============================================================================

/**
 * Renders filtered Pokémon rows into the table body using batch innerHTML injection
 * @param {Array<Object>} pokemonList - Array of Pokémon objects to display
 */
function renderTable(pokemonList) {
    tableBody.innerHTML = pokemonList.map(pokemon => {
        const formattedId = String(pokemon.id).padStart(3, '0');
        return `
            <tr data-id="${pokemon.id}">
                <td>#${formattedId}</td>
                <td><img src="${pokemon.sprite}" alt="${pokemon.name}" class="table-sprite"></td>
                <td class="pokemon-name">${pokemon.name}</td>
                <td>${formatTypes(pokemon.type)}</td>
                <td>${pokemon.height}</td>
                <td>${pokemon.weight}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Handles the left details panel visibility: displays single card or placeholder counter
 * @param {Array<Object>} filteredList - Current list of filtered Pokémon
 */
function renderInfoPanel(filteredList) {
    if (filteredList.length === 1) {
        showSinglePokemon(filteredList[0]);
    } else {
        infoPanel.innerHTML = `<h1>${filteredList.length}</h1><h2>Pokémon found.</h2><h3>Refine search to view details.</h3>`;
        infoPanel.classList.add('hidden');
    }
}

/**
 * Renders complete details and evolution chain for a single selected Pokémon
 * @param {Object} pokemon - Target Pokémon object to display
 */
function showSinglePokemon(pokemon) {
    infoPanel.classList.remove('hidden');
    const formattedId = String(pokemon.id).padStart(3, '0');

    // Build the evolution chain markup if the Pokémon belongs to an evolution family
    let evolutionHTML = '';
    if (pokemon.evolutionChain && pokemon.evolutionChain.length > 1) {
        const evoCards = pokemon.evolutionChain.map(evoId => {
            const evoPokemon = allPokemon.find(p => p.id === evoId);
            if (!evoPokemon) return '';

            const evoFormattedId = String(evoPokemon.id).padStart(3, '0');
            return `
                <div class="evo-card" data-id="${evoPokemon.id}">
                    <img src="${evoPokemon.sprite}" alt="${evoPokemon.name}">
                    <span>#${evoFormattedId}</span>
                    <p>${evoPokemon.name}</p>
                </div>
            `;
        }).join('');

        evolutionHTML = `
            <div class="evolution-section">
                <h4>Evolution Chain</h4>
                <div class="evolution-chain">
                    ${evoCards}
                </div>
            </div>
        `;
    }

    infoPanel.innerHTML = `
        <div class="pokemon-details">
            <span>#${formattedId}</span>
            <img src="${pokemon.sprite}" alt="${pokemon.name}">
            <h2>${pokemon.name}</h2>
            <p><strong>Type:</strong> ${formatTypes(pokemon.type)}</p>
            <p><strong>Height:</strong> ${pokemon.height} | <strong>Weight:</strong> ${pokemon.weight}</p>
            <p class="pokemon-description"><em>${pokemon.description || 'No description available.'}</em></p>
            ${evolutionHTML}
        </div>
    `;
}

// =============================================================================
// 6. EVENT LISTENERS & USER INTERACTIONS
// =============================================================================

// Search input listener
searchInput.addEventListener('input', updateDisplay);

// Search filter checkbox listeners (persists active fields to localStorage)
checkboxes.forEach(chk => {
    chk.addEventListener('change', () => {
        const activeList = Array.from(checkboxes)
            .filter(c => c.checked)
            .map(c => c.value);
        localStorage.setItem('pokedex-search-fields', JSON.stringify(activeList));
        updateDisplay();
    });
});

// Table column header sorting listener
headers.forEach(header => {
    header.addEventListener('click', () => {
        const column = header.getAttribute('data-sort');
        if (currentSortColumn === column) {
            sortDirection *= -1; // Toggle sort ascending/descending
        } else {
            currentSortColumn = column;
            sortDirection = 1;
        }
        updateDisplay();
    });
});

// Event delegation for table row clicks (selects clicked Pokémon)
tableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const pokemon = allPokemon.find(p => p.id === row.dataset.id);
    if (pokemon) showSinglePokemon(pokemon);
});

// Event delegation for evolution chain card clicks
infoPanel.addEventListener('click', (e) => {
    const evoCard = e.target.closest('.evo-card');
    if (!evoCard) return;
    const pokemon = allPokemon.find(p => p.id === evoCard.dataset.id);
    if (pokemon) showSinglePokemon(pokemon);
});

// Dark Mode toggle listener (persists choice to localStorage)
darkModeToggle.addEventListener('change', (e) => {
    const isDark = e.target.checked;
    document.body.classList.toggle('dark-theme', isDark);
    localStorage.setItem('pokedex-dark-mode', isDark);
});

// =============================================================================
// 7. PWA SERVICE WORKER & INSTALLATION
// =============================================================================

// Register the Service Worker for offline capability
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => precacheAllImages())
            .catch((err) => console.error('Service Worker registration failed:', err));
    });
}

// Intercept browser install prompt and reveal custom "Install App" button
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
});

// Trigger browser install dialog when user clicks the install button
installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
});

// Hide install button when app installation is confirmed
window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
});

/**
 * Background non-blocking pre-cache for Pokémon sprite images
 */
async function precacheAllImages() {
    // Delay execution so it does not compete with initial page load bandwidth
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
        const cache = await caches.open('pokedex-offline-v5');
        for (const pokemon of allPokemon) {
            if (pokemon.sprite) {
                const cached = await cache.match(pokemon.sprite);
                if (!cached) {
                    fetch(pokemon.sprite).catch(() => {});
                }
            }
        }
    } catch (err) {
        console.error('Error pre-caching images:', err);
    }
}

// =============================================================================
// 8. INITIALIZATION
// =============================================================================
loadLocalPokedex();
