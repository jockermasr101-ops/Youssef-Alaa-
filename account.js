window.addEventListener('youssef-auth-ready',async(e)=>{
 const P=window.YoussefAlaaPlatform,u=e.detail?.appUser;if(!P||!u)return;
 const byLabel={};document.querySelectorAll('input').forEach(i=>{const v=i.value;if(v.includes('youssef.alaa@')||v.includes('example.com'))byLabel.email=i});
 const inputs=[...document.querySelectorAll('input')].filter(i=>i.type!=='password');
 // Prefer exact values from the Stitch page where possible.
 const name=inputs.find(i=>i.value.includes('يوسف علاء')); const school=inputs.find(i=>i.value.includes('مدرسة'));
 const phones=inputs.filter(i=>i.type==='tel');
 if(name)name.value=u.displayName||name.value;if(byLabel.email)byLabel.email.value=u.email||byLabel.email.value;if(phones[0])phones[0].value=u.studentPhone||phones[0].value;if(phones[1])phones[1].value=u.parentPhone||phones[1].value;if(school)school.value=u.school||school.value;
 const form=document.querySelector('#edit-focus-btn')?.closest('form');if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',async ev=>{ev.preventDefault();try{await P.updateDoc(P.doc(P.db,'users',P.auth.currentUser.uid),{displayName:name?.value.trim()||u.displayName,school:school?.value.trim()||u.school,parentPhone:phones[1]?.value.trim()||u.parentPhone,updatedAt:P.serverTimestamp()});await P.auth.currentUser.updateProfile({displayName:name?.value.trim()||u.displayName});P.messageBox('تم حفظ بيانات الحساب.','success')}catch(err){P.messageBox(err.message)}})}});
