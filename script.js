// ============================================
// الدوال الأساسية للبرنامج
// ============================================

const SHARED = 'data.json';

async function fetchShared() {
    const fallbackData = { 
        kholwa: LS.get('kholwa'), 
        history: LS.get('history') || [],
        source: 'local'
    };
    
    try {
        const response = await fetch(SHARED + '?t=' + Date.now());
        if (!response.ok) throw new Error(`خطأ في السيرفر: ${response.status}`);
        const data = await response.json();
        return { ...data, source: 'server' };
    } catch (error) {
        return fallbackData;
    }
}

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
    const shared = await fetchShared();
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
    const mainInfo = document.getElementById('mainInfo');
    const todayTitle = document.getElementById('todayTitle');
    
    if (!mainInfo || !todayTitle) return;
    if (!kh || kh.date !== todayDate()) { mainInfo.style.display = 'none'; return; }
    
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

setInterval(() => { fetchShared().then(shared => { const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); updateTimerDisplay(kh); }); }, 1000);

// ============================================
// نظام الوسائط المتعددة
// ============================================

let currentMediaType = 'text';

function setMediaType(type, event) {
    currentMediaType = type;
    const fields = ['textInput', 'pasteInput', 'cameraInput', 'fileInput'];
    fields.forEach(field => { const element = document.getElementById(field); if (element) element.style.display = 'none'; });
    document.querySelectorAll('.media-type-btn').forEach(btn => { btn.classList.remove('active'); });
    if (event && event.target) event.target.classList.add('active');
    
    switch (type) {
        case 'text': document.getElementById('textInput').style.display = 'block'; break;
        case 'paste': document.getElementById('pasteInput').style.display = 'block'; break;
        case 'camera': document.getElementById('cameraInput').style.display = 'block'; initCamera(); break;
        case 'image': document.getElementById('fileInput').style.display = 'block'; document.getElementById('fileInput').innerHTML = `<div class="file-upload-area" onclick="document.getElementById('fileUpload').click()"><div style="font-size: 2rem; margin-bottom: 10px;">🖼️</div><strong>انقر لرفع صورة</strong><p class="note">الصور المدعومة: JPG, PNG, GIF</p></div><input type="file" id="fileUpload" class="hidden" accept="image/*" onchange="handleFileUpload(event)">`; break;
        case 'pdf': document.getElementById('fileInput').style.display = 'block'; document.getElementById('fileInput').innerHTML = `<div class="file-upload-area" onclick="document.getElementById('fileUpload').click()"><div style="font-size: 2rem; margin-bottom: 10px;">📄</div><strong>انقر لرفع ملف PDF</strong><p class="note">رفع ملف PDF</p></div><input type="file" id="fileUpload" class="hidden" accept=".pdf" onchange="handleFileUpload(event)">`; break;
        case 'word': document.getElementById('fileInput').style.display = 'block'; document.getElementById('fileInput').innerHTML = `<div class="file-upload-area" onclick="document.getElementById('fileUpload').click()"><div style="font-size: 2rem; margin-bottom: 10px;">📋</div><strong>انقر لرفع ملف Word</strong><p class="note">رفع ملف Word</p></div><input type="file" id="fileUpload" class="hidden" accept=".doc,.docx" onchange="handleFileUpload(event)">`; break;
    }
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

    if (!start || !end) { alert('❌ حدد وقت البداية والنهاية'); return; }
    if (new Date(start) >= new Date(end)) { alert('❌ تأكد من أن البداية قبل النهاية'); return; }
    if (!text && currentMediaType === 'text') { alert('❌ اكتب محتوى الخلوة'); return; }

    const obj = { date: todayDate(), title: title || 'خلوة اليوم', startISO: new Date(start).toISOString(), endISO: new Date(end).toISOString(), type: currentMediaType, content: text, question: { text: qText, options: [q1, q2, q3].filter(opt => opt.trim() !== ''), correctIndex: qCorrect } };

    LS.set('kholwa', obj);
    const history = LS.get('history') || [];
    const day = { date: obj.date, title: obj.title, startISO: obj.startISO, endISO: obj.endISO, answers: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] }, qaResponses: { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} } };
    history.push(day);
    LS.set('history', history);

    const sharedData = { kholwa: obj, history: history, lastUpdated: new Date().toISOString(), totalStudents: countTotalStudents(), message: `خلوة ${obj.date} - ${obj.title}` };
    downloadSharedFile(sharedData);
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
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        const uniqueId = `${timestamp}_${time}`;
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
        showUploadInstructions(uniqueId);
    } catch (error) {
        alert('❌ حدث خطأ في إنشاء الملف');
    }
}

