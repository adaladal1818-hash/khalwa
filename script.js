// ============================================
// الدوال الأساسية للبرنامج
// ============================================

const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/USERNAME/REPO_NAME/main/data.json';
const GITHUB_API_URL = 'https://api.github.com/repos/USERNAME/REPO_NAME/contents/data.json';

// إعدادات GitHub - سيتم تعبئتها تلقائياً
let GITHUB_CONFIG = {
    token: '',
    username: '',
    repo: '',
    branch: 'main'
};

const LS = {
    get(k) {
        try { return JSON.parse(localStorage.getItem(k)); } 
        catch (e) { return null; }
    },
    set(k, v) {
        localStorage.setItem(k, JSON.stringify(v));
    }
};

function initializeData() {
    if (!LS.get('teachers')) LS.set('teachers', []);
    if (!LS.get('students')) LS.set('students', { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] });
    if (!LS.get('history')) LS.set('history', []);
    if (!LS.get('studentPhotos')) LS.set('studentPhotos', {});
    if (!LS.get('studentPoints')) LS.set('studentPoints', {});
    if (!LS.get('notifications')) LS.set('notifications', []);
    if (!LS.get('studentMessages')) LS.set('studentMessages', {});
    if (!LS.get('answeredToday')) LS.set('answeredToday', {});
    
    // تحميل إعدادات GitHub من localStorage
    const savedConfig = LS.get('github_config');
    if (savedConfig) {
        GITHUB_CONFIG = { ...GITHUB_CONFIG, ...savedConfig };
        updateGitHubUrls();
    }
}

initializeData();

function todayDate() { return new Date().toISOString().slice(0, 10); }

function showPanel(id) {
    document.getElementById('home').style.display = 'none';
    ['admin', 'teacher', 'child'].forEach(p => {
        const element = document.getElementById(p);
        if (element) element.style.display = (p === id) ? 'block' : 'none';
    });
    updateMainInfo();
    updateNotifications();
    
    // إذا كانت لوحة الخدام، عرض الخلوة لهم أيضاً
    if (id === 'teacher') {
        const teachers = LS.get('teachers') || [];
        const loggedInTeacher = teachers.find(t => t.loggedIn);
        if (loggedInTeacher) {
            showKholwaForTeacher(loggedInTeacher.classId);
        }
    }
}

function goHome() {
    document.getElementById('home').style.display = 'block';
    ['admin', 'teacher', 'child'].forEach(p => {
        const element = document.getElementById(p);
        if (element) element.style.display = 'none';
    });
    const mainInfo = document.getElementById('mainInfo');
    if (mainInfo) mainInfo.style.display = 'none';
}

async function updateMainInfo() {
    const shared = await fetchSharedData();
    const kh = shared.kholwa;
    const mainInfo = document.getElementById('mainInfo');
    const todayTitle = document.getElementById('todayTitle');
    
    if (!mainInfo || !todayTitle) return;
    if (!kh || kh.date !== todayDate()) { 
        mainInfo.style.display = 'none'; 
        return; 
    }
    
    mainInfo.style.display = 'block';
    todayTitle.innerText = kh.title || 'خلوة اليوم';
    updateTimerDisplay(kh);
}

