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
  sidebarOpen: false
};

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

function get(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}
function set(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (err) { console.error('localStorage write failed:', err); }
}

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

/* ---------- Seed Data ---------- */
function seedData() {
  if (localStorage.getItem(DB.SEEDED) === '1') return;

  /* Users */
  const users = [
    {
      id: 'admin-1',
      name: 'مدير النظام',
      email: 'admin@elkhayal.com',
      password: 'admin123',
      phone: '01000000001',
      role: 'admin',
      target: 0,
      createdAt: nowISO()
    },
    {
      id: 'staff-1',
      name: 'أحمد الموظف',
      email: 'staff@elkhayal.com',
      password: 'staff123',
      phone: '01000000002',
      role: 'staff',
      target: 500000,
      createdAt: nowISO()
    }
  ];
  set(DB.USERS, users);

  /* Bikes — 6 bikes, 3 images each */
  const bikes = [
    {
      id: 'bike-bmw',
      name: 'BMW S1000RR',
      model: '2024',
      category: 'سبورت',
      price: 850000,
      stock: 3,
      images: [
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80',
        'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&q=80',
        'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=900&q=80'
      ]
    },
    {
      id: 'bike-yamaha',
      name: 'Yamaha YZF-R1',
      model: '2024',
      category: 'سبورت',
      price: 720000,
      stock: 2,
      images: [
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80',
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&q=80',
        'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&q=80'
      ]
    },
    {
      id: 'bike-ducati',
      name: 'Ducati Panigale V4',
      model: '2024',
      category: 'سبورت',
      price: 1250000,
      stock: 1,
      images: [
        'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=900&q=80',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80',
        'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&q=80'
      ]
    },
    {
      id: 'bike-kawasaki',
      name: 'Kawasaki Ninja H2',
      model: '2023',
      category: 'سبورت',
      price: 1500000,
      stock: 2,
      images: [
        'https://images.unsplash.com/photo-1558980664-10e7170b5df9?w=900&q=80',
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80',
        'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&q=80'
      ]
    },
    {
      id: 'bike-honda',
      name: 'Honda CBR1000RR',
      model: '2024',
      category: 'سبورت',
      price: 680000,
      stock: 4,
      images: [
        'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=900&q=80',
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&q=80',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80'
      ]
    },
    {
      id: 'bike-benelli',
      name: 'Benelli TNT 600',
      model: '2024',
      category: 'naked',
      price: 320000,
      stock: 5,
      images: [
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=900&q=80',
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&q=80',
        'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=900&q=80'
      ]
    }
  ];
  set(DB.BIKES, bikes);

  /* Seed invoice + order for testing */
  const seedInvoice = {
    id: uid(),
    number: 'INV-0001',
    customer: 'عميل تجريبي',
    customerEmail: 'customer@demo.com',
    bikeId: 'bike-yamaha',
    bikeName: 'Yamaha YZF-R1',
    price: 720000,
    staffId: 'staff-1',
    staffName: 'أحمد الموظف',
    createdAt: nowISO()
  };
  set(DB.INVOICES, [seedInvoice]);

  const seedOrder = {
    id: uid(),
    customer: 'عميل تجريبي',
    customerEmail: 'customer@demo.com',
    bikeId: 'bike-bmw',
    bikeName: 'BMW S1000RR',
    price: 850000,
    status: 'pending',
    createdAt: nowISO()
  };
  set(DB.ORDERS, [seedOrder]);

  set(DB.FAVS, {});
  set(DB.CUSTOM_REQS, []);
  set(DB.MESSAGES, []);

  localStorage.setItem(DB.SEEDED, '1');
}

/* =========================================================
   SECTION 2 — AUTH & RBAC
   ========================================================= */

function currentUser() {
  if (state.user) return state.user;
  const s = get(DB.SESSION, null);
  if (s && s.id) { state.user = s; return s; }
  return null;
}

function login(email, password) {
  const users = get(DB.USERS);
  const u = users.find(
    (x) =>
      String(x.email || '').toLowerCase() === String(email || '').toLowerCase() &&
      x.password === password
  );
  if (!u) return null;
  const { password: _, ...safe } = u;
  set(DB.SESSION, safe);
  state.user = safe;
  return safe;
}

function logout() {
  localStorage.removeItem(DB.SESSION);
  state.user = null;
  state.route = 'home';
  closeSidebar();
  render();
  toast('تم تسجيل الخروج', 'info');
}

