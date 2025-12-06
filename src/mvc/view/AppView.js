export class AppView {
    constructor() {
        // 1. EDITOR
        this.editor = ace.edit("ace-editor-container");
        this.editor.setTheme("ace/theme/tomorrow_night");
        this.editor.session.setMode("ace/mode/python");
        this.editor.setShowPrintMargin(false);
        this.editor.setFontSize("14px");
        this.editor.setOptions({
            enableBasicAutocompletion: true, enableLiveAutocompletion: true, enableSnippets: true,
            showPrintMargin: false, showGutter: true
        });

        this.isLoginMode = true;
        this.elements = this._getElements();
        this._bindBasicUiEvents();
    }

    // --- HÀM GẮN SỰ KIỆN CHO TỪNG FILE (Thêm vào AppView) ---
    bindSessionEvents(session) {
        // 1. Bắt lỗi cú pháp (Đỏ lòm)
        session.on("changeAnnotation", () => {
            const annotations = session.getAnnotations();
            const errors = annotations.filter(a => a.type === 'error').length;
            this.updateErrorCount(errors);
        });

        // 2. Bắt vị trí con trỏ (Dòng, Cột)
        session.selection.on('changeCursor', () => {
            const pos = session.selection.getCursor();
            if (this.elements.statusCursor) {
                this.elements.statusCursor.textContent = `Ln ${pos.row + 1}, Col ${pos.column + 1}`;
            }
        });
    }
    // ---------------------------------------------------------

    _getElements() {
        return {
            // Sidebar & Main
            fileTree: document.getElementById("fileTree"),
            runBtn: document.getElementById("runBtn"),
            terminal: document.getElementById("terminal"),
            newFileBtn: document.getElementById("newFileBtn"),
            newFolderBtn: document.getElementById("newFolderBtn"),
            refreshBtn: document.getElementById("refreshBtn"),
            collapseBtn: document.getElementById("collapseBtn"),
            saveBtn: document.getElementById("saveBtn"),
            breadcrumbProjectName: document.getElementById("breadcrumbProjectName"),

            // Header & Auth
            signinBtn: document.getElementById("signinBtn"),
            logoutBtn: document.getElementById("logoutBtn"),
            userDisplay: document.getElementById("userDisplay"),
            authModal: document.getElementById("authModal"),
            logoutModal: document.getElementById("logoutModal"),
            projectManagerModal: document.getElementById("projectManagerModal"),
            deleteModal: document.getElementById("deleteConfirmModal"),
            createProjectModal: document.getElementById('createProjectModal'),
            moveModal: document.getElementById('moveConfirmModal'),

            // Auth Form
            authUsername: document.getElementById("authUsername"),
            authPassword: document.getElementById("authPassword"),
            authSubmitBtn: document.getElementById("authSubmitBtn"),
            authCancelBtn: document.getElementById("authCancelBtn"),
            switchAuthMode: document.getElementById("switchAuthMode"),
            authMessage: document.getElementById("authMessage"),
            authTitle: document.getElementById("authTitle"),

            // Project Manager
            projectListContainer: document.getElementById("projectListContainer"),
            pmNewProjectBtn: document.getElementById("pmNewProjectBtn"),
            pmCloseBtn: document.getElementById("pmCloseBtn"),
            pmLogoutBtn: document.getElementById("pmLogoutBtn"),

            // Modal Items
            moveText: document.getElementById('moveConfirmText'),
            btnConfirmMove: document.getElementById('btnConfirmMove'),
            btnCancelMove: document.getElementById('btnCancelMove'),
            dontAskCheckbox: document.getElementById('dontAskMoveAgain'),
            deleteConfirmText: document.getElementById('deleteConfirmText'),
            btnConfirmDelete: document.getElementById('btnConfirmDelete'),
            btnCancelDelete: document.getElementById('btnCancelDelete'),
            newProjectInput: document.getElementById('newProjectInput'),
            btnConfirmCreateProj: document.getElementById('btnConfirmCreateProj'),
            btnCancelCreateProj: document.getElementById('btnCancelCreateProj'),

            // Status Bar
            breadcrumbFile: document.getElementById("breadcrumbFile"),
            statusLang: document.getElementById("statusLang"),
            statusIssues: document.getElementById("statusIssues"),
            statusCursor: document.getElementById("statusCursor"),

            // Others
            actProject: document.getElementById('actProject'),
            actExplorer: document.getElementById('actExplorer'),
            contextMenu: document.getElementById('contextMenu'),
            ctxRename: document.getElementById('ctxRename'),
            ctxDelete: document.getElementById('ctxDelete'),
            ctxDownload: document.getElementById('ctxDownload')
        };
    }

    _bindBasicUiEvents() {
        if (this.elements.authCancelBtn) this.elements.authCancelBtn.onclick = () => this.hideModal('authModal');
        if (this.elements.pmCloseBtn) this.elements.pmCloseBtn.onclick = () => this.hideModal('projectManagerModal');
        if (this.elements.switchAuthMode) {
            this.elements.switchAuthMode.onclick = (e) => {
                e.preventDefault();
                this.isLoginMode = !this.isLoginMode;
                this.elements.authTitle.textContent = this.isLoginMode ? "Đăng nhập" : "Đăng ký";
                this.elements.authSubmitBtn.textContent = this.isLoginMode ? "Đăng nhập" : "Đăng ký";
                this.elements.switchAuthMode.textContent = this.isLoginMode ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập";
                this.showAuthMessage("", "hidden");
            };
        }
    }

    // --- HELPERS HIỂN THỊ ---
    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('hidden');
            if (id === 'deleteConfirmModal' || id === 'createProjectModal') modal.style.zIndex = '99999';
        }
    }
    hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    }
    showAuthMessage(msg, type) {
        const el = this.elements.authMessage;
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden', 'error', 'success');
        if (type !== 'hidden') { el.classList.add(type); el.style.display = 'block'; }
        else { el.style.display = 'none'; }
    }

    toggleAuthUI(isLoggedIn, username) {
        if (isLoggedIn) {
            this.elements.signinBtn.style.display = 'none';
            this.elements.logoutBtn.style.display = 'inline-block';
            this.elements.userDisplay.textContent = `Hi, ${username}`;
            this.elements.userDisplay.style.display = 'inline-block';
        } else {
            this.elements.signinBtn.style.display = 'inline-block';
            this.elements.logoutBtn.style.display = 'none';
            this.elements.userDisplay.style.display = 'none';
        }
    }

    // --- STATUS BAR UPDATES (ĐÃ SỬA) ---
    updateBreadcrumb(path) {
        if (this.elements.breadcrumbFile) this.elements.breadcrumbFile.textContent = path ? path.replace(/\//g, ' › ') : '';

        // Cập nhật Ngôn ngữ
        if (this.elements.statusLang && path) {
            const ext = path.split('.').pop().toLowerCase();
            let lang = 'Plain Text';
            if (ext === 'py') lang = 'Python';
            if (ext === 'js') lang = 'JavaScript';
            if (ext === 'cpp' || ext === 'c') lang = 'C++';
            if (ext === 'java') lang = 'Java';
            if (ext === 'html') lang = 'HTML';
            if (ext === 'css') lang = 'CSS';
            this.elements.statusLang.textContent = lang;
        }
    }

    updateCursor(row, col) {
        if (this.elements.statusCursor) {
            this.elements.statusCursor.textContent = `Ln ${row}, Col ${col}`;
        }
    }

    updateErrorCount(count) {
        const el = this.elements.statusIssues;
        if (!el) return;
        if (count > 0) el.innerHTML = `<span style="color:#ff6b6b; font-weight:bold">⊗ ${count} errors</span>`;
        else el.innerHTML = `<span>✓ 0 errors</span>`;
    }

    updateProjectTitle(name) {
        // Cập nhật tên ở Sidebar (TỆP TIN -> PROJECT: Name)
        const title = document.querySelector('.file-explorer-header span');
        if (title) title.innerHTML = name ? `PROJECT: <span style="color:#007acc">${name}</span>` : 'TỆP TIN';

        // Cập nhật tên ở Breadcrumb (Dòng bạn đang cần)
        if (this.elements.breadcrumbProjectName) {
            this.elements.breadcrumbProjectName.textContent = name || "CodeSparkX";
        }
    }

    // --- CORE RENDER (GIỮ NGUYÊN) ---
    renderTree(vfs, activePath, callbacks) {
        const container = this.elements.fileTree;
        container.innerHTML = '';
        this._renderNode(vfs, container, '', activePath, callbacks);
    }
    _renderNode(treeNode, container, parentPath, activePath, callbacks) {
        const entries = Object.entries(treeNode).sort(([, a], [, b]) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name?.localeCompare(b.name);
        });

        for (const [name, node] of entries) {
            const path = parentPath ? `${parentPath}/${name}` : name;
            const li = document.createElement('li');
            li.draggable = true; li.dataset.path = path;

            li.addEventListener('dragstart', (e) => {
                e.stopPropagation(); e.dataTransfer.setData("text/plain", path); e.dataTransfer.effectAllowed = 'move';
                li.style.opacity = '0.5'; if (callbacks.onDragStart) callbacks.onDragStart(path);
            });
            li.addEventListener('dragend', (e) => {
                e.stopPropagation(); li.style.opacity = '1';
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            if (node.type === 'folder') {
                li.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); li.classList.add('drag-over'); });
                li.addEventListener('dragleave', (e) => { e.stopPropagation(); li.classList.remove('drag-over'); });
                li.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); li.classList.remove('drag-over'); if (callbacks.onDrop) callbacks.onDrop(path); });
            }

            li.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (callbacks.onContextMenu) callbacks.onContextMenu(path, e.clientX, e.clientY);
            });

            const isActive = path === activePath ? 'active' : '';
            if (node.type === 'folder') {
                li.className = 'tree-item-folder open';
                const icon = 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231598/free-folder-icon-1485-thumb_lf9coe.png';
                li.innerHTML = `<div class="tree-item folder"><img src="${icon}" class="file-icon"> ${name}</div><ul class="nested"></ul>`;
                li.querySelector('.tree-item').onclick = (e) => { e.stopPropagation(); li.classList.toggle('open'); };
                const ul = li.querySelector('ul');
                if (node.children) this._renderNode(node.children, ul, path, activePath, callbacks);
            } else {
                const icon = this._getFileIcon(name);
                li.innerHTML = `<div class="tree-item file ${isActive}"><img src="${icon}" class="file-icon"> ${name}</div>`;
                li.querySelector('.tree-item').onclick = (e) => { e.stopPropagation(); if (callbacks.onFileClick) callbacks.onFileClick(path); };
            }
            container.appendChild(li);
        }
    }

    _getFileIcon(filename) {
        const parts = filename.split('.');
        if (parts.length === 1) return 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231397/images_k53nq1.png';
        const ext = parts.pop().toLowerCase();
        const map = { py: 'python', js: 'javascript', html: 'html', css: 'css', java: 'java', cpp: 'cpp' };
        return `https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/${map[ext] || 'file'}.svg`;
    }

    renderProjectList(projects, onSelect, onDelete, onRename) {
        const container = this.elements.projectListContainer;
        if (!container) return;
        container.innerHTML = '';
        if (!projects || projects.length === 0) { container.innerHTML = '<p style="text-align:center;color:#888;margin-top:20px">Chưa có dự án nào.</p>'; return; }

        projects.forEach(p => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.innerHTML = `
                <div class="project-info" style="flex:1;display:flex;align-items:center;">
                    <span style="margin-right:8px">📂</span><span class="project-name-text">${p.name}</span>
                    <input type="text" class="project-rename-input hidden" value="${p.name}">
                </div>
                <div class="project-actions">
                    <button class="action-btn edit-btn">✏️</button><button class="action-btn delete-btn" style="color:#ff6b6b">🗑️</button>
                </div>
            `;
            // (Logic sự kiện rename/delete giữ nguyên như cũ)
            const nameSpan = div.querySelector('.project-name-text');
            const nameInput = div.querySelector('.project-rename-input');
            const editBtn = div.querySelector('.edit-btn');
            const delBtn = div.querySelector('.delete-btn');
            let isSaving = false;

            editBtn.onclick = (e) => { e.stopPropagation(); nameSpan.classList.add('hidden'); nameInput.classList.remove('hidden'); nameInput.focus(); nameInput.select(); };
            const save = () => { if (isSaving) return; const n = nameInput.value.trim(); if (n && n !== p.name) { isSaving = true; onRename(p._id, n); } else { nameSpan.classList.remove('hidden'); nameInput.classList.add('hidden'); } };
            nameInput.onclick = e => e.stopPropagation();
            nameInput.onkeydown = e => { if (e.key === 'Enter') { save(); nameInput.blur(); } if (e.key === 'Escape') { nameInput.value = p.name; nameSpan.classList.remove('hidden'); nameInput.classList.add('hidden'); } };
            nameInput.onblur = () => { if (!isSaving) save(); };
            delBtn.onclick = (e) => { e.stopPropagation(); onDelete(p._id, p.name); };
            div.onclick = () => { if (nameInput.classList.contains('hidden')) onSelect(p._id); };
            container.appendChild(div);
        });
    }

    showCreateProjectModal() {
        this.showModal('createProjectModal');
        const input = document.getElementById('newProjectInput');
        if (input) { input.value = ''; input.focus(); }
    }
    showMoveModal(source, target, onConfirm) {
        this.elements.moveText.textContent = `Di chuyển '${source}' vào '${target}'?`;
        this.showModal('moveConfirmModal');
        const newBtn = this.elements.btnConfirmMove.cloneNode(true);
        this.elements.btnConfirmMove.parentNode.replaceChild(newBtn, this.elements.btnConfirmMove);
        this.elements.btnConfirmMove = newBtn;
        newBtn.onclick = () => { onConfirm(this.elements.dontAskCheckbox.checked); this.hideModal('moveConfirmModal'); };
    }
    showInlineInput(type, onCommit) {
        const li = document.createElement('li');
        li.className = 'tree-item-input-wrapper';
        li.innerHTML = `<input type="text" class="tree-item-input" placeholder="${type}">`;
        const input = li.querySelector('input');
        this.elements.fileTree.insertBefore(li, this.elements.fileTree.firstChild);
        input.focus();
        let committed = false;
        const commit = () => { if (committed) return; committed = true; const v = input.value.trim(); if (v) onCommit(v); li.remove(); };
        input.onkeydown = (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { committed = true; li.remove(); } };
        input.onblur = () => { if (!committed) li.remove(); };
    }
    triggerFileRename(path, onCommit) {
        const lis = Array.from(this.elements.fileTree.querySelectorAll('li'));
        const li = lis.find(el => el.dataset.path === path);
        if (!li) return;
        const contentDiv = li.querySelector('.tree-item'); // div chứa icon+tên (file)
        // Folder có cấu trúc khác: li > div.tree-item.folder

        const oldHTML = contentDiv.innerHTML;
        const currentName = path.split('/').pop();
        contentDiv.innerHTML = `<input type="text" class="tree-item-input" value="${currentName}" style="width:100%">`;
        const input = contentDiv.querySelector('input');
        input.focus(); input.select();

        let committed = false;
        const finish = () => { if (committed) return; committed = true; const v = input.value.trim(); if (v && v !== currentName) onCommit(v); else contentDiv.innerHTML = oldHTML; };
        input.onclick = e => e.stopPropagation();
        input.onkeydown = e => { if (e.key === 'Enter') finish(); if (e.key === 'Escape') { committed = true; contentDiv.innerHTML = oldHTML; } };
        input.onblur = finish;
    }

    clearTerminal() { if (this.elements.terminal) this.elements.terminal.innerHTML = ''; }
    logTerminal(msg, type = 'info') {
        const color = type === 'error' ? '#ff6b6b' : '#cccccc';
        this.elements.terminal.innerHTML += `<div style="color:${color}; margin-bottom:2px;">${msg}</div>`;
        this.elements.terminal.scrollTop = this.elements.terminal.scrollHeight;
    }
    // Trong class AppView

    renderMainEditor(activeFile) {
        // Lấy đúng element từ this.elements hoặc getElementById
        const emptyState = document.getElementById('empty-state');
        const editorContainer = document.getElementById('ace-editor-container');

        if (activeFile) {
            // == CÓ FILE ==
            // 1. Ẩn Logo
            if (emptyState) emptyState.classList.add('hidden');

            // 2. Hiện Editor
            if (editorContainer) editorContainer.classList.remove('hidden');

            // 3. Set nội dung file vào Editor
            // Dùng -1 để con trỏ chuột ko bị nhảy linh tinh
            if (activeFile.content !== undefined) {
                this.editor.setValue(activeFile.content, -1);
            }

            // 4. Update Breadcrumb
            this.updateBreadcrumb(activeFile.path); // Hàm bạn đã có

            // 5. CỰC KỲ QUAN TRỌNG: Resize lại Ace Editor
            // Nếu không có dòng này, Editor hiện ra sẽ bị trắng bóc hoặc méo mó
            this.editor.resize();
            this.editor.focus();

        } else {
            // == KHÔNG CÓ FILE (Về màn hình chờ) ==
            if (emptyState) emptyState.classList.remove('hidden');
            if (editorContainer) editorContainer.classList.add('hidden');
            this.updateBreadcrumb(''); // Xóa breadcrumb
        }
    }
}