function updateTimerDisplay(kh) {
    const el = document.getElementById('kholwaTimer');
    if (!el) return;
    if (!kh || kh.date !== todayDate()) { el.innerText = 'لا توجد خلوة الآن'; return; }
    
    const now = new Date();
    const end = new Date(kh.endISO);
    const start = new Date(kh.startISO);
    if (now < start) { el.innerText = 'الخلوة ستبدأ في: ' + start.toLocaleString(); return; }
    if (now > end) { el.innerText = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️'; return; }
    
    const diff = end - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerText = 'الوقت المتبقي: ' + (h + ' ساعة ' + m + ' دقيقة ' + s + ' ثانية');
}

setInterval(() => { 
    fetchSharedData().then(shared => { 
        const kh = shared.kholwa; 
        updateTimerDisplay(kh); 
    }); 
}, 1000);

// ============================================
// نظام GitHub التلقائي
// ============================================

function updateGitHubUrls() {
    if (GITHUB_CONFIG.username && GITHUB_CONFIG.repo) {
        window.GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/main/data.json`;
        window.GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/contents/data.json`;
    }
}

async function fetchSharedData() {
    try {
        // محاولة جلب البيانات من GitHub أولاً
        if (window.GITHUB_RAW_URL) {
            const response = await fetch(window.GITHUB_RAW_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                return { ...data, source: 'server' };
            }
        }
    } catch (error) {
        console.log('لا يمكن الوصول إلى GitHub، استخدام البيانات المحلية');
    }
    
    // استخدام البيانات المحلية كبديل
    return { 
        kholwa: LS.get('kholwa'), 
        history: LS.get('history') || [],
        source: 'local'
    };
}

async function autoUploadToGitHub(data) {
    if (!GITHUB_CONFIG.token || !GITHUB_CONFIG.username || !GITHUB_CONFIG.repo) {
        console.log('إعدادات GitHub غير مكتملة');
        return false;
    }

    try {
        const jsonString = JSON.stringify(data, null, 2);
        const content = btoa(unescape(encodeURIComponent(jsonString)));
        
        // الحصول على SHA للملف الحالي (إذا موجود)
        let sha = '';
        try {
            const currentFile = await fetch(window.GITHUB_API_URL, {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (currentFile.ok) {
                const fileData = await currentFile.json();
                sha = fileData.sha;
            }
        } catch (e) { /* الملف غير موجود */ }

        const response = await fetch(window.GITHUB_API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Auto-update: ${data.kholwa?.title || 'Kholwa Update'} - ${new Date().toISOString()}`,
                content: content,
                sha: sha || undefined,
                branch: GITHUB_CONFIG.branch
            })
        });

        if (response.ok) {
            console.log('✅ تم الرفع التلقائي إلى GitHub بنجاح');
            addNotification('نشر تلقائي', 'تم رفع الخلوة إلى السيرفر بنجاح', 'success');
            return true;
        } else {
            throw new Error('فشل في الرفع');
        }
    } catch (error) {
        console.error('❌ خطأ في الرفع التلقائي:', error);
        addNotification('خطأ في النشر', 'تعذر الرفع التلقائي، استخدم الطريقة اليدوية', 'error');
        return false;
    }
}

function setupGitHub() {
    const username = prompt('أدخل اسم مستخدم GitHub:');
    const repo = prompt('أدخل اسم المستودع:');
    const token = prompt('أدخل GitHub Personal Access Token:');

    if (username && repo && token) {
        GITHUB_CONFIG = {
            username: username,
            repo: repo,
            token: token,
            branch: 'main'
        };
        
        LS.set('github_config', GITHUB_CONFIG);
        updateGitHubUrls();
        
        alert('✅ تم إعداد GitHub بنجاح! سيتم النشر التلقائي من الآن.');
        addNotification('إعداد GitHub', 'تم تكوين النشر التلقائي بنجاح', 'success');
    } else {
        alert('❌ يرجى إدخال جميع البيانات المطلوبة');
    }
}

// ============================================
// نظام الوسائط المتعددة
// ============================================

let currentMediaType = 'text';

function setMediaType(type, event) {
    currentMediaType = type;
    const fields = ['textInput', 'pasteInput', 'cameraInput', 'fileInput'];
    fields.forEach(field => { 
        const element = document.getElementById(field); 
        if (element) element.style.display = 'none'; 
    });
    
    document.querySelectorAll('.media-type-btn').forEach(btn => { 
        btn.classList.remove('active'); 
    });
    
    if (event && event.target) event.target.classList.add('active');
    
    switch (type) {
        case 'text': 
            document.getElementById('textInput').style.display = 'block'; 
            break;
        case 'paste': 
            document.getElementById('pasteInput').style.display = 'block'; 
            break;
        case 'camera': 
            document.getElementById('cameraInput').style.display = 'block'; 
            break;
        case 'image': 
            document.getElementById('fileInput').style.display = 'block'; 
            document.getElementById('fileInput').innerHTML = `
                <div class="file-upload-area" onclick="document.getElementById('fileUpload').click()">
                    <div style="font-size: 2rem; margin-bottom: 10px;">🖼️</div>
                    <strong>انقر لرفع صورة</strong>
                    <p class="note">الصور المدعومة: JPG, PNG, GIF</p>
                </div>
                <input type="file" id="fileUpload" class="hidden" accept="image/*" onchange="handleFileUpload(event)">
            `; 
            break;
        case 'pdf': 
            document.getElementById('fileInput').style.display = 'block'; 
            document.getElementById('fileInput').innerHTML = `
                <div class="file-upload-area" onclick="document.getElementById('fileUpload').click()">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📄</div>
                    <strong>انقر لرفع ملف PDF</strong>
                    <p class="note">رفع ملف PDF</p>
                </div>
                <input type="file" id="fileUpload" class="hidden" accept=".pdf" onchange="handleFileUpload(event)">
            `; 
            break;
        case 'word': 
            document.getElementById('fileInput').style.display = 'block'; 
            document.getElementById('fileInput').innerHTML = `
                <div class="file-upload-area" onclick="document.getElementById('fileUpload').click()">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
                    <strong>انقر لرفع ملف Word</strong>
                    <p class="note">رفع ملف Word</p>
                </div>
                <input type="file" id="fileUpload" class="hidden" accept=".doc,.docx" onchange="handleFileUpload(event)">
            `; 
            break;
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileInput = document.getElementById('fileInput');
    
    reader.onload = function(e) {
        let content = '';
        const fileType = currentMediaType;
        
        if (fileType === 'image') {
            content = `![${file.name}](${e.target.result})`;
        } else if (fileType === 'pdf') {
            content = `[📄 ${file.name}](${e.target.result})`;
        } else if (fileType === 'word') {
            content = `[📋 ${file.name}](${e.target.result})`;
        }
        
        document.getElementById('kholwaText').value = content;
        
        fileInput.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📄' : '📋'}</div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.size / 1024).toFixed(2)} KB</div>
                </div>
            </div>
            <div class="media-status success">
                ✅ تم رفع الملف بنجاح
            </div>
        `;
    };

    reader.readAsDataURL(file);
}

// ============================================
// نظام المسؤول
// ============================================

function adminLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass !== 'admin123') { alert('كلمة مرور خاطئة'); return; }
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    refreshHistoryList();
    loadReport();
    document.getElementById('textInput').style.display = 'block';
    const firstBtn = document.querySelector('.media-type-btn');
    if (firstBtn) firstBtn.classList.add('active');
}

async function publishKholwa() {
    const title = document.getElementById('dayTitle').value.trim();
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const text = document.getElementById('kholwaText').value.trim();
    const qText = document.getElementById('qText').value.trim();
    const q1 = document.getElementById('q1').value.trim();
    const q2 = document.getElementById('q2').value.trim();
    const q3 = document.getElementById('q3').value.trim();
    const qCorrect = parseInt(document.getElementById('qCorrect').value);

    if (!start || !end) { alert('❌ حدد وقت البداية والنهاية'); return; }
    if (new Date(start) >= new Date(end)) { alert('❌ تأكد من أن البداية قبل النهاية'); return; }
    if (!text && currentMediaType === 'text') { alert('❌ اكتب محتوى الخلوة'); return; }

    const obj = { 
        date: todayDate(), 
        title: title || 'خلوة اليوم', 
        startISO: new Date(start).toISOString(), 
        endISO: new Date(end).toISOString(), 
        type: currentMediaType, 
        content: text, 
        question: { 
            text: qText, 
            options: [q1, q2, q3].filter(opt => opt.trim() !== ''), 
            correctIndex: qCorrect 
        } 
    };

    // حفظ محلي
    LS.set('kholwa', obj);
    const history = LS.get('history') || [];
    const day = { 
        date: obj.date, 
        title: obj.title, 
        startISO: obj.startISO, 
        endISO: obj.endISO, 
        answers: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] }, 
        qaResponses: { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} } 
    };
    history.push(day);
    LS.set('history', history);
    LS.set('answeredToday', {});

    // تحضير البيانات للمشاركة
    const sharedData = { 
        kholwa: obj, 
        history: history, 
        lastUpdated: new Date().toISOString(), 
        totalStudents: countTotalStudents(), 
        message: `خلوة ${obj.date} - ${obj.title}` 
    };

    // محاولة الرفع التلقائي إلى GitHub
    const autoUploadSuccess = await autoUploadToGitHub(sharedData);
    
    if (!autoUploadSuccess) {
        // إذا فشل الرفع التلقائي، عرض خيار التنزيل اليدوي
        downloadSharedFile(sharedData);
    }
    
    addNotification('نشر خلوة', `تم نشر "${obj.title}" بنجاح`, 'success');
}

