console.log('MAIN.JS: FINAL CUSTOM ICONS - LOADED');

// --- 1. BIẾN TOÀN CỤC ---
const fileSessions = {};
let vfs = {
    'main.py': { type: 'file', content: "print('Hello World')" },
    'src': { type: 'folder', children: {} }
};
let activePath = null;
let editor;
let draggedItemPath = null;
let contextMenuTarget = null; // Lưu đường dẫn file đang được click chuột phải
const breadcrumbFile = document.getElementById("breadcrumbFile");
// --- 2. HÀM HỖ TRỢ ---

// Lấy Icon (Dùng link của BẠN)
function getFileIcon(filename) {
    const parts = filename.split('.');
    // Nếu không có đuôi (hoặc đuôi lạ) -> Dùng icon của BẠN
    if (parts.length === 1) {
        return 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231397/images_k53nq1.png';
    }

    const ext = parts.pop().toLowerCase();
    const baseUrl = 'https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/main/icons/';

    let iconName = 'file';
    if (ext === 'py') iconName = 'python';
    else if (ext === 'js') iconName = 'javascript';
    else if (ext === 'html') iconName = 'html';
    else if (ext === 'css') iconName = 'css';
    else if (ext === 'java') iconName = 'java';
    else if (ext === 'cpp' || ext === 'c') iconName = 'cpp';
    else if (ext === 'json') iconName = 'json';
    else if (ext === 'md') iconName = 'markdown';
    else if (ext === 'txt') iconName = 'document';

    return `${baseUrl}${iconName}.svg`;
}

// Tìm node trong VFS (Hỗ trợ path lồng nhau)
function findNodeInfo(path) {
    if (!path) return null;
    const parts = path.split('/');
    let current = vfs;
    let parent = null;
    let name = '';

    for (let i = 0; i < parts.length; i++) {
        name = parts[i];
        if (!current[name]) return null;

        if (i === parts.length - 1) {
            return { parent: current, node: current[name], name: name };
        }
        // Nếu đi tiếp, node hiện tại phải là folder và có children
        if (current[name].type !== 'folder') return null;
        current = current[name].children;
        parent = current;
    }
    return null;
}

// Di chuyển file (Drag & Drop Logic)
function moveItem(sourcePath, targetFolderPath) {
    const sourceInfo = findNodeInfo(sourcePath);

    // Tìm folder đích
    let targetChildren = vfs;
    if (targetFolderPath !== '') {
        const targetInfo = findNodeInfo(targetFolderPath);
        if (!targetInfo || targetInfo.node.type !== 'folder') return false;
        targetChildren = targetInfo.node.children;
    }

    if (!sourceInfo) return false;

    // Kiểm tra trùng tên
    if (targetChildren[sourceInfo.name]) {
        alert(`Lỗi: '${sourceInfo.name}' đã tồn tại trong thư mục đích!`);
        return false;
    }

    // DI CHUYỂN
    targetChildren[sourceInfo.name] = sourceInfo.node;
    delete sourceInfo.parent[sourceInfo.name];

    // Cập nhật activePath
    if (activePath === sourcePath) {
        activePath = targetFolderPath ? `${targetFolderPath}/${sourceInfo.name}` : sourceInfo.name;
    }
    return true;
}

// Lấy nội dung mặc định
function getDefaultContent(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'py') return `print("Hello from Python!")\n`;
    if (ext === 'js') return `console.log("Hello from JavaScript!");\n`;
    if (ext === 'java') return `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n`;
    if (ext === 'cpp') return `#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}\n`;
    return "";
}

