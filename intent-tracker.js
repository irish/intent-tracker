// ================================
// Basic Funnel Config
// ================================
const DEBUG_FUNNEL = true;
const STORAGE_KEY = 'search_history';

// ================================
// Utility Functions
// ================================
function getDeviceType() {
	const ua = navigator.userAgent;
	if (/mobile/i.test(ua)) return "mobile";
	if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
	return "desktop";
}

function getSearchQueryFromReferrer() {
	try {
		const ref = document.referrer;
		if (!ref) return null;
		const refUrl = new URL(ref);
		if (refUrl.hostname.includes('google.') || refUrl.hostname.includes('bing.')) {
			return new URLSearchParams(refUrl.search).get('q');
		}
	} catch (e) {
		return null;
	}
	return null;
}

function generateFunnelId() {
	const timestamp = Date.now();
	const unique = Math.random().toString(36).substr(2, 9);
	return `funnel_${timestamp}_${unique}`;
}

function getUrlParam(param) {
	const params = new URLSearchParams(window.location.search);
	return params.get(param) || null;
}

// ================================
// Main Tracking Function
// ================================
function trackFormInputs(firstName, lastName, state) {
	const funnelId = generateFunnelId();
	const params = new URLSearchParams(window.location.search);

	const entry = {
		funnel_id: funnelId,
		firstName,
		lastName,
		state,
		timestamp: new Date().toISOString(),

		// Device Info
		device: getDeviceType(),
		language: navigator.language || "unknown",
		screen_size: `${window.innerWidth}x${window.innerHeight}`,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",

		// Referral & Campaign
		referrer: document.referrer ? new URL(document.referrer).hostname : "direct",
		search_term: getSearchQueryFromReferrer(),
		utm_source: getUrlParam("utm_source"),
		utm_medium: getUrlParam("utm_medium"),
		utm_campaign: getUrlParam("utm_campaign"),
		utm_term: getUrlParam("utm_term"),
		utm_content: getUrlParam("utm_content"),
		gclid: getUrlParam("gclid"),
		fbclid: getUrlParam("fbclid"),

		// Optional metrics set externally
		idle_time: typeof window.idleTimeSeconds !== "undefined" ? Math.round(window.idleTimeSeconds) : null,
		formInteractionTime: typeof window.formStartTime !== "undefined" ? ((performance.now() - window.formStartTime) / 1000).toFixed(2) : null
	};

	let history = [];
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			history = JSON.parse(stored);
		} catch (e) {
			console.warn("⚠️ Failed to parse stored history. Resetting.");
			history = [];
		}
	}

	const exists = history.some(h =>
		h.firstName === entry.firstName &&
		h.lastName === entry.lastName &&
		h.state === entry.state
	);

	if (!exists) {
		history.unshift(entry);
		if (history.length > 8) history.pop();
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
		if (DEBUG_FUNNEL) console.log("✅ Intent-tracking entry saved:", entry);
	} else {
		if (DEBUG_FUNNEL) console.log("⚠️ Duplicate entry skipped");
	}
}

// Bootstrap helper
function initializeFunnelTracking() {
	// No longer stores funnel ID globally
	if (DEBUG_FUNNEL) console.log("🚀 Funnel tracking initialized");
}