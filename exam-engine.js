window.addEventListener('youssef-auth-ready', async (e) => {
  const P = window.YoussefAlaaPlatform;
  const u = e.detail?.appUser;
  if (!P || !u || u.role !== 'student') return;

  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = a => {
    const x=[...(a||[])];
    for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}
    return x;
  };

  let exams=[], questions=[], selected=null, index=0, answers={}, startedAt=0, timerId=null, attemptsUsed=0, submitting=false;

  async function load() {
    try {
      const en = await P.getDocs(P.query(P.collection(P.db,'enrollments'),P.where('studentUid','==',P.auth.currentUser.uid),P.limit(100)));
      const courseIds=[...new Set(en.docs.map(d=>d.data()).filter(x=>x.active!==false).map(x=>x.courseId).filter(Boolean))];
      const found=[];
      for(const cid of courseIds){
        const s=await P.getDocs(P.query(P.collection(P.db,'exams'),P.where('courseId','==',cid),P.where('published','==',true),P.limit(50)));
        s.docs.forEach(d=>found.push({id:d.id,...d.data()}));
      }
      exams=found;
      const host = $('#exam-list');
      if (!host) return;
      host.innerHTML = exams.map(x =>
        '<button class="platform-panel" style="text-align:right;border:1px solid #c4c5d7" data-exam="'+esc(x.id)+'"><span class="platform-badge success">منشور</span><h3>'+esc(x.title)+'</h3><p style="color:#5b6072">'+Number(x.durationMinutes||30)+' دقيقة • '+Number(x.attemptsAllowed||3)+' محاولات • نجاح '+Number(x.passScore||50)+'%</p></button>'
      ).join('') || '<div class="platform-empty">لا توجد امتحانات منشورة حاليًا.</div>';
      host.querySelectorAll('[data-exam]').forEach(b=>b.onclick=()=>start(b.dataset.exam));
    } catch (err) {
      const host=$('#exam-list'); if(host) host.innerHTML='<div class="platform-empty">تعذر تحميل الامتحانات.</div>';
    }
  }

  async function start(id) {
    if (submitting) return;
    selected = exams.find(x=>x.id===id);
    if (!selected) return;
    try {
      const attempts = await P.getDocs(P.query(
        P.collection(P.db,'examAttempts'),
        P.where('studentUid','==',P.auth.currentUser.uid),
        P.limit(300)
      ));
      attemptsUsed = attempts.docs.filter(d=>d.data().examId===id).length;
      const allowed = Number(selected.attemptsAllowed || 3);
      if (attemptsUsed >= allowed) return P.messageBox('لقد استنفدت عدد محاولات هذا الامتحان.');

      const qs = await P.getDocs(P.query(P.collection(P.db,'questions'),P.where('examId','==',id),P.where('published','==',true),P.limit(500)));
      let rows = qs.docs.map(d=>({id:d.id,...d.data()}));
      rows = selected.randomizeQuestions === false ? rows : shuffle(rows);
      questions = rows.slice(0,Math.max(1,Number(selected.questionCount||20))).map(q => {
        const next = {...q, options:Array.isArray(q.options)?[...q.options]:q.options};
        if (Array.isArray(next.options) && selected.randomizeOptions !== false && ['mcq','truefalse','multi'].includes(next.type||'mcq')) {
          const original = [...next.options];
          if (next.type === 'multi') {
            const source = Array.isArray(next.correctAnswer) ? next.correctAnswer : String(next.correctAnswer??'').split(',').filter(Boolean).map(Number);
            const correctValues = source.map(i=>original[Number(i)]).filter(v=>v!==undefined);
            next.options = shuffle(original);
            next.correctAnswer = correctValues.map(v=>next.options.indexOf(v)).filter(i=>i>=0);
          } else {
            const sourceIndex = Number.isInteger(Number(next.correctAnswer)) && String(next.correctAnswer).trim() !== '' ? Number(next.correctAnswer) : null;
            const correctValue = sourceIndex !== null ? original[sourceIndex] : null;
            next.options = shuffle(original);
            if (correctValue !== null && correctValue !== undefined) next.correctAnswer = next.options.indexOf(correctValue);
          }
        }
        return next;
      });

      if (!questions.length) return P.messageBox('لا توجد أسئلة منشورة لهذا الامتحان.');

      answers={}; index=0; startedAt=Date.now(); submitting=false;
      $('#exam-select').hidden=true; $('#exam-result').hidden=true; $('#exam-workspace').hidden=false;
      $('#exam-title').textContent=selected.title||'امتحان';
      $('#exam-meta').textContent=questions.length+' سؤال • '+Number(selected.durationMinutes||30)+' دقيقة • النجاح '+Number(selected.passScore||50)+'%';
      $('#attempt-badge').textContent='محاولة '+(attemptsUsed+1)+' من '+allowed;
      startTimer(Math.max(1,Number(selected.durationMinutes||30)));
      render();
    } catch (err) { P.messageBox(err.message || 'تعذر بدء الامتحان.'); }
  }

  function startTimer(minutes) {
    clearInterval(timerId);
    const end = Date.now()+minutes*60000;
    const tick=()=>{
      const sec=Math.max(0,Math.floor((end-Date.now())/1000));
      const timer=$('#timer'); if(timer)timer.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
      if(sec<=0){clearInterval(timerId);submit(true);}
    };
    tick(); timerId=setInterval(tick,1000);
  }

  function render() {
    const q=questions[index], box=$('#question-container');
    if(!q||!box)return;
    const type=q.type||'mcq';
    let input='';
    if(type==='mcq'||type==='truefalse'||type==='multi'){
      const opts=type==='truefalse'?(q.options?.length?q.options:['صح','خطأ']):(q.options||[]);
      const multi=type==='multi';
      const current=answers[q.id]??(multi?[]:null);
      input=opts.map((o,i)=>
        '<label class="platform-panel" style="display:flex;gap:10px;align-items:center;margin:8px 0;cursor:pointer;background:'+
        ((multi?current.includes(i):current===i)?'#eef3ff':'#fff')+'"><input type="'+(multi?'checkbox':'radio')+'" name="ans" value="'+i+'" '+(multi?current.includes(i)?'checked':'':current===i?'checked':'')+'><span>'+esc(o)+'</span></label>'
      ).join('');
    } else if(type==='essay'){
      input='<textarea id="answer-text" class="platform-textarea" rows="8" placeholder="اكتب إجابتك...">'+esc(answers[q.id]||'')+'</textarea>';
    } else if(type==='file'){
      const existing=answers[q.id];
      input='<input id="answer-file" class="platform-input" type="file"><div id="file-state" style="color:#5b6072;font-size:13px;margin-top:6px">'+(existing instanceof File?esc(existing.name):existing?.name?'ملف مرفق: '+esc(existing.name):'سيتم رفع الملف عند التسليم.')+'</div>';
    } else if(type==='order'){
      const arr=Array.isArray(answers[q.id])?answers[q.id]:[];
      input='<div id="order-options">'+(q.options||[]).map((o,i)=>'<button type="button" class="platform-btn" data-order="'+i+'" style="margin:4px;opacity:'+(arr.includes(i)?'.45':'1')+'">'+(arr.includes(i)?(arr.indexOf(i)+1)+'. ':'')+esc(o)+'</button>').join('')+'</div><p style="color:#5b6072">اضغط على العناصر بالترتيب المطلوب.</p>';
    } else if(type==='match'){
      input='<textarea id="answer-match" class="platform-textarea" rows="5" placeholder="اكتب المطابقات بهذا الشكل: 0-1,1-0,...">'+esc(answers[q.id]||'')+'</textarea>';
    } else {
      input='<div class="platform-empty">نوع السؤال غير مدعوم.</div>';
    }

    box.innerHTML='<div class="platform-badge">سؤال '+(index+1)+' من '+questions.length+' • '+esc(type)+'</div><h2 style="line-height:1.8">'+esc(q.text)+'</h2>'+input;

    if(type==='mcq'||type==='truefalse'||type==='multi'){
      box.querySelectorAll('input[name="ans"]').forEach(i=>i.addEventListener('change',()=>{
        answers[q.id]=type==='multi'?[...box.querySelectorAll('input[name="ans"]:checked')].map(x=>Number(x.value)):Number(i.value);
        render();
      }));
    }
    if(type==='essay') box.querySelector('#answer-text')?.addEventListener('input',ev=>answers[q.id]=ev.target.value);
    if(type==='match') box.querySelector('#answer-match')?.addEventListener('input',ev=>answers[q.id]=ev.target.value);
    if(type==='file') box.querySelector('#answer-file')?.addEventListener('change',ev=>{
      const file=ev.target.files?.[0]||null;
      if(file){answers[q.id]=file;box.querySelector('#file-state').textContent='سيتم رفع: '+file.name;}
    });
    if(type==='order'){
      let arr=Array.isArray(answers[q.id])?[...answers[q.id]]:[];
      box.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{
        const n=Number(b.dataset.order);
        if(arr.includes(n))return;
        arr.push(n); answers[q.id]=arr; render();
      });
    }

    const last=index===questions.length-1;
    const prev=$('#prev-btn'),next=$('#next-btn'),submitBtn=$('#submit-exam');
    if(prev){prev.disabled=index===0;prev.hidden=selected.allowBackNavigation===false;}
    if(next)next.hidden=last;
    if(submitBtn)submitBtn.hidden=!last;
  }

  function sameArray(a,b){
    return JSON.stringify((Array.isArray(a)?a:[]).map(Number).sort((x,y)=>x-y))===JSON.stringify((Array.isArray(b)?b:[]).map(Number).sort((x,y)=>x-y));
  }

  async function submit(auto=false) {
    if(submitting) return;
    submitting=true; clearInterval(timerId);
    const safeAnswers={};
    let total=0, score=0, manual=0;

    try {
      for(const q of questions){
        const pts=Math.max(0,Number(q.points||1));
        total+=pts;
        const a=answers[q.id];
        if(q.type==='file'){
          manual+=pts;
          if(a instanceof File){
            const up=await P.uploadCloudinary(a,{resourceType:'raw',folder:'youssef-alaa-academy/exam-submissions'});
            safeAnswers[q.id]={fileUrl:up.secure_url,publicId:up.public_id,name:a.name,size:a.size,type:a.type||''};
          } else if(a?.fileUrl) {
            safeAnswers[q.id]=a;
          }
          continue;
        }
        safeAnswers[q.id]=a??null;
        if(q.type==='essay'){manual+=pts;continue;}

        const correct=q.correctAnswer;
        if(q.type==='multi'){
          const ca=Array.isArray(correct)?correct:String(correct??'').split(',').filter(Boolean).map(Number);
          if(sameArray(ca,a))score+=pts;
        } else if(q.type==='order'){
          const ca=Array.isArray(correct)?correct:String(correct??'').split(',').filter(Boolean).map(Number);
          if(JSON.stringify(ca.map(Number))===JSON.stringify((Array.isArray(a)?a:[]).map(Number)))score+=pts;
        } else if(q.type==='match'){
          const normalize=v=>String(v??'').replace(/\s/g,'');
          if(normalize(a)===normalize(correct))score+=pts;
        } else if(String(a??'')===String(correct??'')){
          score+=pts;
        }
      }

      const percent=total?Math.round(score/total*100):0;
      const finalPassed=manual===0 && percent>=Number(selected.passScore||50);
      const attempt={
        studentUid:P.auth.currentUser.uid,
        studentName:u.displayName||'',
        teacherId:selected.teacherId||null,
        examId:selected.id,
        courseId:selected.courseId||null,
        answers:safeAnswers,
        score,maxScore:total,percent,manualPoints:manual,
        passed:finalPassed,
        status:manual>0?'needs_manual_review':'graded',
        autoSubmitted:auto,
        attemptNumber:attemptsUsed+1,
        startedAt:P.Timestamp.fromMillis(startedAt),
        submittedAt:P.serverTimestamp(),
        createdAt:P.serverTimestamp()
      };

      const attemptId=P.auth.currentUser.uid+'_'+selected.id+'_'+String(attempt.attemptNumber);
      await P.setDoc(P.doc(P.db,'examAttempts',attemptId),attempt);
      if(score>0){
        const userRef=P.doc(P.db,'users',P.auth.currentUser.uid);
        const beforeUser=await P.getDoc(userRef);
        const beforePoints=beforeUser.exists()?Number(beforeUser.data().points||0):0;
        const nextPoints=beforePoints+score;
        await P.updateDoc(userRef,{points:P.increment(score),updatedAt:P.serverTimestamp()});
        const parts=String(u.displayName||'طالب').trim().split(/\s+/).filter(Boolean);
        const leaderboardName=parts.length>=2?parts.slice(0,2).join(' '):parts.join(' ');
        try{
          await P.setDoc(P.doc(P.db,'leaderboard',P.auth.currentUser.uid),{
            uid:P.auth.currentUser.uid,displayName:leaderboardName,points:nextPoints,grade:u.grade||'',track:u.track||'',updatedAt:P.serverTimestamp()
          },{merge:true});
        }catch(_){}
      }
      await P.logActivity('exam_submitted',{examId:selected.id,attemptNumber:attemptsUsed+1,percent});

      $('#exam-workspace').hidden=true; $('#exam-result').hidden=false;
      $('#result-text').innerHTML='<div class="platform-grid platform-grid-3"><div class="platform-stat"><small>النتيجة الآلية</small><strong>'+percent+'%</strong></div><div class="platform-stat"><small>النقاط</small><strong>'+score+' / '+total+'</strong></div><div class="platform-stat"><small>مراجعة يدوية</small><strong>'+(manual?'مطلوبة':'لا يوجد')+'</strong></div></div><p style="margin-top:14px">'+(manual?'تم إرسال الأسئلة المقالية/الملفات للمراجعة اليدوية قبل اعتماد حالة النجاح.':finalPassed?'حالة المحاولة: ناجح ✅':'حالة المحاولة: لم يحقق درجة النجاح.')+'</p>';
    } catch(err) {
      P.messageBox(err.message || 'تعذر حفظ المحاولة.');
      submitting=false;
    }
  }

  $('#prev-btn')?.addEventListener('click',()=>{if(index>0){index--;render();}});
  $('#next-btn')?.addEventListener('click',()=>{if(index<questions.length-1){index++;render();}});
  $('#submit-exam')?.addEventListener('click',()=>submit(false));
  $('#retry-btn')?.addEventListener('click',()=>selected&&!submitting&&start(selected.id));

  load();
});