function countTotalStudents() {
    const students = LS.get('students') || {};
    let total = 0;
    Object.values(students).forEach(classStudents => { total += classStudents.length; });
    return total;
}

function downloadSharedFile(data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showUploadInstructions();
    } catch (error) {
        alert('❌ حدث خطأ في إنشاء الملف');
    }
}

function showUploadInstructions() {
    const instructions = `🎯 **تم إنشاء ملف data.json بنجاح!**

📁 **الخطوات المطلوبة:**
1. **حمّل الملف** الذي تم تحميله تلقائياً
2. **اذهب إلى GitHub:** افتح ملف data.json الحالي وانقر "Edit" (✏️)
3. **استبدل المحتوى:** احذف كل المحتوى القديم والصق محتوى الملف الجديد
4. **انقر "Commit changes"**

✅ **بعد الحفظ:** سيتحدّث التطبيق تلقائياً خلال دقيقة
⚠️ **مهم:** لا ترفع ملف جديد، استبدل المحتوى فقط!`;
    
    const instructionHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000;"><div style="background: white; padding: 25px; border-radius: 15px; max-width: 500px; margin: 20px; max-height: 80vh; overflow-y: auto; text-align: right; direction: rtl;"><h3 style="color: #27ae60; text-align: center; margin-bottom: 20px;">✅ تم نشر الخلوة</h3><div style="background: #f8f9fa; padding: 15px; border-radius: 10px; border-right: 4px solid #3498db; white-space: pre-line; line-height: 1.6; font-size: 14px;">${instructions}</div><div style="text-align: center; margin-top: 20px;"><button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #3498db; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">فهمت 👍</button></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', instructionHTML);
}

