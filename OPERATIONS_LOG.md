# سجل التشغيل والنشر — Khayal Motors
# Operations log and deployment runbook — Khayal Motors

> يُحدَّث هذا السجل عند كل خطوة تخص هذا الطلب. لا يثبت سجلّ الأوامر وحده نجاح النشر؛ يجب توثيق إيصال أو فحص حي. لا تُدرج أي أسرار أو كلمات مرور أو رموز وصول.
>
> Update this log for each step in this request. A command log alone does not prove deployment; record a receipt or live check. Never include secrets, passwords, or access tokens.

## النطاق / Scope

- المطلوب: إنشاء حسابات الموظفين من داخل لوحة المدير فقط، مع إدخال كلمة مرور وتأكيدها وحفظ ملف الموظف وصلاحياته.
- Requested: create staff accounts inside the manager dashboard only, with password and confirmation fields and reliable saving of employee profile and permissions.
- واجهة الموقع مستضافة عبر GitHub Pages وفق إعداد Pages الحي: `https://khayal-1.github.io/elkhayal-motors/`، المصدر `main` في جذر المستودع. لا يُستخدم Vercel لهذا النشر.
- Live GitHub Pages configuration reports `https://khayal-1.github.io/elkhayal-motors/`, source branch `main`, repository root. Vercel is not the frontend deployment target.
- Supabase project: `ztkiavqmbswyxkmddtno` (`El Khayal Motors Website`).

## الحالة الحالية / Current status

