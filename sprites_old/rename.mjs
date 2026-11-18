import fs from 'fs';
import path from 'path';

const folderPath = './'; // Change to your folder path if needed

fs.readdirSync(folderPath).forEach((file) => {
  const match = file.match(/^(\d+)\.(png)$/i);
  if (match) {
    const num = match[1];
    const ext = match[2];
    const paddedNum = num.padStart(3, '0');
    const newName = `${paddedNum}.${ext}`;

    if (file !== newName) {
      fs.renameSync(path.join(folderPath, file), path.join(folderPath, newName));
      console.log(`Renamed: ${file} -> ${newName}`);
    }
  }
});