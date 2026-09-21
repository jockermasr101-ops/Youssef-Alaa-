import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  arrayUnion,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { FIREBASE_CONFIG, CLOUDINARY_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const ROUTES = {
  home: 'index.html',
  courses: 'physics.html',
  'courses-catalog': 'physics.html',
  'course-overview': 'physics.html',
  'cart': 'cart.html',
  'shopping-cart': 'cart.html',
  'my-courses': 'physics.html',
  'question-bank': 'exam.html',
  'quizzes-and-question-bank': 'exam.html',
  'my-exams': 'exam.html',
  'honor-board': 'leaderboard.html',
  'top-students': 'leaderboard.html',
  'profile': 'account.html',
  'help-center': 'support.html',
  'faq': 'support.html',
  'contact-us': 'support.html',
  'student-reviews': 'index.html',
  'accreditations': 'index.html',
  'ai-tutor': 'assistant.html',
  'redeem-code': 'activation.html',
  'register': 'login.html',
  'privacy-policy': 'privacy.html',
  'terms-and-policies': 'terms.html',
  'terms-of-service': 'terms.html',
  'order-success': 'payment.html',
  login: 'login.html',
  signup: 'login.html',
  dashboard: 'student-dashboard.html',
  'student-learning-portal': 'student-dashboard.html',
  'student-dashboard': 'student-dashboard.html',
  'teacher-dashboard': 'teacher-dashboard.html',
  overview: 'teacher-dashboard.html',
  'upload-lessons': 'teacher-upload.html',
  'manage-quizzes': 'teacher-question-bank.html',
  'student-analytics': 'teacher-students.html',
  'subscriptions-finance': 'teacher-wallet.html',
  'support-tickets': 'support.html',
  settings: 'account.html',
  notifications: 'notifications.html',
  'exam-center': 'exam.html',
  'exam-interface': 'exam.html',
  'exam-summary': 'exam.html',
  'exam-instructions': 'exam.html',
  'doubt-forum': 'assistant.html',
  'ai-assistant': 'assistant.html',
  'learning-resources': 'lesson.html',
  'study-room': 'lesson.html',
  lesson: 'lesson.html',
  'course-lesson': 'lesson.html',
  checkout: 'payment.html',
  payment: 'payment.html',
  activation: 'activation.html',
  'activate-code': 'activation.html',
  'my-account': 'account.html',
  account: 'account.html',
  leaderboard: 'leaderboard.html',
  performance: 'student-performance.html',
  support: 'support.html',
  'support-center': 'support.html',
  terms: 'terms.html',
  privacy: 'privacy.html',
  admin: 'admin-dashboard.html',
  'admin-dashboard': 'admin-dashboard.html',
  'owner-dashboard': 'admin-dashboard.html',
  'admin-users': 'admin-users.html',
  'admin-teachers': 'admin-teachers.html',
  'admin-content': 'admin-content.html',
  'admin-finance': 'admin-finance.html',
  'admin-promo': 'admin-promo.html',
  'admin-security': 'admin-security.html',
  'admin-payments': 'admin-payments.html',
  'teacher-promo': 'teacher-promo.html',
  'teacher-apply': 'teacher-apply.html',
  'teacher-courses': 'teacher-courses.html',
  'teacher-question-bank': 'teacher-question-bank.html',
  'teacher-students': 'teacher-students.html',
  'teacher-schedule': 'teacher-schedule.html',
  'teacher-wallet': 'teacher-wallet.html',
  wallet: 'teacher-wallet.html'
};

const ROLE_LABELS = {
  student: 'طالب',
  teacher: 'مدرس',
  ta: 'مساعد مدرس',
  admin: 'مدير',
  owner: 'المالك'
};

function go(path) {
  const clean = String(path || '').replace(/^\//, '');
  window.location.href = clean || 'index.html';
}

function routeFromElement(el) {
  const path = el.getAttribute('data-path');
  if (path && ROUTES[path]) return ROUTES[path];
  const href = el.getAttribute('href');
  if (href && href !== '#') return href;
  return null;
}

function installNavigation() {
  document.querySelectorAll('[data-path]').forEach((el) => {
    if (el.dataset.platformNavBound === '1') return;
    el.dataset.platformNavBound = '1';
    el.addEventListener('click', (event) => {
      const href = routeFromElement(el);
      if (!href) return;
      event.preventDefault();
      go(href);
    });
  });
  document.querySelectorAll('a[href="#"]').forEach((el) => {
    if (el.hasAttribute('data-path')) return;
    el.addEventListener('click', (event) => event.preventDefault());
  });
}

function isProtectedPage() {
  const kind = document.body?.dataset?.protected;
  return Boolean(kind);
}

function requiredRoles() {
  const kind = document.body?.dataset?.protected;
  if (kind === 'admin') return ['admin', 'owner'];
  if (kind === 'teacher') return ['teacher', 'ta', 'admin', 'owner'];
  return ['student', 'teacher', 'ta', 'admin', 'owner'];
}

async function getAppUser(firebaseUser = auth.currentUser) {
  if (!firebaseUser) return null;
  const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!snap.exists()) return null;
  return { uid: firebaseUser.uid, ...snap.data() };
}

function friendlyAuthError(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
    'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل.',
    'auth/weak-password': 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.',
    'auth/too-many-requests': 'تم إيقاف المحاولات مؤقتًا. حاول لاحقًا.',
    'auth/network-request-failed': 'تعذر الاتصال بالإنترنت. حاول مرة أخرى.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب.',
    'auth/missing-password': 'اكتب كلمة المرور.'
  };
  return map[code] || error?.message || 'حدث خطأ غير متوقع.';
}

