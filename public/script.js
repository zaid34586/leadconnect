/**
 * LeadConnect AI — Frontend JavaScript (Polished)
 * Handles: AI Chat, Toast Notifications, Loading States, Form Validation, Dashboard
 */

const CONFIG = {
  SUPABASE_URL: 'https://ebswihfqmnuafvsquxym.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVic3dpaGZxbW51YWZ2c3F1eHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNjY5MTcsImV4cCI6MjEwODc0MjkxN30.FOoSgSyi11CJxRiLGWEoXD0YyT7SvNEK3vkrD_1a2e0',
  API_BASE: window.location.origin
};

// Initialize Supabase
let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

// ========================================
// Toast Notification System
// ========================================
const Toast = {
  container: null,
  
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('role', 'region');
      this.container.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', title = '', duration = 5000) {
    this.init();
    
    const icons = {
      success: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      error: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      warning: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
      info: '<svg class="toast-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      ${icons[type] || icons.info}
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `;
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => this.dismiss(toast));
    
    // Auto dismiss
    let dismissTimer = setTimeout(() => this.dismiss(toast), duration);
    
    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(dismissTimer));
    toast.addEventListener('mouseleave', () => {
      dismissTimer = setTimeout(() => this.dismiss(toast), 2000);
    });
    
    this.container.appendChild(toast);
    
    // Limit to 5 toasts
    const toasts = this.container.querySelectorAll('.toast');
    if (toasts.length > 5) {
      this.dismiss(toasts[0]);
    }
    
    return toast;
  },
  
  dismiss(toast) {
    if (!toast || toast.classList.contains('exiting')) return;
    toast.classList.add('exiting');
    setTimeout(() => toast.remove(), 200);
  },
  
  success(message, title = 'Success') { return this.show(message, 'success', title); },
  error(message, title = 'Error') { return this.show(message, 'error', title, 8000); },
  warning(message, title = 'Warning') { return this.show(message, 'warning', title); },
  info(message, title = 'Info') { return this.show(message, 'info', title); },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ========================================
// Loading State Manager
// ========================================
const Loading = {
  show(btnOrElement, text = '') {
    const el = btnOrElement.tagName === 'BUTTON' ? btnOrElement : btnOrElement.querySelector('button[type="submit"]');
    if (!el) return;
    
    el.dataset.originalText = el.innerHTML;
    el.disabled = true;
    el.classList.add('btn-loading');
    if (text) el.setAttribute('aria-label', text);
  },
  
  hide(btnOrElement) {
    const el = btnOrElement.tagName === 'BUTTON' ? btnOrElement : btnOrElement.querySelector('button[type="submit"]');
    if (!el) return;
    
    el.disabled = false;
    el.classList.remove('btn-loading');
    if (el.dataset.originalText) {
      el.innerHTML = el.dataset.originalText;
      delete el.dataset.originalText;
    }
  },
  
  showPage() {
    let loader = document.getElementById('page-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'page-loader';
      loader.className = 'page-loader';
      loader.innerHTML = `
        <div class="page-loader-content">
          <div class="page-loader-logo"><i class="fas fa-bolt"></i></div>
          <div class="spinner spinner-lg" style="margin: 0 auto;"></div>
          <p style="margin-top: 1rem; color: var(--gray-500);">Loading...</p>
        </div>
      `;
      document.body.appendChild(loader);
    }
    requestAnimationFrame(() => loader.classList.remove('hidden'));
  },
  
  hidePage() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 300);
    }
  }
};

// ========================================
// Form Validation
// ========================================
const Validation = {
  rules: {
    required: (value) => value && value.trim().length > 0,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: (value) => !value || /^[\d\s\-\+\(\)]{10,}$/.test(value),
    minLength: (min) => (value) => value && value.length >= min,
    maxLength: (max) => (value) => !value || value.length <= max,
    pattern: (regex) => (value) => !value || regex.test(value),
    match: (fieldName) => (value, form) => value === form[fieldName]
  },
  
  validate(formElement, rules) {
    const formData = new FormData(formElement);
    const data = Object.fromEntries(formData);
    const errors = {};
    let isValid = true;
    
    Object.keys(rules).forEach(field => {
      const fieldRules = rules[field];
      const value = data[field];
      
      if (fieldRules.required && !this.rules.required(value)) {
        errors[field] = 'This field is required';
        isValid = false;
      } else if (value && fieldRules.email && !this.rules.email(value)) {
        errors[field] = 'Please enter a valid email address';
        isValid = false;
      } else if (value && fieldRules.minLength && !this.rules.minLength(fieldRules.minLength)(value)) {
        errors[field] = `Must be at least ${fieldRules.minLength} characters`;
        isValid = false;
      } else if (value && fieldRules.pattern && !this.rules.pattern(fieldRules.pattern)(value)) {
        errors[field] = fieldRules.patternMessage || 'Invalid format';
        isValid = false;
      } else if (value && fieldRules.match && !this.rules.match(fieldRules.match)(value, data)) {
        errors[field] = fieldRules.matchMessage || 'Fields do not match';
        isValid = false;
      }
    });
    
    this.showErrors(formElement, errors);
    return { isValid, errors, data };
  },
  
  showErrors(formElement, errors) {
    // Clear previous errors
    formElement.querySelectorAll('.form-error').forEach(el => el.remove());
    formElement.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
      el.classList.remove('error');
    });
    
    // Show new errors
    Object.keys(errors).forEach(field => {
      const input = formElement.querySelector(`[name="${field}"]`);
      if (input) {
        input.classList.add('error');
        const errorEl = document.createElement('div');
        errorEl.className = 'form-error';
        errorEl.textContent = errors[field];
        input.parentNode.appendChild(errorEl);
      }
    });
  },
  
  clearErrors(formElement) {
    formElement.querySelectorAll('.form-error').forEach(el => el.remove());
    formElement.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
      el.classList.remove('error');
    });
  }
};

// ========================================
// Modal Manager
// ========================================
const Modal = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    
    // Focus first input
    setTimeout(() => {
      const firstInput = modal.querySelector('input, select, textarea, button');
      if (firstInput) firstInput.focus();
    }, 100);
    
    // Trap focus
    modal._focusTrap = this._trapFocus.bind(this, modal);
    modal.addEventListener('keydown', modal._focusTrap);
  },
  
  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('open');
    document.body.style.overflow = '';
    
    if (modal._focusTrap) {
      modal.removeEventListener('keydown', modal._focusTrap);
    }
  },
  
  _trapFocus(modal, e) {
    if (e.key !== 'Tab') return;
    
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
};

// ========================================
// API Helper
// ========================================
const API = {
  async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const defaults = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin'
    };
    
    // Add auth token if available
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        defaults.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
    
    const config = { ...defaults, ...options };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (err) {
      console.error(`API Error (${endpoint}):`, err);
      throw err;
    }
  },
  
  // Leads
  getLeads() { return this.request('/api/leads'); },
  createLead(data) { return this.request('/api/leads', { method: 'POST', body: data }); },
  updateLead(id, data) { return this.request(`/api/leads/${id}`, { method: 'PATCH', body: data }); },
  
  // Chat
  sendChatMessage(message, sessionId, leadId) {
    return this.request('/api/chat', { method: 'POST', body: { message, session_id: sessionId, lead_id: leadId } });
  },
  
  // Documents
  getDocuments(category) {
    return this.request(`/api/documents${category ? `?category=${category}` : ''}`);
  },
  
  // Outreach
  sendWhatsApp(leadId, message) {
    return this.request('/api/whatsapp-link', { method: 'POST', body: { lead_id: leadId, message } });
  },
  
  sendEmail(to, subject, text, html, leadId) {
    return this.request('/api/send-email', { method: 'POST', body: { to, subject, text, html, lead_id: leadId } });
  },
  
  getLinkedInTemplate(leadName, serviceInterest, region) {
    return this.request('/api/linkedin-template', { method: 'POST', body: { lead_name: leadName, service_interest: serviceInterest, region } });
  },
  
  // Human Transfer
  transferToHuman(leadId, reason = 'manual_transfer') {
    return this.request('/api/human-transfer', { method: 'POST', body: { lead_id: leadId, reason } });
  },
  
  getHumanTransferQueue() {
    return this.request('/api/human-transfer');
  }
};

// ========================================
// AI Chat Widget
// ========================================
const AIChat = {
  sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  leadId: null,
  isOpen: false,
  isTyping: false,
  
  init() {
    this.bindEvents();
    this.loadSession();
  },
  
  bindEvents() {
    const toggle = document.getElementById('chatToggle');
    const input = document.getElementById('chatInput');
    const sendBtn = document.querySelector('#chatWindow button[onclick="sendChatMessage()"]');
    
    if (toggle) toggle.addEventListener('click', () => this.toggle());
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      const window = document.getElementById('chatWindow');
      const toggle = document.getElementById('chatToggle');
      if (this.isOpen && window && !window.contains(e.target) && !toggle.contains(e.target)) {
        this.close();
      }
    });
  },
  
  toggle() {
    this.isOpen = !this.isOpen;
    const window = document.getElementById('chatWindow');
    const toggle = document.getElementById('chatToggle');
    const badge = document.getElementById('chatBadge');
    
    if (this.isOpen) {
      window.classList.remove('hidden');
      toggle.classList.add('brand-700');
      if (badge) badge.classList.add('hidden');
      this.scrollToBottom();
    } else {
      window.classList.add('hidden');
      toggle.classList.remove('brand-700');
    }
  },
  
  close() {
    this.isOpen = false;
    const window = document.getElementById('chatWindow');
    const toggle = document.getElementById('chatToggle');
    window?.classList.add('hidden');
    toggle?.classList.remove('brand-700');
  },
  
  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();
    if (!message || this.isTyping) return;
    
    this.addMessage(message, 'user');
    input.value = '';
    this.showTyping();
    
    try {
      const data = await API.sendChatMessage(message, this.sessionId, this.leadId);
      
      this.hideTyping();
      
      if (data.success) {
        this.addMessage(data.response, 'ai');
        
        if (data.sendDocument && data.document) {
          setTimeout(() => {
            this.addMessage(`📄 Main aapko ${data.document.title} document bhej raha hoon.`, 'ai');
            this.showDocumentButton(data.document);
          }, 1000);
        }
        
        if (data.suggestHuman) {
          setTimeout(() => {
            this.addMessage("Kya aap abhi human sales agent se baat karna chahenge?", 'ai');
            this.showHumanTransferButton();
          }, 1000);
        }
        
        if (data.lead_id) this.leadId = data.lead_id;
      } else {
        this.addMessage("Maaf kijiye, thik se response nahi aaya. Kripya dobara koshish karein.", 'ai');
      }
    } catch (err) {
      this.hideTyping();
      this.addMessage("Connection error. Kripya thodi der baad koshish karein.", 'ai');
    }
    
    this.scrollToBottom();
  },
  
  addMessage(text, sender) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const div = document.createElement('div');
    const isUser = sender === 'user';
    div.className = `chat-bubble ${sender} animate-fade-in`;
    div.innerHTML = `
      <div class="bubble-content">${this.escapeHtml(text)}</div>
      <div class="bubble-time">${this.formatTime(new Date())}</div>
    `;
    container.appendChild(div);
    this.scrollToBottom();
  },
  
  showTyping() {
    this.isTyping = true;
    const typing = document.getElementById('chatTyping');
    if (typing) typing.classList.remove('hidden');
    this.scrollToBottom();
  },
  
  hideTyping() {
    this.isTyping = false;
    const typing = document.getElementById('chatTyping');
    if (typing) typing.classList.add('hidden');
  },
  
  showDocumentButton(document) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const btn = document.createElement('button');
    btn.className = 'w-full py-3 bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-100 transition flex items-center justify-center gap-2 mb-2 animate-slide-in';
    btn.innerHTML = `<i class="fas fa-file-pdf text-red-500"></i> ${this.escapeHtml(document.title)}`;
    btn.onclick = () => this.openDocModal(document);
    container.appendChild(btn);
    this.scrollToBottom();
  },
  
  showHumanTransferButton() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const btn = document.createElement('button');
    btn.className = 'w-full py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition mb-2 animate-slide-in';
    btn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>👥 Talk to Human Sales Agent';
    btn.onclick = async () => {
      this.addMessage('Connecting you to human sales team...', 'ai');
      await this.saveLeadFromChat();
      setTimeout(() => {
        this.addMessage('A human agent will join you shortly. You can also fill the form below for faster service.', 'ai');
        Modal.open('leadModal');
      }, 1500);
    };
    container.appendChild(btn);
    this.scrollToBottom();
  },
  
  openDocModal(document) {
    const content = document.getElementById('docContent');
    const downloadBtn = document.getElementById('docDownloadBtn');
    if (content && downloadBtn) {
      content.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <i class="fas ${document.file_type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file'} text-2xl"></i>
            <div>
              <div class="font-bold text-gray-900">${this.escapeHtml(document.title)}</div>
              <div class="text-xs text-gray-500">${this.escapeHtml(document.description || 'No description')}</div>
            </div>
          </div>
          <div class="text-sm text-gray-600">${document.file_type.toUpperCase()} document</div>
        </div>
      `;
      downloadBtn.href = document.file_url;
      Modal.open('docModal');
    }
  },
  
  async saveLeadFromChat() {
    try {
      const res = await API.createLead({
        name: 'Chat User',
        service_interest: 'From AI Chat',
        message: 'Qualified via AI chat',
        source: 'website',
        outreach_channel: 'chat'
      });
      if (res.success) {
        this.leadId = res.lead.id;
        await API.transferToHuman(this.leadId, 'ai_qualified_interested');
      }
    } catch (err) {
      console.error('Failed to save lead:', err);
    }
  },
  
  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
  },
  
  formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  loadSession() {
    // Load any existing session from localStorage
    const saved = localStorage.getItem('leadconnect_chat_session');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.sessionId = data.sessionId || this.sessionId;
        this.leadId = data.leadId || null;
      } catch (e) {}
    }
  },
  
  saveSession() {
    localStorage.setItem('leadconnect_chat_session', JSON.stringify({
      sessionId: this.sessionId,
      leadId: this.leadId
    }));
  }
};

