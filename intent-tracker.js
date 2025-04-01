window.intentTrackingEncrypt = true;
// ================================
// Config Flags
// ================================
const DEBUG_FUNNEL = true; // Set false in prod
const USE_ENCRYPTION = window.location.hostname !== 'localhost'; // Scramble in prod
const SECRET_KEY = 'super-secret-passphrase';
const STORAGE_KEY = USE_ENCRYPTION ? '__sh_x83kz1_' : 'search_history';

// ================================
// Utility Functions
// ================================
function logFunnel(msg, data) {
	if (DEBUG_FUNNEL) console.log(`[🔍 Funnel] ${msg}`, data || '');
}

function encryptData(obj) {
	if (!USE_ENCRYPTION) return JSON.stringify(obj);
	return CryptoJS.AES.encrypt(JSON.stringify(obj), SECRET_KEY).toString();
}

function decryptData(str) {
	if (!USE_ENCRYPTION) return JSON.parse(str || '[]');
	try {
		const bytes = CryptoJS.AES.decrypt(str, SECRET_KEY);
		return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
	} catch (err) {
		console.warn("Decrypt error:", err);
		return [];
	}
}

function saveFunnelHistory(history) {
	localStorage.setItem(STORAGE_KEY, encryptData(history));
}

function getFunnelHistory() {
	return decryptData(localStorage.getItem(STORAGE_KEY)) || [];
}

function updateFunnelEntry(funnelId, newData) {
	const history = getFunnelHistory();
	const index = history.findIndex(entry => entry.funnel_id === funnelId);
	if (index === -1) return;
	history[index] = { ...history[index], ...newData };
	saveFunnelHistory(history);
}

// ================================
// Core Tracking Functions
// ================================

function generateFunnelId() {
	return 'funnel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getDeviceType() {
	const ua = navigator.userAgent;
	if (/mobile/i.test(ua)) return "mobile";
	if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
	return "desktop";
}

function getSearchQueryFromReferrer() {
	try {
		const refUrl = new URL(document.referrer);
		if (refUrl.hostname.includes('google.') || refUrl.hostname.includes('bing.')) {
			return new URLSearchParams(refUrl.search).get('q');
		}
	} catch (e) {}
	return null;
}

function buildSearchEntry({ firstName, lastName, city, state, gender, isSelfSearch, scrolled, scroll_depth, scroll_time, idle_time, funnelId }) {
	function getScrollBehavior() {
		if (!userHasScrolled) return "none";
		const depth = scrollDepthPercent;
		const time = parseFloat(scrollTimeSeconds || "0");
		if (depth >= 75 && time < 5) return "quick";
		if (depth >= 50 && time >= 5) return "gradual";
		if (depth < 50 && time >= 5) return "hesitant";
		return "unknown";
	}

	const params = new URLSearchParams(window.location.search);
	const formInteractionTime = ((performance.now() - (window.formStartTime || performance.now())) / 1000).toFixed(2);

	return {
		funnel_id: funnelId || null,
		type: "person",
		firstName,
		lastName,
		city,
		state,
		gender: gender || "skip",
		self: isSelfSearch || false,
		scrolled: userHasScrolled || false,
		scroll_depth: scrollDepthPercent || 0,
		scroll_time: scrollTimeSeconds || null,
		scroll_behavior: getScrollBehavior(),
		formInteractionTime: formInteractionTime,
		referrer: document.referrer ? new URL(document.referrer).hostname : "direct",
		search_term: getSearchQueryFromReferrer(),
		utm_source: params.get("utm_source") || null,
		utm_medium: params.get("utm_medium") || null,
		utm_campaign: params.get("utm_campaign") || null,
		utm_term: params.get("utm_term") || null,
		utm_content: params.get("utm_content") || null,
		gclid: params.get("gclid") || null,
		fbclid: params.get("fbclid") || null,
		device: getDeviceType(),
		screen_size: `${window.innerWidth}x${window.innerHeight}`,
		language: navigator.language || "unknown",
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
		timestamp: new Date().toISOString()
	};
}

// ================================
// Bootstrap Funnel
// ================================

function initializeFunnelTracking() {
	let funnelId = sessionStorage.getItem("currentFunnelId");

	if (!funnelId) {
		funnelId = generateFunnelId();
		sessionStorage.setItem("currentFunnelId", funnelId);

		const entry = buildSearchEntry({
			firstName: null,
			lastName: null,
			city: null,
			state: null,
			gender: null,
			isSelfSearch: false,
			scrolled: false,
			scroll_depth: 0,
			scroll_time: null,
			idle_time: 0,
			funnelId
		});

		const history = getFunnelHistory();
		history.unshift(entry);
		saveFunnelHistory(history);

		logFunnel("Initialized funnel", entry);
	}
}
