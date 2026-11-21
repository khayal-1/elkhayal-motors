import { supabase, supabaseConfigured, getCurrentProfile } from './src/supabase.js';

/* =========================================================
   El Khayal Motors — app.js (Full SPA)
   Sections:
   1) State & Seed Data
   2) Auth & RBAC
   3) Storefront & Slider
   4) POS & Invoices
   5) Admin & Staff Monitoring
   6) UI & Sidebar (Router, Events, Init)
   ========================================================= */

/* =========================================================
   SECTION 1 — STATE & SEED DATA
   ========================================================= */

const DB = {
  USERS: 'ekm_users',
  BIKES: 'ekm_bikes',
  ORDERS: 'ekm_orders',
  INVOICES: 'ekm_invoices',
  FAVS: 'ekm_favs',
  CUSTOM_REQS: 'ekm_custom_requests',
  MESSAGES: 'ekm_messages',
  SESSION: 'ekm_session',
  SEEDED: 'ekm_seeded_v1'
};

const authRedirectUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;

const state = {
  user: null,
  route: 'home',
  search: '',
  filterCat: 'all',
  filterPrice: 'all',
  sidebarOpen: false,
  bikes: [],
  sales: [],
  contactMessages: [],
  requestReplies: [],
  contactReplies: [],
  staffProvisionResult: null,
  language: localStorage.getItem('ekm_language') === 'en' ? 'en' : 'ar'
};

