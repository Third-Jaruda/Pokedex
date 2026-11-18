const searchInput = document.getElementById('search-input');
const tableBody = document.getElementById('table-body');
const infoPanel = document.getElementById('info-panel');
const checkboxes = document.querySelectorAll('input[name="search-field"]');
const headers = document.querySelectorAll('th[data-sort]');

let allPokemon = [];
let currentSortColumn = 'id';
let sortDirection = 1; // 1 for ascending, -1 for descending

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

// 2. Filter & Render Table / Info Panel
function updateDisplay() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const activeFields = Array.from(checkboxes)
        .filter(chk => chk.checked)
        .map(chk => chk.value);

    // Filter logic based on checked attributes
    const filtered = allPokemon.filter(pokemon => {
        if (!searchTerm) return true;

        let match = false;
        if (activeFields.includes('number') && String(pokemon.id).includes(searchTerm)) match = true;
        if (activeFields.includes('name') && pokemon.name.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('type') && pokemon.type.toLowerCase().includes(searchTerm)) match = true;
        if (activeFields.includes('description') && pokemon.description && pokemon.description.toLowerCase().includes(searchTerm)) match = true;

        return match;
    });

    // Sort data
    filtered.sort((a, b) => {
        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

        // Custom clean-up for height and weight strings containing units (e.g. "0.7 m" or "6.9 kg")
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
    tableBody.innerHTML = '';

    pokemonList.forEach(pokemon => {
        const row = document.createElement('tr');
        const formattedId = String(pokemon.id).padStart(3, '0');

        row.innerHTML = `
            <td>#${formattedId}</td>
            <td><img src="${pokemon.sprite}" alt="${pokemon.name}" class="table-sprite"></td>
            <td style="text-transform: capitalize;">${pokemon.name}</td>
            <td>${formatTypes(pokemon.type)}</td>
            <td>${pokemon.height}</td>
            <td>${pokemon.weight}</td>
        `;

        // Clicking a row displays it in the left info panel directly
        row.addEventListener('click', () => {
            showSinglePokemon(pokemon);
        });

        tableBody.appendChild(row);
    });
}

// 4. Handle Left Info Panel Rules
function renderInfoPanel(filteredList) {
    // Info panel ONLY appears when there is EXACTLY ONE match
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

    // Build Evolution Chain HTML markup dynamically
    let evolutionHTML = '';
    if (pokemon.evolutionChain && pokemon.evolutionChain.length > 1) {
        const evoCards = pokemon.evolutionChain.map(evoId => {
            // Find the related pokemon object from our loaded dataset
            const evoPokemon = allPokemon.find(p => p.id === evoId);
            if (!evoPokemon) return '';
            
            const evoFormattedId = String(evoPokemon.id).padStart(3, '0');
            return `
                <div class="evo-card" onclick="selectPokemonById('${evoPokemon.id}')">
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
        <div class="pokemon-details" style="width: 100%;">
            <span>#${formattedId}</span>
            <img src="${pokemon.sprite}" alt="${pokemon.name}">
            <h2>${pokemon.name}</h2>
            <p><strong>Type:</strong> ${formatTypes(pokemon.type)}</p>
            <p><strong>Height:</strong> ${pokemon.height} | <strong>Weight:</strong> ${pokemon.weight}</p>
            <p style="margin-top: 15px;  font-size: 0.9rem;"><em>${pokemon.description || 'No description available.'}</em></p>
            ${evolutionHTML}
        </div>
    `;
}

// Helper function so the evolution card clicks trigger seamlessly
function selectPokemonById(inputID) {
    // 1. Convert input to a number to strip any existing leading zeros, then pad it back to 3 digits (e.g., 1 or "1" or "001" all become "001")
    const formattedId = String(Number(inputID)).padStart(3, '0');
    
    // 2. Find the pokemon matching the standardized ID string
    const targetPokemon = allPokemon.find(p => p.id === formattedId);
    
    if (targetPokemon) {
        showSinglePokemon(targetPokemon);
        console.log("Found:", targetPokemon.name);
    } else {
        console.warn(`Could not find Pokémon with ID: ${inputID} (searched as ${formattedId})`);
    }
}

// 5. Event Listeners for Searching & Sorting
searchInput.addEventListener('input', updateDisplay);
checkboxes.forEach(chk => chk.addEventListener('change', updateDisplay));

headers.forEach(header => {
    header.addEventListener('click', () => {
        const column = header.getAttribute('data-sort');
        if (currentSortColumn === column) {
            sortDirection *= -1; // Toggle direction
        } else {
            currentSortColumn = column;
            sortDirection = 1;
        }
        updateDisplay();
    });
});

// Initialize
loadLocalPokedex();

// 1. Add type color mapping dictionary at the top of app.js
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

// 2. Helper function to generate HTML badges for types
function formatTypes(typeString) {
    // Splits types if they are comma-separated (e.g. "grass, poison")
    const types = typeString.split(',').map(t => t.trim());
    
    return types.map(t => {
        const color = typeColors[t] || '#777777'; // Fallback gray if type is unknown
        return `<span class="type-badge" style="background-color: ${color};">${t}</span>`;
    }).join(' ');
}

// Add this inside app.js
const darkModeToggle = document.getElementById('dark-mode-toggle');
document.body.classList.add('dark-theme');

darkModeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
});

// THis is a test Change