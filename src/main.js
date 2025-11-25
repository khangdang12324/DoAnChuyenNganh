

document.addEventListener('DOMContentLoaded', () => {
    const editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/python");
    editor.setValue("# Viết mã Python ở đây \nprint('Hello, World!')", 1);

    editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        fontSize: "14px"
    });
       
    const fileSessions = {};

    
        // 
    const langSelectButton = document.querySelector('.lang-trigger');
    const langSelectMenu = document.querySelector('.lang-select');
    const langItems = langSelectMenu.querySelectorAll('.lang-item');
    const currentLangIcon = document.querySelector('.lang-icon');
    const currentLangText = document.querySelector('.lang-text');

    if (langSelectButton) {
        langSelectButton.addEventListener('click', () => {
            langSelectMenu.classList.toggle('is-open');
        });
    }
    langItems.forEach(item => {
        item.addEventListener('click', () => {
            const langName = item.querySelector('span').textContent;
            const langValue = item.getAttribute('data-lang');
            const langIconSrc = item.querySelector('img').src;

            currentLangText.textContent = langName;
            currentLangIcon.src = langIconSrc;

            editor.session.setMode(`ace/mode/${langValue}`);

            langItems.forEach(i => i.classList.remove('is-active'));
            item.classList.add('is-active');

            langSelectMenu.classList.remove('is-open');
        });
    });


    document.addEventListener('click', (event) => {
        if (!langSelectButton.contains(event.target)) {
            langSelectMenu.classList.remove('is-open');
        }
    });
    let vfs={
        'main.py':{
            type:'file',
        }
    };
    //run btn

    const runButton = document.getElementById("runBtn");
    const terminalBody = document.getElementById("terminal");

    async function runCode() {


        const activeTab = document.querySelector('.file-tab.active');
        if (!activeTab) {
            alert("Vui lòng tạo và chọn một file để chạy mã nguồn.");
            return;
        }

        const filename = activeTab.getAttribute('data-filename');
        const code = fileSessions[filename].getValue();

        const extension = filename.split('.').pop();

        let language = '';
        if (extension === 'py') language = 'python';
        if (extension === 'js') language = 'javascript';
        if (extension === 'java') language = 'java';
        if (extension === 'cpp') language = 'cpp';

        terminalBody.innerHTML = '<span class="terminal-info">Đang Chạy...</span>\n';

        const API_ENDPOINT = 'http://localhost:3000/run';

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language: language,
                    code: code
                })
            });
            const result = await response.json();

            if (result.error) {
                terminalBody.innerHTML += `<span class="term-line error">${result.error.replace(/\n/g, '<br>')}</span>\n`;
            } else {
                terminalBody.innerHTML += `<span class="term-line output">${result.output.replace(/\n/g, '<br>')}</span>\n`;
            }
        } catch (error) {
            terminalBody.innerHTML += `<span class="term-line error">Lỗi kết nối tới máy chủ.</span>\n`;
            console.error(error);
        }
        terminalBody.innerHTML += `<span class="terminal-info">Kết Thúc.</span>\n`;
    }

    runButton.addEventListener('click', (e) => {
        e.preventDefault();
        runCode();
    });
   
    const fileTabsContainer = document.getElementById("fileTabs");
    const addFileButton = document.getElementById("addFileBtn");

    function switchTab(filename) {

        const session = fileSessions[filename];
        if (!session) return;

        editor.setSession(session);

        document.querySelectorAll('.file-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const tabButton = document.querySelector(`.file-tab[data-filename="${filename}"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }
    }

    //tao tab moi

    function createNewTab(filename) {
        if (!filename) return;

        if (fileSessions[filename]) {
            alert("File đã tồn tại!");
            return;
        }

        const extension = filename.split('.').pop();
        let mode = "ace/mode/text";
        if (extension === 'py') mode = "ace/mode/python";
        if (extension === 'js') mode = "ace/mode/javascript";
        if (extension === 'java') mode = "ace/mode/java";
        if (extension === 'cpp') mode = "ace/mode/c_cpp";

        const newSession = ace.createEditSession(`"Viết mã ${filename} ở đây"\n`, mode);

        fileSessions[filename] = newSession;

        const tabHTMl = `
            <button class="file-tab" data-filename="${filename}">
           <span class="file-name">${filename}</span>
           <span class="close" title="Đóng File">x</span>
            </button>
`;
        fileTabsContainer.insertAdjacentHTML('beforeend', tabHTMl);

        const newTabButton = fileTabsContainer.querySelector(`.file-tab[data-filename="${filename}"]`);

        newTabButton.addEventListener('click', () => {
            switchTab(filename);
        });

        newTabButton.querySelector('.close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(filename);
        });
        switchTab(filename);
    }

    //dongtab

    function closeTab(filename) {
        const tabButton = fileTabsContainer.querySelector(`.file-tab[data-filename="${filename}"]`);
        if (tabButton) tabButton.remove();

        delete fileSessions[filename];

        const firstTab = fileTabsContainer.querySelector('.file-tab');
        if (firstTab) {
            switchTab(firstTab.getAttribute('data-filename'));
        } else {
            createNewTab('main.py');
        }
    }

    //gan sukien cho nut them file

    if (addFileButton) {
        addFileButton.addEventListener('click', () => {
            const newFilename = prompt("Nhập tên file mới:");
            if (newFilename) {
                createNewTab(newFilename);
            }
        });
    }

    //tao tab mac dinh

    const initialFilename = editor.getValue();
    createNewTab('main.py');
    fileSessions['main.py'].setValue(initialFilename);

    //tao nut luu

    const saveBtnTrigger = document.getElementById("saveBtnTrigger");
    const saveMenuPopover = document.getElementById("saveMenuPopover");
    const saveFileBtn = document.getElementById("saveFileBtn");
    const saveZipBtn = document.getElementById("saveZipBtn");

    if (saveBtnTrigger) {
        saveBtnTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            saveMenuPopover.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (event) => {
        if (langSelectButton && !langSelectButton.contains(event.target) &&
            !langSelectMenu.contains(event.target)) {
            langSelectMenu.classList.remove('is-open');
        }

        if (saveBtnTrigger && !saveBtnTrigger.contains(event.target) && !saveMenuPopover.contains(event.target)) {
            saveMenuPopover.classList.add('hidden');
        }
    });

    if (saveFileBtn) {
        saveFileBtn.addEventListener('click', () => {
            saveMenuPopover.classList.add('hidden');

            const activeTab = document.querySelector('.file-tab.active');
            if (!activeTab) {
                alert("Vui lòng tạo và chọn một file để lưu.");
                return;
            }
            const originalFilename = activeTab.getAttribute('data-filename');

            let newFilename = prompt("Lưu file dưới tên:", originalFilename);
            if (!newFilename) {
                return;
            }


            const code = fileSessions[originalFilename].getValue();

            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);

            link.download = newFilename;
            link.click();

            URL.revokeObjectURL(link.href);
        });
    }

    if (saveZipBtn) {
        saveZipBtn.addEventListener('click', async () => {
            saveMenuPopover.classList.add('hidden');

            if (typeof JSZip === 'undefined') {
                alert("JSZip chưa được tải. Không thể lưu dưới dạng ZIP.");
                return;
            }

            const zip = new JSZip();
            const filenames = Object.keys(fileSessions);
            if (filenames.length === 0) {
                alert("Không có file nào để lưu.");
                return;
            }

            for (const filename of filenames) {
                const code = fileSessions[filename].getValue();
                zip.file(filename, code);
            }

            try {
                saveBtnTrigger.textContent = "...";
                const zipFile = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipFile);
                link.download = 'code_files.zip';
                link.click();
                URL.revokeObjectURL(link.href);
            } catch (error) {
                alert("Lỗi khi nén file: " + error.message);
            } finally {
                saveBtnTrigger.textContent = "💾";
            }
        });
    }

    // 6. CHỨC NĂNG TỐI/SÁNG (DARK MODE)

    

    const themeToggle = document.getElementById('autoRunToggle');
    const body = document.body;


    function applyTheme(theme) {
        if (theme === 'light') {
            body.classList.add('theme-light');
            body.classList.remove('theme-dark');
            editor.setTheme("ace/theme/github"); 
        } else {
            body.classList.add('theme-dark');
            body.classList.remove('theme-light');
            editor.setTheme("ace/theme/monokai"); 
        }
    }
    
  
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
      
            if (themeToggle.checked) {
                applyTheme('light');
               
                localStorage.setItem('theme', 'light');
            } else {
                applyTheme('dark');
           
                localStorage.setItem('theme', 'dark');
            }
        });
    }



    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeToggle.checked = true; 
        applyTheme('light');
    } else {
        themeToggle.checked = false; 
        applyTheme('dark'); 
    }


 
    // 7. CHỨC NĂNG KÉO THẢ (RESIZABLE GUTTER)
   

    const gutter = document.getElementById('gutterX');
    const layout = document.querySelector('.layout');

    function handleMouseMove(e) {
   
        let newWorkbenchWidth = e.clientX - layout.getBoundingClientRect().left;
        
     
        if (newWorkbenchWidth < 200) newWorkbenchWidth = 200; 
        if (newWorkbenchWidth > window.innerWidth - 200) newWorkbenchWidth = window.innerWidth - 200; // Tối đa

        const gutterWidth = gutter.offsetWidth;

        layout.style.gridTemplateColumns = `${newWorkbenchWidth}px ${gutterWidth}px 1fr`;
    }

   
    function handleMouseUp() {
       
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        

        document.body.style.cursor = 'default';
   
        layout.style.pointerEvents = 'auto';
    }

 
    if (gutter) {
        gutter.addEventListener('mousedown', (e) => {
            e.preventDefault(); 

           
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
           
            document.body.style.cursor = 'col-resize';
           
            layout.style.pointerEvents = 'none';
        });
    }

});