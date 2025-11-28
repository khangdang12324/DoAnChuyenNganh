// src/controller/AppController.js
import { ProjectModel } from '../model/ProjectModel.js';
import { AppView } from '../view/AppView.js';

export class AppController {
    constructor() {
        this.model = new ProjectModel();
        this.view = new AppView();
        
        // Danh sách các file đang mở (Tabs)
        this.openFiles = ['main.py']; 
    }

    init() {
        console.log("App Controller khởi động...");

        // 1. Khởi tạo dữ liệu mẫu
        const initialCode = "# Code Python mẫu\nprint('Hello from MVC!')";
        this.model.createFile('main.py', initialCode);
        
        // 2. Vẽ giao diện lần đầu
        this.updateUI();
        this.openFile('main.py');

        // 3. Gắn sự kiện (Nối dây)
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Nút Chạy
        this.view.elements.runBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.runCode();
        });

        // Nút Tối/Sáng
        this.view.elements.themeToggle.addEventListener('change', (e) => {
            this.view.toggleTheme(e.target.checked);
        });

        // Nút Tạo File Mới (Ví dụ đơn giản)
        this.view.elements.newFileBtn.addEventListener('click', () => {
            const name = prompt("Tên file mới:");
            if (name) this.handleCreateFile(name);
        });
        
        // Nút Refresh
        this.view.elements.refreshBtn.addEventListener('click', () => {
            this.updateUI();
        });
    }

    handleCreateFile(filename) {
        if (this.model.exists(filename)) {
            alert("File đã tồn tại");
            return;
        }
        this.model.createFile(filename, '# New file\n');
        this.openFiles.push(filename);
        this.openFile(filename);
        this.updateUI();
    }

    openFile(filename) {
        const session = this.model.getSession(filename);
        if (session) {
            this.view.editor.setSession(session);
            this.model.activePath = filename;
            this.updateUI(); // Vẽ lại tab active
        }
    }

    closeFile(filename) {
        // Logic đóng tab... (Bạn tự bổ sung sau)
    }

    updateUI() {
        // Vẽ lại Cây thư mục
        this.view.renderTree(this.model.vfs, (fname) => this.openFile(fname));
        
        // Vẽ lại Tabs
        this.view.renderTabs(
            this.model.activePath, 
            this.openFiles, 
            (fname) => this.openFile(fname), // Khi click tab
            (fname) => this.closeFile(fname) // Khi click đóng
        );
    }

    async runCode() {
        const filename = this.model.activePath;
        if (!filename) return;

        const session = this.model.getSession(filename);
        const code = session.getValue();
        
        // Logic lấy ngôn ngữ
        const language = filename.endsWith('.js') ? 'javascript' : 'python';

        this.view.logTerminal('info', 'Đang chạy...');
        
        // Gọi API (Giống code cũ)
        const API_ENDPOINT = 'https://doanchuyennganh-backend.onrender.com/run';
        
        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, code })
            });
            const result = await res.json();
            
            if (result.error) this.view.logTerminal('error', result.error);
            else this.view.logTerminal('output', result.output);

        } catch (err) {
            this.view.logTerminal('error', 'Lỗi kết nối Server!');
        }
        this.view.logTerminal('info', 'Kết thúc.');
    }
}