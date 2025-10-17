// ============================================
// الدوال الأساسية للبرنامج
// ============================================

const SHARED = 'data.json';

async function fetchShared() {
    try {
        const r = await fetch(SHARED + '?_=' + Date.now());
        if (!r.ok) throw new Error('Network error');
        return await r.json();
    } catch (e) {
        return null;
    }
}

const LS = {
    get(k) {
        try {
            return JSON.parse(localStorage.getItem(k));
        } catch (e) {
            return null;
        }
    },
    set(k, v) {
        localStorage.setItem(k, JSON.stringify(v));
    }
};

// تهيئة البيانات الأساسية
function initializeData() {
    if (!LS.get('teachers')) LS.set('teachers', []);
    if (!LS.get('students')) LS.set('students', { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] });
    if (!LS.get('history')) LS.set('history', []);
    if (!LS.get('studentPhotos')) LS.set('studentPhotos', {});
    if (!LS.get('studentPoints')) LS.set('studentPoints', {});
    if (!LS.get('notifications')) LS.set('notifications', []);
    if (!LS.get('studentMessages')) LS.set('studentMessages', {});
}

// استدعاء التهيئة عند تحميل الصفحة
initializeData();

function todayDate() {
    return new Date().toISOString().slice(0, 10);
}

// الدوال الأساسية للواجهة
function showPanel(id) {
    console.log('عرض لوحة:', id);
    document.getElementById('home').style.display = 'none';
    ['admin', 'teacher', 'child'].forEach(p => {
        const element = document.getElementById(p);
        if (element) element.style.display = (p === id) ? 'block' : 'none';
    });
    updateMainInfo();
    updateNotifications();
}

function goHome() {
    console.log('العودة للصفحة الرئيسية');
    document.getElementById('home').style.display = 'block';
    ['admin', 'teacher', 'child'].forEach(p => {
        const element = document.getElementById(p);
        if (element) element.style.display = 'none';
    });
    const mainInfo = document.getElementById('mainInfo');
    if (mainInfo) mainInfo.style.display = 'none';
}

async function updateMainInfo() {
    const shared = await fetchShared();
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
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
    
    if (!kh || kh.date !== todayDate()) {
        el.innerText = 'لا توجد خلوة الآن';
        return;
    }
    const now = new Date();
    const end = new Date(kh.endISO);
    const start = new Date(kh.startISO);
    if (now < start) {
        el.innerText = 'الخلوة ستبدأ في: ' + start.toLocaleString();
        return;
    }
    if (now > end) {
        el.innerText = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️';
        return;
    }
    const diff = end - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerText = 'الوقت المتبقي: ' + (h + ' ساعة ' + m + ' دقيقة ' + s + ' ثانية');
}

// تحديث المؤقت كل ثانية
setInterval(() => {
    fetchShared().then(shared => {
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
        updateTimerDisplay(kh);
    });
}, 1000);

// ============================================
// نظام الوسائط المتعددة
// ============================================

let currentMediaType = 'text';

