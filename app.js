const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('table-body');
const infoPanel = document.getElementById('info-panel');
const checkboxes = document.querySelectorAll('input[name="search-field"]');
const headers = document.querySelectorAll('th[data-sort]');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const installBtn = document.getElementById('install-btn');

let allPokemon = [];
let currentSortColumn = 'id';
let sortDirection = 1; // 1 for ascending, -1 for descending
let deferredPrompt;

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

function formatTypes(typeString) {
    return typeString.split(',').map(t => {
        const type = t.trim();
        const color = typeColors[type] || '#777777';
        return `<span class="type-badge" style="background-color: ${color};">${type}</span>`;
    }).join(' ');
}

// 1. Fetch Local Data
async function loadLocalPokedex() {
    try {
        const response = await fetch('pokemon.json');
        allPokemon = await response.json();
        updateDisplay();
    } catch (error) {
        console.error('Error loading local JSON data:', error);
    }
}

// 2. Filter & Sort Table / Info Panel
function updateDisplay() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const activeFields = Array.from(checkboxes)
        .filter(chk => chk.checked)
        .map(chk => chk.value);

    const filtered = allPokemon.filter(pokemon => {
        if (!searchTerm) return true;

        let match = false;
        if (activeFields.includes('number') && String(pokemon.id).includes(searchTerm)) match = true;
        if (activeFields.includes('name') && pokemon.name.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('type') && pokemon.type.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('description') && pokemon.description && pokemon.description.toLowerCase().includes(searchTerm)) match = true;

        return match;
    });

    filtered.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

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

// 3. Render Table Rows
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

// 4. Handle Info Panel
function renderInfoPanel(filteredList) {
    if (filteredList.length === 1) {
        showSinglePokemon(filteredList[0]);
    } else {
        infoPanel.innerHTML = `<h1>${filteredList.length}</h1><h2>Pokémon found.</h2><h3>Refine search to view details.</h3>`;
        infoPanel.classList.add('hidden');
    }
}

function showSinglePokemon(pokemon) {
    infoPanel.classList.remove('hidden');
    const formattedId = String(pokemon.id).padStart(3, '0');

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

// 5. Event Listeners
searchInput.addEventListener('input', updateDisplay);
checkboxes.forEach(chk => chk.addEventListener('change', updateDisplay));

headers.forEach(header => {
    header.addEventListener('click', () => {
        const column = header.getAttribute('data-sort');
        if (currentSortColumn === column) {
            sortDirection *= -1;
        } else {
            currentSortColumn = column;
            sortDirection = 1;
        }
        updateDisplay();
    });
});

// Event delegation for table rows
tableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    const pokemon = allPokemon.find(p => p.id === row.dataset.id);
    if (pokemon) showSinglePokemon(pokemon);
});

// Event delegation for evolution cards
infoPanel.addEventListener('click', (e) => {
    const evoCard = e.target.closest('.evo-card');
    if (!evoCard) return;
    const pokemon = allPokemon.find(p => p.id === evoCard.dataset.id);
    if (pokemon) showSinglePokemon(pokemon);
});

// Dark Mode Toggle
document.body.classList.add('dark-theme');
darkModeToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-theme', e.target.checked);
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => precacheAllImages())
            .catch((err) => console.error('Service Worker registration failed:', err));
    });
}

// PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
});

installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
});

// Background Pre-cache for Pokémon Sprites
async function precacheAllImages() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
        const cache = await caches.open('pokedex-offline-v1');
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

// Initialize
loadLocalPokedex();
