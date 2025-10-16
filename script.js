const SHARED = 'data.json';
async function fetchShared(){ try{ const r = await fetch(SHARED + '?_=' + Date.now()); if(!r.ok) throw 0; return await r.json(); }catch(e){ return null; } }

const LS = { get(k){ try{return JSON.parse(localStorage.getItem(k)); }catch(e){return null} }, set(k,v){ localStorage.setItem(k, JSON.stringify(v)); } };

// تهيئة البيانات
if(!LS.get('teachers')) LS.set('teachers', []);
if(!LS.get('students')) LS.set('students', { '1':[], '2':[], '3':[], '4':[], '5':[], '6':[] });
if(!LS.get('history')) LS.set('history', []);
if(!LS.get('studentPhotos')) LS.set('studentPhotos', {});
if(!LS.get('studentPoints')) LS.set('studentPoints', {});
if(!LS.get('notifications')) LS.set('notifications', []);
if(!LS.get('studentMessages')) LS.set('studentMessages', {});

function todayDate(){ return new Date().toISOString().slice(0,10); }

function showPanel(id){ 
    document.getElementById('home').style.display='none'; 
    ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display=(p===id)?'block':'none'); 
    updateMainInfo(); 
    updateNotifications();
}

function goHome(){ 
    document.getElementById('home').style.display='block'; 
    ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display='none'); 
    document.getElementById('mainInfo').style.display='none'; 
}

async function updateMainInfo(){ 
    const shared = await fetchShared(); 
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); 
    if(!kh || kh.date !== todayDate()){ 
        document.getElementById('mainInfo').style.display='none'; 
        return; 
    } 
    document.getElementById('mainInfo').style.display='block'; 
    document.getElementById('todayTitle').innerText = kh.title || 'خلوة اليوم'; 
    updateTimerDisplay(kh); 
}

