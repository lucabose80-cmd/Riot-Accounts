import fs from 'fs';
import path from 'path';
import Jimp from 'jimp';
import pngToIco from 'png-to-ico';

const srcImage = "C:\\Users\\Luca\\.gemini\\antigravity\\brain\\78c4edac-c8f9-4b30-97fa-2096f628f615\\riot_style_icon_1782065093841.png";
const destDir = path.join(process.cwd(), 'public');

async function processIcons() {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
  
  // 1. Copy as main icon.png
  fs.copyFileSync(srcImage, path.join(destDir, 'icon.png'));
  
  // 2. Generate PWA icons
  const image = await Jimp.read(srcImage);
  
  await image.clone().resize(192, 192).writeAsync(path.join(destDir, 'pwa-192x192.png'));
  await image.clone().resize(512, 512).writeAsync(path.join(destDir, 'pwa-512x512.png'));
  
  // 3. Generate icon.ico for Electron/Windows and favicon
  const icoBuf = await pngToIco(srcImage);
  fs.writeFileSync(path.join(destDir, 'icon.ico'), icoBuf);
  fs.writeFileSync(path.join(destDir, 'favicon.ico'), icoBuf);
  
  console.log("Icons processed successfully!");
}

processIcons().catch(console.error);
