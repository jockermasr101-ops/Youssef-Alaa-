window.addEventListener('youssef-auth-ready',async()=>{
 const P=window.YoussefAlaaPlatform,host=document.querySelector('#dynamic-course-catalog');if(!P||!host)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('ar-EG').format(Number(n||0));
 const search=document.querySelector('#course-search'),grade=document.querySelector('#grade-filter'),track=document.querySelector('#track-filter');
 try{
   const s=await P.getDocs(P.query(P.collection(P.db,'courses'),P.where('published','==',true),P.limit(200)));
   const all=s.docs.map(d=>({id:d.id,...d.data()}));
   const fill=(el,field)=>{if(!el)return;const vals=[...new Set(all.map(x=>String(x[field]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));el.innerHTML='<option value="">الكل</option>'+vals.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');};
   fill(grade,'grade');fill(track,'track');
   const render=()=>{
     const q=String(search?.value||'').trim().toLowerCase(),g=grade?.value||'',t=track?.value||'';
     const rows=all.filter(c=>(!q||[c.title,c.description,c.subject,c.teacherName].some(v=>String(v||'').toLowerCase().includes(q)))&&(!g||String(c.grade||'')===g)&&(!t||String(c.track||'')===t));
     host.innerHTML=rows.map(c=>'<article class="platform-panel"><span class="platform-badge success">منشور</span><h3>'+esc(c.title)+'</h3><p style="color:#5b6072">'+esc(c.description||'')+'</p><p><b>'+esc(c.subject||'')+'</b> '+(c.grade?'• الصف '+esc(c.grade):'')+(c.track?' • '+esc(c.track):'')+'</p><p>المدرس: '+esc(c.teacherName||'—')+'</p><div class="platform-actions"><b>'+money(c.price)+' ج.م</b><button class="platform-btn primary" data-add-cart="'+esc(c.id)+'">إضافة للسلة</button><a class="platform-btn" href="/payment.html?courseId='+encodeURIComponent(c.id)+'">الدفع الآن</a></div></article>').join('')||'<div class="platform-empty">لا توجد كورسات منشورة مطابقة للبحث حاليًا.</div>';
     host.querySelectorAll('[data-add-cart]').forEach(b=>b.onclick=()=>{let cart=[];try{cart=JSON.parse(localStorage.getItem('ysa_cart')||'[]')}catch(_){cart=[]}if(!cart.includes(b.dataset.addCart))cart.push(b.dataset.addCart);localStorage.setItem('ysa_cart',JSON.stringify(cart));P.messageBox('تمت إضافة الكورس إلى السلة.','success');});
   };
   search?.addEventListener('input',render);grade?.addEventListener('change',render);track?.addEventListener('change',render);render();
 }catch(err){host.innerHTML='<div class="platform-empty">تعذر تحميل الكورسات المنشورة.</div>'}
});