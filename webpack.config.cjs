const path=require('path');

module.exports = [
    {
        entry: './src/index.js',
        resolve: {fallback : { fs: false }},
        output: {
            library: "FS",
            libraryTarget: 'umd',
            path: path.resolve(__dirname, "dist"),
            filename: 'FS.js',
            globalObject: 'this',
        },
    },
    {
        entry: './src/index.js',
        resolve: {fallback : { fs: false }},
        output: {
            libraryTarget: 'amd',
            path: path.resolve(__dirname, "dist"),
            filename: 'FS_amd.js',
        },
    },

];