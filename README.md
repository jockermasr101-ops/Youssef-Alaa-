# منصة يوسف علاء التعليمية — Cloudflare Ready

هذه نسخة Static بدون npm/Node build، مبنية على أكواد Stitch الأصلية مع تحويل جزء كبير منها إلى وظائف حقيقية عبر Firebase وCloudinary.

## ما تم ربطه الآن
- Firebase Authentication: تسجيل/دخول بالبريد وكلمة المرور، استرجاع كلمة المرور، أدوار وصلاحيات.
- Firestore: users, courses, lessons, enrollments, exams, questions, examAttempts, promoCodes, promoRedemptions, transactions, withdrawalRequests, notifications, activityLogs, deviceSessions, supportTickets, referrals, lessonProgress, paymentSubmissions.
- Cloudinary: صور الهوية، الصور، الفيديوهات، PDF/Word والملفات والوثائق وإيصالات الدفع باستخدام Upload Preset.
- Cloudflare Pages: نشر مباشر بدون build.

## الصفحات الإضافية
- إدارة الطلاب: admin-users.html
- إدارة المدرسين: admin-teachers.html
- إدارة المحتوى: admin-content.html
- إدارة المدفوعات: admin-payments.html
- المالية والسحب: admin-finance.html
- الأكواد: admin-promo.html و teacher-promo.html
- الأمان والسجل: admin-security.html
- كورسات المدرس: teacher-courses.html
- بنك الأسئلة والامتحانات: teacher-question-bank.html
- طلاب المدرس: teacher-students.html

## Cloudinary
Cloud Name: gf27ad64
Upload Preset: e112csfr
لا تضع API Secret أو أي Service Account داخل الموقع.

## أول Owner
أنشئ حساب المالك أولًا من Firebase Authentication ثم أنشئ مستندًا في Firestore:
users/{UID}
واجعله role=owner وstatus=active. لا توجد طريقة آمنة داخل الواجهة تمنح نفسها دور Owner.

## Cloudflare Pages
لا يوجد Build Command. ارفع المجلد كما هو، أو اربطه بالمستودع مع Framework preset=None.

## ملاحظات مهمة قبل Production
- Free tiers لها حصص وليست غير محدودة.
- SMS OTP ليس جزءًا من خطة الصفر الحالية؛ تسجيل البريد/كلمة المرور مستخدم الآن.
- رفع وتشغيل الفيديو من Cloudinary يعمل في النسخة الحالية، لكن سياسة منع مشاركة الشاشة/التسجيل لا يمكن ضمانها بالكامل من المتصفح وحده.
- تصحيح الامتحان الآلي موجود للأنواع الموضوعية، بينما essay/file تُسجل للتصحيح اليدوي. إخفاء الإجابات الصحيحة عن عميل متصفح متحكم فيه بالكامل يحتاج Backend موثوق/وظائف خادمية قبل اعتبار الاختبارات عالية المخاطر Production.
- حد الأجهزة يُمكن مراقبته من deviceSessions، لكنه يحتاج Backend/Rules إضافية إذا أردنا إنفاذًا صارمًا ضد عميل متلاعب.
