

import { AppController } from './mvc/controller/AppController.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Booting IDE...');
    const app = new AppController();
    app.init();
});