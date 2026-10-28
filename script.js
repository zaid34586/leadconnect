/**
 * LeadConnect AI — Frontend JavaScript
 * Handles: AI Chat with thinking, Document sharing, Lead form, API integration
 */

const CONFIG = {
  SUPABASE_URL: 'your_supabase_project_url',
  SUPABASE_ANON_KEY: 'your_supabase_anon_key',
  API_BASE: window.location.origin
};

let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

// Chat state
let chatSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
let chatLeadId = null;
let chatIsOpen = false;
let pendingDocument = null;

// ==================== SCROLL ANIMATIONS ====================
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.section-reveal').forEach(el => observer.observe(el));
}

// ==================== AI CHAT ====================
function toggleChat() {
  const chatWindow = document.getElementById('chatWindow');
  const chatToggle = document.getElementById('chatToggle');
  const badge = document.getElementById('chatBadge');

  chatIsOpen = !chatIsOpen;
  if (chatIsOpen) {
    chatWindow.classList.remove('hidden');
    chatToggle.classList.add('brand-700');
    badge.classList.add('hidden');
    scrollChatToBottom();
  } else {
    chatWindow.classList.add('hidden');
    chatToggle.classList.remove('brand-700');
  }
}

function handleChatKey(event) {
  if (event.key === 'Enter') sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addChatMessage(message, 'user');
  input.value = '';

  // Save user message to Supabase
  if (supabase && chatLeadId) {
    await saveConversation(chatLeadId, chatSessionId, message, 'user');
  }

  showTyping();

  // Call AI API
  setTimeout(async () => {
    hideTyping();

    try {
      const response = await fetch(`${CONFIG.API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: chatSessionId, lead_id: chatLeadId })
      });
      const data = await response.json();

      if (data.success) {
        // Show AI thinking indicator briefly then response
        addChatMessage(data.response, 'ai');

        // Save AI response
        if (supabase && chatLeadId) {
          await saveConversation(chatLeadId, chatSessionId, data.response, 'ai');
        }

        // Handle document
        if (data.sendDocument && data.document) {
          pendingDocument = data.document;
          setTimeout(() => {
            addChatMessage(`📄 Main aapko ${data.document.title} document bhej raha hoon.`, 'ai');
            showDocumentButton(data.document);
          }, 1000);
        }

        // Handle human transfer
        if (data.suggestHuman) {
          setTimeout(() => {
            addChatMessage("Kya aap abhi human sales agent se baat karna chahenge?", 'ai');
            showHumanTransferButton();
          }, 1000);
        }

        // Update lead id from response
        if (data.lead_id) chatLeadId = data.lead_id;
      } else {
        addChatMessage("Maaf kijiye, thik se response nahi aaya. Kripya dobara koshish karein.", 'ai');
      }
    } catch (err) {
      console.error(err);
      addChatMessage("Connection error. Kripya thodi der baad koshish karein.", 'ai');
    }

    scrollChatToBottom();
  }, 1500);
}

function addChatMessage(text, sender) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  const isUser = sender === 'user';
  div.className = `chat-bubble ${sender} p-3 rounded-2xl ${isUser 
    ? 'bg-brand-600 text-white rounded-tr-none ml-auto float-right' 
    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`;
  div.innerHTML = `<p class="text-sm">${text}</p>`;
  container.appendChild(div);
}

function showTyping() {
  document.getElementById('chatTyping').classList.remove('hidden');
  scrollChatToBottom();
}

function hideTyping() {
  document.getElementById('chatTyping').classList.add('hidden');
}

function scrollChatToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

function showDocumentButton(document) {
  const container = document.getElementById('chatMessages');
  const btn = document.createElement('button');
  btn.className = 'w-full py-3 bg-brand-50 border border-brand-200 text-brand-700 text-sm font-semibold rounded-lg hover:bg-brand-100 transition flex items-center justify-center gap-2 mb-2';
  btn.innerHTML = `<i class="fas fa-file-pdf text-red-500"></i> ${document.title}`;
  btn.onclick = () => openDocModal(document);
  container.appendChild(btn);
  scrollChatToBottom();
}

function showHumanTransferButton() {
  const container = document.getElementById('chatMessages');
  const btn = document.createElement('button');
  btn.className = 'w-full py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition mb-2';
  btn.innerText = '👥 Talk to Human Sales Agent';
  btn.onclick = async () => {
    addChatMessage('Connecting you to human sales team...', 'ai');
    await saveLeadFromChat();
    setTimeout(() => {
      addChatMessage('A human agent will join you shortly. You can also fill the form below for faster service.', 'ai');
      openLeadModal();
    }, 1500);
  };
  container.appendChild(btn);
  scrollChatToBottom();
}

// ==================== DOCUMENT MODAL ====================
function openDocModal(document) {
  pendingDocument = document;
  const content = document.getElementById('docContent');
  content.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <i class="fas ${document.file_type === 'pdf' ? 'fa-file-pdf text-red-500' : 'fa-file'}</i>
        <div>
          <div class="font-bold text-gray-900">${document.title}</div>
          <div class="text-xs text-gray-500">${document.description || 'No description'}</div>
        </div>
      </div>
      <div class="text-sm text-gray-600">${document.file_type.toUpperCase()} document</div>
    </div>
  `;
  document.getElementById('docDownloadBtn').href = document.file_url;
  document.getElementById('docModal').classList.remove('hidden');
}

function closeDocModal() {
  document.getElementById('docModal').classList.add('hidden');
}

// ==================== LEAD FORM ====================
function openLeadModal() {
  document.getElementById('leadModal').classList.remove('hidden');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.add('hidden');
}

document.getElementById('leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (result.success) {
      chatLeadId = result.lead.id;
      alert('Thank you! Your details saved. Our team will contact you soon.');
      closeLeadModal();
      e.target.reset();
    } else {
      alert('Something went wrong. Please try again.');
    }
  } catch (err) {
    alert('Failed to submit. Please try again.');
  }
});

// Save lead from chat data
async function saveLeadFromChat() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chat User',
        service_interest: 'From AI Chat',
        message: 'Qualified via AI chat',
        source: 'website',
        outreach_channel: 'chat'
      })
    });
    const result = await response.json();
    if (result.success) {
      chatLeadId = result.lead.id;
      await fetch(`${CONFIG.API_BASE}/api/human-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: chatLeadId, reason: 'ai_qualified_interested' })
      });
    }
  } catch (err) {
    console.error('Failed to save lead:', err);
  }
}

// Save conversation
async function saveConversation(leadId, sessionId, message, sender) {
  try {
    await fetch(`${CONFIG.API_BASE}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, session_id: sessionId, message, sender })
    });
  } catch (err) {
    console.error('Failed to save conversation:', err);
  }
}

// ==================== FAQ ====================
function toggleFaq(btn) {
  const content = btn.nextElementSibling;
  const icon = btn.querySelector('i');
  const isHidden = content.classList.contains('hidden');
  
  // Close all others
  document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.faq-content').forEach(() => {
    // icons reset handled by CSS
  });
  
  if (isHidden) {
    content.classList.remove('hidden');
    icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
  } else {
    content.classList.add('hidden');
    icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();

  document.getElementById('leadModal').addEventListener('click', (e) => {
    if (e.target.id === 'leadModal') closeLeadModal();
  });
  document.getElementById('docModal').addEventListener('click', (e) => {
    if (e.target.id === 'docModal') closeDocModal();
  });

  console.log('LeadConnect AI initialized. Session:', chatSessionId);
});