- [x] كود واجهة المدير ودالة `manage-staff` موجودان محليًا على فرع `feature/manager-staff-accounts`؛ الأساس السابق `c0cc8a1` منشور على هذا الفرع. تغييرات العمل الإضافية الحالية لم تُرفع إلى `main`.
- [x] Manager UI and `manage-staff` source are present locally on `feature/manager-staff-accounts`; the earlier base commit `c0cc8a1` is on that branch. Current working changes have not been pushed to `main`.
- [x] إعداد GitHub Pages الحي جرى التحقق منه عبر GitHub API؛ `build_type=legacy`, source `main:/`.
- [x] Live GitHub Pages settings were checked through GitHub API: legacy build, source `main:/`.
- [ ] لم تُنشر `manage-staff`: قائمة الدوال الحية ما زالت تعرض `telegram-photo-upload` فقط. أوقفت محاولة إدخال المصدر الكامل في محرر المتصفح بعد أن فشل الإدخال، ولم أضغط زر النشر.
- [ ] `manage-staff` is not deployed: the live list still shows only `telegram-photo-upload`. I stopped the browser-editor attempt after full-source input failed; the Deploy button was not submitted.
- [ ] واجهة الموظفين لم تُنشر إلى GitHub Pages. الفحص الحي أعاد صفحة HTML من المصدر `main`، والصفحة تحمل `app.js` مباشرة؛ هذا الملف يستورد `src/supabase.js` الذي يستورد حزمة `@supabase/supabase-js`، بينما إعداد Pages الحالي legacy/static ولا يبني Vite. يلزم مسار بناء صالح وقيم إعداد عامة موثوقة قبل نشر نسخة bundle؛ لم تُجرَ تغييرات على `main`. يجب أثبت مسار بناء Vite متوافقًا مع GitHub Pages وجهّز إعدادَي `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` من مصدر نشر موثوق؛ لم يوجد ملف إعداد محلي سوى `.env.example` في هذا الفحص، لذا لا تفترض أن القيم موجودة محليًا. ثم تحقق من تشغيل النسخة على Pages قبل النشر.
- [ ] Staff UI has not been published to GitHub Pages. The live page serves the `main` HTML directly, which loads `app.js`; that file imports `src/supabase.js`, which imports `@supabase/supabase-js`, while Pages is configured as legacy/static and does not run Vite. A valid build route and trusted public build settings are needed before publishing a bundle; `main` has not been changed. Establish a GitHub Pages-compatible Vite build and trusted `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configuration; `.env.example` was the only `.env*` file found locally, so do not assume local values are present. Verify the Pages version before publishing.
- لا تُنشأ حسابات موظفين أثناء النشر أو الاختبار.
- Do not create employee accounts during deployment or testing.

## تغييرات قاعدة البيانات / Database migrations

| الملف / File | وجوده في المستودع / Repository | الحالة / Status |
|---|---|---|
| `supabase/migrations/202611210001_initial_foundation.sql` | متتبَّع في الفرع الأساسي / tracked in base branch | وجود الملف مؤكد؛ حالة تطبيقه لم تُتحقق في هذه الخطوة / file confirmed; application status not verified in this task |
| `supabase/migrations/202611210002_customer_requests_no_delete.sql` | متتبَّع / tracked | سبق تأكيد تطبيقه في مراجعة التشغيل، لكن لم يُعَد فحص سجل الترحيلات الحي هنا / previously recorded as applied; migration ledger not rechecked here |
| `supabase/migrations/202611210003_least_privilege_catalog_and_requests.sql` | متتبَّع / tracked | سبق تأكيد تطبيقه في مراجعة التشغيل، لكن لم يُعَد فحص سجل الترحيلات الحي هنا / previously recorded as applied; migration ledger not rechecked here |
| `supabase/migrations/202611210005_manager_staff_permissions.sql` | ملف محلي غير متتبَّع حاليًا / currently untracked local file | لا يوجد إثبات أنه طُبّق؛ لا تشغّله تلقائيًا ولا تعتبره مطبقًا / no evidence it was applied; do not run automatically or treat it as applied |

ملاحظة: وجود جدول `employee_permissions` وسياسات مرتبطة به ظهر في مراجعة سابقة، لكن لا يثبت ذلك أن ملف `202611210005_manager_staff_permissions.sql` بعينه طُبّق بالكامل. قبل أي ترحيل إضافي، افحص قاعدة المشروع وسجل الترحيلات لتجنب إعادة التطبيق أو تعارضه.

Note: a prior live review saw the `employee_permissions` table and related policies, but that does not prove this exact `202611210005_manager_staff_permissions.sql` file was fully applied. Inspect the project schema and migration ledger before any additional migration to avoid duplicate or conflicting changes.

## سجل الأوامر / Command record

### أوامر تحقق نُفذت / Verification commands executed

- `git remote -v` — نُفّذ؛ أظهر `origin` إلى `https://github.com/khayal-1/elkhayal-motors.git`.
- `git status --short --branch` — نُفّذ؛ أظهر تغييرات محلية غير ملتزمة وملف الترحيل 005 غير متتبَّع.
- `git branch -a` — نُفّذ؛ أظهر الفرع الحالي `feature/manager-staff-accounts` ووجود `main`.
- `git log --oneline --decorate -8` — نُفّذ؛ أظهر `c0cc8a1` على فرع الميزة والقاعدة المحلية `3dcaa30`؛ هذه ليست وحدها إثباتًا لحالة الخادم الأحدث.
- `git ls-remote --heads origin` — نُفّذ؛ أظهر الفرع البعيد `feature/manager-staff-accounts` عند `c0cc8a1` والفرع البعيد `main` عند `21bbebe348e09da4f933bcd921f74567ffb4a1e9`.
- `gh api repos/khayal-1/elkhayal-motors/pages` — نُفّذ؛ أكد عنوان GitHub Pages ومصدر `main:/`.
- `gh api repos/khayal-1/elkhayal-motors/contents/.github/workflows` — نُفّذ؛ أعاد 404، ولم يظهر مجلد workflow عبر هذا المسار.
- `npm run build` — نُفّذ على فرع الميزة؛ نجح Vite build وأنشأ `dist/`.
- `deno check supabase/functions/manage-staff/index.ts` — نُفّذ؛ اكتمل دون أخطاء فحص.
- `curl -sSIL --max-time 20 https://khayal-1.github.io/elkhayal-motors/` — نُفّذ؛ أعاد HTTP 200 من GitHub Pages.
- `curl -fsSL --max-time 20 https://khayal-1.github.io/elkhayal-motors/` — نُفّذ؛ أعاد HTML يحمّل `app.js` مباشرة.
- `curl -fsSL --max-time 20 https://khayal-1.github.io/elkhayal-motors/app.js` — نُفّذ؛ أظهر أن الملف الحي يستورد `./src/supabase.js`.
- `git show main:src/supabase.js` — نُفّذ؛ أظهر اعتماد الحزمة على متغيرات `import.meta.env` واستيراد `@supabase/supabase-js`؛ لم يُبنَ هذا المسار عبر Vite في إعداد Pages الحالي حسب إعداد legacy الموثق.
- `git add OPERATIONS_LOG.md` و`git diff --cached --check` — نُفّذا؛ التحقق من المسافات/التنسيق نجح.
- `git commit -m "Document staff deployment operations"` — نُفّذ؛ أنشأ commit التوثيق الأول `e2e99206b83e91b390fcccb9b5e987503a9ab3d9`.
- `git push origin HEAD:refs/heads/feature/manager-staff-accounts` — نُفّذ بنجاح؛ الإيصال أكد تحديث الفرع البعيد من `c0cc8a1` إلى `e2e9920`.
- `git ls-remote origin refs/heads/feature/manager-staff-accounts` — نُفّذ بعد الدفع؛ أعاد `e2e99206b83e91b390fcccb9b5e987503a9ab3d9`.

