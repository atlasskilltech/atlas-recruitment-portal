/**
 * Atlas HR Recruitment Portal - Main Application JavaScript
 * Provides UI helpers, utilities, and initialization logic.
 */

/* ============================================================
   1. Dark Mode Toggle
   ============================================================ */

function toggleDarkMode() {
  const html = document.documentElement;
  html.classList.toggle('dark');
  const isDark = html.classList.contains('dark');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
}

function applyDarkModePreference() {
  const pref = localStorage.getItem('darkMode');
  if (pref === 'enabled') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/* ============================================================
   2. Sidebar Toggle (Mobile)
   ============================================================ */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;

  sidebar.classList.toggle('sidebar-open');

  if (overlay) {
    overlay.classList.toggle('hidden');
  }
}

/* ============================================================
   3. Modal Helpers
   ============================================================ */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overflow-hidden');
}

function initModalListeners() {
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal-overlay')) {
      const modal = e.target.closest('[id]');
      if (modal) {
        closeModal(modal.id);
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
      openModals.forEach(function (modal) {
        const parent = modal.closest('[id]');
        if (parent) {
          closeModal(parent.id);
        }
      });
    }
  });
}

/* ============================================================
   4. Drawer Helpers
   ============================================================ */

function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  drawer.classList.remove('hidden');
  drawer.classList.add('drawer-open');
  document.body.classList.add('overflow-hidden');
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  drawer.classList.remove('drawer-open');
  drawer.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

/* ============================================================
   5. Toast Notifications
   ============================================================ */

