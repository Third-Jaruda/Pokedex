const fs = require('fs');
const path = require('path');

// CONFIGURATION: Change this to the path of your sprites folder
const targetDir = './sprites'; 

// Set to true to actually delete files. Set to false first to run a "Dry Run" and preview what will be deleted.
const EXECUTE_DELETION = true; 

function cleanSprites() {
    if (!fs.existsSync(targetDir)) {
        console.error(`Error: Directory "${targetDir}" does not exist.`);
        return;
    }

    const files = fs.readdirSync(targetDir);
    
    // Group files by their 4-digit ID prefix (e.g., "0025")
    const pkmGroups = {};

    files.forEach(file => {
        // Matches standard naming like "0025 Pikachu.png" or "0025-pikachu-libre.png"
        const match = file.match(/^(\d{4})[_\-\s]?(.+)?\.[a-zA-Z0-9]+$/);
        if (!match) return;

        const id = match[1]; // e.g., "0025"
        
        if (!pkmGroups[id]) {
            pkmGroups[id] = [];
        }
        pkmGroups[id].push({ filename: file, fullPath: path.join(targetDir, file) });
    });

    let deletedCount = 0;
    let keptCount = 0;

    console.log(EXECUTE_DELETION ? "--- RUNNING DELETION MODE ---" : "--- DRY RUN MODE (No files will be deleted yet) ---");

    for (const [id, entries] of Object.entries(pkmGroups)) {
        // Find the vanilla file: ideally matches strictly by ID and basic extension, 
        // or contains just the ID / common base name without extra words.
        let vanillaEntry = entries.find(e => {
            const cleanName = e.filename.replace(/^(\d{4})[_\-\s]?/, '').toLowerCase();
            // Check if it's just the ID and an extension (e.g., "0025.png") 
            // or a clean name with no extra variant descriptors
            return cleanName.match(/^[a-z0-9]+\.(png|jpg|jpeg|gif)$/i) && !hasVariantKeywords(cleanName);
        });

        // Fallback: If no strict vanilla file is found, pick the shortest filename in the group
        if (!vanillaEntry) {
            entries.sort((a, b) => a.filename.length - b.filename.length);
            vanillaEntry = entries[0];
        }

        console.log(`\n[ID: ${id}] Keeping vanilla: "${vanillaEntry.filename}"`);
        keptCount++;

        // Mark all other files in this group for deletion
        entries.forEach(entry => {
            if (entry.filename !== vanillaEntry.filename) {
                console.log(`  ❌ Removing alternate: "${entry.filename}"`);
                deletedCount++;

                if (EXECUTE_DELETION) {
                    fs.unlinkSync(entry.fullPath);
                }
            }
        });
    }

    console.log(`\n---------------------------------------`);
    console.log(`Summary: Kept ${keptCount} vanilla files.`);
    console.log(`${EXECUTE_DELETION ? 'Deleted' : 'Would delete'} ${deletedCount} alternate/extra sprite files.`);
    if (!EXECUTE_DELETION) {
        console.log(`Tip: If this looks correct, change 'EXECUTE_DELETION = true;' at the top of the script and run it again.`);
    }
}

// Helper to flag obvious variant keywords just in case
function hasVariantKeywords(name) {
    const variants = ['libre', 'phd', 'mega', 'gmax', 'alola', 'galar', 'hisui', 'paldea', 'shiny', 'f', 'cosplay'];
    return variants.some(v => name.toLowerCase().includes(v));
}

cleanSprites();