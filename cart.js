window.addEventListener('youssef-auth-ready', async () => {
  const P = window.YoussefAlaaPlatform;
  const host = document.querySelector('#cart-root');
  if (!P || !host) return;

  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const money = n => new Intl.NumberFormat('ar-EG').format(Number(n || 0));
  const readCart = () => {
    try {
      const value = JSON.parse(localStorage.getItem('ysa_cart') || '[]');
      return Array.isArray(value) ? [...new Set(value.map(String))].filter(Boolean) : [];
    } catch (_) { return []; }
  };
  const saveCart = ids => localStorage.setItem('ysa_cart', JSON.stringify(ids));

  async function render() {
    try {
      const ids = readCart();
      const rows = [];
      for (const id of ids) {
        const s = await P.getDoc(P.doc(P.db,'courses',id));
        if (s.exists() && s.data().published === true) rows.push({ id, ...s.data() });
      }
      const total = rows.reduce((sum, x) => sum + Number(x.price || 0), 0);
      const idsParam = rows.map(x => x.id).join(',');

      host.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><h2>سلة الشراء</h2><button class="platform-btn" id="clear-cart">تفريغ السلة</button></div>' +
        '<div class="platform-grid platform-grid-2" style="margin-top:12px">' +
        (rows.map(x => '<article class="platform-panel"><div style="display:flex;justify-content:space-between;gap:10px"><b>'+esc(x.title)+'</b><button class="platform-btn danger" data-remove="'+esc(x.id)+'">حذف</button></div><p style="color:#5b6072">'+esc(x.teacherName||'')+'</p><strong>'+money(x.price)+' ج.م</strong></article>').join('') || '<div class="platform-empty">السلة فارغة.</div>') +
        '</div>' +
        '<div class="platform-panel" style="margin-top:12px"><b>الإجمالي: '+money(total)+' ج.م</b><div class="platform-actions" style="margin-top:10px"><button id="checkout-cart" class="platform-btn primary" '+(rows.length?'':'disabled')+'>الانتقال للدفع</button></div></div>';

      host.querySelector('#clear-cart').onclick = () => { saveCart([]); render(); };
      host.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
        saveCart(readCart().filter(id => id !== b.dataset.remove));
        render();
      });
      host.querySelector('#checkout-cart').onclick = () => {
        if (!rows.length) return;
        location.href = '/payment.html?courseIds=' + encodeURIComponent(idsParam);
      };
    } catch (e) {
      host.innerHTML = '<div class="platform-empty">تعذر قراءة السلة. حاول تحديث الصفحة.</div>';
    }
  }

  render();
});