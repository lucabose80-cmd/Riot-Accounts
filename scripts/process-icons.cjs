const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const pngToIco = require('png-to-ico').default || require('png-to-ico');

const srcImage = "C:\\Users\\Luca\\.gemini\\antigravity\\brain\\78c4edac-c8f9-4b30-97fa-2096f628f615\\riot_style_icon_1782065093841.png";
const destDir = path.join(process.cwd(), 'public');

function writeImage(img, destPath) {
  return new Promise((resolve, reject) => {
    img.write(destPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function processIcons() {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  
  // 1. Generate PWA icons
  const image = await Jimp.read(srcImage);
  
  await writeImage(image.clone().resize({ w: 192, h: 192 }), path.join(destDir, 'pwa-192x192.png'));
  await writeImage(image.clone().resize({ w: 512, h: 512 }), path.join(destDir, 'pwa-512x512.png'));
  await writeImage(image.clone(), path.join(destDir, 'icon.png')); // ensure it's a clean PNG
  
  // 2. Generate icon.ico for Electron/Windows and favicon
  const tempPng = path.join(destDir, 'pwa-512x512.png');
  const icoBuf = await pngToIco(tempPng);
  fs.writeFileSync(path.join(destDir, 'icon.ico'), icoBuf);
  fs.writeFileSync(path.join(destDir, 'favicon.ico'), icoBuf);
  
  console.log("Icons processed successfully!");
}

processIcons().catch(console.error);