function setMediaType(type, event) {
    console.log('تم النقر على:', type);
    currentMediaType = type;
    
    // إخفاء جميع الحقول أولاً
    const fields = ['textInput', 'pasteInput', 'cameraInput', 'fileInput'];
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) element.style.display = 'none';
    });
    
    // إزالة النشط من جميع الأزرار
    document.querySelectorAll('.media-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إضافة النشط للزر المحدد
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // إظهار الحقل المحدد
    switch (type) {
        case 'text':
            document.getElementById('textInput').style.display = 'block';
            break;
        case 'paste':
            document.getElementById('pasteInput').style.display = 'block';
            break;
        case 'camera':
            document.getElementById('cameraInput').style.display = 'block';
            initCamera();
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

// ============================================
// نظام المسؤول
// ============================================

function adminLogin() {
    const pass = document.getElementById('adminPass').value;
    if (pass !== 'admin123') {
        alert('كلمة مرور خاطئة');
        return;
    }
    document.getElementById('adminLoginBox').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    refreshHistoryList();
    loadReport();
    
    // تفعيل النص كافتراضي
    document.getElementById('textInput').style.display = 'block';
    const firstBtn = document.querySelector('.media-type-btn');
    if (firstBtn) firstBtn.classList.add('active');
}

function publishKholwa() {
    const title = document.getElementById('dayTitle').value.trim();
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const text = document.getElementById('kholwaText').value.trim();
    const qText = document.getElementById('qText').value.trim();
    const q1 = document.getElementById('q1').value.trim();
    const q2 = document.getElementById('q2').value.trim();
    const q3 = document.getElementById('q3').value.trim();
    const qCorrect = parseInt(document.getElementById('qCorrect').value);

    if (!start || !end) {
        alert('حدد البداية والنهاية');
        return;
    }
    if (new Date(start) >= new Date(end)) {
        alert('تأكد من أن البداية قبل النهاية');
        return;
    }

    const obj = {
        date: todayDate(),
        title: title || 'خلوة اليوم',
        startISO: new Date(start).toISOString(),
        endISO: new Date(end).toISOString(),
        type: currentMediaType,
        content: text,
        question: { text: qText, options: [q1, q2, q3], correctIndex: qCorrect }
    };

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

    const shared = { kholwa: obj, history: history };
    const blob = new Blob([JSON.stringify(shared, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    alert('تم نشر الخلوة ✅ حمل ملف data.json وارفعه على الاستضافة (نفس المجلد)');
}

function closeNow() {
    let kh = LS.get('kholwa');
    if (!kh) {
        alert('لا توجد خلوة');
        return;
    }
    kh.endISO = new Date().toISOString();
    LS.set('kholwa', kh);
    const history = LS.get('history') || [];
    if (history.length) {
        history[history.length - 1].endISO = kh.endISO;
        LS.set('history', history);
    }

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
    if (!u || !p) {
        alert('ادخل اسم وكلمة');
        return;
    }
    const teachers = LS.get('teachers') || [];
    teachers.push({ username: u, password: p, classId: c });
    LS.set('teachers', teachers);
    alert('تم إنشاء الخادم');
    document.getElementById('tuser').value = '';
    document.getElementById('tpass').value = '';
}

// ============================================
// نظام الخدام
// ============================================

function teacherLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const teachers = LS.get('teachers') || [];
    const found = teachers.find(t => t.username === u && t.password === p);
    if (!found) return alert('بيانات دخول خاطئة');

    document.getElementById('teacherLoginBox').style.display = 'none';
    document.getElementById('teacherPanel').style.display = 'block';
    document.getElementById('teacherClass').innerText = found.classId;
}

function addStudents() {
    const txt = document.getElementById('studentNames').value.trim();
    if (!txt) return alert('ادخل أسماء');
    const arr = txt.split(',').map(s => s.trim()).filter(Boolean);
    const students = LS.get('students') || {};
    const cls = document.getElementById('teacherClass').innerText;
    let list = students[cls] || [];
    arr.forEach(n => {
        if (n && !list.find(s => s.name === n)) list.push({ name: n, answeredDates: [] });
    });
    students[cls] = list;
    LS.set('students', students);
    document.getElementById('studentNames').value = '';
    alert('تم إضافة الطلاب بنجاح');
}

// ============================================
// نظام الطفل
// ============================================

function enterKholwa() {
    const name = document.getElementById('childName').value.trim();
    const cls = document.getElementById('childClass').value;
    if (!name) return alert('ادخل الاسم');
    const students = LS.get('students') || {};
    let list = students[cls] || [];
    if (!list.find(s => s.name === name)) {
        list.push({ name: name, answeredDates: [] });
        students[cls] = list;
        LS.set('students', students);
    }
    showKholwaFor(name, cls);
}

async function showKholwaFor(name, cls) {
    const shared = await fetchShared();
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
    const enter = document.getElementById('childEntry');
    const view = document.getElementById('kholwaView');

    if (!enter || !view) return;

    if (!kh || kh.date !== todayDate() || new Date() < new Date(kh.startISO) || new Date() > new Date(kh.endISO)) {
        enter.style.display = 'none';
        view.style.display = 'block';
        document.getElementById('kholwaContent').innerHTML = '<p class="note">الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️</p>';
        return;
    }

    enter.style.display = 'none';
    view.style.display = 'block';
    document.getElementById('kholwaContent').innerHTML = `
        <div class="note">
            <h3>${kh.title || 'خلوة اليوم'}</h3>
            <p>${kh.content || ''}</p>
            ${kh.question ? `<p><strong>سؤال:</strong> ${kh.question.text}</p>` : ''}
        </div>
    `;
}

// ============================================
// نظام النقاط والصور
// ============================================

function getStudentPoints(cls, name) {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    return studentPoints[pointsKey] || 0;
}

function getStudentPhoto(cls, name) {
    const studentPhotos = LS.get('studentPhotos') || {};
    return studentPhotos[`${cls}_${name}`] || 'https://via.placeholder.com/60/fffaf2/d9b382?text=👦';
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
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function showNotificationsPanel() {
    const notifications = LS.get('notifications') || [];
    
    let notificationsHTML = '<h3>🔔 الإشعارات</h3>';
    if (notifications.length === 0) {
        notificationsHTML += '<p class="note">لا توجد إشعارات</p>';
    } else {
        notifications.forEach(notif => {
            notificationsHTML += `
                <div class="notification-item">
                    <strong>${notif.title}</strong><br>
                    <small>${notif.message}</small><br>
                    <small style="color:#666">${notif.date}</small>
                </div>
            `;
        });
    }

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
            const points = getStudentPoints(cls, student.name);
            allStudents.push({
                name: student.name,
                class: cls,
                points: points
            });
        });
    });

    allStudents.sort((a, b) => b.points - a.points);

    let leaderboardHTML = '<h2>🏆 لوحة المتصدرين</h2>';
    if (allStudents.length === 0) {
        leaderboardHTML += '<p>لا توجد بيانات بعد</p>';
    } else {
        allStudents.slice(0, 10).forEach((student, index) => {
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
    }

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
// الدوال المساعدة
// ============================================

async function refreshHistoryList() {
    const history = LS.get('history') || [];
    const container = document.getElementById('historyList');
    if (!container) return;
    
    if (!history.length) {
        container.innerHTML = '<p class="note">لا توجد أيام سابقة</p>';
        return;
    }
    let html = '';
    history.forEach((d, idx) => {
        html += `<div style="padding:6px;border-bottom:1px solid #efe8d8">
            <strong>${d.date}</strong> — ${d.title || 'خلوة'}<br>
            <button onclick="showDayDetails(${idx})" style="margin-top:6px;padding:6px;border-radius:8px;background:#eee;border:none;cursor:pointer">تفاصيل اليوم</button>
        </div>`;
    });
    container.innerHTML = html;
}

async function loadReport() {
    const students = LS.get('students') || {};
    const container = document.getElementById('reportArea');
    if (!container) return;
    
    let html = '<table class="table"><tr><th>الفصل</th><th>الاسم</th><th>النقاط</th></tr>';
    Object.keys(students).forEach(cls => {
        students[cls].forEach(s => {
            const points = getStudentPoints(cls, s.name);
            html += `<tr><td>${cls}</td><td>${s.name}</td><td>${points}</td></tr>`;
        });
    });
    html += '</table>';
    container.innerHTML = html;
}

function loadTeacherStatus(cls) {
    const students = LS.get('students') || {};
    const list = students[cls] || [];
    const container = document.getElementById('teacherStatus');
    if (!container) return;
    
    let html = '';
    list.forEach(s => {
        const points = getStudentPoints(cls, s.name);
        html += `<li>${s.name} — النقاط: ${points}</li>`;
    });
    container.innerHTML = html;
}

// ============================================
// التهيئة النهائية
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initializeData();
    updateNotifications();
    console.log('تم تحميل البرنامج بنجاح!');
    
    // تفعيل النص كافتراضي إذا كان المستخدم مسؤول
    if (document.getElementById('textInput')) {
        document.getElementById('textInput').style.display = 'block';
    }
});
