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
- [ ] واجهة الموظفين لم تُنشر إلى GitHub Pages. يجب بناء ملفات الموقع بإعدادات `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` عبر مسار نشر موثوق؛ لم يوجد ملف إعداد محلي سوى `.env.example` في هذا الفحص، لذا لا تفترض أن القيم موجودة محليًا. ثم تحقق من تشغيل النسخة على Pages قبل النشر.
- [ ] Staff UI has not been published to GitHub Pages. Build the site with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from a trusted deployment configuration; `.env.example` was the only `.env*` file found locally, so do not assume local values are present. Verify the Pages version before publishing.
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
