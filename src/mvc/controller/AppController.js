import { ProjectModel } from '../model/ProjectModel.js';
import { AppView } from '../view/AppView.js';

export class AppController {
    constructor() {
        this.model = new ProjectModel();
        this.view = new AppView();
        this.draggedPath = null;
        this.contextMenuTarget = null;
        this.clipboard = null; // { action: 'copy'|'cut', path: '...' }
    }

    async init() {
        console.log("🚀 MVC Controller: Full Features (Shortcuts + No Alert)");
        this.setupEvents();

        if (this.model.token) {
            this.view.toggleAuthUI(true, this.model.username);
            await this.loadAndShowProjects();
        } else {
            const saved = localStorage.getItem('ide_vfs');
            if (saved) this.model.vfs = JSON.parse(saved);
            this.updateFileTreeUI();
            this.switchFile('main.py');
            this.view.updateProjectTitle("CodeSparkX"); // Mặc định cho khách
        }
    }

    // --- GẮN SỰ KIỆN ---
    setupEvents() {
        // 1. Phím tắt (Shortcuts)
        document.addEventListener('keydown', (e) => {
            // Ctrl+S: Lưu (Luôn hoạt động)
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.handleSaveProject();
                return;
            }

            // Các phím tắt khác chỉ chạy khi KHÔNG focus vào Editor/Input
            const isEditorFocused = this.view.editor.isFocused();
            if (isEditorFocused || e.target.tagName === 'INPUT') return;

            if (!this.contextMenuTarget) return; // Phải chọn 1 file trước

            if (e.ctrlKey && e.key === 'c') this.handleCopy();
            else if (e.ctrlKey && e.key === 'x') this.handleCut();
            else if (e.ctrlKey && e.key === 'v') this.handlePaste();
            else if (e.key === 'Delete') this.handleDeleteRequest();
            else if (e.key === 'F2') this.handleRenameRequest();
            const ctxDownload = document.getElementById('ctxDownload');

            
        });