function showUploadInstructions(fileId = '') {
    const instructions = `🎯 **تم إنشاء ملف data.json بنجاح!**

📁 **الخطوات المطلوبة:**
1. **حمّل الملف** الذي تم تحميله تلقائياً
2. **اذهب إلى GitHub:** افتح ملف data.json الحالي وانقر "Edit" (✏️)
3. **استبدل المحتوى:** احذف كل المحتوى القديم والصق محتوى الملف الجديد
4. **انقر "Commit changes"**

🆔 **معرف الملف:** ${fileId}
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
    arr.forEach(n => { if (n && !list.find(s => s.name === n)) list.push({ name: n, answeredDates: [] }); });
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
    if (!kh) { enter.style.display = 'none'; view.style.display = 'block'; document.getElementById('kholwaContent').innerHTML = '<p class="note">لا توجد خلوة نشطة حالياً</p>'; return; }

    const now = new Date();
    const start = new Date(kh.startISO);
    const end = new Date(kh.endISO);
    const isToday = kh.date === todayDate();

    if (!isToday || now < start || now > end) {
        enter.style.display = 'none'; view.style.display = 'block';
        let message = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️';
        if (!isToday) message = 'لا توجد خلوة لليوم الحالي';
        else if (now < start) message = `الخلوة ستبدأ في: ${start.toLocaleString('ar-EG')}`;
        else if (now > end) message = 'انتهت فترة الخلوة لهذا اليوم';
        document.getElementById('kholwaContent').innerHTML = `<p class="note">${message}</p>`;
        return;
    }

    enter.style.display = 'none'; view.style.display = 'block';
    let contentHTML = '';
    if (kh.type === 'text') contentHTML = `<div class="kholwa-content">${kh.content.replace(/\n/g, '<br>')}</div>`;
    else if (kh.type === 'image') {
        const imageMatch = kh.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) contentHTML = `<img src="${imageMatch[1]}" alt="صورة الخلوة" style="max-width:100%; border-radius:8px; margin:10px 0;">`;
        else contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
    } else contentHTML = `<div class="kholwa-content">${kh.content}</div>`;

    document.getElementById('kholwaContent').innerHTML = `<div class="kholwa-card"><h3 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">${kh.title || 'خلوة اليوم'}</h3><div class="kholwa-body">${contentHTML}</div></div>`;

    const questionArea = document.getElementById('questionArea');
    const choicesArea = document.getElementById('choicesArea');
    const resultArea = document.getElementById('resultArea');
    
    if (kh.question && kh.question.text) {
        questionArea.innerHTML = `<h4 style="color: #e74c3c; margin-top: 20px;">سؤال اليوم:</h4><p>${kh.question.text}</p>`;
        let choicesHTML = '<div style="margin-top: 15px;">';
        kh.question.options.forEach((option, index) => {
            if (option && option.trim() !== '') {
                choicesHTML += `<button class="answer-option" onclick="handleAnswerSelection(${index}, '${name.replace(/'/g, "\\'")}', '${cls}')" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border-radius: 8px; border: 2px solid #3498db; background: white; cursor: pointer; font-size: 16px;">${option}</button>`;
            }
        });
        choicesHTML += '</div>';
        choicesArea.innerHTML = choicesHTML;
    } else { questionArea.innerHTML = ''; choicesArea.innerHTML = ''; }
    resultArea.innerHTML = '';
}

