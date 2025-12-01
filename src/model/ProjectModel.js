export class ProjectModel {
    constructor() {
        this.fileSessions = {};
        // Dữ liệu mẫu
        this.vfs = {
            'main.py': { type: 'file', content: "print('Hello MVC World!')" },
            'src': { type: 'folder', children: {} }
        };
        this.activePath = null;
    }

    // Tìm node trong cây (Hỗ trợ path lồng nhau)
    findNode(path) {
        if (!path) return null;
        const parts = path.split('/');
        let current = this.vfs;
        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            if (!current[name]) return null;
            if (i === parts.length - 1) return { parent: current, node: current[name], name };
            current = current[name].children;
        }
        return null;
    }
}