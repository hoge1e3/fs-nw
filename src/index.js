import FS from "@hoge1e3/fs";

import NativeFSFactory from "./NativeFS.js";
import fs from "./maybe_fs.cjs";

FS.NativeFS=NativeFSFactory(fs);
export let NativeFS=FS.NativeFS;
export let assert=FS.assert;
export let Content=FS.Content;
export let Class=FS.Class;
export let DeferredUtil=FS.DeferredUtil;
export let Env=FS.Env;
export let LSFS=FS.LSFS;
export let PathUtil=FS.PathUtil;
export let RootFS=FS.RootFS;
export let SFile=FS.SFile;
export let WebFS=FS.WebFS;
export let zip=FS.zip;
export let addFSType=FS.addFSType;
export let availFSTypes=FS.availFSTypes;
export let setEnvProvider=FS.setEnvProvider;
export let getEnvProvider=FS.getEnvProvider;
export let setEnv=FS.setEnv;
export let getEnv=FS.getEnv;
export let localStorageAvailable=FS.localStorageAvailable;
export let init=FS.init;
export let getRootFS=FS.getRootFS;
export let get=FS.get;
export let expandPath=FS.expandPath;
export let resolve=FS.resolve;
export let mount=FS.mount;
export let unmount=FS.unmount;
export let isFile=FS.isFile;

export default FS;