function messageBox(text, type = 'error') {
  let box = document.getElementById('platform-message-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'platform-message-box';
    document.body.appendChild(box);
  }
  box.className = `platform-message ${type}`;
  box.textContent = text;
  box.hidden = false;
  clearTimeout(box._timer);
  box._timer = setTimeout(() => { box.hidden = true; }, 6500);
}

function setButtonBusy(button, busy, busyText = 'جاري المعالجة...') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText = button.innerText;
    button.dataset.originalDisabled = button.disabled ? '1' : '0';
    button.innerText = busyText;
    button.disabled = true;
  } else {
    button.disabled = button.dataset.originalDisabled === '1';
    if (button.dataset.originalText) button.innerText = button.dataset.originalText;
  }
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').replace(/^\+20/, '0');
}

function validEgyptianPhone(phone) {
  return /^(01)(0|1|2|5)\d{8}$/.test(normalizePhone(phone));
}

function validNationalId(id) {
  return /^\d{14}$/.test(String(id || '').trim());
}

function fullNameLooksFourPart(name) {
  const value = String(name || '').trim();
  const parts = value.split(/\s+/).filter(Boolean);
  return parts.length >= 4 && /^[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\s]+$/.test(value);
}

function nowMs() { return Date.now(); }

async function logActivity(type, details = {}) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, 'activityLogs'), {
      uid: user.uid,
      type,
      page: location.pathname.split('/').pop() || 'index.html',
      details,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('activity log skipped', e);
  }
}

async function setUserDoc(uid, data, merge = true) {
  await setDoc(doc(db, 'users', uid), data, { merge });
}

function renderAuthState(user, appUser) {
  document.querySelectorAll('[data-guest-only]').forEach(el => { el.hidden = !!user; });
  document.querySelectorAll('[data-auth-only]').forEach(el => { el.hidden = !user; });
  document.querySelectorAll('[data-role]').forEach(el => {
    const roles = String(el.dataset.role || '').split(',').map(s => s.trim()).filter(Boolean);
    el.hidden = !appUser || (roles.length > 0 && !roles.includes(appUser.role));
  });
  if (appUser) {
    document.querySelectorAll('[data-user-field]').forEach(el => {
      const field = el.dataset.userField;
      const value = field === 'roleLabel' ? (ROLE_LABELS[appUser.role] || appUser.role) : appUser[field];
      if (value != null && value !== '') el.textContent = value;
    });
  }
}

async function enforceProtection(firebaseUser) {
  if (!isProtectedPage()) return;
  if (!firebaseUser) {
    go('login.html');
    return;
  }
  const appUser = await getAppUser(firebaseUser);
  if (!appUser) {
    await signOut(auth);
    go('login.html');
    return;
  }
  if ((appUser.role === 'teacher' || appUser.role === 'ta') && appUser.status && appUser.status !== 'active') {
    await signOut(auth);
    messageBox('طلب حساب المدرس ما زال قيد المراجعة من الإدارة.');
    setTimeout(() => go('login.html'), 1000);
    return;
  }
  if (appUser.status === 'suspended') {
    await signOut(auth);
    messageBox('الحساب موقوف حاليًا. تواصل مع الإدارة.');
    setTimeout(() => go('login.html'), 900);
    return;
  }
  if (appUser.role === 'student' && appUser.status === 'pending') {
    await signOut(auth);
    messageBox('حسابك ما زال قيد المراجعة. سيظهر لك الدخول بعد اعتماد الإدارة.');
    setTimeout(() => go('login.html'), 1000);
    return;
  }
  const roles = requiredRoles();
  if (!roles.includes(appUser.role)) {
    messageBox('لا توجد صلاحية للدخول إلى هذه الصفحة.');
    setTimeout(() => go('index.html'), 900);
  }
}