function closeNow() {
    let kh = LS.get('kholwa');
    if (!kh) { alert('لا توجد خلوة'); return; }
    kh.endISO = new Date().toISOString();
    LS.set('kholwa', kh);
    const history = LS.get('history') || [];
    if (history.length) { history[history.length - 1].endISO = kh.endISO; LS.set('history', history); }
    const sharedOut = { kholwa: kh, history: LS.get('history') || [] };
    const blob = new Blob([JSON.stringify(sharedOut, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    alert('تم غلق الخلوة ✅ حمّل data.json وارفعه على الاستضافة');
}

function createTeacher() {
    const u = document.getElementById('tuser').value.trim();
    const p = document.getElementById('tpass').value.trim();
    const c = document.getElementById('tclass').value;
    if (!u || !p) { alert('ادخل اسم وكلمة'); return; }
    const teachers = LS.get('teachers') || [];
    teachers.push({ username: u, password: p, classId: c });
    LS.set('teachers', teachers);
    alert('تم إنشاء الخادم');
    document.getElementById('tuser').value = '';
    document.getElementById('tpass').value = '';
}

function refreshHistoryList() {
    const history = LS.get('history') || [];
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="note">لا توجد أيام سابقة</p>';
        return;
    }

    let html = '<div style="max-height: 200px; overflow-y: auto;">';
    history.slice().reverse().forEach((day, index) => {
        html += `
            <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 6px; border: 1px solid #ddd;">
                <strong>${day.date}</strong>: ${day.title}
            </div>
        `;
    });
    html += '</div>';
    historyList.innerHTML = html;
}

function loadReport() {
    const reportArea = document.getElementById('reportArea');
    const students = LS.get('students') || {};
    let totalStudents = 0;
    Object.values(students).forEach(cls => totalStudents += cls.length);
    
    const today = todayDate();
    const history = LS.get('history') || [];
    const todayData = history.find(day => day.date === today);
    
    let todayParticipants = 0;
    if (todayData && todayData.answers) {
        Object.values(todayData.answers).forEach(cls => todayParticipants += cls.length);
    }

    reportArea.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalStudents}</div>
                <div class="stat-label">إجمالي الطلاب</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${todayParticipants}</div>
                <div class="stat-label">مشاركين اليوم</div>
            </div>
        </div>
    `;
}

// ============================================
// نظام الخدام - مع عرض الخلوة
// ============================================

function teacherLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const teachers = LS.get('teachers') || [];
    const found = teachers.find(t => t.username === u && t.password === p);
    if (!found) return alert('بيانات دخول خاطئة');
    
    // تسجيل دخول الخادم
    teachers.forEach(t => t.loggedIn = false);
    found.loggedIn = true;
    LS.set('teachers', teachers);
    
    document.getElementById('teacherLoginBox').style.display = 'none';
    document.getElementById('teacherPanel').style.display = 'block';
    document.getElementById('teacherClass').innerText = found.classId;
    
    // عرض الخلوة الحالية للخادم
    showKholwaForTeacher(found.classId);
    loadTeacherStatus(found.classId);
}

async function showKholwaForTeacher(classId) {
    console.log('عرض الخلوة للخادم، الفصل:', classId);
    
    const shared = await fetchSharedData();
    const kh = shared.kholwa;
    const teacherKholwa = document.getElementById('teacherKholwa');
    
    if (!teacherKholwa) {
        console.error('عنصر teacherKholwa غير موجود');
        return;
    }
    
    console.log('بيانات الخلوة:', kh);
    
    if (!kh) {
        teacherKholwa.innerHTML = `
            <div class="kholwa-card">
                <h3 style="color: #666; text-align: center;">📭 لا توجد خلوة نشطة لليوم</h3>
                <p class="note" style="text-align: center;">انتظر حتى ينشر المسؤول الخلوة اليومية</p>
            </div>
        `;
        return;
    }

    // التحقق من توقيت الخلوة
    const now = new Date();
    const start = new Date(kh.startISO);
    const end = new Date(kh.endISO);
    const isToday = kh.date === todayDate();
    
    console.log('التحقق من التوقيت:', { now, start, end, isToday });
    
    if (!isToday) {
        teacherKholwa.innerHTML = `
            <div class="kholwa-card">
                <h3 style="color: #666; text-align: center;">📅 الخلوة ليست لليوم الحالي</h3>
                <p class="note" style="text-align: center;">تاريخ الخلوة: ${kh.date}</p>
            </div>
        `;
        return;
    }
    
    if (now < start) {
        teacherKholwa.innerHTML = `
            <div class="kholwa-card">
                <h3 style="color: #666; text-align: center;">⏳ الخلوة ستبدأ قريباً</h3>
                <p class="note" style="text-align: center;">تبدأ في: ${start.toLocaleString('ar-EG')}</p>
                <p class="note" style="text-align: center;">الوقت المتبقي: ${Math.max(0, Math.floor((start - now) / 60000))} دقيقة</p>
            </div>
        `;
        return;
    }
    
    if (now > end) {
        teacherKholwa.innerHTML = `
            <div class="kholwa-card">
                <h3 style="color: #666; text-align: center;">✅ انتهت الخلوة</h3>
                <p class="note" style="text-align: center;">شكراً لمشاركتكم اليوم ❤️</p>
                <p class="note" style="text-align: center;">انتهت في: ${end.toLocaleString('ar-EG')}</p>
            </div>
        `;
        return;
    }

    // عرض محتوى الخلوة
    let contentHTML = '';
    if (kh.type === 'text') {
        contentHTML = `<div class="kholwa-content" style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-right: 4px solid #3498db;">${kh.content.replace(/\n/g, '<br>')}</div>`;
    } else if (kh.type === 'image') {
        const imageMatch = kh.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) {
            contentHTML = `
                <div style="text-align: center;">
                    <img src="${imageMatch[1]}" alt="صورة الخلوة" 
                         style="max-width:100%; border-radius:12px; margin:10px 0; border: 3px solid #e0e0e0;">
                    <p class="note">🖼️ صورة الخلوة</p>
                </div>
            `;
        } else {
            contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
        }
    } else {
        contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
    }

    teacherKholwa.innerHTML = `
        <div class="kholwa-card" style="background: linear-gradient(135deg, #ffffff, #f8f9fa);">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3498db;">
                👁️ ${kh.title || 'خلوة اليوم'} - للفصل ${classId}
            </h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
            ${kh.question && kh.question.text ? `
                <div style="margin-top: 25px; padding: 20px; background: #fff3cd; border-radius: 10px; border-right: 4px solid #f39c12;">
                    <h4 style="color: #e74c3c; margin-bottom: 15px; text-align: center;">🧠 سؤال اليوم (للطلاب)</h4>
                    <p style="font-size: 1.1rem; font-weight: 600; text-align: center; margin-bottom: 15px;">${kh.question.text}</p>
                    <div style="margin-top: 15px;">
                        ${kh.question.options.map((option, index) => `
                            <div style="padding: 12px; margin: 8px 0; background: white; border-radius: 8px; border: 2px solid #ddd; display: flex; align-items: center;">
                                <span style="background: ${index === kh.question.correctIndex ? '#27ae60' : '#3498db'}; color: white; padding: 4px 10px; border-radius: 50%; margin-left: 10px; font-weight: bold;">
                                    ${index + 1}
                                </span>
                                <span style="flex: 1;">${option}</span>
                                ${index === kh.question.correctIndex ? '<span style="color: #27ae60; font-weight: bold;">✅ الإجابة الصحيحة</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #3498db; font-weight: 600;">⏰ وقت الخلوة: ${new Date(kh.startISO).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})} - ${new Date(kh.endISO).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
        </div>
    `;
    
    console.log('تم عرض الخلوة للخادم بنجاح');
}
function addStudents() {
    const txt = document.getElementById('studentNames').value.trim();
    if (!txt) return alert('ادخل أسماء');
    const arr = txt.split(',').map(s => s.trim()).filter(Boolean);
    const students = LS.get('students') || {};
    const cls = document.getElementById('teacherClass').innerText;
    let list = students[cls] || [];
    arr.forEach(n => { if (n && !list.find(s => s.name === n)) list.push({ name: n, answeredDates: [] }); });
    students[cls] = list;
    LS.set('students', students);
    document.getElementById('studentNames').value = '';
    alert('تم إضافة الطلاب بنجاح');
    loadTeacherStatus(cls);
}

function loadTeacherStatus(classId) {
    const teacherDashboard = document.getElementById('teacherDashboard');
    const teacherStatus = document.getElementById('teacherStatus');
    
    if (!teacherDashboard || !teacherStatus) return;
    
    const students = LS.get('students') || {};
    const classStudents = students[classId] || [];
    const history = LS.get('history') || [];
    const today = history.find(day => day.date === todayDate());
    
    let dashboardHTML = `
        <div class="teacher-dashboard">
            <h4>📊 لوحة تحكم الفصل ${classId}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold;">${classStudents.length}</div>
                    <div style="font-size: 0.8rem;">إجمالي الطلاب</div>
                </div>
                <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
                    <div style="font-size: 1.5rem; font-weight: bold;">${today ? (today.answers[classId] || []).length : 0}</div>
                    <div style="font-size: 0.8rem;">مشاركين اليوم</div>
                </div>
            </div>
        </div>
    `;
    
    let statusHTML = '<h4>👥 قائمة الطلاب</h4>';
    
    if (classStudents.length === 0) {
        statusHTML += '<p class="note">لا يوجد طلاب في هذا الفصل</p>';
    } else {
        classStudents.forEach(student => {
            const points = getStudentPoints(classId, student.name);
            const hasAnsweredToday = today ? (today.answers[classId] || []).includes(student.name) : false;
            const performance = getStudentPerformance(points);
            
            statusHTML += `
                <div class="student-progress-card">
                    <div style="display: flex; justify-content: between; align-items: center;">
                        <div style="flex: 1;">
                            <strong>${student.name}</strong>
                            <span class="performance-badge ${performance.class}">${performance.text}</span>
                        </div>
                        <div style="text-align: left;">
                            <span class="points-badge">${points} نقطة</span>
                            ${hasAnsweredToday ? '✅' : '❌'}
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min((points / 100) * 100, 100)}%"></div>
                    </div>
                </div>
            `;
        });
    }
    
    teacherDashboard.innerHTML = dashboardHTML;
    teacherStatus.innerHTML = statusHTML;
}

function getStudentPerformance(points) {
    if (points >= 100) return { text: 'متميز', class: 'performance-excellent' };
    if (points >= 50) return { text: 'جيد جداً', class: 'performance-good' };
    if (points >= 20) return { text: 'جيد', class: 'performance-average' };
    return { text: 'يحتاج تحسن', class: 'performance-needs-improvement' };
}

// ============================================
// نظام الطفل - الإصدار المؤكد
// ============================================

function enterKholwa() {
    const nameInput = document.getElementById('childName');
    const classSelect = document.getElementById('childClass');
    
    if (!nameInput || !classSelect) {
        alert('❌ عناصر الإدخال غير موجودة');
        return;
    }
    
    const name = nameInput.value.trim();
    const cls = classSelect.value;
    
    if (!name) {
        alert('❌ الرجاء إدخال الاسم');
        nameInput.focus();
        return;
    }
    
    // حفظ بيانات الطالب
    const students = LS.get('students') || {};
    if (!students[cls]) {
        students[cls] = [];
    }
    
    // التحقق من وجود الطالب وإضافته إذا لم يكن موجوداً
    const studentExists = students[cls].some(student => student.name === name);
    if (!studentExists) {
        students[cls].push({ 
            name: name, 
            answeredDates: [],
            joinDate: new Date().toISOString()
        });
        LS.set('students', students);
    }
    
    // الانتقال إلى شاشة الخلوة
    showKholwaForChild(name, cls);
}

async function showKholwaForChild(name, cls) {
    const enter = document.getElementById('childEntry');
    const view = document.getElementById('kholwaView');
    
    if (!enter || !view) {
        alert('❌ عناصر العرض غير موجودة');
        return;
    }
    
    // إخفاء شاشة الدخول وإظهار شاشة الخلوة
    enter.style.display = 'none';
    view.style.display = 'block';
    
    try {
        // جلب البيانات من السيرفر
        const shared = await fetchSharedData();
        const kh = shared.kholwa;
        
        if (!kh) {
            showNoKholwaMessage();
            return;
        }
        
        // التحقق من توقيت الخلوة
        const now = new Date();
        const start = new Date(kh.startISO);
        const end = new Date(kh.endISO);
        const isToday = kh.date === todayDate();
        
        if (!isToday || now < start || now > end) {
            showKholwaClosedMessage(isToday, now, start, end);
            return;
        }
        
        // عرض محتوى الخلوة
        displayKholwaContentForChild(kh, name, cls);
        
    } catch (error) {
        showErrorMessage('حدث خطأ في تحميل الخلوة. حاول مرة أخرى.');
    }
}

function showNoKholwaMessage() {
    document.getElementById('kholwaContent').innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">📖</div>
            <h3 style="color: #666; margin-bottom: 15px;">لا توجد خلوة نشطة حالياً</h3>
            <p class="note" style="margin-bottom: 25px;">انتظر حتى ينشر المسؤول الخلوة اليومية</p>
            <button onclick="goHome()" class="btn" style="background: #3498db; color: white; padding: 12px 30px; border-radius: 25px;">
                🏠 العودة للرئيسية
            </button>
        </div>
    `;
}

function showKholwaClosedMessage(isToday, now, start, end) {
    let message = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️';
    let icon = '⏰';
    
    if (!isToday) {
        message = 'لا توجد خلوة لليوم الحالي';
        icon = '📅';
    } else if (now < start) {
        message = `الخلوة ستبدأ في:<br><strong>${start.toLocaleString('ar-EG')}</strong>`;
        icon = '🕒';
    } else if (now > end) {
        message = 'انتهت فترة الخلوة لهذا اليوم';
        icon = '✅';
    }
    
    document.getElementById('kholwaContent').innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">${icon}</div>
            <h3 style="color: #666; margin-bottom: 15px; line-height: 1.5;">${message}</h3>
            <button onclick="goHome()" class="btn" style="background: #3498db; color: white; padding: 12px 30px; border-radius: 25px; margin-top: 20px;">
                🏠 العودة للرئيسية
            </button>
        </div>
    `;
}

function displayKholwaContentForChild(kh, name, cls) {
    // عرض النقاط الحالية
    const currentPoints = getStudentPoints(cls, name);
    const pointsDisplay = `
        <div style="text-align: center; margin: 10px 0; padding: 15px; 
                    background: linear-gradient(135deg, #667eea, #764ba2); 
                    color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="font-size: 1.1rem;">🎯 مرحباً ${name}</div>
            <div style="font-size: 2rem; font-weight: 800; margin: 10px 0;">${currentPoints} نقطة</div>
            <div style="font-size: 0.9rem;">استمر في المشاركة لكسب المزيد!</div>
        </div>
    `;

    // عرض محتوى الخلوة
    let contentHTML = '';
    if (kh.type === 'text') {
        contentHTML = `<div class="kholwa-content">${kh.content.replace(/\n/g, '<br>')}</div>`;
    } else if (kh.type === 'image') {
        const imageMatch = kh.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) {
            contentHTML = `
                <div style="text-align: center;">
                    <img src="${imageMatch[1]}" alt="صورة الخلوة" 
                         style="max-width:100%; height:auto; border-radius:12px; margin:10px 0;">
                </div>
            `;
        } else {
            contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
        }
    } else {
        contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
    }

    document.getElementById('kholwaContent').innerHTML = `
        ${pointsDisplay}
        <div class="kholwa-card">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">${kh.title || 'خلوة اليوم'}</h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
        </div>
    `;

    // عرض السؤال إذا وجد
    displayQuestionForChild(kh, name, cls);
}

