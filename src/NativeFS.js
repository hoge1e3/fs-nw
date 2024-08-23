/*global process, global, Buffer, requirejs, require*/
//define(["FSClass","assert","PathUtil","extend","Content"],
//        function (FS,A,P,extend,Content) {
import {Class as FS,PathUtil as P, Content, assert as A} from "@hoge1e3/fs";
const extend = (...args)=>Object.assign(...args);
var assert = A;//, fs;
/*const requireTries = [
    ()=>require("fs"), 
    ()=>requirejs.nodeRequire("fs"), 
    ()=>global.require("fs")
];
for (let fsf of requireTries) {
    try {
        fs = fsf();
        fs.existsSync('test.txt');
        process.cwd();// fails here in NW.js Worker( fs is OK, process is absent)
        break;
    } catch (e) { console.log("FS.ERR", e);fs = null; }
}*/
export default function factory(fs){
var NativeFS = function (rootPoint) {
    if (fs.dummy) {
        throw new Error("This system not support native FS");
    }
    if (rootPoint) {
        A.is(rootPoint, P.AbsDir);
        this.rootPoint = rootPoint;
    }
};
var hasDriveLetter = typeof process!=="undefined" && P.hasDriveLetter(process.cwd());
NativeFS.available = !fs.dummy;
var SEP = P.SEP;
//var json=JSON; // JSON changes when page changes, if this is node module, JSON is original JSON
var Pro = NativeFS.prototype = new FS();
Pro.toNativePath = function (path) {
    // rootPoint: on NativePath   C:/jail/
    // mountPoint: on VirtualFS   /mnt/natfs/
    if (!this.rootPoint) return path;
    A.is(path, P.Absolute);
    A(this.inMyFS(path), path + " is not fs of " + this);
    //console.log("tonat:MP",P.rel( this.rootPoint, P.relPath(path, this.mountPoint || P.SEP)));
    return P.rel(this.rootPoint, P.relPath(path, this.mountPoint || P.SEP));
};
Pro.arrayBuffer2Buffer = function (a) {
    if (a instanceof ArrayBuffer) {
        var b = Buffer.from(new Uint8Array(a));
        return b;
    }
    return a;
};

FS.addFSType("NativeFS", function (path, options) {
    return new NativeFS(options.r);
});
NativeFS.prototype.fstype = function () {
    return "Native" + (this.rootPoint ? "(" + this.rootPoint + ")" : "");
};
NativeFS.prototype.inMyFS = function (path) {
    //console.log("inmyfs",path);
    if (this.mountPoint) {
        return P.startsWith(path, this.mountPoint);
    } else {
        //            console.log(path, hasDriveLetter , P.hasDriveLetter(path));
        return !(!!hasDriveLetter ^ !!P.hasDriveLetter(path));
    }
};
function E(r) { return r; }
FS.delegateMethods(NativeFS.prototype, {
    getReturnTypes: function (path, options) {
        E(path, options);
        assert.is(arguments, [String]);
        return {
            getContent: ArrayBuffer, opendir: [String]
        };
    },
    getContent: function (path, options) {
        options = options || {};
        A.is(path, P.Absolute);
        var np = this.toNativePath(path);
        this.assertExist(path);
        /*if (this.isText(path)) {
            return Content.plainText( fs.readFileSync(np, {encoding:"utf8"}) );
        } else {*/
        return Content.bin(fs.readFileSync(np), this.getContentType(path));
        //}
    },
    size: function (path) {
        var np = this.toNativePath(path);
        var st = fs.statSync(np);
        return st.size;
    },
    setContent: function (path, content) {
        A.is(arguments, [P.Absolute, Content]);
        var pa = P.up(path);
        if (pa) this.getRootFS().resolveFS(pa).mkdir(pa);
        var np = this.toNativePath(path);
        if (content.hasBin() || !content.hasPlainText()) {
            fs.writeFileSync(np, content.toNodeBuffer());
        } else {
            // !hasBin && hasText
            fs.writeFileSync(np, content.toPlainText());
        }
    },
    appendContent: function (path, content) {
        A.is(arguments, [P.Absolute, Content]);
        var pa = P.up(path);
        if (pa) this.getRootFS().resolveFS(pa).mkdir(pa);
        var np = this.toNativePath(path);
        if (content.hasBin() || !content.hasPlainText()) {
            fs.appendFileSync(np, content.toNodeBuffer());
        } else {
            // !hasBin && hasText
            fs.appendFileSync(np, content.toPlainText());
        }
    },
    getMetaInfo: function (path, options) {
        this.assertExist(path, options);
        const s = this.stat(path);
        s.lastUpdate = s.mtime.getTime();
        return s;
    },
    setMetaInfo: function (path, info, options) {
        E(path, info, options);
        this.assertExist(path, options);
        const s = this.stat(path);
        let atime=s.atime.getTime();
        let mtime=s.mtime.getTime();
        if (info.lastUpdate) {
            mtime=info.lastUpdate;
            const np = this.toNativePath(path);
            fs.utimesSync(np, new Date(atime), new Date(mtime));
        }
    },
    isReadOnly: function (path) {
        E(path);
        // TODO:
        return false;
    },
    stat: function (path) {
        A.is(path, P.Absolute);
        var np = this.toNativePath(path);
        return fs.statSync(np);
    },
    mkdir: function (path, options) {
        options = options || {};
        assert.is(arguments, [P.Absolute]);
        if (this.exists(path)) {
            if (this.isDir(path)) {
                return;
            } else {
                throw new Error(this + " is a file. not a dir.");
            }
        }
        this.assertWriteable(path);
        var pa = P.up(path);
        if (pa) this.getRootFS().resolveFS(pa).mkdir(pa);
        var np = this.toNativePath(path);
        fs.mkdirSync(np);
        return this.assertExist(path);
    },
    opendir: function (path, options) {
        assert.is(arguments, [String]);
        options = options || {};
        var np = this.toNativePath(path);
        var ts = P.truncSEP(np);
        var r = fs.readdirSync(np);
        if (!options.nosep) {
            r = r.map(function (e) {
                var s = fs.statSync(ts + SEP + e);
                var ss = s.isDirectory() ? SEP : "";
                return e + ss;
            });
        }
        var res = []; //this.dirFromFstab(path);
        return assert.is(res.concat(r), Array);
    },
    rm: function (path, options) {
        assert.is(arguments, [P.Absolute]);
        options = options || {};
        this.assertExist(path);
        var np = this.toNativePath(path);
        if (this.isDir(path)) {
            return fs.rmdirSync(np);
        } else {
            return fs.unlinkSync(np);
        }
    },
    // mv: is Difficult, should check dst.fs==src.fs
    //     and both have not subFileSystems
    exists: function (path, options) {
        options = options || {};
        var np = this.toNativePath(path);
        return fs.existsSync(np);
    },
    isDir: function (path) {
        if (!this.exists(path)) {
            return P.isDir(path);
        }
        return this.stat(path).isDirectory();
    },
    /*link: function(path, to, options) {
    }//TODO
    isLink:
    */
    touch: function (path) {
        if (!this.exists(path) && this.isDir(path)) {
            this.mkdir(path);
        } else if (this.exists(path) /*&& !this.isDir(path)*/) {
            // TODO(setlastupdate)
            const np = this.toNativePath(path);
            fs.utimesSync(np, Date.now() / 1000, Date.now() / 1000);
        }
    },
    getURL: function (path) {
        return "file:///" + path.replace(/\\/g, "/");
    },
    onAddObserver: function (apath, options) {
        var t = this;
        var rfs = t.getRootFS();
        options = options || {};
        var isDir = this.isDir(apath);
        //console.log("Invoke oao",options);
        const np = this.toNativePath(apath);
        var w = fs.watch(np, options, function (evt, rpath) {
            //console.log(path);
            var fpath = isDir ? P.rel(apath, rpath) : apath;
            var meta;
            if (t.exists(fpath)) {
                meta = extend({ eventType: evt }, t.getMetaInfo(fpath));
            } else {
                meta = { eventType: evt };
            }
            rfs.notifyChanged(fpath, meta);
        });
        return {
            remove: function () {
                w.close();
            }
        };
    },
});
return NativeFS;
}

