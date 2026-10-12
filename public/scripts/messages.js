// ==================== SYSTEM USERS ====================
// Users available to start a conversation with.
// "existingChatId" links to a chat in `chats` if one already exists.
const users = [
    { id: "u1", name: "John Doe", initials: "JD", color: "#4f46e5", status: "online", role: "Customer", existingChatId: 1 },
    { id: "u2", name: "Sarah Miller", initials: "SM", color: "#10b981", status: "last seen 2h ago", role: "Customer", existingChatId: 2 },
    { id: "u3", name: "Support Team", initials: "ST", color: "#f59e0b", status: "online", role: "Internal", existingChatId: 3 },
    { id: "u4", name: "Mike Chen", initials: "MC", color: "#ef4444", status: "offline", role: "Customer", existingChatId: 4 },
    { id: "u5", name: "Old Order #1120", initials: "OO", color: "#6b7280", status: "offline", role: "Archived", existingChatId: 5 },
    { id: "u6", name: "Emma Wilson", initials: "EW", color: "#8b5cf6", status: "online", role: "Vendor", existingChatId: null },
    { id: "u7", name: "David Park", initials: "DP", color: "#0ea5e9", status: "last seen 5m ago", role: "Customer", existingChatId: null },
    { id: "u8", name: "Aisha Khan", initials: "AK", color: "#ec4899", status: "online", role: "Vendor", existingChatId: null },
    { id: "u9", name: "Liam O'Brien", initials: "LO", color: "#14b8a6", status: "offline", role: "Customer", existingChatId: null },
];
let chats = [
    {
        id: 1, name: "John Doe", avatarColor: "#4f46e5", initials: "JD",
        status: "online", unread: 2, archived: false, muted: false,
        messages: [
            { id: 1, text: "Hey! Is the order still available?", sender: "in", time: "10:12 AM", date: "Today" },
            { id: 2, text: "Hi John! Yes, it is. Ready to ship whenever you are.", sender: "out", time: "10:14 AM", date: "Today" },
            { id: 3, text: "Perfect. Can I get express delivery? 🚀", sender: "in", time: "10:15 AM", date: "Today" },
            { id: 4, text: "Absolutely. Express adds $8. Want me to include it?", sender: "out", time: "10:16 AM", date: "Today" },
        ],
    },
    {
        id: 2, name: "Sarah Miller", avatarColor: "#10b981", initials: "SM",
        status: "last seen 2h ago", unread: 0, archived: false, muted: false,
        messages: [
            { id: 1, text: "Thanks for the quick reply! 😊", sender: "in", time: "Yesterday", date: "Yesterday" },
            { id: 2, text: "Anytime, Sarah. Let me know if you need anything else.", sender: "out", time: "Yesterday", date: "Yesterday" },
        ],
    },
    {
        id: 3, name: "Support Team", avatarColor: "#f59e0b", initials: "ST",
        status: "online", unread: 0, archived: false, muted: false,
        messages: [
            { id: 1, text: "Your ticket #4821 has been resolved. ✅", sender: "in", time: "Mon", date: "Monday" },
        ],
    },
    {
        id: 4, name: "Mike Chen", avatarColor: "#ef4444", initials: "MC",
        status: "offline", unread: 1, archived: false, muted: false,
        messages: [
            { id: 1, text: "Did you get the payment confirmation? 💳", sender: "in", time: "Sun", date: "Sunday" },
        ],
    },
    {
        id: 5, name: "Old Order #1120", avatarColor: "#6b7280", initials: "OO",
        status: "offline", unread: 0, archived: true, muted: false,
        messages: [
            { id: 1, text: "Order completed. Thanks!", sender: "in", time: "Last week", date: "Last week" },
        ],
    },
];

const state = {
    activeChatId: null,
    filter: "all",         // all | unread | archived
    search: "",
};

// ==================== DOM ====================
const appEl = document.getElementById("app");
const sidebarEl = document.getElementById("sidebar");
const chatListEl = document.getElementById("chatList");
const listEmptyEl = document.getElementById("listEmpty");
const conversationEl = document.getElementById("conversation");
const conversationPanel = document.getElementById("conversationPanel");
const emptyStateEl = document.getElementById("emptyState");
const convAvatarEl = document.getElementById("convAvatar");
const convNameEl = document.getElementById("convName");
const convStatusEl = document.getElementById("convStatus");
const messagesAreaEl = document.getElementById("messagesArea");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const backBtn = document.getElementById("backBtn");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const filterNav = document.getElementById("filterNav");