function displayQuestionForChild(kh, name, cls) {
    const questionArea = document.getElementById('questionArea');
    const choicesArea = document.getElementById('choicesArea');
    const resultArea = document.getElementById('resultArea');
    
    // التحقق إذا كان الطفل قد أجاب اليوم
    const answeredToday = LS.get('answeredToday') || {};
    const todayKey = `${todayDate()}_${cls}_${name}`;
    const hasAnsweredToday = answeredToday[todayKey];

    if (kh.question && kh.question.text && !hasAnsweredToday) {
        questionArea.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border-right: 4px solid #e74c3c;">
                <h4 style="color: #e74c3c; margin-bottom: 15px; text-align: center;">🧠 سؤال اليوم</h4>
                <p style="font-size: 1.1rem; font-weight: 600; text-align: center;">${kh.question.text}</p>
            </div>
        `;
        
        let choicesHTML = '<div style="margin-top: 15px;">';
        kh.question.options.forEach((option, index) => {
            if (option && option.trim() !== '') {
                choicesHTML += `
                    <button class="answer-option" 
                            onclick="handleAnswerSelection(${index}, '${name.replace(/'/g, "\\'")}', '${cls}')"
                            style="display: block; width: 100%; margin: 12px 0; padding: 16px; 
                                   border-radius: 12px; border: 2px solid #3498db; 
                                   background: white; cursor: pointer; font-size: 16px;
                                   font-weight: 600;">
                        ${option}
                    </button>
                `;
            }
        });
        choicesHTML += '</div>';
        choicesArea.innerHTML = choicesHTML;
    } else if (hasAnsweredToday) {
        questionArea.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; background: #e8f4fd; 
                        border-radius: 12px; margin: 20px 0; border: 2px solid #27ae60;">
                <div style="font-size: 3rem; margin-bottom: 15px;">✅</div>
                <h4 style="color: #27ae60; margin-bottom: 10px;">أحسنت!</h4>
                <p style="color: #666; font-size: 1rem;">لقد أجبت على سؤال اليوم بالفعل</p>
            </div>
        `;
        choicesArea.innerHTML = '';
    } else {
        questionArea.innerHTML = '';
        choicesArea.innerHTML = '';
    }
    resultArea.innerHTML = '';
}

