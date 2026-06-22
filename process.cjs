const { Jimp } = require('jimp');
const fs = require('fs');

async function processIcon() {
  const imagePath = 'C:\\Users\\Luca\\.gemini\\antigravity\\brain\\78c4edac-c8f9-4b30-97fa-2096f628f615\\riot_share_icon_1_1782121753909.png';
  const image = await Jimp.read(imagePath);
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const radius = Math.min(width, height) / 2;
  const cx = width / 2;
  const cy = height / 2;

  // Make outside of circle transparent
  image.scan(0, 0, width, height, function(x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Smooth anti-aliasing edge
    if (distance > radius - 2) {
      if (distance > radius) {
        this.bitmap.data[idx + 3] = 0; // Alpha 0
      } else {
        const alpha = Math.max(0, Math.min(255, (radius - distance) * 255));
        this.bitmap.data[idx + 3] = alpha;
      }
    }
  });

  if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
  }

  image.write('build/icon.png');
  console.log('Done!');
}

processIcon().catch(console.error);