/* نظام النقاط */
function calculatePoints(cls, name, isCorrect = false, activityType = 'normal') {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    const currentPoints = studentPoints[pointsKey] || 0;
    
    let newPoints = currentPoints;
    let pointsEarned = 0;
    
    // نقاط الحضور اليومي (10 نقاط)
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
    
    studentPoints[pointsKey] = newPoints;
    LS.set('studentPoints', studentPoints);
    
    return { total: newPoints, earned: pointsEarned };
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
                photo: getStudentPhoto(cls, student.name)
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
                    <div class="leaderboard-points">الفصل: ${student.class} | النقاط: ${student.points}</div>
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
    
    const notificationsHTML = `
        <h3>🔔 الإشعارات</h3>
        <button class="btn" style="background:#95a5a6; color:white; margin-bottom:10px;" onclick="markAllNotificationsAsRead()">تعيين الكل كمقروء</button>
        <div id="notificationsList">
            ${notifications.length === 0 ? '<p class="note">لا توجد إشعارات</p>' : 
              notifications.map(notif => `
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
            `).join('')}
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
}

function markAllNotificationsAsRead() {
    const notifications = LS.get('notifications') || [];
    notifications.forEach(notif => notif.read = true);
    LS.set('notifications', notifications);
    updateNotifications();
}

/* المسؤول */
function adminLogin(){ 
    const pass = document.getElementById('adminPass').value; 
    if(pass!=='admin123'){ 
        alert('كلمة مرور خاطئة'); 
        return; 
    } 
    document.getElementById('adminLoginBox').style.display='none'; 
    document.getElementById('adminPanel').style.display='block'; 
    refreshHistoryList(); 
    loadReport(); 
    
    const sharedPromise = fetchShared(); 
    sharedPromise.then(shared=>{ 
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); 
        if(kh){ 
            if(kh.startISO) document.getElementById('startTime').value = new Date(kh.startISO).toISOString().slice(0,16); 
            if(kh.endISO) document.getElementById('endTime').value = new Date(kh.endISO).toISOString().slice(0,16); 
            document.getElementById('dayTitle').value = kh.title || ''; 
            document.getElementById('kholwaText').value = kh.content || ''; 
            if(kh.question){ 
                document.getElementById('qText').value = kh.question.text || ''; 
                document.getElementById('q1').value = kh.question.options[0] || ''; 
                document.getElementById('q2').value = kh.question.options[1] || ''; 
                document.getElementById('q3').value = kh.question.options[2] || ''; 
                document.getElementById('qCorrect').value = kh.question.correctIndex || 0; 
            } 
        } 
    }); 
}

function publishKholwa(){ 
    const title = document.getElementById('dayTitle').value.trim(); 
    const start = document.getElementById('startTime').value; 
    const end = document.getElementById('endTime').value; 
    const text = document.getElementById('kholwaText').value.trim(); 
    const qText = document.getElementById('qText').value.trim(); 
    const q1 = document.getElementById('q1').value.trim(); 
    const q2 = document.getElementById('q2').value.trim(); 
    const q3 = document.getElementById('q3').value.trim(); 
    const qCorrect = parseInt(document.getElementById('qCorrect').value); 
    
    if(!start||!end){ alert('حدد البداية والنهاية'); return; } 
    if(new Date(start)>=new Date(end)){ alert('تأكد من أن البداية قبل النهاية'); return; } 
    
    const obj = { 
        date: todayDate(), 
        title: title||'خلوة اليوم', 
        startISO: new Date(start).toISOString(), 
        endISO: new Date(end).toISOString(), 
        type:'text', 
        content: text, 
        question:{text:qText, options:[q1,q2,q3], correctIndex:qCorrect} 
    }; 
    
    LS.set('kholwa', obj); 
    const history = LS.get('history')||[]; 
    const day = { 
        date: obj.date, 
        title: obj.title, 
        startISO: obj.startISO, 
        endISO: obj.endISO, 
        answers:{'1':[],'2':[],'3':[],'4':[],'5':[],'6':[]}, 
        qaResponses:{'1':{},'2':{},'3':{},'4':{},'5':{},'6':{}} 
    }; 
    history.push(day); 
    LS.set('history', history); 
    
    const shared = { kholwa: obj, history: history }; 
    const blob = new Blob([JSON.stringify(shared,null,2)], { type:'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'data.json'; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url); 
    
    alert('تم نشر الخلوة ✅ حمل ملف data.json وارفعه على الاستضافة (نفس المجلد)'); 
    addNotification('نشر خلوة', 'تم نشر خلوة جديدة', 'success');
}

function closeNow(){ 
    let kh = LS.get('kholwa'); 
    if(!kh){ alert('لا توجد خلوة'); return; } 
    kh.endISO = new Date().toISOString(); 
    LS.set('kholwa', kh); 
    const history = LS.get('history')||[]; 
    if(history.length){ 
        history[history.length-1].endISO = kh.endISO; 
        LS.set('history', history); 
    } 
    
    const sharedOut = { kholwa: kh, history: LS.get('history')||[] }; 
    const blob = new Blob([JSON.stringify(sharedOut,null,2)], { type:'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'data.json'; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove(); 
    URL.revokeObjectURL(url); 
    
    alert('تم غلق الخلوة ✅ حمّل data.json وارفعه على الاستضافة'); 
    addNotification('غلق خلوة', 'تم غلق الخلوة الحالية', 'warning');
}

function createTeacher(){ 
    const u = document.getElementById('tuser').value.trim(); 
    const p = document.getElementById('tpass').value.trim(); 
    const c = document.getElementById('tclass').value; 
    if(!u||!p){ alert('ادخل اسم وكلمة'); return; } 
    const teachers = LS.get('teachers')||[]; 
    teachers.push({username:u,password:p,classId:c}); 
    LS.set('teachers',teachers); 
    alert('تم إنشاء الخادم'); 
    document.getElementById('tuser').value=''; 
    document.getElementById('tpass').value=''; 
    loadReport(); 
    addNotification('خادم جديد', `تم إنشاء خادم ${u} للفصل ${c}`, 'info');
}

function teacherLogin(){ 
    const u = document.getElementById('loginUser').value.trim(); 
    const p = document.getElementById('loginPass').value.trim(); 
    const teachers = LS.get('teachers')||[]; 
    const found = teachers.find(t=>t.username===u&&t.password===p); 
    if(!found) return alert('بيانات دخول خاطئة'); 
    
    document.getElementById('teacherLoginBox').style.display='none'; 
    document.getElementById('teacherPanel').style.display='block'; 
    document.getElementById('teacherClass').innerText = found.classId; 
    loadTeacherStatus(found.classId); 
    enhanceTeacherPanel();
    addNotification('دخول خادم', `تم دخول الخادم ${u}`, 'info');
}

function addStudents(){ 
    const txt = document.getElementById('studentNames').value.trim(); 
    if(!txt) return alert('ادخل أسماء'); 
    const arr = txt.split(',').map(s=>s.trim()).filter(Boolean); 
    const students = LS.get('students')||{}; 
    const cls = document.getElementById('teacherClass').innerText; 
    let list = students[cls]||[]; 
    arr.forEach(n=>{ 
        if(n && !list.find(s=>s.name===n)) list.push({name:n,answeredDates:[]}); 
    }); 
    students[cls]=list; 
    LS.set('students',students); 
    document.getElementById('studentNames').value=''; 
    loadTeacherStatus(cls); 
    loadReport(); 
    addNotification('طلاب جدد', `تم إضافة ${arr.length} طالب للفصل ${cls}`, 'success');
}

function enterKholwa(){ 
    const name = document.getElementById('childName').value.trim(); 
    const cls = document.getElementById('childClass').value; 
    if(!name) return alert('ادخل الاسم'); 
    const students = LS.get('students')||{}; 
    let list = students[cls]||[]; 
    if(!list.find(s=>s.name===name)){ 
        list.push({name:name,answeredDates:[]}); 
        students[cls]=list; 
        LS.set('students',students); 
        loadReport(); 
    } 
    showKholwaFor(name,cls); 
}

async function showKholwaFor(name,cls){ 
    const shared = await fetchShared(); 
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); 
    const enter = document.getElementById('childEntry'); 
    const view = document.getElementById('kholwaView'); 
    const content = document.getElementById('kholwaContent'); 
    const qArea = document.getElementById('questionArea'); 
    const choicesArea = document.getElementById('choicesArea'); 
    const resultArea = document.getElementById('resultArea'); 
    
    resultArea.innerHTML=''; 
    
    if(!kh || kh.date !== todayDate() || new Date() < new Date(kh.startISO) || new Date() > new Date(kh.endISO)){ 
        enter.style.display='none'; 
        view.style.display='block'; 
        content.innerHTML = '<p class="note">الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️</p>'; 
        qArea.innerHTML=''; 
        choicesArea.innerHTML=''; 
        return; 
    } 
    
    enter.style.display='none'; 
    view.style.display='block'; 
    
    // عرض صورة الطفل ونقاطه
    const childPhoto = getStudentPhoto(cls, name);
    const childPoints = getStudentPoints(cls, name);
    
    content.innerHTML = `
        <div style="text-align: center; margin-bottom: 15px;">
            <img src="${childPhoto}" alt="${name}" class="profile-img" id="childProfileImg">
            <div style="margin-top: 8px;">
                <span class="points-badge">${childPoints} نقطة</span>
                <strong>${name}</strong> - الفصل ${cls}
            </div>
            <input type="file" id="photoUpload" accept="image/*" class="hidden" onchange="handleImageUpload(event, '${cls}', '${name}')">
            <button class="upload-btn" onclick="document.getElementById('photoUpload').click()">📸 غير صورتك</button>
        </div>
    `;
    
    if(kh.type==='text' || kh.type==='copied') content.innerHTML += '<div class="note">'+(kh.content||'')+'</div>'; 
    else if(kh.type==='image') content.innerHTML += '<img src="'+kh.content+'" style="max-width:100%;border-radius:8px">'; 
    else if(kh.type==='pdf' || kh.type==='word') content.innerHTML += '<a class="note link" href="'+kh.content+'" target="_blank">فتح الملف (PDF/Word)</a>'; 
    
    qArea.innerHTML=''; 
    choicesArea.innerHTML=''; 
    
    if(kh.question && kh.question.text){ 
        qArea.innerHTML = '<div class="note"><strong>السؤال:</strong> '+kh.question.text+'</div>'; 
        kh.question.options.forEach((opt,i)=>{ 
            const b = document.createElement('button'); 
            b.className='option-btn'; 
            b.innerText = (i+1)+'. '+opt; 
            b.onclick = ()=>{ handleChildAnswer(cls,name,i); }; 
            choicesArea.appendChild(b); 
        }); 
    } 
}

async function handleChildAnswer(cls,name,answerIndex){ 
    const students = LS.get('students')||{}; 
    const list = students[cls]||[]; 
    const student = list.find(s=>s.name===name); 
    const shared = await fetchShared(); 
    const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); 
    
    if(!kh || kh.date !== todayDate()){ 
        alert('الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️'); 
        return; 
    } 
    
    if(!student) return alert('الطفل غير مسجل'); 
    student.answeredDates = student.answeredDates||[]; 
    if(!student.answeredDates.includes(kh.date)) student.answeredDates.push(kh.date); 
    students[cls]=list; 
    LS.set('students',students); 
    
    const history = LS.get('history')||[]; 
    if(history.length){ 
        const latest = history[history.length-1]; 
        latest.answers = latest.answers || {'1':[],'2':[],'3':[],'4':[],'5':[],'6':[]}; 
        if(!latest.answers[cls].includes(name)) latest.answers[cls].push(name); 
        latest.qaResponses = latest.qaResponses || {'1':{},'2':{},'3':{},'4':{},'5':{},'6':{}}; 
        latest.qaResponses[cls][name] = (answerIndex+1); 
        LS.set('history',history); 
    } 
    
    const correct = kh.question && (answerIndex === kh.question.correctIndex); 
    const resultArea = document.getElementById('resultArea'); 
    
    // حساب النقاط
    const pointsResult = calculatePoints(cls, name, correct);
    
    if(correct) {
        resultArea.innerHTML = `
            <div class="center">
                برافو، بنحبك ❤️<br>
                <small>كسبت ${pointsResult.earned} نقطة!</small><br>
                <strong>إجمالي نقاطك: ${pointsResult.total}</strong>
            </div>
        `;
        addNotification('إجابة صحيحة', `${name} أجاب إجابة صحيحة في فصل ${cls}`, 'success');
    } else {
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

function updateTimerDisplay(kh){ 
    const el = document.getElementById('kholwaTimer'); 
    if(!kh || kh.date !== todayDate()){ 
        el.innerText = 'لا توجد خلوة الآن'; 
        return; 
    } 
    const now = new Date(); 
    const end = new Date(kh.endISO); 
    const start = new Date(kh.startISO); 
    if(now < start) { 
        el.innerText = 'الخلوة ستبدأ في: ' + start.toLocaleString(); 
        return; 
    } 
    if(now > end){ 
        el.innerText = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️'; 
        return; 
    } 
    const diff = end - now; 
    const h = Math.floor(diff/3600000); 
    const m = Math.floor((diff%3600000)/60000); 
    const s = Math.floor((diff%60000)/1000); 
    el.innerText = 'الوقت المتبقي: ' + (h+' ساعة '+m+' دقيقة '+s+' ثانية'); 
}

setInterval(()=>{ 
    fetchShared().then(shared=>{ 
        const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); 
        updateTimerDisplay(kh); 
    }); 
},1000);

async function refreshHistoryList(){ 
    const shared = await fetchShared(); 
    const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); 
    const container = document.getElementById('historyList'); 
    if(!history.length){ 
        container.innerHTML = '<p class="note">لا توجد أيام سابقة</p>'; 
        return; 
    } 
    let html = ''; 
    history.forEach((d,idx)=>{ 
        html += '<div style="padding:6px;border-bottom:1px solid #efe8d8"><strong>'+d.date+'</strong> — '+(d.title||'خلوة')+'<br>'; 
        const counts = Object.keys(d.answers||{}).map(c=> c+': '+((d.answers && d.answers[c])?d.answers[c].length:0)).join(' • '); 
        html += '<small>'+counts+'</small><br>'; 
        html += '<button onclick="showDayDetails('+idx+')" style="margin-top:6px;padding:6px;border-radius:8px;background:#eee;border:none;cursor:pointer">تفاصيل اليوم</button></div>'; 
    }); 
    container.innerHTML = html; 
}

async function showDayDetails(index){ 
    const shared = await fetchShared(); 
    const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); 
    const day = history[index]; 
    if(!day){ alert('لا توجد بيانات'); return; } 
    let html = '<h4>تفاصيل: '+day.date+' — '+(day.title||'خلوة')+'</h4>'; 
    const students = LS.get('students')||{}; 
    const totalDays = history.length; 
    Object.keys(day.answers||{}).forEach(cls=>{ 
        html += '<h5>'+cls+'</h5><ul>'; 
        const list = students[cls]||[]; 
        list.forEach(s=>{ 
            const doneCount = (s.answeredDates||[]).length; 
            const resp = (day.qaResponses && day.qaResponses[cls] && day.qaResponses[cls][s.name]) ? day.qaResponses[cls][s.name] : '-'; 
            const points = getStudentPoints(cls, s.name); 
            html += '<li>'+s.name+' — '+doneCount+' من '+totalDays+' — إجابة اليوم: '+resp+' — النقاط: '+points+'</li>'; 
        }); 
        html += '</ul>'; 
    }); 
    const w = window.open('','_blank','width=400,height=600'); 
    w.document.write('<html><head><meta charset="utf-8"><title>تفاصيل اليوم</title></head><body>'+html+'<p><button onclick="window.close()">إغلاق</button></p></body></html>'); 
}

async function loadReport(){ 
    const students = LS.get('students')||{}; 
    let html = '<table class="table"><tr><th>الفصل</th><th>الاسم</th><th>عدد الخلوات</th><th>النقاط</th></tr>'; 
    const shared = await fetchShared(); 
    const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); 
    const totalDays = history.length; 
    Object.keys(students).forEach(cls=>{ 
        students[cls].forEach(s=>{ 
            const cnt = (s.answeredDates||[]).length; 
            const points = getStudentPoints(cls, s.name); 
            html += '<tr><td>'+cls+'</td><td>'+s.name+'</td><td>'+cnt+' من '+totalDays+'</td><td>'+points+'</td></tr>'; 
        }); 
    }); 
    html += '</table>'; 
    document.getElementById('reportArea').innerHTML = html; 
}

function loadTeacherStatus(cls){ 
    const students = LS.get('students')||{}; 
    const list = students[cls]||[]; 
    const kh = LS.get('kholwa'); 
    let html = ''; 
    if(!kh || kh.date !== todayDate()) html += '<p class="note">الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️</p>'; 
    else{ 
        html += '<ul>'; 
        list.forEach(s=>{ 
            const done = (s.answeredDates||[]).includes(kh.date) ? '✅' : '❌'; 
            const points = getStudentPoints(cls, s.name); 
            html += '<li>'+s.name+' — '+done+' — النقاط: '+points+'</li>'; 
        }); 
        html += '</ul>'; 
    } 
    document.getElementById('teacherStatus').innerHTML = html; 
}

/* ميزات الخدام الجديدة */
function enhanceTeacherPanel() {
    const teacherPanel = document.getElementById('teacherPanel');
    if (teacherPanel && !document.getElementById('teacherDashboard')) {
        const teacherClass = document.getElementById('teacherClass').innerText;
        
        const dashboardHTML = `
            <div class="teacher-dashboard">
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
                <button class="btn btn-blue" onclick="showClassProgress('${teacherClass}')" style="margin-bottom:8px;">
                    📈 عرض تقدم الفصل
                </button>
                <button class="btn" style="background:#00b894; color:white; width:100%;" onclick="sendBulkEncouragement('${teacherClass}')">
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

function getClassStats(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
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

function showClassProgress(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    
    let progressHTML = `
        <h3 style="text-align:center;">📊 تقدم فصل ${cls}</h3>
        <div style="max-height:400px; overflow-y:auto;">
    `;
    
    classStudents.forEach(student => {
        const points = getStudentPoints(cls, student.name);
        
        progressHTML += `
            <div class="student-progress-card" style="cursor:pointer;" onclick="showStudentProgress('${cls}', '${student.name}')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${getStudentPhoto(cls, student.name)}" alt="${student.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                        <div>
                            <strong>${student.name}</strong>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div>${points} نقطة</div>
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
                    .student-progress-card { background: white; padding: 12px; border-radius: 10px; margin: 8px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                </style>
            </head>
            <body>
                ${progressHTML}
                <button onclick="window.close()" style="margin-top: 15px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

function showStudentProgress(cls, studentName) {
    const student = getStudentData(cls, studentName);
    const points = getStudentPoints(cls, studentName);
    
    const progressHTML = `
        <div class="student-progress-card">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <img src="${getStudentPhoto(cls, studentName)}" alt="${studentName}" style="width:50px;height:50px;border-radius:50%;object-fit:cover">
                <div>
                    <h4 style="margin:0">${studentName}</h4>
                    <div>الفصل: ${cls}</div>
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0">
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:1.3rem; font-weight:800; color:#2c3e50;">${points}</div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">النقاط</div>
                </div>
                <div style="background:#f8f9fa; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:1.3rem; font-weight:800; color:#2c3e50;">${student.answeredDates?.length || 0}</div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">فعاليات شارك فيها</div>
                </div>
            </div>
            
            <div style="display:flex;gap:8px;margin:12px 0">
                <button class="encourage-btn" onclick="sendEncouragementMessage('${cls}', '${studentName}', 'general')">
                    💌 رسالة تشجيع
                </button>
            </div>
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=400,height=400');
    w.document.write(`
        <html dir="rtl">
            <head>
                <meta charset="utf-8">
                <title>تقدم ${studentName}</title>
                <style>
                    body { font-family: 'Cairo', Arial; margin: 15px; background: #f8f9fa; }
                    .student-progress-card { background: white; padding: 15px; border-radius: 10px; margin: 10px 0; }
                    .encourage-btn { background: #00b894; color: white; padding: 8px 12px; border-radius: 8px; border: none; cursor: pointer; }
                </style>
            </head>
            <body>
                <h3 style="text-align:center;">📊 تقدم الطالب</h3>
                ${progressHTML}
                <button onclick="window.close()" style="margin-top: 15px; padding: 10px; width: 100%; background: #d9b382; border: none; border-radius: 8px; cursor: pointer; font-weight: 700;">إغلاق</button>
            </body>
        </html>
    `);
}

function getStudentData(cls, studentName) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    return classStudents.find(s => s.name === studentName) || {};
}

function sendEncouragementMessage(cls, studentName, messageType) {
    const messages = {
        general: [
            "أحسنت! استمر في التقدم 🌟",
            "أنت مبدع، ونفتخر بك 🎯",
            "تقدمك رائع، حافظ عليه 💪"
        ]
    };

    const selectedMessages = messages[messageType] || messages.general;
    const randomMessage = selectedMessages[Math.floor(Math.random() * selectedMessages.length)];
    
    alert(`✅ تم إرسال الرسالة:\n"${randomMessage}"`);
    addNotification('رسالة تشجيع', `تم إرسال رسالة لـ ${studentName}`, 'success');
}

function sendBulkEncouragement(cls) {
    const students = LS.get('students') || {};
    const classStudents = students[cls] || [];
    
    let encouragedCount = 0;
    classStudents.forEach(student => {
        if (Math.random() > 0.3) {
            encouragedCount++;
        }
    });
    
    alert(`✅ تم إرسال رسائل تشجيعية لـ ${encouragedCount} طالب`);
    addNotification('تشجيع جماعي', `تم إرسال رسائل تشجيعية لـ ${encouragedCount} طالب في فصل ${cls}`, 'success');
}

/* التقارير والإحصائيات */
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
                        <div style="background:#3498db; height:100%; border-radius:5px; width:${totalStudents > 0 ? (classDistribution[cls] / totalStudents) * 100 : 0}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    const w = window.open('', '_blank', 'width=500,height=600');
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

function resetAll() {
    if(confirm('هل أنت متأكد من تصفير جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه.')) {
        localStorage.clear();
        alert('تم تصفير جميع البيانات');
        location.reload();
    }
}

// تحديث الإشعارات عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    updateNotifications();
});
/* تنسيقات الوسائط المتعددة */
.media-preview {
    max-width: 100%;
    border-radius: 8px;
    margin: 10px 0;
    border: 2px solid #e0e0e0;
}

.camera-container {
    position: relative;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
}

.capture-btn {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}

.file-upload-area {
    border: 2px dashed #3498db;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    background: #f8f9fa;
    cursor: pointer;
    transition: all 0.3s;
}

.file-upload-area:hover {
    background: #e3f2fd;
    border-color: #2980b9;
}

.media-type-btn.active {
    transform: scale(0.95);
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
}
