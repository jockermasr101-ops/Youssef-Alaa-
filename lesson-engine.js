window.addEventListener('youssef-auth-ready', async (e) => {
  const P = window.YoussefAlaaPlatform;
  const u = e.detail?.appUser;
  if (!P || !u || u.role !== 'student') return;

  const params = new URLSearchParams(location.search);
  const requestedLessonId = params.get('lessonId');
  const courseId = params.get('courseId');
  const main = document.querySelector('main');
  if (!main) return;

  const wrap = document.createElement('section');
  wrap.className = 'platform-panel';
  wrap.style = 'max-width:1400px;margin:18px auto;padding:18px 20px';
  wrap.innerHTML = '<div class="platform-empty">جارٍ تحميل الدرس...</div>';
  main.prepend(wrap);

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => new Intl.NumberFormat('ar-EG').format(Number(n || 0));

  async function hasPassedExam(examId) {
    if (!examId) return true;
    const s = await P.getDocs(P.query(
      P.collection(P.db,'examAttempts'),
      P.where('studentUid','==',P.auth.currentUser.uid),
      P.limit(200)
    ));
    return s.docs.some(d => {
      const x = d.data();
      return x.examId === examId && x.passed === true;
    });
  }

  async function prerequisiteReady(lesson) {
    const requiredWatch = Math.max(0, Math.min(100, Number(lesson.requiredWatchPercent ?? 33)));
    if (!lesson.prerequisiteLessonId && !lesson.requiredExamId) return true;

    if (lesson.prerequisiteLessonId) {
      const progress = await P.getDoc(P.doc(P.db,'lessonProgress',P.auth.currentUser.uid+'_'+lesson.prerequisiteLessonId));
      const p = progress.exists() ? progress.data() : {};
      if (Number(p.watchPercent || 0) < requiredWatch) return false;
      if (!await hasPassedExam(lesson.requiredExamId)) return false;
      return true;
    }

    return hasPassedExam(lesson.requiredExamId);
  }

  async function loadLesson() {
    let lesson = null;
    if (requestedLessonId) {
      const s = await P.getDoc(P.doc(P.db,'lessons',requestedLessonId));
      if (s.exists()) lesson = { id:s.id, ...s.data() };
    } else if (courseId) {
      const s = await P.getDocs(P.query(P.collection(P.db,'lessons'), P.where('courseId','==',courseId), P.where('published','==',true), P.limit(200)));
      const rows = s.docs.map(d=>({id:d.id,...d.data()}))
        .filter(x=>x.published===true)
        .sort((a,b)=>Number(a.order||0)-Number(b.order||0));
      lesson = rows[0] || null;
    }
    return lesson;
  }

  try {
    const lesson = await loadLesson();
    if (!lesson) {
      wrap.innerHTML = '<div class="platform-empty">لا يوجد درس متاح بهذا الرابط.</div>';
      return;
    }

    const access = await Promise.all([
      lesson.courseId ? P.getDoc(P.doc(P.db,'enrollments',u.uid+'_'+lesson.courseId)) : Promise.resolve(null),
      P.getDoc(P.doc(P.db,'lessonAccess',u.uid+'_'+lesson.id))
    ]);
    const enrollment = access[0];
    const directAccess = access[1];
    const enrolled = enrollment?.exists() && enrollment.data().active === true;
    const directlyAllowed = directAccess?.exists() && directAccess.data().active === true;
    if (!enrolled && !directlyAllowed) {
      wrap.innerHTML = '<div class="platform-empty">هذا المحتوى غير مفعّل على حسابك.</div>';
      return;
    }

    if (!(await prerequisiteReady(lesson))) {
      const watch = Math.max(0, Math.min(100, Number(lesson.requiredWatchPercent ?? 33)));
      wrap.innerHTML = '<div class="platform-empty">هذا الدرس مقفول حاليًا. أكمل الدرس السابق بنسبة '+watch+'%'+(lesson.requiredExamId?' واجتز امتحان المتطلب':'')+' ثم افتحه مرة أخرى.</div>';
      return;
    }

    const progressRef = P.doc(P.db,'lessonProgress',u.uid+'_'+lesson.id);
    const progressSnap = await P.getDoc(progressRef);
    const prog = progressSnap.exists() ? progressSnap.data() : {};
    const source = lesson.mediaUrl || '';
    if (!source) {
      wrap.innerHTML = '<div class="platform-empty">ملف الدرس غير متاح.</div>';
      return;
    }

    const type = String(lesson.mediaType || 'document').toLowerCase();
    let player = '';
    if (type === 'video') {
      player = '<div class="video-frame"><video id="lesson-video" playsinline controls preload="metadata" controlsList="nodownload noplaybackrate" disablePictureInPicture src="'+esc(source)+'"></video></div>';
    } else if (type === 'image') {
      player = '<div class="content-preview"><img src="'+esc(source)+'" alt="'+esc(lesson.title)+'" draggable="false" style="max-width:100%;display:block;margin:auto"/></div>';
    } else {
      const viewerUrl = 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(source);
      player = '<div class="content-preview" style="min-height:560px"><iframe title="'+esc(lesson.title)+'" src="'+viewerUrl+'" style="width:100%;height:620px;border:0" loading="lazy" referrerpolicy="no-referrer"></iframe></div>';
    }

    wrap.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
        '<div><span class="platform-badge success">متاح</span><h2>'+esc(lesson.title)+'</h2><p style="color:#5b6072">'+esc(lesson.description||'')+'</p></div>' +
        '<div><span class="platform-badge">الدرس '+fmt(lesson.order||1)+'</span></div>' +
      '</div>' +
      '<div style="position:relative">'+player+'<div id="video-watermark" style="position:absolute;top:18%;right:8%;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.72);font-size:11px;pointer-events:none;user-select:none">'+esc(u.displayName||'طالب')+' • '+esc(u.studentPhone||'')+'</div></div>' +
      (type === 'video' ? '<div class="platform-actions" style="margin-top:10px"><label class="platform-label" style="margin:0;display:flex;align-items:center;gap:8px">سرعة التشغيل<select id="video-speed" class="platform-select" style="width:auto"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label></div>' : '') +
      '<div style="margin-top:12px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#5b6072"><span>التقدم المحفوظ</span><span id="watch-percent">'+fmt(Math.round(Number(prog.watchPercent||0)))+'%</span></div><div class="progress-track"><span id="watch-bar" style="width:'+Math.min(100,Number(prog.watchPercent||0))+'%"></span></div></div>' +
      (Array.isArray(lesson.chapters)&&lesson.chapters.length&&type==='video' ? '<div class="platform-panel" style="margin-top:14px"><b>الفصول</b><div class="platform-actions" style="margin-top:8px">'+lesson.chapters.map((c,i)=>'<button class="platform-btn" data-chapter="'+i+'">'+esc(c.title||('فصل '+(i+1)))+'</button>').join('')+'</div></div>' : '') +
      '<div class="platform-panel" style="margin-top:14px"><h3>ملاحظاتك أثناء الدرس</h3><textarea id="lesson-note" class="platform-textarea" rows="3" placeholder="اكتب ملاحظة مرتبطة بالوقت الحالي..."></textarea><div class="platform-actions" style="margin-top:8px"><button id="save-lesson-note" class="platform-btn primary">حفظ الملاحظة</button><span id="note-status" style="color:#5b6072"></span></div><div id="lesson-notes-list" style="margin-top:10px"></div></div>' +
      '<div class="platform-actions" style="margin-top:14px"><a class="platform-btn" href="'+(courseId?'/lesson.html?courseId='+encodeURIComponent(courseId):'/student-dashboard.html')+'">رجوع</a>'+(lesson.nextLessonId?'<a class="platform-btn primary" id="next-lesson" href="/lesson.html?lessonId='+encodeURIComponent(lesson.nextLessonId)+'">الدرس التالي</a>':'')+'</div>';

    const watermark = document.querySelector('#video-watermark');
    if (watermark) {
      const positions = [
        ['18%','8%'],['68%','9%'],['18%','65%'],['70%','60%'],['42%','42%']
      ];
      let pos = 0;
      setInterval(() => {
        pos = (pos + 1) % positions.length;
        watermark.style.top = positions[pos][0];
        watermark.style.right = positions[pos][1];
      }, 23000);
    }

    const video = document.querySelector('#lesson-video');
    if (video) {
      let maxWatched = Number(prog.maxWatchedSeconds || 0);
      let lastSave = 0;

      video.addEventListener('loadedmetadata', () => {
        if (Number(prog.lastPosition || 0) > 0 && Number(prog.lastPosition || 0) < video.duration) {
          video.currentTime = Number(prog.lastPosition);
        }
      });

      video.addEventListener('timeupdate', async () => {
        if (video.currentTime > maxWatched + 1.5) maxWatched = video.currentTime;
        const percent = video.duration ? Math.min(100, maxWatched / video.duration * 100) : 0;
        document.querySelector('#watch-percent').textContent = Math.round(percent)+'%';
        document.querySelector('#watch-bar').style.width = percent+'%';

        if (video.currentTime - lastSave >= 5) {
          lastSave = video.currentTime;
          try {
            await P.setDoc(progressRef, {
              uid:u.uid, lessonId:lesson.id, courseId:lesson.courseId||courseId,
              lastPosition:video.currentTime, maxWatchedSeconds:maxWatched, watchPercent:percent,
              completed:percent >= 95, updatedAt:P.serverTimestamp()
            }, {merge:true});
          } catch (_) {}
        }
      });

      video.addEventListener('seeking', () => {
        if (video.currentTime > maxWatched + 3) video.currentTime = Math.max(0,maxWatched);
      });
      video.addEventListener('contextmenu', ev => ev.preventDefault());
      video.addEventListener('ratechange', () => {
        if (video.playbackRate > 2) video.playbackRate = 2;
      });

      document.querySelector('#video-speed')?.addEventListener('change', ev => {
        video.playbackRate = Number(ev.target.value);
      });
      document.querySelectorAll('[data-chapter]').forEach(b => b.onclick = () => {
        const chapter = lesson.chapters?.[Number(b.dataset.chapter)];
        if (chapter?.time != null) video.currentTime = Number(chapter.time);
      });
    }

    const noteForm = document.querySelector('#save-lesson-note');
    const loadNotes = async () => {
      const s = await P.getDocs(P.query(P.collection(P.db,'lessonNotes'),P.where('uid','==',u.uid),P.limit(50)));
      const rows = s.docs.map(d=>d.data()).filter(x=>x.lessonId===lesson.id).sort((a,b)=>(b.timeSeconds||0)-(a.timeSeconds||0));
      document.querySelector('#lesson-notes-list').innerHTML = rows.map(x =>
        '<div class="app-notice" style="margin-top:6px"><b>'+Math.floor((x.timeSeconds||0)/60)+':'+String(Math.floor((x.timeSeconds||0)%60)).padStart(2,'0')+'</b> — '+esc(x.text)+'</div>'
      ).join('') || '';
    };
    noteForm?.addEventListener('click', async () => {
      const field = document.querySelector('#lesson-note');
      const txt = field?.value.trim();
      if (!txt) return;
      try {
        const seconds = video?.currentTime || 0;
        await P.addDoc(P.collection(P.db,'lessonNotes'),{uid:u.uid,lessonId:lesson.id,courseId:lesson.courseId||courseId,text:txt,timeSeconds:seconds,createdAt:P.serverTimestamp()});
        field.value = '';
        document.querySelector('#note-status').textContent = 'تم حفظ الملاحظة';
        loadNotes();
      } catch (err) { P.messageBox(err.message || 'تعذر حفظ الملاحظة.'); }
    });
    loadNotes();

    const next = document.querySelector('#next-lesson');
    if (next) {
      next.addEventListener('click', async ev => {
        const currentPercent = Number(document.querySelector('#watch-percent').textContent.replace('%','')) || 0;
        const requiredWatch = Math.max(0, Math.min(100, Number(lesson.nextWatchPercent ?? lesson.requiredWatchPercent ?? 33)));
        if (currentPercent < requiredWatch) {
          ev.preventDefault();
          return P.messageBox('أكمل مشاهدة الدرس بنسبة '+requiredWatch+'% قبل الانتقال.');
        }
        if (lesson.nextRequiredExamId && !(await hasPassedExam(lesson.nextRequiredExamId))) {
          ev.preventDefault();
          return P.messageBox('يجب اجتياز امتحان المتطلب قبل فتح الدرس التالي.');
        }
      });
    }
  } catch (err) {
    wrap.innerHTML = '<div class="platform-empty">تعذر تحميل الدرس: '+esc(err.message||'حدث خطأ غير متوقع.')+'</div>';
  }
});
