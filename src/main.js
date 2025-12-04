
import { AppController } from './mvc/controller/AppController.js';
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Booting IDE in MVC Mode...');
    const app = new AppController();
    app.init();
});