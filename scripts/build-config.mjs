import { writeFileSync } from 'node:fs';

const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
if (!key || !/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
  throw new Error('Set a valid GOOGLE_MAPS_API_KEY in the Vercel project environment variables.');
}
const config = 'window.schoolMapConfig = Object.freeze('
  + JSON.stringify({ googleMapsApiKey: key }) + ');\n';
writeFileSync(new URL('../dist/maps-config.js', import.meta.url), config, 'utf8');
console.log('Google Maps configuration generated.');
