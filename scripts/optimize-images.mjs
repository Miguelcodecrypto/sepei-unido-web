import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const heroDir = path.resolve('public/images/hero');
const mobileDir = path.resolve('public/images/hero/mobile');

// Crear directorio mobile si no existe
if (!fs.existsSync(mobileDir)) {
  fs.mkdirSync(mobileDir, { recursive: true });
}

const images = fs.readdirSync(heroDir).filter(f => f.endsWith('.jpg') && !fs.statSync(path.join(heroDir, f)).isDirectory());

console.log(`Procesando ${images.length} imágenes...`);

for (const img of images) {
  const inputPath = path.join(heroDir, img);
  const outputPath = path.join(mobileDir, img);
  
  try {
    const metadata = await sharp(inputPath).metadata();
    console.log(`\n📷 ${img}: ${metadata.width}x${metadata.height} (${(fs.statSync(inputPath).size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Versión móvil: 800px de ancho, calidad optimizada
    await sharp(inputPath)
      .resize(800, 1200, { 
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80,
        mozjpeg: true,
        chromaSubsampling: '4:2:0'
      })
      .toFile(outputPath);
    
    const newSize = fs.statSync(outputPath).size;
    const oldSize = fs.statSync(inputPath).size;
    const savedPercent = ((1 - newSize / oldSize) * 100).toFixed(1);
    console.log(`   ✅ Mobile: ${(newSize / 1024).toFixed(0)} KB (${savedPercent}% reducido)`);
  } catch (err) {
    console.error(`   ❌ Error procesando ${img}:`, err.message);
  }
}

console.log('\n🎉 ¡Optimización completada!');