function showToast(message, type, duration) {
  type = type || 'info';
  duration = duration || 5000;

  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
    document.body.appendChild(container);
  }

  var iconMap = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  var colorMap = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800'
  };

  var toast = document.createElement('div');
  toast.className =
    'flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg transition-all duration-300 transform translate-x-full ' +
    (colorMap[type] || colorMap.info);

  toast.innerHTML =
    '<i data-lucide="' + (iconMap[type] || 'info') + '" class="w-5 h-5 shrink-0"></i>' +
    '<span class="text-sm font-medium">' + escapeHtml(message) + '</span>' +
    '<button onclick="this.parentElement.remove()" class="ml-auto p-1 hover:opacity-70">' +
    '<i data-lucide="x" class="w-4 h-4"></i></button>';

  container.appendChild(toast);

  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ nodes: [toast] });
  }

  // Animate in
  requestAnimationFrame(function () {
    toast.classList.remove('translate-x-full');
    toast.classList.add('translate-x-0');
  });

  // Auto-dismiss
  setTimeout(function () {
    toast.classList.remove('translate-x-0');
    toast.classList.add('translate-x-full');
    setTimeout(function () {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ============================================================
   6. Table Select All
   ============================================================ */

function toggleSelectAll(checkbox) {
  var checkboxes = document.querySelectorAll('table input[type="checkbox"][name="selected_ids"]');
  checkboxes.forEach(function (cb) {
    cb.checked = checkbox.checked;
  });
  updateBulkActionBar();
}

function updateBulkActionBar() {
  var selected = document.querySelectorAll(
    'table input[type="checkbox"][name="selected_ids"]:checked'
  );
  var bar = document.getElementById('bulk-action-bar');
  if (!bar) return;

  if (selected.length > 0) {
    bar.classList.remove('hidden');
    var countEl = bar.querySelector('[data-selected-count]');
    if (countEl) {
      countEl.textContent = selected.length;
    }
  } else {
    bar.classList.add('hidden');
  }
}

function getSelectedIds() {
  var selected = document.querySelectorAll(
    'table input[type="checkbox"][name="selected_ids"]:checked'
  );
  return Array.from(selected).map(function (cb) {
    return cb.value;
  });
}

/* ============================================================
   7. Filter Panel Toggle
   ============================================================ */

function toggleFilters() {
  var panel = document.getElementById('filter-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
}

/* ============================================================
   8. Confirm Delete / Action
   ============================================================ */

function confirmAction(message, formId) {
  if (confirm(message)) {
    var form = document.getElementById(formId);
    if (form) {
      form.submit();
    }
    return true;
  }
  return false;
}

/* ============================================================
   9. Auto-Dismiss Alerts
   ============================================================ */

function initAutoDismissAlerts() {
  var alerts = document.querySelectorAll('.alert');
  alerts.forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(function () {
        if (alert.parentElement) {
          alert.remove();
        }
      }, 300);
    }, 5000);
  });
}

/* ============================================================
   10. Score Ring Rendering
   ============================================================ */

function renderScoreRing(elementId, score, size, strokeWidth) {
  var el = document.getElementById(elementId);
  if (!el) return;

  size = size || 64;
  strokeWidth = strokeWidth || 6;
  score = Math.max(0, Math.min(100, Number(score) || 0));

  var radius = (size - strokeWidth) / 2;
  var circumference = 2 * Math.PI * radius;
  var offset = circumference - (score / 100) * circumference;

  var color;
  if (score >= 75) {
    color = '#16a34a'; // green-600
  } else if (score >= 50) {
    color = '#d97706'; // amber-600
  } else {
    color = '#dc2626'; // red-600
  }

  var svg =
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" ' +
    'fill="none" stroke="#e5e7eb" stroke-width="' + strokeWidth + '" />' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" ' +
    'fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
    'stroke-linecap="round" ' +
    'stroke-dasharray="' + circumference + '" ' +
    'stroke-dashoffset="' + circumference + '" ' +
    'transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" ' +
    'class="score-ring-progress" ' +
    'data-target-offset="' + offset + '" />' +
    '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" ' +
    'class="text-sm font-bold" fill="' + color + '">' + score + '</text>' +
    '</svg>';

  el.innerHTML = svg;

  // Animate the ring on next frame
  requestAnimationFrame(function () {
    var progressCircle = el.querySelector('.score-ring-progress');
    if (progressCircle) {
      progressCircle.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
      progressCircle.style.strokeDashoffset = offset;
    }
  });
}

function initScoreRings() {
  var elements = document.querySelectorAll('[data-score]');
  elements.forEach(function (el) {
    if (!el.id) {
      el.id = 'score-ring-' + Math.random().toString(36).substr(2, 9);
    }
    var score = parseInt(el.getAttribute('data-score'), 10);
    var size = parseInt(el.getAttribute('data-size'), 10) || 64;
    var stroke = parseInt(el.getAttribute('data-stroke-width'), 10) || 6;
    renderScoreRing(el.id, score, size, stroke);
  });
}

/* ============================================================
   11. Quick View Drawer
   ============================================================ */

function loadQuickView(candidateId) {
  var drawer = document.getElementById('quick-view-drawer');
  var content = document.getElementById('quick-view-content');
  if (!drawer || !content) return;

  content.innerHTML =
    '<div class="flex items-center justify-center py-12">' +
    '<i data-lucide="loader-2" class="w-6 h-6 animate-spin text-gray-400"></i>' +
    '</div>';

  openDrawer('quick-view-drawer');

  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ nodes: [content] });
  }

  fetch('/api/candidates/' + encodeURIComponent(candidateId))
    .then(function (response) {
      if (!response.ok) throw new Error('Failed to load candidate data');
      return response.json();
    })
    .then(function (data) {
      content.innerHTML = buildQuickViewHtml(data);
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [content] });
      }
    })
    .catch(function (err) {
      content.innerHTML =
        '<div class="text-center py-12 text-red-500">' +
        '<i data-lucide="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>' +
        '<p class="text-sm">' + escapeHtml(err.message) + '</p>' +
        '</div>';
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ nodes: [content] });
      }
    });
}

