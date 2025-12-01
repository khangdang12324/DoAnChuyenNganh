export class AppView {
    constructor() {
        // Khởi tạo Editor
        this.editor = ace.edit("editor");
        this.editor.setTheme("ace/theme/monokai");
        this.editor.session.setMode("ace/mode/python");
        this.editor.setOptions({ enableBasicAutocompletion: true, enableLiveAutocompletion: true, fontSize: "14px" });

        // DOM Elements
        this.elements = {
            fileTree: document.getElementById("fileTree"),
            runBtn: document.getElementById("runBtn"),
            terminal: document.getElementById("terminal"),
            newFileBtn: document.getElementById("newFileBtn"),
            newFolderBtn: document.getElementById("newFolderBtn"),
            refreshBtn: document.getElementById("refreshBtn"),
            collapseBtn: document.getElementById("collapseBtn")
        };
    }

    // Vẽ cây thư mục (Đệ quy)
    renderTree(vfs, activePath, onFileClick) {
        this.elements.fileTree.innerHTML = '';
        this._renderNode(vfs, this.elements.fileTree, '', activePath, onFileClick);
    }

    _renderNode(treeNode, container, parentPath, activePath, onFileClick) {
        const entries = Object.entries(treeNode).sort(([, a], [, b]) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name?.localeCompare(b.name);
        });

        for (const [name, node] of entries) {
            const path = parentPath ? `${parentPath}/${name}` : name;
            const li = document.createElement('li');
            
            if (node.type === 'folder') {
                li.className = 'tree-item-folder open';
                li.innerHTML = `<div class="tree-item folder">📁 ${name}</div><ul class="nested"></ul>`;
                li.querySelector('.tree-item').onclick = (e) => {
                    e.stopPropagation();
                    li.classList.toggle('open');
                };
                const ul = li.querySelector('ul');
                if (node.children) this._renderNode(node.children, ul, path, activePath, onFileClick);
            } else {
                const isActive = path === activePath ? 'active' : '';
                // Bạn có thể thêm hàm getIcon ở đây sau
                li.innerHTML = `<div class="tree-item file ${isActive}">📄 ${name}</div>`;
                li.onclick = (e) => {
                    e.stopPropagation();
                    onFileClick(path); // Gọi ngược về Controller
                };
            }
            container.appendChild(li);
        }
    }

    logTerminal(message, type = 'info') {
        let color = type === 'error' ? 'color: #ff6b6b;' : 'color: #cfe8ff;';
        this.elements.terminal.innerHTML += `<div style="${color}">${message}</div>`;
    }
}