const menuBtn = document.getElementById("menuBtn");
const chatMenu = document.getElementById("chatMenu");

const emojiBtn = document.getElementById("emojiBtn");
const emojiPicker = document.getElementById("emojiPicker");
const emojiGrid = document.getElementById("emojiGrid");
const closeEmojiBtn = document.getElementById("closeEmoji");

const typingIndicator = document.getElementById("typingIndicator");
const toastEl = document.getElementById("toast");

const newChatBtn = document.getElementById("newChatBtn");
const newChatModal = document.getElementById("newChatModal");
const newChatBackdrop = document.getElementById("newChatBackdrop");
const closeNewChatBtn = document.getElementById("closeNewChat");
const userSearch = document.getElementById("userSearch");
const userListEl = document.getElementById("userList");
const userListEmptyEl = document.getElementById("userListEmpty");

// ==================== HELPERS ====================
function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2200);
}

function getActiveChat() {
    return chats.find((c) => c.id === state.activeChatId) || null;
}

// ==================== FILTER + SEARCH ====================
function getVisibleChats() {
    const q = state.search.trim().toLowerCase();

    return chats.filter((chat) => {
        // Filter tab
        if (state.filter === "unread" && chat.unread === 0) return false;
        if (state.filter === "archived" && !chat.archived) return false;
        if (state.filter === "all" && chat.archived) return false; // hide archived from "all"

        // Search: name OR message content
        if (q) {
            const nameMatch = chat.name.toLowerCase().includes(q);
            const msgMatch = chat.messages.some((m) => m.text.toLowerCase().includes(q));
            if (!nameMatch && !msgMatch) return false;
        }
        return true;
    });
}

function updateFilterCounts() {
    const all = chats.filter((c) => !c.archived).length;
    const unread = chats.filter((c) => !c.archived && c.unread > 0).length;
    const archived = chats.filter((c) => c.archived).length;

    document.querySelector('[data-count="all"]').textContent = all ? `(${all})` : "";
    document.querySelector('[data-count="unread"]').textContent = unread ? `(${unread})` : "";
    document.querySelector('[data-count="archived"]').textContent = archived ? `(${archived})` : "";
}

