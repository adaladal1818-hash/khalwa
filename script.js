const SHARED = 'data.json';
async function fetchShared(){ try{ const r = await fetch(SHARED + '?_=' + Date.now()); if(!r.ok) throw 0; return await r.json(); }catch(e){ return null; } }

const LS = { get(k){ try{return JSON.parse(localStorage.getItem(k)); }catch(e){return null} }, set(k,v){ localStorage.setItem(k, JSON.stringify(v)); } };
if(!LS.get('teachers')) LS.set('teachers', []);
if(!LS.get('students')) LS.set('students', { '1':[], '2':[], '3':[], '4':[], '5':[], '6':[] });
if(!LS.get('history')) LS.set('history', []);
if(!LS.get('studentPhotos')) LS.set('studentPhotos', {});
if(!LS.get('studentPoints')) LS.set('studentPoints', {});
if(!LS.get('notifications')) LS.set('notifications', []);
if(!LS.get('autoBackup')) LS.set('autoBackup', true);
if(!LS.get('activities')) LS.set('activities', []);

function todayDate(){ return new Date().toISOString().slice(0,10); }
function showPanel(id){ document.getElementById('home').style.display='none'; ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display=(p===id)?'block':'none'); updateMainInfo(); updateNotifications(); }
function goHome(){ document.getElementById('home').style.display='block'; ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display='none'); document.getElementById('mainInfo').style.display='none'; }

async function updateMainInfo(){ const shared = await fetchShared(); const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); if(!kh || kh.date !== todayDate()){ document.getElementById('mainInfo').style.display='none'; return; } document.getElementById('mainInfo').style.display='block'; document.getElementById('todayTitle').innerText = kh.title || 'خلوة اليوم'; updateTimerDisplay(kh); }

/* نظام النقاط */
function calculatePoints(cls, name, isCorrect = false, activityType = 'normal') {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    const currentPoints = studentPoints[pointsKey] || 0;
    
    let newPoints = currentPoints;
    let pointsEarned = 0;
    
    // نقاط الحضور اليومي (10 نقاط) - مرة واحدة يومياً
    const lastAttendance = studentPoints.lastAttendance || {};
    if (!lastAttendance[cls] || lastAttendance[cls] !== todayDate()) {
        newPoints += 10;
        pointsEarned += 10;
        lastAttendance[cls] = todayDate();
        studentPoints.lastAttendance = lastAttendance;
    }
    
    // نقاط حسب نوع النشاط
    if (activityType === 'trueFalse' && isCorrect) {
        newPoints += 15;
        pointsEarned += 15;
    } else if (activityType === 'sorting' && isCorrect) {
        newPoints += 25;
        pointsEarned += 25;
    } else if (activityType === 'matching' && isCorrect) {
        newPoints += 20;
        pointsEarned += 20;
    } else if (activityType === 'challenge' && isCorrect) {
        newPoints += 30;
        pointsEarned += 30;
    } else if (isCorrect) {
        newPoints += 20;
        pointsEarned += 20;
    }
    
    // مكافأة المتابعة (15 نقطة لكل 3 أيام متتالية)
    const streak = calculateStreak(cls, name);
    if (streak >= 3) {
        newPoints += 15;
        pointsEarned += 15;
    }
    
    studentPoints[pointsKey] = newPoints;
    LS.set('studentPoints', studentPoints);
    
    return { total: newPoints, earned: pointsEarned };
}

function calculateStreak(cls, name) {
    const students = LS.get('students') || {};
    const student = students[cls]?.find(s => s.name === name);
    return student?.answeredDates?.length || 0;
}

function getStudentPoints(cls, name) {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    return studentPoints[pointsKey] || 0;
}

/* نظام الصور */
function handleImageUpload(event, cls, name) {
    const file = event.target.files[0];
    if (!file) return;
    
    // التحقق من حجم الصورة (2MB كحد أقصى)
    if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الرجاء اختيار صورة أصغر من 2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const studentPhotos = LS.get('studentPhotos') || {};
        studentPhotos[`${cls}_${name}`] = e.target.result;
        LS.set('studentPhotos', studentPhotos);
        
        const imgElement = document.getElementById('childProfileImg');
        if (imgElement) {
            imgElement.src = e.target.result;
        }
        
        alert('تم حفظ الصورة بنجاح! 📸');
        addNotification('صورة جديدة', `تم تحديث صورة ${name} من الفصل ${cls}`, 'info');
    };
    reader.readAsDataURL(file);
}

