window.addEventListener('youssef-auth-ready', async (e) => {
  const P = window.YoussefAlaaPlatform;
  const u = e.detail?.appUser;
  const form = document.querySelector('#manual-payment-form');
  if (!P || !u || u.role !== 'student' || !form) return;

  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money = n => new Intl.NumberFormat('ar-EG').format(Number(n || 0));

  const params = new URLSearchParams(location.search);
  const rawIds = params.get('courseIds') || params.get('courseId') || '';
  const ids = [...new Set(rawIds.split(',').map(x => decodeURIComponent(x).trim()).filter(Boolean))];
  const rows = [];

  for (const id of ids.slice(0, 20)) {
    try {
      const s = await P.getDoc(P.doc(P.db, 'courses', id));
      if (s.exists() && s.data().published === true) rows.push({ id, ...s.data() });
    } catch (_) {}
  }

  const courseField = document.querySelector('#payment-course');
  const amountField = document.querySelector('#payment-amount');
  if (courseField) {
    courseField.value = rows.map(x => x.id).join(',');
    courseField.readOnly = true;
  }

  if (rows.length && amountField && !Number(amountField.value)) {
    amountField.value = String(rows.reduce((sum, x) => sum + Number(x.price || 0), 0));
  }

  let summary = document.querySelector('#payment-order-summary');
  if (!summary) {
    summary = document.createElement('section');
    summary.id = 'payment-order-summary';
    summary.className = 'platform-panel';
    summary.style.margin = '0 0 16px';
    form.parentElement?.insertBefore(summary, form);
  }
  summary.innerHTML = rows.length
    ? '<h3 style="margin-top:0">تفاصيل الطلب</h3><div class="platform-grid platform-grid-2">' +
      rows.map(x => '<div class="app-notice"><b>'+esc(x.title)+'</b><br><span>'+money(x.price)+' ج.م</span><br><small>'+esc(x.teacherName||'')+'</small></div>').join('') +
      '</div><p style="margin:12px 0 0"><b>الإجمالي من قائمة الأسعار: '+money(rows.reduce((sum,x)=>sum+Number(x.price||0),0))+' ج.م</b></p>'
    : '<div class="platform-empty">لم يتم تحديد كورس. اكتب معرّف الكورس في الحقل أو ارجع للسلة.</div>';

  if (!rows.length) {
    const fallback = courseField?.value?.trim();
    if (fallback) {
      try {
        const s = await P.getDoc(P.doc(P.db,'courses',fallback));
        if (s.exists()) rows.push({ id:fallback, ...s.data() });
      } catch (_) {}
    }
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const file = document.querySelector('#payment-receipt')?.files?.[0];
    const btn = document.querySelector('#payment-submit');
    if (!file) return P.messageBox('ارفع صورة الإيصال.');
    if (!rows.length) return P.messageBox('اختر كورسًا واحدًا على الأقل.');

    P.setButtonBusy(btn, true, 'جاري رفع الإيصال...');
    try {
      const upload = await P.uploadCloudinary(file, {
        resourceType: 'image',
        folder: 'youssef-alaa-academy/payments'
      });

      const amount = Number(document.querySelector('#payment-amount')?.value || 0);
      if (amount <= 0) throw new Error('اكتب مبلغ الدفع الصحيح.');

      const items = rows.map(x => ({
        courseId: x.id,
        title: x.title || '',
        teacherId: x.teacherId || null,
        catalogPrice: Number(x.price || 0)
      }));

      await P.addDoc(P.collection(P.db, 'paymentSubmissions'), {
        studentUid: P.auth.currentUser.uid,
        studentName: u.displayName || '',
        courseId: rows.length === 1 ? rows[0].id : null,
        courseIds: rows.map(x => x.id),
        items,
        amount,
        method: document.querySelector('#payment-method')?.value || '',
        reference: document.querySelector('#payment-reference')?.value.trim() || '',
        receiptUrl: upload.secure_url,
        receiptPublicId: upload.public_id,
        senderPhone: document.querySelector('#sender-phone')?.value.trim() || '',
        status: 'pending',
        createdAt: P.serverTimestamp(),
        updatedAt: P.serverTimestamp()
      });

      await P.logActivity('payment_submitted', { courseIds: rows.map(x => x.id), amount });
      localStorage.removeItem('ysa_cart');
      P.messageBox('تم إرسال الدفع للمراجعة. لن يتم تفعيل المحتوى قبل اعتماد الإدارة.', 'success');
      form.reset();
      if (courseField) courseField.value = rows.map(x => x.id).join(',');
    } catch (err) {
      P.messageBox(err.message || 'تعذر إرسال الدفع.');
    } finally {
      P.setButtonBusy(btn, false);
    }
  });
});