// ==================== RENDER CHAT LIST ====================
function renderChatList() {
    const visible = getVisibleChats();
    chatListEl.innerHTML = "";

    if (visible.length === 0) {
        chatListEl.classList.add("hidden");
        listEmptyEl.classList.remove("hidden");
        listEmptyEl.classList.add("flex");
        updateFilterCounts();
        return;
    }
    chatListEl.classList.remove("hidden");
    listEmptyEl.classList.add("hidden");
    listEmptyEl.classList.remove("flex");

    visible.forEach((chat) => {
        const last = chat.messages[chat.messages.length - 1];
        const isActive = chat.id === state.activeChatId;

        const item = document.createElement("div");
        item.className = [
            "relative flex gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 transition hover:bg-gray-100",
            isActive ? "bg-gray-100" : "",
        ].join(" ");
        item.dataset.id = chat.id;

        if (isActive) {
            const bar = document.createElement("span");
            bar.className = "absolute left-0 top-0 bottom-0 w-[3px] bg-brand";
            item.appendChild(bar);
        }

        // Highlight search match in name/preview
        const q = state.search.trim();
        const nameHtml = q ? highlight(chat.name, q) : escapeHtml(chat.name);
        const previewText = last ? last.text : "No messages";
        const previewHtml = q ? highlight(previewText, q) : escapeHtml(previewText);

        item.innerHTML += `
            <div class="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white shrink-0 text-base relative"
                 style="background:${chat.avatarColor}">
                ${chat.initials}
                ${chat.muted ? `<span class="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                </span>` : ""}
            </div>

            <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div class="flex justify-between items-baseline gap-2">
                    <span class="font-semibold text-sm truncate">${nameHtml}</span>
                    <span class="text-xs text-gray-500 shrink-0">${last ? last.time : ""}</span>
                </div>
                <div class="flex justify-between items-center gap-2">
                    <span class="text-[13px] truncate ${chat.unread ? 'text-gray-900 font-medium' : 'text-gray-500'}">
                        ${previewHtml}
                    </span>
                    ${chat.unread ? `<span class="bg-brand text-white text-[11px] font-semibold px-2 py-[2px] rounded-full min-w-[18px] text-center">${chat.unread}</span>` : ""}
                </div>
            </div>
        `;

        item.addEventListener("click", () => openChat(chat.id));
        chatListEl.appendChild(item);
    });

    updateFilterCounts();
}

function highlight(text, query) {
    const safe = escapeHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escapedQuery})`, "ig");
    return safe.replace(re, `<mark class="bg-yellow-200 rounded-sm">$1</mark>`);
}

// ==================== OPEN CHAT ====================
// Detect mobile once
const mqMobile = window.matchMedia("(max-width: 767px)");
const isMobile = () => mqMobile.matches;

// ==================== OPEN CHAT ====================
function openChat(id) {
    state.activeChatId = id;
    const chat = getActiveChat();
    if (!chat) return;

    chat.unread = 0;

    // Header
    convAvatarEl.textContent = chat.initials;
    convAvatarEl.style.background = chat.avatarColor;
    convNameEl.textContent = chat.name;
    convStatusEl.textContent = chat.status === "online" ? "Online" : chat.status;
    convStatusEl.className = `text-xs ${chat.status === "online" ? "text-emerald-500" : "text-gray-500"}`;

    // Right panel: show conversation, hide empty state
    emptyStateEl.classList.add("hidden");
    conversationEl.classList.remove("hidden");
    conversationEl.classList.add("flex");

    // Right panel container must always be visible on desktop
    conversationPanel.classList.remove("hidden");
    conversationPanel.classList.add("flex");

    // Mobile-only: hide sidebar, show back button
    if (isMobile()) {
        appEl.classList.add("chat-open");
        sidebarEl.classList.add("hidden");
        sidebarEl.classList.remove("flex");
        backBtn.classList.remove("hidden");
        backBtn.classList.add("flex");
    }

    renderMessages(chat);
    renderChatList();
    messageInput.focus();
    closeMenu();
    closeEmoji();
}

// ==================== RENDER MESSAGES ====================
function renderMessages(chat) {
    messagesAreaEl.innerHTML = "";
    if (chat.messages.length === 0) {
        const intro = document.createElement("div");
        intro.className = "self-center text-xs text-gray-500 bg-white px-3 py-2 rounded-xl my-2 max-w-[80%] text-center";
        intro.textContent = `This is the beginning of your conversation with ${chat.name}.`;
        messagesAreaEl.appendChild(intro);
        return;
    }
    let lastDate = null;

    chat.messages.forEach((msg) => {
        if (msg.date && msg.date !== lastDate) {
            const divider = document.createElement("div");
            divider.className = "self-center text-xs text-gray-500 bg-white px-3 py-1 rounded-xl my-2";
            divider.textContent = msg.date;
            messagesAreaEl.appendChild(divider);
            lastDate = msg.date;
        }

        const isOut = msg.sender === "out";
        const bubble = document.createElement("div");
        bubble.className = [
            "max-w-[65%] px-3.5 py-2.5 text-sm leading-snug break-words animate-fadeIn",
            isOut
                ? "self-end bg-black/50 text-white rounded-2xl rounded-br-[4px]"
                : "self-start bg-black/10 rounded-2xl rounded-bl-[4px]",
        ].join(" ");
        bubble.innerHTML = `
            ${escapeHtml(msg.text)}
            <span class="block text-[11px] opacity-70 mt-1">${msg.time}</span>
        `;
        messagesAreaEl.appendChild(bubble);
    });

    messagesAreaEl.scrollTop = messagesAreaEl.scrollHeight;
}

// ==================== SEND MESSAGE ====================
messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const chat = getActiveChat();
    if (!text || !chat) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    chat.messages.push({ id: Date.now(), text, sender: "out", time: timeStr, date: "Today" });

    messageInput.value = "";
    renderMessages(chat);
    renderChatList();

    // Fake reply for demo
    simulateReply(chat);
});

