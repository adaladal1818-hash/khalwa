const SHARED = 'data.json';
async function fetchShared(){ try{ const r = await fetch(SHARED + '?_=' + Date.now()); if(!r.ok) throw 0; return await r.json(); }catch(e){ return null; } }

const LS = { get(k){ try{return JSON.parse(localStorage.getItem(k)); }catch(e){return null} }, set(k,v){ localStorage.setItem(k, JSON.stringify(v)); } };
if(!LS.get('teachers')) LS.set('teachers', []);
if(!LS.get('students')) LS.set('students', { '1':[], '2':[], '3':[], '4':[], '5':[], '6':[] });
if(!LS.get('history')) LS.set('history', []);
if(!LS.get('studentPhotos')) LS.set('studentPhotos', {}); // تخزين الصور
if(!LS.get('studentPoints')) LS.set('studentPoints', {}); // تخزين النقاط

function todayDate(){ return new Date().toISOString().slice(0,10); }
function showPanel(id){ document.getElementById('home').style.display='none'; ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display=(p===id)?'block':'none'); updateMainInfo(); }
function goHome(){ document.getElementById('home').style.display='block'; ['admin','teacher','child'].forEach(p=>document.getElementById(p).style.display='none'); document.getElementById('mainInfo').style.display='none'; }

async function updateMainInfo(){ const shared = await fetchShared(); const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); if(!kh || kh.date !== todayDate()){ document.getElementById('mainInfo').style.display='none'; return; } document.getElementById('mainInfo').style.display='block'; document.getElementById('todayTitle').innerText = kh.title || 'خلوة اليوم'; updateTimerDisplay(kh); }

/* نظام النقاط */
function calculatePoints(cls, name, isCorrect = false) {
    const pointsKey = `${cls}_${name}`;
    const studentPoints = LS.get('studentPoints') || {};
    const currentPoints = studentPoints[pointsKey] || 0;
    
    let newPoints = currentPoints;
    
    // نقاط الحضور اليومي (10 نقاط)
    if (!studentPoints.lastAttendance || studentPoints.lastAttendance !== todayDate()) {
        newPoints += 10;
    }
    
    // نقاط الإجابة الصحيحة (20 نقطة)
    if (isCorrect) {
        newPoints += 20;
    }
    
    // مكافأة المتابعة (15 نقطة لكل 3 أيام متتالية)
    const streak = calculateStreak(cls, name);
    if (streak >= 3) {
        newPoints += 15;
    }
    
    studentPoints[pointsKey] = newPoints;
    studentPoints.lastAttendance = todayDate();
    LS.set('studentPoints', studentPoints);
    
    return newPoints;
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
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const studentPhotos = LS.get('studentPhotos') || {};
        studentPhotos[`${cls}_${name}`] = e.target.result;
        LS.set('studentPhotos', studentPhotos);
        
        // تحديث الصورة المعروضة
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
    return studentPhotos[`${cls}_${name}`] || 'https://via.placeholder.com/60/fffaf2/d9b382?text=صورة';
}

/* لوحة المتصدرين */
function showLeaderboard() {
    const students = LS.get('students') || {};
    const studentPoints = LS.get('studentPoints') || {};
    
    let allStudents = [];
    
    // جمع جميع الطلاب ونقاطهم
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
    
    // ترتيب حسب النقاط
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

/* Admin functions */
function adminLogin(){ const pass = document.getElementById('adminPass').value; if(pass!=='admin123'){ alert('كلمة مرور خاطئة'); return; } document.getElementById('adminLoginBox').style.display='none'; document.getElementById('adminPanel').style.display='block'; refreshHistoryList(); loadReport(); const sharedPromise = fetchShared(); sharedPromise.then(shared=>{ const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); if(kh){ if(kh.startISO) document.getElementById('startTime').value = new Date(kh.startISO).toISOString().slice(0,16); if(kh.endISO) document.getElementById('endTime').value = new Date(kh.endISO).toISOString().slice(0,16); document.getElementById('dayTitle').value = kh.title || ''; document.getElementById('kholwaText').value = kh.content || ''; if(kh.question){ document.getElementById('qText').value = kh.question.text || ''; document.getElementById('q1').value = kh.question.options[0] || ''; document.getElementById('q2').value = kh.question.options[1] || ''; document.getElementById('q3').value = kh.question.options[2] || ''; document.getElementById('qCorrect').value = kh.question.correctIndex || 0; } } }); }

