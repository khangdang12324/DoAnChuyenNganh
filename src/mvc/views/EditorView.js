(function() {
    class EditorView{
        constructor() {
            this.ta={
                html: document.getElementById("ta-html"),
                css: document.getElementById("ta-css"),
                js: document.getElementById("ta-js")
            };
            this.current = "html";
            this.hamKhiNhap ={html:[], css:[], js:[]};

            //Chuyen tab khi bam nut

            const tabs = document.querySelectorAll(".tabs button");
            tabs.forEach((nut)=>{
                nut.addEventListener("click", ()=>{
                    tabs.forEach(n=>n.classList.remove("active"));
                    nut.classList.add("active");
                    this.hienTab(nut.dataset.tab); 
                });
            }); 

            //Khi go tung o goi cac ham da dang ky
            Object.entries(this.ta).forEach((cap)=>{
                const tenTab = cap[0];
                const oTextarea = cap[1];
                oTextarea.addEventListener("input", ()=>{
                   const noiDungDangGhi = oTextarea.value;
                   const dsHam = this.hamKhiNhap[tenTab] || [];
                   for(let i = 0; i < dsHam.length; i++) {
                    const fn = dsHam[i];
                    fn(noiDungDangGhi);
                   }
                });
            });
        }
    }
})();