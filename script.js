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

// ============================================
// نظام الخدام - معدل
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

// ============================================
// نظام الطفل - معدل بالكامل
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
