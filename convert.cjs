const sharp = require('sharp');
const fs = require('fs');
if (!fs.existsSync('build')) fs.mkdirSync('build');
sharp('icon.svg')
  .resize(512, 512)
  .png()
  .toFile('build/icon.png')
  .then(() => {
    fs.copyFileSync('build/icon.png', 'public/icon.png');
    console.log('Done!');
  });