function handleAnswerSelection(selectedIndex, studentName, studentClass) {
    fetchShared().then(shared => {
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
        if (!kh || !kh.question) return;
        const isCorrect = selectedIndex === kh.question.correctIndex;
        const resultArea = document.getElementById('resultArea');
        if (isCorrect) {
            resultArea.innerHTML = '<div style="color: #27ae60; font-weight: bold; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 10px 0;">✅ إجابة صحيحة! أحسنت!</div>';
            awardPoints(studentName, studentClass, 10);
        } else {
            resultArea.innerHTML = '<div style="color: #e74c3c; font-weight: bold; text-align: center; padding: 15px; background: #f8d7da; border-radius: 8px; margin: 10px 0;">❌ إجابة خاطئة، حاول مرة أخرى!</div>';
        }
        document.querySelectorAll('.answer-option').forEach(btn => { btn.disabled = true; btn.style.background = '#f8f9fa'; btn.style.cursor = 'not-allowed'; btn.style.opacity = '0.7'; });
        const correctBtn = document.querySelectorAll('.answer-option')[kh.question.correctIndex];
        if (correctBtn) { correctBtn.style.background = '#27ae60'; correctBtn.style.color = 'white'; correctBtn.style.borderColor = '#27ae60'; }
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
            today = { date: todayDate(), title: 'خلوة اليوم', startISO: new Date().toISOString(), endISO: new Date().toISOString(), answers: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] }, qaResponses: { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} } };
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

function getStudentPhoto(cls, name) {
    const studentPhotos = LS.get('studentPhotos') || {};
    return studentPhotos[`${cls}_${name}`] || 'https://via.placeholder.com/60/fffaf2/d9b382?text=👦';
}

// ============================================
// نظام الإشعارات
// ============================================