### أوامر نشر مقترحة ولم تُنفّذ / Suggested deployment commands, not run

```sh
supabase login
supabase functions deploy manage-staff --project-ref ztkiavqmbswyxkmddtno
```

الحالة: مقترح سابقًا فقط؛ لم يُشغَّل في سجل هذا العمل. يتطلب مسار CLI مصادقة صالحة. لا تضع Personal Access Token أو أي سر في الأوامر/الدردشة أو في هذا الملف.

Status: previously suggested only; not run during this work. The CLI route requires valid authentication. Never place a Personal Access Token or other secret in commands, chat, or this file.

## أعطال وعوائق موثقة / Recorded failures and blockers

- محاولات سابقة لإدارة نشر الدالة باستخدام الرمز المحفوظ انتهت برفض 401/JWT؛ لا يُعاد استخدام الرمز أو نسخه إلى محرر أو سطر أوامر. تفاصيل الأمر الحرفية لم تُحفظ، لذلك لا يُختلق أمر سابق.
- Earlier function deployment attempts using the stored token were rejected with 401/JWT errors. Do not reuse or copy it into an editor or command line. The exact command text was not retained, so no prior command is invented here.
- أظهر محرر Supabase عبر المتصفح مساحة تحرير واسم دالة وزر نشر، ولم يظهر فيها حقل مخصص آمن للـPersonal Access Token. لم يُرسل الرمز إلى الصفحة.
- The Supabase browser editor exposes source editing, a function name, and a deploy button; no dedicated secure Personal Access Token field was visible. The attempt to enter the full source failed and the editor became unresponsive; the Deploy button was not submitted, and no token was sent to the page.

## الخطوات التالية / Next steps

1. نشر `manage-staff` من محرر Supabase الرسمي بعد مراجعة كامل المصدر، مع تفعيل التحقق من JWT، ثم التحقق من ظهوره في قائمة الدوال واختبار OPTIONS/رفض الطلب غير المصرح به دون إنشاء حساب.
2. Deploy `manage-staff` through Supabase’s official editor after reviewing the full source, retaining JWT verification; confirm it appears in the live list and test OPTIONS/unauthorized rejection without creating an account.
3. بناء الواجهة مع قيم إعداد البناء الموجودة محليًا دون كشفها، والتحقق أن `dist/` ينتج ملفات قابلة للتشغيل على GitHub Pages بمسار المشروع `/elkhayal-motors/`.
4. Build the frontend with its existing local build settings without exposing them; verify `dist/` works under GitHub Pages’ `/elkhayal-motors/` project path.
5. مراجعة التغييرات ورفع التوثيق وحده أولًا إلى فرع الميزة. لا تنشر كود التطبيق إلى `main` إلا بعد التحقق من التوافق والموافقة/المسار المناسب.
6. Review changes and push documentation alone first to the feature branch. Do not publish app code to `main` until compatibility is verified and the appropriate release path is established.
7. بعد النشر إلى Pages، تحقق من صفحة الموقع والميزة من المصدر الحي، ثم وثّق الـcommit وعنوان Pages ونتيجة التحقق هنا. لا تنشئ حسابات موظفين دون طلب منفصل.
8. After a Pages release, verify the live site and feature, then record the commit, Pages URL, and verification result here. Do not create employee accounts without a separate request.

