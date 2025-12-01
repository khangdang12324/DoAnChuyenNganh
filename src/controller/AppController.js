import { ProjectModel } from '../model/ProjectModel.js';
import { AppView } from '../view/AppView.js';

export class AppController {
    constructor() {
        this.model = new ProjectModel();
        this.view = new AppView();
    }

    init() {
        console.log("MVC Controller Started!");
        this.render();
        this.setupEvents();
        
        // Mở file mặc định
        this.switchFile('main.py');
    }

    render() {
        this.view.renderTree(this.model.vfs, this.model.activePath, (path) => {
            this.switchFile(path);
        });
    }

    setupEvents() {
        // Nút Chạy
        this.view.elements.runBtn.addEventListener('click', () => this.runCode());
        
        // Nút Refresh
        this.view.elements.refreshBtn.addEventListener('click', () => this.render());

        // (Các nút khác bạn thêm tương tự...)
    }

    switchFile(path) {
        const nodeInfo = this.model.findNode(path);
        if (!nodeInfo) return;

        // Logic tạo Session
        if (!this.model.fileSessions[path]) {
            const mode = "ace/mode/python"; // (Cần logic check đuôi file)
            const content = nodeInfo.node.content || "";
            this.model.fileSessions[path] = ace.createEditSession(content, mode);
        }

        this.view.editor.setSession(this.model.fileSessions[path]);
        this.model.activePath = path;
        this.render(); // Vẽ lại để tô màu active
    }

    async runCode() {
        const path = this.model.activePath;
        if (!path) return alert("Chưa chọn file!");

        const code = this.model.fileSessions[path].getValue();
        this.view.logTerminal("Đang chạy...", "info");

        // Gọi API
        try {
            const res = await fetch('https://doanchuyennganh-backend.onrender.com/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: 'python', code })
            });
            const result = await res.json();
            this.view.logTerminal(result.output || result.error, result.error ? 'error' : 'info');
        } catch (err) {
            this.view.logTerminal("Lỗi kết nối!", "error");
        }
    }
}