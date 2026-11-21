/* =========================================================
   El Khayal Motors — SPA Vanilla JS
   قاعدة البيانات: localStorage
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

/* ============ HELPERS ============ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = n => Number(n).toLocaleString('en-US') + ' ج.م';
const nowDate = () => new Date().toISOString();

function get(key, fallback = []) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function toast(msg, type = 'info') {
  const t = $('#toast');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ============ SEED DATA ============ */
function seedData() {
  if (localStorage.getItem(DB.SEEDED)) return;

  const users = [
    { id: 'admin-1', name: 'مدير النظام', email: 'admin@elkhayal.com', password: 'admin123', role: 'admin', target: 0, createdAt: nowDate() },
    { id: 'staff-1', name: 'أحمد الموظف', email: 'staff@elkhayal.com', password: 'staff123', role: 'staff', target: 200000, createdAt: nowDate() }
  ];
  set(DB.USERS, users);

  const imgs = {
    bmw: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
      'https://images.unsplash.com/photo-1558981359-219d6364c9c8?w=800&q=80'
    ],
    yamaha: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80'
    ],
    ducati: [
      'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=800&q=80',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80'
    ],
    kawasaki: [
      'https://images.unsplash.com/photo-1558980664-10e7170b5df9?w=800&q=80',
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80'
    ],
    honda: [
      'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=800&q=80',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80'
    ],
    benelli: [
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
      'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=800&q=80'
    ]
  };

  const bikes = [
    { id: uid(), name: 'BMW S1000RR', model: '2024', category: 'سبورت', price: 850000, stock: 3, images: imgs.bmw },
    { id: uid(), name: 'Yamaha R1', model: '2024', category: 'سبورت', price: 720000, stock: 2, images: imgs.yamaha },
    { id: uid(), name: 'Ducati Panigale V4', model: '2024', category: 'سبورت', price: 1250000, stock: 1, images: imgs.ducati },
    { id: uid(), name: 'Kawasaki Ninja H2', model: '2023', category: 'سبورت', price: 1500000, stock: 2, images: imgs.kawasaki },
    { id: uid(), name: 'Honda CBR1000RR', model: '2024', category: 'سبورت', price: 680000, stock: 4, images: imgs.honda },
    { id: uid(), name: 'Benelli TNT 600', model: '2024', category: 'naked', price: 320000, stock: 5, images: imgs.benelli }
  ];
  set(DB.BIKES, bikes);
  set(DB.ORDERS, []);
  set(DB.INVOICES, []);
  set(DB.FAVS, {});
  set(DB.CUSTOM_REQS, []);
  set(DB.MESSAGES, []);
  localStorage.setItem(DB.SEEDED, '1');
}

/* ============ AUTH ============ */
function login(email, password) {
  const users = get(DB.USERS);
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
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
  render();
}
function currentUser() {
  if (state.user) return state.user;
  const s = get(DB.SESSION, null);
  if (s) { state.user = s; return s; }
  return null;
}

/* ============ SIDEBAR NAV ============ */
function sidebarItems() {
  const u = currentUser();
  const reqs = get(DB.CUSTOM_REQS).filter(r => r.status === 'pending').length;
  const newOrders = get(DB.ORDERS).filter(o => o.status === 'pending').length;

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
      { route: 'staff-orders', label: 'طلبات العملاء', icon: 'fa-clipboard-list', badge: (newOrders + reqs) || null }
    ];
  }

  return [
    { section: 'الإدارة' },
    { route: 'dashboard', label: 'لوحة الإحصائيات', icon: 'fa-chart-line' },
    { section: 'البيع' },
    { route: 'pos', label: 'نقطة البيع POS', icon: 'fa-cash-register' },
    { route: 'inventory', label: 'المخزن والأسعار', icon: 'fa-boxes-stacked' },
    { section: 'الإدارة' },
    { route: 'manage-bikes', label: 'إدارة الدراجات', icon: 'fa-motorcycle' },
    { route: 'staff', label: 'الموظفين والأداء', icon: 'fa-users-gear' },
    { route: 'staff-orders', label: 'طلبات العملاء', icon: 'fa-clipboard-list', badge: (newOrders + reqs) || null },
    { section: 'المتجر' },
    { route: 'home', label: 'عرض المتجر', icon: 'fa-store' }
  ];
}

function renderSidebar() {
  const nav = $('#sidebarNav');
  const items = sidebarItems();
  const active = state.route;
  let html = '';
  items.forEach(it => {
    if (it.section) { html += `<div class="sidebar-section-title">${it.section}</div>`; return; }
    const isActive = active === it.route ? 'active' : '';
    const badge = it.badge ? `<span class="badge">${it.badge}</span>` : '';
    html += `<a class="sidebar-link ${isActive}" data-nav="${it.route}">
      <i class="fa-solid ${it.icon}"></i>
      <span>${it.label}</span>${badge}
    </a>`;
  });
  nav.innerHTML = html;
}