## تحديث تدقيق المستودع / Repository audit update

**21 Nov 2026, 12:20 Cairo / 21 نوفمبر 2026، 12:20 القاهرة**

- تحقق checkout نظيف لفرع `feature/manager-staff-accounts`؛ آخر commit قبل هذا التحديث `4a1ab47afb37b33f80e6843d5987724078c275d3` ويعدّل `OPERATIONS_LOG.md` فقط. لا يحتوي على نشر للدالة أو كود التطبيق.
- A clean checkout of `feature/manager-staff-accounts` was verified. Before this update its HEAD was `4a1ab47afb37b33f80e6843d5987724078c275d3`, changing `OPERATIONS_LOG.md` only. It does not deploy the function or contain the app-code changes.
- الملفات الوحيدة المتتبعة تحت `supabase/migrations/` في هذا الفرع هي `202611210001_initial_foundation.sql` و`202611210002_customer_requests_no_delete.sql` و`202611210003_least_privilege_catalog_and_requests.sql`. لم يُنفّذ أي SQL أو migration جديد أثناء هذا التدقيق.
- The only tracked files under `supabase/migrations/` on this branch are `202611210001_initial_foundation.sql`, `202611210002_customer_requests_no_delete.sql`, and `202611210003_least_privilege_catalog_and_requests.sql`. No SQL or migration was executed during this audit.
- يسجل هذا السجل أن تطبيق `001` غير متحقق هنا، وأن `002` و`003` سبق توثيق تطبيقهما في المراجعة السابقة. ملف `202611210005_manager_staff_permissions.sql` الذي شوهد في مساحة عمل محلية منفصلة غير موجود في الفرع البعيد الحالي، ولا يوجد دليل هنا على تطبيقه؛ لا تشغّله بناءً على اسمه أو وجوده المحلي وحده.
- This log records migration `001` as not verified here, and `002`/`003` as previously recorded applied. `202611210005_manager_staff_permissions.sql`, seen in a separate local worktree, is absent from this remote branch; its application is not established. Do not run it based only on its name or local presence.
- أُعيد التحقق من أن `package.json` يعرّف `npm run build` على أنه `vite build`. هذا لا يجعل GitHub Pages legacy يبني المشروع تلقائيًا؛ لا يزال نشر الواجهة غير مكتمل.
- Rechecked that `package.json` defines `npm run build` as `vite build`. That does not make legacy GitHub Pages build the project automatically; frontend publication remains incomplete.
- نتيجة النشر الحالية: `manage-staff` غير موجودة في قائمة Supabase الحية؛ محرر لوحة التحكم لم يقبل المصدر الكامل ولم يُرسل Deploy. لم تُنشأ حسابات موظفين، ولم يتغير `main` أو الموقع الحي.
- Current deployment result: `manage-staff` is absent from the live Supabase function list; the Dashboard editor did not accept the full source and no Deploy submission occurred. No staff accounts were created, and neither `main` nor the live website changed.

### أوامر التدقيق المنفذة / Audit commands executed

```sh
git clone --branch feature/manager-staff-accounts --single-branch https://github.com/khayal-1/elkhayal-motors.git motors-log
git status --short --branch
ls -la
sed -n '1,260p' OPERATIONS_LOG.md
git rev-parse HEAD
git show --stat --oneline -1
git ls-files 'supabase/migrations/*'
cat package.json
```

الحالة: نُفذت للقراءة والتحقق فقط؛ نجح الاستنساخ، وكانت شجرة العمل نظيفة، ولم تُغيّر ملفات التطبيق أو قاعدة البيانات.

Status: executed for read-only inspection; clone succeeded, the working tree was clean, and no app or database files were changed.
