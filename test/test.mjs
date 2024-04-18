/* global requirejs */
import romk_f from "./ROM_k.mjs";
const _root=(function (){
    if (typeof window!=="undefined") return window;
    if (typeof self!=="undefined") return self;
    if (typeof global!=="undefined") return global;
    return (function (){return this;})();
})();
const timeout = (t) => new Promise(s => setTimeout(s, t));
if (typeof alert!=="function") {
    _root.alert=function (x) {
        console.log("ALERT",x);
    };
}
function checkModuleExports(FS) {
    const keys=new Set();
    for (let k in FS) {
        if (k==="default") continue;
        keys.add(k);
    }
    for (let k in FS.default) {
        if (k==="default") continue;
        keys.add(k);
    }
    console.log("exported names:",keys);
    const undefs=[];
    for (let k of keys) {
        if (FS[k]!==FS.default[k]) undefs.push(k);
    }
    if (undefs.length) {
        console.log("Add props:", undefs.join(","));
        throw new Error("Missing exported name");
    }
}
export async function main(FS){
checkModuleExports(FS);
let pass;
let testf;
let window=_root;
let rootFS;
try {
    var assert = FS.assert;
    //assert.is(arguments,
    //    [Object, FS.LSFS, Function, Function]);
    //       [Function,Function,LSFS,Function,Object,Function,Function,Function]);
    var WebFS = assert(FS.WebFS),
        LSFS = assert(FS.LSFS),
        P = assert(FS.PathUtil),
        SFile = assert(FS.SFile),
        NativeFS = assert(FS.NativeFS),
        RootFS = assert(FS.RootFS),
        Content = assert(FS.Content),
        DU = assert(FS.DeferredUtil);
    const romk=romk_f(FS);
    window.onerror = function (a,b,c,d,e) {
        console.log("window.onerror",arguments);
        console.error(e);
        alert(e);
        alert(e.stack);
        //console.log(e.stack);
        //if (e.preventDefault) e.preventDefault();
        return false;
    };
    window.PathUtil = P;
    window.romk = romk;
    if (typeof localStorage==="undefined") {
        rootFS = new RootFS(LSFS.ramDisk());
        rootFS.get("/ram/").mkdir();
        rootFS.get("/ram/comp.zip");
    } else {
        rootFS = new RootFS(new LSFS(localStorage));
        rootFS.mount("/ram/", LSFS.ramDisk());
    }
    rootFS.mount("/rom/", romk);
    rootFS.mount("http://127.0.0.1:8080/", new WebFS());
    rootFS.get("/var/").mkdir();
    window.rfs = rootFS;
    FS.init(rootFS);
    // check cannot mount which is already exists (別にできてもいいじゃん)
    /*assert.ensureError(function (){
        rootFS.mount("/var/",romk);
    });*/
    var cd = assert.is(rootFS.get("/"), SFile);
    var root = cd;
    // check relpath:
    //  path= /a/b/c   base=/a/b/  res=c
    assert(root.rel("a/b/c").relPath("/a/b/") === "c");
    assert(root.rel("a/b/c").relPath(root.rel("a/b/")) === "c");
    //  path= /a/b/c/   base=/a/b/  res=c/
    assert(root.rel("a/b/c/").relPath("/a/b/") === "c/");
    //  path= /a/b/c/   base=/a/b/c/d  res= ../
    assert(root.rel("a/b/c/").relPath("/a/b/c/d") === "../");
    //  path= /a/b/c/   base=/a/b/e/f  res= ../../c/
    assert(root.rel("a/b/c/").relPath("/a/b/e/f") === "../../c/");
    // ext()
    assert.eq(P.ext("test.txt"), ".txt");
    assert.eq(P.normalize("c:\\hoge/fuga\\piyo//"), "c:/hoge/fuga/piyo/");
    assert(P.isChildOf("c:\\hoge/fuga\\piyo//", "c:\\hoge\\fuga/"), "isChildOf");
    assert(!P.isChildOf("c:\\hoge/fuga\\piyo//", "c:\\hoge\\fugo/"), "!isChildOf");
    testContent();
    var nfs;
    assert(typeof process==="undefined" || NativeFS.available, "Native FS not avail in node");
    if (NativeFS.available) {
        /*global require*/
        try {
            require('nw.gui').Window.get().showDevTools();
        } catch(e) {
            console.error(e);
        }
        //console.log("import.meta.url",import.meta.url);

        var nfsp = P.rel( P.directorify( process.cwd()) , "fixture/");// "C:/bin/Dropbox/workspace/fsjs/fs/";//P.rel(PathUtil.directorify(process.cwd()), "fs/");
        console.log(nfsp);
        var nfso;
        rootFS.mount("/fs/", nfso = new NativeFS(nfsp));
        assert(nfso.exists("/fs/"), "/fs/ not exists");
        nfs = root.rel("fs/");
    }
    var r = cd.ls();
    console.log(r);
    var ABCD = "abcd\nefg";
    var CDEF = "defg\nてすと";
    //obsolate: ls does not enum mounted dirs
    //assert(r.indexOf("rom/")>=0, r);
    var romd = root.rel("rom/");
    var ramd = root.rel("ram/");
    testf = root.rel("testfn.txt");
    if (nfs) assert(nfs.fs.isText("/test.txt"));

    var testd;
    if (!testf.exists()) {
        pass=1;
        console.log("Test #", pass);
        testWebFS(rootFS);
        testd = cd = cd.rel(/*Math.random()*/"testdir" + "/");
        console.log("Enter", cd);
        testd.mkdir();
        chkrom();
        //--- check exists
        assert(testd.exists({ includeTrashed: true }));
        assert(testd.exists());
        //--- check lastUpdate
        var d = LSFS.now();
        testf.text(testd.path());
        assert(Math.abs(testf.lastUpdate() - d) <= 1000);
        chkrom();
        testd.rel("test.txt").text(ABCD);
        chkrom();
        assert(romd.rel("Actor.tonyu").text().length > 0);
        assert.ensureError(function () {
            romd.rel("Actor.tonyu").text("hoge");
        });
        testd.rel("sub/test2.txt").text(romd.rel("Actor.tonyu").text());
        chkrom();
        var tncnt = 0;
        romd.recursive(function (/*f*/) {
            //console.log("ROM",tncnt,f.path());
            tncnt++;
        }, { excludes: function (f) { return !f.isDir() && f.ext() !== ".tonyu"; } });
        console.log(".tonyu files in romd/", tncnt);
        assert.eq(tncnt, 46, "tncnt");
        tncnt = 0;
        var exdirs = ["physics/", "event/", "graphics/"];
        romd.recursive(function (/*f*/) {
            tncnt++;
        }, { excludes: exdirs });
        console.log("files in romd/ except", exdirs, tncnt);
        assert.eq(tncnt, 33, "tncnt");

        assert(testd.rel("sub/").exists());
        assert(rootFS.get("/testdir/sub/").exists());
        assert(testf.exists());
        var sf = testd.setPolicy({ topDir: testd });//SandBoxFile.create(testd._clone());
        assert(sf.rel("test.txt").text() == ABCD);
        sf.rel("test3.txt").text(CDEF);
        assert.ensureError(function () {
            var rp = romd.rel("Actor.tonyu").relPath(sf);
            console.log(rp);
            //alert("RP="+ rp );
            alert(sf.rel(rp).text());
        });
        assert.eq(sf.rel("test3.txt").text(), CDEF);
        assert.ensureError(function () {
            alert(sf.listFiles()[0].up().rel("../rom/Actor.tonyu").text());
        });
        sf.rel("test3.txt").rm({ noTrash: true });
        assert(!testd.rel("test3.txt").exists({ includeTrashed: true }));
        ramd.rel("toste.txt").text("fuga");
        assert.ensureError(function () {
            ramd.rel("files").link(testd);
        });
        ramd.rel("files/").link(testd);
        testd.rel("sub/del.txt").text("DEL");
        assert(ramd.rel("files/").isLink());
        assert.eq(ramd.rel("files/test.txt").resolveLink().path(), testd.rel("test.txt").path());
        assert.eq(ramd.rel("files/test.txt").text(), ABCD);
        assert.eq(ramd.rel("files/sub/test2.txt").text(), romd.rel("Actor.tonyu").text());
        ramd.rel("files/sub/del.txt").rm();
        assert(!testd.rel("sub/del.txt").exists());
        ramd.rel("files/sub/del.txt").rm({ noTrash: true });
        assert(!testd.rel("sub/del.txt").exists({ includeTrashed: true }));
        ramd.rel("files/").rm();
        assert(testd.exists());
        console.log(ramd.fs.storage);
        assert(!("/../" in ramd.fs.storage));
        if (nfs) {
            console.log(nfs.ls());
            nfs.rel("sub/test2.txt").text(romd.rel("Actor.tonyu").text());
            nfs.rel("test.txt").text(ABCD);
            var pngurl = nfs.rel("Tonyu/Projects/MapTest/images/park.png").text();
            assert(P.startsWith(pngurl, "data:"));
            if (typeof document!=="undefined") {
                document.getElementById("img").src = pngurl;
            }
            nfs.rel("sub/test.png").text(pngurl);

            nfs.rel("sub/test.png").copyTo(testd.rel("test.png"));
            chkCpy(nfs.rel("Tonyu/Projects/MapTest/Test.tonyu"));
            chkCpy(nfs.rel("Tonyu/Projects/MapTest/images/park.png"));
            chkCpy(testd.rel("test.png"));
            testd.rel("test.png").removeWithoutTrash();
            //---- test append
            var beforeAppend = nfs.rel("Tonyu/Projects/MapTest/Test.tonyu");
            var appended = nfs.rel("Tonyu/Projects/MapTest/TestApp.tonyu");
            beforeAppend.copyTo(appended);
            var apText = "\n//tuikasitayo-n\n";
            appended.appendText(apText);
            assert.eq(beforeAppend.text() + apText, appended.text());
        }
        console.log(testd.rel("test.txt").path(), testd.rel("test.txt").text());
        testd.rel("test.txt").text(romd.rel("Actor.tonyu").text() + ABCD + CDEF);
        chkCpy(testd.rel("test.txt"));
        testd.rel("test.txt").text(ABCD);
        //testEach(testd);
        //--- the big file
        if (typeof localStorage!=="undefined") await chkBigFile(testd);

        //------------------
        if (!nfs) {
            rootFS.mount(
                location.protocol + "//" + location.host + "/",
                "web");
            await rootFS.get(location.href).getContent(function (c) {
                console.log(location.href, c.toPlainText());
                assert(c.toPlainText().indexOf("989174192312") >= 0, "Webfs getContent");
            });
        }
        DU.each([1, 2, 3], function (i) {
            //return DU.timeout(1000).then(function ()  {
            console.log("DU.EACH", i);
            var res;
            if (i == 2) res = i.c.d;
            return i;
            //});
        }).catch(function (e) { console.log("DU.ERR", (e + "").replace(/\n.*/, "")); });
        DU.each({ a: 1, b: 2, c: 3 }, function (k, v) {
            return DU.timeout(500).then(function () {
                console.log("DU.EACH t/o", k, v);
                var res;
                if (v == 2) res = v.c.d;
                return v;
            });
        }).catch(function (e) { console.log("DU.ERR", (e + "").replace(/\n.*/, "")); });
        await DU.all([DU.timeout(500, "A"), DU.timeout(200, "B")]).then(function (r) {
            if (r.join(",") !== "A,B") alert(r.join(","));
            console.log("DU.all1", r);
        });
        DU.all([DU.timeout(500, "A"), DU.timeout(200, "B"), DU.reject("ERAA")]).then(
        function (r) {
            alert("DU.all2 Shoult not t reach here");
            console.log("DU.all2", r);
        }, function (e) {
            if (e !== "ERAA") alert(e);
            console.log("DU.all rej", e);
        });
        assert.ensureError(function () {
            DU.throwNowIfRejected(
                DU.resolve(0).then(function (r) {
                    alert(r.a.b);
                })
            );
        });
        DU.throwNowIfRejected(
            DU.timeout(100).then(function (r) {
                alert(r.a.b);
            })
        ).then(
            function () { alert("NO!"); },
            function (r) { console.log("DU.TNIR", (r + "").replace(/\n.*/, "")); }
        );
        DU.throwNowIfRejected(
            DU.timeout(100).then(function () {
                return "OK";
            })
        ).then(
            function (r) { console.log("DU.TNIR", r); },
            function () { alert("NO! 2"); }
        );
        DU.throwNowIfRejected(
            DU.resolve(100).then(function (r) {
                return "OK" + r;
            })
        ).then(
            function (r) { console.log("DU.TNIR", r); },
            function () { alert("NO! 3"); }
        );
        
        // blob->blob
        var f = testd.rel("hoge.txt");
        f.text("hogefuga");
        var tmp = testd.rel("fuga.txt");
        var b = f.getBlob();
        console.log("BLOB reading...", f.name(), tmp.name());
        await tmp.setBlob(b).then(function () {
            checkSame(f, tmp);
            console.log("BLOB read done!", f.name(), tmp.name());
            tmp.rm({ noTrash: true });
            f.rm({ noTrash: true });
        });
        //setTimeout(function () {location.reload();},10000);
        await asyncTest(testd);

    } else {
        try {
            pass=2;
            console.log("Test #", pass);
            testd = cd = rootFS.get(testf.text());
            assert(cd.exists());
            console.log("Enter", cd);
            assert(testd.rel("test.txt").text() === ABCD);
            assert(testd.rel("sub/").exists());
            assert(testd.rel("sub/test2.txt").text() === romd.rel("Actor.tonyu").text());
            chkRecur(testd, {}, "test.txt,sub/test2.txt");
            console.log("testd.size", testd.size());
            assert.eq(testd.size(), ABCD.length + testd.rel("sub/test2.txt").size(), "testd.size");
            assert.eq(testd.ls().join(","), "test.txt,sub/");
            chkRecur(testd, { excludes: ["sub/"] }, "test.txt");
            testd.rel("test.txt").rm();
            chkRecur(testd, {}, "sub/test2.txt");
            console.log("FULLL", testd.path());
            //console.log("FULLL", localStorage[testd.path()]);
            chkRecur(testd, { includeTrashed: true }, "test.txt,sub/test2.txt");
            testd.rel("test.txt").rm({ noTrash: true });
            chkRecur(testd, {}, "sub/test2.txt");


            testd.removeWithoutTrash({ recursive: true });
            chkrom();
            assert(!testd.exists({ includeTrashed: false }));
            assert(!testd.exists({ includeTrashed: true }));
            testf.removeWithoutTrash({ recursive: true });
            chkrom();
            assert(!testf.exists({ includeTrashed: false }));
            assert(!testf.exists({ includeTrashed: true }));
            assert(!testd.rel("test.txt").exists({ includeTrashed: true }));
            await ramd.rel("a/b.txt").text("c").then(function () {
                return ramd.rel("c.txt").text("d");
            }).then(function () {
                return chkRecurAsync(ramd, {}, "a/b.txt,c.txt");
            });
            if (nfs) {
                assert.eq(nfs.rel("sub/test2.txt").text(), romd.rel("Actor.tonyu").text());
                assert.eq(nfs.rel("test.txt").text(), ABCD);
                let pngurl = nfs.rel("Tonyu/Projects/MapTest/images/park.png").text();
                assert.eq(nfs.rel("sub/test.png").text(), pngurl);

            }
        } finally {
            //console.log(e.stack);
            testd.removeWithoutTrash({ recursive: true });
            testf.removeWithoutTrash({ recursive: true });
        }
    }
    console.log(rootFS.get("/var/").ls());
    console.log(rootFS.get("/rom/").ls());
    console.log("#"+pass+" test passed. ");
    if (pass==1) {
        await timeout(1000);
        if (typeof location!=="undefined") location.reload();
    } else {
        console.log("All test passed.");
    }
} catch (e) {
    console.log(e.stack);
    alert("#"+pass+" test Failed. "+e);
    try {
        testf.rm();
    } catch (e) {
        console.error(e);
    }
}
async function chkBigFile(testd) {
    var cap = LSFS.getCapacity();
    console.log("usage", cap);
    if (cap.max < 100000000) {
        var len = cap.max - cap.using + 1500;
        var buf = "a";
        while (buf.length < len) buf += buf;
        var bigDir = testd.rel("bigDir/");
        var bigDir2 = bigDir.sibling("bigDir2/");
        if (bigDir2.exists()) bigDir2.rm({ r: 1 });
        var bigFile = bigDir.rel("theBigFile.txt");
        assert.ensureError(function () {
            console.log("Try to create the BIG ", buf.length, "bytes file");
            return bigFile.text(buf);
        });
        assert(!bigFile.exists(), "BIG file remains...?");
        buf = buf.substring(0, cap.max - cap.using - 1500);
        buf = buf.substring(0, buf.length / 10);
        for (var i = 0; i < 6; i++) bigDir.rel("test" + i + ".txt").text(buf);
        await bigDir.moveTo(bigDir2).then(
            function () { alert("You cannot come here(move big)"); },
            function (e) {
                console.log("Failed Successfully! (move big!)", e);
                return DU.resolve();
            }
        ).then(function () {
            for (var i = 0; i < 6; i++) assert(bigDir.rel("test" + i + ".txt").exists());
            assert(!bigDir2.exists(), "Bigdir2 (" + bigDir2.path() + ") remains");
            console.log("Bigdir removing");
            bigDir.removeWithoutTrash({ recursive: true });
            bigDir2.removeWithoutTrash({ recursive: true });
            assert(!bigDir.exists());
            console.log("Bigdir removed!");
            return DU.resolve();
        });//.then(DU.NOP, DU.E);
    }
}
function chkCpy(f) {
    var tmp = f.up().rel("tmp_" + f.name());
    f.copyTo(tmp);
    checkSame(f, tmp);
    tmp.text("DUMMY");

    var c = f.getContent();
    tmp.setContent(c);
    checkSame(f, tmp);
    tmp.text("DUMMY");

    // plain->plain(.txt) / url(bin->URL)->url(URL->bin) (.bin)
    var t = f.text();
    tmp.text(t);
    checkSame(f, tmp);
    tmp.text("DUMMY");

    // url(bin->URL)->url(URL->bin)
    t = f.dataURL();
    tmp.dataURL(t);
    checkSame(f, tmp);
    tmp.text("DUMMY");

    // bin->bin
    var b = f.getBytes();
    //console.log("f.getBytes",b);
    tmp.setBytes(b);
    //console.log("tmp.getBytes",tmp.getBytes());
    //console.log(peekStorage(f));
    //console.log(peekStorage(tmp));
    checkSame(f, tmp);
    tmp.text("DUMMY");


    if (f.isText()) {
        // plain->bin(lsfs) , bin->plain(natfs)
        b = f.getBytes();
        c = Content.bin(b, "text/plain");
        t = c.toPlainText();
        tmp.setText(t);
        checkSame(f, tmp);
        tmp.text("DUMMY");
    }




    tmp.removeWithoutTrash();
}
function peekStorage(f) {
    return rootFS.resolveFS(f.path()).storage[f.path()];
}
function checkSame(a, b) {
    console.log("check same", a.name(), b.name(), a.text().length, b.text().length);
    assert(a.text() == b.text(), ()=>"text is not match: " + a + "!=" + b+"\n"+
    "content ----\n"+a.text()+"\n----\n"+b.text());
    var a1 = a.getBytes({ binType: ArrayBuffer });
    var b1 = b.getBytes({ binType: ArrayBuffer });
    a1 = new Uint8Array(a1);
    b1 = new Uint8Array(b1);
    console.log("bin dump:", a1[0], a1[1], a1[2], a1[3]);
    assert(a1.length > 0, "shoule be longer than 0");
    assert(a1.length == b1.length, "length is not match: " + a + "," + b);
    for (var i = 0; i < a1.length; i++) assert(a1[i] == b1[i], "failed at [" + i + "]");
}
function contEq(a,b) {
    if (typeof a!==typeof b)return false;
    if (typeof a==="string") return a===b;
    a = new Uint8Array(a);
    b = new Uint8Array(b);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i]!==b[i]) return false;
    return true;
}
//window.DataURL=Content.DataURL;
function chkrom() {
    if (typeof localStorage==="undefined") return;
    var p = JSON.parse(localStorage["/"]);
    if ("rom/" in p) {
        delete p["rom/"];
        localStorage["/"] = JSON.stringify(p);
        throw new Error("ROM!");
    }
}
async function chkRecurAsync(dir, options, result) {
    try {
        var di = ["start"];
        await DU.timeout(100);
        await dir.recursive(function (f) {
            di.push(f.relPath(dir));
            console.log("CHKRA", f.name());
            return DU.timeout(500);
        }, options);
        console.log("checkRecurasync", di);
        assert.eq(di.join(","), "start," + result);
        di = ["start"];
        for (let f of dir.recursive()) {
            di.push(f.relPath(dir));
            console.log("CHKRA gen ", f.name());
            await DU.timeout(500);
        }
        console.log("checkRecurasync gen ", di);
        assert.eq(di.join(","), "start," + result);
    } catch (e) {
        console.error(e);
        alert(e);
    }
}
function chkRecur(dir, options, result) {
    var di = [];
    dir.recursive(function (f) {
        di.push(f.relPath(dir));
    }, options);
    assert.eq(di.join(","), result);
    options.style = "flat-relative";
    var t = dir.getDirTree(options);
    assert.eq(Object.keys(t).join(","), result);
}
function testContent() {
    var C = Content;
    const a=[0xe3, 0x81, 0xa6, 0xe3, 0x81, 0x99, 0xe3, 0x81, 0xa8, 0x61, 0x62, 0x63];
    const conts={
        p:["てすとabc", (s)=>C.plainText(s), (c)=>c.toPlainText()],
        u:["data:text/plain;base64,44Gm44GZ44GoYWJj", (u)=>C.url(u), (c)=>c.toURL()],
        a:[Uint8Array.from(a).buffer, (a)=>C.bin(a, "text/plain"), (c)=>c.toArrayBuffer()],
    };
    if (typeof Buffer!=="undefined") {
        conts.n=[Buffer.from(a),(n)=>C.bin(n, "text/plain"), (c)=>c.toNodeBuffer()];
    }
    const SRC=0, TOCONT=1, FROMCONT=2;
    let binLen=conts.a[SRC].byteLength;
    for (let tfrom of Object.keys(conts) ) 
        for (let tto of Object.keys(conts) ) chk(tfrom,tto);
    function chk(tfrom,tto) {
        const src=conts[tfrom][SRC];
        const c=conts[tfrom][TOCONT](src);
        if (c.hasNodeBuffer()) {
            assert.eq(c.nodeBuffer.length, binLen,"Bin length not match");
        }
        const dst=conts[tto][FROMCONT](c);
        console.log("Convert Content ",tfrom,"->",tto);
        assert(contEq(dst, conts[tto][SRC]), ()=>{
            console.log("Actual: ",dst);
            console.log("Expected: ",conts[tto][SRC]);
            console.log("Content bufType ", c.bufType );
            throw new Error(`Fail at ${tfrom} to ${tto}`);
        });
    }

    /*var c1 = C.plainText(s);
    test(c1, [s]);

    function test(c, path) {
        var p = c.toPlainText();
        var u = c.toURL();
        var a = c.toArrayBuffer();
        var n = C.hasNodeBuffer() && c.toNodeBuffer();
        console.log("TestCont", path, "->", p, u, a, n);
        var cp = C.plainText(p);
        var cu = C.url(u);
        var ca = C.bin(a, "text/plain");
        var cn = n && C.bin(n, "text/plain");
        if (path.length < 2) {
            test(cp, path.concat([p]));
            test(cu, path.concat([u]));
            test(ca, path.concat([a]));
            if (n) test(cn, path.concat([n]));
        } else {
            //assert.eq(cp,p, "cp!=p");
            //assert.eq(cu,u, "cu!=u");
        }
    }*/
}
function testWebFS(rootFS) {
    rootFS.get("http://127.0.0.1:8080/test/browser.html").text(function (r) {
        console.log("WSF", r);
        assert(r.indexOf("test/test") >= 0, "WebFS get fail");
    });
}
function testEach(dir) {
    dir.each(function (f) {
        console.log("EACH", f.path());
    });
    assert.ensureError(function () {
        dir.each(function (f) {
            console.log("EACH", f.path());
            throw new Error("ERA-");
        });
    });
}
async function asyncTest(testd) {
    await checkZip(testd);
    await checkWatch(testd);
}
async function checkWatch(testd) {
    const buf = [];
    const w = testd.watch((type, f) => {
        buf.push(type + ":" + f.relPath(testd));
    });
    async function buildScrap(f, t = "aaa") {
        await timeout(100);
        f.text(t);
        await timeout(100);
        f.text(t + "!");
        await timeout(100);
        f.removeWithoutTrash();
    }
    await buildScrap(testd.rel("hogefuga.txt"));
    w.remove();
    await buildScrap(testd.rel("hogefuga.txt"));
    console.log("checkWatch", buf);
    assert.eq(buf.join("\n"), [
        "create:hogefuga.txt",
        "change:",
        "change:hogefuga.txt",
        "change:",
        "delete:hogefuga.txt",
        "change:"
    ].join("\n"), "checkWatch");

}
async function checkZip(dir) {
    await timeout(3000);
    dir.rel("ziping.txt").text("zipping");
    let tre = dir.getDirTree();
    console.log("TRE", tre);
    const zipf = FS.get("/ram/comp.zip");
    await FS.zip.zip(dir, zipf);
    let ext = dir.rel("ext/");
    ext.mkdir();
    await FS.zip.unzip(zipf, ext);

    let tre2 = ext.getDirTree();
    console.log("TRE2", tre2);
    dir.rel("ziping.txt").removeWithoutTrash();
    ext.removeWithoutTrash({ recursive: true });
    assert.eq(Object.keys(tre).length, Object.keys(tre2).length);
    for (let k2 of Object.keys(tre2)) {
        let k = k2.replace(/\/ext/, "");
        console.log(k, k2);
        assert(k2 in tre2);
        assert(k in tre);
        assert(tre[k].lastUpdate);
        console.log(tre[k].lastUpdate - tre2[k2].lastUpdate);
        //assert(Math.abs(tre[k].lastUpdate-tre2[k2].lastUpdate)<2000);
        assert(Math.abs(
            Math.floor(tre[k].lastUpdate / 1000) -
            Math.floor(tre2[k2].lastUpdate / 1000)) <= 1);
    }
}
}// of main()
_root.main=main;