const fs = require('fs');

// Configuration
const INPUT_FILE = './pokemon.json';         // Path to your existing JSON file
const OUTPUT_FILE = './pokemon_updated.json'; // Path where the new file will be saved
const LANGUAGE_ID = '9';                     // '9' is English in PokéAPI
const PREFERRED_VERSION_ID = '23';           // Optional: '23' is Pokémon X, '17' is Black, etc. Leave null for any.

// Raw CSV URL from the official PokeAPI GitHub repository
const CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_flavor_text.csv';

async function updatePokemonDescriptions() {
  try {
    console.log('1. Reading existing JSON file...');
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const pokemonList = JSON.parse(rawData);

    console.log('2. Fetching flavor text CSV from PokeAPI GitHub...');
    const response = await fetch(CSV_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();

    console.log('3. Parsing descriptions...');
    const descriptionsMap = parseFlavorTextCSV(csvText);

    console.log('4. Updating JSON objects...');
    let updatedCount = 0;

    const updatedList = pokemonList.map((pokemon) => {
      // Convert string ID like "060" to integer 60 to match CSV species_id
      const numericId = parseInt(pokemon.id, 10);
      const description = descriptionsMap.get(numericId);

      if (description) {
        updatedCount++;
        return {
          ...pokemon,
          description: description,
        };
      }
      return pokemon;
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedList, null, 2), 'utf8');
    console.log(`Done! Successfully updated ${updatedCount} of ${pokemonList.length} Pokémon.`);
    console.log(`Saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error updating descriptions:', error);
  }
}

/**
 * Parses the PokeAPI CSV format: species_id,version_id,language_id,"flavor_text"
 */
function parseFlavorTextCSV(csvText) {
  const map = new Map();
  
  // Match rows handling quoted multiline strings properly
  // Format: 60,1,9,"Its newly grown legs prevent it from running..."
  const rowRegex = /^(\d+),(\d+),(\d+),"((?:[^"]|"")*)"/gm;
  let match;

  while ((match = rowRegex.exec(csvText)) !== null) {
    const speciesId = parseInt(match[1], 10);
    const versionId = match[2];
    const languageId = match[3];
    let rawText = match[4];

    // Only process up to Gen 5 (649) and match the target language
    if (speciesId > 649 || languageId !== LANGUAGE_ID) continue;

    // Clean up PokeAPI's formatting artifacts (\f form feeds, \n newlines, double quotes)
    const cleanText = rawText
      .replace(/""/g, '"')
      .replace(/[\n\r\f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Logic to pick the preferred game version, or fallback to the first English one found
    if (PREFERRED_VERSION_ID && versionId === PREFERRED_VERSION_ID) {
      map.set(speciesId, cleanText);
    } else if (!map.has(speciesId)) {
      map.set(speciesId, cleanText);
    }
  }

  return map;
}

updatePokemonDescriptions();