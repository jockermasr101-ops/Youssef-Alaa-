window.addEventListener('youssef-auth-ready', async (event) => {
  const { appUser } = event.detail || {};
  if (!appUser || !['admin','owner'].includes(appUser.role)) return;
  const P = window.YoussefAlaaPlatform;
  if (!P) return;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = (n) => new Intl.NumberFormat('ar-EG').format(Number(n || 0));
  const date = (d) => d?.toDate ? d.toDate().toLocaleString('ar-EG') : (d ? new Date(d).toLocaleString('ar-EG') : '—');
  const badge = (status) => {
    const map = {active:['نشط','success'],pending:['قيد المراجعة','warn'],suspended:['موقوف','danger'],approved:['معتمد','success'],rejected:['مرفوض','danger']};
    const x=map[status] || [status || 'غير محدد','']; return `<span class="platform-badge ${x[1]}">${x[0]}</span>`;
  };

  async function getAll(name, sortField='createdAt', cap=300) {
    const snap = await P.getDocs(P.query(P.collection(P.db,name), P.orderBy(sortField,'desc'), P.limit(cap)));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }

  async function loadStats() {
    try {
      const [users,courses,lessons,attempts,withdrawals] = await Promise.all([
        getAll('users'), getAll('courses'), getAll('lessons'), getAll('examAttempts'), getAll('withdrawalRequests')
      ]);
      $('#stat-students').textContent = fmt(users.filter(x=>x.role==='student').length);
      $('#stat-teachers').textContent = fmt(users.filter(x=>['teacher','ta'].includes(x.role)).length);
      $('#stat-courses').textContent = fmt(courses.length);
      $('#stat-pending').textContent = fmt(users.filter(x=>x.status==='pending' || x.reviewState==='pending').length + withdrawals.filter(x=>x.status==='pending').length);
      $('#stat-attempts').textContent = fmt(attempts.length);
      $('#stat-lessons').textContent = fmt(lessons.length);
    } catch(e) { console.warn('stats', e); }
  }

  async function loadPendingUsers() {
    const box = $('#pending-users-body'); if (!box) return;
    try {
      const users = await getAll('users');
      const pending = users.filter(u=>u.status==='pending' || u.reviewState==='pending').filter(u=>u.role==='student').slice(0,30);
      box.innerHTML = pending.length ? pending.map(u=>`<tr>
        <td>${esc(u.displayName)}</td><td>${esc(u.studentPhone)}</td><td>${esc(u.grade || '—')}</td><td>${esc(u.governorate || '—')}</td><td>${date(u.createdAt)}</td>
        <td><div class="platform-actions"><button class="platform-btn success" data-approve="${u.uid}">تفعيل</button><button class="platform-btn danger" data-suspend="${u.uid}">رفض/إيقاف</button><a class="platform-btn" target="_blank" rel="noopener" href="${esc(u.idCardImageUrl || '#')}">البطاقة</a></div></td>
      </tr>`).join('') : `<tr><td colspan="6" class="platform-empty">لا توجد طلبات طلاب قيد المراجعة.</td></tr>`;
      $$('#pending-users-body [data-approve]').forEach(b=>b.onclick=()=>setStatus(b.dataset.approve,'active'));
      $$('#pending-users-body [data-suspend]').forEach(b=>b.onclick=()=>setStatus(b.dataset.suspend,'suspended'));
    } catch(e) { box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر قراءة المستخدمين. راجع قواعد Firestore.</td></tr>'; }
  }

  async function setStatus(uid,status) {
    try {
      await P.updateDoc(P.doc(P.db,'users',uid), {status, reviewState: status==='active' ? 'approved':'rejected', updatedAt:P.serverTimestamp()});
      await P.addDoc(P.collection(P.db,'activityLogs'),{uid:P.auth.currentUser.uid,type:`admin_user_${status}`,targetUid:uid,createdAt:P.serverTimestamp()});
      P.messageBox(status==='active'?'تم تفعيل الحساب.':'تم إيقاف الحساب.','success'); await loadPendingUsers(); await loadStats();
    } catch(e) { console.error(e); P.messageBox(e.message || 'تعذر تنفيذ العملية.'); }
  }

  async function loadCourses() {
    const box=$('#admin-courses-body'); if(!box)return;
    try{
      const courses=await getAll('courses');
      box.innerHTML=courses.map(c=>`<tr><td>${esc(c.title)}</td><td>${esc(c.teacherName||c.teacherId||'—')}</td><td>${esc(c.grade||'—')}</td><td>${badge(c.published?'active':'pending')}</td><td>${fmt(c.price)} ج.م</td><td><div class="platform-actions">${c.published?`<button class="platform-btn danger" data-course-toggle="${c.id}" data-value="false">إخفاء</button>`:`<button class="platform-btn success" data-course-toggle="${c.id}" data-value="true">نشر</button>`}</div></td></tr>`).join('') || `<tr><td colspan="6" class="platform-empty">لا توجد كورسات.</td></tr>`;
      $$('#admin-courses-body [data-course-toggle]').forEach(b=>b.onclick=async()=>{try{await P.updateDoc(P.doc(P.db,'courses',b.dataset.courseToggle),{published:b.dataset.value==='true',updatedAt:P.serverTimestamp()});P.messageBox('تم تحديث حالة الكورس.','success');loadCourses();}catch(e){P.messageBox(e.message)}});
    }catch(e){box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر تحميل الكورسات.</td></tr>'}
  }

  async function loadTeachers() {
    const box=$('#teachers-body'); if(!box)return;
    try{
      const users=(await getAll('users')).filter(u=>['teacher','ta'].includes(u.role));
      box.innerHTML=users.map(u=>`<tr><td>${esc(u.displayName)}</td><td>${esc(u.email)}</td><td>${ROLE_LABELS(u.role)}</td><td>${badge(u.status||'active')}</td><td><input class="platform-input" style="width:90px" type="number" min=0 max=100 step=0.01 value="${Number(u.commissionRate ?? 15)}" data-commission="${u.uid}"></td><td>${date(u.createdAt)}</td><td><div class="platform-actions">${u.status==='pending'?`<button class="platform-btn success" data-teacher-toggle="${u.uid}" data-status="active">اعتماد المدرس</button>`:`<button class="platform-btn ${u.status==='suspended'?'success':'danger'}" data-teacher-toggle="${u.uid}" data-status="${u.status==='suspended'?'active':'suspended'}">${u.status==='suspended'?'فك التجميد':'تجميد'}</button>`}</div></td></tr>`).join('') || `<tr><td colspan="6" class="platform-empty">لا يوجد مدرسون بعد.</td></tr>`;
      $$('#teachers-body [data-commission]').forEach(el=>el.onchange=async()=>{try{await P.updateDoc(P.doc(P.db,'users',el.dataset.commission),{commissionRate:Number(el.value),updatedAt:P.serverTimestamp()});P.messageBox('تم حفظ العمولة.','success')}catch(err){P.messageBox(err.message)}});$$('#teachers-body [data-teacher-toggle]').forEach(b=>b.onclick=async()=>{await setStatus(b.dataset.teacherToggle,b.dataset.status);loadTeachers();});
    }catch(e){box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر تحميل المدرسين.</td></tr>'}
  }
  const ROLE_LABELS = r => ({teacher:'مدرس',ta:'مساعد مدرس'}[r]||r);

  async function loadFinance() {
    const box=$('#withdrawals-body'); if(!box)return;
    try{
      const rows=await getAll('withdrawalRequests');
      box.innerHTML=rows.map(r=>`<tr><td>${esc(r.teacherName||r.teacherId)}</td><td>${fmt(r.amount)} ج.م</td><td>${esc(r.method||'—')}</td><td>${badge(r.status||'pending')}</td><td>${date(r.createdAt)}</td><td>${r.status==='pending'?`<div class="platform-actions"><button class="platform-btn success" data-wd="${r.id}" data-s="approved">اعتماد</button><button class="platform-btn danger" data-wd="${r.id}" data-s="rejected">رفض</button></div>`:'—'}</td></tr>`).join('')||`<tr><td colspan="6" class="platform-empty">لا توجد طلبات سحب.</td></tr>`;
      $$('#withdrawals-body [data-wd]').forEach(b=>b.onclick=async()=>{try{await P.updateDoc(P.doc(P.db,'withdrawalRequests',b.dataset.wd),{status:b.dataset.s,reviewedBy:P.auth.currentUser.uid,reviewedAt:P.serverTimestamp()});P.messageBox('تم تحديث طلب السحب.','success');loadFinance()}catch(e){P.messageBox(e.message)}});
    }catch(e){box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر تحميل المالية.</td></tr>'}
  }

  async function createPromo() {
    const form=$('#promo-form'); if(!form)return;
    form.addEventListener('submit',async e=>{e.preventDefault();
      const code=$('#promo-code').value.trim().toUpperCase(); const type=$('#promo-type').value; const value=Number($('#promo-value').value); const targetId=$('#promo-course').value.trim();
      if(code.length<6 || !/^[A-Z0-9-]+$/.test(code)) return P.messageBox('الكود يجب أن يكون 6 أحرف/أرقام على الأقل.'); if(value<0 || (type==='discount' && value>100)) return P.messageBox(type==='discount'?'نسبة الخصم يجب أن تكون بين 0 و100%.':'قيمة الكود غير صحيحة.'); if(['lesson','course','subscription'].includes(type) && !targetId) return P.messageBox('اكتب معرّف الكورس أو الدرس المستهدف.');
      try{await P.setDoc(P.doc(P.db,'promoCodes',code),{code,type,value,targetId:targetId||null,courseId:['course','subscription'].includes(type)?(targetId||null):null,active:true,createdByUid:P.auth.currentUser.uid,createdByRole:appUser.role,createdAt:P.serverTimestamp(),usedByUid:null}); P.messageBox('تم إنشاء الكود.','success');form.reset();loadPromos();}catch(err){P.messageBox(err.message||'تعذر إنشاء الكود.')}
    });
  }
  async function loadPromos(){const box=$('#promos-body');if(!box)return;try{const r=await getAll('promoCodes');box.innerHTML=r.map(x=>`<tr><td class="font-mono">${esc(x.code)}</td><td>${esc(x.type)}</td><td>${esc(x.targetId||x.courseId||'—')}</td><td>${fmt(x.value)}</td><td>${badge(x.active?'active':'suspended')}</td><td>${esc(x.usedByUid||'—')}</td><td>${date(x.createdAt)}</td></tr>`).join('')||`<tr><td colspan="6" class="platform-empty">لا توجد أكواد.</td></tr>`}catch(e){box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر تحميل الأكواد.</td></tr>'}}

  async function loadExamsForApproval(){
    const box=$('#exams-approval-body'); if(!box)return;
    try{
      const rows=await getAll('exams');
      box.innerHTML=rows.map(x=>`<tr><td>${esc(x.title)}</td><td>${esc(x.teacherId||'—')}</td><td>${esc(x.courseId||'—')}</td><td>${badge(x.published?'active':'pending')}</td><td>${x.published?'—':`<button class="platform-btn success" data-publish-exam="${x.id}">نشر</button>`}</td></tr>`).join('')||'<tr><td colspan="5" class="platform-empty">لا توجد امتحانات.</td></tr>';
      $('#exams-approval-body [data-publish-exam]').forEach(b=>b.onclick=async()=>{
        try{
          const examRef=P.doc(P.db,'exams',b.dataset.publishExam); const snap=await P.getDoc(examRef); if(!snap.exists())throw new Error('الامتحان غير موجود.');
          const qs=await P.getDocs(P.query(P.collection(P.db,'questions'),P.where('examId','==',b.dataset.publishExam),P.limit(1)));
          if(qs.empty) return P.messageBox('لا يمكن نشر امتحان بدون أسئلة.');
          await P.updateDoc(examRef,{published:true,status:'published',updatedAt:P.serverTimestamp()}); P.messageBox('تم نشر الامتحان.','success'); loadExamsForApproval();
        }catch(e){P.messageBox(e.message||'تعذر نشر الامتحان.')}
      });
    }catch(e){box.innerHTML='<tr><td colspan="5" class="platform-empty">تعذر تحميل الامتحانات.</td></tr>'}
  }

  async function loadQuestionsForApproval(){
    const box=$('#questions-approval-body'); if(!box)return;
    try{
      const rows=await getAll('questions');
      box.innerHTML=rows.map(x=>`<tr><td>${esc(x.examId||'—')}</td><td>${esc(x.teacherId||'—')}</td><td>${esc(x.type||'—')}</td><td>${esc(String(x.text||'').slice(0,100))}</td><td>${badge(x.published?'active':'pending')}</td><td>${x.published?'—':`<button class="platform-btn success" data-publish-question="${x.id}">نشر</button>`}</td></tr>`).join('')||'<tr><td colspan="6" class="platform-empty">لا توجد أسئلة.</td></tr>';
      $('#questions-approval-body [data-publish-question]').forEach(b=>b.onclick=async()=>{
        try{
          const ref=P.doc(P.db,'questions',b.dataset.publishQuestion); const snap=await P.getDoc(ref); if(!snap.exists())throw new Error('السؤال غير موجود.');
          const examId=snap.data().examId; const examSnap=await P.getDoc(P.doc(P.db,'exams',examId));
          if(!examSnap.exists() || examSnap.data().published!==true) return P.messageBox('انشر الامتحان أولًا.');
          await P.updateDoc(ref,{published:true,status:'published',updatedAt:P.serverTimestamp()}); P.messageBox('تم نشر السؤال.','success'); loadQuestionsForApproval();
        }catch(e){P.messageBox(e.message||'تعذر نشر السؤال.')}
      });
    }catch(e){box.innerHTML='<tr><td colspan="6" class="platform-empty">تعذر تحميل الأسئلة.</td></tr>'}
  }

  async function loadLogs(){const box=$('#logs-body');if(!box)return;try{const r=await getAll('activityLogs','createdAt',120);box.innerHTML=r.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.uid)}</td><td>${esc(JSON.stringify(x.details||{}))}</td><td>${date(x.createdAt)}</td></tr>`).join('')||`<tr><td colspan="4" class="platform-empty">لا توجد سجلات.</td></tr>`}catch(e){box.innerHTML='<tr><td colspan="4" class="platform-empty">تعذر تحميل السجل.</td></tr>'}}

  await Promise.all([loadStats(),loadPendingUsers(),loadCourses(),loadTeachers(),loadFinance(),loadPromos(),loadExamsForApproval(),loadQuestionsForApproval(),loadLogs(),createPromo()]);
  const refresh=$('#refresh-admin'); if(refresh) refresh.onclick=()=>Promise.all([loadStats(),loadPendingUsers(),loadCourses(),loadTeachers(),loadFinance(),loadPromos(),loadExamsForApproval(),loadQuestionsForApproval(),loadLogs()]);
});
