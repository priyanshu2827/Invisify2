"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var steg_detector_1 = require("./src/lib/steg-detector");
var pixels = new Uint8Array(10000);
for (var i = 0; i < 10000; i++)
    pixels[i] = Math.floor(Math.random() * 256);
console.log("Stego:", (0, steg_detector_1.analyzeStego)(pixels));
