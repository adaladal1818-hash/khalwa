// ============================================
// إصلاح كامل لمشكلة دخول الطفل
// ============================================

function enterKholwa() {
    console.log('بدء عملية دخول الطفل...');
    
    // الحصول على القيم من الحقول
    const nameInput = document.getElementById('childName');
    const classSelect = document.getElementById('childClass');
    
    if (!nameInput || !classSelect) {
        alert('❌ عناصر الإدخال غير موجودة');
        return;
    }
    
    const name = nameInput.value.trim();
    const cls = classSelect.value;
    
    console.log('بيانات الدخول:', { name: name, class: cls });
    
    if (!name) {
        alert('❌ الرجاء إدخال الاسم');
        nameInput.focus();
        return;
    }
    
    // حفظ بيانات الطالب في localStorage
    const students = LS.get('students') || {};
    
    // التأكد من وجود الفصل
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
        console.log('تم إضافة طالب جديد:', name, 'في الفصل:', cls);
    } else {
        console.log('الطالب موجود مسبقاً:', name);
    }
    
    // الانتقال إلى شاشة الخلوة
    showKholwaForChild(name, cls);
}

// دالة محسنة لعرض الخلوة للطفل
async function showKholwaForChild(name, cls) {
    console.log('عرض الخلوة للطفل:', name, 'الفصل:', cls);
    
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
        
        console.log('بيانات الخلوة:', kh);
        
        if (!kh) {
            showNoKholwaMessage();
            return;
        }
        
        // التحقق من توقيت الخلوة
        const now = new Date();
        const start = new Date(kh.startISO);
        const end = new Date(kh.endISO);
        const isToday = kh.date === todayDate();
        
        console.log('التحقق من التوقيت:', { now, start, end, isToday });
        
        if (!isToday || now < start || now > end) {
            showKholwaClosedMessage(isToday, now, start, end);
            return;
        }
        
        // عرض محتوى الخلوة
        displayKholwaContentForChild(kh, name, cls);
        
    } catch (error) {
        console.error('خطأ في عرض الخلوة:', error);
        showErrorMessage('حدث خطأ في تحميل الخلوة. حاول مرة أخرى.');
    }
}

// عرض رسالة عدم وجود خلوة
function showNoKholwaMessage() {
    document.getElementById('kholwaContent').innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 4rem; margin-bottom: 20px;">📖</div>
            <h3 style="color: #666; margin-bottom: 15px;">لا توجد خلوة نشطة حالياً</h3>
            <p class="note" style="margin-bottom: 25px;">انتظر حتى ينشر المسؤول الخلوة اليومية</p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 15px 0;">
                <strong>💡 نصيحة:</strong> تأكد من اتصال الإنترنت وأن المسؤول نشر الخلوة
            </div>
            <button onclick="goHome()" class="btn" style="background: #3498db; color: white; padding: 12px 30px; border-radius: 25px;">
                🏠 العودة للرئيسية
            </button>
        </div>
    `;
}

// عرض رسالة الخلوة مغلقة
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

// عرض محتوى الخلوة للطفل
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

// عرض السؤال للطفل
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

// دالة مساعدة للتصحيح
function debugChildEntry() {
    console.log('=== تصحيح دخول الطفل ===');
    console.log('childName element:', document.getElementById('childName'));
    console.log('childClass element:', document.getElementById('childClass'));
    console.log('enterKholwa function:', typeof enterKholwa);
    console.log('showKholwaForChild function:', typeof showKholwaForChild);
    console.log('LS.get students:', LS.get('students'));
    
    // اختبار سريع
    document.getElementById('childName').value = 'طفل تجريبي';
    document.getElementById('childClass').value = '1';
    console.log('جاري اختبار الدخول...');
    enterKholwa();
}
