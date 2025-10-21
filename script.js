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
    if (!LS.get('answeredToday')) LS.set('answeredToday', {});
}

initializeData();

function todayDate() { return new Date().toISOString().slice(0, 10); }

function showPanel(id) {
    console.log('جاري فتح لوحة:', id);
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
let mediaStream = null;
let currentCamera = 'environment';

function setMediaType(type, event) {
    console.log('تغيير نوع الوسائط إلى:', type);
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

function initCamera() {
    const cameraPreview = document.getElementById('cameraPreview');
    if (!cameraPreview) return;

    cameraPreview.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading-spinner"></div>
            <p>جاري تحميل الكاميرا...</p>
        </div>
    `;

    startCamera();
}

async function startCamera() {
    try {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: { 
                facingMode: currentCamera,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        const cameraPreview = document.getElementById('cameraPreview');
        
        cameraPreview.innerHTML = `
            <video class="camera-preview" autoplay playsinline></video>
            <div class="camera-controls">
                <button type="button" class="camera-switch-btn" onclick="switchCamera()">🔄</button>
            </div>
            <button type="button" class="capture-btn" onclick="capturePhoto()">📸</button>
            <div class="camera-quality">جودة: 720p</div>
        `;

        const video = cameraPreview.querySelector('video');
        video.srcObject = mediaStream;
        video.classList.add('camera-active');

    } catch (error) {
        console.error('خطأ في الكاميرا:', error);
        const cameraPreview = document.getElementById('cameraPreview');
        cameraPreview.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e74c3c;">
                <div style="font-size: 3rem;">📷</div>
                <p>تعذر الوصول إلى الكاميرا</p>
                <small>${error.message}</small>
            </div>
        `;
        cameraPreview.classList.add('camera-error');
    }
}

function switchCamera() {
    currentCamera = currentCamera === 'user' ? 'environment' : 'user';
    startCamera();
}

function capturePhoto() {
    const cameraPreview = document.getElementById('cameraPreview');
    const video = cameraPreview.querySelector('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    // إضافة الصورة إلى محتوى الخلوة
    document.getElementById('kholwaText').value = `![صورة الخلوة](${imageDataURL})`;
    
    // عرض معاينة الصورة
    cameraPreview.innerHTML += `
        <div style="margin-top: 15px;">
            <p style="text-align: center; color: #27ae60; font-weight: bold;">✅ تم التقاط الصورة</p>
            <img src="${imageDataURL}" alt="الصورة الملتقطة" style="max-width: 100%; border-radius: 8px; margin: 10px 0; border: 2px solid #27ae60;">
        </div>
    `;

    // إيقاف الكاميرا بعد الالتقاط
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

function handlePaste(event) {
    const pasteContent = document.getElementById('pasteContent');
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            const reader = new FileReader();
            
            reader.onload = function(e) {
                pasteContent.value = `![صورة منسوخة](${e.target.result})`;
            };
            
            reader.readAsDataURL(file);
            break;
        }
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
        
        // عرض معاينة الملف
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
            <button type="button" class="btn" onclick="setMediaType('${fileType}')" style="margin-top: 10px;">
                رفع ملف آخر
            </button>
        `;
    };

    reader.onerror = function() {
        fileInput.innerHTML += `
            <div class="media-status error">
                ❌ حدث خطأ في رفع الملف
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

    // إعادة تعيين الإجابات اليومية
    LS.set('answeredToday', {});

    const sharedData = { 
        kholwa: obj, 
        history: history, 
        lastUpdated: new Date().toISOString(), 
        totalStudents: countTotalStudents(), 
        message: `خلوة ${obj.date} - ${obj.title}` 
    };
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
                <button onclick="loadDayReport('${day.date}')" class="btn" style="padding: 4px 8px; margin-top: 4px; font-size: 0.8rem;">
                    📊 تقرير
                </button>
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

function loadDayReport(date) {
    const history = LS.get('history') || [];
    const day = history.find(d => d.date === date);
    if (!day) return;

    let reportHTML = `<h4>تقرير ${date}</h4>`;
    let totalParticipants = 0;

    Object.keys(day.answers || {}).forEach(cls => {
        const participants = day.answers[cls].length;
        totalParticipants += participants;
        reportHTML += `<p>الفصل ${cls}: ${participants} طالب</p>`;
    });

    reportHTML += `<p><strong>المجموع: ${totalParticipants} طالب</strong></p>`;
    
    const reportArea = document.getElementById('reportArea');
    reportArea.innerHTML = reportHTML;
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
    
    // عرض الخلوة الحالية للخادم
    showKholwaForTeacher(found.classId);
    loadTeacherStatus(found.classId);
}

function showKholwaForTeacher(classId) {
    const shared = LS.get('kholwa');
    const teacherKholwa = document.getElementById('teacherKholwa');
    
    if (!teacherKholwa) return;
    
    if (!shared || shared.date !== todayDate()) {
        teacherKholwa.innerHTML = '<p class="note">لا توجد خلوة نشطة لليوم</p>';
        return;
    }

    let contentHTML = '';
    if (shared.type === 'text') {
        contentHTML = `<div class="kholwa-content">${shared.content.replace(/\n/g, '<br>')}</div>`;
    } else if (shared.type === 'image') {
        const imageMatch = shared.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) {
            contentHTML = `<img src="${imageMatch[1]}" alt="صورة الخلوة" style="max-width:100%; border-radius:8px; margin:10px 0;">`;
        } else {
            contentHTML = `<div class="kholwa-content">${shared.content}</div>`;
        }
    } else {
        contentHTML = `<div class="kholwa-content">${shared.content}</div>`;
    }

    teacherKholwa.innerHTML = `
        <div class="kholwa-card">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">${shared.title || 'خلوة اليوم'}</h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
            ${shared.question && shared.question.text ? `
                <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <h4 style="color: #e74c3c; margin-bottom: 10px;">سؤال اليوم:</h4>
                    <p><strong>${shared.question.text}</strong></p>
                    <div style="margin-top: 10px;">
                        ${shared.question.options.map((option, index) => `
                            <div style="padding: 8px; margin: 5px 0; background: white; border-radius: 6px; border: 1px solid #ddd;">
                                ${index + 1}. ${option} ${index === shared.question.correctIndex ? '✅' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
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
                    <button class="encourage-btn" onclick="sendEncouragement('${classId}', '${student.name.replace(/'/g, "\\'")}')">
                        💌 تشجيع
                    </button>
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

function sendEncouragement(classId, studentName) {
    const message = prompt(`اكتب رسالة تشجيع لـ ${studentName}:`);
    if (message && message.trim()) {
        const studentMessages = LS.get('studentMessages') || {};
        const messageKey = `${classId}_${studentName}`;
        if (!studentMessages[messageKey]) studentMessages[messageKey] = [];
        studentMessages[messageKey].push({
            message: message.trim(),
            date: new Date().toLocaleString('ar-EG'),
            type: 'encouragement'
        });
        LS.set('studentMessages', studentMessages);
        
        addNotification('رسالة تشجيع', `تم إرسال رسالة لـ ${studentName}`, 'success');
        alert(`✅ تم إرسال رسالة التشجيع لـ ${studentName}`);
    }
}

// ============================================
// نظام الطفل
// ============================================
// ============================================
// إصلاح مشكلة دخول الطفل - النسخة المؤكدة
// ============================================

function enterKholwa() {
    try {
        // الحصول على القيم من الحقول
        const nameInput = document.getElementById('childName');
        const classSelect = document.getElementById('childClass');
        
        if (!nameInput || !classSelect) {
            alert('❌ عناصر الإدخال غير موجودة');
            return;
        }
        
        const name = nameInput.value.trim();
        const cls = classSelect.value;
        
        console.log('بيانات الدخول:', { name, cls });
        
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
            console.log('تم إضافة طالب جديد:', name);
        }
        
        // الانتقال إلى شاشة الخلوة
        showEnhancedKholwaFor(name, cls);
        
    } catch (error) {
        console.error('خطأ في دخول الطفل:', error);
        alert('❌ حدث خطأ غير متوقع. حاول مرة أخرى.');
    }
}

// دالة مبسطة للاختبار
function testChildEntry() {
    console.log('=== اختبار دخول الطفل ===');
    console.log('عنصر childName:', document.getElementById('childName'));
    console.log('عنصر childClass:', document.getElementById('childClass'));
    console.log('دالة enterKholwa:', typeof enterKholwa);
    console.log('دالة showEnhancedKholwaFor:', typeof showEnhancedKholwaFor);
    
    // اختبار سريع
    document.getElementById('childName').value = 'طفل تجريبي';
    document.getElementById('childClass').value = '1';
    enterKholwa();
                }
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

    // عرض نقاط الطفل الحالية
    const currentPoints = getStudentPoints(cls, name);
    const pointsDisplay = `<div style="text-align: center; margin: 10px 0; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 10px;">
        <div style="font-size: 1.2rem; font-weight: bold;">🎯 رصيدك الحالي: ${currentPoints} نقطة</div>
    </div>`;

    document.getElementById('kholwaContent').innerHTML = `
        ${pointsDisplay}
        <div class="kholwa-card">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">${kh.title || 'خلوة اليوم'}</h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
        </div>
    `;

    const questionArea = document.getElementById('questionArea');
    const choicesArea = document.getElementById('choicesArea');
    const resultArea = document.getElementById('resultArea');
    
    // التحقق إذا كان الطفل قد أجاب اليوم
    const answeredToday = LS.get('answeredToday') || {};
    const todayKey = `${todayDate()}_${cls}_${name}`;
    const hasAnsweredToday = answeredToday[todayKey];

    if (kh.question && kh.question.text && !hasAnsweredToday) {
        questionArea.innerHTML = `<h4 style="color: #e74c3c; margin-top: 20px;">سؤال اليوم:</h4><p>${kh.question.text}</p>`;
        let choicesHTML = '<div style="margin-top: 15px;">';
        kh.question.options.forEach((option, index) => {
            if (option && option.trim() !== '') {
                choicesHTML += `<button class="answer-option" onclick="handleAnswerSelection(${index}, '${name.replace(/'/g, "\\'")}', '${cls}')" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border-radius: 8px; border: 2px solid #3498db; background: white; cursor: pointer; font-size: 16px;">${option}</button>`;
            }
        });
        choicesHTML += '</div>';
        choicesArea.innerHTML = choicesHTML;
    } else if (hasAnsweredToday) {
        questionArea.innerHTML = '<div style="text-align: center; padding: 20px; background: #e8f4fd; border-radius: 10px; margin: 20px 0;"><h4 style="color: #27ae60;">✅ لقد أجبت على سؤال اليوم بالفعل!</h4><p>يمكنك العودة غداً للإجابة على السؤال الجديد</p></div>';
        choicesArea.innerHTML = '';
    } else {
        questionArea.innerHTML = '';
        choicesArea.innerHTML = '';
    }
    resultArea.innerHTML = '';
}

function handleAnswerSelection(selectedIndex, studentName, studentClass) {
    fetchShared().then(shared => {
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
        if (!kh || !kh.question) return;

        // التحقق إذا كان الطفل قد أجاب اليوم
        const answeredToday = LS.get('answeredToday') || {};
        const todayKey = `${todayDate()}_${studentClass}_${studentName}`;
        if (answeredToday[todayKey]) {
            document.getElementById('resultArea').innerHTML = '<div style="color: #e67e22; font-weight: bold; text-align: center; padding: 15px; background: #fef9e7; border-radius: 8px; margin: 10px 0;">⚠️ لقد أجبت على سؤال اليوم بالفعل!</div>';
            return;
        }

        const isCorrect = selectedIndex === kh.question.correctIndex;
        const resultArea = document.getElementById('resultArea');
        
        if (isCorrect) {
            // منح النقاط فقط إذا كانت الإجابة صحيحة ولم يسبق الإجابة اليوم
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
// دوال إضافية للمسؤول
// ============================================

function showAnalytics() {
    const history = LS.get('history') || [];
    const students = LS.get('students') || {};
    
    let totalStudents = 0;
    Object.values(students).forEach(cls => totalStudents += cls.length);
    
    let totalParticipation = 0;
    let totalPoints = 0;
    const studentPoints = LS.get('studentPoints') || {};
    Object.values(studentPoints).forEach(points => totalPoints += points);
    
    history.forEach(day => {
        Object.values(day.answers || {}).forEach(participants => {
            totalParticipation += participants.length;
        });
    });
    
    const analyticsHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000;">
            <div style="background: white; padding: 25px; border-radius: 15px; max-width: 500px; margin: 20px; max-height: 80vh; overflow-y: auto; text-align: right;">
                <h3 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">📊 التقارير والإحصائيات</h3>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${totalStudents}</div>
                        <div class="stat-label">إجمالي الطلاب</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${history.length}</div>
                        <div class="stat-label">عدد الخلوات</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${totalParticipation}</div>
                        <div class="stat-label">إجمالي المشاركات</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${totalPoints}</div>
                        <div class="stat-label">إجمالي النقاط</div>
                    </div>
                </div>
                
                <div class="chart-container">
                    <h4>📈 توزيع الطلاب على الفصول</h4>
                    ${Object.keys(students).map(cls => `
                        <div style="margin: 10px 0;">
                            <div style="display: flex; justify-content: between; margin-bottom: 5px;">
                                <span>الفصل ${cls}</span>
                                <span>${students[cls].length} طالب</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(students[cls].length / totalStudents) * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #3498db; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', analyticsHTML);
}

function createManualBackup() {
    const backupData = {
        students: LS.get('students'),
        teachers: LS.get('teachers'),
        history: LS.get('history'),
        studentPoints: LS.get('studentPoints'),
        studentPhotos: LS.get('studentPhotos'),
        notifications: LS.get('notifications'),
        studentMessages: LS.get('studentMessages'),
        backupDate: new Date().toISOString(),
        version: '1.0.0'
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kholwa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    addNotification('نسخ احتياطي', 'تم إنشاء نسخة احتياطية بنجاح', 'success');
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
    
    // تفعيل Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    console.log('جميع الدوال جاهزة للاستخدام!');
});
// ============================================
// تحسينات للطفل على الموبايل
// ============================================

function optimizeForMobile() {
    // تحسين حجم الخطوط للشاشات الصغيرة
    if (window.innerWidth < 768) {
        document.documentElement.style.fontSize = '14px';
        
        // تحسين أزرار الإدخال
        const inputs = document.querySelectorAll('input, select, textarea, button');
        inputs.forEach(element => {
            element.style.fontSize = '16px'; // منع التكبير التلقائي في iOS
        });
    }
}

// تحسين عرض الخلوة للطفل على الموبايل
function showKholwaFor(name, cls) {
    const shared = LS.get('kholwa');
    const enter = document.getElementById('childEntry');
    const view = document.getElementById('kholwaView');
    
    if (!enter || !view) {
        alert('❌ حدث خطأ في تحميل الخلوة. حاول تحديث الصفحة.');
        return;
    }

    // إخفاء شاشة الدخول وإظهار شاشة الخلوة
    enter.style.display = 'none';
    view.style.display = 'block';

    // إذا لم توجد خلوة
    if (!shared) {
        document.getElementById('kholwaContent').innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">📖</div>
                <h3 style="color: #666;">لا توجد خلوة نشطة حالياً</h3>
                <p class="note">انتظر حتى ينشر المسؤول الخلوة اليومية</p>
                <button onclick="goHome()" class="btn" style="background: #3498db; color: white; margin-top: 20px;">
                    العودة للرئيسية
                </button>
            </div>
        `;
        return;
    }

    const now = new Date();
    const start = new Date(shared.startISO);
    const end = new Date(shared.endISO);
    const isToday = shared.date === todayDate();

    // التحقق من توقيت الخلوة
    if (!isToday || now < start || now > end) {
        let message = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️';
        if (!isToday) message = 'لا توجد خلوة لليوم الحالي';
        else if (now < start) message = `الخلوة ستبدأ في:<br>${start.toLocaleString('ar-EG')}`;
        else if (now > end) message = 'انتهت فترة الخلوة لهذا اليوم';

        document.getElementById('kholwaContent').innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">⏰</div>
                <h3 style="color: #666;">${message}</h3>
                <button onclick="goHome()" class="btn" style="background: #3498db; color: white; margin-top: 20px;">
                    العودة للرئيسية
                </button>
            </div>
        `;
        return;
    }

    // عرض محتوى الخلوة
    let contentHTML = '';
    if (shared.type === 'text') {
        contentHTML = `<div class="kholwa-content">${shared.content.replace(/\n/g, '<br>')}</div>`;
    } else if (shared.type === 'image') {
        const imageMatch = shared.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) {
            contentHTML = `
                <div style="text-align: center;">
                    <img src="${imageMatch[1]}" alt="صورة الخلوة" 
                         style="max-width:100%; height:auto; border-radius:12px; margin:10px 0;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                </div>
            `;
        } else {
            contentHTML = `<div class="kholwa-content">${shared.content}</div>`;
        }
    } else {
        contentHTML = `<div class="kholwa-content">${shared.content}</div>`;
    }

    // عرض نقاط الطفل الحالية
    const currentPoints = getStudentPoints(cls, name);
    const pointsDisplay = `
        <div style="text-align: center; margin: 10px 0; padding: 15px; 
                    background: linear-gradient(135deg, #667eea, #764ba2); 
                    color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="font-size: 1.3rem; font-weight: bold;">🎯 رصيدك الحالي</div>
            <div style="font-size: 2rem; font-weight: 800; margin: 10px 0;">${currentPoints} نقطة</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">استمر في المشاركة لكسب المزيد!</div>
        </div>
    `;

    document.getElementById('kholwaContent').innerHTML = `
        ${pointsDisplay}
        <div class="kholwa-card" style="margin: 15px 0;">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 20px; font-size: 1.4rem;">
                ${shared.title || 'خلوة اليوم'}
            </h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
        </div>
    `;

    const questionArea = document.getElementById('questionArea');
    const choicesArea = document.getElementById('choicesArea');
    const resultArea = document.getElementById('resultArea');
    
    // التحقق إذا كان الطفل قد أجاب اليوم
    const answeredToday = LS.get('answeredToday') || {};
    const todayKey = `${todayDate()}_${cls}_${name}`;
    const hasAnsweredToday = answeredToday[todayKey];

    if (shared.question && shared.question.text && !hasAnsweredToday) {
        questionArea.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 20px 0; border-right: 4px solid #e74c3c;">
                <h4 style="color: #e74c3c; margin-bottom: 15px; text-align: center;">🧠 سؤال اليوم</h4>
                <p style="font-size: 1.1rem; font-weight: 600; text-align: center;">${shared.question.text}</p>
            </div>
        `;
        
        let choicesHTML = '<div style="margin-top: 15px;">';
        shared.question.options.forEach((option, index) => {
            if (option && option.trim() !== '') {
                choicesHTML += `
                    <button class="answer-option" 
                            onclick="handleAnswerSelection(${index}, '${name.replace(/'/g, "\\'")}', '${cls}')"
                            style="display: block; width: 100%; margin: 12px 0; padding: 16px; 
                                   border-radius: 12px; border: 2px solid #3498db; 
                                   background: white; cursor: pointer; font-size: 16px;
                                   font-weight: 600; transition: all 0.3s ease;">
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
                <p style="color: #666; font-size: 0.9rem; margin-top: 10px;">عد غداً للإجابة على سؤال جديد!</p>
            </div>
        `;
        choicesArea.innerHTML = '';
    } else {
        questionArea.innerHTML = '';
        choicesArea.innerHTML = '';
    }
    resultArea.innerHTML = '';
}

// تحديث تهيئة التطبيق لإضافة تحسينات الموبايل
document.addEventListener('DOMContentLoaded', function() {
    console.log('تطبيق الخلوة تم تحميله بنجاح!');
    
    // تحسين للشاشات الصغيرة
    optimizeForMobile();
    
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
    
    // إضافة حدث resize لتحسين التجاوب
    window.addEventListener('resize', optimizeForMobile);
    
    // تفعيل Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    console.log('جميع الدوال جاهزة للاستخدام!');
});
