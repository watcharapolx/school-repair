/**
 * School Repair System — Front-End Application Core
 * Node.js/Express + MySQL | Bootstrap 5 + jQuery
 */

const App = (function () {
  'use strict';

  // ─── Config ───
  const CONFIG = {
    API: '/api',
    STATUSES: [
      { id: 1, name: 'แจ้งซ่อม',          badge: 'bg-secondary' },
      { id: 2, name: 'กำลังดำเนินการ',   badge: 'bg-info text-dark' },
      { id: 3, name: 'อยู่ระหว่างซ่อม',  badge: 'bg-warning text-dark' },
      { id: 4, name: 'ซ่อมสำเร็จ',       badge: 'bg-success' },
      { id: 5, name: 'ซ่อมไม่สำเร็จ',    badge: 'bg-danger' },
      { id: 6, name: 'รออะไหล่',          badge: 'bg-dark' },
      { id: 7, name: 'ส่งซ่อมภายนอก',   badge: 'bg-primary' },
      { id: 8, name: 'ยกเลิกการซ่อม',    badge: 'bg-light text-dark' }
    ]
  };

  // ─── State ───
  const state = {
    user: null,
    currentRoute: ''
  };

  // ═══════════════════════════════════════
  //  SCREEN SWITCHER (Login <-> App)
  // ═══════════════════════════════════════
  function showLoginScreen() {
    $('#app-shell').hide();
    $('#login-screen').show();
    $('#login-username').val('').focus();
    $('#login-password').val('');
  }

  function showAppShell() {
    $('#login-screen').hide();
    $('#app-shell').show();
    updateSidebar();
  }

  function updateSidebar() {
    if (!state.user) return;
    const u = state.user;
    // ชื่อย่อใน avatar หรือรูปภาพจริง
    if (u.avatar_url) {
      $('#nav-avatar-initials').html(`<img src="${u.avatar_url}" class="rounded-circle shadow-sm" style="width: 32px; height: 32px; object-fit: cover;">`);
    } else {
      const initials = (u.fullname || u.username || 'U').charAt(0).toUpperCase();
      $('#nav-avatar-initials').text(initials);
    }
    $('#nav-fullname').text(u.fullname || u.username);
    $('#nav-role').text(u.department_name || u.status || '-');

    // แสดง/ซ่อนเมนูตาม role
    const isAdmin = u.status === 'SuperAdmin';
    const isStaff = ['SuperAdmin', 'SuperUser'].includes(u.status);
    $('.nav-staff-only').toggle(isStaff);
    $('.nav-admin-only').toggle(isAdmin);
  }

  // ═══════════════════════════════════════
  //  ROUTER
  // ═══════════════════════════════════════
  const ROUTES = {
    'dashboard':               { view: 'dashboard.html',     label: 'แดชบอร์ด' },
    'repairs':                 { view: 'repair-list.html',   label: 'รายการแจ้งซ่อม' },
    'repairs/new':             { view: 'repair-form.html',   label: 'แจ้งซ่อมใหม่' },
    'repairs/verify':          { view: 'repair-verify.html', label: 'ตรวจสอบงานแจ้งซ่อม' },
    'repairs/schedule':        { view: 'repair-schedule.html', label: 'ตารางงานแจ้งซ่อม' },
    'repairs/summary':         { view: 'repair-summary.html', label: 'สรุปงานแจ้งซ่อม' },
    'repairs/:id':             { view: 'repair-detail.html', label: 'รายละเอียดการซ่อม' },
    'inventory':               { view: 'inventory.html',     label: 'อะไหล่ / สต็อก' },
    'inventory/order':         { view: 'inventory-order.html', label: 'สั่งซื้ออุปกรณ์' },
    'inventory/order-history': { view: 'inventory-order-history.html', label: 'ประวัติสั่งซื้ออุปกรณ์' },
    'assets':                  { view: 'assets.html',        label: 'ครุภัณฑ์' },
    'users':                   { view: 'users.html',         label: 'จัดการผู้ใช้' },
    'settings':                { view: 'settings.html',      label: 'ตั้งค่าระบบ' },
    'settings/departments':    { view: 'settings-others.html', label: 'ตั้งค่ากลุ่มงาน' },
    'settings/purposes':       { view: 'settings-others.html', label: 'ตั้งค่าวัตถุประสงค์' },
    'settings/locations':      { view: 'settings-others.html', label: 'ตั้งค่าสถานที่' },
    'settings/classes':        { view: 'settings-others.html', label: 'ตั้งค่าประเภท' }
  };

  function matchRoute(hash) {
    if (ROUTES[hash]) return hash;
    
    // repairs subroutes or details
    if (/^repairs\/.+/.test(hash)) {
      const parts = hash.split('/');
      if (['verify', 'schedule', 'summary'].includes(parts[1])) {
        return `repairs/${parts[1]}`;
      }
      return 'repairs/:id';
    }

    // inventory subroutes
    if (/^inventory\/.+/.test(hash)) {
      const parts = hash.split('/');
      if (['order', 'order-history'].includes(parts[1])) {
        return `inventory/${parts[1]}`;
      }
    }

    // settings subroutes
    if (/^settings\/.+/.test(hash)) {
      const parts = hash.split('/');
      if (['departments', 'purposes', 'locations', 'classes'].includes(parts[1])) {
        return `settings/${parts[1]}`;
      }
    }

    return null;
  }

  const Router = {
    init() {
      $(window).on('hashchange', () => this.resolve());
      this.resolve();
    },

    resolve() {
      if (!state.user) {
        showLoginScreen();
        return;
      }

      const hash = window.location.hash.replace('#', '').trim();
      if (!hash) {
        this.go('dashboard');
        return;
      }

      const routeKey = matchRoute(hash);
      if (!routeKey) {
        $('#app').html(`<div class="alert alert-warning mt-4">ไม่พบหน้าที่ต้องการ</div>`);
        return;
      }

      const route = ROUTES[routeKey];
      state.currentRoute = hash;

      // อัปเดต active nav และขยายเมนูย่อยอัตโนมัติเมื่อ Refresh หน้าจอ
      $('[data-route]').removeClass('active');
      $(`[data-route="${hash.split('/')[0]}"]`).addClass('active');

      $('.nav-submenu-link').removeClass('active');
      const activeSubLink = $(`.nav-submenu-link[href="#${hash}"]`);
      if (activeSubLink.length > 0) {
        activeSubLink.addClass('active');
        // แสดงเมนูย่อยทั้งหมดที่เป็นชั้นหลักและชั้นลูก
        activeSubLink.parents('.nav-submenu').show();
        activeSubLink.parents('.nav-submenu').each(function() {
          const id = $(this).attr('id');
          $(`[data-target="#${id}"]`).addClass('open');
        });
      }

      // อัปเดต breadcrumb
      $('#breadcrumb').text(route.label);

      // โหลด view
      this.load(route.view);
    },

    load(viewFile) {
      showLoader(true);
      const $app = $('#app');

      // แสดง loading placeholder
      $app.html('<div class="text-center py-5 text-muted"><div class="spinner-border text-primary mb-3"></div><br>กำลังโหลด...</div>');

      $.get(`/views/${viewFile}?_t=${Date.now()}`)
        .done(function (html) {
          // ใช้ regex แยก <script> ออกจาก HTML (เชื่อถือได้กว่า jQuery DOM parsing)
          const scriptContents = [];
          const htmlWithoutScripts = html.replace(
            /<script(?:[^>]*)>([\s\S]*?)<\/script>/gi,
            (match, code) => { scriptContents.push(code); return ''; }
          );

          // ใส่ HTML เข้า #app
          $app.html(htmlWithoutScripts);

          // รัน scripts หลังจาก DOM พร้อมแล้ว
          scriptContents.forEach((code, i) => {
            try {
              // eslint-disable-next-line no-eval
              eval(code);
            } catch (e) {
              console.error(`[View Script Error] ${viewFile} script[${i}]:`, e);
            }
          });

          $(document).trigger('view:loaded', [state.currentRoute, viewFile]);
        })
        .fail(function (xhr) {
          console.error('[Router] Failed to load view:', viewFile, xhr.status, xhr.statusText);
          $app.html(`
            <div class="alert alert-danger m-3">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>โหลดหน้าไม่สำเร็จ</strong>: <code>${viewFile}</code>
              <br><small class="text-muted">HTTP ${xhr.status} — กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังรันอยู่</small>
            </div>`);
        })
        .always(() => showLoader(false));
    },

    go(route) {
      window.location.hash = '#' + route;
    }
  };

  // ═══════════════════════════════════════
  //  AUTH
  // ═══════════════════════════════════════
  const Auth = {
    async login(username, password) {
      showLoader(true);
      try {
        const res = await $.ajax({
          url: `${CONFIG.API}/auth/login`,
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ username, password }),
          xhrFields: { withCredentials: true }
        });

        if (res.success) {
          state.user = res.user;
          localStorage.setItem('sr_user', JSON.stringify(res.user));
          await loadMasterData();
          showAppShell();
          // init router หลังจาก login (กรณีที่ Router.init() ยังไม่ถูกเรียก)
          if (!Router._initialized) {
            Router._initialized = true;
            $(window).on('hashchange', () => Router.resolve());
          }
          Router.go('dashboard');
          showToast(`ยินดีต้อนรับ ${res.user.fullname || res.user.username} 👋`, 'success');
        } else {
          showToast(res.message || 'เข้าสู่ระบบล้มเหลว', 'danger');
        }
      } catch (err) {
        const msg = err.responseJSON?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        showToast(msg, 'danger');
        throw err;
      } finally {
        showLoader(false);
      }
    },

    async logout() {
      try {
        await $.ajax({
          url: `${CONFIG.API}/auth/logout`,
          method: 'POST',
          xhrFields: { withCredentials: true }
        });
      } catch (e) { /* ignore network errors */ }

      state.user = null;
      localStorage.removeItem('sr_user');
      showToast('ออกจากระบบแล้ว', 'info');
      showLoginScreen();
    },

    async checkSession() {
      if (!localStorage.getItem('sr_user')) return false;
      try {
        const res = await $.ajax({
          url: `${CONFIG.API}/auth/me`,
          method: 'GET',
          xhrFields: { withCredentials: true }
        });
        if (res.success && res.user) {
          state.user = res.user;
          localStorage.setItem('sr_user', JSON.stringify(res.user));
          return true;
        }
      } catch (e) {
        localStorage.removeItem('sr_user');
      }
      return false;
    }
  };

  // ═══════════════════════════════════════
  //  API CLIENT
  // ═══════════════════════════════════════
  const API = {
    req(method, endpoint, data) {
      return $.ajax({
        url: CONFIG.API + endpoint,
        method,
        contentType: data instanceof FormData ? false : 'application/json',
        processData: data instanceof FormData ? false : true,
        data: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        xhrFields: { withCredentials: true }
      });
    },
    get(ep, params) {
      let url = ep;
      if (params && Object.keys(params).length > 0) {
        // กรองค่า null/undefined/empty ออกก่อนสร้าง query string
        const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
        if (Object.keys(filtered).length > 0) url += '?' + $.param(filtered);
      }
      return this.req('GET', url);
    },
    post(ep, d)      { return this.req('POST',   ep, d); },
    put(ep, d)       { return this.req('PUT',    ep, d); },
    del(ep)          { return this.req('DELETE', ep); },

    // Shortcuts
    getStats()               { return this.get('/dashboard/summary'); },
    getRepairs(f = {})       { return this.get('/repairs?' + $.param(f)); },
    getRepair(id)            { return this.get(`/repairs/${id}`); },
    createRepair(d)          { return this.post('/repairs', d); },
    updateStatus(id, s, n)   { return this.put(`/repairs/${id}/status`, { status_id: s, note: n }); },
    getUser(id)              { return this.get(`/users/${id}`); },
    searchUsers(q)           { return this.get(`/users/search?q=${encodeURIComponent(q)}`); },
    getAssets()              { return this.get('/assets'); },
    getSpareParts()          { return this.get('/spare-parts'); },
    getUsers()               { return this.get('/users'); },
    getSettings()            { return this.get('/settings'); },
    updateSettings(d)        { return this.put('/settings', d); }
  };

  // ═══════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════
  function showLoader(show) {
    $('#global-loader').toggleClass('d-none', !show);
  }

  function showToast(message, type = 'info') {
    const id = 'toast-' + Date.now();
    const iconMap = {
      success: 'bi-check-circle-fill',
      danger:  'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info:    'bi-info-circle-fill'
    };
    const html = `
      <div id="${id}" class="toast align-items-center text-white bg-${type} border-0 mb-2" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi ${iconMap[type] || iconMap.info} me-2"></i>${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`;
    $('#toast-container').append(html);
    const el = document.getElementById(id);
    if (el) {
      const t = new bootstrap.Toast(el, { delay: 3500 });
      t.show();
      el.addEventListener('hidden.bs.toast', () => el.remove());
    }
  }

  function formatDateThai(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTimeThai(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function getStatusBadge(statusId) {
    const s = CONFIG.STATUSES.find(x => x.id === +statusId) || { name: 'ไม่ระบุ', badge: 'bg-secondary' };
    return `<span class="badge ${s.badge}">${s.name}</span>`;
  }

  function generateRepairId() {
    const now = new Date();
    const yy = String(now.getFullYear() + 543).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `RP${yy}${mm}${dd}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async function loadMasterData() {
    try {
      const [depts, locs, classes, statuses] = await Promise.all([
        API.get('/departments'),
        API.get('/locations'),
        API.get('/class-types'),
        API.get('/repair-statuses')
      ]);
      CONFIG.DEPARTMENTS = depts.success ? depts.data.map(d => d.name) : [];
      CONFIG.DEPARTMENTS_FULL = depts.success ? depts.data : [];
      CONFIG.LOCATIONS = locs.success ? locs.data.map(l => l.name) : [];
      CONFIG.LOCATIONS_FULL = locs.success ? locs.data : [];
      CONFIG.CLASS_TYPES = classes.success ? classes.data.map(c => c.name) : [];
      CONFIG.CLASS_TYPES_FULL = classes.success ? classes.data : [];
      if (statuses.success) {
        CONFIG.STATUSES = statuses.data.map(s => ({
          id: s.id,
          name: s.name,
          badge: s.color_code ? `bg-${s.color_code}` : 'bg-secondary'
        }));
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  }

  // ═══════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════
  async function init() {
    // ─── Global AJAX Error Handler ───
    $(document).ajaxError((event, xhr, settings, thrownError) => {
      // ป้องกันการวนลูป (Infinite Loop) หากหน้าล็อกอินหรือการออกจากระบบคืนค่า 401
      if (settings.url && (settings.url.includes('/auth/logout') || settings.url.includes('/auth/login') || settings.url.includes('/auth/me'))) {
        return;
      }
      if (xhr.status === 401) {
        console.warn('Session expired (401), redirecting to login...');
        Auth.logout();
      }
    });

    // เช็ค session ก่อน
    const loggedIn = await Auth.checkSession();

    if (loggedIn) {
      await loadMasterData();
      showAppShell();
      Router.init();
    } else {
      showLoginScreen();
    }

    // ─── Global Events ───
    $(document).on('click', '#btn-logout', () => Auth.logout());

    $(document).on('click', '[data-route]', function (e) {
      e.preventDefault();
      const route = $(this).data('route');
      if (route) Router.go(route);
    });
  }

  // ─── Public API ───
  return {
    CONFIG, state, Router, Auth, API, loadMasterData, init, updateSidebar,
    Utils: { showLoader, showToast, formatDateThai, formatDateTimeThai, getStatusBadge, generateRepairId }
  };

})();

$(document).ready(() => App.init());
