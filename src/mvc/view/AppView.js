export class AppView {
    constructor() {
        this.editor = ace.edit("editor");
        this.editor.setTheme("ace/theme/monokai");
        this.editor.session.setMode("ace/mode/python");
        this.editor.setFontSize("14px");
        this.editor.setOptions({
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: true,
            enableSnippets: true,
            showPrintMargin: false,
            showGutter: true
        });
        this.isLoginMode = true;
        this.elements = this._getElements();
        this._bindBasicUiEvents();
    }

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

            // Header & Auth
            signinBtn: document.getElementById("signinBtn"),
            logoutBtn: document.getElementById("logoutBtn"),
            userDisplay: document.getElementById("userDisplay"),
            
            // Modals
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
            
            // Modal Move
            moveText: document.getElementById('moveConfirmText'),
            btnConfirmMove: document.getElementById('btnConfirmMove'),
            btnCancelMove: document.getElementById('btnCancelMove'),
            dontAskCheckbox: document.getElementById('dontAskMoveAgain'),
            
            // Modal Delete & Create
            deleteConfirmText: document.getElementById('deleteConfirmText'),
            btnConfirmDelete: document.getElementById('btnConfirmDelete'),
            btnCancelDelete: document.getElementById('btnCancelDelete'),
            
            newProjectInput: document.getElementById('newProjectInput'),
            btnConfirmCreateProj: document.getElementById('btnConfirmCreateProj'),
            btnCancelCreateProj: document.getElementById('btnCancelCreateProj'),
            
            // UI khác
            breadcrumbFile: document.getElementById("breadcrumbFile"),
            statusLang: document.getElementById("statusLang"),
            actProject: document.getElementById('actProject'),
            actExplorer: document.getElementById('actExplorer'),
            contextMenu: document.getElementById('contextMenu'),
            ctxRename: document.getElementById('ctxRename'),
            ctxDelete: document.getElementById('ctxDelete'),
            statusIssues: document.getElementById('statusIssues')
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
            if (id === 'deleteConfirmModal' || id === 'createProjectModal') {
                modal.style.zIndex = '99999'; 
            }
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
        if (type !== 'hidden') {
            el.classList.add(type);
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
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

    updateBreadcrumb(path) {
        if (this.elements.breadcrumbFile) this.elements.breadcrumbFile.textContent = path ? path.replace(/\//g, ' › ') : '';
        if (this.elements.statusLang && path) this.elements.statusLang.textContent = path.split('.').pop().toUpperCase();
    }

    updateProjectTitle(name) {
        const titleElement = document.querySelector('.file-explorer-header > span');
        
        if (titleElement) {
            if (name) {
                titleElement.title = name; 
                
                titleElement.innerHTML = `
                    PROJECT: <span style="color: #4ec9b0; font-weight: bold;">${name}</span>
                `;
            } else {
                titleElement.removeAttribute('title');
                titleElement.innerHTML = `
                    PROJECT: <span style="color: #008c8c; font-weight: 900; letter-spacing: 1px;"></span>
                `;
            }
        }
    }

    // --- VẼ CÂY THƯ MỤC (CORE) ---
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

            // Drag & Drop Setup
            li.draggable = true;
            li.dataset.path = path;

            li.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData("text/plain", path);
                e.dataTransfer.effectAllowed = 'move';
                li.style.opacity = '0.5';
                if(callbacks.onDragStart) callbacks.onDragStart(path);
            });

            li.addEventListener('dragend', (e) => {
                e.stopPropagation();
                li.style.opacity = '1';
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            if (node.type === 'folder') {
                li.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); li.classList.add('drag-over'); });
                li.addEventListener('dragleave', (e) => { e.stopPropagation(); li.classList.remove('drag-over'); });
                li.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); li.classList.remove('drag-over'); if(callbacks.onDrop) callbacks.onDrop(path); });
            }

            // Context Menu
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                if(callbacks.onContextMenu) callbacks.onContextMenu(path, e.clientX, e.clientY);
            });

            // Hiển thị
            if (node.type === 'folder') {
                li.className = 'tree-item-folder open';
                const icon = 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231598/free-folder-icon-1485-thumb_lf9coe.png';
                li.innerHTML = `<div class="tree-item folder"><img src="${icon}" class="file-icon"> ${name}</div><ul class="nested"></ul>`;
                li.querySelector('.tree-item').onclick = (e) => { e.stopPropagation(); li.classList.toggle('open'); };
                
                const ul = li.querySelector('ul');
                if (node.children) this._renderNode(node.children, ul, path, activePath, callbacks);
            } else {
                const isActive = path === activePath ? 'active' : '';
                const icon = this._getFileIcon(name);
                li.innerHTML = `<div class="tree-item file ${isActive}"><img src="${icon}" class="file-icon"> ${name}</div>`;
                li.querySelector('.tree-item').onclick = (e) => { e.stopPropagation(); if(callbacks.onFileClick) callbacks.onFileClick(path); };
            }
            container.appendChild(li);
        }
    }

    _getFileIcon(filename) {
        const parts = filename.split('.');
        if (parts.length === 1) return 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231397/images_k53nq1.png';
        const ext = parts.pop().toLowerCase();
        const map = { py: 'python', js: 'javascript', html: 'html', css: 'css', java: 'java', cpp: 'cpp' };
        return `https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/${map[ext]||'file'}.svg`;
    }

  // --- RENDER DANH SÁCH DỰ ÁN (CLEAN VERSION) ---
    renderProjectList(projects, onSelect, onDelete, onRename) {
        const container = this.elements.projectListContainer;
        if (!container) return;
        container.innerHTML = '';

        if (!projects || projects.length === 0) {
            container.innerHTML = '<p class="empty-list-msg">Chưa có dự án nào.</p>';
            return;
        }

        projects.forEach(p => {
            const div = document.createElement('div');
            div.className = 'project-item'; // <--- Class này sẽ được style trong CSS
            
            div.innerHTML = `
                <div class="project-info">
                    <span class="project-icon">📂</span>
                    <span class="project-name-text">${p.name}</span>
                    <input type="text" class="project-rename-input hidden" value="${p.name}">
                </div>
                
                <div class="project-meta">
                    <small class="project-date">${new Date(p.lastSaved).toLocaleDateString()}</small>
                    <div class="project-actions">
                        <button class="action-btn edit-btn" title="Đổi tên">✏️</button>
                        <button class="action-btn delete-btn" title="Xóa">🗑️</button>
                    </div>
                </div>
            `;

            // --- LOGIC SỰ KIỆN (Giữ nguyên logic cũ) ---
            const nameSpan = div.querySelector('.project-name-text');
            const nameInput = div.querySelector('.project-rename-input');
            const editBtn = div.querySelector('.edit-btn');
            const delBtn = div.querySelector('.delete-btn');

            let isSaving = false;

            // Đổi tên
            editBtn.onclick = (e) => {
                e.stopPropagation();
                nameSpan.classList.add('hidden');
                nameInput.classList.remove('hidden');
                nameInput.focus();
                nameInput.select();
            };

            const saveName = () => {
                if (isSaving) return;
                const newName = nameInput.value.trim();
                if (newName && newName !== p.name) {
                    isSaving = true;
                    onRename(p._id, newName);
                } else {
                    nameSpan.classList.remove('hidden');
                    nameInput.classList.add('hidden');
                }
            };

            nameInput.onclick = (e) => e.stopPropagation();
            nameInput.onkeydown = (e) => {
                if (e.key === 'Enter') { saveName(); nameInput.blur(); }
                if (e.key === 'Escape') {
                    nameInput.value = p.name;
                    nameSpan.classList.remove('hidden');
                    nameInput.classList.add('hidden');
                }
            };
            nameInput.onblur = () => { if(!isSaving) saveName(); };

            // Xóa
            delBtn.onclick = (e) => {
                e.stopPropagation();
                onDelete(p._id, p.name);
            };

            // Chọn
            div.onclick = () => {
                if (nameInput.classList.contains('hidden')) onSelect(p._id);
            };
            
            container.appendChild(div);
        });
    }
    // --- CÁC HÀM KHÁC ---
    showCreateProjectModal() {
        this.showModal('createProjectModal');
        const input = document.getElementById('newProjectInput');
        if(input) { input.value = ''; input.focus(); }
    }

    showMoveModal(source, target, onConfirm) {
        const { moveModal, moveText, btnConfirmMove, dontAskCheckbox } = this.elements;
        if (!moveModal) return;
        moveText.textContent = `Di chuyển '${source}' vào '${target}'?`;
        moveModal.classList.remove('hidden');
        
        const newBtn = btnConfirmMove.cloneNode(true);
        btnConfirmMove.parentNode.replaceChild(newBtn, btnConfirmMove);
        this.elements.btnConfirmMove = newBtn;

        newBtn.onclick = () => {
            const dontAsk = dontAskCheckbox.checked;
            onConfirm(dontAsk);
            this.hideModal('moveConfirmModal');
        };
    }

   // --- 1. TẠO FILE/FOLDER MỚI (INLINE) ---
    showInlineInput(type, onCommit) {
        // Xóa các ô input cũ nếu còn sót lại
        const oldInput = this.elements.fileTree.querySelector('.tree-item-input-wrapper');
        if (oldInput) oldInput.remove();

        const li = document.createElement('li');
        li.className = 'tree-item-input-wrapper'; // Class này phải có trong CSS
        
        // HTML gọn gàng: Icon + Input
        const icon = type === 'file' 
            ? 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231397/images_k53nq1.png' 
            : 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231598/free-folder-icon-1485-thumb_lf9coe.png';
            
        li.innerHTML = `
            <div class="tree-item" style="padding-left: 10px;">
                <img src="${icon}" class="file-icon">
                <input type="text" class="tree-item-input" placeholder="${type}" style="width: 120px;">
            </div>
        `;

        // Chèn lên đầu danh sách
        this.elements.fileTree.insertBefore(li, this.elements.fileTree.firstChild);
        
        const input = li.querySelector('input');
        input.focus();

        let isCommitted = false;

        // Hàm xử lý khi xong
        const finish = () => {
            if (isCommitted) return;
            isCommitted = true;
            const name = input.value.trim();
            if (name) onCommit(name); // Gọi Controller
            li.remove(); // Xóa ô nhập
        };

        // Sự kiện bàn phím
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Quan trọng: Không để lan ra ngoài
            if (e.key === 'Enter') {
                finish();
            } else if (e.key === 'Escape') {
                isCommitted = true;
                li.remove(); // Hủy
            }
        });

        // Sự kiện mất focus (Click ra ngoài)
        input.addEventListener('blur', () => {
            // Delay nhẹ để tránh xung đột nếu click vào nút khác
            setTimeout(finish, 100);
        });
    }

    // --- 2. ĐỔI TÊN FILE/FOLDER (RENAME) ---
    triggerFileRename(path, onCommit) {
        // Tìm thẻ LI đang chứa file này
        const li = this.elements.fileTree.querySelector(`li[data-path="${path}"]`);
        if (!li) return;

        // Tìm thẻ div chứa nội dung (icon + tên)
        const contentDiv = li.querySelector('.tree-item');
        if (!contentDiv) return;

        const oldHTML = contentDiv.innerHTML; // Lưu lại để restore nếu hủy
        const currentName = path.split('/').pop();

        // Thay thế nội dung bằng Input
        contentDiv.innerHTML = `
            <img src="${this._getFileIcon(currentName)}" class="file-icon">
            <input type="text" class="tree-item-input" value="${currentName}" style="width: 120px;">
        `;

        const input = contentDiv.querySelector('input');
        input.focus();
        input.select();

        let isCommitted = false;

        const finish = () => {
            if (isCommitted) return;
            isCommitted = true;
            const newName = input.value.trim();
            
            if (newName && newName !== currentName) {
                onCommit(newName); // Gọi Controller đổi tên
            } else {
                contentDiv.innerHTML = oldHTML; // Trả lại như cũ
            }
        };

        input.addEventListener('click', (e) => e.stopPropagation()); // Chặn click mở file
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') {
                isCommitted = true;
                contentDiv.innerHTML = oldHTML; // Hủy
            }
        });
        input.addEventListener('blur', () => setTimeout(finish, 100));
    }

 
    // --- XỬ LÝ TERMINAL ĐẸP ---
    
    clearTerminal() {
        if (this.elements.terminal) {
            this.elements.terminal.innerHTML = '';
        }
    }


  // --- THÊM HÀM NÀY ---
    clearTerminal() {
        if (this.elements.terminal) {
            this.elements.terminal.innerHTML = '';
        }
    }

    // --- SỬA HÀM NÀY THÀNH ĐƠN GIẢN ---
    logTerminal(msg, type = 'info') {
        const color = type === 'error' ? '#ff6b6b' : '#cccccc'; // Đỏ nếu lỗi, Trắng xám nếu thường
        // Chỉ in chữ, không HTML phức tạp
        this.elements.terminal.innerHTML += `<div style="color:${color}; margin-bottom: 2px;">${msg}</div>`;
        this.elements.terminal.scrollTop = this.elements.terminal.scrollHeight;
    }
    // Hàm xóa sạch (Clear)
    clearTerminal() {
        if (this.elements.terminal) this.elements.terminal.innerHTML = '';
    }

    // Hàm xóa sạch Terminal (nếu muốn nút Clear)
    clearTerminal() {
        if(this.elements.terminal) this.elements.terminal.innerHTML = '';
    }

    // --- HIỆN Ô NHẬP ĐỔI TÊN TRÊN CÂY THƯ MỤC ---
    triggerInlineRename(path, onCommit) {
        // Tìm thẻ LI tương ứng với path
        // (Lưu ý: _renderNode phải gán data-path cho li thì mới tìm được)
        const li = this.elements.fileTree.querySelector(`li[data-path="${path}"]`);
        if (!li) return;

        const nameDiv = li.querySelector('.tree-item'); // Div chứa icon và tên
        const oldHTML = nameDiv.innerHTML; // Lưu lại HTML cũ để nếu hủy thì restore
        const currentName = path.split('/').pop();

        // Thay nội dung bằng Input
        nameDiv.innerHTML = `
            <input type="text" class="tree-item-input" value="${currentName}" style="margin-left: 20px; width: calc(100% - 30px);">
        `;
        
        const input = nameDiv.querySelector('input');
        input.focus();
        input.select();

        // Hàm lưu
        let isCommitted = false;
        const commit = () => {
            if (isCommitted) return;
            isCommitted = true;
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                onCommit(newName);
            } else {
                nameDiv.innerHTML = oldHTML; // Trả lại như cũ
            }
        };

        // Sự kiện
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
                isCommitted = true;
                nameDiv.innerHTML = oldHTML; // Hủy
            }
        });
        input.addEventListener('blur', () => commit());
    }
}