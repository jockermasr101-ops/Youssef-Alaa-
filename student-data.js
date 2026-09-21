window.addEventListener('youssef-auth-ready',async(e)=>{
  const P=window.YoussefAlaaPlatform, u=e.detail?.appUser; if(!P||!u||u.role!=='student')return;
  const host=document.querySelector('#student-dynamic-panel') || (()=>{const x=document.createElement('section');x.id='student-dynamic-panel';x.className='platform-panel';document.querySelector('main')?.prepend(x);return x})();
  const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));const fmt=n=>new Intl.NumberFormat('ar-EG').format(Number(n||0));
  try{
    const [coursesSnap,enSnap,attemptSnap,notifSnap]=await Promise.all([
      P.getDocs(P.query(P.collection(P.db,'courses'),P.limit(100))),
      P.getDocs(P.query(P.collection(P.db,'enrollments'),P.where('studentUid','==',P.auth.currentUser.uid))),
      P.getDocs(P.query(P.collection(P.db,'examAttempts'),P.where('studentUid','==',P.auth.currentUser.uid))),
      P.getDocs(P.query(P.collection(P.db,'notifications'),P.where('userId','==',P.auth.currentUser.uid),P.limit(20)))
    ]);
    const enrolled=new Map(enSnap.docs.map(d=>[d.data().courseId,d.data()]));
    const courses=coursesSnap.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.published===true && enrolled.has(c.id));
    host.innerHTML=`<div class="platform-grid platform-grid-4"><div class="platform-stat"><small>كورساتي</small><strong>${fmt(courses.length)}</strong></div><div class="platform-stat"><small>نقاط XP</small><strong>${fmt(u.points)}</strong></div><div class="platform-stat"><small>المحاولات</small><strong>${fmt(attemptSnap.size)}</strong></div><div class="platform-stat"><small>الإشعارات</small><strong>${fmt(notifSnap.docs.filter(d=>!d.data().read).length)}</strong></div></div><div style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2>كورساتي الحالية</h2><a href="/activation.html" class="platform-btn">تفعيل كود</a></div><div class="platform-grid platform-grid-3" id="student-courses-grid">${courses.map(c=>`<article class="platform-panel"><span class="platform-badge success">متاح</span><h3>${esc(c.title)}</h3><p style="color:#5b6072">${esc(c.description||'')}</p><div class="platform-actions"><a class="platform-btn primary" href="${c.firstLessonId?`/lesson.html?lessonId=${encodeURIComponent(c.firstLessonId)}`:`/payment.html?courseId=${encodeURIComponent(c.id)}` }">${c.firstLessonId?'فتح أول درس':'فتح تفاصيل الكورس'}</a></div></article>`).join('')||'<div class="platform-empty">لا توجد كورسات مفعلة حاليًا. يمكنك تفعيل كود من الإدارة أو إكمال عملية الشراء.</div>'}</div></div>`;
  }catch(err){host.innerHTML=`<div class="platform-empty">تعذر تحميل بيانات الطالب: ${esc(err.message)}</div>`}
});
