const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// تقديم الملفات الثابتة من مجلد dist
app.use(express.static(path.join(__dirname, 'dist')));

// جميع الطلبات غير الموجودة تعيد index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ الواجهة تعمل على:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Network: http://192.168.x.x:${PORT}`);
});