function signup({ name, email, phone, password }) {
  const users = get(DB.USERS);
  if (users.some((u) => String(u.email).toLowerCase() === String(email).toLowerCase())) {
    return { ok: false, msg: 'البريد مستخدم بالفعل' };
  }
  const user = {
    id: uid(),
    name: safeName(name),
    email: String(email || '').trim(),
    phone: safeName(phone),
    password: String(password || ''),
    role: 'customer',
    target: 0,
    createdAt: nowISO()
  };
  users.push(user);
  set(DB.USERS, users);
  const { password: _, ...safe } = user;
  set(DB.SESSION, safe);
  state.user = safe;
  return { ok: true, user: safe };
}

function hasRole(...roles) {
  const u = currentUser();
  return !!u && roles.includes(u.role);
}

/* ---------- Sidebar Items (Role-based) ---------- */
function sidebarItems() {
  const u = currentUser();
  const pendingReqs = get(DB.CUSTOM_REQS).filter((r) => r.status === 'pending').length;
  const pendingOrders = get(DB.ORDERS).filter((o) => o.status === 'pending').length;
  const pendingTotal = pendingReqs + pendingOrders;

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
    return [
      { section: 'نظام المبيعات' },
      { route: 'pos', label: 'نقطة البيع POS', icon: 'fa-cash-register' },
      { route: 'target', label: 'تارجت الشهر', icon: 'fa-bullseye' },
      { section: 'المخزن' },
      { route: 'inventory', label: 'المخزن والأسعار', icon: 'fa-boxes-stacked' },
      { section: 'الطلبات' },
      { route: 'staff-orders', label: 'طلبات العملاء', icon: 'fa-clipboard-list', badge: pendingTotal || null }
    ];
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
  let bikes = get(DB.BIKES);
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
  const imgs = (b.images && b.images.length) ? b.images : ['https://via.placeholder.com/900x600?text=No+Image'];
  const first = imgs[0];
  const dots = imgs.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('');

  const stockClass = b.stock <= 0 ? 'out' : b.stock <= 2 ? 'low' : 'in';
  const stockText = b.stock <= 0 ? 'غير متوفر' : b.stock <= 2 ? `آخر ${b.stock} قطع` : 'متوفر';

  return `
    <article class="product-card" data-bike-id="${esc(b.id)}">
      <div class="slider-wrap" data-slider data-idx="0">
        <img src="${esc(first)}" alt="${esc(b.name)}" data-slide-img loading="lazy">
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
  const cats = Array.from(new Set(get(DB.BIKES).map((b) => b.category)));
  return `
    <section class="hero">
      <h1>اقــود <span>أسطورتك</span> على عجلتين</h1>
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
    <p class="page-sub">لم تجد الدراجة التي تريدها؟ اطلبها وسنتواصل معك</p>
    <div class="panel" style="max-width:640px">
      <form id="requestForm" class="form-grid">
        <div class="form-row">
          <div class="field"><label>الاسم</label><input name="name" required value="${esc(u ? u.name : '')}"></div>
          <div class="field"><label>رقم الهاتف</label><input name="phone" required value="${esc(u && u.phone ? u.phone : '')}"></div>
        </div>
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
      <div class="auth-switch">ليس لديك حساب؟ <a data-nav="signup">أنشئ حساباً جديداً</a></div>
      <div class="auth-switch" style="margin-top:10px;font-size:11px;color:var(--gray-400)">
        تجريبي — مدير: admin@elkhayal.com / admin123<br>
        موظف: staff@elkhayal.com / staff123
      </div>
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
  const orders = get(DB.ORDERS).filter((o) => o.customerEmail === u.email);
  const reqs = get(DB.CUSTOM_REQS).filter((r) => r.customerEmail === u.email);
  return `
    <h2 class="page-title"><i class="fa-solid fa-user"></i> ملفي الشخصي</h2>
    <p class="page-sub">بياناتك، طلباتك، وحالة طلباتك الخاصة</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-receipt"></i></div><div class="stat-label">إجمالي طلباتي</div><div class="stat-value">${orders.length}</div></div>
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
              <td><span class="status-pill ${r.status}">${r.status === 'pending' ? 'قيد المراجعة' : r.status === 'approved' ? 'تم القبول' : 'مرفوض'}</span></td>
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
  const orders = get(DB.ORDERS).filter((o) => o.customerEmail === u.email);
  return `
    <h2 class="page-title"><i class="fa-solid fa-receipt"></i> طلباتي</h2>
    <p class="page-sub">سجل طلبات الشراء الخاصة بك</p>
    <div class="panel">
      ${orders.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>الدراجة</th><th>السعر</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${orders.map((o) => `
            <tr>
              <td>${esc(o.bikeName)}</td>
              <td style="color:var(--red);font-weight:700">${money(o.price)}</td>
              <td><span class="status-pill ${o.status}">${o.status === 'pending' ? 'قيد المراجعة' : o.status === 'approved' ? 'مقبول' : 'مرفوض'}</span></td>
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
  const bikes = get(DB.BIKES).filter((b) => b.stock > 0);
  return `
    <h2 class="page-title"><i class="fa-solid fa-cash-register"></i> نقطة البيع POS</h2>
    <p class="page-sub">سجل عملية بيع جديدة وأصدر فاتورة قابلة للطباعة</p>
    <div class="pos-grid">
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-cart-plus"></i> بيانات البيع</div>
        <form id="posForm" class="form-grid">
          <div class="field"><label>اسم العميل</label><input name="customer" required></div>
          <div class="field"><label>إيميل العميل (اختياري)</label><input type="email" name="customerEmail"></div>
          <div class="field"><label>اختر الدراجة</label>
            <select name="bikeId" id="posBikeSelect" required>
              <option value="">-- اختر --</option>
              ${bikes.map((b) => `<option value="${esc(b.id)}" data-price="${b.price}">${esc(b.name)} (${esc(b.model)}) — ${money(b.price)} — متبقي ${b.stock}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>السعر النهائي (ج.م)</label>
            <input type="number" name="price" id="posPrice" required min="0"></div>
          <button class="btn btn-primary btn-block" type="submit">
            <i class="fa-solid fa-file-invoice-dollar"></i> إتمام البيع وإصدار فاتورة
          </button>
        </form>
      </div>
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-clock-rotate-left"></i> آخر فواتيري</div>
        <div id="myInvoicesMini"></div>
      </div>
    </div>`;
}

function renderMyInvoicesMini() {
  const u = currentUser();
  if (!u) return;
  const el = $('#myInvoicesMini');
  if (!el) return;
  const invoices = get(DB.INVOICES).filter((i) => i.staffId === u.id).slice(-5).reverse();
  if (!invoices.length) {
    el.innerHTML = `<div class="empty"><i class="fa-solid fa-receipt"></i><p>لا توجد فواتير بعد</p></div>`;
    return;
  }
  el.innerHTML = invoices.map((inv) => `
    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--gray-100)">
      <div>
        <b style="font-size:13px">#${esc(inv.number)}</b>
        <div style="font-size:11px;color:var(--gray-500)">${esc(inv.bikeName)}</div>
      </div>
      <div style="text-align:left">
        <b class="text-red" style="font-size:14px">${money(inv.price)}</b>
        <div style="font-size:10px;color:var(--gray-400)">${new Date(inv.createdAt).toLocaleDateString('ar-EG')}</div>
      </div>
    </div>`).join('');
}

function handlePOSSubmit(formData) {
  const u = currentUser();
  if (!u) return;
  const bikeId = formData.get('bikeId');
  const bikes = get(DB.BIKES);
  const bike = bikes.find((b) => b.id === bikeId);
  if (!bike) return toast('اختر دراجة صحيحة', 'error');
  if (bike.stock <= 0) return toast('نفذ المخزون من هذه الدراجة', 'error');

  const price = Number(formData.get('price'));
  if (!price || price <= 0) return toast('أدخل سعراً صحيحاً', 'error');

  const customer = safeName(formData.get('customer'));
  const customerEmail = String(formData.get('customerEmail') || '').trim();
  if (!customer) return toast('اسم العميل مطلوب', 'error');

  bike.stock -= 1;
  set(DB.BIKES, bikes);

  const invoices = get(DB.INVOICES);
  const nextNum = invoices.length + 1;
  const number = 'INV-' + String(nextNum).padStart(4, '0');
  const inv = {
    id: uid(),
    number,
    customer,
    customerEmail,
    bikeId: bike.id,
    bikeName: bike.name,
    price,
    staffId: u.id,
    staffName: u.name,
    createdAt: nowISO()
  };
  invoices.push(inv);
  set(DB.INVOICES, invoices);

  showInvoiceModal(inv);
  renderMyInvoicesMini();
  renderSidebar();
  toast('تمت العملية بنجاح', 'success');
}

function showInvoiceModal(inv) {
  openModal(`
    <div class="modal-header">
      <h3><i class="fa-solid fa-file-invoice"></i> فاتورة #${esc(inv.number)}</h3>
      <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="invoice" id="printableInvoice">
      <div class="invoice-header">
        <div>
          <div class="logo">El Khayal <span>Motors</span></div>
          <div style="font-size:11px;color:var(--gray-500)">معرض الدراجات النارية</div>
        </div>
        <div class="invoice-meta">
          <div><b>${esc(inv.number)}</b></div>
          <div>${new Date(inv.createdAt).toLocaleString('ar-EG')}</div>
        </div>
      </div>
      <div class="flex-between" style="font-size:13px;margin-bottom:10px">
        <div><b>العميل:</b> ${esc(inv.customer)}</div>
        <div><b>الموظف:</b> ${esc(inv.staffName)}</div>
      </div>
      <table class="invoice-table">
        <thead><tr><th>المنتج</th><th>السعر</th></tr></thead>
        <tbody><tr><td>${esc(inv.bikeName)}</td><td>${money(inv.price)}</td></tr></tbody>
      </table>
      <div class="invoice-total"><span>الإجمالي</span><span>${money(inv.price)}</span></div>
      <p style="text-align:center;font-size:11px;color:var(--gray-400);margin-top:14px">شكراً لتعاملكم مع El Khayal Motors</p>
    </div>
    <button class="btn btn-primary btn-block mt-2" id="printInvoiceBtn">
      <i class="fa-solid fa-print"></i> طباعة الفاتورة
    </button>
  `);
}

/* =========================================================
   SECTION 5 — ADMIN & STAFF MONITORING
   ========================================================= */

function pageTarget() {
  const u = currentUser();
  if (!u) return pageLogin();
  const now = new Date();
  const invoices = get(DB.INVOICES).filter((i) => {
    const d = new Date(i.createdAt);
    return i.staffId === u.id && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const achieved = invoices.reduce((s, i) => s + i.price, 0);
  const target = u.target || 0;
  const percent = target ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const remaining = Math.max(0, target - achieved);

  return `
    <h2 class="page-title"><i class="fa-solid fa-bullseye"></i> تارجت الشهر</h2>
    <p class="page-sub">مبيعاتك الشهرية مقارنة بالهدف المحدد</p>
    <div class="panel">
      <div class="flex-between mb-1">
        <span style="font-weight:700">${esc(u.name)}</span>
        <span class="text-red" style="font-weight:900">${percent}%</span>
      </div>
      <div class="progress-outer"><div class="progress-inner" style="width:${percent}%">${percent}%</div></div>
      <div class="stats-grid" style="margin-top:18px;margin-bottom:0">
        <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-coins"></i></div><div class="stat-label">محقق</div><div class="stat-value" style="font-size:18px">${money(achieved)}</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-flag-checkered"></i></div><div class="stat-label">التارجت</div><div class="stat-value" style="font-size:18px">${money(target)}</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-receipt"></i></div><div class="stat-label">عدد الفواتير</div><div class="stat-value" style="font-size:18px">${invoices.length}</div></div>
        <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div><div class="stat-label">المتبقي</div><div class="stat-value" style="font-size:18px">${money(remaining)}</div></div>
      </div>
    </div>`;
}

function pageInventory() {
  const u = currentUser();
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
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
  const invoices = get(DB.INVOICES);
  const bikes = get(DB.BIKES);
  const users = get(DB.USERS);
  const orders = get(DB.ORDERS);
  const reqs = get(DB.CUSTOM_REQS);
  const totalSales = invoices.reduce((s, i) => s + i.price, 0);
  const totalStock = bikes.reduce((s, b) => s + b.stock, 0);
  const customers = users.filter((x) => x.role === 'customer').length;
  const pendingTotal =
    orders.filter((o) => o.status === 'pending').length +
    reqs.filter((r) => r.status === 'pending').length;

  return `
    <h2 class="page-title"><i class="fa-solid fa-chart-line"></i> لوحة الإحصائيات</h2>
    <p class="page-sub">نظرة عامة على أداء المعرض</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-sack-dollar"></i></div><div class="stat-label">إجمالي المبيعات</div><div class="stat-value" style="font-size:18px">${money(totalSales)}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-motorcycle"></i></div><div class="stat-label">الدراجات بالمخزن</div><div class="stat-value">${totalStock}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-users"></i></div><div class="stat-label">العملاء</div><div class="stat-value">${customers}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-bell"></i></div><div class="stat-label">طلبات جديدة</div><div class="stat-value">${pendingTotal}</div></div>
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-receipt"></i> آخر الفواتير</div>
      ${invoices.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>العميل</th><th>الدراجة</th><th>السعر</th><th>الموظف</th><th>التاريخ</th></tr></thead>
        <tbody>${invoices.slice(-8).reverse().map((i) => `
          <tr>
            <td>#${esc(i.number)}</td>
            <td>${esc(i.customer)}</td>
            <td>${esc(i.bikeName)}</td>
            <td class="text-red" style="font-weight:700">${money(i.price)}</td>
            <td>${esc(i.staffName)}</td>
            <td>${new Date(i.createdAt).toLocaleDateString('ar-EG')}</td>
          </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty"><i class="fa-solid fa-receipt"></i><p>لا توجد فواتير بعد</p></div>`}
    </div>`;
}

function pageManageBikes() {
  const u = currentUser();
  if (!u || u.role !== 'admin') return pageLogin();
  const bikes = get(DB.BIKES);
  return `
    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> إدارة الدراجات</h2>
    <p class="page-sub">إضافة، تعديل، وحذف الدراجات</p>
    <div class="panel">
      <button class="btn btn-primary mb-2" id="addBikeBtn">
        <i class="fa-solid fa-plus"></i> إضافة دراجة جديدة
      </button>
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
              <button class="btn btn-danger btn-sm" data-del-bike="${esc(b.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function bikeFormHTML(bike) {
  const isEdit = !!bike;
  const b = bike || { id: '', name: '', model: '', category: '', price: '', stock: 0, images: [] };
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
      <div class="field"><label>المخزون</label><input type="number" name="stock" required min="0" value="${esc(b.stock)}"></div>
      <div class="field">
        <label>روابط الصور (كل رابط في سطر)</label>
        <textarea name="images" rows="4" placeholder="https://...">${esc((b.images || []).join('\n'))}</textarea>
        <span class="hint">أضف 3 روابط لتظهر كسلايدر</span>
      </div>
      <button class="btn btn-primary btn-block" type="submit">
        <i class="fa-solid fa-floppy-disk"></i> حفظ
      </button>
    </form>`;
}

function pageStaff() {
  const u = currentUser();
  if (!u || u.role !== 'admin') return pageLogin();
  const staff = get(DB.USERS).filter((x) => x.role === 'staff');
  const invoices = get(DB.INVOICES);
  return `
    <h2 class="page-title"><i class="fa-solid fa-users-gear"></i> الموظفين والأداء</h2>
    <p class="page-sub">إدارة الموظفين ومتابعة التارجت</p>
    <div class="panel">
      <button class="btn btn-primary mb-2" id="addStaffBtn">
        <i class="fa-solid fa-user-plus"></i> إضافة موظف
      </button>
      <div class="table-wrap"><table>
        <thead><tr><th>الاسم</th><th>الإيميل</th><th>التارجت</th><th>المحقق</th><th>النسبة</th><th>إجراءات</th></tr></thead>
        <tbody>${staff.map((s) => {
          const achieved = invoices.filter((i) => i.staffId === s.id).reduce((sum, i) => sum + i.price, 0);
          const percent = s.target ? Math.min(100, Math.round((achieved / s.target) * 100)) : 0;
          return `<tr>
            <td><b>${esc(s.name)}</b></td>
            <td>${esc(s.email)}</td>
            <td>${money(s.target || 0)}</td>
            <td class="text-red" style="font-weight:700">${money(achieved)}</td>
            <td style="min-width:130px">
              <div class="progress-outer" style="height:8px;margin:0"><div class="progress-inner" style="width:${percent}%"></div></div>
              <small>${percent}%</small>
            </td>
            <td style="display:flex;gap:6px">
              <button class="btn btn-outline btn-sm" data-view-staff="${esc(s.id)}" title="عرض السجل"><i class="fa-solid fa-eye"></i></button>
              <button class="btn btn-danger btn-sm" data-del-staff="${esc(s.id)}" title="حذف"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('') || `<tr><td colspan="6" class="text-center">لا يوجد موظفون</td></tr>`}</tbody>
      </table></div>
    </div>`;
}

function pageStaffOrders() {
  const u = currentUser();
  if (!u || !['staff', 'admin'].includes(u.role)) return pageLogin();
  const reqs = get(DB.CUSTOM_REQS);
  const orders = get(DB.ORDERS);
  return `
    <h2 class="page-title"><i class="fa-solid fa-clipboard-list"></i> طلبات العملاء</h2>
    <p class="page-sub">مراجعة وتأكيد الطلبات</p>

    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-motorcycle"></i> طلبات الشراء</div>
      ${orders.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>العميل</th><th>الدراجة</th><th>السعر</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
        <tbody>${orders.slice().reverse().map((o) => `
          <tr>
            <td>${esc(o.customer)}${o.customerEmail ? `<br><small style="color:var(--gray-400)">${esc(o.customerEmail)}</small>` : ''}</td>
            <td>${esc(o.bikeName)}</td>
            <td>${money(o.price)}</td>
            <td><span class="status-pill ${o.status}">${o.status === 'pending' ? 'قيد المراجعة' : o.status === 'approved' ? 'مقبول' : 'مرفوض'}</span></td>
            <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-primary btn-sm" data-approve-order="${esc(o.id)}" ${o.status !== 'pending' ? 'disabled' : ''} title="قبول"><i class="fa-solid fa-check"></i></button>
              <button class="btn btn-danger btn-sm" data-reject-order="${esc(o.id)}" ${o.status !== 'pending' ? 'disabled' : ''} title="رفض"><i class="fa-solid fa-xmark"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات شراء</p></div>`}
    </div>

    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-star"></i> الطلبات الخاصة</div>
      ${reqs.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>العميل</th><th>الهاتف</th><th>الدراجة</th><th>الموديل</th><th>الميزانية</th><th>الحالة</th><th>إجراء</th></tr></thead>
        <tbody>${reqs.slice().reverse().map((r) => `
          <tr>
            <td>${esc(r.name)}</td>
            <td>${esc(r.phone)}</td>
            <td>${esc(r.bikeName)}</td>
            <td>${esc(r.model)}</td>
            <td>${money(r.budget)}</td>
            <td><span class="status-pill ${r.status}">${r.status === 'pending' ? 'قيد المراجعة' : r.status === 'approved' ? 'مقبول' : 'مرفوض'}</span></td>
            <td style="display:flex;gap:4px">
              <button class="btn btn-primary btn-sm" data-approve-req="${esc(r.id)}" ${r.status !== 'pending' ? 'disabled' : ''} title="قبول"><i class="fa-solid fa-check"></i></button>
              <button class="btn btn-danger btn-sm" data-reject-req="${esc(r.id)}" ${r.status !== 'pending' ? 'disabled' : ''} title="رفض"><i class="fa-solid fa-xmark"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات خاصة</p></div>`}
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

  if (state.route === 'pos') renderMyInvoicesMini();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigate(route) {
  if (!ROUTES[route]) route = 'home';
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

function confirmBuy(bikeId) {
  const u = currentUser();
  if (!u) return navigate('login');
  const bike = get(DB.BIKES).find((b) => b.id === bikeId);
  if (!bike) return toast('الدراجة غير موجودة', 'error');
  if (bike.stock <= 0) return toast('الدراجة غير متوفرة', 'error');

  const orders = get(DB.ORDERS);
  orders.push({
    id: uid(),
    customer: u.name,
    customerEmail: u.email,
    bikeId: bike.id,
    bikeName: bike.name,
    price: bike.price,
    status: 'pending',
    createdAt: nowISO()
  });
  set(DB.ORDERS, orders);
  closeModal();
  toast('تم إرسال طلبك بنجاح', 'success');
  navigate('orders');
}

/* ---------- Event: Click Delegation ---------- */
document.addEventListener('click', (e) => {
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
    const favMap = get(DB.FAVS, {});
    const list = favMap[u.id] || [];
    const i = list.indexOf(bikeId);
    if (i > -1) list.splice(i, 1);
    else list.push(bikeId);
    favMap[u.id] = list;
    set(DB.FAVS, favMap);
    toast(i > -1 ? 'أزيلت من المفضلة' : 'أضيفت للمفضلة', 'success');
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

  /* Admin — bikes */
  if (e.target.closest('#addBikeBtn')) { openModal(bikeFormHTML(null)); return; }
  const editBike = e.target.closest('[data-edit-bike]');
  if (editBike) {
    const bike = get(DB.BIKES).find((b) => b.id === editBike.dataset.editBike);
    if (bike) openModal(bikeFormHTML(bike));
    return;
  }
  const delBike = e.target.closest('[data-del-bike]');
  if (delBike) {
    if (!confirm('هل أنت متأكد من حذف الدراجة؟')) return;
    const bikes = get(DB.BIKES).filter((b) => b.id !== delBike.dataset.delBike);
    set(DB.BIKES, bikes);
    toast('تم الحذف', 'success');
    render();
    return;
  }

  /* Admin — staff */
  if (e.target.closest('#addStaffBtn')) {
    openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-user-plus"></i> إضافة موظف</h3>
        <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="staffForm" class="form-grid">
        <div class="field"><label>الاسم</label><input name="name" required></div>
        <div class="field"><label>الإيميل</label><input type="email" name="email" required></div>
        <div class="field"><label>الباسورد</label><input type="password" name="password" required minlength="6"></div>
        <div class="field"><label>التارجت الشهري (ج.م)</label><input type="number" name="target" required value="100000" min="0"></div>
        <button class="btn btn-primary btn-block" type="submit"><i class="fa-solid fa-floppy-disk"></i> إضافة</button>
      </form>
    `);
    return;
  }
  const delStaff = e.target.closest('[data-del-staff]');
  if (delStaff) {
    if (!confirm('حذف الموظف؟')) return;
    const users = get(DB.USERS).filter((u) => u.id !== delStaff.dataset.delStaff);
    set(DB.USERS, users);
    toast('تم الحذف', 'success');
    render();
    return;
  }
  const viewStaff = e.target.closest('[data-view-staff]');
  if (viewStaff) {
    const sid = viewStaff.dataset.viewStaff;
    const staff = get(DB.USERS).find((u) => u.id === sid);
    if (!staff) return;
    const invs = get(DB.INVOICES).filter((i) => i.staffId === sid);
    const total = invs.reduce((s, i) => s + i.price, 0);
    openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-user"></i> ${esc(staff.name)}</h3>
        <button class="modal-close" data-close-modal aria-label="إغلاق"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="stats-grid" style="grid-template-columns:1fr 1fr">
        <div class="stat-card"><div class="stat-label">التارجت</div><div class="stat-value" style="font-size:16px">${money(staff.target || 0)}</div></div>
        <div class="stat-card"><div class="stat-label">المحقق</div><div class="stat-value text-red" style="font-size:16px">${money(total)}</div></div>
      </div>
      <h4 class="mb-2" style="margin-top:14px">سجل الفواتير (${invs.length})</h4>
      ${invs.length ? `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>العميل</th><th>الدراجة</th><th>السعر</th><th>التاريخ</th></tr></thead>
        <tbody>${invs.map((i) => `<tr>
          <td>#${esc(i.number)}</td>
          <td>${esc(i.customer)}</td>
          <td>${esc(i.bikeName)}</td>
          <td class="text-red" style="font-weight:700">${money(i.price)}</td>
          <td>${new Date(i.createdAt).toLocaleDateString('ar-EG')}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : `<div class="empty"><p>لا توجد فواتير</p></div>`}
    `);
    return;
  }

  /* Order approval */
  const apOrder = e.target.closest('[data-approve-order]');
  if (apOrder) {
    const orders = get(DB.ORDERS);
    const o = orders.find((x) => x.id === apOrder.dataset.approveOrder);
    if (o) { o.status = 'approved'; set(DB.ORDERS, orders); toast('تم القبول', 'success'); render(); }
    return;
  }
  const rjOrder = e.target.closest('[data-reject-order]');
  if (rjOrder) {
    const orders = get(DB.ORDERS);
    const o = orders.find((x) => x.id === rjOrder.dataset.rejectOrder);
    if (o) { o.status = 'rejected'; set(DB.ORDERS, orders); toast('تم الرفض', 'info'); render(); }
    return;
  }
  const apReq = e.target.closest('[data-approve-req]');
  if (apReq) {
    const reqs = get(DB.CUSTOM_REQS);
    const r = reqs.find((x) => x.id === apReq.dataset.approveReq);
    if (r) { r.status = 'approved'; set(DB.CUSTOM_REQS, reqs); toast('تم القبول', 'success'); render(); }
    return;
  }
  const rjReq = e.target.closest('[data-reject-req]');
  if (rjReq) {
    const reqs = get(DB.CUSTOM_REQS);
    const r = reqs.find((x) => x.id === rjReq.dataset.rejectReq);
    if (r) { r.status = 'rejected'; set(DB.CUSTOM_REQS, reqs); toast('تم الرفض', 'info'); render(); }
    return;
  }
});

/* ---------- Event: Submit Delegation ---------- */
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;

  /* Login */
  if (form.id === 'loginForm') {
    const fd = new FormData(form);
    const u = login(fd.get('email'), fd.get('password'));
    if (!u) { toast('بيانات غير صحيحة', 'error'); return; }
    toast(`أهلاً ${u.name}`, 'success');
    const route = u.role === 'admin' ? 'dashboard' : u.role === 'staff' ? 'pos' : 'home';
    navigate(route);
    return;
  }

  /* Signup */
  if (form.id === 'signupForm') {
    const fd = new FormData(form);
    const res = signup({
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      password: fd.get('password')
    });
    if (!res.ok) { toast(res.msg, 'error'); return; }
    toast('تم إنشاء الحساب بنجاح', 'success');
    navigate('home');
    return;
  }

  /* Custom request */
  if (form.id === 'requestForm') {
    const fd = new FormData(form);
    const u = currentUser();
    const reqs = get(DB.CUSTOM_REQS);
    reqs.push({
      id: uid(),
      name: safeName(fd.get('name')),
      phone: safeName(fd.get('phone')),
      bikeName: safeName(fd.get('bikeName')),
      model: safeName(fd.get('model')),
      budget: Number(fd.get('budget')) || 0,
      notes: safeName(fd.get('notes')),
      customerEmail: u ? u.email : '',
      status: 'pending',
      createdAt: nowISO()
    });
    set(DB.CUSTOM_REQS, reqs);
    toast('تم إرسال طلبك، سنتواصل معك قريباً', 'success');
    form.reset();
    renderSidebar();
    return;
  }

  /* Contact */
  if (form.id === 'contactForm') {
    const fd = new FormData(form);
    const msgs = get(DB.MESSAGES);
    msgs.push({
      id: uid(),
      name: safeName(fd.get('name')),
      email: safeName(fd.get('email')),
      message: safeName(fd.get('message')),
      createdAt: nowISO()
    });
    set(DB.MESSAGES, msgs);
    toast('تم إرسال رسالتك', 'success');
    form.reset();
    return;
  }

  /* POS */
  if (form.id === 'posForm') {
    handlePOSSubmit(new FormData(form));
    form.querySelector('input[name="customer"]').value = '';
    form.querySelector('input[name="customerEmail"]').value = '';
    form.querySelector('#posBikeSelect').value = '';
    form.querySelector('#posPrice').value = '';
    return;
  }

  /* Bike form */
  if (form.id === 'bikeForm') {
    const fd = new FormData(form);
    const id = form.dataset.id;
    const images = String(fd.get('images') || '')
      .split('\n').map((s) => s.trim()).filter(Boolean);
    const bikes = get(DB.BIKES);
    if (id) {
      const b = bikes.find((x) => x.id === id);
      if (b) {
        Object.assign(b, {
          name: safeName(fd.get('name')),
          model: safeName(fd.get('model')),
          category: safeName(fd.get('category')),
          price: Number(fd.get('price')) || 0,
          stock: Number(fd.get('stock')) || 0,
          images
        });
      }
    } else {
      bikes.push({
        id: uid(),
        name: safeName(fd.get('name')),
        model: safeName(fd.get('model')),
        category: safeName(fd.get('category')),
        price: Number(fd.get('price')) || 0,
        stock: Number(fd.get('stock')) || 0,
        images
      });
    }
    set(DB.BIKES, bikes);
    closeModal();
    toast('تم الحفظ', 'success');
    render();
    return;
  }

  /* Staff form */
  if (form.id === 'staffForm') {
    const fd = new FormData(form);
    const users = get(DB.USERS);
    const email = String(fd.get('email') || '').trim();
    if (users.some((u) => String(u.email).toLowerCase() === email.toLowerCase())) {
      toast('الإيميل مستخدم', 'error');
      return;
    }
    users.push({
      id: uid(),
      name: safeName(fd.get('name')),
      email,
      password: String(fd.get('password') || ''),
      role: 'staff',
      target: Number(fd.get('target')) || 0,
      createdAt: nowISO()
    });
    set(DB.USERS, users);
    closeModal();
    toast('تمت إضافة الموظف', 'success');
    render();
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
  if (e.target.id === 'posBikeSelect') {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset.price) {
      const priceInput = $('#posPrice');
      if (priceInput) priceInput.value = opt.dataset.price;
    }
  }
});

/* ---------- Keyboard A11y ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('#modalOverlay').classList.contains('show')) closeModal();
    else if (state.sidebarOpen) closeSidebar();
  }
});

/* ---------- Init ---------- */
function init() {
  seedData();
  currentUser();
  render();
}

init();