async function uploadCloudinary(file, { onProgress, resourceType = 'auto', folder = CLOUDINARY_CONFIG.folder } = {}) {
  if (!file) throw new Error('لم يتم اختيار ملف.');
  if (!CLOUDINARY_CONFIG.cloudName || !CLOUDINARY_CONFIG.uploadPreset) {
    throw new Error('إعدادات Cloudinary غير مكتملة في config.js.');
  }
  const safeType = ['auto', 'image', 'video', 'raw'].includes(resourceType) ? resourceType : 'auto';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${safeType}/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  if (folder) form.append('folder', folder);
  form.append('context', `original_name=${encodeURIComponent(file.name)}|uploaded_by=${auth.currentUser?.uid || 'guest'}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      const response = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && response?.secure_url) resolve(response);
      else reject(new Error(response?.error?.message || `فشل رفع الملف (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('تعذر الاتصال بـ Cloudinary.'));
    xhr.send(form);
  });
}

function buildField({ id, label, type = 'text', placeholder = '', required = true }) {
  const wrap = document.createElement('div');
  wrap.className = 'platform-added-field';
  wrap.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="${type}" placeholder="${placeholder}" ${required ? 'required' : ''}/>`;
  return wrap;
}

function enhanceRegistrationForm() {
  const form = document.getElementById('form-register');
  if (!form || document.getElementById('reg-national-id')) return;
  const nameLabel = form.querySelector('label[for="reg-name"]');
  if (nameLabel) nameLabel.textContent = 'الاسم الكامل رباعي باللغة العربية (مطابق للبطاقة)';
  const nameInput = document.getElementById('reg-name');
  if (nameInput) nameInput.placeholder = 'الاسم الرباعي كما في بطاقة الرقم القومي';

  const existingPhoneRow = document.getElementById('reg-parent-phone')?.closest('.grid');
  const extra = document.createElement('div');
  extra.className = 'platform-added-fields';
  extra.append(
    buildField({ id: 'reg-parent2-phone', label: 'رقم ولي الأمر الثاني (الأم)', type: 'tel', placeholder: '01X XXXX XXXX', required: false }),
    buildField({ id: 'reg-national-id', label: 'الرقم القومي للطالب', type: 'text', placeholder: '14 رقمًا', required: true }),
    buildField({ id: 'reg-governorate', label: 'المحافظة', placeholder: 'مثال: المنيا' }),
    buildField({ id: 'reg-city', label: 'المدينة / المركز', placeholder: 'مثال: المنيا' }),
    buildField({ id: 'reg-school', label: 'المدرسة', placeholder: 'اسم المدرسة' }),
    buildField({ id: 'reg-email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@email.com' }),
    buildField({ id: 'reg-password-confirm', label: 'تأكيد كلمة المرور', type: 'password', placeholder: 'أعد كتابة كلمة المرور' }),
    buildField({ id: 'reg-id-image', label: 'صورة واضحة لبطاقة الرقم القومي', type: 'file', placeholder: '' })
  );
  if (existingPhoneRow) existingPhoneRow.insertAdjacentElement('afterend', extra);
  else form.prepend(extra);
  const emailInput = document.getElementById('reg-email');
  if (emailInput) emailInput.dir = 'ltr';
  const idInput = document.getElementById('reg-national-id');
  if (idInput) idInput.inputMode = 'numeric';
}

async function bindAuthForms() {
  enhanceRegistrationForm();
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');

  if (loginForm && !loginForm.dataset.platformBound) {
    loginForm.dataset.platformBound = '1';
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = loginForm.querySelector('button[type="submit"]');
      setButtonBusy(button, true, 'جاري تسجيل الدخول...');
      try {
        let identifier = document.getElementById('login-identifier')?.value.trim() || '';
        const password = document.getElementById('login-password')?.value || '';
        if (!identifier || !password) throw new Error('اكتب بيانات الدخول كاملة.');
        if (!identifier.includes('@')) {
          const q = query(collection(db, 'users'), where('studentPhone', '==', normalizePhone(identifier)), limit(1));
          const snap = await getDocs(q);
          if (snap.empty) throw new Error('لم نجد حسابًا مرتبطًا برقم الهاتف. استخدم البريد الإلكتروني.');
          identifier = snap.docs[0].data().email;
        }
        const cred = await signInWithEmailAndPassword(auth, identifier, password);
        const user = await getAppUser(cred.user);
        if (!user) throw new Error('تم تسجيل الدخول، لكن بيانات الحساب غير مكتملة. تواصل مع الإدارة.');
        if (user.status === 'suspended') {
          await signOut(auth);
          throw new Error('الحساب موقوف حاليًا. تواصل مع الإدارة.');
        }
        await logActivity('login');
        if (user.role === 'owner' || user.role === 'admin') go('admin-dashboard.html');
        else if (user.role === 'teacher' || user.role === 'ta') go('teacher-dashboard.html');
        else go('student-dashboard.html');
      } catch (error) {
        messageBox(friendlyAuthError(error));
      } finally {
        setButtonBusy(button, false);
      }
    });
  }

  if (registerForm && !registerForm.dataset.platformBound) {
    registerForm.dataset.platformBound = '1';
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = registerForm.querySelector('button[type="submit"]');
      setButtonBusy(button, true, 'جاري إنشاء الحساب...');
      let cred = null;
      try {
        const displayName = document.getElementById('reg-name')?.value.trim() || '';
        const studentPhone = normalizePhone(document.getElementById('reg-student-phone')?.value.trim() || '');
        const parentPhone = normalizePhone(document.getElementById('reg-parent-phone')?.value.trim() || '');
        const parentPhone2 = normalizePhone(document.getElementById('reg-parent2-phone')?.value.trim() || '');
        const nationalId = document.getElementById('reg-national-id')?.value.trim() || '';
        const governorate = document.getElementById('reg-governorate')?.value.trim() || '';
        const city = document.getElementById('reg-city')?.value.trim() || '';
        const school = document.getElementById('reg-school')?.value.trim() || '';
        const email = document.getElementById('reg-email')?.value.trim() || '';
        const password = document.getElementById('reg-password')?.value || '';
        const confirm = document.getElementById('reg-password-confirm')?.value || '';
        const file = document.getElementById('reg-id-image')?.files?.[0] || null;
        const grade = document.getElementById('reg-grade')?.value || '';
        const track = document.getElementById('reg-track')?.value || '';
        const terms = document.getElementById('agree-terms')?.checked;

        if (!fullNameLooksFourPart(displayName)) throw new Error('اكتب الاسم الرباعي كاملًا كما هو في البطاقة.');
        if (!validEgyptianPhone(studentPhone)) throw new Error('رقم هاتف الطالب غير صحيح.');
        if (!validEgyptianPhone(parentPhone)) throw new Error('رقم ولي الأمر الأساسي غير صحيح.');
        if (parentPhone2 && !validEgyptianPhone(parentPhone2)) throw new Error('رقم ولي الأمر الثاني غير صحيح.');
        if (!validNationalId(nationalId)) throw new Error('الرقم القومي يجب أن يكون 14 رقمًا.');
        if (!governorate || !city || !school) throw new Error('أكمل المحافظة والمدينة والمدرسة.');
        if (!email) throw new Error('اكتب البريد الإلكتروني.');
        if (password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
        if (password !== confirm) throw new Error('تأكيد كلمة المرور غير مطابق.');
        if (!file) throw new Error('ارفع صورة واضحة لبطاقة الرقم القومي.');
        if (!terms) throw new Error('يجب الموافقة على الشروط والأحكام.');

        cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        const upload = await uploadCloudinary(file, { resourceType: 'image', folder: `${CLOUDINARY_CONFIG.folder}/identity` });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email,
          displayName,
          role: 'student',
          status: 'pending',
          studentPhone,
          parentPhone,
          parentPhone2,
          nationalId,
          idCardImageUrl: upload.secure_url,
          idCardImagePublicId: upload.public_id,
          grade,
          track,
          governorate,
          city,
          school,
          reviewState: 'pending',
          points: 0,
          streak: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await logActivity('registration_submitted', { status: 'pending' });
        await signOut(auth);
        registerForm.reset();
        messageBox('تم إنشاء الحساب وإرساله للمراجعة. سيتم تفعيل الحساب من الإدارة بعد التحقق من البيانات.', 'success');
        document.getElementById('tab-login')?.click();
      } catch (error) {
        if (cred?.user) {
          try { await deleteUser(cred.user); } catch (_) {}
        }
        messageBox(friendlyAuthError(error));
      } finally {
        setButtonBusy(button, false);
      }
    });
  }

  const reset = document.getElementById('forgot-password-btn');
  if (reset && !reset.dataset.platformBound) {
    reset.dataset.platformBound = '1';
    reset.addEventListener('click', async () => {
      const email = document.getElementById('login-identifier')?.value.trim();
      if (!email || !email.includes('@')) {
        messageBox('اكتب البريد الإلكتروني أولًا ثم اضغط استرجاع كلمة المرور.');
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        messageBox('تم إرسال رابط استرجاع كلمة المرور إلى البريد الإلكتروني.', 'success');
      } catch (e) {
        messageBox(friendlyAuthError(e));
      }
    });
  }
}

function initLogout() {
  document.querySelectorAll('#platform-logout, [data-logout]').forEach(btn => {
    if (btn.dataset.platformBound === '1') return;
    btn.dataset.platformBound = '1';
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      await logActivity('logout');
      await signOut(auth);
      go('index.html');
    });
  });
}


async function registerStudentDevice(appUser) {
  if (!appUser || appUser.role !== 'student' || !auth.currentUser) return true;
  try {
    let deviceId = localStorage.getItem('ysa_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('ysa_device_id', deviceId);
    }

    const uid = auth.currentUser.uid;
    const storedSlot = Number(localStorage.getItem('ysa_device_slot') || 0);
    const slots = [1, 2];
    const preferred = storedSlot >= 1 && storedSlot <= 2 ? [storedSlot, ...slots.filter(x => x !== storedSlot)] : slots;

    for (const slot of preferred) {
      const ref = doc(db, 'deviceSessions', `${uid}_${slot}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const existing = snap.data();
        if (existing.uid === uid && existing.deviceId === deviceId) {
          await updateDoc(ref, { lastSeenAt: serverTimestamp(), userAgent: navigator.userAgent.slice(0, 180) });
          localStorage.setItem('ysa_device_slot', String(slot));
          return true;
        }
        continue;
      }

      await setDoc(ref, {
        uid,
        deviceId,
        slot,
        userAgent: navigator.userAgent.slice(0, 180),
        label: navigator.userAgent.slice(0, 120),
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      });
      localStorage.setItem('ysa_device_slot', String(slot));
      return true;
    }

    await signOut(auth);
    messageBox('هذا الحساب مسجل بالفعل على جهازين. ألغِ أحد الأجهزة من الإدارة قبل تسجيل جهاز جديد.');
    setTimeout(() => go('login.html'), 900);
    return false;
  } catch (e) {
    console.warn('device registration', e);
    messageBox('تعذر تسجيل الجهاز الآن. حاول مرة أخرى.');
    return false;
  }
}

