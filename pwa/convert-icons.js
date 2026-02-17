import sharp from 'sharp';
import fs from 'fs';

const sizes = [180, 192];
const svgPath = 'public/icons/icon-192.svg';

async function convertIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const size of sizes) {
      const pngPath = `public/icons/icon-${size}.png`;
      
      await sharp(svgBuffer, { density: 192 })
        .resize(size, size, { fit: 'cover' })
        .png({ quality: 100 })
        .toFile(pngPath);
      
      console.log(`✓ 生成 ${pngPath}`);
    }
    
    console.log('✓ 所有 PNG icon 已生成');
  } catch (error) {
    console.error('❌ 轉換失敗:', error);
    process.exit(1);
  }
}

convertIcons();