const STAFF_PERMISSION_OPTIONS = [
  { key: 'catalog_view', label: 'عرض الكتالوج والمخزون', description: 'رؤية بيانات الدراجات غير المنشورة أيضًا.' },
  { key: 'catalog_manage', label: 'إدارة الدراجات والصور', description: 'إضافة وتعديل الدراجات ورفع الصور؛ يشمل العرض.' },
  { key: 'requests_view', label: 'عرض طلبات العملاء', description: 'رؤية الطلبات وتفاصيلها التي أرسلها العميل.' },
  { key: 'requests_manage', label: 'تحديث حالة الطلبات', description: 'عرض الطلبات وتغيير حالتها؛ لا يسمح بالحذف.' },
  { key: 'customer_data_view', label: 'رؤية أسماء وهواتف العملاء', description: 'لعملاء الطلبات التي يحق للموظف عرضها.' },
];
const PERMISSION_LABELS = Object.fromEntries(STAFF_PERMISSION_OPTIONS.map((item) => [item.key, item.label]));

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const money = (n) => Number(n || 0).toLocaleString('en-US') + ' ج.م';
const nowISO = () => new Date().toISOString();
const safeName = (s) => String(s || '').trim();
function whatsappNumber(value) {
  let digits = String(value || '').replace(/\\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '20' + digits.slice(1);
  return digits;
}
function contactActionLinks(person, message = '') {
  const phone = safeName(person.phone);
  const email = safeName(person.email);
  const wa = whatsappNumber(phone);
  const body = encodeURIComponent(message);
  const links = [];
  if (phone) {
    links.push(`<a class="btn btn-outline btn-sm" href="tel:${esc(phone)}"><i class="fa-solid fa-phone"></i> اتصال</a>`);
    links.push(`<a class="btn btn-outline btn-sm" href="sms:${esc(phone)}?body=${body}"><i class="fa-solid fa-comment-sms"></i> SMS</a>`);
  }
  if (wa) links.push(`<a class="btn btn-outline btn-sm" href="https://wa.me/${esc(wa)}?text=${body}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> واتساب</a>`);
  if (email) links.push(`<a class="btn btn-outline btn-sm" href="mailto:${esc(email)}?subject=${encodeURIComponent('El Khayal Motors')}&body=${body}"><i class="fa-solid fa-envelope"></i> بريد</a>`);
  return links.join(' ');
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const transientStore = new Map([
  [DB.USERS, []], [DB.BIKES, []], [DB.ORDERS, []], [DB.INVOICES, []],
  [DB.FAVS, {}], [DB.CUSTOM_REQS, []], [DB.MESSAGES, []]
]);
function get(key, fallback = []) { return transientStore.has(key) ? transientStore.get(key) : fallback; }
function set(key, val) { transientStore.set(key, val); }

/* ---------- Toast ---------- */
function toast(msg, type = 'info') {
  const el = $('#toast');
  if (!el) return;
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info'
  };
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> <span>${esc(msg)}</span>`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* =========================================================
   SECTION 2 — AUTH & RBAC
   ========================================================= */

function currentUser() { return state.user; }
function hasPermission(permission) {
  const user = currentUser();
  return !!user && (user.role === 'admin' || user.permissions?.includes(permission));
}
function hasAnyPermission(...permissions) { return permissions.some(hasPermission); }
function hasRequestAccess() { return hasAnyPermission('requests_view', 'requests_manage'); }
function pageNoPermission() {
  return '<div class="panel"><p>ليس لديك صلاحية لعرض هذا القسم. تواصل مع المدير إذا كنت تحتاجها.</p></div>';
}

async function login(email, password) {
  if (!supabaseConfigured) throw new Error('Supabase configuration is missing.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await getCurrentProfile(data.user.id);
  if (!profile) throw new Error('Supabase profile is missing for this account.');
  state.user = { ...profile, id: data.user.id, email: data.user.email };
  return state.user;
}

async function logout() {
  if (supabase) await supabase.auth.signOut();
  state.user = null;
  state.route = 'home';
  closeSidebar();
  render();
  toast('تم تسجيل الخروج', 'info');
}

async function signup({ name, email, phone, password }) {
  if (!supabaseConfigured) throw new Error('Supabase configuration is missing.');
  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
    options: { data: { full_name: safeName(name), phone: safeName(phone) }, emailRedirectTo: authRedirectUrl }
  });
  if (error) throw error;
  if (data.session && data.user) {
    const profile = await getCurrentProfile(data.user.id);
    if (!profile) throw new Error('Supabase profile is missing for this account.');
    state.user = { ...profile, id: data.user.id, email: data.user.email };
  }
  return { ok: true, requiresEmailConfirmation: !data.session, user: state.user };
}

function hasRole(...roles) {
  const u = currentUser();
  return !!u && roles.includes(u.role);
}

/* ---------- Sidebar Items (Role-based) ---------- */
function sidebarItems() {
  const u = currentUser();
  const pendingTotal = get(DB.CUSTOM_REQS).filter((r) => ['pending', 'reviewing'].includes(r.status)).length;

  if (!u) {
    return [
      { section: 'التسوق' },
      { route: 'home', label: 'الرئيسية', icon: 'fa-house' },
      { route: 'request', label: 'اطلب موتسيكلك', icon: 'fa-motorcycle' },
      { route: 'contact', label: 'تواصل معنا', icon: 'fa-headset' },
      { section: 'الحساب' },
      { route: 'login', label: 'تسجيل الدخول', icon: 'fa-right-to-bracket' },
      { route: 'signup', label: 'حساب جديد', icon: 'fa-user-plus' }
    ];
  }

  if (u.role === 'customer') {
    return [
      { section: 'التسوق' },
      { route: 'home', label: 'الرئيسية', icon: 'fa-house' },
      { route: 'request', label: 'اطلب موتسيكلك', icon: 'fa-motorcycle' },
      { route: 'contact', label: 'تواصل معنا', icon: 'fa-headset' },
      { section: 'حسابي' },
      { route: 'account', label: 'ملفي الشخصي', icon: 'fa-user' },
      { route: 'favorites', label: 'المفضلة', icon: 'fa-heart' },
      { route: 'orders', label: 'طلباتي', icon: 'fa-receipt' }
    ];
  }

  if (u.role === 'staff') {
    const items = [{ section: 'الموظف' }];
    if (hasAnyPermission('catalog_view', 'catalog_manage')) items.push({ route: 'inventory', label: 'المخزن والأسعار', icon: 'fa-boxes-stacked' });
    if (hasPermission('catalog_manage')) items.push({ route: 'manage-bikes', label: 'إدارة الدراجات', icon: 'fa-motorcycle' });
    if (hasRequestAccess()) items.push({ route: 'staff-orders', label: 'طلبات العملاء', icon: 'fa-clipboard-list', badge: pendingTotal || null });
    items.push({ section: 'المتجر' }, { route: 'home', label: 'عرض المتجر', icon: 'fa-store' });
    return items;
  }

  /* Admin */
  return [
    { section: 'الإدارة' },
    { route: 'dashboard', label: 'لوحة الإحصائيات', icon: 'fa-chart-line' },
    { section: 'البيع' },
    { route: 'pos', label: 'نقطة البيع POS', icon: 'fa-cash-register' },
    { route: 'inventory', label: 'المخزن والأسعار', icon: 'fa-boxes-stacked' },
    { section: 'الإدارة' },
    { route: 'manage-bikes', label: 'إدارة الدراجات', icon: 'fa-motorcycle' },
    { route: 'staff', label: 'الموظفين والأداء', icon: 'fa-users-gear' },
    { route: 'staff-orders', label: 'طلبات العملاء', icon: 'fa-clipboard-list', badge: pendingTotal || null },
    { section: 'المتجر' },
    { route: 'home', label: 'عرض المتجر', icon: 'fa-store' }
  ];
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  if (!nav) return;
  const active = state.route;
  const items = sidebarItems();
  let html = '';
  for (const it of items) {
    if (it.section) {
      html += `<div class="sidebar-section-title">${esc(it.section)}</div>`;
      continue;
    }
    const isActive = active === it.route ? 'active' : '';
    const badge = it.badge ? `<span class="badge">${it.badge}</span>` : '';
    html += `
      <a class="sidebar-link ${isActive}" data-nav="${esc(it.route)}" role="button" tabindex="0">
        <i class="fa-solid ${esc(it.icon)}"></i>
        <span>${esc(it.label)}</span>
        ${badge}
      </a>`;
  }
  nav.innerHTML = html;
}

function renderAccountArea() {
  const area = $('#accountArea');
  if (!area) return;
  const u = currentUser();
  if (!u) {
    area.innerHTML = `
      <button class="btn btn-ghost-light btn-sm" data-nav="login">
        <i class="fa-solid fa-right-to-bracket"></i> دخول
      </button>
      <button class="btn btn-primary btn-sm" data-nav="signup">
        <i class="fa-solid fa-user-plus"></i> حساب جديد
      </button>`;
    return;
  }
  const roleLabel = u.role === 'admin' ? 'مدير' : u.role === 'staff' ? 'موظف' : 'عميل';
  area.innerHTML = `
    <div class="user-chip">
      <div class="avatar">${esc((u.name || '?').charAt(0))}</div>
      <span class="name">${esc((u.name || '').split(' ')[0])}</span>
      <span class="role-badge">${roleLabel}</span>
    </div>
    <button class="btn btn-ghost-light btn-sm" data-nav="account">
      <i class="fa-solid fa-user"></i> حسابي
    </button>
    <button class="btn btn-primary btn-sm" id="logoutBtn" title="تسجيل الخروج">
      <i class="fa-solid fa-right-from-bracket"></i>
    </button>`;
}

/* =========================================================
   SECTION 3 — STOREFRONT & SLIDER
   ========================================================= */

function filteredBikes() {
  let bikes = state.bikes;
  const q = state.search.trim().toLowerCase();
  if (q) {
    bikes = bikes.filter((b) =>
      String(b.name).toLowerCase().includes(q) ||
      String(b.model).toLowerCase().includes(q)
    );
  }
  if (state.filterCat !== 'all') {
    bikes = bikes.filter((b) => b.category === state.filterCat);
  }
  if (state.filterPrice !== 'all') {
    const [min, max] = state.filterPrice.split('-').map(Number);
    bikes = bikes.filter((b) => b.price >= min && (max ? b.price <= max : true));
  }
  return bikes;
}

function productCard(b) {
  const u = currentUser();
  const favMap = get(DB.FAVS, {});
  const favs = u ? (favMap[u.id] || []) : [];
  const isFav = favs.includes(b.id);
  const imgs = (b.images && b.images.length) ? b.images : [];
  const first = imgs[0];
  const dots = imgs.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');

  const stockClass = b.stock <= 0 ? 'out' : b.stock <= 2 ? 'low' : 'in';
  const stockText = b.stock <= 0 ? 'غير متوفر' : b.stock <= 2 ? `آخر ${b.stock} قطع` : 'متوفر';

  return `
    <article class="product-card" data-bike-id="${esc(b.id)}">
      <div class="slider-wrap" data-slider data-idx="0">
        ${first ? `<img src="${esc(first)}" alt="${esc(b.name)}" data-slide-img loading="lazy">` : `<div class="bike-image-placeholder" aria-hidden="true"><i class="fa-solid fa-motorcycle"></i></div>`}
        <span class="stock-tag ${stockClass}"><i class="fa-solid fa-circle"></i> ${stockText}</span>
        <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${esc(b.id)}" aria-label="إضافة للمفضلة">
          <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
        </button>
        <button class="slider-btn prev" data-slide="prev" aria-label="السابق"><i class="fa-solid fa-chevron-right"></i></button>
        <button class="slider-btn next" data-slide="next" aria-label="التالي"><i class="fa-solid fa-chevron-left"></i></button>
        <div class="slider-dots" data-dots>${dots}</div>
      </div>
      <div class="product-body">
        <span class="product-cat">${esc(b.category || 'عام')}</span>
        <h3 class="product-name">${esc(b.name)}</h3>
        <div class="product-model">موديل ${esc(b.model)}</div>
        <div class="product-price">${money(b.price)}</div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" data-buy="${esc(b.id)}" ${b.stock <= 0 ? 'disabled' : ''}>
            <i class="fa-solid fa-cart-shopping"></i> شراء
          </button>
          <button class="btn btn-outline btn-sm" data-details="${esc(b.id)}">
            <i class="fa-solid fa-eye"></i> تفاصيل
          </button>
        </div>
      </div>
    </article>`;
}

function pageHome() {
  const bikes = filteredBikes();
  const cats = Array.from(new Set(state.bikes.map((b) => b.category).filter(Boolean)));
  return `
    <section class="hero">
      <h1>El  <span>khayal </span> motor's </h1>
      <p>أفضل الدراجات النارية الرياضية بأعلى جودة وأفضل الأسعار. اختر دراجتك الآن من El Khayal Motors.</p>
      <button class="btn btn-primary" data-nav="request">
        <i class="fa-solid fa-motorcycle"></i> اطلب موتسيكلك الخاص
      </button>
    </section>

    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> معرض الدراجات</h2>
    <p class="page-sub">تصفح مجموعتنا المختارة من أفضل الدراجات النارية</p>

    <div class="filters">
      <div class="search-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="searchInput" placeholder="ابحث بالاسم أو الموديل..." value="${esc(state.search)}">
      </div>
      <select id="filterCat">
        <option value="all">كل الفئات</option>
        ${cats.map((c) => `<option value="${esc(c)}" ${state.filterCat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select>
      <select id="filterPrice">
        <option value="all">كل الأسعار</option>
        <option value="0-500000" ${state.filterPrice === '0-500000' ? 'selected' : ''}>أقل من 500 ألف</option>
        <option value="500000-1000000" ${state.filterPrice === '500000-1000000' ? 'selected' : ''}>500 ألف - مليون</option>
        <option value="1000000-0" ${state.filterPrice === '1000000-0' ? 'selected' : ''}>أكثر من مليون</option>
      </select>
    </div>

    <div class="products-grid" id="productsGrid">
      ${bikes.length
        ? bikes.map(productCard).join('')
        : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p>لا توجد دراجات مطابقة للبحث</p></div>`}
    </div>`;
}

function pageRequest() {
  const u = currentUser();
  return `
    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> اطلب موتسيكلك الخاص</h2>
    <p class="page-sub">يمكنك إرسال طلبك دون إنشاء حساب؛ اترك وسيلة تواصل صحيحة لنتواصل معك</p>
    <div class="panel" style="max-width:680px">
      <form id="requestForm" class="form-grid">
        <div class="field"><label>اسمك</label><input name="requester_name" required maxlength="120" value="${esc(u?.name || '')}" placeholder="الاسم بالكامل"></div>
        <div class="form-row">
          <div class="field"><label>رقم الهاتف</label><input name="requester_phone" type="tel" maxlength="32" value="${esc(u?.phone || '')}" placeholder="01xxxxxxxxx"></div>
          <div class="field"><label>البريد الإلكتروني</label><input name="requester_email" type="email" maxlength="254" value="${esc(u?.email || '')}" placeholder="name@example.com"></div>
        </div>
        <div class="field"><label>تفضّل التواصل عبر</label><select name="preferred_contact"><option value="whatsapp">واتساب</option><option value="phone">مكالمة هاتفية</option><option value="sms">رسالة SMS</option><option value="email">البريد الإلكتروني</option></select></div>
        <div class="field"><label>اسم الدراجة المطلوبة</label><input name="bikeName" required maxlength="160" placeholder="مثال: BMW S1000RR"></div>
        <div class="form-row">
          <div class="field"><label>الموديل / السنة</label><input name="model" inputmode="numeric" placeholder="2024"></div>
          <div class="field"><label>الميزانية التقريبية (ج.م)</label><input type="number" name="budget" min="0" step="0.01"></div>
        </div>
        <div class="field"><label>ملاحظات إضافية</label><textarea name="notes" maxlength="3000" placeholder="اللون والمواصفات وأي تفاصيل أخرى..."></textarea></div>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> إرسال الطلب</button>
      </form>
    </div>`;
}

function pageContact() {
  const u = currentUser();
  return `
    <h2 class="page-title"><i class="fa-solid fa-headset"></i> تواصل معنا</h2>
    <p class="page-sub">أرسل استفسارك وسنعود إليك عبر وسيلة التواصل التي تختارها</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-comments"></i> قنوات التواصل</div>
        <p>يمكنك ترك رقم هاتفك أو بريدك الإلكتروني، واختيار الاتصال أو واتساب أو SMS أو البريد الإلكتروني.</p>
        <p class="hint">لا نعرض أرقامًا أو عناوين بريد غير مؤكدة. استخدم نموذج الرسالة وسيتواصل معك فريق المعرض.</p>
        <button class="btn btn-outline" data-nav="request"><i class="fa-solid fa-motorcycle"></i> إرسال طلب شراء</button>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-paper-plane"></i> أرسل رسالة</div>
        <form id="contactForm" class="form-grid">
          <div class="field"><label>الاسم</label><input name="name" required maxlength="120" value="${esc(u?.name || '')}"></div>
          <div class="form-row">
            <div class="field"><label>رقم الهاتف</label><input name="phone" type="tel" maxlength="32" value="${esc(u?.phone || '')}"></div>
            <div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" maxlength="254" value="${esc(u?.email || '')}"></div>
          </div>
          <div class="field"><label>طريقة الرد المفضلة</label><select name="preferred_contact"><option value="whatsapp">واتساب</option><option value="phone">مكالمة هاتفية</option><option value="sms">SMS</option><option value="email">البريد الإلكتروني</option></select></div>
          <div class="field"><label>رسالتك</label><textarea name="message" required maxlength="10000"></textarea></div>
          <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> إرسال الرسالة</button>
        </form>
      </div>
    </div>`;
}

function pageLogin() {
  return `
    <div class="auth-card">
      <h2>تسجيل الدخول</h2>
      <p class="sub">أدخل بياناتك للوصول إلى حسابك</p>
      <form id="loginForm" class="form-grid">
        <div class="field">
          <label>البريد الإلكتروني</label>
          <input type="email" name="email" required placeholder="email@example.com" autocomplete="email">
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <input type="password" name="password" required placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-right-to-bracket"></i> دخول
        </button>
      </form>
      <button class="text-link" type="button" id="resendConfirmationBtn">إعادة إرسال تأكيد البريد</button>
      <p class="hint">إذا أنشأ المدير حساب موظف لك، استخدم بريد الحساب هنا لطلب رسالة التأكيد أولاً.</p>
      <div class="auth-switch">ليس لديك حساب؟ <a data-nav="signup">أنشئ حساباً جديداً</a></div>

    </div>`;
}

function pageSignup() {
  return `
    <div class="auth-card">
      <h2>حساب جديد</h2>
      <p class="sub">سجل الآن لتتمكن من الشراء والمفضلة</p>
      <form id="signupForm" class="form-grid">
        <div class="field"><label>الاسم الكامل</label>
          <input type="text" name="name" required placeholder="اسمك" autocomplete="name"></div>
        <div class="field"><label>البريد الإلكتروني</label>
          <input type="email" name="email" required placeholder="email@example.com" autocomplete="email"></div>
        <div class="field"><label>رقم الهاتف</label>
          <input type="tel" name="phone" required placeholder="01xxxxxxxxx" autocomplete="tel"></div>
        <div class="field"><label>كلمة المرور</label>
          <input type="password" name="password" required minlength="6" placeholder="6 أحرف على الأقل" autocomplete="new-password"></div>
        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-user-plus"></i> إنشاء الحساب
        </button>
      </form>
      <div class="auth-switch">لديك حساب بالفعل؟ <a data-nav="login">تسجيل الدخول</a></div>
    </div>`;
}

function pageAccount() {
  const u = currentUser();
  if (!u) return pageLogin();
  const allRequests = get(DB.CUSTOM_REQS);
  const orders = allRequests.filter((request) => request.motorcycleId);
  const reqs = allRequests.filter((request) => !request.motorcycleId);
  return `
    <h2 class="page-title"><i class="fa-solid fa-user"></i> ملفي الشخصي</h2>
    <p class="page-sub">بياناتك، طلباتك، وحالة طلباتك الخاصة</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-receipt"></i></div><div class="stat-label">إجمالي الطلبات</div><div class="stat-value">${orders.length}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-motorcycle"></i></div><div class="stat-label">طلبات خاصة</div><div class="stat-value">${reqs.length}</div></div>
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-id-card"></i> بياناتي</div>
      <p style="margin-bottom:8px"><b>الاسم:</b> ${esc(u.name)}</p>
      <p style="margin-bottom:8px"><b>الإيميل:</b> ${esc(u.email)}</p>
      <p><b>الهاتف:</b> ${esc(u.phone || '—')}</p>
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-box"></i> طلباتي الخاصة</div>
      ${reqs.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>الدراجة</th><th>الموديل</th><th>الميزانية</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${reqs.map((r) => `
            <tr>
              <td>${esc(r.bikeName)}</td>
              <td>${esc(r.model)}</td>
              <td>${money(r.budget)}</td>
              <td><span class="status-pill ${r.status}">${esc(requestStatusLabel(r.status))}</span></td>
              <td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات خاصة بعد</p></div>`}
    </div>`;
}

function pageFavorites() {
  const u = currentUser();
  if (!u) return pageLogin();
  const favIds = get(DB.FAVS, {})[u.id] || [];
  const bikes = get(DB.BIKES).filter((b) => favIds.includes(b.id));
  return `
    <h2 class="page-title"><i class="fa-solid fa-heart"></i> المفضلة</h2>
    <p class="page-sub">الدراجات التي أعجبتك</p>
    <div class="products-grid">
      ${bikes.length ? bikes.map(productCard).join('') : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-heart-crack"></i><p>لا توجد دراجات في المفضلة</p></div>`}
    </div>`;
}

function pageOrders() {
  const u = currentUser();
  if (!u) return pageLogin();
  const orders = get(DB.CUSTOM_REQS).filter((request) => request.motorcycleId);
  return `
    <h2 class="page-title"><i class="fa-solid fa-receipt"></i> طلباتي</h2>
    <p class="page-sub">طلباتك المسجلة في Supabase</p>
    <div class="panel">
      ${orders.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>الدراجة</th><th>الميزانية</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${orders.map((o) => `
            <tr>
              <td>${esc(o.bikeName)}</td>
              <td style="color:var(--red);font-weight:700">${money(o.budget)}</td>
              <td><span class="status-pill ${o.status}">${esc(requestStatusLabel(o.status))}</span></td>
              <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات</p></div>`}
    </div>`;
}

/* =========================================================
   SECTION 4 — POS & INVOICES
   ========================================================= */

function pagePOS() {
  const u = currentUser();
  if (!u || u.role !== 'admin') return pageNoPermission();
  const available = state.bikes.filter((bike) => bike.status === 'available' && bike.stock > 0);
  const sales = state.sales || [];
  return `
    <h2 class="page-title"><i class="fa-solid fa-cash-register"></i> نقطة البيع POS</h2>
    <p class="page-sub">بيع مباشر من المعرض — لا يحتاج العميل إلى حساب دخول</p>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-cart-plus"></i> فاتورة بيع جديدة</div>
      ${available.length ? `
      <form id="posSaleForm" class="form-grid">
        <div class="form-row">
          <div class="field"><label for="posCustomerName">اسم العميل (اختياري)</label><input id="posCustomerName" name="customer_name" maxlength="120" placeholder="عميل نقدي"></div>
          <div class="field"><label for="posCustomerPhone">رقم الهاتف (اختياري)</label><input id="posCustomerPhone" name="customer_phone" maxlength="32" type="tel"></div>
        </div>
        <div class="form-row">
          <div class="field"><label for="posMotorcycle">الدراجة</label><select id="posMotorcycle" name="motorcycle_id" required>
            <option value="">اختر الدراجة</option>
            ${available.map((bike) => `<option value="${esc(bike.id)}">${esc(bike.name)} — ${esc(bike.model)} — ${money(bike.price)} (المتاح: ${bike.stock})</option>`).join('')}
          </select></div>
          <div class="field"><label for="posQuantity">الكمية</label><input id="posQuantity" name="quantity" type="number" min="1" max="100" value="1" required></div>
        </div>
        <div class="form-row">
          <div class="field"><label for="posPaymentAmount">المبلغ المدفوع الآن (ج.م)</label><input id="posPaymentAmount" name="payment_amount" type="number" min="0" step="0.01" value="0" required><small class="hint">يمكن تسجيل دفعة جزئية أو إصدار الفاتورة دون تحصيل.</small></div>
          <div class="field"><label for="posPaymentMethod">طريقة الدفع</label><select id="posPaymentMethod" name="payment_method"><option value="cash">نقدي</option><option value="bank_transfer">تحويل بنكي</option><option value="card">بطاقة</option><option value="other">أخرى</option></select></div>
        </div>
        <div class="field"><label for="posPaymentReference">مرجع الدفع (اختياري)</label><input id="posPaymentReference" name="payment_reference" maxlength="120"></div>
        <div class="field"><label for="posNotes">ملاحظات (اختياري)</label><textarea id="posNotes" name="notes" rows="2" maxlength="1000"></textarea></div>
        <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-file-invoice"></i> تسجيل البيع وإصدار الفاتورة</button>
      </form>` : `<div class="empty"><i class="fa-solid fa-box-open"></i><p>لا توجد دراجات متاحة للبيع حاليًا.</p></div>`}
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-receipt"></i> أحدث فواتير المعرض</div>
      ${sales.length ? `<div class="table-wrap"><table>
        <thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>التاريخ</th><th>تحصيل</th></tr></thead>
        <tbody>${sales.map((sale) => `<tr>
          <td><b>${esc(sale.invoice_number)}</b></td><td>${esc(sale.customer_name)}</td>
          <td>${money(sale.total)}</td><td>${money(sale.amount_paid)}</td>
          <td>${money(Number(sale.total) - Number(sale.amount_paid))}</td>
          <td><span class="status-pill ${sale.payment_status}">${sale.payment_status === 'paid' ? 'مدفوعة' : sale.payment_status === 'partial' ? 'مدفوعة جزئيًا' : 'غير مدفوعة'}</span></td>
          <td>${new Date(sale.created_at).toLocaleDateString('ar-EG')}</td>
          <td>${Number(sale.total) > Number(sale.amount_paid) ? `<button class="btn btn-outline btn-sm" data-collect-payment="${esc(sale.id)}">تحصيل دفعة</button>` : '—'}</td>
        </tr>`).join('')}</tbody></table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد فواتير مسجلة بعد.</p></div>`}
    </div>`;
}


/* =========================================================
   SECTION 5 — ADMIN & STAFF MONITORING
   ========================================================= */

function pageTarget() {
  const u = currentUser();
  if (!u) return pageLogin();
  return `<h2 class="page-title"><i class="fa-solid fa-bullseye"></i> تارجت الشهر</h2><div class="panel"><p>تقارير الأهداف والمبيعات غير مفعّلة حتى تُحفظ بيانات المبيعات في Supabase.</p></div>`;
}

function pageInventory() {
  const u = currentUser();
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
  if (u.role === 'staff' && !hasAnyPermission('catalog_view', 'catalog_manage')) return pageNoPermission();
  const bikes = get(DB.BIKES);
  const isAdmin = u.role === 'admin';
  return `
    <h2 class="page-title"><i class="fa-solid fa-boxes-stacked"></i> المخزن والأسعار</h2>
    <p class="page-sub">${isAdmin ? 'لديك صلاحية كاملة للتعديل من قسم إدارة الدراجات' : 'للاطلاع والبيع فقط'}</p>
    <div class="panel">
      <div class="table-wrap"><table>
        <thead><tr>
          <th>الصورة</th><th>الاسم</th><th>الموديل</th><th>الفئة</th>
          <th>السعر</th><th>المخزون</th><th>الحالة</th>
        </tr></thead>
        <tbody>
          ${bikes.map((b) => {
            const sc = b.stock <= 0 ? 'out' : b.stock <= 2 ? 'low' : 'available';
            const st = b.stock <= 0 ? 'نفذ' : b.stock <= 2 ? 'منخفض' : 'متوفر';
            const img = (b.images && b.images[0]) || '';
            return `<tr>
              <td><img class="mini-img" src="${esc(img)}" alt="" loading="lazy"></td>
              <td><b>${esc(b.name)}</b></td>
              <td>${esc(b.model)}</td>
              <td>${esc(b.category)}</td>
              <td class="text-red" style="font-weight:900">${money(b.price)}</td>
              <td>${b.stock}</td>
              <td><span class="status-pill ${sc}">${st}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function pageDashboard() {
  const u = currentUser();
  if (!u || u.role !== 'admin') return pageLogin();
  const bikes = get(DB.BIKES), requests = get(DB.CUSTOM_REQS);
  const totalStock = bikes.reduce((sum, bike) => sum + Number(bike.stock || 0), 0);
  const pending = requests.filter((r) => ['pending', 'reviewing'].includes(r.status)).length;
  return `<h2 class="page-title"><i class="fa-solid fa-chart-line"></i> لوحة الإحصائيات</h2>
    <p class="page-sub">ملخص من بيانات Supabase</p><div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-motorcycle"></i></div><div class="stat-label">الدراجات المسجلة</div><div class="stat-value">${bikes.length}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="stat-label">إجمالي المخزون</div><div class="stat-value">${totalStock}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-clipboard-list"></i></div><div class="stat-label">طلبات العملاء المفتوحة</div><div class="stat-value">${pending}</div></div></div>
    <div class="panel"><p>تقارير المبيعات والفواتير غير متاحة حتى تُربط بجدول محفوظ في Supabase.</p></div>`;
}

function pageManageBikes() {
  const u = currentUser();
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
  if (u.role === 'staff' && !hasPermission('catalog_manage')) return pageNoPermission();
  const bikes = get(DB.BIKES);
  return `
    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> إدارة الدراجات</h2>
    <p class="page-sub">إضافة وتعديل الدراجات المحفوظة في Supabase</p>
    <div class="panel">
      ${(u.role === 'admin' || hasPermission('catalog_manage')) ? `<button class="btn btn-primary mb-2" id="addBikeBtn"><i class="fa-solid fa-plus"></i> إضافة دراجة جديدة</button>` : ''}
      <div class="table-wrap"><table>
        <thead><tr><th>الصورة</th><th>الاسم</th><th>الموديل</th><th>الفئة</th><th>السعر</th><th>المخزون</th><th>إجراءات</th></tr></thead>
        <tbody>${bikes.map((b) => `
          <tr>
            <td><img class="mini-img" src="${esc((b.images && b.images[0]) || '')}" alt="" loading="lazy"></td>
            <td><b>${esc(b.name)}</b></td>
            <td>${esc(b.model)}</td>
            <td>${esc(b.category)}</td>
            <td class="text-red" style="font-weight:700">${money(b.price)}</td>
            <td>${b.stock}</td>
            <td style="display:flex;gap:6px">
              <button class="btn btn-outline btn-sm" data-edit-bike="${esc(b.id)}" title="تعديل"><i class="fa-solid fa-pen"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function bikeFormHTML(bike) {
  const isEdit = !!bike;
  const b = bike || { id: '', name: '', model: '', category: '', price: '', stock: 0, images: [], status: 'draft' };
  return `
    <div class="modal-header">
      <h3><i class="fa-solid fa-${isEdit ? 'pen' : 'plus'}"></i> ${isEdit ? 'تعديل' : 'إضافة'} دراجة</h3>
      <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="bikeForm" class="form-grid" data-id="${esc(b.id)}">
      <div class="form-row">
        <div class="field"><label>الاسم</label><input name="name" required value="${esc(b.name)}"></div>
        <div class="field"><label>الموديل</label><input name="model" required value="${esc(b.model)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>الفئة</label><input name="category" required value="${esc(b.category)}" placeholder="سبورت / naked ..."></div>
        <div class="field"><label>السعر</label><input type="number" name="price" required min="0" value="${esc(b.price)}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>المخزون</label><input type="number" name="stock" required min="0" value="${esc(b.stock)}"></div>
        <div class="field"><label>حالة العرض</label><select name="status">
          <option value="draft" ${b.status === 'draft' ? 'selected' : ''}>مسودة</option>
          <option value="available" ${b.status === 'available' ? 'selected' : ''}>متاحة</option>
          <option value="reserved" ${b.status === 'reserved' ? 'selected' : ''}>محجوزة</option>
          <option value="sold" ${b.status === 'sold' ? 'selected' : ''}>مباعة</option>
          <option value="unavailable" ${b.status === 'unavailable' ? 'selected' : ''}>غير متاحة</option>
        </select></div>
      </div>
      <div class="field">
        <label>روابط الصور العامة (كل رابط في سطر)</label>
        <textarea name="images" rows="4" placeholder="https://...">${esc((b.images || []).join('\n'))}</textarea>
      </div>
      <div class="field">
        <label>رفع صور إلى Telegram</label>
        <input type="file" name="photos" accept="image/*" multiple>
        <span class="hint">ترتبط الصور بالدراجة وتُسجل في Supabase. اتركه فارغًا لتخطي الرفع.</span>
      </div>
      <button class="btn btn-primary btn-block" type="submit">
        <i class="fa-solid fa-floppy-disk"></i> حفظ
      </button>
    </form>`;
}

function pageStaff() {
  const u = currentUser();
  if (!u || u.role !== 'admin') return pageLogin();
  const staff = get(DB.USERS).filter((entry) => entry.role === 'staff');
  const result = state.staffProvisionResult;
  return `<h2 class="page-title"><i class="fa-solid fa-users-gear"></i> حسابات الموظفين</h2>
    <p class="page-sub">المدير وحده ينشئ حسابات الموظفين ويحدد صلاحيات كل حساب.</p>
    ${result ? `<div class="panel staff-created"><h3>تم إنشاء الحساب</h3><p>البريد: <b>${esc(result.staff.email)}</b></p><p>تم حفظ كلمة المرور التي أدخلتها، والحساب جاهز لتسجيل الدخول.</p></div>` : ''}
    <div class="panel"><h3>إنشاء حساب موظف</h3>
      <p class="hint">تحقق من صحة البريد مع الموظف قبل الإنشاء. كلمة المرور تُحفظ لحساب الموظف؛ شاركها معه بأمان خارج الموقع.</p>
      <form id="staffCreateForm" class="form-grid">
        <div class="form-row"><div class="field"><label>اسم الموظف</label><input name="full_name" required maxlength="120" autocomplete="name"></div>
          <div class="field"><label>البريد الإلكتروني</label><input name="email" type="email" required maxlength="254" autocomplete="email"></div></div>
        <div class="field"><label>رقم الهاتف (اختياري)</label><input name="phone" type="tel" maxlength="32" autocomplete="tel"></div>
        <div class="form-row"><div class="field"><label>كلمة المرور</label><input name="password" type="password" required minlength="8" autocomplete="new-password"></div>
          <div class="field"><label>تأكيد كلمة المرور</label><input name="password_confirm" type="password" required minlength="8" autocomplete="new-password"></div></div>
        <fieldset class="permission-fieldset"><legend>الصلاحيات الممنوحة — لا شيء محدد افتراضيًا</legend><div class="permission-grid">
          ${STAFF_PERMISSION_OPTIONS.map((item) => `<label class="permission-option"><input type="checkbox" name="permissions" value="${esc(item.key)}"><span><b>${esc(item.label)}</b><small>${esc(item.description)}</small></span></label>`).join('')}
        </div></fieldset>
        <button class="btn btn-primary" type="submit"><i class="fa-solid fa-user-plus"></i> إنشاء حساب الموظف</button>
      </form>
    </div>
    <div class="panel"><h3>الموظفون الحاليون</h3><div class="table-wrap"><table>
      <thead><tr><th>الاسم</th><th>البريد</th><th>الهاتف</th><th>الصلاحيات</th></tr></thead>
      <tbody>${staff.map((person) => `<tr><td><b>${esc(person.name || '—')}</b></td><td>${esc(person.email || '—')}</td><td>${esc(person.phone || '—')}</td><td>${person.permissions.length ? person.permissions.map((key) => esc(PERMISSION_LABELS[key] || key)).join('، ') : 'لا توجد صلاحيات'}</td></tr>`).join('') || `<tr><td colspan="4" class="text-center">لا توجد حسابات موظفين</td></tr>`}</tbody>
    </table></div></div>`;
}

function requestStatusLabel(status) {
  return ({ pending:'قيد المراجعة', reviewing:'جارٍ التواصل', approved:'مقبول', rejected:'مرفوض', completed:'مكتمل' })[status] || status || '—';
}

function pageStaffOrders() {
  const u = currentUser();
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
  if (u.role === 'staff' && !hasRequestAccess()) return pageNoPermission();
  const requests = get(DB.CUSTOM_REQS);
  const messages = state.contactMessages || [];
  const canManage = hasPermission('requests_manage');
  const showContact = hasPermission('customer_data_view') || hasRequestAccess();
  const contactCells = (person) => showContact ? `<div class="contact-actions">${contactActionLinks(person, 'مرحبًا، معك فريق El Khayal Motors بخصوص طلبك.')}</div>` : 'بيانات التواصل تتطلب صلاحية بيانات العملاء';
  return `
    <h2 class="page-title"><i class="fa-solid fa-inbox"></i> صندوق طلبات العملاء والرسائل</h2>
    <p class="page-sub">بيانات المرسل وقنوات الاتصال وسجل الردود؛ لا يتم إرسال الرسائل آليًا من المتصفح.</p>
    <div class="panel"><div class="panel-title"><i class="fa-solid fa-motorcycle"></i> طلبات الشراء ${requests.length}</div>
      ${requests.length ? `<div class="table-wrap"><table><thead><tr><th>العميل ووسائل الاتصال</th><th>الطلب</th><th>الميزانية</th><th>الحالة</th><th>التاريخ</th><th>التواصل والرد</th></tr></thead><tbody>
      ${requests.map((r) => {
        const person = {phone:r.customerPhone,email:r.customerEmail};
        const replies = state.requestReplies.filter((x) => x.request_id === r.id);
        return `<tr><td><b>${esc(r.customerName || '—')}</b><br><small>${esc(r.customerPhone || r.customerEmail || '—')}</small><br><small>يفضل: ${esc(({phone:'اتصال',whatsapp:'واتساب',email:'بريد',sms:'SMS'})[r.preferredContact] || '—')}</small>${contactCells(person)}</td>
          <td>${esc(r.bikeName || '—')} ${esc(r.model || '')}<br><small>${esc(r.notes || '')}</small></td>
          <td>${money(r.budget)}</td><td><span class="status-pill ${esc(r.status)}">${esc(requestStatusLabel(r.status))}</span></td>
          <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : '—'}</td>
          <td>${canManage ? `<button class="btn btn-primary btn-sm" data-open-reply="request" data-record-id="${esc(r.id)}">رد / سجل الرد (${replies.length})</button>` : 'عرض فقط'}
          ${canManage ? `<div class="contact-actions"><button class="btn btn-outline btn-sm" data-approve-req="${esc(r.id)}" ${r.status === 'approved' ? 'disabled' : ''}>قبول</button><button class="btn btn-outline btn-sm" data-reject-req="${esc(r.id)}" ${r.status === 'rejected' ? 'disabled' : ''}>رفض</button></div>` : ''}</td></tr>`;
      }).join('')}
      </tbody></table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات شراء</p></div>`}
    </div>
    <div class="panel"><div class="panel-title"><i class="fa-solid fa-envelope"></i> رسائل التواصل ${messages.length}</div>
      ${messages.length ? `<div class="table-wrap"><table><thead><tr><th>المرسل ووسائل الاتصال</th><th>الرسالة</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>
      ${messages.map((m) => {
        const replies = state.contactReplies.filter((x) => x.message_id === m.id);
        return `<tr><td><b>${esc(m.name)}</b><br><small>${esc(m.phone || m.email || '—')}</small><br><small>يفضل: ${esc(({phone:'اتصال',whatsapp:'واتساب',email:'بريد',sms:'SMS'})[m.preferred_contact] || '—')}</small><div class="contact-actions">${contactCells({phone:m.phone,email:m.email})}</div></td>
          <td>${esc(m.message)}</td><td>${esc(({new:'جديدة',in_progress:'قيد المتابعة',replied:'تم الرد',closed:'مغلقة'})[m.status] || m.status)}</td>
          <td>${new Date(m.created_at).toLocaleDateString('ar-EG')}</td><td>${canManage ? `<button class="btn btn-primary btn-sm" data-open-reply="message" data-record-id="${esc(m.id)}">رد / سجل الرد (${replies.length})</button>` : 'عرض فقط'}</td></tr>`;
      }).join('')}
      </tbody></table></div>` : `<div class="empty"><i class="fa-solid fa-envelope-open"></i><p>لا توجد رسائل تواصل</p></div>`}
    </div>`;
}

/* =========================================================
   SECTION 6 — UI & SIDEBAR (Router, Events, Init)
   ========================================================= */

/* ---------- Modal helpers ---------- */
function openModal(html) {
  const ov = $('#modalOverlay');
  const box = $('#modalBox');
  if (!ov || !box) return;
  box.innerHTML = html;
  ov.classList.add('show');
  ov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const ov = $('#modalOverlay');
  const box = $('#modalBox');
  if (!ov || !box) return;
  ov.classList.remove('show');
  ov.setAttribute('aria-hidden', 'true');
  box.innerHTML = '';
  document.body.style.overflow = '';
}

/* ---------- Sidebar helpers ---------- */
function openSidebar() {
  state.sidebarOpen = true;
  const s = $('#sidebar');
  const o = $('#sidebarOverlay');
  const t = $('#menuToggle');
  if (s) s.classList.add('open');
  if (o) o.classList.add('show');
  if (t) t.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  state.sidebarOpen = false;
  const s = $('#sidebar');
  const o = $('#sidebarOverlay');
  const t = $('#menuToggle');
  if (s) s.classList.remove('open');
  if (o) o.classList.remove('show');
  if (t) t.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
function toggleSidebar() {
  state.sidebarOpen ? closeSidebar() : openSidebar();
}

/* ---------- Router ---------- */
const ROUTES = {
  home: pageHome,
  login: pageLogin,
  signup: pageSignup,
  request: pageRequest,
  contact: pageContact,
  account: pageAccount,
  favorites: pageFavorites,
  orders: pageOrders,
  pos: pagePOS,
  target: pageTarget,
  inventory: pageInventory,
  dashboard: pageDashboard,
  'manage-bikes': pageManageBikes,
  staff: pageStaff,
  'staff-orders': pageStaffOrders
};

function render() {
  currentUser();
  renderAccountArea();
  renderSidebar();

  const main = $('#mainContent');
  if (!main) return;

  const fn = ROUTES[state.route] || pageHome;
  main.innerHTML = fn();
  applyLanguage(document);


  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(route) {
  if (!ROUTES[route]) route = 'home';
  if (state.route === 'staff' && route !== 'staff') state.staffProvisionResult = null;
  state.route = route;
  state.search = '';
  state.filterCat = 'all';
  state.filterPrice = 'all';
  closeModal();
  closeSidebar();
  render();
  if (route === 'pos') loadSalesData().then(render);
  if (route === 'staff-orders' && state.user && ['staff','admin'].includes(state.user.role)) loadBusinessData().then(render);
}

/* ---------- Buy Flow ---------- */
function handleBuy(bikeId) {
  const bike = state.bikes.find((b) => b.id === bikeId);
  if (!bike) return toast('الدراجة غير موجودة', 'error');
  if (bike.stock <= 0 || bike.status !== 'available') return toast('الدراجة غير متوفرة حالياً', 'error');
  const u = currentUser();
  openModal(`
    <div class="modal-header"><h3><i class="fa-solid fa-cart-shopping"></i> طلب شراء ${esc(bike.name)}</h3>
      <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button></div>
    <p class="text-red mb-2" style="font-size:20px;font-weight:900">${money(bike.price)}</p>
    <form id="quickBuyRequestForm" class="form-grid" data-bike-id="${esc(bike.id)}">
      <div class="field"><label>اسمك</label><input name="requester_name" required maxlength="120" value="${esc(u?.name || '')}"></div>
      <div class="form-row">
        <div class="field"><label>رقم الهاتف</label><input name="requester_phone" type="tel" maxlength="32" value="${esc(u?.phone || '')}"></div>
        <div class="field"><label>البريد الإلكتروني</label><input name="requester_email" type="email" maxlength="254" value="${esc(u?.email || '')}"></div>
      </div>
      <div class="field"><label>طريقة التواصل المفضلة</label><select name="preferred_contact"><option value="whatsapp">واتساب</option><option value="phone">اتصال</option><option value="sms">SMS</option><option value="email">البريد الإلكتروني</option></select></div>
      <div class="field"><label>ملاحظات (اختياري)</label><textarea name="notes" maxlength="2000"></textarea></div>
      <button class="btn btn-primary btn-block" type="submit">إرسال طلب الشراء</button>
    </form>`);
}

async function confirmBuy(bikeId) {
  handleBuy(bikeId);
}

/* ---------- Event: Click Delegation ---------- */
document.addEventListener('click', async (e) => {
  if (e.target.closest('#resendConfirmationBtn')) {
    if (!supabase) { toast('الخدمة غير مهيأة حالياً', 'error'); return; }
    const email = safeName($('#loginForm input[name="email"]')?.value).toLowerCase();
    if (!email) { toast('اكتب البريد الإلكتروني أولاً', 'error'); return; }
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: authRedirectUrl } });
    if (error) toast(error.message || 'تعذر طلب رسالة التأكيد', 'error');
    else toast('إذا كان الحساب بانتظار التأكيد، ستصل رسالة إلى البريد', 'info');
    return;
  }

  /* Navigation */
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    e.preventDefault();
    navigate(nav.dataset.nav);
    return;
  }

  /* Sidebar toggle / overlay / logout */
  if (e.target.closest('#menuToggle')) { toggleSidebar(); return; }
  if (e.target.closest('#sidebarOverlay')) { closeSidebar(); return; }
  if (e.target.closest('#logoutBtn')) { logout(); return; }

  /* Modal close */
  if (e.target.closest('[data-close-modal]') || e.target.id === 'modalOverlay') {
    closeModal();
    return;
  }

  /* Print invoice */
  if (e.target.closest('#printInvoiceBtn')) { window.print(); return; }

  const collectPayment = e.target.closest('[data-collect-payment]');
  if (collectPayment) {
    const sale = state.sales.find((item) => item.id === collectPayment.dataset.collectPayment);
    if (!sale) return;
    const balance = Number(sale.total) - Number(sale.amount_paid);
    openModal(`<div class="modal-header"><h3>تحصيل دفعة — ${esc(sale.invoice_number)}</h3><button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button></div>
      <p class="mb-2">الرصيد المستحق: <b>${money(balance)}</b></p>
      <form id="collectPaymentForm" class="form-grid" data-sale-id="${esc(sale.id)}">
        <div class="field"><label for="collectAmount">قيمة الدفعة</label><input id="collectAmount" name="amount" type="number" min="0.01" max="${balance}" step="0.01" required></div>
        <div class="field"><label for="collectMethod">طريقة الدفع</label><select id="collectMethod" name="method"><option value="cash">نقدي</option><option value="bank_transfer">تحويل بنكي</option><option value="card">بطاقة</option><option value="other">أخرى</option></select></div>
        <div class="field"><label for="collectReference">مرجع الدفع (اختياري)</label><input id="collectReference" name="reference" maxlength="120"></div>
        <button class="btn btn-primary" type="submit">حفظ الدفعة</button>
      </form>`);
    return;
  }

  /* Slider prev/next */
  const slideBtn = e.target.closest('[data-slide]');
  if (slideBtn) {
    const card = slideBtn.closest('[data-bike-id]');
    if (!card) return;
    const bikeId = card.dataset.bikeId;
    const bike = get(DB.BIKES).find((b) => b.id === bikeId);
    if (!bike || !bike.images || !bike.images.length) return;
    const wrap = slideBtn.closest('[data-slider]');
    let idx = Number(wrap.dataset.idx || 0);
    const total = bike.images.length;
    idx = slideBtn.dataset.slide === 'next'
      ? (idx + 1) % total
      : (idx - 1 + total) % total;
    wrap.dataset.idx = String(idx);
    const img = wrap.querySelector('[data-slide-img]');
    if (img) img.src = bike.images[idx];
    wrap.querySelectorAll('[data-dots] span').forEach((d, i) => d.classList.toggle('active', i === idx));
    return;
  }

  /* Favorites */
  const favBtn = e.target.closest('[data-fav]');
  if (favBtn) {
    const u = currentUser();
    if (!u) { toast('سجل الدخول أولاً', 'error'); navigate('login'); return; }
    const bikeId = favBtn.dataset.fav;
    const { data: existing, error: readError } = await supabase.from('favorites')
      .select('motorcycle_id').eq('user_id', u.id).eq('motorcycle_id', bikeId).maybeSingle();
    if (readError) { toast(readError.message, 'error'); return; }
    const result = existing
      ? await supabase.from('favorites').delete().eq('user_id', u.id).eq('motorcycle_id', bikeId)
      : await supabase.from('favorites').insert({ user_id: u.id, motorcycle_id: bikeId });
    if (result.error) { toast(result.error.message, 'error'); return; }
    toast(existing ? 'أزيلت من المفضلة' : 'أضيفت للمفضلة', 'success');
    render();
    return;
  }

  /* Buy */
  const buyBtn = e.target.closest('[data-buy]');
  if (buyBtn) { handleBuy(buyBtn.dataset.buy); return; }
  const confirmBtn = e.target.closest('[data-confirm-buy]');
  if (confirmBtn) { confirmBuy(confirmBtn.dataset.confirmBuy); return; }

  /* Details */
  const detailsBtn = e.target.closest('[data-details]');
  if (detailsBtn) {
    const bike = get(DB.BIKES).find((b) => b.id === detailsBtn.dataset.details);
    if (!bike) return;
    const img = (bike.images && bike.images[0]) || '';
    openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-motorcycle"></i> ${esc(bike.name)}</h3>
        <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
      </div>
      ${img ? `<img src="${esc(img)}" alt="${esc(bike.name)}" style="width:100%;height:220px;object-fit:cover;border-radius:12px;margin-bottom:14px">` : ''}
      <p class="mb-1"><b>الموديل:</b> ${esc(bike.model)}</p>
      <p class="mb-1"><b>الفئة:</b> ${esc(bike.category)}</p>
      <p class="mb-1"><b>السعر:</b> <span class="text-red" style="font-weight:900">${money(bike.price)}</span></p>
      <p><b>المخزون:</b> ${bike.stock} قطعة</p>
    `);
    return;
  }

  /* Manager or explicitly authorized staff — catalog */
  if (e.target.closest('#addBikeBtn')) {
    if (!hasPermission('catalog_manage')) { toast('ليس لديك صلاحية إدارة الدراجات', 'error'); return; }
    openModal(bikeFormHTML(null)); return;
  }
  const editBike = e.target.closest('[data-edit-bike]');
  if (editBike) {
    if (!hasPermission('catalog_manage')) { toast('ليس لديك صلاحية إدارة الدراجات', 'error'); return; }
    const bike = get(DB.BIKES).find((b) => b.id === editBike.dataset.editBike);
    if (bike) openModal(bikeFormHTML(bike));
    return;
  }


  const replyButton = e.target.closest('[data-open-reply]');
  if (replyButton) {
    if (!hasPermission('requests_manage')) { toast('ليس لديك صلاحية الرد على العملاء', 'error'); return; }
    const kind = replyButton.dataset.openReply;
    const id = replyButton.dataset.recordId;
    const item = kind === 'request' ? get(DB.CUSTOM_REQS).find((x) => x.id === id) : state.contactMessages.find((x) => x.id === id);
    if (!item) return;
    const person = kind === 'request'
      ? {name:item.customerName,phone:item.customerPhone,email:item.customerEmail}
      : {name:item.name,phone:item.phone,email:item.email};
    const message = kind === 'request' ? `بخصوص طلب ${item.bikeName || ''}` : item.message;
    openModal(`<div class="modal-header"><h3>التواصل مع ${esc(person.name || 'العميل')}</h3><button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button></div>
      <p class="mb-2">${esc(message)}</p><div class="contact-actions">${contactActionLinks(person, 'مرحبًا ' + (person.name || '') + '، معك فريق El Khayal Motors. ' + message)}</div>
      <p class="hint">افتح قناة الاتصال وأرسل الرد بنفسك، ثم سجّل الرد أدناه لحفظه في سجل العميل.</p>
      <form id="customerReplyForm" class="form-grid" data-kind="${esc(kind)}" data-record-id="${esc(id)}">
        <div class="field"><label>نص الرد أو ملخص المكالمة</label><textarea name="reply_body" required maxlength="10000"></textarea></div>
        <div class="field"><label>القناة المستخدمة</label><select name="channel"><option value="whatsapp">واتساب</option><option value="phone">مكالمة هاتفية</option><option value="email">بريد إلكتروني</option><option value="sms">SMS</option><option value="internal">ملاحظة داخلية فقط</option></select></div>
        <label class="field"><span><input type="checkbox" name="sent" value="yes"> أؤكد أنني أرسلت الرد أو أجريت المكالمة بالفعل</span></label>
        <button class="btn btn-primary" type="submit">حفظ سجل الرد</button>
      </form>`);
    return;
  }

  /* Update customer request status in Supabase under RLS. */
  const statusButton = e.target.closest('[data-approve-req], [data-reject-req]');
  if (statusButton) {
    if (!hasPermission('requests_manage')) { toast('ليس لديك صلاحية تحديث الطلبات', 'error'); return; }
    const id = statusButton.dataset.approveReq || statusButton.dataset.rejectReq;
    const status = statusButton.dataset.approveReq ? 'approved' : 'rejected';
    const { error } = await supabase.from('customer_requests').update({ status }).eq('id', id);
    if (error) { toast(error.message, 'error'); return; }
    await loadBusinessData();
    toast(status === 'approved' ? 'تم قبول الطلب' : 'تم رفض الطلب', 'success');
    render();
    return;
  }

});

/* ---------- Event: Submit Delegation ---------- */
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  if (form.id === 'customerReplyForm') {
    if (!hasPermission('requests_manage') || !supabase) { toast('ليس لديك صلاحية تسجيل الردود', 'error'); return; }
    const fd = new FormData(form);
    const kind = form.dataset.kind;
    const sent = fd.get('sent') === 'yes';
    const channel = String(fd.get('channel'));
    if (channel !== 'internal' && !sent) {
      toast('أكد إرسال الرسالة أو اختر ملاحظة داخلية فقط', 'error'); return;
    }
    const payload = {reply_body:safeName(fd.get('reply_body')),channel,sent_by:state.user.id,sent_at:sent ? new Date().toISOString() : null};
    const table = kind === 'request' ? 'customer_request_replies' : 'contact_message_replies';
    const foreignKey = kind === 'request' ? 'request_id' : 'message_id';
    const {error} = await supabase.from(table).insert({...payload,[foreignKey]:form.dataset.recordId});
    if (error) { toast(error.message || 'تعذر حفظ سجل الرد', 'error'); return; }
    if (kind === 'message' && sent) {
      const statusResult = await supabase.from('contact_messages').update({status:'replied'}).eq('id',form.dataset.recordId);
      if (statusResult.error) console.error('Contact status update failed',statusResult.error);
    }
    closeModal();
    await loadBusinessData();
    render();
    toast('تم حفظ سجل التواصل', 'success');
    return;
  }

  if (form.id === 'collectPaymentForm') {
    if (!hasRole('admin') || !supabase) { toast('ليس لديك صلاحية تحصيل المدفوعات', 'error'); return; }
    const fd = new FormData(form);
    const amount = Number(fd.get('amount'));
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const { error } = await supabase.rpc('record_sale_payment', {
      p_sale_id: form.dataset.saleId, p_amount: amount, p_method: String(fd.get('method')),
      p_reference: safeName(fd.get('reference')) || null
    });
    if (submit) submit.disabled = false;
    if (error) { toast(error.message || 'تعذر تسجيل الدفعة', 'error'); return; }
    closeModal();
    await loadSalesData();
    render();
    toast('تم تسجيل الدفعة وتحديث رصيد الفاتورة', 'success');
    return;
  }

  /* Showroom POS: one atomic database RPC creates invoice, lines, payment and stock movements. */
  if (form.id === 'posSaleForm') {
    if (!hasRole('admin') || !supabase) { toast('نقطة البيع غير متاحة لهذا الحساب', 'error'); return; }
    const fd = new FormData(form);
    const bike = state.bikes.find((item) => item.id === fd.get('motorcycle_id'));
    const quantity = Number(fd.get('quantity'));
    const paymentAmount = Number(fd.get('payment_amount'));
    if (!bike || !Number.isInteger(quantity) || quantity < 1 || quantity > bike.stock) {
      toast('تحقق من الدراجة والكمية المتاحة', 'error'); return;
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount < 0 || paymentAmount > bike.price * quantity) {
      toast('قيمة الدفعة غير صحيحة أو أكبر من إجمالي الفاتورة', 'error'); return;
    }
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const { data, error } = await supabase.rpc('create_showroom_sale', {
      p_customer_name: safeName(fd.get('customer_name')) || null,
      p_customer_phone: safeName(fd.get('customer_phone')) || null,
      p_items: [{ motorcycle_id: bike.id, quantity }],
      p_payment_amount: paymentAmount,
      p_payment_method: paymentAmount > 0 ? String(fd.get('payment_method')) : null,
      p_payment_reference: safeName(fd.get('payment_reference')) || null,
      p_notes: safeName(fd.get('notes')) || null
    });
    if (submit) submit.disabled = false;
    if (error) { toast(error.message || 'تعذر تسجيل البيع', 'error'); return; }
    await Promise.all([loadMotorcycles(), loadSalesData()]);
    const customerName = safeName(fd.get('customer_name')) || 'عميل نقدي';
    const invoice = `
      <div class="invoice">
        <div class="invoice-header"><div><h2>El Khayal Motors</h2><p>فاتورة بيع معرض</p></div><div class="invoice-meta"><b>${esc(data.invoice_number)}</b><br><span>${new Date().toLocaleString('ar-EG')}</span></div></div>
        <hr><p><b>العميل:</b> ${esc(customerName)}</p><p><b>الهاتف:</b> ${esc(fd.get('customer_phone') || '—')}</p>
        <div class="table-wrap"><table><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
        <tbody><tr><td>${esc(bike.name)} — ${esc(bike.model)}</td><td>${quantity}</td><td>${money(bike.price)}</td><td>${money(data.total)}</td></tr></tbody></table></div>
        <p><b>الإجمالي:</b> ${money(data.total)}</p><p><b>المدفوع:</b> ${money(data.amount_paid)}</p>
        <p><b>المتبقي:</b> ${money(data.balance_due)}</p><p><b>حالة الدفع:</b> ${data.payment_status === 'paid' ? 'مدفوعة' : data.payment_status === 'partial' ? 'مدفوعة جزئيًا' : 'غير مدفوعة'}</p>
        <p class="text-center">شكرًا لثقتكم في El Khayal Motors</p>
      </div>
      <div class="modal-header"><button class="btn btn-primary" id="printInvoiceBtn"><i class="fa-solid fa-print"></i> طباعة الفاتورة</button><button class="btn btn-outline" data-close-modal>إغلاق</button></div>`;
    openModal(invoice);
    render();
    toast('تم تسجيل البيع وتحديث المخزون وإصدار الفاتورة', 'success');
    return;
  }

  /* Login */
  if (form.id === 'loginForm') {
    const fd = new FormData(form);
    try {
      const u = await login(fd.get('email'), fd.get('password'));
      if (u.role === 'customer') await loadCustomerData();
      else { await loadBusinessData(); await loadStaffDirectory(); }
      await loadMotorcycles();
      toast(`أهلاً ${u.name}`, 'success');
      const route = u.role === 'admin' ? 'dashboard' : u.role === 'staff'
        ? (hasRequestAccess() ? 'staff-orders' : hasAnyPermission('catalog_view', 'catalog_manage') ? 'inventory' : 'home')
        : 'home';
      navigate(route);
    } catch (error) { toast(error.message || 'تعذر تسجيل الدخول', 'error'); }
    return;
  }

  /* Signup */
  if (form.id === 'signupForm') {
    const fd = new FormData(form);
    try {
      const res = await signup({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), password: fd.get('password') });
      if (res.requiresEmailConfirmation) {
        toast('افتح رسالة التأكيد في بريدك لإكمال إنشاء الحساب', 'info');
        navigate('login');
      } else {
        await loadCustomerData();
        await loadMotorcycles();
        toast('تم إنشاء الحساب بنجاح', 'success');
        navigate('home');
      }
    } catch (error) { toast(error.message || 'تعذر إنشاء الحساب', 'error'); }
    return;
  }

  /* Customer request: durable data is written only to Supabase under RLS. */
  if (form.id === 'requestForm' || form.id === 'quickBuyRequestForm') {
    if (!supabase) { toast('الخدمة غير مهيأة حالياً', 'error'); return; }
    const fd = new FormData(form);
    const u = currentUser();
    const name = safeName(fd.get('requester_name'));
    const phone = safeName(fd.get('requester_phone'));
    const email = safeName(fd.get('requester_email')).toLowerCase();
    if (name.length < 2 || (!phone && !email)) { toast('اكتب اسمك ورقم هاتف أو بريدًا إلكترونيًا واحدًا على الأقل', 'error'); return; }
    const bike = form.id === 'quickBuyRequestForm' ? state.bikes.find((b) => b.id === form.dataset.bikeId) : null;
    if (form.id === 'quickBuyRequestForm' && (!bike || bike.stock <= 0 || bike.status !== 'available')) {
      toast('الدراجة لم تعد متاحة؛ حدّث الصفحة وحاول مرة أخرى', 'error'); return;
    }
    const { error } = await supabase.from('customer_requests').insert({
      client_user_id: u?.id || null,
      requester_name: name,
      requester_phone: phone || null,
      requester_email: email || null,
      preferred_contact: String(fd.get('preferred_contact') || 'phone'),
      motorcycle_id: bike?.id || null,
      requested_name: bike?.name || safeName(fd.get('bikeName')),
      requested_model_year: bike ? (Number(bike.model) || null) : (Number(fd.get('model')) || null),
      budget: bike ? bike.price : (Number(fd.get('budget')) || null),
      notes: safeName(fd.get('notes')) || (bike ? 'طلب شراء من صفحة الدراجة' : null)
    });
    if (error) { toast(error.message || 'تعذر حفظ الطلب', 'error'); return; }
    if (u) await loadCustomerData();
    else if (state.user && ['staff','admin'].includes(state.user.role)) await loadBusinessData();
    closeModal();
    form.reset();
    toast('تم استلام طلبك بنجاح؛ سيتواصل معك فريق المعرض', 'success');
    if (u) navigate('orders');
    else if (hasRole('admin')) { await loadBusinessData(); render(); }
    else if (state.route === 'request') render();
    return;
  }

  /* Contact messages are sent to the protected Supabase table. */
  if (form.id === 'contactForm') {
    const fd = new FormData(form);
    if (!supabase) { toast('الخدمة غير مهيأة حالياً', 'error'); return; }
    const phone = safeName(fd.get('phone'));
    const email = safeName(fd.get('email')).toLowerCase();
    if (!safeName(fd.get('name')) || !safeName(fd.get('message')) || (!phone && !email)) {
      toast('اكتب اسمك ورسالتك ورقم هاتف أو بريدًا إلكترونيًا واحدًا على الأقل', 'error'); return;
    }
    const { error } = await supabase.from('contact_messages').insert({
      sender_user_id: currentUser()?.id || null,
      name: safeName(fd.get('name')),
      phone: phone || null,
      email: email || '',
      preferred_contact: String(fd.get('preferred_contact') || 'email'),
      message: safeName(fd.get('message'))
    });
    if (error) { toast(error.message || 'تعذر إرسال الرسالة', 'error'); return; }
    toast('وصلتنا رسالتك؛ سنعود إليك عبر وسيلة التواصل المفضلة', 'success');
    form.reset();
    return;
  }

  /* Create staff through a manager-authorized Edge Function; never from browser credentials. */
  if (form.id === 'staffCreateForm') {
    if (!hasRole('admin')) { toast('هذه العملية للمدير فقط', 'error'); return; }
    const fd = new FormData(form);
    const password = String(fd.get('password') || '');
    const passwordConfirm = String(fd.get('password_confirm') || '');
    if (password !== passwordConfirm) { toast('كلمتا المرور غير متطابقتين', 'error'); return; }
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    const { data, error } = await supabase.functions.invoke('manage-staff', { body: {
      action: 'create',
      full_name: fd.get('full_name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      password,
      permissions: fd.getAll('permissions')
    }});
    if (button) button.disabled = false;
    if (error || !data?.staff) {
      let serverMessage = data?.error;
      if (!serverMessage && error?.context && typeof error.context.clone === 'function') {
        try {
          const errorBody = await error.context.clone().json();
          serverMessage = typeof errorBody?.error === 'string' ? errorBody.error : '';
        } catch { /* Keep the SDK message if the response has no readable JSON body. */ }
      }
      if (serverMessage === 'An account already uses this email.') {
        serverMessage = 'البريد الإلكتروني مستخدم بالفعل؛ استخدم بريدًا آخر للموظف.';
      }
      toast(serverMessage || error?.message || 'تعذر إنشاء حساب الموظف', 'error');
      return;
    }
    state.staffProvisionResult = data;
    await loadStaffDirectory();
    render();
    toast('تم إنشاء الحساب؛ كلمة المرور المؤقتة ظاهرة للمدير فقط', 'success');
    return;
  }

  /* Motorcycle catalogue data and Telegram-backed images are stored through Supabase. */
  if (form.id === 'bikeForm') {
    if (!hasPermission('catalog_manage')) { toast('ليس لديك صلاحية إدارة الدراجات', 'error'); return; }
    const fd = new FormData(form);
    const id = form.dataset.id;
    const images = String(fd.get('images') || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const values = {
      name: safeName(fd.get('name')),
      model_year: Number(fd.get('model')) || null,
      category: safeName(fd.get('category')),
      price: Number(fd.get('price')) || 0,
      stock: Number(fd.get('stock')) || 0,
      status: String(fd.get('status') || 'draft'),
      image_urls: images
    };
    const result = id
      ? await supabase.from('motorcycles').update(values).eq('id', id).select('id').single()
      : await supabase.from('motorcycles').insert(values).select('id').single();
    if (result.error) { toast(result.error.message, 'error'); return; }

    const savedId = result.data.id;
    const photos = fd.getAll('photos').filter((file) => file instanceof File && file.size > 0);
    let uploadFailure = null;
    for (const photo of photos) {
      const body = new FormData();
      body.append('photo', photo, photo.name);
      body.append('motorcycle_id', savedId);
      const { data, error } = await supabase.functions.invoke('telegram-photo-upload', { body });
      if (error || !data?.photo_asset?.id) {
        uploadFailure = error?.message || 'تعذر تأكيد حفظ صورة في سجل الصور';
        break;
      }
    }
    await loadMotorcycles();
    closeModal();
    render();
    if (uploadFailure) toast(`تم حفظ بيانات الدراجة، لكن رفع الصور توقف: ${uploadFailure}`, 'error');
    else toast(photos.length ? 'تم حفظ الدراجة وربط الصور في Telegram وSupabase' : 'تم حفظ الدراجة في Supabase', 'success');
    return;
  }


});

/* ---------- Event: Input / Change ---------- */
document.addEventListener('input', (e) => {
  if (e.target.id === 'searchInput') {
    state.search = e.target.value;
    const grid = $('#productsGrid');
    if (grid) {
      const bikes = filteredBikes();
      grid.innerHTML = bikes.length
        ? bikes.map(productCard).join('')
        : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p>لا توجد نتائج</p></div>`;
    }
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'filterCat') { state.filterCat = e.target.value; render(); }
  if (e.target.id === 'filterPrice') { state.filterPrice = e.target.value; render(); }
});

/* ---------- Keyboard A11y ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#modalOverlay').classList.contains('show')) closeModal();
    else if (state.sidebarOpen) closeSidebar();
  }
});

/* ---------- Init ---------- */
async function loadMotorcycles() {
  if (!supabase) return;
  let query = supabase.from('motorcycles')
    .select('id,name,model_year,category,price,stock,image_urls,status')
    .order('created_at', { ascending: false });
  if (!state.user || (state.user.role === 'customer') || (state.user.role === 'staff' && !hasAnyPermission('catalog_view', 'catalog_manage'))) query = query.eq('status', 'available');
  const { data, error } = await query;
  if (error) { console.error('Catalogue load failed', error); return; }
  state.bikes = (data || []).map((row) => ({
    id: row.id, name: row.name, model: String(row.model_year || ''), category: row.category,
    price: Number(row.price), stock: row.stock, images: row.image_urls || [], status: row.status
  }));
  set(DB.BIKES, state.bikes);
}

async function loadSalesData() {
  if (!state.user || state.user.role !== 'admin' || !supabase) {
    state.sales = [];
    return;
  }
  const { data, error } = await supabase.from('sales')
    .select('id,invoice_number,customer_name,customer_phone,total,amount_paid,payment_status,created_at')
    .eq('channel', 'showroom')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) {
    console.error('Sales load failed', error);
    toast('تعذر تحميل سجل الفواتير', 'error');
    return;
  }
  state.sales = data || [];
}

async function loadCustomerData() {
  const user = state.user;
  if (!user || !supabase) return;
  const [{ data: requests, error: requestError }, { data: favorites, error: favoriteError }] = await Promise.all([
    supabase.from('customer_requests').select('id,motorcycle_id,requested_name,requested_model_year,budget,notes,status,created_at').eq('client_user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('favorites').select('motorcycle_id').eq('user_id', user.id)
  ]);
  if (requestError) console.error('Customer request load failed', requestError);
  if (favoriteError) console.error('Favorites load failed', favoriteError);
  set(DB.CUSTOM_REQS, (requests || []).map((r) => ({id:r.id,motorcycleId:r.motorcycle_id,bikeName:r.requested_name,model:r.requested_model_year || '',budget:Number(r.budget || 0),status:r.status,createdAt:r.created_at,customerEmail:user.email,notes:r.notes || ''})));
  set(DB.ORDERS, []);
  set(DB.FAVS, { [user.id]: (favorites || []).map((f) => f.motorcycle_id) });
}

async function loadBusinessData() {
  if (!state.user || !['staff', 'admin'].includes(state.user.role) || !supabase) return;
  if (state.user.role === 'staff' && !hasRequestAccess()) { set(DB.CUSTOM_REQS, []); state.contactMessages = []; return; }
  const canSeeContacts = hasPermission('customer_data_view') || hasRequestAccess();
  const requestFields = 'id,client_user_id,motorcycle_id,requested_name,requested_model_year,budget,notes,status,created_at' +
    (canSeeContacts ? ',requester_name,requester_phone,requester_email,preferred_contact' : '');
  const [requestResult, messageResult] = await Promise.all([
    supabase.from('customer_requests').select(requestFields).order('created_at', { ascending: false }).limit(200),
    canSeeContacts ? supabase.from('contact_messages').select('id,sender_user_id,name,email,phone,message,preferred_contact,status,created_at').order('created_at', { ascending: false }).limit(200) : Promise.resolve({data:[],error:null})
  ]);
  if (requestResult.error) { console.error('Business request load failed', requestResult.error); toast('تعذر تحميل طلبات العملاء', 'error'); return; }
  if (messageResult.error) console.error('Contact inbox load failed', messageResult.error);
  const requests = requestResult.data || [];
  const ids = [...new Set(requests.filter((r) => r.client_user_id && !r.requester_name).map((r) => r.client_user_id))];
  const profileResult = ids.length && hasPermission('customer_data_view')
    ? await supabase.from('profiles').select('id,full_name,phone').in('id', ids)
    : {data:[],error:null};
  const profiles = new Map((profileResult.data || []).map((p) => [p.id, p]));
  set(DB.CUSTOM_REQS, requests.map((r) => {
    const p = profiles.get(r.client_user_id) || {};
    return {id:r.id,clientUserId:r.client_user_id,motorcycleId:r.motorcycle_id,bikeName:r.requested_name,model:r.requested_model_year || '',budget:Number(r.budget || 0),status:r.status,createdAt:r.created_at,customerName:r.requester_name || p.full_name || '',customerPhone:r.requester_phone || p.phone || '',customerEmail:r.requester_email || '',preferredContact:r.preferred_contact || 'phone',notes:r.notes || ''};
  }));
  state.contactMessages = messageResult.data || [];
  const requestIds = requests.map((r) => r.id);
  const messageIds = state.contactMessages.map((m) => m.id);
  const [requestReplies, contactReplies] = await Promise.all([
    requestIds.length ? supabase.from('customer_request_replies').select('id,request_id,reply_body,channel,sent_at,created_at').in('request_id', requestIds).order('created_at', {ascending:false}) : Promise.resolve({data:[],error:null}),
    messageIds.length ? supabase.from('contact_message_replies').select('id,message_id,reply_body,channel,sent_at,created_at').in('message_id', messageIds).order('created_at', {ascending:false}) : Promise.resolve({data:[],error:null})
  ]);
  if (requestReplies.error) console.error('Request reply history failed', requestReplies.error);
  if (contactReplies.error) console.error('Contact reply history failed', contactReplies.error);
  state.requestReplies = requestReplies.data || [];
  state.contactReplies = contactReplies.data || [];
}

async function loadStaffDirectory() {
  if (!state.user || state.user.role !== 'admin' || !supabase) return;
  const { data, error } = await supabase.functions.invoke('manage-staff', { body: { action: 'list' } });
  if (error || !Array.isArray(data?.staff)) { console.error('Staff directory load failed', error || data?.error); return; }
  set(DB.USERS, data.staff.map((person) => ({
    id: person.id,
    name: person.name || '',
    email: person.email || '',
    phone: person.phone || '',
    permissions: person.permissions || [],
    role: 'staff'
  })));
}

async function init() {
  // Business records come from Supabase. Legacy browser-local keys are left untouched and unused.
  if (!supabaseConfigured || !supabase) toast('إعداد Supabase غير مكتمل', 'error');
  else {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        const profile = await getCurrentProfile(session.user.id);
        if (!profile) throw new Error('Supabase profile is missing for this account.');
        state.user = { ...profile, id: session.user.id, email: session.user.email };
        if (state.user.role === 'customer') await loadCustomerData();
        else { await loadBusinessData(); await loadStaffDirectory(); }
      } catch (error) { console.error('Profile load failed', error); }
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { state.user = null; set(DB.ORDERS, []); set(DB.CUSTOM_REQS, []); set(DB.FAVS, {}); render(); }
    });
    await loadMotorcycles();
    if (state.user?.role === 'admin') await loadSalesData();
  }
  render();
}

const EN = {
  'الرئيسية':'Home','اطلب موتسيكلك':'Request a motorcycle','تواصل معنا':'Contact us','تسجيل الدخول':'Sign in','حساب جديد':'Create account',
  'حسابات الموظفين':'Staff accounts','الموظفون الحاليون':'Current staff','إنشاء حساب موظف':'Create staff account',
  'اسم الموظف':'Staff name','البريد الإلكتروني':'Email address','رقم الهاتف (اختياري)':'Phone (optional)',
  'الصلاحيات الممنوحة — لا شيء محدد افتراضيًا':'Granted permissions — none selected by default',
  'عرض الكتالوج والمخزون':'View catalog and inventory','إدارة الدراجات والصور':'Manage motorcycles and photos',
  'عرض طلبات العملاء':'View customer requests','تحديث حالة الطلبات':'Update request status',
  'رؤية أسماء وهواتف العملاء':'View customer names and phone numbers', 
  'إعادة إرسال تأكيد البريد':'Resend email confirmation',
  'التسوق':'SHOP','الحساب':'ACCOUNT','حسابي':'My account','معرض الدراجات':'Motorcycle catalog',
  'تصفح مجموعتنا المختارة من أفضل الدراجات النارية':'Browse our selected motorcycles',
  'اقــود':'Ride','أسطورتك':'your legend','على عجلتين':'on two wheels',
  'أفضل الدراجات النارية الرياضية بأعلى جودة وأفضل الأسعار. اختر دراجتك الآن من El Khayal Motors.':'Sport motorcycles, quality and great value. Find your ride at El Khayal Motors.',
  'اطلب موتسيكلك الخاص':'Request a motorcycle','تصفح مجموعتنا المختارة من أفضل الدراجات النارية':'Browse our selected motorcycles',
  'ابحث بالاسم أو الموديل...':'Search by name or model...','كل الفئات':'All categories','كل الأسعار':'All prices',
  'أقل من 500 ألف':'Under 500,000','500 ألف - مليون':'500,000–1,000,000','أكثر من مليون':'Over 1,000,000',
  'لا توجد دراجات مطابقة للبحث':'No motorcycles match your search','اطلب موتسيكلك الخاص':'Request a motorcycle',
  'لم تجد الدراجة التي تريدها؟ اطلبها وسنتواصل معك':'Can’t find the motorcycle you want? Send a request and we’ll contact you.',
  'الاسم':'Name','رقم الهاتف':'Phone number','اسم الدراجة المطلوبة':'Motorcycle requested','الموديل / السنة':'Model year',
  'الميزانية التقريبية (ج.م)':'Approximate budget (EGP)','ملاحظات إضافية':'Additional notes','إرسال الطلب':'Send request',
  'تواصل معنا':'Contact us','نحن هنا لخدمتك':'We’re here to help','بيانات المعرض':'Showroom details','أرسل رسالة':'Send a message',
  'البريد الإلكتروني':'Email','الرسالة':'Message','إرسال':'Send','أدخل بياناتك للوصول إلى حسابك':'Sign in to access your account',
  'كلمة المرور':'Password','دخول':'Sign in','ليس لديك حساب؟':'Don’t have an account?','أنشئ حساباً جديداً':'Create an account',
  'حساب جديد':'Create account','سجل الآن لتتمكن من الشراء والمفضلة':'Create an account to make requests and save favorites',
  'الاسم الكامل':'Full name','إنشاء الحساب':'Create account','لديك حساب بالفعل؟':'Already have an account?',
  'تم تسجيل الخروج':'Signed out','سجّل الدخول لإرسال طلبك':'Sign in to send a request',
  'يرتبط الطلب بحسابك لحماية بياناتك ومتابعته.':'Requests are linked to your account so you can track them securely.',
  'تفاصيل':'Details','شراء':'Request purchase','متوفر':'Available','غير متوفر':'Unavailable','المفضلة':'Favorites','طلباتي':'My requests',
  'سجل الدخول أولاً':'Please sign in first','عميل':'Customer','موظف':'Employee','مدير':'Manager'
};
function applyLanguage(root) {
  const en = state.language === 'en';
  document.documentElement.lang = en ? 'en' : 'ar';
  document.documentElement.dir = en ? 'ltr' : 'rtl';
  const button = $('#languageToggle');
  if (button) button.textContent = en ? 'العربية' : 'English';
  if (!en) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue || '';
    const trimmed = raw.trim();
    if (EN[trimmed]) node.nodeValue = raw.replace(trimmed, EN[trimmed]);
  }
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach((el) => {
    for (const attr of ['placeholder','aria-label','title']) {
      const value = el.getAttribute(attr);
      if (value && EN[value]) el.setAttribute(attr, EN[value]);
    }
  });
}
$('#languageToggle')?.addEventListener('click', () => {
  state.language = state.language === 'ar' ? 'en' : 'ar';
  localStorage.setItem('ekm_language', state.language);
  render();
});

init();