/* ============ TOPBAR ACCOUNT ============ */
function renderAccountArea() {
  const u = currentUser();
  const area = $('#accountArea');
  if (!u) {
    area.innerHTML = `
      <button class="btn btn-ghost-light btn-sm" data-nav="login">
        <i class="fa-solid fa-right-to-bracket"></i> دخول
      </button>
      <button class="btn btn-primary btn-sm" data-nav="signup">
        <i class="fa-solid fa-user-plus"></i> حساب جديد
      </button>`;
  } else {
    const roleLabel = u.role === 'admin' ? 'مدير' : u.role === 'staff' ? 'موظف' : 'عميل';
    area.innerHTML = `
      <div class="user-chip">
        <div class="avatar">${u.name.charAt(0)}</div>
        <span class="name">${u.name.split(' ')[0]}</span>
        <span class="role-badge">${roleLabel}</span>
      </div>
      <button class="btn btn-ghost-light btn-sm" data-nav="account">
        <i class="fa-solid fa-user"></i> حسابي
      </button>
      <button class="btn btn-primary btn-sm" id="logoutBtn">
        <i class="fa-solid fa-right-from-bracket"></i>
      </button>`;
  }
}

/* ============ MODAL ============ */
function openModal(html) {
  const ov = $('#modalOverlay');
  $('#modalBox').innerHTML = html;
  ov.classList.add('show');
}
function closeModal() {
  $('#modalOverlay').classList.remove('show');
  $('#modalBox').innerHTML = '';
}

/* ============ AUTH PAGES ============ */
function pageLogin() {
  return `
    <div class="auth-card">
      <h2>تسجيل الدخول</h2>
      <p class="sub">أدخل بياناتك للوصول إلى حسابك</p>
      <form id="loginForm" class="form-grid">
        <div class="field">
          <label>البريد الإلكتروني</label>
          <input type="email" name="email" required placeholder="email@example.com">
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <input type="password" name="password" required placeholder="••••••••">
        </div>
        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-right-to-bracket"></i> دخول
        </button>
      </form>
      <div class="auth-switch">ليس لديك حساب؟ <a data-nav="signup">أنشئ حساباً جديداً</a></div>
      <div class="auth-switch" style="margin-top:10px;font-size:11px;color:#9CA3AF">
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
          <input type="text" name="name" required placeholder="اسمك"></div>
        <div class="field"><label>البريد الإلكتروني</label>
          <input type="email" name="email" required placeholder="email@example.com"></div>
        <div class="field"><label>رقم الهاتف</label>
          <input type="tel" name="phone" required placeholder="01xxxxxxxxx"></div>
        <div class="field"><label>كلمة المرور</label>
          <input type="password" name="password" required minlength="6" placeholder="6 أحرف على الأقل"></div>
        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-user-plus"></i> إنشاء الحساب
        </button>
      </form>
      <div class="auth-switch">لديك حساب بالفعل؟ <a data-nav="login">تسجيل الدخول</a></div>
    </div>`;
}

/* ============ STOREFRONT ============ */
function filteredBikes() {
  let bikes = get(DB.BIKES);
  const q = state.search.trim().toLowerCase();
  if (q) bikes = bikes.filter(b => b.name.toLowerCase().includes(q) || b.model.toLowerCase().includes(q));
  if (state.filterCat !== 'all') bikes = bikes.filter(b => b.category === state.filterCat);
  if (state.filterPrice !== 'all') {
    const [min, max] = state.filterPrice.split('-').map(Number);
    bikes = bikes.filter(b => b.price >= min && (max ? b.price <= max : true));
  }
  return bikes;
}

