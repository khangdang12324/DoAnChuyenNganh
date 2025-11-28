export class AppView {
    constructor() {
        this.editor = ace.edit("editor");
        this.editor.setTheme("ace/theme/monokai");
        this.editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            fontSize: "14pt",
        });

        this.elements = {
            runBtn: document.getElementById("runBtn"),
            terminal: document.getElementById("terminal"),
            fileTree: document.getElementById("fileTree"),
            tabs: document.getElementById("tabs"),
            newFileBtn: document.getElementById("newFileBtn"),
            newFolderBtn: document.getElementById("newFolderBtn"),
            refreshBtn: document.getElementById("refreshBtn"),
            collapseBtn: document.getElementById("collapseBtn"),
            themeToggle: document.getElementById("themeToggle"),
        };
    }

    renderTree(vfs, onFileClick) {
        this.elements.fileTree.innerHTML = '';
        Object.keys(vfs).sort().forEach(filename => {
            const li = document.createElement('li');
            li.className = 'tree-item file';
            li.innerHTML = '<span class= "icon">📄</span>' + filename;
            li.onclick = () => onFileClick(filename);
            this.elements.fileTree.appendChild(li);
        });
    }

    renderTabs(activeFilename, openFiles, onTabClick, onCloseClick) {
        this.elements.tabs.innerHTML = '';
        openFiles.forEach(filename => {
            const btn = document.createElement('button');
            btn.className = 'file-tab' + (filename === activeFilename ? ' active' : '');
            btn.innerHTML =
                `<span class="name">${filename}</span>
            <span class="close-btn" title="Đóng tệp tin">×</span>`;
            btn.onclick = () => onTabClick(filename);
            btn.querySelector('.close-btn').onclick = (e) => {
                e.stopPropagation();
                onCloseClick(filename);
            };
            this.elements.tabs.appendChild(btn);
        });
    }

    logTerminal(type, message) {
        let colorClass = type === 'error' ? 'terminal-error' :
            type === 'info' ? 'terminal-info' : 'terminal-output';

        const safeText = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.elements.terminal.innerHTML += `<span class="${colorClass}">${safeText}</span>\n`;
        this.elements.terminal.scrollTop = this.elements.terminal.scrollHeight;
    }

    toggleTheme(isLight) {
        if (isLight) {
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
            this.editor.setTheme("ace/theme/github");
        } else {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
            this.editor.setTheme("ace/theme/monokai");
        }
    }   
}