async function init() {
  installNavigation();
  await bindAuthForms();
  initLogout();
  onAuthStateChanged(auth, async (firebaseUser) => {
    try {
      const appUser = await getAppUser(firebaseUser);
      renderAuthState(firebaseUser, appUser);
      await enforceProtection(firebaseUser);
      await registerStudentDevice(appUser);
      window.dispatchEvent(new CustomEvent('youssef-auth-ready', { detail: { firebaseUser, appUser } }));
    } catch (error) {
      console.error(error);
      messageBox('حدث خطأ أثناء قراءة بيانات الحساب. راجع قواعد Firestore.');
    }
  });

  window.YoussefAlaaPlatform = {
    auth,
    db,
    app,
    go,
    ROUTES,
    ROLE_LABELS,
    Timestamp,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    getDoc,
    getDocs,
    doc,
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    runTransaction,
    increment,
    arrayUnion,
    uploadCloudinary,
    getAppUser,
    logActivity,
    setUserDoc,
    messageBox,
    setButtonBusy,
    normalizePhone,
    validEgyptianPhone,
    signOut: () => signOut(auth)
  };
}

init().catch((error) => {
  console.error(error);
  messageBox('حدث خطأ أثناء تهيئة المنصة. راجع إعدادات Firebase وملف config.js.');
});
