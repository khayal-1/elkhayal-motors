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

const state = {
  user: null,
  route: 'home',
  search: '',
  filterCat: 'all',
  filterPrice: 'all',
  sidebarOpen: false,
  bikes: [],
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
    options: { data: { full_name: safeName(name), phone: safeName(phone) } }
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
  if (!u) return `<section class="panel"><h2>سجّل الدخول لإرسال طلبك</h2><p>يرتبط الطلب بحسابك لحماية بياناتك ومتابعته.</p><button class="btn btn-primary" data-nav="login">تسجيل الدخول</button></section>`;
  return `
    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> اطلب موتسيكلك الخاص</h2>
    <p class="page-sub">لم تجد الدراجة التي تريدها؟ اطلبها وسنتواصل معك</p>
    <div class="panel" style="max-width:640px">
      <form id="requestForm" class="form-grid">
        <div class="field"><label>اسم الدراجة المطلوبة</label>
          <input name="bikeName" required placeholder="مثال: BMW S1000RR"></div>
        <div class="form-row">
          <div class="field"><label>الموديل / السنة</label><input name="model" required placeholder="2024"></div>
          <div class="field"><label>الميزانية التقريبية (ج.م)</label><input type="number" name="budget" required min="0"></div>
        </div>
        <div class="field"><label>ملاحظات إضافية</label>
          <textarea name="notes" placeholder="لون، مواصفات خاصة..."></textarea></div>
        <button class="btn btn-primary" type="submit">
          <i class="fa-solid fa-paper-plane"></i> إرسال الطلب
        </button>
      </form>
    </div>`;
}