function getStudentPhoto(cls, name) {
    const studentPhotos = LS.get('studentPhotos') || {};
    return studentPhotos[`${cls}_${name}`] || 'https://via.placeholder.com/60/fffaf2/d9b382?text=👦';
}

/* لوحة المتصدرين */
function showLeaderboard() {
    const students = LS.get('students') || {};
    const studentPoints = LS.get('studentPoints') || {};
    
    let allStudents = [];
    
    Object.keys(students).forEach(cls => {
        students[cls].forEach(student => {
            const points = getStudentPoints(cls, student.name);
            allStudents.push({
                name: student.name,
                class: cls,
                points: points,
                photo: getStudentPhoto(cls, student.name),
                streak: calculateStreak(cls, student.name)
            });
        });
    });
    
    allStudents.sort((a, b) => b.points - a.points);
    
    const leaderboardHTML = allStudents.slice(0, 10).map((student, index) => {
        let medal = '';
        if (index === 0) medal = ' 🥇';
        else if (index === 1) medal = ' 🥈';
        else if (index === 2) medal = ' 🥉';
        
        return `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">${index + 1}</div>
                <img src="${student.photo}" alt="${student.name}" class="leaderboard-avatar">
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${student.name} ${medal}</div>
                    <div class="leaderboard-points">الفصل: ${student.class} | النقاط: ${student.points} | المتابعة: ${student.streak} أيام</div>
                </div>
            </div>
        `;
    }).join('');
    
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>لوحة المتصدرين</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 20px; background: #fffaf2; }
                    .leaderboard-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #ddd; gap: 12px; }
                    .leaderboard-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
                    .leaderboard-rank { font-size: 1.2rem; font-weight: 800; min-width: 30px; }
                    .leaderboard-name { font-weight: 700; }
                    .leaderboard-points { color: #666; font-size: 0.9rem; }
                </style>
            </head>
            <body>
                <h2 style="text-align: center;">🏆 لوحة المتصدرين</h2>
                ${leaderboardHTML || '<p style="text-align: center;">لا توجد بيانات بعد</p>'}
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button>
            </body>
        </html>
    `);
}

/* الأنشطة التفاعلية الجديدة */
function createTrueFalseActivity(question, correctAnswer) {
    return {
        type: 'trueFalse',
        question: question,
        correctAnswer: correctAnswer,
        points: 15
    };
}

function createSortingActivity(items, correctOrder) {
    return {
        type: 'sorting',
        items: items,
        correctOrder: correctOrder,
        points: 25
    };
}

function createMatchingActivity(pairs) {
    return {
        type: 'matching',
        pairs: pairs,
        points: 20
    };
}

function createChallengeActivity(question, options, correctIndex, challengeType = 'group') {
    return {
        type: 'challenge',
        question: question,
        options: options,
        correctIndex: correctIndex,
        challengeType: challengeType,
        points: 30
    };
}

// دالة لعرض النشاط التفاعلي
function displayInteractiveActivity(activity, cls, name) {
    const contentDiv = document.getElementById('kholwaContent');
    
    switch(activity.type) {
        case 'trueFalse':
            displayTrueFalseActivity(activity, cls, name, contentDiv);
            break;
        case 'sorting':
            displaySortingActivity(activity, cls, name, contentDiv);
            break;
        case 'matching':
            displayMatchingActivity(activity, cls, name, contentDiv);
            break;
        case 'challenge':
            displayChallengeActivity(activity, cls, name, contentDiv);
            break;
    }
}

function displayTrueFalseActivity(activity, cls, name, container) {
    container.innerHTML += `
        <div class="activity-card">
            <h4>${activity.question}</h4>
            <div class="true-false-btns">
                <button class="true-false-btn true-btn" onclick="handleTrueFalseAnswer(true, '${cls}', '${name}', ${activity.correctAnswer})">✅ صح</button>
                <button class="true-false-btn false-btn" onclick="handleTrueFalseAnswer(false, '${cls}', '${name}', ${activity.correctAnswer})">❌ خطأ</button>
            </div>
        </div>
    `;
}

function displaySortingActivity(activity, cls, name, container) {
    const shuffledItems = [...activity.items].sort(() => Math.random() - 0.5);
    
    container.innerHTML += `
        <div class="activity-card">
            <h4>رتب العناصر بالترتيب الصحيح:</h4>
            <ul id="sortableList" class="sortable-list">
                ${shuffledItems.map((item, index) => `
                    <li class="sortable-item" data-index="${index}">${item}</li>
                `).join('')}
            </ul>
            <button class="btn btn-blue" onclick="checkSortingAnswer('${cls}', '${name}', ${JSON.stringify(activity.correctOrder)})">تحقق من الإجابة</button>
        </div>
    `;
    
    makeSortable();
}

function displayMatchingActivity(activity, cls, name, container) {
    const leftItems = activity.pairs.map(pair => pair.left);
    const rightItems = activity.pairs.map(pair => pair.right).sort(() => Math.random() - 0.5);
    
    container.innerHTML += `
        <div class="activity-card">
            <h4>صل كل عنصر بما يناسبه:</h4>
            <div class="matching-container">
                <div>
                    ${leftItems.map(item => `<div class="matching-item" data-left="${item}">${item}</div>`).join('')}
                </div>
                <div>
                    ${rightItems.map(item => `<div class="matching-item" data-right="${item}">${item}</div>`).join('')}
                </div>
            </div>
            <button class="btn btn-blue" onclick="checkMatchingAnswer('${cls}', '${name}', ${JSON.stringify(activity.pairs)})">تحقق من الإجابة</button>
        </div>
    `;
    
    setupMatching();
}

function displayChallengeActivity(activity, cls, name, container) {
    container.innerHTML += `
        <div class="challenge-card">
            <h4>🏆 تحدي جماعي 🏆</h4>
            <p>${activity.question}</p>
            <div class="true-false-btns">
                ${activity.options.map((option, index) => `
                    <button class="true-false-btn" style="background:#9b59b6" onclick="handleChallengeAnswer(${index}, '${cls}', '${name}', ${activity.correctIndex})">${option}</button>
                `).join('')}
            </div>
        </div>
    `;
}

// معالجة إجابات الأنشطة
function handleTrueFalseAnswer(userAnswer, cls, name, correctAnswer) {
    const isCorrect = userAnswer === correctAnswer;
    const pointsResult = calculatePoints(cls, name, isCorrect, 'trueFalse');
    
    const resultArea = document.getElementById('resultArea');
    if (isCorrect) {
        resultArea.innerHTML = `
            <div class="center">
                أحسنت! إجابة صحيحة ✅<br>
                <small>كسبت ${pointsResult.earned} نقطة!</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    } else {
        resultArea.innerHTML = `
            <div class="center">
                حاول مرة أخرى 💪<br>
                <small>الإجابة الصحيحة: ${correctAnswer ? 'صح' : 'خطأ'}</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    }
    
    addNotification('نشاط صح/خطأ', `${name} أجاب على سؤال صح/خطأ`, isCorrect ? 'success' : 'warning');
}

function checkSortingAnswer(cls, name, correctOrder) {
    const sortableList = document.getElementById('sortableList');
    const currentOrder = Array.from(sortableList.children).map(item => 
        activity.items.indexOf(item.textContent)
    );
    
    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);
    const pointsResult = calculatePoints(cls, name, isCorrect, 'sorting');
    
    const resultArea = document.getElementById('resultArea');
    if (isCorrect) {
        resultArea.innerHTML = `
            <div class="center">
                ممتاز! الترتيب صحيح ✅<br>
                <small>كسبت ${pointsResult.earned} نقطة!</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    } else {
        resultArea.innerHTML = `
            <div class="center">
                ترتيب غير صحيح، حاول مرة أخرى 💪<br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    }
    
    addNotification('نشاط ترتيب', `${name} شارك في نشاط الترتيب`, isCorrect ? 'success' : 'warning');
}

function checkMatchingAnswer(cls, name, pairs) {
    // تنفيذ منطق التحقق من التوصيل
    const isCorrect = true; // يجب استبدال هذا بالمنطق الفعلي
    const pointsResult = calculatePoints(cls, name, isCorrect, 'matching');
    
    const resultArea = document.getElementById('resultArea');
    resultArea.innerHTML = `
        <div class="center">
            ${isCorrect ? 'أحسنت! التوصيل صحيح ✅' : 'توصيل غير صحيح، حاول مرة أخرى 💪'}<br>
            <small>كسبت ${pointsResult.earned} نقطة!</small><br>
            <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
        </div>
    `;
    
    addNotification('نشاط توصيل', `${name} شارك في نشاط التوصيل`, isCorrect ? 'success' : 'warning');
}

function handleChallengeAnswer(answerIndex, cls, name, correctIndex) {
    const isCorrect = answerIndex === correctIndex;
    const pointsResult = calculatePoints(cls, name, isCorrect, 'challenge');
    
    const resultArea = document.getElementById('resultArea');
    if (isCorrect) {
        resultArea.innerHTML = `
            <div class="center">
                مبروك! فزت بالتحدي 🏆<br>
                <small>كسبت ${pointsResult.earned} نقطة!</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    } else {
        resultArea.innerHTML = `
            <div class="center">
                لم تفز بالتحدي هذه المرة 💪<br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
    }
    
    addNotification('تحدي جماعي', `${name} شارك في التحدي الجماعي`, isCorrect ? 'success' : 'info');
}

/* نظام الإشعارات */
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
    // حفظ فقط آخر 50 إشعار
    LS.set('notifications', notifications.slice(0, 50));
    updateNotifications();
}

function updateNotifications() {
    const notifications = LS.get('notifications') || [];
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // تحديث شارة الإشعارات
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    
    // تحديث قائمة الإشعارات في لوحة المسؤول
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList) {
        if (notifications.length === 0) {
            notificationsList.innerHTML = '<p class="note">لا توجد إشعارات</p>';
        } else {
            notificationsList.innerHTML = notifications.slice(0, 10).map(notif => `
                <div class="notification-item" style="border-left: 4px solid ${
                    notif.type === 'success' ? '#27ae60' : 
                    notif.type === 'warning' ? '#f39c12' : 
                    notif.type === 'error' ? '#e74c3c' : '#3498db'
                }">
                    <strong>${notif.title}</strong><br>
                    <small>${notif.message}</small><br>
                    <small style="color:#666">${notif.date}</small>
                    ${!notif.read ? '<span style="color:red">●</span>' : ''}
                </div>
            `).join('');
        }
    }
}

function markAllNotificationsAsRead() {
    const notifications = LS.get('notifications') || [];
    notifications.forEach(notif => notif.read = true);
    LS.set('notifications', notifications);
    updateNotifications();
}

/* النسخ الاحتياطي التلقائي */
function setupAutoBackup() {
    if (LS.get('autoBackup')) {
        // نسخ احتياطي كل ساعة
        setInterval(() => {
            const backupData = {
                students: LS.get('students'),
                points: LS.get('studentPoints'),
                photos: LS.get('studentPhotos'),
                history: LS.get('history'),
                timestamp: new Date().toISOString()
            };
            
            LS.set('lastBackup', backupData);
            LS.set('backupTimestamp', new Date().toLocaleString('ar-EG'));
            
            console.log('تم النسخ الاحتياطي التلقائي:', new Date().toLocaleString('ar-EG'));
        }, 60 * 60 * 1000); // كل ساعة
    }
}

// استدعاء النسخ الاحتياطي عند التحميل
setupAutoBackup();

/* التحليلات والرسوم البيانية */
function showAnalytics() {
    const students = LS.get('students') || {};
    const history = LS.get('history') || [];
    const studentPoints = LS.get('studentPoints') || {};
    
    let totalStudents = 0;
    let totalPoints = 0;
    let classDistribution = { '1':0, '2':0, '3':0, '4':0, '5':0, '6':0 };
    
    Object.keys(students).forEach(cls => {
        classDistribution[cls] = students[cls].length;
        totalStudents += students[cls].length;
        
        students[cls].forEach(student => {
            totalPoints += getStudentPoints(cls, student.name);
        });
    });
    
    const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
    
    const analyticsHTML = `
        <h3>📊 الإحصائيات العامة</h3>
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
                <div class="stat-number">${totalPoints}</div>
                <div class="stat-label">إجمالي النقاط</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgPoints}</div>
                <div class="stat-label">متوسط النقاط</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h4>توزيع الطلاب على الفصول</h4>
            ${Object.keys(classDistribution).map(cls => `
                <div style="margin: 5px 0;">
                    <strong>الفصل ${cls}:</strong> ${classDistribution[cls]} طالب
                    <div style="background:#e0e0e0; border-radius:5px; height:20px; margin-top:5px;">
                        <div style="background:#3498db; height:100%; border-radius:5px; width:${(classDistribution[cls] / totalStudents) * 100}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="chart-container">
            <h4>أعلى 5 طلاب في النقاط</h4>
            ${getTopStudents(5).map((student, index) => `
                <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee">
                    <span>${index + 1}. ${student.name} (فصل ${student.class})</span>
                    <strong>${student.points} نقطة</strong>
                </div>
            `).join('')}
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=500,height=700');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>التقارير والإحصائيات</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 20px; background: #f8f9fa; }
                    .stat-card { background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                    .stat-number { font-size: 2rem; font-weight: 800; color: #2c3e50; }
                    .stat-label { font-size: 0.9rem; color: #7f8c8d; margin-top: 5px; }
                    .chart-container { background: white; padding: 15px; border-radius: 10px; margin: 15px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                ${analyticsHTML}
                <button onclick="window.close()" style="margin-top: 20px; padding: 12px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

function getTopStudents(limit = 5) {
    const students = LS.get('students') || {};
    const studentPoints = LS.get('studentPoints') || {};
    
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

// ... (بقية الدوال الموجودة سابقاً تبقى كما هي)

// تحديث واجهة المسؤول لإضافة الأزرار الجديدة
function updateAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        // إضافة زر التقارير إذا لم يكن موجوداً
        if (!document.getElementById('analyticsBtn')) {
            const analyticsBtn = document.createElement('button');
            analyticsBtn.id = 'analyticsBtn';
            analyticsBtn.className = 'btn btn-blue';
            analyticsBtn.innerHTML = '📊 التقارير والإحصائيات';
            analyticsBtn.onclick = showAnalytics;
            analyticsBtn.style.marginTop = '10px';
            
            // إضافة زر النسخ الاحتياطي
            const backupBtn = document.createElement('button');
            backupBtn.className = 'btn';
            backupBtn.style.background = '#27ae60';
            backupBtn.style.color = 'white';
            backupBtn.innerHTML = '💾 النسخ الاحتياطي';
            backupBtn.onclick = createManualBackup;
            backupBtn.style.marginTop = '10px';
            
            // إضافة زر الإشعارات
            const notificationsBtn = document.createElement('button');
            notificationsBtn.className = 'btn';
            notificationsBtn.style.background = '#e67e22';
            notificationsBtn.style.color = 'white';
            notificationsBtn.innerHTML = '🔔 الإشعارات';
            notificationsBtn.onclick = showNotificationsPanel;
            notificationsBtn.style.marginTop = '10px';
            
            // إضافة الأزرار قبل زر العودة
            const backBtn = adminPanel.querySelector('.back-btn');
            adminPanel.insertBefore(notificationsBtn, backBtn);
            adminPanel.insertBefore(backupBtn, backBtn);
            adminPanel.insertBefore(analyticsBtn, backBtn);
        }
    }
}

function createManualBackup() {
    const backupData = {
        students: LS.get('students'),
        points: LS.get('studentPoints'),
        photos: LS.get('studentPhotos'),
        history: LS.get('history'),
        teachers: LS.get('teachers'),
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-kholwa-${todayDate()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    
    alert('تم إنشاء نسخة احتياطية ✅');
    addNotification('نسخ احتياطي', 'تم إنشاء نسخة احتياطية يدوية', 'success');
}

function showNotificationsPanel() {
    const notifications = LS.get('notifications') || [];
    
    const notificationsHTML = `
        <h3>🔔 الإشعارات</h3>
        <button class="btn" style="background:#95a5a6; color:white; margin-bottom:10px;" onclick="markAllNotificationsAsRead()">تعيين الكل كمقروء</button>
        <div id="notificationsList">
            ${notifications.length === 0 ? '<p class="note">لا توجد إشعارات</p>' : ''}
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>الإشعارات</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 20px; background: #f8f9fa; }
                    .notification-item { background: white; padding: 12px; margin: 8px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                ${notificationsHTML}
                <button onclick="window.close()" style="margin-top: 20px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer;">إغلاق</button>
            </body>
        </html>
    `);
    
    // تحديث قائمة الإشعارات في النافذة الجديدة
    setTimeout(() => {
        if (w.updateNotifications) {
            w.updateNotifications();
        }
    }, 100);
}

// استدعاء تحديث لوحة المسؤول عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    updateAdminPanel();
    updateNotifications();
    
    // إضافة شارة الإشعارات
    const homeCard = document.getElementById('home');
    const notificationIcon = document.createElement('div');
    notificationIcon.style.position = 'relative';
    notificationIcon.style.display = 'inline-block';
    notificationIcon.style.marginLeft = '10px';
    notificationIcon.innerHTML = `
        <button class="btn" style="background:#e67e22; color:white; padding:10px;" onclick="showNotificationsPanel()">
            🔔
            <span id="notificationBadge" class="notification-badge" style="display:none">0</span>
        </button>
    `;
    homeCard.appendChild(notificationIcon);
});