function addNotification(title, message, type = 'info') {
    const notifications = LS.get('notifications') || [];
    const notification = { id: Date.now(), title: title, message: message, type: type, date: new Date().toLocaleString('ar-EG'), read: false };
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
    else notifications.forEach(notif => { notificationsHTML += `<div class="notification-item"><strong>${notif.title}</strong><br><small>${notif.message}</small><br><small style="color:#666">${notif.date}</small></div>`; });
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>الإشعارات</title><style>body { font-family: Arial; margin: 20px; background: #f8f9fa; }.notification-item { background: white; padding: 12px; margin: 8px 0; border-radius: 8px; }</style></head><body>${notificationsHTML}<button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button></body></html>`);
}

// ============================================
// لوحة المتصدرين
// ============================================

function showLeaderboard() {
    const students = LS.get('students') || {};
    let allStudents = [];
    Object.keys(students).forEach(cls => { students[cls].forEach(student => { allStudents.push({ name: student.name, class: cls, points: getStudentPoints(cls, student.name) }); }); });
    allStudents.sort((a, b) => b.points - a.points);
    let leaderboardHTML = '<h2>🏆 لوحة المتصدرين</h2>';
    if (allStudents.length === 0) leaderboardHTML += '<p>لا توجد بيانات بعد</p>';
    else allStudents.slice(0, 10).forEach((student, index) => { let medal = ''; if (index === 0) medal = ' 🥇'; else if (index === 1) medal = ' 🥈'; else if (index === 2) medal = ' 🥉'; leaderboardHTML += `<div style="display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd;"><div style="font-size: 1.2rem; font-weight: 800; min-width: 30px;">${index + 1}</div><div style="flex: 1;"><div style="font-weight: 700;">${student.name} ${medal}</div><div style="color: #666; font-size: 0.9rem;">الفصل: ${student.class} | النقاط: ${student.points}</div></div></div>`; });
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>لوحة المتصدرين</title><style>body { font-family: Arial; margin: 20px; background: #fffaf2; }</style></head><body>${leaderboardHTML}<button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button></body></html>`);
}

// ============================================
// الدوال المساعدة
// ============================================

async function refreshHistoryList() {
    const history = LS.get('history') || [];
    const container = document.getElementById('historyList');
    if (!container) return;
    if (!history.length) { container.innerHTML = '<p class="note">لا توجد أيام سابقة</p>'; return; }
    let html = '';
    history.forEach((d, idx) => { let dayPoints = 0; if (d.qaResponses) { Object.values(d.qaResponses).forEach(classResponses => { Object.values(classResponses).forEach(points => { dayPoints += points; }); }); } html += `<div style="padding:6px;border-bottom:1px solid #efe8d8"><strong>${d.date}</strong> — ${d.title || 'خلوة'}<br><small>إجمالي النقاط: ${dayPoints}</small><br><button onclick="showDayDetails(${idx})" style="margin-top:6px;padding:6px;border-radius:8px;background:#eee;border:none;cursor:pointer">تفاصيل اليوم</button></div>`; });
    container.innerHTML = html;
}

async function loadReport() {
    const students = LS.get('students') || {};
    const container = document.getElementById('reportArea');
    if (!container) return;
    let html = '<table class="table"><tr><th>الفصل</th><th>الاسم</th><th>النقاط</th></tr>';
    Object.keys(students).forEach(cls => { students[cls].forEach(s => { const points = getStudentPoints(cls, s.name); html += `<tr><td>${cls}</td><td>${s.name}</td><td><strong>${points}</strong></td></tr>`; }); });
    html += '</table>';
    container.innerHTML = html;
}

function loadTeacherStatus(cls) {
    const students = LS.get('students') || {};
    const list = students[cls] || [];
    const container = document.getElementById('teacherStatus');
    if (!container) return;
    let html = '<h4>طلاب الفصل وحالة النقاط:</h4>';
    list.forEach(s => { const points = getStudentPoints(cls, s.name); html += `<div style="padding:8px; border-bottom:1px solid #eee;"><strong>${s.name}</strong> - النقاط: <span style="color: #e74c3c; font-weight: bold;">${points}</span></div>`; });
    container.innerHTML = html;
}

// ============================================
// دوال التقارير والإحصائيات
// ============================================

function showAnalytics() {
    const students = LS.get('students') || {};
    const history = LS.get('history') || [];
    let totalStudents = 0; let totalPoints = 0; let classDistribution = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0 }; let classPoints = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0 };
    Object.keys(students).forEach(cls => { classDistribution[cls] = students[cls].length; totalStudents += students[cls].length; students[cls].forEach(student => { const points = getStudentPoints(cls, student.name); totalPoints += points; classPoints[cls] += points; }); });
    const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    const totalDays = history.length;
    let historyPoints = 0; history.forEach(day => { if (day.qaResponses) { Object.values(day.qaResponses).forEach(classResponses => { Object.values(classResponses).forEach(points => { historyPoints += points; }); }); } });

    const analyticsHTML = `<h3 style="text-align: center; color: #2c3e50;">📊 الإحصائيات العامة</h3><div class="stats-grid"><div class="stat-card"><div class="stat-number">${totalStudents}</div><div class="stat-label">إجمالي الطلاب</div></div><div class="stat-card"><div class="stat-number">${totalDays}</div><div class="stat-label">عدد الخلوات</div></div><div class="stat-card"><div class="stat-number">${totalPoints}</div><div class="stat-label">إجمالي النقاط</div></div><div class="stat-card"><div class="stat-number">${avgPoints}</div><div class="stat-label">متوسط النقاط</div></div></div><div class="chart-container"><h4>📈 توزيع الطلاب على الفصول</h4>${Object.keys(classDistribution).map(cls => { const percentage = totalStudents > 0 ? ((classDistribution[cls] / totalStudents) * 100).toFixed(1) : 0; const classPointsTotal = classPoints[cls] || 0; return `<div style="margin: 12px 0;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><strong>الفصل ${cls}:</strong><span>${classDistribution[cls]} طالب - ${classPointsTotal} نقطة</span></div><div style="background:#e0e0e0; border-radius:10px; height:20px; overflow:hidden;"><div style="background:linear-gradient(90deg, #3498db, #2980b9); height:100%; border-radius:10px; width:${percentage}%"></div></div></div>`; }).join('')}</div><div class="chart-container"><h4>🏆 أعلى 5 طلاب في النقاط</h4>${getTopStudents(5).map((student, index) => { let medal = ''; if (index === 0) medal = '🥇'; else if (index === 1) medal = '🥈'; else if (index === 2) medal = '🥉'; return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;"><div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 1.2rem;">${medal}</span><div><strong>${student.name}</strong><div style="color: #666; font-size: 0.8rem;">الفصل ${student.class}</div></div></div><div style="background: #ffd700; color: #000; padding: 4px 12px; border-radius: 15px; font-weight: 700;">${student.points} نقطة</div></div>`; }).join('')}</div><div class="chart-container"><h4>📋 ملخص النقاط</h4><div style="background: #e8f4fd; padding: 15px; border-radius: 8px;"><div style="display: flex; justify-content: space-between; margin: 5px 0;"><strong>النقاط من studentPoints:</strong><span>${totalPoints}</span></div><div style="display: flex; justify-content: space-between; margin: 5px 0;"><strong>النقاط من history:</strong><span>${historyPoints}</span></div><div style="display: flex; justify-content: space-between; margin: 5px 0; border-top: 1px solid #3498db; padding-top: 8px;"><strong>المجموع:</strong><span style="font-weight: bold; color: #e74c3c;">${totalPoints + historyPoints}</span></div></div></div>`;
    
    const w = window.open('', '_blank', 'width=500,height=700');
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>التقارير والإحصائيات</title><style>body { font-family: 'Cairo', Arial; margin: 20px; background: #f8f9fa; line-height: 1.6; }.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; }.stat-card { background: white; padding: 15px; border-radius: 12px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; }.stat-number { font-size: 1.8rem; font-weight: 800; color: #2c3e50; margin-bottom: 5px; }.stat-label { font-size: 0.85rem; color: #7f8c8d; }.chart-container { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; } h4 { color: #2c3e50; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 8px; }</style></head><body>${analyticsHTML}<button onclick="window.close()" style="margin-top: 20px; padding: 12px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem;">إغلاق</button></body></html>`);
}

function getTopStudents(limit = 5) {
    const students = LS.get('students') || {};
    let allStudents = [];
    Object.keys(students).forEach(cls => { students[cls].forEach(student => { allStudents.push({ name: student.name, class: cls, points: getStudentPoints(cls, student.name) }); }); });
    return allStudents.sort((a, b) => b.points - a.points).slice(0, limit);
}

// ============================================
// دوال تفاصيل اليوم
// ============================================

function showDayDetails(index) {
    const history = LS.get('history') || [];
    const day = history[index];
    if (!day) { alert('❌ لا توجد بيانات لهذا اليوم'); return; }
    const students = LS.get('students') || {};
    let html = `<h3 style="text-align: center; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">📅 تفاصيل اليوم: ${day.date}</h3><h4 style="color: #7f8c8d; text-align: center;">${day.title || 'خلوة'}</h4><div style="background: #e8f4fd; padding: 15px; border-radius: 10px; margin: 15px 0;"><strong>⏰ وقت الخلوة:</strong><br>البداية: ${new Date(day.startISO).toLocaleString('ar-EG')}<br>النهاية: ${new Date(day.endISO).toLocaleString('ar-EG')}</div>`;
    let totalParticipants = 0; let totalDayPoints = 0;
    Object.keys(day.answers || {}).forEach(cls => { totalParticipants += (day.answers[cls] || []).length; });
    if (day.qaResponses) { Object.values(day.qaResponses).forEach(classResponses => { Object.values(classResponses).forEach(points => { totalDayPoints += points; }); }); }
    html += `<div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 10px 0;"><strong>📊 إحصائيات المشاركة:</strong><br>إجمالي المشاركين: ${totalParticipants} طالب<br>النقاط المكتسبة: ${totalDayPoints} نقطة</div>`;
    Object.keys(day.answers || {}).forEach(cls => { const classStudents = day.answers[cls] || []; if (classStudents.length > 0) { html += `<div class="class-section"><h4 style="color: #3498db; background: #f8f9fa; padding: 10px; border-radius: 8px;">🎒 الفصل ${cls} - ${classStudents.length} طالب</h4><div style="max-height: 200px; overflow-y: auto;">`; const list = students[cls] || []; list.forEach(student => { const participated = classStudents.includes(student.name); const dayPoints = (day.qaResponses && day.qaResponses[cls] && day.qaResponses[cls][student.name]) ? day.qaResponses[cls][student.name] : 0; const totalPoints = getStudentPoints(cls, student.name); html += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;"><div><span style="color: ${participated ? '#27ae60' : '#e74c3c'}; font-weight: bold;">${participated ? '✅' : '❌'}</span>${student.name}</div><div style="color: #666; font-size: 0.9rem;">${participated ? `نقاط اليوم: ${dayPoints} | الإجمالي: ${totalPoints}` : 'لم يشارك'}</div></div>`; }); html += `</div></div>`; } });
    const w = window.open('', '_blank', 'width=500,height=600');
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>تفاصيل اليوم - ${day.date}</title><style>body { font-family: 'Cairo', Arial; margin: 20px; background: #f8f9fa; line-height: 1.6; }.class-section { background: white; padding: 15px; border-radius: 10px; margin: 15px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); } h4 { margin: 0 0 10px 0; }</style></head><body>${html}<button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button></body></html>`);
}

// ============================================
// دوال النسخ الاحتياطي
// ============================================

function createManualBackup() {
    try {
        const backupData = { students: LS.get('students'), points: LS.get('studentPoints'), photos: LS.get('studentPhotos'), history: LS.get('history'), teachers: LS.get('teachers'), notifications: LS.get('notifications'), timestamp: new Date().toISOString(), version: '1.0' };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-kholwa-${todayDate()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ تم إنشاء نسخة احتياطية بنجاح!');
        addNotification('نسخ احتياطي', 'تم إنشاء نسخة احتياطية يدوية', 'success');
    } catch (error) { alert('❌ حدث خطأ أثناء إنشاء النسخة الاحتياطية'); }
}

// ============================================
// دوال تصفير البيانات
// ============================================

function resetAll() {
    if (confirm('⚠️ هل أنت متأكد من تصفير جميع البيانات؟\n\nهذا الإجراء سيحذف:\n• جميع الطلاب\n• جميع النقاط\n• جميع الصور\n• جميع الخلوات\n• جميع الخدام\n• جميع الإشعارات\n\n❗ هذا الإجراء لا يمكن التراجع عنه.')) {
        if (confirm('❌ التأكيد النهائي:\nهل أنت متأكد تماماً من حذف جميع البيانات؟')) {
            try {
                const autoBackupData = { students: LS.get('students'), points: LS.get('studentPoints'), photos: LS.get('studentPhotos'), history: LS.get('history'), teachers: LS.get('teachers'), timestamp: new Date().toISOString(), note: 'نسخة احتياطية تلقائية قبل التصفير' };
                const blob = new Blob([JSON.stringify(autoBackupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `auto-backup-before-reset-${todayDate()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                localStorage.clear();
                initializeData();
                alert('✅ تم تصفير جميع البيانات بنجاح!');
                setTimeout(() => { location.reload(); }, 2000);
            } catch (error) { alert('❌ حدث خطأ أثناء تصفير البيانات'); }
        }
    }
}

// ============================================
// دوال الوسائط المتعددة المكملة
// ============================================

function initCamera() {
    const cameraPreview = document.getElementById('cameraPreview');
    if (!cameraPreview) return;
    cameraPreview.innerHTML = '<div class="media-status info">جاري تشغيل الكاميرا الخلفية...</div>';
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints = { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } };
        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            cameraPreview.innerHTML = `<video id="cameraVideo" autoplay playsinline style="width:100%; max-width:100%; border-radius:8px; transform: scaleX(-1);"></video><button type="button" class="capture-btn" onclick="captureImage()">📸 التقاط صورة</button>`;
            const video = document.getElementById('cameraVideo');
            video.srcObject = stream;
        }).catch(err => {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                cameraPreview.innerHTML = `<video id="cameraVideo" autoplay playsinline style="width:100%; max-width:100%; border-radius:8px;"></video><button type="button" class="capture-btn" onclick="captureImage()">📸 التقاط صورة</button><div class="media-status info" style="margin-top:10px;">📱 يتم استخدام الكاميرا الأمامية</div>`;
                const video = document.getElementById('cameraVideo');
                video.srcObject = stream;
            }).catch(err => {
                cameraPreview.innerHTML = `<div class="media-status error">❌ لا يمكن الوصول للكاميرا<br><small>تأكد من منح الإذن للكاميرا في إعدادات المتصفح</small></div><div style="margin-top:10px;"><button class="btn" style="background:#3498db; color:white;" onclick="initCamera()">🔄 حاول مرة أخرى</button></div>`;
            });
        });
    } else cameraPreview.innerHTML = `<div class="media-status error">❌ المتصفح لا يدعم الكاميرا<br><small>جرب استخدام Chrome أو Firefox على الموبايل</small></div>`;
}

function captureImage() {
    const video = document.getElementById('cameraVideo');
    if (!video) { alert('❌ لم يتم تحميل الكاميرا بعد'); return; }
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (video.style.transform === 'scaleX(-1)') { context.translate(canvas.width, 0); context.scale(-1, 1); }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('kholwaText').value = `![صورة من الكاميرا](${e.target.result})`;
            document.getElementById('cameraPreview').innerHTML = `<div class="media-status success">✅ تم التقاط الصورة بنجاح!</div><img src="${e.target.result}" style="max-width:100%; border-radius:8px; margin-top:10px;" alt="الصورة الملتقطة"><div style="margin-top:10px;"><button class="btn" style="background:#3498db; color:white;" onclick="initCamera()">📷 التقاط صورة أخرى</button></div>`;
            const stream = video.srcObject;
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
        reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.8);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (currentMediaType === 'image' && !file.type.startsWith('image/')) { alert('❌ يرجى اختيار ملف صورة فقط'); return; }
    const reader = new FileReader();
    reader.onload = function (e) {
        if (currentMediaType === 'image') {
            document.getElementById('kholwaText').value = `![${file.name}](${e.target.result})`;
            document.getElementById('fileInput').innerHTML += `<div class="media-status success">✅ تم رفع الصورة بنجاح!</div><img src="${e.target.result}" style="max-width:100%; border-radius:8px; margin-top:10px;" alt="${file.name}">`;
        } else if (currentMediaType === 'pdf') {
            document.getElementById('kholwaText').value = `[📎 ${file.name}](${e.target.result})`;
            document.getElementById('fileInput').innerHTML += `<div class="media-status success">✅ تم رفع ملف PDF بنجاح!</div><div class="file-info"><div class="file-icon">📄</div><div class="file-details"><div class="file-name">${file.name}</div><div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div></div></div>`;
        } else if (currentMediaType === 'word') {
            document.getElementById('kholwaText').value = `[📋 ${file.name}](${e.target.result})`;
            document.getElementById('fileInput').innerHTML += `<div class="media-status success">✅ تم رفع ملف Word بنجاح!</div><div class="file-info"><div class="file-icon">📋</div><div class="file-details"><div class="file-name">${file.name}</div><div class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</div></div></div>`;
        }
    };
    reader.readAsDataURL(file);
}

function handlePaste(event) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    document.getElementById('pasteContent').value = pastedText;
    document.getElementById('kholwaText').value = pastedText;
    const successMsg = document.createElement('div');
    successMsg.className = 'media-status success';
    successMsg.textContent = '✅ تم لصق النص بنجاح!';
    document.getElementById('pasteInput').appendChild(successMsg);
    setTimeout(() => { if (successMsg.parentNode) successMsg.remove(); }, 3000);
}

function getMediaTypeName(type) {
    const names = { 'text': 'نص', 'paste': 'نص منسوخ', 'camera': 'صورة كاميرا', 'image': 'صورة', 'pdf': 'PDF', 'word': 'Word' };
    return names[type] || type;
}

// ============================================
// التهيئة النهائية
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    initializeData();
    updateNotifications();
    console.log('تم تحميل البرنامج بنجاح!');
    if (document.getElementById('textInput')) document.getElementById('textInput').style.display = 'block';
});