function handleAnswerSelection(selectedIndex, studentName, studentClass) {
    fetchSharedData().then(shared => {
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
        if (!kh || !kh.question) return;

        const answeredToday = LS.get('answeredToday') || {};
        const todayKey = `${todayDate()}_${studentClass}_${studentName}`;
        
        if (answeredToday[todayKey]) {
            document.getElementById('resultArea').innerHTML = '<div style="color: #e67e22; font-weight: bold; text-align: center; padding: 15px; background: #fef9e7; border-radius: 8px; margin: 10px 0;">⚠️ لقد أجبت على سؤال اليوم بالفعل!</div>';
            return;
        }

        const isCorrect = selectedIndex === kh.question.correctIndex;
        const resultArea = document.getElementById('resultArea');
        
        if (isCorrect) {
            answeredToday[todayKey] = true;
            LS.set('answeredToday', answeredToday);
            
            const pointsEarned = 10;
            const currentPoints = getStudentPoints(studentClass, studentName);
            const newPoints = currentPoints + pointsEarned;
            
            resultArea.innerHTML = `
                <div style="color: #27ae60; font-weight: bold; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 10px 0;">
                    ✅ إجابة صحيحة! أحسنت!<br>
                    <div style="margin-top: 10px;">
                        <span style="background: #ffd700; color: #000; padding: 4px 12px; border-radius: 15px; font-weight: 700;">
                            تم إضافة ${pointsEarned} نقاط
                        </span><br>
                        <span style="font-size: 1.1rem; margin-top: 5px; display: inline-block;">
                            رصيدك الحالي: ${newPoints} نقطة
                        </span>
                    </div>
                </div>
            `;
            
            awardPoints(studentName, studentClass, pointsEarned);
        } else {
            resultArea.innerHTML = '<div style="color: #e74c3c; font-weight: bold; text-align: center; padding: 15px; background: #f8d7da; border-radius: 8px; margin: 10px 0;">❌ إجابة خاطئة، حاول مرة أخرى!</div>';
        }
        
        // تعطيل جميع أزرار الإجابة
        document.querySelectorAll('.answer-option').forEach(btn => { 
            btn.disabled = true; 
            btn.style.background = '#f8f9fa'; 
            btn.style.cursor = 'not-allowed'; 
            btn.style.opacity = '0.7'; 
        });

        // تمييز الإجابة الصحيحة
        const correctBtn = document.querySelectorAll('.answer-option')[kh.question.correctIndex];
        if (correctBtn) { 
            correctBtn.style.background = '#27ae60'; 
            correctBtn.style.color = 'white'; 
            correctBtn.style.borderColor = '#27ae60'; 
        }
    });
}

