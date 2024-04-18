import * as fs from "fs";

const path="dist/FS_amd.js";
const s=fs.readFileSync(path,{encoding:"utf8"});
fs.writeFileSync(path, s.replace(/define\(/,"define([],") );
