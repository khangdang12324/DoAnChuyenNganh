export class ProjectModel {
    constructor() {
        this.vfs = {
            'main.py': {type:'file'}
        };

        this.fileSessions = {};
    
        this.activePath = null;
    }

    exists(path) {

        const name = path.split('/').pop();
        return !!this.vfs[name];
    }

   // Tạo file mới vào dữ liệu
    createFile(filename, content = '') {
        this.vfs[filename] = { type: 'file' };
        // Tạo session ACE
        const mode = this.getModeFromExtension(filename);
        this.fileSessions[filename] = ace.createEditSession(content, mode);
    }

    getSession(filename) {
        return this.fileSessions[filename];
    }

    getModeFromExtension(filename) {
        const ext = filename.split('.').pop();
        if (ext === 'py') return 'ace/mode/python';
        if (ext === 'js') return 'ace/mode/javascript';
        if (ext === 'cpp') return 'ace/mode/c_cpp';
        if (ext === 'java') return 'ace/mode/java';
        return 'ace/mode/text';
    }
}