function publishKholwa(){ const title = document.getElementById('dayTitle').value.trim(); const start = document.getElementById('startTime').value; const end = document.getElementById('endTime').value; const text = document.getElementById('kholwaText').value.trim(); const qText = document.getElementById('qText').value.trim(); const q1 = document.getElementById('q1').value.trim(); const q2 = document.getElementById('q2').value.trim(); const q3 = document.getElementById('q3').value.trim(); const qCorrect = parseInt(document.getElementById('qCorrect').value); if(!start||!end){ alert('حدد البداية والنهاية'); return; } if(new Date(start)>=new Date(end)){ alert('تأكد من أن البداية قبل النهاية'); return; } const obj = { date: todayDate(), title: title||'خلوة اليوم', startISO: new Date(start).toISOString(), endISO: new Date(end).toISOString(), type:'text', content: text, question:{text:qText, options:[q1,q2,q3], correctIndex:qCorrect} }; LS.set('kholwa', obj); const history = LS.get('history')||[]; const day = { date: obj.date, title: obj.title, startISO: obj.startISO, endISO: obj.endISO, answers:{'1':[],'2':[],'3':[],'4':[],'5':[],'6':[]}, qaResponses:{'1':{},'2':{},'3':{},'4':{},'5':{},'6':{}} }; history.push(day); LS.set('history', history); const shared = { kholwa: obj, history: history }; const blob = new Blob([JSON.stringify(shared,null,2)], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); alert('تم نشر الخلوة ✅ حمل ملف data.json وارفعه على الاستضافة (نفس المجلد)'); }

function closeNow(){ let kh = LS.get('kholwa'); if(!kh){ alert('لا توجد خلوة'); return; } kh.endISO = new Date().toISOString(); LS.set('kholwa', kh); const history = LS.get('history')||[]; if(history.length){ history[history.length-1].endISO = kh.endISO; LS.set('history', history); } const sharedOut = { kholwa: kh, history: LS.get('history')||[] }; const blob = new Blob([JSON.stringify(sharedOut,null,2)], { type:'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'data.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); alert('تم غلق الخلوة ✅ حمّل data.json وارفعه على الاستضافة'); }

function createTeacher(){ const u = document.getElementById('tuser').value.trim(); const p = document.getElementById('tpass').value.trim(); const c = document.getElementById('tclass').value; if(!u||!p){ alert('ادخل اسم وكلمة'); return; } const teachers = LS.get('teachers')||[]; teachers.push({username:u,password:p,classId:c}); LS.set('teachers',teachers); alert('تم إنشاء الخادم'); document.getElementById('tuser').value=''; document.getElementById('tpass').value=''; loadReport(); }

function teacherLogin(){ const u = document.getElementById('loginUser').value.trim(); const p = document.getElementById('loginPass').value.trim(); const teachers = LS.get('teachers')||[]; const found = teachers.find(t=>t.username===u&&t.password===p); if(!found) return alert('بيانات دخول خاطئة'); document.getElementById('teacherLoginBox').style.display='none'; document.getElementById('teacherPanel').style.display='block'; document.getElementById('teacherClass').innerText = found.classId; loadTeacherStatus(found.classId); }

function addStudents(){ const txt = document.getElementById('studentNames').value.trim(); if(!txt) return alert('ادخل أسماء'); const arr = txt.split(',').map(s=>s.trim()).filter(Boolean); const students = LS.get('students')||{}; const cls = document.getElementById('teacherClass').innerText; let list = students[cls]||[]; arr.forEach(n=>{ if(n && !list.find(s=>s.name===n)) list.push({name:n,answeredDates:[]}); }); students[cls]=list; LS.set('students',students); document.getElementById('studentNames').value=''; loadTeacherStatus(cls); loadReport(); }

function enterKholwa(){ const name = document.getElementById('childName').value.trim(); const cls = document.getElementById('childClass').value; if(!name) return alert('ادخل الاسم'); const students = LS.get('students')||{}; let list = students[cls]||[]; if(!list.find(s=>s.name===name)){ list.push({name:name,answeredDates:[]}); students[cls]=list; LS.set('students',students); loadReport(); } showKholwaFor(name,cls); }

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
    const newPoints = calculatePoints(cls, name, correct);
    
    if(correct) {
        resultArea.innerHTML = `
            <div class="center">
                برافو، بنحبك ❤️<br>
                <small>كسبت 20 نقطة للإجابة الصحيحة! 🎉</small><br>
                <strong>إجمالي نقاطك: ${newPoints}</strong>
            </div>
        `;
    } else {
        resultArea.innerHTML = `
            <div class="center">
                بنحبك، حاول مرة تاني 💪<br>
                <small>كسبت 10 نقاط للحضور اليومي</small><br>
                <strong>إجمالي نقاطك: ${newPoints}</strong>
            </div>
        `;
    }
    
    loadTeacherStatus(cls); 
    loadReport(); 
    refreshHistoryList(); 
}