document.addEventListener('DOMContentLoaded', () => {

    // --- KHỞI TẠO EDITOR ---
    editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/python");
    editor.setFontSize("14px");
   editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
        fontSize: "14px",
        showPrintMargin: false,   // Tắt đường kẻ dọc
        showGutter: true,         // Hiện số dòng
        highlightActiveLine: true, // Tô sáng dòng đang chọn
        displayIndentGuides: true, // Hiện đường gióng thụt lề
        scrollPastEnd: 0.5,       // Cho phép cuộn quá cuối file một chút
    });

    const fileTreeList = document.getElementById("fileTree");
    const runButton = document.getElementById("runBtn");
    const terminalBody = document.getElementById("terminal");

    const newFileBtn = document.getElementById("newFileBtn");
    const newFolderBtn = document.getElementById("newFolderBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const collapseBtn = document.getElementById("collapseBtn");

    // --- LOGIC VẼ CÂY (CÓ DRAG & DROP) ---
    function renderFileTree() {
        fileTreeList.innerHTML = '';
        renderNode(vfs, fileTreeList, '');
    }

    function renderNode(treeNode, container, parentPath) {
        if (!treeNode) return;

        const entries = Object.entries(treeNode).sort(([, a], [, b]) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name?.localeCompare(b.name);
        });

        for (const [name, node] of entries) {
            const path = parentPath ? `${parentPath}/${name}` : name;
            const li = document.createElement('li');

            // === DRAG & DROP ===
            li.draggable = true;
            li.dataset.path = path;

            li.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggedItemPath = path;
                e.dataTransfer.effectAllowed = 'move';
                li.style.opacity = '0.5';
            });

            li.addEventListener('dragend', (e) => {
                e.stopPropagation();
                li.style.opacity = '1';
                draggedItemPath = null;
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            if (node.type === 'folder') {
                li.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    li.classList.add('drag-over');
                });
                li.addEventListener('dragleave', (e) => {
                    e.stopPropagation();
                    li.classList.remove('drag-over');
                });
                li.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    li.classList.remove('drag-over');

                    if (draggedItemPath && draggedItemPath !== path && !path.startsWith(draggedItemPath)) {

                        if (moveItem(draggedItemPath, path)) renderFileTree();

                    }
                });
            }
            // ====================
            // ... (Code cũ của li) ...

            // === THÊM SỰ KIỆN CHUỘT PHẢI (CONTEXT MENU) ===
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Chặn menu mặc định của trình duyệt
                e.stopPropagation();

                // Lưu file đang được chọn
                contextMenuTarget = path;

                // Hiển thị menu tại vị trí chuột
                const menu = document.getElementById('contextMenu');
                menu.style.left = `${e.clientX}px`;
                menu.style.top = `${e.clientY}px`;
                menu.classList.remove('hidden');
            });
            // ============================================

            if (node.type === 'folder') {
                li.className = 'tree-item-folder open';
                // Icon Folder (Của bạn)
                const folderIcon = 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231598/free-folder-icon-1485-thumb_lf9coe.png';

                const div = document.createElement('div');
                div.className = 'tree-item folder';
                div.innerHTML = `<img src="${folderIcon}" class="file-icon"> ${name}`;

                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    li.classList.toggle('open');
                });

                li.appendChild(div);

                const ul = document.createElement('ul');
                ul.className = 'nested';
                li.appendChild(ul);

                if (node.children) renderNode(node.children, ul, path);

            } else {
                const isActive = (path === activePath) ? 'active' : '';
                const iconUrl = getFileIcon(name);

                li.innerHTML = `
                    <div class="tree-item file ${isActive}">
                        <img src="${iconUrl}" class="file-icon"> ${name}
                    </div>
                `;

                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    switchFile(path);
                });
            }
            container.appendChild(li);
        }
    }

    // --- LOGIC MỞ FILE (Đã sửa findNode) ---
    function switchFile(path) {
        const nodeInfo = findNodeInfo(path);
        if (!nodeInfo || nodeInfo.node.type !== 'file') return;

        if (!fileSessions[path]) {
            const ext = path.split('.').pop();
            let mode = "ace/mode/text";
            if (ext === 'py') mode = "ace/mode/python";
            if (ext === 'js') mode = "ace/mode/javascript";
            if (ext === 'cpp' || ext === 'c') mode = "ace/mode/c_cpp";
            if (ext === 'java') mode = "ace/mode/java";

            let content = nodeInfo.node.content;
            if (content === undefined) {
                content = getDefaultContent(path); // Tự sinh code
                nodeInfo.node.content = content;
            }
            fileSessions[path] = ace.createEditSession(content, mode);
        }

        editor.setSession(fileSessions[path]);
        activePath = path;
        renderFileTree();
        const statusLang = document.getElementById('statusLang');
        if (statusLang) {
            const ext = path.split('.').pop().toLowerCase();
            let langText = 'Text';
            if (ext === 'py') langText = 'Python';
            if (ext === 'js') langText = 'JavaScript';
            if (ext === 'cpp') langText = 'C++';
            if (ext === 'java') langText = 'Java';
            if (ext === 'html') langText = 'HTML';
            if (ext === 'css') langText = 'CSS';
            
            statusLang.textContent = langText;
        }

        if (breadcrumbFile) {
            // Thay thế dấu / bằng dấu › cho đẹp
            // Ví dụ: src/main.py -> src › main.py
            const displayPath = path.replace(/\//g, ' › ');
            breadcrumbFile.textContent = displayPath;
            
            // Cập nhật icon tương ứng bên cạnh (nếu muốn xịn hơn)
            // breadcrumbFile.innerHTML = `<img src="${getFileIcon(path)}" width="14" style="vertical-align:middle; margin-right:5px"> ${displayPath}`;
        }
    }

    // --- LOGIC TẠO FILE INLINE ---
    function createInlineInput(type) {
        const li = document.createElement('li');
        li.className = 'tree-item-input-wrapper';

        const iconUrl = type === 'file'
            ? 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231397/images_k53nq1.png' // Icon file của bạn
            : 'https://res.cloudinary.com/dqkysbzie/image/upload/v1764231598/free-folder-icon-1485-thumb_lf9coe.png'; // Icon folder của bạn

        li.innerHTML = `<img src="${iconUrl}" class="file-icon" style="margin-left: 10px;">`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-item-input';
        input.placeholder = type === 'file' ? 'file.py' : 'folder';
        li.appendChild(input);

        fileTreeList.insertBefore(li, fileTreeList.firstChild);
        input.focus();

        let isCommitted = false;
        const commit = () => {
            if (isCommitted) return;
            isCommitted = true;
            const name = input.value.trim();
            if (!name) { li.remove(); return; }
            if (vfs[name]) { alert("Tên đã tồn tại!"); li.remove(); return; }

            if (type === 'file') {
                vfs[name] = { type: 'file' };
                switchFile(name);
            } else {
                vfs[name] = { type: 'folder', children: {} };
                renderFileTree();
            }
            li.remove();
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { isCommitted = true; li.remove(); }
        });
        input.addEventListener('blur', () => { if (!isCommitted) li.remove(); });
    }

    // --- GẮN SỰ KIỆN ---
    if (newFileBtn) newFileBtn.onclick = (e) => { e.stopPropagation(); createInlineInput('file'); };
    if (newFolderBtn) newFolderBtn.onclick = (e) => { e.stopPropagation(); createInlineInput('folder'); };
    if (refreshBtn) refreshBtn.onclick = (e) => { e.stopPropagation(); renderFileTree(); };
    if (collapseBtn) collapseBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tree-item-folder.open').forEach(el => el.classList.remove('open'));
    };

    // --- LOGIC CHẠY CODE ---
    if (runButton) {
        runButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!activePath) { alert("Chưa chọn file!"); return; }

            const code = fileSessions[activePath].getValue();
            const ext = activePath.split('.').pop();
            let lang = ext;
            if (ext === 'py') lang = 'python';
            if (ext === 'js') lang = 'javascript';

            terminalBody.innerHTML = '<span class="terminal-info">Đang Chạy...</span>\n';
            const API_ENDPOINT = 'https://doanchuyennganh-backend.onrender.com/run';

            try {
                const res = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: lang, code: code })
                });
                const result = await res.json();
                if (result.error) terminalBody.innerHTML += `<span class="term-line error">${result.error}</span>\n`;
                else terminalBody.innerHTML += `<span class="term-line output">${result.output}</span>\n`;
            } catch (error) {
                terminalBody.innerHTML += `<span class="term-line error">Lỗi kết nối Server.</span>\n`;
            }
            terminalBody.innerHTML += `<span class="terminal-info">Kết Thúc.</span>\n`;
        });
    }

    // --- CSS DRAG & DROP ---
    const style = document.createElement('style');
    style.innerHTML = `.drag-over { background-color: #37373d !important; border: 1px dashed #007acc; }`;
    document.head.appendChild(style);
    // --- LOGIC CONTEXT MENU ---
    const contextMenu = document.getElementById('contextMenu');
    const ctxRename = document.getElementById('ctxRename');
    const ctxDelete = document.getElementById('ctxDelete');
    const ctxDownload = document.getElementById('ctxDownload');

    // 1. Click ra ngoài thì đóng menu
    document.addEventListener('click', () => {
        if (contextMenu) contextMenu.classList.add('hidden');
    });

    // --- LOGIC XÓA FILE (Dùng Modal) ---
    const deleteModal = document.getElementById('deleteConfirmModal');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const deleteText = document.getElementById('deleteConfirmText');

    if (ctxDelete) {
        ctxDelete.addEventListener('click', () => {
            if (!contextMenuTarget) return;
            contextMenu.classList.add('hidden'); // Đóng menu chuột phải

            // Hiện Modal Xóa
            const name = contextMenuTarget.split('/').pop();
            deleteText.textContent = `Bạn có chắc chắn muốn xóa '${name}' không?`;
            deleteModal.classList.remove('hidden');
        });
    }


    if (btnCancelDelete) {
        btnCancelDelete.addEventListener('click', () => {
            deleteModal.classList.add('hidden');
        });
    }
    // --- LOGIC XỬ LÝ TRONG MODAL XÓA ---
   // --- SỬA LOGIC NÚT XÓA (Cập nhật ngay lập tức) ---
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', () => {
            // 1. Đóng Modal NGAY LẬP TỨC
            deleteModal.classList.add('hidden');

            // 2. Xử lý xóa
            if (contextMenuTarget) {
                const nodeInfo = findNodeInfo(contextMenuTarget);
                if (nodeInfo) {
                    // Xóa khỏi dữ liệu VFS
                    delete nodeInfo.parent[nodeInfo.name];

                    // Nếu đang mở file đó thì xóa editor
                    if (activePath === contextMenuTarget) {
                        activePath = null;
                        editor.setValue(""); 
                    }
                    
                    // 3. QUAN TRỌNG: VẼ LẠI CÂY NGAY LẬP TỨC
                    // (Lỗi của bạn là thiếu hoặc gọi sai tên hàm này)
                    if (typeof renderFileTreeWrapper === 'function') {
                        renderFileTreeWrapper();
                    } else {
                        // Dự phòng nếu bạn đặt tên hàm khác
                        renderFileTree(); 
                    }
                }
            }
        });
    }
    // 3. Chức năng ĐỔI TÊN
    // --- LOGIC ĐỔI TÊN (INLINE RENAME) ---
    if (ctxRename) {
        ctxRename.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!contextMenuTarget) return;
            contextMenu.classList.add('hidden'); // Đóng menu chuột phải

            // 1. Tìm thẻ HTML (li) tương ứng với file này
            // (Mẹo: Tìm thẻ li có data-path trùng khớp)
            const allLis = document.querySelectorAll('#fileTree li');
            let targetLi = null;
            allLis.forEach(li => {
                if (li.dataset.path === contextMenuTarget) targetLi = li;
            });

            if (!targetLi) return;

            // 2. Tạo ô Input thay thế
            const oldName = contextMenuTarget.split('/').pop();
            const oldHTML = targetLi.innerHTML; // Lưu lại HTML cũ để phòng khi Hủy

            // Tạo Input giống hệt lúc tạo file mới
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'tree-item-input';
            input.value = oldName; // Điền sẵn tên cũ
            input.style.marginLeft = "25px"; // Căn lề cho đẹp
            input.style.width = "calc(100% - 30px)";

            // Thay thế nội dung li bằng Input
            targetLi.innerHTML = '';
            targetLi.appendChild(input);
            input.focus();
            input.select(); // Bôi đen tên cũ để sửa nhanh

            // 3. Xử lý sự kiện Lưu/Hủy
            let isRenamed = false;

            const commitRename = () => {
                if (isRenamed) return;
                isRenamed = true;

                const newName = input.value.trim();

                // Nếu tên rỗng hoặc không đổi -> Hủy (trả về cũ)
                if (!newName || newName === oldName) {
                    targetLi.innerHTML = oldHTML;
                    // Cần gắn lại sự kiện click/drag cho li cũ (hoặc đơn giản là vẽ lại cây)
                    renderFileTreeWrapper();
                    return;
                }

                // Thực hiện đổi tên trong VFS
                const nodeInfo = findNodeInfo(contextMenuTarget);
                if (nodeInfo) {
                    if (nodeInfo.parent[newName]) {
                        alert("Tên đã tồn tại!");
                        isRenamed = false;
                        input.focus();
                        return;
                    }

                    // Đổi tên: Gán node sang key mới, xóa key cũ
                    nodeInfo.parent[newName] = nodeInfo.node;
                    delete nodeInfo.parent[oldName];

                    // Cập nhật activePath nếu đang mở
                    if (activePath === contextMenuTarget) {
                        // Logic cập nhật path hơi phức tạp nếu nested, 
                        // đơn giản nhất là vẽ lại cây và update path
                        // (Tạm thời set null hoặc update thủ công)
                        // Cách tốt nhất:
                    }
                    if(typeof renderFileTreeWrapper === 'function') {
                        renderFileTreeWrapper();
                    } else {
                        renderFileTree(); 
                    }
                  
                }
            };

            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') commitRename();
                if (ev.key === 'Escape') {
                    isRenamed = true;
                    targetLi.innerHTML = oldHTML; // Trả về cũ
                    renderFileTreeWrapper(); // Vẽ lại cho chắc (để gắn lại sự kiện click)
                }
            });

            input.addEventListener('blur', () => {
                if (!isRenamed) commitRename(); // Blur thì tự lưu
            });

            // Ngăn click vào input lan ra ngoài
            input.addEventListener('click', (ev) => ev.stopPropagation());
        });
    }

    // 4. Chức năng TẢI VỀ (1 file)
    if (ctxDownload) {
        ctxDownload.addEventListener('click', () => {
            if (!contextMenuTarget) return;

            const nodeInfo = findNodeInfo(contextMenuTarget);
            if (nodeInfo && nodeInfo.node.type === 'file') {
                // Logic tải file (giống nút Lưu)
                let content = nodeInfo.node.content;
                if (!content && fileSessions[contextMenuTarget]) {
                    content = fileSessions[contextMenuTarget].getValue();
                }

                const blob = new Blob([content || ""], { type: 'text/plain' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = nodeInfo.name;
                link.click();
            } else {
                alert("Chỉ tải được file, không tải được thư mục (hãy dùng nút Lưu Zip).");
            }
        });
    }
    // --- KHỞI TẠO ---
    renderFileTree();
    switchFile('main.py');
    // --- LOGIC STATUS BAR ---
    const statusCursor = document.getElementById('statusCursor');
    const statusLang = document.getElementById('statusLang');

    // Cập nhật vị trí con trỏ (Ln, Col)
    editor.selection.on('changeCursor', () => {
        const pos = editor.selection.getCursor();
        // ACE đếm dòng từ 0, ta cộng 1 cho thân thiện
        statusCursor.textContent = `Ln ${pos.row + 1}, Col ${pos.column + 1}`;
    });

    // --- TOGGLE SIDEBAR (Ctrl+B) ---
    const sidebar = document.querySelector('.file-explorer');
    const layout = document.querySelector('.layout'); // Để chỉnh lại Grid

    function toggleSidebar() {
        if (sidebar.style.display === 'none') {
            sidebar.style.display = 'flex';
            // Khôi phục layout 4 cột
            // (Lấy giá trị cũ hoặc set mặc định)
            layout.style.gridTemplateColumns = "250px 1fr 10px 1fr";
        } else {
            sidebar.style.display = 'none';
            // Ẩn cột đầu tiên đi
            layout.style.gridTemplateColumns = "0px 1fr 10px 1fr";
        }
    }

    // Phím tắt Ctrl+B
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            toggleSidebar();
        }
    });
});