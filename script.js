// ============================================
// الدوال الأساسية للبرنامج
// ============================================

const SHARED = 'data.json';

async function fetchShared() {
    // بيانات احتياطية من التخزين المحلي
    const fallbackData = { 
        kholwa: LS.get('kholwa'), 
        history: LS.get('history') || [],
        source: 'local'
    };
    
    try {
        console.log('🔄 جاري جلب البيانات من السيرفر...');
        
        // إضافة طابع زمني لمنع التخزين المؤقت
        const response = await fetch(SHARED + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`خطأ في السيرفر: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ تم جلب البيانات من السيرفر بنجاح');
        console.log('📅 آخر خلوة:', data.kholwa?.date);
        
        return { ...data, source: 'server' };
        
    } catch (error) {
        console.log('❌ لا يمكن الاتصال بالسيرفر:', error.message);
        console.log('🔄 استخدام البيانات المحلية كاحتياطي');
        
        return fallbackData;
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
        alert('❌ حدد وقت البداية والنهاية');
        return;
    }
    if (new Date(start) >= new Date(end)) {
        alert('❌ تأكد من أن البداية قبل النهاية');
        return;
    }
    if (!text && currentMediaType === 'text') {
        alert('❌ اكتب محتوى الخلوة');
        return;
    }

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

    // حفظ محلي للمسؤول
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

    // إنشاء ملف data.json للمشاركة
    const sharedData = { 
        kholwa: obj, 
        history: history,
        lastUpdated: new Date().toISOString(),
        totalStudents: countTotalStudents(),
        message: `خلوة ${obj.date} - ${obj.title}`
    };

    // تحميل الملف تلقائياً
    downloadSharedFile(sharedData);
    
    // إشعار بنجاح النشر
    addNotification('نشر خلوة', `تم نشر "${obj.title}" بنجاح`, 'success');
}

// دالة حساب إجمالي الطلاب
function countTotalStudents() {
    const students = LS.get('students') || {};
    let total = 0;
    Object.values(students).forEach(classStudents => {
        total += classStudents.length;
    });
    return total;
}

// دالة تحميل ملف المشاركة - محسنة لمنع التكرار
function downloadSharedFile(data) {
    try {
        // إضافة طابع زمني فريد لمنع التكرار
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
        const uniqueId = `${timestamp}_${time}`;
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json; charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // اسم ملف موحد مع معرف فريد
        a.download = `data.json`;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        // رسالة توضيحية مع اسم الملف
        showUploadInstructions(uniqueId);
        
        console.log(`📁 تم إنشاء ملف: data.json (ID: ${uniqueId})`);
        
    } catch (error) {
        console.error('خطأ في إنشاء الملف:', error);
        alert('❌ حدث خطأ في إنشاء الملف');
    }
}

// عرض تعليمات الرفع - محسنة
function showUploadInstructions(fileId = '') {
    const instructions = `
🎯 **تم إنشاء ملف data.json بنجاح!**

📁 **الخطوات المطلوبة:**

1. **حمّل الملف** الذي تم تحميله تلقائياً
2. **اذهب إلى GitHub:** 
   - افتح ملف data.json الحالي
   - انقر "Edit" (✏️)
3. **استبدل المحتوى:**
   - احذف كل المحتوى القديم
   - الصق محتوى الملف الجديد
4. **انقر "Commit changes"**

🆔 **معرف الملف:** ${fileId}

✅ **بعد الحفظ:** سيتحدّث التطبيق تلقائياً خلال دقيقة

⚠️ **مهم:** لا ترفع ملف جديد، استبدل المحتوى فقط!
    `;
    
    const instructionHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                padding: 25px;
                border-radius: 15px;
                max-width: 500px;
                margin: 20px;
                max-height: 80vh;
                overflow-y: auto;
                text-align: right;
                direction: rtl;
            ">
                <h3 style="color: #27ae60; text-align: center; margin-bottom: 20px;">
                    ✅ تم نشر الخلوة
                </h3>
                <div style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 10px;
                    border-right: 4px solid #3498db;
                    white-space: pre-line;
                    line-height: 1.6;
                    font-size: 14px;
                ">
                    ${instructions}
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="
                                background: #3498db;
                                color: white;
                                border: none;
                                padding: 12px 30px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 16px;
                            ">
                        فهمت 👍
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', instructionHTML);
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

    // تصحيح شرط التحقق من الخلوة النشطة
    if (!kh) {
        enter.style.display = 'none';
        view.style.display = 'block';
        document.getElementById('kholwaContent').innerHTML = '<p class="note">لا توجد خلوة نشطة حالياً</p>';
        return;
    }

    const now = new Date();
    const start = new Date(kh.startISO);
    const end = new Date(kh.endISO);
    const isToday = kh.date === todayDate();

    console.log('فحص الخلوة:', {
        now: now.toLocaleString('ar-EG'),
        start: start.toLocaleString('ar-EG'),
        end: end.toLocaleString('ar-EG'),
        isToday: isToday,
        isActive: now >= start && now <= end && isToday
    });

    if (!isToday || now < start || now > end) {
        enter.style.display = 'none';
        view.style.display = 'block';
        
        let message = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️';
        if (!isToday) {
            message = 'لا توجد خلوة لليوم الحالي';
        } else if (now < start) {
            message = `الخلوة ستبدأ في: ${start.toLocaleString('ar-EG')}`;
        } else if (now > end) {
            message = 'انتهت فترة الخلوة لهذا اليوم';
        }
        
        document.getElementById('kholwaContent').innerHTML = `<p class="note">${message}</p>`;
        return;
    }

    // إذا وصلنا هنا، الخلوة نشطة
    enter.style.display = 'none';
    view.style.display = 'block';
    
    // معالجة المحتوى بشكل صحيح
    let contentHTML = '';
    
    if (kh.type === 'text') {
        // معالجة النص العادي وتحويل الأسطر الجديدة إلى <br>
        contentHTML = `<div class="kholwa-content">${kh.content.replace(/\n/g, '<br>')}</div>`;
    } else if (kh.type === 'image') {
        // استخراج رابط الصورة من النص
        const imageMatch = kh.content.match(/!\[.*?\]\((.*?)\)/);
        if (imageMatch && imageMatch[1]) {
            contentHTML = `<img src="${imageMatch[1]}" alt="صورة الخلوة" style="max-width:100%; border-radius:8px; margin:10px 0;">`;
        } else {
            contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
        }
    } else {
        contentHTML = `<div class="kholwa-content">${kh.content}</div>`;
    }

    // بناء واجهة الخلوة كاملة
    document.getElementById('kholwaContent').innerHTML = `
        <div class="kholwa-card">
            <h3 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">${kh.title || 'خلوة اليوم'}</h3>
            <div class="kholwa-body">
                ${contentHTML}
            </div>
        </div>
    `;

    // إضافة السؤال إذا موجود
    const questionArea = document.getElementById('questionArea');
    const choicesArea = document.getElementById('choicesArea');
    const resultArea = document.getElementById('resultArea');
    
    if (kh.question && kh.question.text) {
        questionArea.innerHTML = `<h4 style="color: #e74c3c; margin-top: 20px;">سؤال اليوم:</h4><p>${kh.question.text}</p>`;
        
        // إضافة خيارات الإجابة - معدلة
        let choicesHTML = '<div style="margin-top: 15px;">';
        kh.question.options.forEach((option, index) => {
            if (option && option.trim() !== '') {
                // استخدام دالة مجهولة لتجنب مشاكل الـ scope
                choicesHTML += `
                    <button class="answer-option" onclick="handleAnswerSelection(${index}, '${name.replace(/'/g, "\\'")}', '${cls}')" 
                            style="display: block; width: 100%; margin: 8px 0; padding: 12px; border-radius: 8px; border: 2px solid #3498db; background: white; cursor: pointer; font-size: 16px;">
                        ${option}
                    </button>
                `;
            }
        });
        choicesHTML += '</div>';
        choicesArea.innerHTML = choicesHTML;
    } else {
        questionArea.innerHTML = '';
        choicesArea.innerHTML = '';
    }
    
    resultArea.innerHTML = '';
}

// دالة جديدة معالجة للإجابة - تعمل بشكل صحيح
function handleAnswerSelection(selectedIndex, studentName, studentClass) {
    console.log('🔄 معالجة الإجابة:', { selectedIndex, studentName, studentClass });
    
    // جلب بيانات الخلوة من المصدر الصحيح
    fetchShared().then(shared => {
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
        
        if (!kh || !kh.question) {
            console.error('❌ لا توجد خلوة أو سؤال');
            return;
        }

        const isCorrect = selectedIndex === kh.question.correctIndex;
        const resultArea = document.getElementById('resultArea');
        
        console.log('✅ الإجابة:', { selectedIndex, correctIndex: kh.question.correctIndex, isCorrect });

        if (isCorrect) {
            resultArea.innerHTML = '<div style="color: #27ae60; font-weight: bold; text-align: center; padding: 15px; background: #d4edda; border-radius: 8px; margin: 10px 0;">✅ إجابة صحيحة! أحسنت!</div>';
            
            // منح نقاط للطالب
            awardPoints(studentName, studentClass, 10);
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
    }).catch(error => {
        console.error('❌ خطأ في معالجة الإجابة:', error);
    });
}

// دالة منح النقاط - محسنة
function awardPoints(studentName, studentClass, points) {
    console.log('🎯 منح النقاط:', { studentName, studentClass, points });
    
    try {
        const studentPoints = LS.get('studentPoints') || {};
        const key = `${studentClass}_${studentName}`;
        
        // إضافة النقاط
        studentPoints[key] = (studentPoints[key] || 0) + points;
        LS.set('studentPoints', studentPoints);
        
        console.log('✅ النقاط بعد الإضافة:', studentPoints[key]);
        
        // تحديث سجل الإجابات في التاريخ الحالي
        updateTodayAnswers(studentName, studentClass, points);
        
        // إشعار بنقاط جديدة
        addNotification('نقاط جديدة!', `كسب ${studentName} ${points} نقطة`, 'success');
        
    } catch (error) {
        console.error('❌ خطأ في منح النقاط:', error);
    }
}

// دالة جديدة لتحديث إجابات اليوم
function updateTodayAnswers(studentName, studentClass, points) {
    try {
        const history = LS.get('history') || [];
        const today = history.find(day => day.date === todayDate());
        
        if (today) {
            // تأكد من وجود الهياكل
            if (!today.answers) today.answers = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
            if (!today.qaResponses) today.qaResponses = { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} };
            
            // إضافة الطالب إلى قائمة المجيبين إذا لم يكن موجوداً
            if (!today.answers[studentClass]) today.answers[studentClass] = [];
            if (!today.answers[studentClass].includes(studentName)) {
                today.answers[studentClass].push(studentName);
            }
            
            // تسجيل النقاط
            if (!today.qaResponses[studentClass]) today.qaResponses[studentClass] = {};
            today.qaResponses[studentClass][studentName] = points;
            
            // حفظ التغييرات
            LS.set('history', history);
            console.log('✅ تم تحديث إجابات اليوم:', today);
        }
    } catch (error) {
        console.error('❌ خطأ في تحديث إجابات اليوم:', error);
    }
}

// ============================================
// نظام النقاط والصور
// ============================================

function getStudentPoints(cls, name) {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    const points = studentPoints[pointsKey] || 0;
    console.log(`📊 جلب نقاط ${name} (${cls}): ${points}`);
    return points;
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
// الدوال المساعدة - معدلة بالكامل
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
        // حساب إجمالي النقاط لهذا اليوم
        let dayPoints = 0;
        if (d.qaResponses) {
            Object.values(d.qaResponses).forEach(classResponses => {
                Object.values(classResponses).forEach(points => {
                    dayPoints += points;
                });
            });
        }
        
        html += `<div style="padding:6px;border-bottom:1px solid #efe8d8">
            <strong>${d.date}</strong> — ${d.title || 'خلوة'}<br>
            <small>إجمالي النقاط: ${dayPoints}</small><br>
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
            html += `<tr>
                <td>${cls}</td>
                <td>${s.name}</td>
                <td><strong>${points}</strong></td>
            </tr>`;
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
    
    let html = '<h4>طلاب الفصل وحالة النقاط:</h4>';
    list.forEach(s => {
        const points = getStudentPoints(cls, s.name);
        html += `<div style="padding:8px; border-bottom:1px solid #eee;">
            <strong>${s.name}</strong> - النقاط: <span style="color: #e74c3c; font-weight: bold;">${points}</span>
        </div>`;
    });
    container.innerHTML = html;
}

// ============================================
// دوال التقارير والإحصائيات - معدلة بالكامل
// ============================================

function showAnalytics() {
    const students = LS.get('students') || {};
    const history = LS.get('history') || [];
    const studentPoints = LS.get('studentPoints') || {};
    
    let totalStudents = 0;
    let totalPoints = 0;
    let classDistribution = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0 };
    let classPoints = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0 };
    
    // حساب الإحصائيات
    Object.keys(students).forEach(cls => {
        classDistribution[cls] = students[cls].length;
        totalStudents += students[cls].length;
        
        students[cls].forEach(student => {
            const points = getStudentPoints(cls, student.name);
            totalPoints += points;
            classPoints[cls] += points;
        });
    });
    
    const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    const totalDays = history.length;
    
    // حساب النقاط من التاريخ أيضاً
    let historyPoints = 0;
    history.forEach(day => {
        if (day.qaResponses) {
            Object.values(day.qaResponses).forEach(classResponses => {
                Object.values(classResponses).forEach(points => {
                    historyPoints += points;
                });
            });
        }
    });

    const analyticsHTML = `
        <h3 style="text-align: center; color: #2c3e50;">📊 الإحصائيات العامة</h3>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalStudents}</div>
                <div class="stat-label">إجمالي الطلاب</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalDays}</div>
                <div class="stat-label">عدد الخلوات</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalPoints}</div>
                <div class="stat-label">إجمالي النقاط</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgPoints}</div>
                <div class="stat-label">متوسط النقاط</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h4>📈 توزيع الطلاب على الفصول</h4>
            ${Object.keys(classDistribution).map(cls => {
                const percentage = totalStudents > 0 ? ((classDistribution[cls] / totalStudents) * 100).toFixed(1) : 0;
                const classPointsTotal = classPoints[cls] || 0;
                return `
                <div style="margin: 12px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>الفصل ${cls}:</strong>
                        <span>${classDistribution[cls]} طالب - ${classPointsTotal} نقطة</span>
                    </div>
                    <div style="background:#e0e0e0; border-radius:10px; height:20px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #3498db, #2980b9); height:100%; border-radius:10px; width:${percentage}%"></div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div class="chart-container">
            <h4>🏆 أعلى 5 طلاب في النقاط</h4>
            ${getTopStudents(5).map((student, index) => {
                let medal = '';
                if (index === 0) medal = '🥇';
                else if (index === 1) medal = '🥈';
                else if (index === 2) medal = '🥉';
                
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.2rem;">${medal}</span>
                        <div>
                            <strong>${student.name}</strong>
                            <div style="color: #666; font-size: 0.8rem;">الفصل ${student.class}</div>
                        </div>
                    </div>
                    <div style="background: #ffd700; color: #000; padding: 4px 12px; border-radius: 15px; font-weight: 700;">
                        ${student.points} نقطة
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div class="chart-container">
            <h4>📋 ملخص النقاط</h4>
            <div style="background: #e8f4fd; padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <strong>النقاط من studentPoints:</strong>
                    <span>${totalPoints}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <strong>النقاط من history:</strong>
                    <span>${historyPoints}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0; border-top: 1px solid #3498db; padding-top: 8px;">
                    <strong>المجموع:</strong>
                    <span style="font-weight: bold; color: #e74c3c;">${totalPoints + historyPoints}</span>
                </div>
            </div>
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=500,height=700');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>التقارير والإحصائيات</title>
                <style>
                    body { 
                        font-family: 'Cairo', Arial; 
                        margin: 20px; 
                        background: #f8f9fa; 
                        line-height: 1.6;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        background: white;
                        padding: 15px;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border: 1px solid #e0e0e0;
                    }
                    .stat-number {
                        font-size: 1.8rem;
                        font-weight: 800;
                        color: #2c3e50;
                        margin-bottom: 5px;
                    }
                    .stat-label {
                        font-size: 0.85rem;
                        color: #7f8c8d;
                    }
                    .chart-container {
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border: 1px solid #e0e0e0;
                    }
                    h4 {
                        color: #2c3e50;
                        margin-top: 0;
                        margin-bottom: 15px;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 8px;
                    }
                </style>
            </head>
            <body>
                ${analyticsHTML}
                <button onclick="window.close()" style="margin-top: 20px; padding: 12px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 1rem;">إغلاق</button>
            </body>
        </html>
    `);
}

// دالة مساعدة للحصول على أفضل الطلاب
function getTopStudents(limit = 5) {
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
    
    return allStudents.sort((a, b) => b.points - a.points).slice(0, limit);
}

// ============================================
// دوال تفاصيل اليوم - معدلة بالكامل
// ============================================

function showDayDetails(index) {
    const history = LS.get('history') || [];
    const day = history[index];
    
    if (!day) {
        alert('❌ لا توجد بيانات لهذا اليوم');
        return;
    }
    
    const students = LS.get('students') || {};
    const studentPoints = LS.get('studentPoints') || {};
    
    let html = `
        <h3 style="text-align: center; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            📅 تفاصيل اليوم: ${day.date}
        </h3>
        <h4 style="color: #7f8c8d; text-align: center;">${day.title || 'خلوة'}</h4>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 10px; margin: 15px 0;">
            <strong>⏰ وقت الخلوة:</strong><br>
            البداية: ${new Date(day.startISO).toLocaleString('ar-EG')}<br>
            النهاية: ${new Date(day.endISO).toLocaleString('ar-EG')}
        </div>
    `;
    
    // إحصائيات المشاركة والنقاط
    let totalParticipants = 0;
    let totalDayPoints = 0;
    
    Object.keys(day.answers || {}).forEach(cls => {
        totalParticipants += (day.answers[cls] || []).length;
    });
    
    // حساب النقاط من اليوم
    if (day.qaResponses) {
        Object.values(day.qaResponses).forEach(classResponses => {
            Object.values(classResponses).forEach(points => {
                totalDayPoints += points;
            });
        });
    }
    
    html += `
        <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin: 10px 0;">
            <strong>📊 إحصائيات المشاركة:</strong><br>
            إجمالي المشاركين: ${totalParticipants} طالب<br>
            النقاط المكتسبة: ${totalDayPoints} نقطة
        </div>
    `;
    
    // تفاصيل كل فصل
    Object.keys(day.answers || {}).forEach(cls => {
        const classStudents = day.answers[cls] || [];
        if (classStudents.length > 0) {
            html += `
                <div class="class-section">
                    <h4 style="color: #3498db; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        🎒 الفصل ${cls} - ${classStudents.length} طالب
                    </h4>
                    <div style="max-height: 200px; overflow-y: auto;">
            `;
            
            const list = students[cls] || [];
            list.forEach(student => {
                const participated = classStudents.includes(student.name);
                const dayPoints = (day.qaResponses && day.qaResponses[cls] && day.qaResponses[cls][student.name]) 
                    ? day.qaResponses[cls][student.name] 
                    : 0;
                
                const totalPoints = getStudentPoints(cls, student.name);
                
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                        <div>
                            <span style="color: ${participated ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                                ${participated ? '✅' : '❌'}
                            </span>
                            ${student.name}
                        </div>
                        <div style="color: #666; font-size: 0.9rem;">
                            ${participated ? `نقاط اليوم: ${dayPoints} | الإجمالي: ${totalPoints}` : 'لم يشارك'}
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }
    });
    
    const w = window.open('', '_blank', 'width=500,height=600');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>تفاصيل اليوم - ${day.date}</title>
                <style>
                    body { 
                        font-family: 'Cairo', Arial; 
                        margin: 20px; 
                        background: #f8f9fa;
                        line-height: 1.6;
                    }
                    .class-section {
                        background: white;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 15px 0;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    h4 {
                        margin: 0 0 10px 0;
                    }
                </style>
            </head>
            <body>
                ${html}
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

// ... باقي الدوال (الوسائط المتعددة، النسخ الاحتياطي، إلخ) تبقى كما هي
// [يتبع بنفس الكود السابق للدوال الأخرى]

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
