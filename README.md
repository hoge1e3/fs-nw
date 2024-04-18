# @hoge1e3/fs-nw

Extension of [@hoge1e3/fs](https://www.npmjs.com/package/@hoge1e3/fs) which can access native file system in nw.js

## Build

```
npm install
npm run build
```

## Test

### In regular browser(without native file system, localStorage only)
```
npm run test-browser
```
If "All test Passed." is shown, the test is succeeded.

### In nw.js(with native file system, mixing localStorage)
To run this test, install nw package globally: `npm nw -g`

```
npm run test-nw
```

If "All test Passed." is shown, the test is succeeded.

### In node.js(native file system only)
```
npm run test-node
```
If "#1 test passed." is shown, the test is succeeded.

## Run in nw.js

- If dist/FS.js is run in nw.js, `FS.get` represents files in native file system.
- If dist/FS.js is run in regular browser, `FS.get` represents files in localStorage.
- The file system can be selected by configuration see "Customize root file system".
```
var mydir=FS.get("/mydir/");// Directory in local file(Linux/Mac)
var mydir=FS.get("C:/mydir/");// Directory in local file(Windows)
```

## Customize root file system

If you want to use localStorage even in the nw.js environment, 
call `FS.init` before using `FS.get`:
```
FS.init(new FS.LSFS(localStorage));
```

And if you want to use native file system, use `FS.mount`.

```
FS.mount("/native/", new FS.NativeFS("/home/mydir/"));
```
After that `FS.get("/native/test.txt")` represents native file of `/home/mydir/test.txt`.