function awardPoints(studentName, studentClass, points) {
    try {
        const studentPoints = LS.get('studentPoints') || {};
        const pointsKey = `${studentClass}_${studentName}`;
        studentPoints[pointsKey] = (studentPoints[pointsKey] || 0) + points;
        LS.set('studentPoints', studentPoints);
        updateTodayAnswers(studentName, studentClass, points);
        addNotification('نقاط جديدة!', `كسب ${studentName} ${points} نقطة`, 'success');
    } catch (error) { console.error('خطأ في منح النقاط:', error); }
}

function updateTodayAnswers(studentName, studentClass, points) {
    try {
        let history = LS.get('history') || [];
        let todayIndex = history.findIndex(day => day.date === todayDate());
        let today;
        if (todayIndex === -1) {
            today = { 
                date: todayDate(), 
                title: 'خلوة اليوم', 
                startISO: new Date().toISOString(), 
                endISO: new Date().toISOString(), 
                answers: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] }, 
                qaResponses: { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} } 
            };
            history.push(today);
            todayIndex = history.length - 1;
        } else today = history[todayIndex];
        
        if (!today.answers) today.answers = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
        if (!today.qaResponses) today.qaResponses = { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} };
        if (!today.answers[studentClass]) today.answers[studentClass] = [];
        if (!today.qaResponses[studentClass]) today.qaResponses[studentClass] = {};
        
        if (!today.answers[studentClass].includes(studentName)) today.answers[studentClass].push(studentName);
        today.qaResponses[studentClass][studentName] = points;
        
        LS.set('history', history);
    } catch (error) { console.error('خطأ في تحديث التاريخ:', error); }
}

// ============================================
// نظام النقاط والصور
// ============================================

function getStudentPoints(cls, name) {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    return studentPoints[pointsKey] || 0;
}

// ============================================
// نظام الإشعارات
// ============================================

function addNotification(title, message, type = 'info') {
    const notifications = LS.get('notifications') || [];
    const notification = { 
        id: Date.now(), 
        title: title, 
        message: message, 
        type: type, 
        date: new Date().toLocaleString('ar-EG'), 
        read: false 
    };
    notifications.unshift(notification);
    LS.set('notifications', notifications.slice(0, 50));
    updateNotifications();
}

function updateNotifications() {
    const notifications = LS.get('notifications') || [];
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) { badge.textContent = unreadCount; badge.style.display = unreadCount > 0 ? 'flex' : 'none'; }
}