function pageContact() {
  return `
    <h2 class="page-title"><i class="fa-solid fa-headset"></i> تواصل معنا</h2>
    <p class="page-sub">نحن هنا لخدمتك</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-address-card"></i> بيانات المعرض</div>
        <p style="margin-bottom:12px"><i class="fa-solid fa-location-dot text-red" style="width:24px"></i> شارع التسعين، القاهرة الجديدة</p>
        <p style="margin-bottom:12px"><i class="fa-solid fa-phone text-red" style="width:24px"></i> 0100 000 0000</p>
        <p style="margin-bottom:12px"><i class="fa-solid fa-envelope text-red" style="width:24px"></i> info@elkhayal.com</p>
        <p><i class="fa-solid fa-clock text-red" style="width:24px"></i> السبت - الخميس: 10ص - 10م</p>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-paper-plane"></i> أرسل رسالة</div>
        <form id="contactForm" class="form-grid">
          <div class="field"><label>الاسم</label><input name="name" required></div>
          <div class="field"><label>البريد الإلكتروني</label><input type="email" name="email" required></div>
          <div class="field"><label>الرسالة</label><textarea name="message" required></textarea></div>
          <button class="btn btn-primary" type="submit"><i class="fa-solid fa-paper-plane"></i> إرسال</button>
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
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
  if (u.role === 'staff') return pageNoPermission();
  return `<h2 class="page-title"><i class="fa-solid fa-cash-register"></i> نقطة البيع POS</h2><div class="panel"><p>تسجيل المبيعات والفواتير غير مفعّل بعد؛ لن تُسجّل عملية أو يُخصم مخزون من المتصفح.</p></div>`;
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
  const showContact = hasPermission('customer_data_view');
  const canManage = hasPermission('requests_manage');
  return `<h2 class="page-title"><i class="fa-solid fa-clipboard-list"></i> طلبات العملاء</h2>
    <p class="page-sub">الطلبات محفوظة في Supabase وتُعرض وفق الصلاحيات الممنوحة.</p><div class="panel">
      ${requests.length ? `<div class="table-wrap"><table><thead><tr>${showContact ? '<th>العميل</th><th>الهاتف</th>' : ''}<th>المطلوب</th><th>السنة</th><th>الميزانية</th><th>الحالة</th><th>التاريخ</th>${canManage ? '<th>إجراء</th>' : ''}</tr></thead><tbody>
      ${requests.map((r) => `<tr>${showContact ? `<td>${esc(r.customerName || '—')}</td><td>${esc(r.customerPhone || '—')}</td>` : ''}<td>${esc(r.bikeName || '—')}</td><td>${esc(r.model || '—')}</td><td>${money(r.budget)}</td><td><span class="status-pill ${esc(r.status)}">${esc(requestStatusLabel(r.status))}</span></td><td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : '—'}</td>${canManage ? `<td><button class="btn btn-primary btn-sm" data-approve-req="${esc(r.id)}" ${r.status !== 'pending' ? 'disabled' : ''}>✓</button> <button class="btn btn-danger btn-sm" data-reject-req="${esc(r.id)}" ${r.status !== 'pending' ? 'disabled' : ''}>×</button></td>` : ''}</tr>`).join('')}
      </tbody></table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات</p></div>`}</div>`;
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
}

/* ---------- Buy Flow ---------- */
function handleBuy(bikeId) {
  const u = currentUser();
  if (!u) {
    toast('يجب تسجيل الدخول أولاً', 'error');
    navigate('login');
    return;
  }
  const bike = get(DB.BIKES).find((b) => b.id === bikeId);
  if (!bike) return toast('الدراجة غير موجودة', 'error');
  if (bike.stock <= 0) return toast('الدراجة غير متوفرة حالياً', 'error');

  const img = (bike.images && bike.images[0]) || '';
  openModal(`
    <div class="modal-header">
      <h3><i class="fa-solid fa-cart-shopping"></i> تأكيد الشراء</h3>
      <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
    </div>
    ${img ? `<img src="${esc(img)}" alt="${esc(bike.name)}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:14px">` : ''}
    <h3 class="mb-1">${esc(bike.name)}</h3>
    <p class="text-muted mb-2">موديل ${esc(bike.model)} — ${esc(bike.category)}</p>
    <p class="text-red mb-3" style="font-size:24px;font-weight:900">${money(bike.price)}</p>
    <p class="mb-3">هل تريد إرسال طلب شراء لهذه الدراجة؟ سيتم التواصل معك من فريق المعرض.</p>
    <button class="btn btn-primary btn-block" data-confirm-buy="${esc(bike.id)}">
      <i class="fa-solid fa-check"></i> تأكيد إرسال الطلب
    </button>
  `);
}

async function confirmBuy(bikeId) {
  const u = currentUser();
  if (!u) return navigate('login');
  const bike = state.bikes.find((b) => b.id === bikeId);
  if (!bike) return toast('الدراجة غير موجودة', 'error');
  if (bike.stock <= 0) return toast('الدراجة غير متوفرة', 'error');
  const { error } = await supabase.from('customer_requests').insert({
    client_user_id: u.id,
    motorcycle_id: bike.id,
    requested_name: bike.name,
    requested_model_year: Number(bike.model) || null,
    budget: bike.price,
    notes: 'طلب شراء من صفحة الدراجة'
  });
  if (error) return toast(error.message, 'error');
  closeModal();
  await loadCustomerData();
  toast('تم إرسال طلبك بنجاح', 'success');
  navigate('orders');
}

/* ---------- Event: Click Delegation ---------- */
document.addEventListener('click', async (e) => {
  if (e.target.closest('#resendConfirmationBtn')) {
    if (!supabase) { toast('الخدمة غير مهيأة حالياً', 'error'); return; }
    const email = safeName($('#loginForm input[name="email"]')?.value).toLowerCase();
    if (!email) { toast('اكتب البريد الإلكتروني أولاً', 'error'); return; }
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } });
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
  if (form.id === 'requestForm') {
    const fd = new FormData(form);
    const u = currentUser();
    if (!u || !supabase) { toast('سجّل الدخول أولاً', 'error'); navigate('login'); return; }
    const { error } = await supabase.from('customer_requests').insert({
      client_user_id: u.id,
      requested_name: safeName(fd.get('bikeName')),
      requested_model_year: Number(fd.get('model')) || null,
      budget: Number(fd.get('budget')) || null,
      notes: safeName(fd.get('notes')) || null
    });
    if (error) { toast(error.message, 'error'); return; }
    await loadCustomerData();
    toast('تم إرسال طلبك، سنتواصل معك قريباً', 'success');
    form.reset();
    renderSidebar();
    return;
  }

  /* Contact messages are sent to the protected Supabase table. */
  if (form.id === 'contactForm') {
    const fd = new FormData(form);
    if (!supabase) { toast('الخدمة غير مهيأة حالياً', 'error'); return; }
    const { error } = await supabase.from('contact_messages').insert({
      sender_user_id: currentUser()?.id || null,
      name: safeName(fd.get('name')),
      email: safeName(fd.get('email')),
      message: safeName(fd.get('message'))
    });
    if (error) { toast(error.message, 'error'); return; }
    toast('تم إرسال رسالتك', 'success');
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
      toast(data?.error || error?.message || 'تعذر إنشاء حساب الموظف', 'error');
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
  if (state.user.role === 'staff' && !hasRequestAccess()) { set(DB.CUSTOM_REQS, []); return; }
  const { data: requests, error } = await supabase.from('customer_requests').select('id,client_user_id,motorcycle_id,requested_name,requested_model_year,budget,notes,status,created_at').order('created_at', { ascending: false });
  if (error) { console.error('Business request load failed', error); return; }
  const ids = [...new Set((requests || []).map((r) => r.client_user_id).filter(Boolean))];
  const profileResult = ids.length && hasPermission('customer_data_view')
    ? await supabase.from('profiles').select('id,full_name,phone').in('id', ids)
    : {data:[],error:null};
  if (profileResult.error) console.error('Request profile load failed', profileResult.error);
  const profiles = new Map((profileResult.data || []).map((p) => [p.id, p]));
  set(DB.CUSTOM_REQS, (requests || []).map((r) => { const p = profiles.get(r.client_user_id) || {}; return {id:r.id,clientUserId:r.client_user_id,motorcycleId:r.motorcycle_id,bikeName:r.requested_name,model:r.requested_model_year || '',budget:Number(r.budget || 0),status:r.status,createdAt:r.created_at,customerName:p.full_name || '',customerPhone:p.phone || '',notes:r.notes || ''}; }));
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