        // 2. Context Menu (Click)
        const els = this.view.elements;
        if (els.ctxDownload) els.ctxDownload.onclick = () => this.handleDownload();
        if (els.ctxDelete) els.ctxDelete.onclick = () => this.handleDeleteRequest();
        if (els.ctxRename) els.ctxRename.onclick = () => this.handleRenameRequest();
        if (ctxDownload) {
                ctxDownload.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.handleDownload();
                });
            }
        // Các nút Copy/Cut/Paste trong menu (nếu có HTML)
        const ctxCopy = document.getElementById('ctxCopy');
        const ctxCut = document.getElementById('ctxCut');
        const ctxPaste = document.getElementById('ctxPaste');
        if (ctxCopy) ctxCopy.onclick = () => this.handleCopy();
        if (ctxCut) ctxCut.onclick = () => this.handleCut();
        if (ctxPaste) ctxPaste.onclick = () => this.handlePaste();

        // 3. Gọi các nhóm sự kiện khác
        this._bindSidebarEvents();
        this._bindActionEvents();
        this._bindAuthEvents();
        this._bindProjectEvents();
        this._bindLayoutEvents();
        this._bindEditorEvents();
        this._bindContextMenuEvents(); // Logic ẩn hiện menu
    }

    // --- LOGIC COPY / CUT / PASTE / DOWNLOAD ---

    handleCopy() {
        if (!this.contextMenuTarget) return;
        this.clipboard = { action: 'copy', path: this.contextMenuTarget };
        this.view.hideModal('contextMenu');
    }

    handleCut() {
        if (!this.contextMenuTarget) return;
        this.clipboard = { action: 'cut', path: this.contextMenuTarget };
        this.view.hideModal('contextMenu');

    }

    handlePaste() {
        if (!this.clipboard || !this.contextMenuTarget) return;

        // Xác định folder đích
        let targetFolder = this.contextMenuTarget;
        const node = this.model.findNode(targetFolder);

        // Nếu paste vào file -> Paste vào folder cha của file đó
        if (node && node.node.type === 'file') {
            const parts = targetFolder.split('/');
            parts.pop();
            targetFolder = parts.join('/');
        }

        let res;
        if (this.clipboard.action === 'cut') {
            res = this.model.moveItem(this.clipboard.path, targetFolder);
            this.clipboard = null; // Cut xong thì xóa
        } else {
            res = this.model.copyItem(this.clipboard.path, targetFolder);
        }

        if (res.success) {
            this.updateFileTreeUI();
            this.view.hideModal('contextMenu');

        } else {
            this.view.logTerminal(res.message, 'error');
        }
    }

    // --- XỬ LÝ TẢI FILE ---
    handleDownload() {
        // 1. Ẩn menu
        const menu = document.getElementById('contextMenu');
        if (menu) menu.classList.add('hidden');

        const path = this.contextMenuTarget;
        if (!path) return console.error("Không tìm thấy file mục tiêu");

        const nodeInfo = this.model.findNode(path);

        // Chỉ tải FILE
        if (nodeInfo && nodeInfo.node.type === 'file') {
            try {
                let content = nodeInfo.node.content;

                // Nếu file đang mở, lấy nội dung mới nhất từ Editor
                if (this.model.fileSessions[path]) {
                    content = this.model.fileSessions[path].getValue();
                }

                // Tạo Blob và tải
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = nodeInfo.name; // Tên file tải xuống
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.view.logTerminal(`Đã tải xuống: ${nodeInfo.name}`, "success");

            } catch (err) {
                console.error(err);
                this.view.logTerminal("Lỗi khi tạo file tải về!", "error");
            }
        } else {
            this.view.logTerminal("Chỉ hỗ trợ tải tệp tin (File), không tải được thư mục.", "warn");
        }
    }

    handleRenameRequest() {
        this.view.hideModal('contextMenu');
        if (this.contextMenuTarget) {
            this.view.triggerInlineRename(this.contextMenuTarget, (newName) => {
                const res = this.model.renameItem(this.contextMenuTarget, newName);
                if (res.success) this.updateFileTreeUI();
                else this.view.logTerminal(res.message, "error");
            });
        }
    }

    handleDeleteRequest() {
        this.view.hideModal('contextMenu');
        if (this.contextMenuTarget) {
            const node = this.model.findNode(this.contextMenuTarget);
            if (node) {
                this.view.elements.deleteConfirmText.textContent = `Xóa '${node.name}'?`;
                this.view.showModal('deleteConfirmModal');

                // Override nút xóa
                const btnConfirm = this.view.elements.btnConfirmDelete;
                const newBtn = btnConfirm.cloneNode(true);
                btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
                this.view.elements.btnConfirmDelete = newBtn;

                newBtn.onclick = () => {
                    delete node.parent[node.name];
                    this.handleSaveProject();
                    this.updateFileTreeUI();
                    this.view.hideModal('deleteConfirmModal');
                    this.view.logTerminal(`Đã xóa: ${node.name}`, "info");
                };

                // Nút hủy
                const btnCancel = this.view.elements.btnCancelDelete;
                btnCancel.onclick = () => this.view.hideModal('deleteConfirmModal');
            }
        }
    }

    // --- BINDINGS CŨ (ĐƯỢC GỌI TRONG setupEvents) ---
    _bindEditorEvents() {
        let saveTimeout;
        this.view.editor.on('input', () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => this.handleSaveProject(), 2000);
        });
    }

    _bindSidebarEvents() {
        const els = this.view.elements;
        if (els.refreshBtn) els.refreshBtn.addEventListener('click', () => this.updateFileTreeUI());
        if (els.newFileBtn) els.newFileBtn.addEventListener('click', (e) => { e.stopPropagation(); this.view.showInlineInput('file', (n) => this.handleCreateItem(n, 'file')); });
        if (els.newFolderBtn) els.newFolderBtn.addEventListener('click', (e) => { e.stopPropagation(); this.view.showInlineInput('folder', (n) => this.handleCreateItem(n, 'folder')); });
        if (els.collapseBtn) els.collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); document.querySelectorAll('.tree-item-folder.open').forEach(el => el.classList.remove('open')); });
    }

    _bindActionEvents() {
        const els = this.view.elements;
        if (els.runBtn) els.runBtn.addEventListener('click', (e) => { e.preventDefault(); this.runCode(); });
        if (els.saveBtn) els.saveBtn.addEventListener('click', () => this.handleSaveProject());
    }

    _bindAuthEvents() {
        const els = this.view.elements;
        if (els.authSubmitBtn) els.authSubmitBtn.addEventListener('click', () => this.handleAuth());
        if (els.signinBtn) els.signinBtn.addEventListener('click', () => this.view.showModal('authModal'));
        if (els.logoutBtn) els.logoutBtn.addEventListener('click', () => this.view.showModal('logoutModal'));

        const btnConfirm = document.getElementById('btnConfirmLogout');
        if (btnConfirm) btnConfirm.addEventListener('click', () => this.handleLogout());

        const btnCancel = document.getElementById('btnCancelLogout');
        if (btnCancel) btnCancel.addEventListener('click', () => this.view.hideModal('logoutModal'));
    }

    _bindProjectEvents() {
        const els = this.view.elements;
        if (els.pmNewProjectBtn) els.pmNewProjectBtn.addEventListener('click', () => this.view.showCreateProjectModal());

        if (els.actProject) {
            els.actProject.addEventListener('click', () => {
                if (!this.model.token) {
                    this.view.showModal('authModal');
                    this.view.showAuthMessage("Vui lòng đăng nhập!", "error");
                } else {
                    this.loadAndShowProjects();
                }
            });
        }

        if (els.pmLogoutBtn) els.pmLogoutBtn.addEventListener('click', () => this.handleLogout());

        // Modal Tạo Dự Án
        const btnCreateProj = document.getElementById('btnConfirmCreateProj');
        const btnCancelProj = document.getElementById('btnCancelCreateProj');
        if (btnCreateProj) btnCreateProj.onclick = () => this.submitCreateProject();
        if (btnCancelProj) btnCancelProj.onclick = () => this.view.hideModal('createProjectModal');
    }

    // --- GẮN SỰ KIỆN CHO MENU CHUỘT PHẢI (ĐẦY ĐỦ) ---
    _bindContextMenuEvents() {
        const els = this.view.elements;

        // 1. Xóa
        if (els.ctxDelete) {
            els.ctxDelete.onclick = () => this.handleDeleteRequest();
        }

        // 2. Đổi tên
        if (els.ctxRename) {
            els.ctxRename.onclick = () => this.handleRenameRequest();
        }

        // 3. Tải về (BẠN ĐANG THIẾU CÁI NÀY)
        if (els.ctxDownload) {
            els.ctxDownload.onclick = () => {
                console.log("Bấm nút Tải về"); // Debug
                this.handleDownload();
            };
        }

        // 4. Copy / Cut / Paste (Nếu có)
        const ctxCopy = document.getElementById('ctxCopy');
        const ctxCut = document.getElementById('ctxCut');
        const ctxPaste = document.getElementById('ctxPaste');

        if (ctxCopy) ctxCopy.onclick = () => this.handleCopy();
        if (ctxCut) ctxCut.onclick = () => this.handleCut();
        if (ctxPaste) ctxPaste.onclick = () => this.handlePaste();

        // 5. Đóng menu khi click ra ngoài
        document.addEventListener('click', (e) => {
            const menu = document.getElementById('contextMenu');
            // Chỉ đóng nếu click KHÔNG phải vào menu
            if (menu && !menu.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
    }

    _bindLayoutEvents() {
        const statusIssues = document.getElementById('statusIssues');
        if (statusIssues) statusIssues.addEventListener('click', () => this.toggleTerminal());

        const actExplorer = document.getElementById('actExplorer');
        if (actExplorer) actExplorer.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSidebar(); });

        this._setupGutterResize();
    }

    _setupGutterResize() {
        const gutter = document.getElementById('gutterX');
        const layout = document.querySelector('.layout');
        if (gutter && layout) {
            let isResizing = false;
            gutter.addEventListener('mousedown', (e) => {
                e.preventDefault(); isResizing = true; gutter.classList.add('dragging');
                const isMobile = window.innerWidth <= 1024;
                document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
                const move = (ev) => {
                    if (!isResizing) return;
                    if (window.innerWidth <= 1024) {
                        let h = window.innerHeight - ev.clientY;
                        if (h < 50) h = 50;
                        layout.style.setProperty('grid-template-rows', `1fr 10px ${h}px`, 'important');
                    } else {
                        let w = window.innerWidth - ev.clientX;
                        if (w < 50) w = 50;
                        const sbW = (document.querySelector('.file-explorer').style.display !== 'none') ? "220px" : "0px";
                        layout.style.setProperty('grid-template-columns', `50px ${sbW} 1fr 10px ${w}px`, 'important');
                    }
                    if (this.view.editor) this.view.editor.resize();
                };
                const up = () => { isResizing = false; gutter.classList.remove('dragging'); document.body.style.cursor = 'default'; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
                document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
            });
        }
    }

    // --- LOGIC HANDLERS ---

    async handleAuth() {
        const u = this.view.elements.authUsername.value;
        const p = this.view.elements.authPassword.value;
        if (!u || !p) return this.view.showAuthMessage("Nhập đủ thông tin!", "error");

        const res = this.view.isLoginMode ? await this.model.login(u, p) : await this.model.register(u, p);
        if (res.success) {
            this.view.showAuthMessage("Thành công!", "success");
            setTimeout(() => {
                this.view.hideModal('authModal');
                this.view.toggleAuthUI(true, this.model.username);
                if (this.view.isLoginMode) this.loadAndShowProjects();
            }, 1000);
        } else {
            this.view.showAuthMessage(res.message, "error");
        }
    }

    handleLogout() {
        this.model.logout();
        this.view.toggleAuthUI(false);
        this.view.editor.setValue("");
        this.view.hideModal('logoutModal');
        this.view.hideModal('projectManagerModal');
        this.updateFileTreeUI();
        this.switchFile('main.py');
        this.view.updateProjectTitle("CodeSparkX");
        this.view.logTerminal("Đã đăng xuất.", "info");
    }

    async loadAndShowProjects() {
        const list = await this.model.fetchProjects();
        this.view.renderProjectList(
            list,
            (id) => this.handleSelectProject(id),
            (id, name) => this.handleDeleteProject(id, name),
            (id, name) => this.handleRenameProject(id, name)
        );
        this.view.showModal('projectManagerModal');
    }

    async handleSelectProject(id) {
        if (await this.model.loadProject(id)) {
            this.view.hideModal('projectManagerModal');
            this.updateFileTreeUI();
            this.view.editor.setValue("");
            const first = Object.keys(this.model.vfs).find(k => this.model.vfs[k].type === 'file');
            if (first) this.switchFile(first);
            this.view.updateProjectTitle(this.model.currentProjectName);
            this.view.logTerminal(`Đã mở: ${this.model.currentProjectName}`, "info");
        } else this.view.logTerminal("Lỗi tải dự án", "error");
    }

    async submitCreateProject() {
        const input = document.getElementById('newProjectInput');
        const name = input.value.trim();
        if (!name) return this.view.logTerminal("Nhập tên dự án!", "error");
        const p = await this.model.createProject(name);
        if (p) {
            this.view.hideModal('createProjectModal');
            this.model.currentProjectName = p.name;
            this.handleSelectProject(p._id);
        } else this.view.logTerminal("Lỗi tạo dự án", "error");
    }

    async handleDeleteProject(id, name) {
        const modal = document.getElementById('deleteConfirmModal');
        const text = document.getElementById('deleteConfirmText');
        const btnConfirm = document.getElementById('btnConfirmDelete');
        const btnCancel = document.getElementById('btnCancelDelete');

        text.textContent = `Xóa dự án "${name}"?`;
        modal.classList.remove('hidden');
        modal.style.zIndex = '99999';

        const newBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);
        newBtn.onclick = async () => {
            modal.classList.add('hidden');
            const res = await this.model.deleteProject(id);
            if (!res.error) this.loadAndShowProjects();
            else this.view.logTerminal(res.error, "error");
        };
        btnCancel.onclick = () => modal.classList.add('hidden');
    }

    async handleRenameProject(id, newName) {
        const success = await this.model.renameProject(id, newName);
        if (success) {
            if (this.model.currentProjectId === id) {
                this.model.currentProjectName = newName;
                this.view.updateProjectTitle(newName);
            }
            this.loadAndShowProjects();
        } else this.view.logTerminal("Lỗi đổi tên", "error");
    }

    handleCreateItem(name, type) {
        if (this.model.createItem(name, type)) {
            this.updateFileTreeUI();
            if (type === 'file') this.switchFile(name);
            this.handleSaveProject();
        } else this.view.logTerminal(`'${name}' đã tồn tại!`, "error");
    }

    async handleSaveProject() {
        if (this.model.activePath && this.model.fileSessions[this.model.activePath]) {
            this.model.syncContent(this.model.activePath, this.model.fileSessions[this.model.activePath].getValue());
        }
        const ok = await this.model.saveProjectToCloud();
        if (ok && this.view.elements.saveBtn) this.view.elements.saveBtn.style.color = 'white';
    }

    updateFileTreeUI() {
        this.view.renderTree(this.model.vfs, this.model.activePath, {
            onFileClick: (p) => { this.contextMenuTarget = p; this.switchFile(p); },
            onDragStart: (p) => { this.draggedPath = p; },
            onDrop: (t) => this.handleDrop(t),
            onContextMenu: (p, x, y) => {
                this.contextMenuTarget = p;
                const m = document.getElementById('contextMenu');
                if (m) { m.style.left = `${x}px`; m.style.top = `${y}px`; m.classList.remove('hidden'); }
            }
        });
    }

    handleDrop(target) {
        const source = this.draggedPath;
        if (source && source !== target && !target.startsWith(source + '/')) {
            // Di chuyển luôn (No Alert)
            this.performMove(source, target);
        }
    }

    performMove(s, t) {
        const res = this.model.moveItem(s, t);
        if (res.success) this.updateFileTreeUI();
        else this.view.logTerminal(res.message, "error");
    }

    switchFile(path) {
        const node = this.model.findNode(path);
        if (!node || node.node.type !== 'file') return;
        if (!this.model.fileSessions[path]) {
            const ext = path.split('.').pop();
            const mode = ext === 'py' ? "ace/mode/python" : ext === 'js' ? "ace/mode/javascript" : "ace/mode/text";
            this.model.fileSessions[path] = ace.createEditSession(node.node.content || "", mode);
        }
        this.view.editor.setSession(this.model.fileSessions[path]);
        this.model.activePath = path;
        this.view.updateBreadcrumb(path);
        this.updateFileTreeUI();
    }

    async runCode() {
        const path = this.model.activePath;
        if (!path) return this.view.logTerminal("Chọn file để chạy!", "warn");

        // Xóa kết quả cũ (Minimalist)
        this.view.clearTerminal();

        const code = this.model.fileSessions[path].getValue();
        const lang = path.endsWith('py') ? 'python' : 'javascript';

        this.view.logTerminal("Running...", "info");
        try {
            const res = await fetch(`${this.model.BASE_URL}/run`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: lang, code })
            });
            const data = await res.json();
            this.view.clearTerminal(); // Xóa chữ Running
            this.view.logTerminal(data.output || data.error, data.error ? 'error' : 'output');
        } catch (e) { this.view.logTerminal("Lỗi kết nối", 'error'); }
    }

    toggleTerminal() {
        const termPanel = document.querySelector('.terminal-panel');
        if (!termPanel) return;
        const isHidden = termPanel.style.display === 'none';
        const layout = document.querySelector('.layout');

        if (isHidden) {
            termPanel.style.display = 'flex';
            if (window.innerWidth <= 1024) layout.style.setProperty('grid-template-rows', '1fr 10px 200px', 'important');
            else {
                const sb = document.querySelector('.file-explorer');
                const w = (sb && sb.style.display !== 'none') ? "220px" : "0px";
                layout.style.setProperty('grid-template-columns', `50px ${w} 1fr 10px 1fr`, 'important');
            }
        } else {
            termPanel.style.display = 'none';
            if (window.innerWidth <= 1024) layout.style.setProperty('grid-template-rows', '1fr 10px 0px', 'important');
            else {
                const sb = document.querySelector('.file-explorer');
                const w = (sb && sb.style.display !== 'none') ? "220px" : "0px";
                layout.style.setProperty('grid-template-columns', `50px ${w} 1fr 10px 0px`, 'important');
            }
        }
        if (this.view.editor) this.view.editor.resize();
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.file-explorer');
        const actExplorer = document.getElementById('actExplorer');
        const layout = document.querySelector('.layout');
        if (!sidebar) return;

        const isMobile = window.innerWidth <= 1024;
        let isHidden;
        if (isMobile) isHidden = !sidebar.classList.contains('mobile-visible');
        else isHidden = sidebar.style.display === 'none';

        if (isHidden) {
            if (isMobile) sidebar.classList.add('mobile-visible');
            else {
                sidebar.style.display = 'flex';
                layout.style.setProperty('grid-template-columns', '50px 220px 1fr 10px 1fr', 'important');
            }
            if (actExplorer) actExplorer.classList.add('active');
        } else {
            if (isMobile) sidebar.classList.remove('mobile-visible');
            else {
                sidebar.style.display = 'none';
                layout.style.setProperty('grid-template-columns', '50px 0px 1fr 10px 1fr', 'important');
            }
            if (actExplorer) actExplorer.classList.remove('active');
        }
        if (this.view.editor) this.view.editor.resize();
    }
}