function updateTimerDisplay(kh){ const el = document.getElementById('kholwaTimer'); if(!kh || kh.date !== todayDate()){ el.innerText = 'لا توجد خلوة الآن'; return; } const now = new Date(); const end = new Date(kh.endISO); const start = new Date(kh.startISO); if(now < start) { el.innerText = 'الخلوة ستبدأ في: ' + start.toLocaleString(); return; } if(now > end){ el.innerText = 'الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️'; return; } const diff = end - now; const h = Math.floor(diff/3600000); const m = Math.floor((diff%3600000)/60000); const s = Math.floor((diff%60000)/1000); el.innerText = 'الوقت المتبقي على غلق الخلوة: ' + (h+' ساعة '+m+' دقيقة '+s+' ثانية'); }

setInterval(()=>{ fetchShared().then(shared=>{ const kh = (shared && shared.kholwa) ? shared.kholwa : LS.get('kholwa'); updateTimerDisplay(kh); }); },1000);

async function refreshHistoryList(){ const shared = await fetchShared(); const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); const container = document.getElementById('historyList'); if(!history.length){ container.innerHTML = '<p class="note">لا توجد أيام سابقة</p>'; return; } let html = ''; history.forEach((d,idx)=>{ html += '<div style="padding:6px;border-bottom:1px solid #efe8d8"><strong>'+d.date+'</strong> — '+(d.title||'خلوة')+'<br>'; const counts = Object.keys(d.answers||{}).map(c=> c+': '+((d.answers && d.answers[c])?d.answers[c].length:0)).join(' • '); html += '<small>'+counts+'</small><br>'; html += '<button onclick="showDayDetails('+idx+')" style="margin-top:6px;padding:6px;border-radius:8px;background:#eee;border:none;cursor:pointer">تفاصيل اليوم</button></div>'; }); container.innerHTML = html; }

async function showDayDetails(index){ const shared = await fetchShared(); const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); const day = history[index]; if(!day){ alert('لا توجد بيانات'); return; } let html = '<h4>تفاصيل: '+day.date+' — '+(day.title||'خلوة')+'</h4>'; const students = LS.get('students')||{}; const totalDays = history.length; Object.keys(day.answers||{}).forEach(cls=>{ html += '<h5>'+cls+'</h5><ul>'; const list = students[cls]||[]; list.forEach(s=>{ const doneCount = (s.answeredDates||[]).length; const resp = (day.qaResponses && day.qaResponses[cls] && day.qaResponses[cls][s.name]) ? day.qaResponses[cls][s.name] : '-'; const points = getStudentPoints(cls, s.name); html += '<li>'+s.name+' — '+doneCount+' من '+totalDays+' — إجابة اليوم: '+resp+' — النقاط: '+points+'</li>'; }); html += '</ul>'; }); const w = window.open('','_blank','width=400,height=600'); w.document.write('<html><head><meta charset="utf-8"><title>تفاصيل اليوم</title></head><body>'+html+'<p><button onclick="window.close()">إغلاق</button></p></body></html>'); }

async function loadReport(){ const students = LS.get('students')||{}; let html = '<table class="table"><tr><th>الفصل</th><th>الاسم</th><th>عدد الخلوات</th><th>النقاط</th></tr>'; const shared = await fetchShared(); const history = (shared && shared.history) ? shared.history : (LS.get('history')||[]); const totalDays = history.length; Object.keys(students).forEach(cls=>{ students[cls].forEach(s=>{ const cnt = (s.answeredDates||[]).length; const points = getStudentPoints(cls, s.name); html += '<tr><td>'+cls+'</td><td>'+s.name+'</td><td>'+cnt+' من '+totalDays+'</td><td>'+points+'</td></tr>'; }); }); html += '</table>'; document.getElementById('reportArea').innerHTML = html; }

function loadTeacherStatus(cls){ const students = LS.get('students')||{}; const list = students[cls]||[]; const kh = LS.get('kholwa'); let html = ''; if(!kh || kh.date !== todayDate()) html += '<p class="note">الخلوة مغلقة لهذا اليوم، أشوفك بكرة ❤️</p>'; else{ html += '<ul>'; list.forEach(s=>{ const done = (s.answeredDates||[]).includes(kh.date) ? '✅' : '❌'; const points = getStudentPoints(cls, s.name); html += '<li>'+s.name+' — '+done+' — النقاط: '+points+'</li>'; }); html += '</ul>'; } document.getElementById('teacherStatus').innerHTML = html; }

// إضافة زر لوحة المتصدرين في الصفحة الرئيسية
document.addEventListener('DOMContentLoaded', function() {
    const homeCard = document.getElementById('home');
    const leaderboardBtn = document.createElement('button');
    leaderboardBtn.className = 'btn';
    leaderboardBtn.style.background = '#ffd700';
    leaderboardBtn.style.color = '#000';
    leaderboardBtn.innerHTML = '🏆 لوحة المتصدرين';
    leaderboardBtn.onclick = showLeaderboard;
    homeCard.appendChild(leaderboardBtn);
});