function simulateReply(chat) {
    typingIndicator.classList.remove("hidden");
    typingIndicator.textContent = `${chat.name} is typing…`;

    setTimeout(() => {
        typingIndicator.classList.add("hidden");
        // Only append if user still on same chat
        if (state.activeChatId !== chat.id) {
            chat.unread = (chat.unread || 0) + 1;
            renderChatList();
            return;
        }
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        chat.messages.push({
            id: Date.now(),
            text: "Got it! 👍",
            sender: "in",
            time: timeStr,
            date: "Today",
        });
        renderMessages(chat);
        renderChatList();
    }, 1400);
}

// ==================== SEARCH ====================
searchInput.addEventListener("input", (e) => {
    state.search = e.target.value;
    clearSearchBtn.classList.toggle("hidden", state.search.length === 0);
    renderChatList();
});

clearSearchBtn.addEventListener("click", () => {
    state.search = "";
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    renderChatList();
    searchInput.focus();
});

// ==================== FILTERS ====================
filterNav.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    state.filter = btn.dataset.filter;

    // Update styles
    filterNav.querySelectorAll(".filter-btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("bg-brand", active);
        b.classList.toggle("text-white", active);
        b.classList.toggle("text-gray-500", !active);
        b.classList.toggle("hover:bg-gray-100", !active);
    });

    renderChatList();
});

// ==================== CHAT ACTION MENU ====================
function openMenu() {
    chatMenu.classList.remove("hidden");
    menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
    chatMenu.classList.add("hidden");
    menuBtn.setAttribute("aria-expanded", "false");
}

menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    chatMenu.classList.contains("hidden") ? openMenu() : closeMenu();
});

chatMenu.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const chat = getActiveChat();
    if (!chat) return;

    switch (action) {
        case "mark-unread":
            chat.unread = 1;
            showToast("Marked as unread");
            break;

        case "mute":
            chat.muted = !chat.muted;
            showToast(chat.muted ? "Notifications muted" : "Notifications unmuted");
            break;

        case "archive":
            chat.archived = true;
            showToast("Chat archived");
            closeConversation();
            break;

        case "delete":
            if (!confirm(`Delete conversation with ${chat.name}?`)) return;
            chats = chats.filter((c) => c.id !== chat.id);
            showToast("Chat deleted");
            closeConversation();
            break;
    }

    renderChatList();
    closeMenu();
});

// Close on outside click / Escape
document.addEventListener("click", (e) => {
    if (!chatMenu.classList.contains("hidden") && !e.target.closest("#chatMenu, #menuBtn")) {
        closeMenu();
    }
    if (!emojiPicker.classList.contains("hidden") && !e.target.closest("#emojiPicker, #emojiBtn")) {
        closeEmoji();
    }
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeMenu(); closeEmoji(); }
});

// ==================== EMOJI PICKER ====================
const EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰",
    "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒",
    "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬",
    "👍", "👎", "👌", "✌️", "🤞", "🤝", "🙏", "👏", "🙌", "💪", "❤️", "🧡", "💛", "💚", "💙", "💜",
    "🖤", "🤍", "💔", "💯", "🔥", "✨", "⭐", "🌟", "🎉", "🎊", "🎁", "🚀", "💳", "✅", "❌", "⚠️",
];

function renderEmojiPicker() {
    emojiGrid.innerHTML = "";
    EMOJIS.forEach((emoji) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "text-xl hover:bg-gray-100 rounded-lg p-1 transition";
        btn.textContent = emoji;
        btn.addEventListener("click", () => {
            messageInput.value += emoji;
            messageInput.focus();
        });
        emojiGrid.appendChild(btn);
    });
}

function openEmoji() { emojiPicker.classList.remove("hidden"); closeMenu(); }
function closeEmoji() { emojiPicker.classList.add("hidden"); }

emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPicker.classList.contains("hidden") ? openEmoji() : closeEmoji();
});
closeEmojiBtn.addEventListener("click", closeEmoji);

// ==================== CLOSE CONVERSATION ====================
function closeConversation() {
    state.activeChatId = null;

    // Right panel back to empty state
    conversationEl.classList.add("hidden");
    conversationEl.classList.remove("flex");
    emptyStateEl.classList.remove("hidden");

    // Mobile-only: restore sidebar, hide right panel
    if (isMobile()) {
        appEl.classList.remove("chat-open");
        sidebarEl.classList.remove("hidden");
        sidebarEl.classList.add("flex");
        conversationPanel.classList.add("hidden");
        conversationPanel.classList.remove("flex");
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
    }

    renderChatList();
}

