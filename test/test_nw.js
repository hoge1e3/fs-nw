const { exec, spawn } = require('node:child_process');
const fs=require("fs");
console.log("To run this test, install nw package globally: npm nw -g");

fs.copyFileSync("./dist/FS_amd.js","./test/FS_amd.js");
exec("nw test/");