function productCard(b) {
  const user = currentUser();
  const favs = user ? (get(DB.FAVS)[user.id] || []) : [];
  const isFav = favs.includes(b.id);
  const stockClass = b.stock <= 0 ? 'out' : b.stock <= 2 ? 'low' : 'in';
  const stockText = b.stock <= 0 ? 'غير متوفر' : b.stock <= 2 ? `آخر ${b.stock} قطع` : 'متوفر';
  const first = b.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
  const dots = b.images?.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('') || '';

  return `
    <div class="product-card" data-bike-id="${b.id}">
      <div class="slider-wrap" data-slider>
        <img src="${first}" alt="${b.name}" data-slide-img>
        <span class="stock-tag ${stockClass}"><i class="fa-solid fa-circle"></i> ${stockText}</span>
        <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${b.id}">
          <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart"></i>
        </button>
        <button class="slider-btn prev" data-slide="prev"><i class="fa-solid fa-chevron-right"></i></button>
        <button class="slider-btn next" data-slide="next"><i class="fa-solid fa-chevron-left"></i></button>
        <div class="slider-dots" data-dots>${dots}</div>
      </div>
      <div class="product-body">
        <span class="product-cat">${b.category || 'عام'}</span>
        <div class="product-name">${b.name}</div>
        <div class="product-model">موديل ${b.model}</div>
        <div class="product-price">${money(b.price)}</div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" data-buy="${b.id}" ${b.stock <= 0 ? 'disabled style="opacity:.5"' : ''}>
            <i class="fa-solid fa-cart-shopping"></i> شراء
          </button>
          <button class="btn btn-outline btn-sm" data-details="${b.id}">
            <i class="fa-solid fa-eye"></i> تفاصيل
          </button>
        </div>
      </div>
    </div>`;
}

