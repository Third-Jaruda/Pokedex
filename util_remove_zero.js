const fs = require('fs');
const path = require('path');

// CONFIGURATION: Change this to the path of your sprites folder
const targetDir = './sprites'; 

// Set to true to actually rename files. Set to false first to run a "Dry Run" and preview changes.
const EXECUTE_RENAME = true; 

function removeLeadingZero() {
    if (!fs.existsSync(targetDir)) {
        console.error(`Error: Directory "${targetDir}" does not exist.`);
        return;
    }

    const files = fs.readdirSync(targetDir);
    let renamedCount = 0;

    console.log(EXECUTE_RENAME ? "--- RUNNING RENAME MODE ---" : "--- DRY RUN MODE (No files will be renamed yet) ---");

    files.forEach(file => {
        // Matches exactly 4 digits starting with 0 at the very beginning of the filename 
        // e.g., "0025.png" or "0025-pikachu.png"
        const match = file.match(/^(0)(\d{3})(.*)$/);
        
        if (match) {
            // Reconstructs the filename keeping only 3 digits (dropping the first zero)
            // match[2] is the remaining 3 digits, match[3] is the rest of the filename (extension, spacing, text)
            const newFilename = match[2] + match[3];
            
            const oldPath = path.join(targetDir, file);
            const newPath = path.join(targetDir, newFilename);

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

removeLeadingZero();