function showNotificationsPanel() {
    const notifications = LS.get('notifications') || [];
    let notificationsHTML = '<h3>🔔 الإشعارات</h3>';
    if (notifications.length === 0) notificationsHTML += '<p class="note">لا توجد إشعارات</p>';
    else notifications.forEach(notif => { 
        notificationsHTML += `
            <div class="notification-item">
                <strong>${notif.title}</strong><br>
                <small>${notif.message}</small><br>
                <small style="color:#666">${notif.date}</small>
            </div>
        `; 
    });
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>الإشعارات</title>
                <style>
                    body { font-family: Arial; margin: 20px; background: #f8f9fa; }
                    .notification-item { background: white; padding: 12px; margin: 8px 0; border-radius: 8px; }
                </style>
            </head>
            <body>
                ${notificationsHTML}
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button>
            </body>
        </html>
    `);
}

// ============================================
// لوحة المتصدرين
// ============================================

function showLeaderboard() {
    const students = LS.get('students') || {};
    let allStudents = [];
    Object.keys(students).forEach(cls => { 
        students[cls].forEach(student => { 
            allStudents.push({ 
                name: student.name, 
                class: cls, 
                points: getStudentPoints(cls, student.name) 
            }); 
        }); 
    });
    allStudents.sort((a, b) => b.points - a.points);
    
    let leaderboardHTML = '<h2>🏆 لوحة المتصدرين</h2>';
    if (allStudents.length === 0) leaderboardHTML += '<p>لا توجد بيانات بعد</p>';
    else allStudents.slice(0, 10).forEach((student, index) => { 
        let medal = ''; 
        if (index === 0) medal = ' 🥇'; 
        else if (index === 1) medal = ' 🥈'; 
        else if (index === 2) medal = ' 🥉'; 
        leaderboardHTML += `
            <div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd;">
                <div style="font-size: 1.2rem; font-weight: 800; min-width: 30px;">${index + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 700;">${student.name} ${medal}</div>
                    <div style="color: #666; font-size: 0.9rem;">الفصل: ${student.class} | النقاط: ${student.points}</div>
                </div>
            </div>
        `; 
    });
    
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>لوحة المتصدرين</title>
                <style>
                    body { font-family: Arial; margin: 20px; background: #fffaf2; }
                </style>
            </head>
            <body>
                ${leaderboardHTML}
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button>
            </body>
        </html>
    `);
}

// ============================================
// دوال مساعدة
// ============================================

function showErrorMessage(message) {
    alert(message);
}

function showAnalytics() {
    alert('هذه الميزة قيد التطوير');
}

function createManualBackup() {
    alert('هذه الميزة قيد التطوير');
}

function resetAll() {
    if (confirm('⚠️ هل أنت متأكد من تصفير جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
        localStorage.clear();
        initializeData();
        alert('✅ تم تصفير جميع البيانات');
        location.reload();
    }
}

// ============================================
// تهيئة التطبيق
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('تطبيق الخلوة تم تحميله بنجاح!');
    
    // تحديث المعلومات الرئيسية عند التحميل
    updateMainInfo();
    
    // تعيين الحد الأدنى للوقت على الوقت الحالي
    const now = new Date();
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    
    if (startTime) {
        startTime.min = now.toISOString().slice(0, 16);
    }
    if (endTime) {
        endTime.min = now.toISOString().slice(0, 16);
    }
    
    console.log('جميع الدوال جاهزة للاستخدام!');
});
// أضف هذه الدالة في نهاية الملف للمساعدة في التصحيح
function debugTeacherView() {
    console.log('=== تصحيح عرض الخلوة للخادم ===');
    
    const teachers = LS.get('teachers') || [];
    const loggedInTeacher = teachers.find(t => t.loggedIn);
    
    console.log('الخادم المسجل:', loggedInTeacher);
    console.log('عنصر teacherKholwa:', document.getElementById('teacherKholwa'));
    console.log('بيانات الخلوة:', LS.get('kholwa'));
    
    if (loggedInTeacher) {
        showKholwaForTeacher(loggedInTeacher.classId);
    } else {
        console.log('لا يوجد خادم مسجل دخول');
    }
}

// وأضف زر التصحيح في HTML في قسم الخدام
function addDebugButton() {
    const teacherPanel = document.getElementById('teacherPanel');
    if (teacherPanel && !document.getElementById('debugBtn')) {
        const debugBtn = document.createElement('button');
        debugBtn.id = 'debugBtn';
        debugBtn.className = 'btn';
        debugBtn.style.background = '#e67e22';
        debugBtn.style.color = 'white';
        debugBtn.style.marginTop = '10px';
        debugBtn.innerHTML = '🐛 تصحيح العرض';
        debugBtn.onclick = debugTeacherView;
        teacherPanel.appendChild(debugBtn);
    }
}

// واستدع هذه الدالة في teacherLogin
function teacherLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const teachers = LS.get('teachers') || [];
    const found = teachers.find(t => t.username === u && t.password === p);
    if (!found) return alert('بيانات دخول خاطئة');
    
    // تسجيل دخول الخادم
    teachers.forEach(t => t.loggedIn = false);
    found.loggedIn = true;
    LS.set('teachers', teachers);
    
    document.getElementById('teacherLoginBox').style.display = 'none';
    document.getElementById('teacherPanel').style.display = 'block';
    document.getElementById('teacherClass').innerText = found.classId;
    
    // عرض الخلوة الحالية للخادم
    showKholwaForTeacher(found.classId);
    loadTeacherStatus(found.classId);
    
    // إضافة زر التصحيح
    setTimeout(addDebugButton, 1000);
}
