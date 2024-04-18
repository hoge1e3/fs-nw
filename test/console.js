function initConsole() {
    let header=document.querySelector("#header");
    let con=document.querySelector("#console");
    function c(k) {
        let old=console[k];
        console[k]=function (...args) {
            old.apply(console, args);
            const text=document.createElement("div");
            header.innerText=text.innerText=args.map(s=>s+"").join(" ");
            con.appendChild(text);
        };
    }
    for (let k of ["error","info","warn","log"]) c(k);
}
addEventListener("load",initConsole);