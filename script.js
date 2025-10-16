/* ============================================
   ميزات الخدام الجديدة - المرحلة الثالثة
   ============================================ */

// نظام الرسائل التشجيعية
function sendEncouragement(cls, studentName, messageType = 'general') {
    const messages = {
        general: [
            "أحسنت! استمر في التقدم 🌟",
            "أنت مبدع، ونفتخر بك 🎯",
            "تقدمك رائع، حافظ عليه 💪",
            "الله يبارك فيك ويوفقك 🙏",
            "أنت مثال رائع للاجتهاد ✨"
        ],
        points: [
            "مبارك! نقاطك في زيادة مستمرة 🏆",
            "واو! وصلت لنتيجة ممتازة 🎉",
            "تستحق أكثر بكثير، استمر هكذا 💫",
            "نقاطك تخبرنا أنك مميز 🌈",
            "مبروك على الإنجاز الرائع 🥳"
        ],
        attendance: [
            "متابعتك مستمرة، هذا رائع 📅",
            "الحضور المستمر مفتاح النجاح 🔑",
            "شكراً على التزامك الدائم 🤝",
            "حضورك يضيف الكثير للفصل 🌸",
            "نشاطك اليومي ملهم للجميع 🌟"
        ]
    };

    const selectedMessages = messages[messageType] || messages.general;
    const randomMessage = selectedMessages[Math.floor(Math.random() * selectedMessages.length)];
    
    // حفظ الرسالة في سجل الطالب
    const studentMessages = LS.get('studentMessages') || {};
    const studentKey = `${cls}_${studentName}`;
    if (!studentMessages[studentKey]) {
        studentMessages[studentKey] = [];
    }
    
    const messageData = {
        message: randomMessage,
        date: new Date().toLocaleString('ar-EG'),
        type: messageType,
        from: 'الخادم'
    };
    
    studentMessages[studentKey].push(messageData);
    LS.set('studentMessages', studentMessages);
    
    // إضافة إشعار
    addNotification('رسالة تشجيع', `تم إرسال رسالة تشجيع لـ ${studentName}`, 'success');
    
    return randomMessage;
}

