window.addEventListener('youssef-auth-ready',async(e)=>{
  const P=window.YoussefAlaaPlatform,u=e.detail?.appUser;
  if(!P||!u||u.role!=='student')return;
  const host=document.querySelector('#student-dynamic-panel')||(()=>{const x=document.createElement('section');x.id='student-dynamic-panel';x.className='platform-panel';document.querySelector('main')?.append(x);return x})();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>new Intl.NumberFormat('ar-EG').format(Number(n||0));
  try{
    const [enSnap,attemptSnap,notifSnap]=await Promise.all([
      P.getDocs(P.query(P.collection(P.db,'enrollments'),P.where('studentUid','==',u.uid),P.limit(100))),
      P.getDocs(P.query(P.collection(P.db,'examAttempts'),P.where('studentUid','==',u.uid),P.limit(200))),
      P.getDocs(P.query(P.collection(P.db,'notifications'),P.where('userId','==',u.uid),P.limit(50)))
    ]);
    const enrolled=[...new Map(enSnap.docs.map(d=>[d.data().courseId,{id:d.data().courseId,...d.data()}])).values()].filter(x=>x.active!==false);
    const courseRows=[];
    for(const item of enrolled.slice(0,50)){
      if(!item.id)continue;
      const s=await P.getDoc(P.doc(P.db,'courses',item.id));
      if(s.exists()&&s.data().published===true)courseRows.push({id:s.id,...s.data()});
    }
    const attempts=attemptSnap.docs.map(d=>({id:d.id,...d.data()}));
    const unread=notifSnap.docs.filter(d=>d.data().read!==true).length;
    host.innerHTML='<div class="platform-grid platform-grid-4">'+
      '<div class="platform-stat"><small>الكورسات المفعلة</small><strong>'+fmt(courseRows.length)+'</strong></div>'+
      '<div class="platform-stat"><small>نقاط XP</small><strong>'+fmt(u.points)+'</strong></div>'+
      '<div class="platform-stat"><small>المحاولات</small><strong>'+fmt(attempts.length)+'</strong></div>'+
      '<div class="platform-stat"><small>الإشعارات غير المقروءة</small><strong>'+fmt(unread)+'</strong></div></div>'+
      '<div style="margin-top:16px"><h2>أهلاً بك يا '+esc(u.displayName||'طالب')+' 👋</h2><p style="color:#5b6072">الصف: '+esc(u.grade||'—')+' • الشعبة: '+esc(u.track||'—')+' • المحافظة: '+esc(u.governorate||'—')+'</p></div>'+
      '<div class="platform-actions" style="margin-top:12px"><a class="platform-btn primary" href="/exam.html">الامتحانات</a><a class="platform-btn" href="/cart.html">السلة</a><a class="platform-btn" href="/activation.html">تفعيل كود</a><a class="platform-btn" href="/student-performance.html">تقارير الأداء</a><a class="platform-btn" href="/schedule.html">الجدول</a><a class="platform-btn" href="/notifications.html">الإشعارات</a></div>'+
      '<section style="margin-top:18px"><h2>كورساتي الحالية</h2><div class="platform-grid platform-grid-3">'+
      (courseRows.map(c=>'<article class="platform-panel"><span class="platform-badge success">مفعل</span><h3>'+esc(c.title)+'</h3><p style="color:#5b6072">'+esc(c.description||'')+'</p><a class="platform-btn primary" href="/lesson.html?courseId='+encodeURIComponent(c.id)+'">فتح الكورس</a></article>').join('')||'<div class="platform-empty">لا توجد كورسات مفعلة حاليًا.</div>')+
      '</div></section>';
  }catch(err){host.innerHTML='<div class="platform-empty">تعذر تحميل بيانات الحساب: '+esc(err.message)+'</div>'}
});