// ========================================
// Lead Form Handler
// ========================================
const LeadForm = {
  init() {
    const form = document.getElementById('leadForm');
    if (!form) return;
    
    const rules = {
      name: { required: true },
      email: { required: true, email: true },
      company: { required: false },
      service_interest: { required: true },
      target_audience: { required: true },
      region: { required: true }
    };
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Validation.clearErrors(form);
      
      const { isValid, data } = Validation.validate(form, rules);
      if (!isValid) return;
      
      Loading.show(form);
      
      try {
        const res = await API.createLead(data);
        if (res.success) {
          Toast.success('Lead saved successfully! Our team will contact you soon.', 'Success');
          Modal.close('leadModal');
          form.reset();
          
          // Refresh dashboard if on dashboard page
          if (window.Dashboard) window.Dashboard.load();
        } else {
          Toast.error(res.error || 'Failed to save lead');
        }
      } catch (err) {
        Toast.error('Failed to submit. Please try again.');
      } finally {
        Loading.hide(form);
      }
    });
  }
};

// ========================================
// Dashboard
// ========================================
const Dashboard = {
  init() {
    this.bindEvents();
    this.checkAuth();
  },
  
  async checkAuth() {
    if (!supabase) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login';
      return;
    }
    
    this.updateUserUI(session.user);
    this.load();
  },
  
  updateUserUI(user) {
    const nameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = user.user_metadata?.name || user.email;
    if (avatarEl) avatarEl.textContent = (user.user_metadata?.name || user.email).charAt(0).toUpperCase();
  },
  
  bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });
    
    // Lead modal
    const openBtn = document.querySelector('[onclick="openLeadModal()"]');
    if (openBtn) openBtn.addEventListener('click', () => Modal.open('leadModal'));
    
    document.getElementById('leadModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'leadModal') Modal.close('leadModal');
    });
    
    // Sign out
    const signOutBtn = document.querySelector('[onclick="signOut()"]');
    if (signOutBtn) signOutBtn.addEventListener('click', () => this.signOut());
    
    // Lead form
    LeadForm.init();
  },
  
  async load() {
    this.showSkeletons();
    
    try {
      const [leadsRes, convRes, transferRes] = await Promise.allSettled([
        API.getLeads(),
        API.request('/api/conversations/all'),
        API.getHumanTransferQueue()
      ]);
      
      const leads = leadsRes.status === 'fulfilled' ? (leadsRes.value.leads || []) : [];
      const conversations = convRes.status === 'fulfilled' ? (convRes.value.conversations || []) : [];
      const transfers = transferRes.status === 'fulfilled' ? (transferRes.value.queue || []) : [];
      
      this.updateStats(leads.length, conversations.length, transfers.length);
      this.renderLeadsTable(leads);
    } catch (err) {
      console.error('Dashboard load error:', err);
      Toast.error('Failed to load dashboard data');
    }
  },
  
  showSkeletons() {
    const tbody = document.getElementById('leadsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr class="skeleton-table-row"><td colspan="7"><div class="skeleton" style="height: 1rem; width: 80%;"></div></td></tr>
        <tr class="skeleton-table-row"><td colspan="7"><div class="skeleton" style="height: 1rem; width: 90%;"></div></td></tr>
        <tr class="skeleton-table-row"><td colspan="7"><div class="skeleton" style="height: 1rem; width: 70%;"></div></td></tr>
      `;
    }
  },
  
  updateStats(leads, conversations, transfers) {
    const els = {
      totalLeads: document.getElementById('totalLeads'),
      aiConversations: document.getElementById('aiConversations'),
      humanTransfers: document.getElementById('humanTransfers'),
      conversionRate: document.getElementById('conversionRate')
    };
    
    if (els.totalLeads) els.totalLeads.textContent = leads;
    if (els.aiConversations) els.aiConversations.textContent = conversations;
    if (els.humanTransfers) els.humanTransfers.textContent = transfers;
    if (els.conversionRate) {
      const rate = leads > 0 ? Math.round((transfers / leads) * 100) : 0;
      els.conversionRate.textContent = rate + '%';
    }
  },
  
  renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    if (!tbody) return;
    
    if (leads.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-12 text-center">
            <div class="empty-state">
              <i class="fas fa-users empty-state-icon"></i>
              <div class="empty-state-title">No leads yet</div>
              <div class="empty-state-message">Click "Add Lead" to get started with your first lead.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = leads.map(lead => `
      <tr class="hover:bg-gray-50 animate-fade-in">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${this.escapeHtml(lead.name || 'N/A')}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${this.escapeHtml(lead.email || 'N/A')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${this.escapeHtml(lead.company || 'N/A')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${this.escapeHtml(lead.service_interest || 'N/A')}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="badge status-${lead.status || 'new'}">${this.formatStatus(lead.status)}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${lead.lead_score || 0}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex items-center gap-2">
            <button onclick="Dashboard.contactLead('${lead.id}', 'whatsapp')" 
              class="btn btn-icon btn-ghost text-green-600 hover:text-green-700" 
              data-tooltip="WhatsApp">
              <i class="fab fa-whatsapp text-xl"></i>
            </button>
            <button onclick="Dashboard.contactLead('${lead.id}', 'email')" 
              class="btn btn-icon btn-ghost text-blue-600 hover:text-blue-700" 
              data-tooltip="Email">
              <i class="fas fa-envelope text-xl"></i>
            </button>
            <button onclick="Dashboard.transferLead('${lead.id}')" 
              class="btn btn-icon btn-ghost text-purple-600 hover:text-purple-700" 
              data-tooltip="Transfer to Human">
              <i class="fas fa-user-plus text-xl"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },
  
  formatStatus(status) {
    const labels = {
      new: 'New',
      contacted: 'Contacted',
      ai_talking: 'AI Talking',
      interested: 'Interested',
      human_transfer: 'Human Transfer',
      closed: 'Closed',
      do_not_contact: 'Do Not Contact'
    };
    return labels[status] || status;
  },
  
  showTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active', 'border-brand-600', 'text-brand-600');
      b.classList.add('border-transparent', 'text-gray-500');
    });
    
    const panel = document.getElementById('panel-' + tabName);
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    
    if (panel) panel.classList.remove('hidden');
    if (btn) {
      btn.classList.add('active', 'border-brand-600', 'text-brand-600');
      btn.classList.remove('border-transparent', 'text-gray-500');
    }
  },
  
  async contactLead(leadId, channel) {
    try {
      if (channel === 'whatsapp') {
        const data = await API.sendWhatsApp(leadId, 'Hello from LeadConnect!');
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
          Toast.success('WhatsApp opened');
        }
      } else if (channel === 'email') {
        // Could open mailto or show compose modal
        Toast.info('Email compose feature coming soon');
      }
    } catch (err) {
      Toast.error('Failed to open ' + channel);
    }
  },
  
  async transferLead(leadId) {
    try {
      await API.transferToHuman(leadId);
      Toast.success('Lead transferred to human queue');
      this.load();
    } catch (err) {
      Toast.error('Failed to transfer lead');
    }
  },
  
  async signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = '/login';
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ========================================
// Auth Pages (Login/Signup)
// ========================================
const Auth = {
  init() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginForm) this.bindLogin(loginForm);
    if (signupForm) this.bindSignup(signupForm);
    
    // Check if already logged in
    this.checkSession();
  },
  
  async checkSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) window.location.href = '/dashboard';
  },
  
  bindLogin(form) {
    const rules = {
      email: { required: true, email: true },
      password: { required: true, minLength: 6 }
    };
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Validation.clearErrors(form);
      
      const { isValid, data } = Validation.validate(form, rules);
      if (!isValid) return;
      
      Loading.show(form);
      
      try {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (error) {
          Toast.error(error.message);
          Loading.hide(form);
          return;
        }
        
        Toast.success('Welcome back!');
        window.location.href = '/dashboard';
      } catch (err) {
        Toast.error('Login failed. Please try again.');
        Loading.hide(form);
      }
    });
  },
  
  bindSignup(form) {
    const rules = {
      firstName: { required: true },
      lastName: { required: true },
      email: { required: true, email: true },
      password: { required: true, minLength: 8 },
      confirmPassword: { required: true, match: 'password', matchMessage: 'Passwords do not match' },
      terms: { required: true }
    };
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      Validation.clearErrors(form);
      
      const { isValid, data } = Validation.validate(form, rules);
      if (!isValid) return;
      
      Loading.show(form);
      
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { 
              name: `${data.firstName} ${data.lastName}`,
              company: data.company
            },
            emailRedirectTo: window.location.origin + '/dashboard'
          }
        });
        
        if (error) {
          Toast.error(error.message);
          Loading.hide(form);
          return;
        }
        
        Toast.success('Account created! Please check your email to confirm.');
        setTimeout(() => window.location.href = '/login', 3000);
      } catch (err) {
        Toast.error('Signup failed. Please try again.');
        Loading.hide(form);
      }
    });
  }
};

