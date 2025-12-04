export class ProjectModel {
    constructor() {
        // --- CẤU HÌNH API ---
        this.BASE_URL = 'https://doanchuyennganh-backend.onrender.com';

        // --- DỮ LIỆU CỤC BỘ (STATE) ---
        this.fileSessions = {}; // Lưu các phiên làm việc của ACE
        // Cây thư mục mặc định
        this.vfs = {
            'main.py': { type: 'file', content: "print('Hello World')" }
        };
        this.activePath = null;

        // --- DỮ LIỆU NGƯỜI DÙNG & DỰ ÁN ---
        this.token = localStorage.getItem('token') || null;
        this.username = localStorage.getItem('username') || null;

        // QUAN TRỌNG: ID dự án đang mở (để biết lưu vào đâu)
        this.currentProjectId = null;
        this.currentProjectName = 'Untitled';
    }

    // =================================================
    // 1. HELPER (HÀM HỖ TRỢ)
    // =================================================

    // Tìm node trong cây VFS
    findNode(path) {
        if (!path) return null;
        const parts = path.split('/');
        let current = this.vfs;
        let parent = null;
        let name = '';
        for (let i = 0; i < parts.length; i++) {
            name = parts[i];
            if (!current[name]) return null;
            if (i === parts.length - 1) return { parent: current, node: current[name], name };
            current = current[name].children;
            parent = current;
        }
        return null;
    }

    // Lấy nội dung mặc định theo đuôi file
    getDefaultContent(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'py') return `print("Hello from Python!")\n`;
        if (ext === 'js') return `console.log("Hello from JavaScript!");\n`;
        if (ext === 'java') return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n`;
        if (ext === 'cpp') return `#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n`;
        return "";
    }

    // Cập nhật nội dung từ Editor vào VFS
    syncContent(path, content) {
        const nodeInfo = this.findNode(path);
        if (nodeInfo && nodeInfo.node.type === 'file') {
            nodeInfo.node.content = content;
        }
    }

    // =================================================
    // 2. LOGIC FILE SYSTEM (TẠO & DI CHUYỂN)
    // =================================================

    // Tạo file/folder mới
    createItem(name, type) {
        if (this.vfs[name]) return false; // Đã tồn tại

        if (type === 'file') {
            this.vfs[name] = { type: 'file', content: this.getDefaultContent(name) };
        } else {
            this.vfs[name] = { type: 'folder', children: {} };
        }
        return true;
    }

    // Di chuyển File/Folder (Drag & Drop)
    moveItem(sourcePath, targetFolderPath) {
        // 1. Tìm node nguồn
        const sourceInfo = this.findNode(sourcePath);
        if (!sourceInfo) return { success: false, message: "Lỗi nguồn" };

        // 2. Tìm folder đích
        let targetChildren = this.vfs;
        if (targetFolderPath !== '') {
            const targetInfo = this.findNode(targetFolderPath);
            if (!targetInfo || targetInfo.node.type !== 'folder') {
                return { success: false, message: "Đích không phải thư mục" };
            }
            targetChildren = targetInfo.node.children;
        }

        // 3. Kiểm tra trùng tên
        if (targetChildren[sourceInfo.name]) {
            return { success: false, message: `Tên '${sourceInfo.name}' đã tồn tại ở đích!` };
        }

        // 4. Thực hiện di chuyển (Cắt & Dán)
        targetChildren[sourceInfo.name] = sourceInfo.node;
        delete sourceInfo.parent[sourceInfo.name];

        // 5. Cập nhật đường dẫn file đang mở (nếu file đang mở bị di chuyển)
        if (this.activePath === sourcePath) {
            this.activePath = targetFolderPath ? `${targetFolderPath}/${sourceInfo.name}` : sourceInfo.name;
        }

        // 6. Lưu lên Cloud ngay lập tức
        this.saveProjectToCloud();

        return { success: true };
    }

    // =================================================
    // 3. API AUTH (XÁC THỰC)
    // =================================================

    async login(username, password) {
        try {
            const res = await fetch(`${this.BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Lưu thông tin
            this.token = data.token;
            this.username = data.username;
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);

            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }

    async register(username, password) {
        try {
            const res = await fetch(`${this.BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return { success: true };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }

    logout() {
        this.token = null;
        this.username = null;
        this.currentProjectId = null;
        this.currentProjectName = 'Untitled';
        this.activePath = null;

        // Xóa LocalStorage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('ide_vfs'); // Xóa bản nháp của khách

        // Reset VFS về mặc định
        this.vfs = { 'main.py': { type: 'file', content: "print('Hello World')" } };
        this.fileSessions = {};
    }

    // =================================================
    // 4. API PROJECT (QUẢN LÝ DỰ ÁN)
    // =================================================

    async fetchProjects() {
        if (!this.token) return [];
        try {
            const res = await fetch(`${this.BASE_URL}/projects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            return await res.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async createProject(name) {
        if (!this.token) return null;
        try {
            const res = await fetch(`${this.BASE_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({ name })
            });
            return await res.json(); 
        } catch (err) {
            throw new Error("Lỗi tạo dự án");
        }
    }

    async loadProject(projectId) {
        if (!this.token) return false;
        try {
            const res = await fetch(`${this.BASE_URL}/projects/${projectId}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();

            // Cập nhật dữ liệu Model từ Server
            this.vfs = data.vfs || { 'main.py': { type: 'file', content: "" } };
            this.currentProjectId = projectId;
            this.currentProjectName = data.name || data.projectName || "Untitled";

            // Reset session cũ
            this.fileSessions = {};
            this.activePath = null;

            return true;
        } catch (err) { return false; }
    }

    async saveProjectToCloud() {
        if (!this.token || !this.currentProjectId) {
            localStorage.setItem('ide_vfs', JSON.stringify(this.vfs));
            return true; 
        }
        if (this.activePath && this.fileSessions[this.activePath]) {
            this.syncContent(this.activePath, this.fileSessions[this.activePath].getValue());
        }
        try {
            await fetch(`${this.BASE_URL}/projects/${this.currentProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({ vfs: this.vfs })
            });
            console.log("✅ Saved Cloud:", this.currentProjectId);
            return true;
        } catch (err) {
            console.error("Lỗi lưu Cloud:", err);
            return false;
        }
    }

    async renameProject(projectId, newName) {
        try {
            await fetch(`${this.BASE_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${this.token}` 
                },
                body: JSON.stringify({ name: newName })
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    async deleteProject(projectId) {
        try {
            const res = await fetch(`${this.BASE_URL}/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            return await res.json();
        } catch (e) { return { error: e.message }; }
    }

    // --- LOGIC ĐỔI TÊN FILE/FOLDER ---
    renameItem(oldPath, newName) {
        const nodeInfo = this.findNode(oldPath);
        if (!nodeInfo) return { success: false, message: "Lỗi tìm file" };
        
        const { parent, node, name } = nodeInfo;
        if (parent[newName]) return { success: false, message: "Trùng tên!" };

        // Đổi tên
        parent[newName] = node;
        delete parent[name];
        
        // Update activePath nếu cần
        if (this.activePath === oldPath) {
             const dir = oldPath.substring(0, oldPath.lastIndexOf('/'));
             this.activePath = dir ? `${dir}/${newName}` : newName;
        }

        this.saveProjectToCloud();
        return { success: true };
    }
   // --- DÁN HÀM NÀY VÀO ProjectModel.js ---
    
    copyItem(sourcePath, targetFolderPath) {
        // 1. Tìm file gốc
        const sourceInfo = this.findNode(sourcePath);
        if (!sourceInfo) return { success: false, message: "Lỗi nguồn" };

        // 2. Tìm folder đích (nếu paste ra ngoài root thì targetFolderPath là '')
        let targetChildren = this.vfs;
        if (targetFolderPath && targetFolderPath !== '') {
            const targetInfo = this.findNode(targetFolderPath);
            // Nếu đích không phải folder thì không paste được
            if (!targetInfo || targetInfo.node.type !== 'folder') {
                return { success: false, message: "Đích không phải thư mục" };
            }
            targetChildren = targetInfo.node.children;
        }

        // 3. Tạo tên mới (Tránh trùng)
        // Ví dụ: file.txt -> file_copy.txt, file_copy_1.txt
        let newName = sourceInfo.name;
        const parts = newName.split('.');
        const ext = parts.length > 1 ? `.${parts.pop()}` : '';
        const base = parts.join('.');
        
        let counter = 0;
        while (targetChildren[newName]) {
            counter++;
            newName = `${base}_copy${counter > 1 ? counter : ''}${ext}`;
        }

        // 4. Nhân bản dữ liệu (Deep Copy)
        // Phải dùng JSON.parse(JSON.stringify) để cắt đứt liên hệ với node cũ
        targetChildren[newName] = JSON.parse(JSON.stringify(sourceInfo.node));

        // 5. Lưu
        this.saveProjectToCloud();
        return { success: true };
    }
}