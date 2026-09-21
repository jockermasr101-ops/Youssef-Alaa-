window.addEventListener('youssef-auth-ready',async(e)=>{
 const P=window.YoussefAlaaPlatform,u=e.detail?.appUser;if(!P||!u)return;
 const set=(id,v)=>{const el=document.querySelector(id);if(el)el.value=v??''};
 set('#account-name',u.displayName);set('#account-email',u.email);set('#account-student-phone',u.studentPhone);set('#account-parent-phone',u.parentPhone);set('#account-parent2-phone',u.parentPhone2);set('#account-governorate',u.governorate);set('#account-city',u.city);set('#account-school',u.school);set('#account-grade',u.grade);set('#account-track',u.track);
 document.querySelector('#account-save')?.addEventListener('click',async()=>{
  try{
   const data={displayName:document.querySelector('#account-name')?.value.trim(),studentPhone:document.querySelector('#account-student-phone')?.value.trim(),parentPhone:document.querySelector('#account-parent-phone')?.value.trim(),parentPhone2:document.querySelector('#account-parent2-phone')?.value.trim(),governorate:document.querySelector('#account-governorate')?.value.trim(),city:document.querySelector('#account-city')?.value.trim(),school:document.querySelector('#account-school')?.value.trim(),updatedAt:P.serverTimestamp()};
   await P.updateDoc(P.doc(P.db,'users',u.uid),data);await P.auth.currentUser.updateProfile({displayName:data.displayName});P.messageBox('تم حفظ بيانات الحساب.','success');
  }catch(err){P.messageBox(err.message||'تعذر حفظ البيانات.')}
 });
});