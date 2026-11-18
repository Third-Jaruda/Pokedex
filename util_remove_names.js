const fs = require('fs');
const path = require('path');

// CONFIGURATION: Change this to the path of your sprites folder
const targetDir = './sprites'; 

// Set to true to actually rename files. Set to false first to run a "Dry Run" and preview changes.
const EXECUTE_RENAME = true; 

function removePokemonNames() {
    if (!fs.existsSync(targetDir)) {
        console.error(`Error: Directory "${targetDir}" does not exist.`);
        return;
    }

    const files = fs.readdirSync(targetDir);
    let renamedCount = 0;

    console.log(EXECUTE_RENAME ? "--- RUNNING RENAME MODE ---" : "--- DRY RUN MODE (No files will be renamed yet) ---");

    files.forEach(file => {
        // Matches 3 or 4 digits at the start of the filename, followed by spaces, dashes, or names, then the extension
        // e.g., matches "0025 Pikachu.png", "025-Pikachu.png", "0025_Pikachu_Shiny.png"
        const match = file.match(/^(\d{3,4})[_\-\s]?.+?(\.[a-zA-Z0-9]+)$/);
        
        if (match) {
            const digits = match[1];     // e.g., "0025" or "025"
            const extension = match[2];  // e.g., ".png"
            
            const newFilename = digits + extension;
            
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(targetDir, newFilename);

            // Avoid attempting to rename if the file is already just the number
            if (file === newFilename) return;

            console.log(`✏️ Renaming: "${file}" ➔ "${newFilename}"`);
            renamedCount++;

            if (EXECUTE_RENAME) {
                fs.renameSync(oldPath, newPath);
            }
        }
    });

    console.log(`\n---------------------------------------`);
    console.log(`Summary: ${EXECUTE_RENAME ? 'Renamed' : 'Would rename'} ${renamedCount} files.`);
    if (!EXECUTE_RENAME) {
        console.log(`Tip: If this looks correct, change 'EXECUTE_RENAME = true;' at the top of the script and run it again.`);
    }
}

removePokemonNames();