// ========================================
// Landing Page Interactions
// ========================================
const Landing = {
  init() {
    this.initScrollAnimations();
    this.initSmoothScroll();
    this.initFAQ();
  },
  
  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el));
  },
  
  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },
  
  initFAQ() {
    window.toggleFaq = (btn) => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('i');
      const isHidden = content.classList.contains('hidden');
      
      // Close all others
      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.faq-content').forEach(() => {
        // icons handled by CSS
      });
      
      if (isHidden) {
        content.classList.remove('hidden');
        icon?.classList.replace('fa-chevron-down', 'fa-chevron-up');
      } else {
        content.classList.add('hidden');
        icon?.classList.replace('fa-chevron-up', 'fa-chevron-down');
      }
    };
  }
};

// ========================================
// Global Functions (for inline onclick)
// ========================================
window.Modal = Modal;
window.Toast = Toast;
window.Loading = Loading;
window.AIChat = AIChat;
window.LeadForm = LeadForm;
window.Dashboard = Dashboard;
window.Landing = Landing;
window.Auth = Auth;
window.API = API;

// ========================================
// Initialize on DOM Ready
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Toast
  Toast.init();
  
  // Hide page loader
  Loading.hidePage();
  
  // Page-specific initialization
  const path = window.location.pathname;
  
  if (path === '/' || path === '/index.html') {
    Landing.init();
    AIChat.init();
  } else if (path === '/login') {
    Auth.init();
  } else if (path === '/signup') {
    Auth.init();
  } else if (path === '/dashboard') {
    Dashboard.init();
  }
  
  // Global form modal handlers
  const leadModal = document.getElementById('leadModal');
  const docModal = document.getElementById('docModal');
  
  if (leadModal) {
    leadModal.addEventListener('click', (e) => {
      if (e.target.id === 'leadModal') Modal.close('leadModal');
    });
  }
  
  if (docModal) {
    docModal.addEventListener('click', (e) => {
      if (e.target.id === 'docModal') Modal.close('docModal');
    });
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(modal => {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
    
    // Ctrl/Cmd + K to open chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      AIChat.toggle();
    }
  });
  
  console.log('LeadConnect initialized ✨');
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, Toast, Loading, Validation, Modal, API, AIChat, LeadForm, Dashboard, Landing, Auth };
}