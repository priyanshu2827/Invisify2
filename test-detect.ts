import { analyzeStego } from './src/lib/steg-detector';

const pixels = new Uint8Array(10000);
for(let i=0; i<10000; i++) pixels[i] = Math.floor(Math.random() * 256);

console.log("Stego:", analyzeStego(pixels));
