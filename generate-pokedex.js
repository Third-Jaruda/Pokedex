const fs = require('fs');

async function generatePokedexData() {
    console.log("Fetching Pokémon list (1 to 649 for Gens 1-5)...");
    
    // Fetch the list of the first 386 Pokémon (up to the end of Gen 3)
    const listRes = await fetch('https://pokeapi.co/api/v2/pokemon?limit=649&offset=0');
    const listData = await listRes.json();

    const pokedex = [];

    // Loop through each to fetch detailed info, species data (for description), and evolution chain IDs
    for (let i = 0; i < listData.results.length; i++) {
        const pokeEntry = listData.results[i];
        const id = (i + 1).toString().padStart(3, '0');
        
        try {
            console.log(`Processing #${id}: ${pokeEntry.name}...`);

            // 1. Fetch main pokemon data (types, height, weight, sprite)
            const pokeRes = await fetch(pokeEntry.url);
            const pokeData = await pokeRes.json();

            const types = pokeData.types.map(t => t.type.name).join(', ');
            // Convert decimeters to meters and hectograms to kilograms for cleaner display
            const height = `${(pokeData.height / 10).toFixed(1)} m`;
            const weight = `${(pokeData.weight / 10).toFixed(1)} kg`;
            const sprite = `sprites/${id}.png`;

            // 2. Fetch species data (for description and evolution chain URL)
            const speciesRes = await fetch(pokeData.species.url);
            const speciesData = await speciesRes.json();

            // Find first available English flavor text description
            const flavorEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'english');
            let description = flavorEntry ? flavorEntry.flavor_text.replace(/[\n\f]/g, ' ') : "No description available.";

            // 3. Fetch evolution chain data
            const evoChainRes = await fetch(speciesData.evolution_chain.url);
            const evoChainData = await evoChainRes.json();

            // Recursive helper function to extract all pokemon IDs from the evolution tree branch
            const evolutionChain = [];
            function extractChain(node) {
                if (!node) return;
                // Extract ID from species URL (e.g., "https://pokeapi.co/api/v2/pokemon-species/1/")
                const urlParts = node.species.url.split('/').filter(Boolean);
                const speciesId = parseInt(urlParts[urlParts.length - 1], 10);
                
                // Only include if it's within Gen 1-5 bounds (<= 649)
                if (speciesId <= 649) {
                    evolutionChain.push(speciesId);
                }

                if (node.evolves_to && node.evolves_to.length > 0) {
                    node.evolves_to.forEach(nextEval => extractChain(nextEval));
                }
            }
            extractChain(evoChainData.chain);

            // Push formatted object into our array
            pokedex.push({
                id,
                name: pokeData.name,
                type: types,
                height,
                weight,
                description,
                sprite,
                evolutionChain: [...new Set(evolutionChain)] // Remove duplicate entries if any branch overlaps
            });

        } catch (err) {
            console.error(`Error fetching data for ID ${id}:`, err);
        }
    }

    // Write the resulting array out to pokemon.json
    fs.writeFileSync('pokemon.json', JSON.stringify(pokedex, null, 2));
    console.log("Success! 'pokemon.json' has been generated with Gen 1-5 data.");
}

generatePokedexData();