// عرض تفاصيل تقدم الطالب
function showStudentProgress(cls, studentName) {
    const student = getStudentData(cls, studentName);
    const points = getStudentPoints(cls, studentName);
    const streak = calculateStreak(cls, studentName);
    const attendanceRate = calculateAttendanceRate(cls, studentName);
    const performance = calculatePerformance(cls, studentName);
    
    const progressHTML = `
        <div class="student-progress-card fade-in">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <img src="${getStudentPhoto(cls, studentName)}" alt="${studentName}" class="profile-img" style="width:50px;height:50px">
                <div>
                    <h4 style="margin:0">${studentName}</h4>
                    <div class="performance-badge performance-${performance.level}">${performance.text}</div>
                    <div>الفصل: ${cls}</div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${points}</div>
                    <div class="stat-label">النقاط</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${streak}</div>
                    <div class="stat-label">أيام متابعة</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${attendanceRate}%</div>
                    <div class="stat-label">نسبة الحضور</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${student.answeredDates?.length || 0}</div>
                    <div class="stat-label">فعاليات شارك فيها</div>
                </div>
            </div>
            
            <div style="margin:12px 0">
                <strong>تقدم المشاركة:</strong>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${attendanceRate}%"></div>
                </div>
            </div>
            
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
                <button class="encourage-btn" onclick="sendEncouragementMessage('${cls}', '${studentName}', 'general')">
                    💌 رسالة تشجيع
                </button>
                <button class="encourage-btn" style="background:#e84393" onclick="sendEncouragementMessage('${cls}', '${studentName}', 'points')">
                    🏆 تشجيع بالنقاط
                </button>
                <button class="encourage-btn" style="background:#fd79a8" onclick="sendEncouragementMessage('${cls}', '${studentName}', 'attendance')">
                    📅 تشجيع بالحضور
                </button>
            </div>
            
            <div>
                <strong>آخر الرسائل:</strong>
                ${getLastMessages(cls, studentName)}
            </div>
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>تقدم ${studentName}</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 15px; background: #f8f9fa; }
                    .student-progress-card { background: white; padding: 15px; border-radius: 10px; margin: 10px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
                    .stat-card { background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; }
                    .stat-number { font-size: 1.3rem; font-weight: 800; color: #2c3e50; }
                    .stat-label { font-size: 0.8rem; color: #7f8c8d; }
                    .progress-bar { background: #e0e0e0; border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden; }
                    .progress-fill { background: linear-gradient(90deg, #74b9ff, #0984e3); height: 100%; border-radius: 10px; transition: width 0.3s; }
                    .encourage-btn { background: #00b894; color: white; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; margin: 4px; font-size: 0.8rem; }
                    .performance-badge { display: inline-block; padding: 3px 10px; border-radius: 15px; font-size: 0.8rem; font-weight: 700; }
                    .performance-excellent { background: #00b894; color: white; }
                    .performance-good { background: #74b9ff; color: white; }
                    .performance-average { background: #fdcb6e; color: white; }
                    .performance-needs-improvement { background: #e17055; color: white; }
                </style>
            </head>
            <body>
                <h3 style="text-align:center; color:#2d3436;">📊 تقدم الطالب</h3>
                ${progressHTML}
                <button onclick="window.close()" style="margin-top: 15px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

// دالة مساعدة للحصول على بيانات الطالب
function getStudentData(cls, studentName) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    return classStudents.find(s => s.name === studentName) || {};
}

// حساب نسبة الحضور
function calculateAttendanceRate(cls, studentName) {
    const history = LS.get('history') || [];
    const student = getStudentData(cls, studentName);
    const totalDays = history.length;
    const attendedDays = student.answeredDates?.length || 0;
    
    return totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;
}

// حساب أداء الطالب
function calculatePerformance(cls, studentName) {
    const attendanceRate = calculateAttendanceRate(cls, studentName);
    const points = getStudentPoints(cls, studentName);
    
    if (attendanceRate >= 90 && points >= 200) {
        return { level: 'excellent', text: 'ممتاز' };
    } else if (attendanceRate >= 75 && points >= 100) {
        return { level: 'good', text: 'جيد جداً' };
    } else if (attendanceRate >= 50 && points >= 50) {
        return { level: 'average', text: 'جيد' };
    } else {
        return { level: 'needs-improvement', text: 'يحتاج تحسين' };
    }
}

// إرسال رسالة تشجيعية مع تأثير
function sendEncouragementMessage(cls, studentName, messageType) {
    const message = sendEncouragement(cls, studentName, messageType);
    
    // تأثير بصري
    showConfetti();
    
    alert(`✅ تم إرسال الرسالة:\n"${message}"`);
}

// الحصول على آخر الرسائل
function getLastMessages(cls, studentName) {
    const studentMessages = LS.get('studentMessages') || {};
    const studentKey = `${cls}_${studentName}`;
    const messages = studentMessages[studentKey] || [];
    
    const lastMessages = messages.slice(-3).reverse();
    
    if (lastMessages.length === 0) {
        return '<p style="color:#666; text-align:center; margin:10px 0;">لا توجد رسائل سابقة</p>';
    }
    
    return lastMessages.map(msg => `
        <div style="background:#f8f9fa; padding:8px; margin:5px 0; border-radius:8px; border-right:3px solid #74b9ff;">
            <div style="font-weight:700;">${msg.message}</div>
            <small style="color:#666;">${msg.date}</small>
        </div>
    `).join('');
}

// لوحة تحكم الخادم المحسنة
function enhanceTeacherPanel() {
    const teacherPanel = document.getElementById('teacherPanel');
    if (teacherPanel && !document.getElementById('teacherDashboard')) {
        const teacherClass = document.getElementById('teacherClass').innerText;
        
        const dashboardHTML = `
            <div class="teacher-dashboard fade-in">
                <h4 style="margin:0; text-align:center;">📊 لوحة متابعة الفصل ${teacherClass}</h4>
                <div style="display:flex; justify-content:space-around; margin-top:10px;">
                    <div style="text-align:center;">
                        <div style="font-size:1.5rem; font-weight:800;">${getClassStats(teacherClass).totalStudents}</div>
                        <small>إجمالي الطلاب</small>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:1.5rem; font-weight:800;">${getClassStats(teacherClass).activeToday}</div>
                        <small>نشط اليوم</small>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:1.5rem; font-weight:800;">${getClassStats(teacherClass).avgPoints}</div>
                        <small>متوسط النقاط</small>
                    </div>
                </div>
            </div>
            
            <div style="margin:15px 0;">
                <button class="btn btn-blue" onclick="showClassProgress('${teacherClass}')">
                    📈 عرض تقدم الفصل
                </button>
                <button class="btn" style="background:#00b894; color:white; margin-top:8px;" onclick="sendBulkEncouragement('${teacherClass}')">
                    💫 تشجيع جماعي
                </button>
            </div>
        `;
        
        const dashboardElement = document.createElement('div');
        dashboardElement.id = 'teacherDashboard';
        dashboardElement.innerHTML = dashboardHTML;
        
        const statusElement = document.getElementById('teacherStatus');
        teacherPanel.insertBefore(dashboardElement, statusElement);
    }
}

// إحصائيات الفصل
function getClassStats(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    const kh = LS.get('kholwa');
    const today = todayDate();
    
    const totalStudents = classStudents.length;
    const activeToday = classStudents.filter(s => 
        s.answeredDates?.includes(today)
    ).length;
    
    const totalPoints = classStudents.reduce((sum, student) => 
        sum + getStudentPoints(cls, student.name), 0
    );
    
    const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    
    return { totalStudents, activeToday, avgPoints };
}

// عرض تقدم الفصل كاملاً
function showClassProgress(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    
    let progressHTML = `
        <h3 style="text-align:center;">📊 تقدم فصل ${cls}</h3>
        <div style="max-height:400px; overflow-y:auto;">
    `;
    
    classStudents.forEach(student => {
        const performance = calculatePerformance(cls, student.name);
        const points = getStudentPoints(cls, student.name);
        const attendanceRate = calculateAttendanceRate(cls, student.name);
        
        progressHTML += `
            <div class="student-progress-card" style="cursor:pointer;" onclick="showStudentProgress('${cls}', '${student.name}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${getStudentPhoto(cls, student.name)}" alt="${student.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                        <div>
                            <strong>${student.name}</strong>
                            <div class="performance-badge performance-${performance.level}">${performance.text}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div>${points} نقطة</div>
                        <small>${attendanceRate}% حضور</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    progressHTML += `</div>`;
    
    const w = window.open('', '_blank', 'width=450,height=500');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>تقدم فصل ${cls}</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 15px; background: #f8f9fa; }
                    .student-progress-card { background: white; padding: 12px; border-radius: 10px; margin: 8px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
                    .student-progress-card:hover { transform: translateX(-5px); }
                    .performance-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; }
                    .performance-excellent { background: #00b894; color: white; }
                    .performance-good { background: #74b9ff; color: white; }
                    .performance-average { background: #fdcb6e; color: white; }
                    .performance-needs-improvement { background: #e17055; color: white; }
                </style>
            </head>
            <body>
                ${progressHTML}
                <button onclick="window.close()" style="margin-top: 15px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

// تشجيع جماعي للفصل
function sendBulkEncouragement(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    
    let encouragedCount = 0;
    classStudents.forEach(student => {
        if (Math.random() > 0.3) { // 70% فرصة لإرسال رسالة
            sendEncouragement(cls, student.name, 'general');
            encouragedCount++;
        }
    });
    
    showConfetti();
    alert(`✅ تم إرسال رسائل تشجيعية لـ ${encouragedCount} طالب`);
    addNotification('تشجيع جماعي', `تم إرسال رسائل تشجيعية لـ ${encouragedCount} طالب في فصل ${cls}`, 'success');
}

/* ============================================
   اللمسات النهائية وتحسينات تجربة المستخدم
   ============================================ */

// تأثير الكونفيتي
function showConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti';
    document.body.appendChild(confettiContainer);
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.background = getRandomColor();
        confetti.style.animationDelay = Math.random() * 5 + 's';
        confettiContainer.appendChild(confetti);
    }
    
    setTimeout(() => {
        confettiContainer.remove();
    }, 5000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// تحميل مؤقت
function showLoading(element) {
    const originalHTML = element.innerHTML;
    element.innerHTML = '<div class="loading-spinner"></div> جاري التحميل...';
    element.disabled = true;
    
    return () => {
        element.innerHTML = originalHTML;
        element.disabled = false;
    };
}

// تحسين دخول الخادم
function enhancedTeacherLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const teachers = LS.get('teachers') || [];
    const found = teachers.find(t => t.username === u && t.password === p);
    
    if (!found) {
        // تأثير الاهتزاز عند خطأ
        const loginBox = document.getElementById('teacherLoginBox');
        loginBox.style.animation = 'shake 0.5s';
        setTimeout(() => loginBox.style.animation = '', 500);
        return alert('بيانات دخول خاطئة');
    }
    
    document.getElementById('teacherLoginBox').style.display = 'none';
    document.getElementById('teacherPanel').style.display = 'block';
    document.getElementById('teacherClass').innerText = found.classId;
    
    // تحسين واجهة الخادم
    enhanceTeacherPanel();
    loadTeacherStatus(found.classId);
    
    // إشعار ترحيبي
    addNotification('دخول خادم', `مرحباً ${u} في فصل ${found.classId}`, 'info');
}

// تحديث دخول الخادم لاستخدام الدالة المحسنة
function teacherLogin() {
    enhancedTeacherLogin();
}

// تأثيرات عند الإجابة الصحيحة
function enhancedHandleChildAnswer(cls, name, answerIndex) {
    const students = LS.get('students') || {};
    const list = students[cls] || [];
    const student = list.find(s => s.name === name);
    const shared = await fetchShared();
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa');
    
    if (!kh || kh.date !== todayDate()) {
        alert('الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️');
        return;
    }
    
    if (!student) return alert('الطفل غير مسجل');
    student.answeredDates = student.answeredDates || [];
    if (!student.answeredDates.includes(kh.date)) student.answeredDates.push(kh.date);
    students[cls] = list;
    LS.set('students', students);
    
    const history = LS.get('history') || [];
    if (history.length) {
        const latest = history[history.length - 1];
        latest.answers = latest.answers || { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
        if (!latest.answers[cls].includes(name)) latest.answers[cls].push(name);
        latest.qaResponses = latest.qaResponses || { '1': {}, '2': {}, '3': {}, '4': {}, '5': {}, '6': {} };
        latest.qaResponses[cls][name] = (answerIndex + 1);
        LS.set('history', history);
    }
    
    const correct = kh.question && (answerIndex === kh.question.correctIndex);
    const resultArea = document.getElementById('resultArea');
    
    // حساب النقاط
    const pointsResult = calculatePoints(cls, name, correct);
    
    if (correct) {
        // تأثيرات عند الإجابة الصحيحة
        showConfetti();
        resultArea.className = 'note bounce';
        resultArea.innerHTML = `
            <div class="center">
                <div style="font-size:2rem;">🎉</div>
                برافو، بنحبك ❤️<br>
                <small>كسبت ${pointsResult.earned} نقطة!</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
        
        // إشعار تلقائي للخادم
        addNotification('إجابة صحيحة', `${name} أجاب إجابة صحيحة في فصل ${cls}`, 'success');
    } else {
        resultArea.className = 'note fade-in';
        resultArea.innerHTML = `
            <div class="center">
                بنحبك، حاول مرة تاني 💪<br>
                <small>كسبت ${pointsResult.earned} نقاط للحضور</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    }
    
    loadTeacherStatus(cls);
    loadReport();
    refreshHistoryList();
}

// تهيئة كل التحسينات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تحديث الإشعارات
    updateNotifications();
    
    // إضافة تأثيرات للعناصر
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = (index * 0.1) + 's';
        card.classList.add('fade-in');
    });
    
    // تحسين تجربة الجوال
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('Service Worker registered');
        });
    }
    
    // إضافة تلميحات للمساعدة
    addTooltips();
});

// إضافة تلميحات مساعدة
function addTooltips() {
    const tooltips = {
        'adminPass': 'كلمة مرور المسؤول الافتراضية: admin123',
        'tpass': 'سيتم استخدام هذه الكلمة من قبل الخادم',
        'childName': 'ادخل اسم الطفل كما هو مسجل',
        'enterKholwaBtn': 'اضغط لفتح الخلوة ومشاهدة الأنشطة'
    };
    
    Object.keys(tooltips).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.parentElement.classList.add('tooltip');
            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'tooltiptext';
            tooltipSpan.textContent = tooltips[id];
            element.parentElement.appendChild(tooltipSpan);
        }
    });
}

// تحديث الدوال القديمة لاستخدام المحسنة
// استبدال handleChildAnswer بالدالة المحسنة
const originalHandleChildAnswer = handleChildAnswer;
handleChildAnswer = enhancedHandleChildAnswer;