function buildQuickViewHtml(candidate) {
  var name = escapeHtml(candidate.name || 'Unknown');
  var email = escapeHtml(candidate.email || '');
  var position = escapeHtml(candidate.position || '');
  var status = escapeHtml(candidate.status || '');
  var score = candidate.score || 0;

  return (
    '<div class="p-6 space-y-4">' +
    '<div class="flex items-center gap-4">' +
    '<div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold text-lg">' +
    name.charAt(0).toUpperCase() +
    '</div>' +
    '<div>' +
    '<h3 class="text-lg font-semibold text-gray-900 dark:text-white">' + name + '</h3>' +
    '<p class="text-sm text-gray-500">' + email + '</p>' +
    '</div>' +
    '</div>' +
    '<dl class="grid grid-cols-2 gap-4 text-sm">' +
    '<div><dt class="text-gray-500">Position</dt><dd class="font-medium text-gray-900 dark:text-white">' + position + '</dd></div>' +
    '<div><dt class="text-gray-500">Status</dt><dd class="font-medium text-gray-900 dark:text-white">' + status + '</dd></div>' +
    '<div><dt class="text-gray-500">Score</dt><dd><span id="qv-score" data-score="' + score + '" data-size="48" data-stroke-width="4"></span></dd></div>' +
    '</dl>' +
    '<div class="pt-4 border-t">' +
    '<a href="/candidates/' + encodeURIComponent(candidate.id || '') + '" class="text-sm text-primary-600 hover:text-primary-700 font-medium">View Full Profile &rarr;</a>' +
    '</div>' +
    '</div>'
  );
}

/* ============================================================
   12. Copy to Clipboard
   ============================================================ */

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied to clipboard', 'success', 2000);
    }).catch(function () {
      fallbackCopyToClipboard(text);
    });
  } else {
    fallbackCopyToClipboard(text);
  }
}

function fallbackCopyToClipboard(text) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard', 'success', 2000);
  } catch (err) {
    showToast('Failed to copy', 'error', 3000);
  }
  document.body.removeChild(textarea);
}

/* ============================================================
   13. Character Counter for Textareas
   ============================================================ */

function initCharCounters() {
  var textareas = document.querySelectorAll('textarea[data-max-chars]');
  textareas.forEach(function (textarea) {
    var max = parseInt(textarea.getAttribute('data-max-chars'), 10);
    if (isNaN(max)) return;

    var counter = document.createElement('div');
    counter.className = 'text-xs text-gray-400 text-right mt-1 char-counter';
    counter.textContent = '0 / ' + max;
    textarea.parentNode.insertBefore(counter, textarea.nextSibling);

    function update() {
      var len = textarea.value.length;
      counter.textContent = len + ' / ' + max;
      if (len > max) {
        counter.classList.add('text-red-500');
        counter.classList.remove('text-gray-400');
      } else {
        counter.classList.remove('text-red-500');
        counter.classList.add('text-gray-400');
      }
    }

    textarea.addEventListener('input', update);
    update();
  });
}

/* ============================================================
   14. Search Debounce
   ============================================================ */

function debounce(fn, delay) {
  var timer;
  return function () {
    var context = this;
    var args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

function initSearchDebounce() {
  var searchInput = document.getElementById('search-input');
  if (!searchInput) return;

  var debouncedSearch = debounce(function (e) {
    var query = e.target.value.trim();
    var form = searchInput.closest('form');
    if (form) {
      form.submit();
    }
  }, 300);

  searchInput.addEventListener('input', debouncedSearch);
}

/* ============================================================
   15. Form Submission with Loading State
   ============================================================ */

function handleFormSubmit(form) {
  if (!form) return;

  var button = form.querySelector('button[type="submit"]');
  if (!button) return;

  var originalContent = button.innerHTML;
  button.disabled = true;
  button.innerHTML =
    '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline-block mr-2"></i>Processing...';

  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ nodes: [button] });
  }

  // Restore button state after form completes (fallback for non-AJAX)
  setTimeout(function () {
    button.disabled = false;
    button.innerHTML = originalContent;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ nodes: [button] });
    }
  }, 10000);
}

/* ============================================================
   16. Initialization on DOMContentLoaded
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  // Apply saved dark mode preference
  applyDarkModePreference();

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Initialize character counters
  initCharCounters();

  // Auto-dismiss alert banners
  initAutoDismissAlerts();

  // Initialize score rings
  initScoreRings();

  // Set up modal overlay click-to-close and Escape key listeners
  initModalListeners();

  // Initialize live search debounce
  initSearchDebounce();

  // Attach loading state to forms with data-loading attribute
  var forms = document.querySelectorAll('form[data-loading]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function () {
      handleFormSubmit(form);
    });
  });

  // Wire up individual row checkbox changes to update bulk action bar
  document.addEventListener('change', function (e) {
    if (e.target.matches('table input[type="checkbox"][name="selected_ids"]')) {
      updateBulkActionBar();
    }
  });
});