backBtn.addEventListener("click", closeConversation);
mqMobile.addEventListener("change", () => {
    if (isMobile()) {
        // now small: hide sidebar if chat open
        if (state.activeChatId) {
            sidebarEl.classList.add("hidden");
            sidebarEl.classList.remove("flex");
            conversationPanel.classList.remove("hidden");
            conversationPanel.classList.add("flex");
            backBtn.classList.remove("hidden");
            backBtn.classList.add("flex");
        } else {
            // no chat: show sidebar, hide right panel
            sidebarEl.classList.remove("hidden");
            sidebarEl.classList.add("flex");
            conversationPanel.classList.add("hidden");
            conversationPanel.classList.remove("flex");
        }
    } else {
        // back to desktop: always restore both panels
        sidebarEl.classList.remove("hidden");
        sidebarEl.classList.add("flex");
        conversationPanel.classList.remove("hidden");
        conversationPanel.classList.add("flex");
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
        appEl.classList.remove("chat-open");
    }
});
// ==================== NEW CHAT MODAL ====================
function openNewChatModal() {
    newChatModal.classList.remove("hidden");
    newChatModal.classList.add("flex");
    userSearch.value = "";
    renderUserList("");
    setTimeout(() => userSearch.focus(), 50);
}

function closeNewChatModal() {
    newChatModal.classList.add("hidden");
    newChatModal.classList.remove("flex");
}

function renderUserList(query) {
    const q = query.trim().toLowerCase();
    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );

    userListEl.innerHTML = "";

    if (filtered.length === 0) {
        userListEl.classList.add("hidden");
        userListEmptyEl.classList.remove("hidden");
        return;
    }
    userListEl.classList.remove("hidden");
    userListEmptyEl.classList.add("hidden");

    filtered.forEach(user => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left";

        const hasChat = !!user.existingChatId;
        const chatExists = hasChat && chats.some(c => c.id === user.existingChatId);

        row.innerHTML = `
            <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white text-sm"
                     style="background:${user.color}">${user.initials}</div>
                ${user.status === "online"
                ? `<span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>`
                : ""}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-gray-900 truncate">${escapeHtml(user.name)}</div>
                <div class="text-xs text-gray-500 truncate">
                    ${escapeHtml(user.role)} • ${escapeHtml(user.status)}
                </div>
            </div>
            ${chatExists
                ? `<span class="text-[11px] text-gray-400 shrink-0">Existing</span>`
                : `<span class="text-[11px] text-brand font-medium shrink-0">New</span>`}
        `;

        row.addEventListener("click", () => selectUser(user));
        userListEl.appendChild(row);
    });
}

function selectUser(user) {
    let chatId = user.existingChatId;

    // If the chat exists, use it
    if (chatId && chats.some(c => c.id === chatId)) {
        // Un-archive if it was archived — makes it findable in "All" tab
        const existing = chats.find(c => c.id === chatId);
        if (existing.archived) {
            existing.archived = false;
            showToast("Chat restored from archive");
        }
    } else {
        // Otherwise, create a fresh chat
        chatId = Date.now();
        chats.push({
            id: chatId,
            name: user.name,
            initials: user.initials,
            avatarColor: user.color,
            status: user.status,
            unread: 0,
            archived: false,
            muted: false,
            messages: [],
        });
        user.existingChatId = chatId;

        // Reset filter to All so the new chat is visible
        state.filter = "all";
        state.search = "";
        searchInput.value = "";
        clearSearchBtn.classList.add("hidden");
        filterNav.querySelectorAll(".filter-btn").forEach(b => {
            const active = b.dataset.filter === "all";
            b.classList.toggle("bg-brand", active);
            b.classList.toggle("text-white", active);
            b.classList.toggle("text-gray-500", !active);
            b.classList.toggle("hover:bg-gray-100", !active);
        });
    }

    closeNewChatModal();
    renderChatList();
    openChat(chatId);
}

// Events
newChatBtn.addEventListener("click", openNewChatModal);
closeNewChatBtn.addEventListener("click", closeNewChatModal);
newChatBackdrop.addEventListener("click", closeNewChatModal);

userSearch.addEventListener("input", (e) => renderUserList(e.target.value));

// Close with Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !newChatModal.classList.contains("hidden")) {
        closeNewChatModal();
    }
});
// ==================== INIT ====================
renderEmojiPicker();
renderChatList();