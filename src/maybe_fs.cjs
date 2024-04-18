
const requireTries = [
    ()=>require("fs"),
    new Function(`return require("fs");`), 
    ()=>requirejs.nodeRequire("fs"), 
];
let fs;
for (let fsf of requireTries) {
    try {
        fs = fsf();
        fs.existsSync('test.txt');
        process.cwd();// fails here in NW.js Worker( fs is OK, process is absent)
        break;
    } catch (e) { /*console.log("FS.ERR", e);*/fs = {dummy:true}; }
}
//console.log("EXPORTED", fs);
module.exports=fs;