function pageHome() {
  const bikes = filteredBikes();
  const cats = [...new Set(get(DB.BIKES).map(b => b.category))];
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
        <input type="text" id="searchInput" placeholder="ابحث بالاسم أو الموديل..." value="${state.search}">
      </div>
      <select id="filterCat">
        <option value="all">كل الفئات</option>
        ${cats.map(c => `<option value="${c}" ${state.filterCat === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="filterPrice">
        <option value="all">كل الأسعار</option>
        <option value="0-500000" ${state.filterPrice === '0-500000' ? 'selected' : ''}>أقل من 500 ألف</option>
        <option value="500000-1000000" ${state.filterPrice === '500000-1000000' ? 'selected' : ''}>500 ألف - مليون</option>
        <option value="1000000-0" ${state.filterPrice === '1000000-0' ? 'selected' : ''}>أكثر من مليون</option>
      </select>
    </div>

    <div class="products-grid" id="productsGrid">
      ${bikes.length ? bikes.map(productCard).join('') : `<div class="empty" style="grid-column:1/-1"><i class="fa-solid fa-box-open"></i><p>لا توجد دراجات مطابقة للبحث</p></div>`}
    </div>`;
}

/* ============ CUSTOM REQUEST / CONTACT ============ */
function pageRequest() {
  return `
    <h2 class="page-title"><i class="fa-solid fa-motorcycle"></i> اطلب موتسيكلك الخاص</h2>
    <p class="page-sub">لم تجد الدراجة التي تريدها؟ اطلبها وسنتواصل معك</p>
    <div class="panel" style="max-width:640px">
      <form id="requestForm" class="form-grid">
        <div class="form-row">
          <div class="field"><label>الاسم</label><input name="name" required></div>
          <div class="field"><label>رقم الهاتف</label><input name="phone" required></div>
        </div>
        <div class="field"><label>اسم الدراجة المطلوبة</label>
          <input name="bikeName" required placeholder="مثال: BMW S1000RR"></div>
        <div class="form-row">
          <div class="field"><label>الموديل / السنة</label><input name="model" required></div>
          <div class="field"><label>الميزانية التقريبية (ج.م)</label>
            <input type="number" name="budget" required></div>
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
        <p style="margin-bottom:12px"><i class="fa-solid fa-location-dot" style="color:var(--red);width:24px"></i> شارع التسعين، القاهرة الجديدة</p>
        <p style="margin-bottom:12px"><i class="fa-solid fa-phone" style="color:var(--red);width:24px"></i> 0100 000 0000</p>
        <p style="margin-bottom:12px"><i class="fa-solid fa-envelope" style="color:var(--red);width:24px"></i> info@elkhayal.com</p>
        <p><i class="fa-solid fa-clock" style="color:var(--red);width:24px"></i> السبت - الخميس: 10ص - 10م</p>
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

/* ============ CUSTOMER ACCOUNT ============ */
function pageAccount() {
  const u = currentUser();
  if (!u) return pageLogin();
  const orders = get(DB.ORDERS).filter(o => o.customerEmail === u.email);
  const reqs = get(DB.CUSTOM_REQS).filter(r => r.customerEmail === u.email);
  return `
    <h2 class="page-title"><i class="fa-solid fa-user"></i> ملفي الشخصي</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-receipt"></i></div><div class="stat-label">إجمالي طلباتي</div><div class="stat-value">${orders.length}</div></div>
      <div class="stat-card"><div class="stat-icon"><i class="fa-solid fa-motorcycle"></i></div><div class="stat-label">طلبات خاصة</div><div class="stat-value">${reqs.length}</div></div>
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-id-card"></i> بياناتي</div>
      <p style="margin-bottom:8px"><b>الاسم:</b> ${u.name}</p>
      <p style="margin-bottom:8px"><b>الإيميل:</b> ${u.email}</p>
      <p><b>الهاتف:</b> ${u.phone || '—'}</p>
    </div>
    <div class="panel">
      <div class="panel-title"><i class="fa-solid fa-box"></i> طلباتي الخاصة</div>
      ${reqs.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>الدراجة</th><th>الموديل</th><th>الميزانية</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${reqs.map(r => `
            <tr><td>${r.bikeName}</td><td>${r.model}</td><td>${money(r.budget)}</td>
            <td><span class="status-pill ${r.status}">${r.status === 'pending' ? 'قيد المراجعة' : r.status === 'approved' ? 'تم القبول' : 'مرفوض'}</span></td>
            <td>${new Date(r.createdAt).toLocaleDateString('ar-EG')}</td></tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات خاصة بعد</p></div>`}
    </div>`;
}

function pageFavorites() {
  const u = currentUser();
  if (!u) return pageLogin();
  const favIds = get(DB.FAVS)[u.id] || [];
  const bikes = get(DB.BIKES).filter(b => favIds.includes(b.id));
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
  const orders = get(DB.ORDERS).filter(o => o.customerEmail === u.email);
  return `
    <h2 class="page-title"><i class="fa-solid fa-receipt"></i> طلباتي</h2>
    <div class="panel">
      ${orders.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>الدراجة</th><th>السعر</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>${orders.map(o => `
            <tr><td>${o.bikeName}</td><td>${money(o.price)}</td>
            <td><span class="status-pill ${o.status}">${o.status === 'pending' ? 'قيد المراجعة' : o.status === 'approved' ? 'مقبول' : 'مرفوض'}</span></td>
            <td>${new Date(o.createdAt).toLocaleDateString('ar-EG')}</td></tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty"><i class="fa-solid fa-inbox"></i><p>لا توجد طلبات</p></div>`}
    </div>`;
}

/* ============ STAFF: POS ============ */
function pagePOS() {
  const u = currentUser();
  if (!u || (u.role !== 'staff' && u.role !== 'admin')) return pageLogin();
  const bikes = get(DB.BIKES).filter(b => b.stock > 0);
  return `
    <h2 class="page-title"><i class="fa-solid fa-cash-register"></i> نقطة البيع POS</h2>
    <p class="page-sub">سجل عملية بيع جديدة وأصدر فاتورة</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="pos-grid">
      <div class="panel">
        <div class="panel-title"><i class="fa-solid fa-cart-plus"></i> بيانات البيع</div>
        <form id="posForm" class="form-grid">
          <div class="field"><label>اسم العميل</label><input name="customer" required></div>
          <div class="field"><label>إيميل العميل (اختياري)</label><input type="email" name="customerEmail"></div>
          <div class="field"><label>اختر الدراجة</label>
            <select name="bikeId" id="posBikeSelect" required>
              <option value="">-- اختر --</option>
              ${bikes.map(b => `<option value="${b.id}" data-price="${b.price}">${b.name} (${b.model}) — ${money(b.price)}</option>`).join('')}
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
  const invoices = get(DB.INVOICES).filter(i => i.staffId === u.id).slice(-5).reverse();
  const el = $('#myInvoicesMini');
  if (!el) return;
  if (!invoices.length) { el.innerHTML = `<div class="empty"><i class="fa-solid fa-receipt"></i><p>لا توجد فواتير بعد</p></div>`; return; }
  el.innerHTML = invoices.map(inv => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee">
      <div>
        <b style="font-size:13px">#${inv.number}</b>
        <div style="font-size:11px;color:#666">${inv.bikeName}</div>
      </div>
      <div style="text-align:left">
        <b style="color:var(--red);font-size:14px">${money(inv.price)}</b>
        <div style="font-size:10px;color:#999">${new Date(inv.createdAt).toLocaleDateString('ar-EG')}</div>
      </div>
    </div>`).join('');
}

/* ============ STAFF: TARGET ============ */
function pageTarget() {
  const u = currentUser();
  if (!u) return pageLogin();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const invoices = get(DB.INVOICES).filter(i => {
    const d = new Date(i.createdAt);
    return i.staffId === u.id && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const achieved = invoices.reduce((s, i) => s + i.price, 0);
  const target = u.target || 0;
  const percent = target ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

  return `
    <h2 class="page-title"><i class="fa-solid fa-bullseye"></i> تارجت الشهر</h2>
    <p class="page-sub">مبيعاتك الشهرية مقارنة بالهدف المحدد</p>
    <div class="panel">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:700">${u.name}</span>
        <span style="font-weight:900;color:var(--red)">${percent}%</span>
      </div>
      <div class="progress-outer"><div class="progress-inner" style="width:${percent}%
