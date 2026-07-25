/**
 * T1000 CGM Watchface - PebbleKit JS
 *
 * Handles LibreLinkUp authentication, data fetching, and smart polling.
 * Keeps the original watch-side message format so the existing UI remains unchanged.
 */

// Import Clay for configuration
var Clay = require("pebble-clay");
var clayConfig = require("./config");
var clay = new Clay(clayConfig, null, { autoHandleEvents: false });

// AppMessage keys (must match appinfo.json and main.c)
var KEY_CGM_VALUE = 0;
var KEY_CGM_DELTA = 1;
var KEY_CGM_TREND = 2;
var KEY_CGM_TIME_AGO = 3;
var KEY_CGM_HISTORY = 4;
var KEY_CGM_ALERT = 5;
var KEY_REQUEST_DATA = 6;
var KEY_LOW_THRESHOLD = 7;
var KEY_HIGH_THRESHOLD = 8;
var KEY_NEEDS_SETUP = 9;
var KEY_REVERSED = 10;
var KEY_SYNC_ERROR = 11;
var KEY_MEAL_DATA = 12;

// LibreLinkUp API endpoints
var LIBRE_URLS = {
	europe: "https://api-eu.libreview.io",
	germany: "https://api-de.libreview.io",
	france: "https://api-fr.libreview.io",
	us: "https://api-us.libreview.io",
	global: "https://api.libreview.io"
};

// LibreLinkUp client identity. Abbott may require updates when the official app changes.
var LIBRE_PRODUCT = "llu.ios";
var LIBRE_VERSION = "4.16.0";

// Internal trend direction mapping used by the Pebble watch
var TREND_DIRECTIONS = {
	None: 0,
	DoubleUp: 1,
	SingleUp: 2,
	FortyFiveUp: 3,
	Flat: 4,
	FortyFiveDown: 5,
	SingleDown: 6,
	DoubleDown: 7,
	"NOT COMPUTABLE": 0,
	"RATE OUT OF RANGE": 0
};

// State
var authToken = null;
var accountId = null;
var patientId = null;
var lastGoodReadingTime = null;
var pollTimer = null;
var settings = {
	accountName: "",
	password: "",
	server: "europe",
	unit: "mgdl",
	reversed: false,
	highThreshold: 180,
	lowThreshold: 70,
	vibeLowSoonEnabled: false,
	vibeLowSoonThreshold: 80,
	vibeLowSoonRepeatMinutes: 30,
	vibeEnabled: false,
	vibeHighThreshold: 250,
	vibeDelayMinutes: 60,
	vibeRepeatMinutes: 60,
	saltieApiToken: ""
};

// Vibration state (persisted to localStorage to survive app restarts)
var vibeHighConditionStartTime = null;
var lastHighVibeTime = null;
var lastLowSoonVibeTime = null;

/**
 * Load persisted vibration state from localStorage
 */
function loadVibeState() {
	var stored = localStorage.getItem("vibe-state");
	if (stored) {
		try {
			var parsed = JSON.parse(stored);
			vibeHighConditionStartTime = parsed.vibeHighConditionStartTime || null;
			lastHighVibeTime = parsed.lastHighVibeTime || null;
			lastLowSoonVibeTime = parsed.lastLowSoonVibeTime || null;
			console.log(
				"Vibe state loaded: highStart=" +
					vibeHighConditionStartTime +
					", lastHigh=" +
					lastHighVibeTime +
					", lastLowSoon=" +
					lastLowSoonVibeTime
			);
		} catch (e) {
			console.log("Error parsing vibe state: " + e);
		}
	}
}

/**
 * Save vibration state to localStorage
 */
function saveVibeState() {
	var state = {
		vibeHighConditionStartTime: vibeHighConditionStartTime,
		lastHighVibeTime: lastHighVibeTime,
		lastLowSoonVibeTime: lastLowSoonVibeTime
	};
	localStorage.setItem("vibe-state", JSON.stringify(state));
}

/**
 * Cache CGM readings to localStorage
 */
function cacheReadings(readings) {
	if (!readings || readings.length === 0) {
		return;
	}
	var cache = {
		readings: readings,
		cachedAt: Date.now()
	};
	localStorage.setItem("cgm-cache", JSON.stringify(cache));
	console.log("Cached " + readings.length + " readings");
}

/**
 * Get cached readings if still valid (latest reading is less than 5 minutes old)
 * Returns null if cache is invalid or stale
 */
function getCachedReadings() {
	var stored = localStorage.getItem("cgm-cache");
	if (!stored) {
		return null;
	}

	try {
		var cache = JSON.parse(stored);
		if (!cache.readings || cache.readings.length === 0) {
			return null;
		}

		// Check if the latest reading's timestamp is less than 5 minutes old
		var latestTimestamp = parseReadingTimestamp(cache.readings[0].WT);
		if (!latestTimestamp) {
			return null;
		}

		var now = Date.now();
		var ageMs = now - latestTimestamp;
		var ageMinutes = ageMs / 60000;

		if (ageMinutes < 5) {
			console.log("Using cached readings (latest is " + ageMinutes.toFixed(1) + " min old)");
			return cache.readings;
		} else {
			console.log("Cache stale (latest is " + ageMinutes.toFixed(1) + " min old)");
			return null;
		}
	} catch (e) {
		console.log("Error parsing CGM cache: " + e);
		return null;
	}
}

// Alert types to send to watch
var ALERT_NONE = 0;
var ALERT_LOW_SOON = 1;
var ALERT_HIGH = 2;
var pendingAlert = ALERT_NONE;

/**
 * Load settings from localStorage (Clay format)
 */
function loadSettings() {
	console.log("loadSettings() called");
	var stored = localStorage.getItem("clay-settings");
	console.log("Stored Clay settings found: " + (stored ? "yes" : "no"));
	if (stored) {
		try {
			var parsed = JSON.parse(stored);
			console.log("Parsed settings keys: " + Object.keys(parsed).join(", "));
			for (var key in parsed) {
				if (settings.hasOwnProperty(key) && parsed[key] !== undefined) {
					settings[key] = parsed[key];
				}
			}
			console.log("Settings loaded - accountName: " + (settings.accountName ? "[set]" : "[empty]"));
		} catch (e) {
			console.log("Error parsing settings: " + e);
		}
	} else {
		console.log("No clay-settings found in localStorage");
	}
}

/**
 * Save settings to localStorage (Clay format)
 */
function saveSettings() {
	localStorage.setItem("clay-settings", JSON.stringify(settings));
}

/**
 * Get the currently active LibreLinkUp API base URL.
 * Authentication always starts on the global server, which may redirect
 * the account to its correct regional server.
 */
function getLibreBaseUrl() {
	return LIBRE_URLS[settings.server] || LIBRE_URLS.europe;
}

/**
 * Convert a LibreLinkUp region code to its API server.
 */
function getLibreRegionalUrl(region) {
	if (!region) {
		return null;
	}

	var code = String(region).toLowerCase();

	// LibreLinkUp currently uses hosts such as api-eu, api-de and api-us.
	return "https://api-" + code + ".libreview.io";
}

/**
 * Convert mg/dL to mmol/L
 */
function mgdlToMmol(mgdl) {
	return (mgdl / 18.0182).toFixed(1);
}

/**
 * Format glucose value based on unit setting
 */
function formatGlucose(mgdl) {
	if (mgdl < 40) {
		return "LOW";
	}
	if (mgdl > 400) {
		return "HIGH";
	}
	if (settings.unit === "mmol") {
		return mgdlToMmol(mgdl);
	}
	return mgdl.toString();
}

/**
 * Format delta value based on unit setting
 */
function formatDelta(deltaMgdl) {
	var formatted;
	if (settings.unit === "mmol") {
		formatted = (deltaMgdl / 18.0182).toFixed(1);
	} else {
		formatted = Math.round(deltaMgdl).toString();
	}
	if (deltaMgdl >= 0) {
		return "+" + formatted;
	}
	return formatted;
}

/**
 * Make HTTP request with promise
 */
function httpRequest(method, url, body, headers) {
	return new Promise(function (resolve, reject) {
		var xhr = new XMLHttpRequest();
		xhr.open(method, url, true);

		// Set headers
		xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		xhr.setRequestHeader("Accept", "application/json");
		xhr.setRequestHeader(
			"User-Agent",
			"Mozilla/5.0 (iPhone; CPU OS 17_4_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/17.4.1 Mobile/10A5355d Safari/8536.25"
		);

		if (headers) {
			for (var key in headers) {
				xhr.setRequestHeader(key, headers[key]);
			}
		}

		xhr.onload = function () {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					var response = JSON.parse(xhr.responseText);
					resolve(response);
				} catch (e) {
					// Response might be a plain string (like session ID)
					resolve(xhr.responseText.replace(/"/g, ""));
				}
			} else {
				reject(new Error("HTTP " + xhr.status + ": " + xhr.statusText));
			}
		};

		xhr.onerror = function () {
			reject(new Error("Network error"));
		};

		xhr.ontimeout = function () {
			reject(new Error("Request timeout"));
		};

		xhr.timeout = 30000; // 30 second timeout

		if (body) {
			xhr.send(JSON.stringify(body));
		} else {
			xhr.send();
		}
	});
}


/**
 * SHA-256 for LibreLinkUp's account-id header.
 * Returns a lowercase hexadecimal digest.
 */
function sha256Ascii(value) {
	function rightRotate(number, amount) {
		return (number >>> amount) | (number << (32 - amount));
	}

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = "length";
	var i;
	var j;
	var result = "";
	var words = [];
	var asciiBitLength = value[lengthProperty] * 8;
	var hash = sha256Ascii.h = sha256Ascii.h || [];
	var k = sha256Ascii.k = sha256Ascii.k || [];
	var primeCounter = k[lengthProperty];
	var isComposite = {};

	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
			k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
		}
	}

	value += "\x80";
	while (value[lengthProperty] % 64 - 56) {
		value += "\x00";
	}

	for (i = 0; i < value[lengthProperty]; i++) {
		j = value.charCodeAt(i);
		if (j >> 8) {
			throw new Error("sha256Ascii only supports ASCII input");
		}
		words[i >> 2] |= j << (((3 - i) % 4) * 8);
	}

	words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
	words[words[lengthProperty]] = asciiBitLength;

	for (j = 0; j < words[lengthProperty];) {
		var w = words.slice(j, j += 16);
		var oldHash = hash.slice(0);
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var w15 = w[i - 15];
			var w2 = w[i - 2];
			var a = hash[0];
			var e = hash[4];
			var temp1 =
				hash[7] +
				(rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
				((e & hash[5]) ^ (~e & hash[6])) +
				k[i] +
				(w[i] =
					i < 16
						? w[i]
						: (
							w[i - 16] +
							(rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
							w[i - 7] +
							(rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
						) | 0);
			var temp2 =
				(rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
				((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

			hash = [(temp1 + temp2) | 0].concat(hash);
			hash[4] = (hash[4] + temp1) | 0;
			hash.pop();
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i]) | 0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var byte = (hash[i] >> (j * 8)) & 255;
			result += (byte < 16 ? "0" : "") + byte.toString(16);
		}
	}

	return result;
}

/**
 * Common LibreLinkUp request headers
 */
function getLibreHeaders(includeAuth) {
	var headers = {
		product: LIBRE_PRODUCT,
		version: LIBRE_VERSION,
		"account-id": accountId || ""
	};

	if (includeAuth && authToken) {
		headers.authorization = "Bearer " + authToken;
	}

	return headers;
}

/**
 * Authenticate with LibreLinkUp.
 *
 * Login starts on api.libreview.io. If LibreLinkUp returns a region
 * redirect, the login is repeated once on the correct regional server.
 */
function libreLogin(redirectHandled) {
	var url = getLibreBaseUrl() + "/llu/auth/login";

	console.log("Logging in to LibreLinkUp at " + getLibreBaseUrl() + "...");

	return httpRequest(
		"POST",
		url,
		{
			email: settings.accountName,
			password: settings.password
		},
		getLibreHeaders(false)
	).then(function (response) {
		console.log(
			"LibreLinkUp login response: status=" +
				(response && response.status !== undefined ? response.status : "missing") +
				", hasAuthTicket=" +
				!!(response && response.data && response.data.authTicket)
		);

		if (
			response &&
			response.status === 0 &&
			response.data &&
			response.data.redirect &&
			response.data.region
		) {
			if (redirectHandled) {
				throw new Error("LibreLinkUp returned repeated region redirect");
			}

			var regionalUrl = getLibreRegionalUrl(response.data.region);
			if (!regionalUrl) {
				throw new Error(
					"Unknown LibreLinkUp region: " + response.data.region
				);
			}

			console.log(
				"LibreLinkUp redirected account to region " +
					response.data.region +
					" (" +
					regionalUrl +
					")"
			);

			var regionCode = String(response.data.region).toLowerCase();
			if (LIBRE_URLS[regionCode]) {
				settings.server = regionCode;
				saveSettings();
				return libreLogin(true);
			}

			throw new Error(
				"Unsupported LibreLinkUp region: " + response.data.region
			);
		}

		if (
			!response ||
			response.status !== 0 ||
			!response.data ||
			!response.data.authTicket
		) {
			var message =
				response &&
				response.error &&
				response.error.message
					? response.error.message
					: "unknown error";

			throw new Error(
				"LibreLinkUp login rejected: " + message
			);
		}

		authToken = response.data.authTicket.token;
		accountId =
			response.data.user && response.data.user.id
				? sha256Ascii(response.data.user.id)
				: null;
		patientId = null;

		if (!authToken) {
			throw new Error(
				"LibreLinkUp returned no authentication token"
			);
		}

		if (!accountId) {
			throw new Error(
				"LibreLinkUp returned no account ID"
			);
		}

		console.log(
			"LibreLinkUp login successful at " + getLibreBaseUrl()
		);
		return authToken;
	});
}

/**
 * Get the LibreLinkUp connection and patient ID.
 */
function libreFetchConnections() {
	if (!authToken) {
		return Promise.reject(new Error("Not logged in"));
	}

	var url = getLibreBaseUrl() + "/llu/connections";

	return httpRequest("GET", url, null, getLibreHeaders(true)).then(function (response) {
		if (!response || response.status !== 0 || !response.data || response.data.length === 0) {
			throw new Error("No LibreLinkUp connection found");
		}

		patientId = response.data[0].patientId;

		if (!patientId) {
			throw new Error("LibreLinkUp returned no patient ID");
		}

		return patientId;
	});
}

/**
 * Convert LibreLinkUp's numeric trend arrow to the names expected by
 * the existing watchface code.
 */
function mapLibreTrend(trendArrow) {
	switch (Number(trendArrow)) {
		case 1:
			return "DoubleDown";
		case 2:
			return "SingleDown";
		case 3:
			return "Flat";
		case 4:
			return "SingleUp";
		case 5:
			return "DoubleUp";
		default:
			return "None";
	}
}

/**
 * Parse LibreLinkUp timestamps.
 */
function parseLibreTimestamp(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "number") {
		return value < 100000000000 ? value * 1000 : value;
	}

	var text = String(value);
	var nativeTimestamp = Date.parse(text);
	if (!isNaN(nativeTimestamp)) {
		return nativeTimestamp;
	}

	var match = text.match(
		/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i
	);
	if (!match) {
		return null;
	}

	var month = parseInt(match[1], 10) - 1;
	var day = parseInt(match[2], 10);
	var year = parseInt(match[3], 10);
	var hour = parseInt(match[4], 10);
	var minute = parseInt(match[5], 10);
	var second = parseInt(match[6], 10);
	var ampm = match[7] ? match[7].toUpperCase() : null;

	if (ampm === "PM" && hour < 12) hour += 12;
	if (ampm === "AM" && hour === 12) hour = 0;

	return new Date(year, month, day, hour, minute, second).getTime();
}


/**
 * LibreLinkUp FactoryTimestamp is UTC even when no timezone suffix is present.
 */
function parseLibreFactoryTimestamp(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "number") {
		return value < 100000000000 ? value * 1000 : value;
	}

	var text = String(value).trim();

	// ISO timestamp without timezone: force UTC by appending Z.
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) {
		var isoTimestamp = Date.parse(text + "Z");
		return isNaN(isoTimestamp) ? null : isoTimestamp;
	}

	// LibreLinkUp's common M/D/YYYY H:MM:SS [AM|PM] format, interpreted as UTC.
	var match = text.match(
		/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i
	);
	if (match) {
		var month = parseInt(match[1], 10) - 1;
		var day = parseInt(match[2], 10);
		var year = parseInt(match[3], 10);
		var hour = parseInt(match[4], 10);
		var minute = parseInt(match[5], 10);
		var second = parseInt(match[6], 10);
		var ampm = match[7] ? match[7].toUpperCase() : null;

		if (ampm === "PM" && hour < 12) hour += 12;
		if (ampm === "AM" && hour === 12) hour = 0;

		return Date.UTC(year, month, day, hour, minute, second);
	}

	// Already includes an explicit timezone.
	var parsed = Date.parse(text);
	return isNaN(parsed) ? null : parsed;
}


/**
 * Normalize LibreLinkUp readings to the original internal Dexcom-like shape.
 */
function normalizeLibreReadings(graphResponse) {
	if (!graphResponse || graphResponse.status !== 0 || !graphResponse.data) {
		throw new Error("Invalid LibreLinkUp graph response");
	}

	var data = graphResponse.data;
	var source = [];

	if (data.graphData && data.graphData.length) {
		source = source.concat(data.graphData);
	}

	var current =
		data.connection &&
		(data.connection.glucoseMeasurement || data.connection.glucoseItem);

	if (current) {
		source.push(current);
	}

	var seen = {};
	var normalized = [];

	source.forEach(function (reading) {
		var value = Number(
			reading.ValueInMgPerDl !== undefined ? reading.ValueInMgPerDl : reading.Value
		);
		var timestamp = reading.FactoryTimestamp
			? parseLibreFactoryTimestamp(reading.FactoryTimestamp)
			: parseLibreTimestamp(reading.Timestamp);

		if (!isFinite(value) || !timestamp) {
			return;
		}

		var key = timestamp + ":" + value;
		if (seen[key]) {
			return;
		}
		seen[key] = true;

		normalized.push({
			Value: Math.round(value),
			WT: "/Date(" + timestamp + ")/",
			Trend: mapLibreTrend(reading.TrendArrow)
		});
	});

	normalized.sort(function (a, b) {
		return parseReadingTimestamp(b.WT) - parseReadingTimestamp(a.WT);
	});

	return normalized.slice(0, 26);
}

/**
 * Fetch and normalize glucose readings from LibreLinkUp.
 */
function libreFetchReadings() {
	if (!authToken) {
		return Promise.reject(new Error("Not logged in"));
	}

	var ensurePatient = patientId
		? Promise.resolve(patientId)
		: libreFetchConnections();

	return ensurePatient
		.then(function (id) {
			var url =
				getLibreBaseUrl() +
				"/llu/connections/" +
				encodeURIComponent(id) +
				"/graph";

			console.log("Fetching LibreLinkUp glucose readings...");
			return httpRequest("GET", url, null, getLibreHeaders(true));
		})
		.then(normalizeLibreReadings);
}

/**
 * Parse the normalized internal timestamp.
 * Format: "/Date(1234567890000)/"
 */
function parseReadingTimestamp(dtString) {
	if (!dtString) {
		return null;
	}

	var match = String(dtString).match(/Date\((\d+)\)/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return null;
}

/**
 * Get meal data string for today's meals within the chart timeframe (last 120 minutes or next 20 minutes)
 * Format: "carbs:minutesAgo,carbs:minutesAgo,..." (e.g., "35:30,42:-10")
 * Negative minutesAgo means future meal
 */
function getMealDataString() {
	var stored = localStorage.getItem("saltie-meals");
	if (!stored) {
		return "";
	}

	try {
		var meals = JSON.parse(stored);
		if (!meals || meals.length === 0) {
			return "";
		}

		var now = Date.now();
		var mealStrings = [];

		for (var i = 0; i < meals.length; i++) {
			var meal = meals[i];
			if (!meal.eaten_at || !meal.carbs_counted) {
				continue;
			}

			// Parse meal timestamp
			var mealTime = new Date(meal.eaten_at).getTime();
			var minutesAgo = Math.round((now - mealTime) / 60000);

			// Include meals from the last 120 minutes OR upcoming meals in the next 20 minutes
			if ((minutesAgo >= 0 && minutesAgo <= 120) || (minutesAgo < 0 && minutesAgo >= -20)) {
				var carbs = Math.round(meal.carbs_counted);
				mealStrings.push(carbs + ":" + minutesAgo);
			}
		}

		return mealStrings.join(",");
	} catch (e) {
		console.log("Error parsing meal data: " + e);
		return "";
	}
}

/**
 * Process glucose readings and send to watch
 */
function processReadings(readings, fromCache) {
	if (!readings || readings.length === 0) {
		console.log("No readings received");
		sendError("No data");
		return;
	}

	// Cache fresh readings from the API
	if (!fromCache) {
		cacheReadings(readings);
	}

	console.log("Processing " + readings.length + " readings" + (fromCache ? " (from cache)" : ""));

	// Most recent reading
	var latest = readings[0];
	var latestValue = latest.Value;
	var latestTimestamp = parseReadingTimestamp(latest.WT);
	var latestTrendString = latest.Trend || "None";
	var latestTrend = TREND_DIRECTIONS[latestTrendString] || 0;

	// Handle numeric trend values from API
	if (typeof latestTrendString === "number") {
		latestTrend = latestTrendString > 7 ? 0 : latestTrendString;
	}

	// Calculate time ago
	var now = Date.now();
	var minutesAgo = Math.round((now - latestTimestamp) / 60000);

	// Calculate delta (difference from previous reading)
	var delta = 0;
	if (readings.length > 1) {
		var previousValue = readings[1].Value;
		var previousTimestamp = parseReadingTimestamp(readings[1].WT);
		var timeDiffMinutes = (latestTimestamp - previousTimestamp) / 60000;

		// Normalize to 5-minute rate
		if (timeDiffMinutes > 0) {
			delta = ((latestValue - previousValue) / timeDiffMinutes) * 5;
		}
	}

	// Build history string (value:minutesAgo pairs, most recent first)
	// Format: "120:0,125:5,130:10" where second number is minutes ago from now
	var history = readings
		.map(function (r) {
			var timestamp = parseReadingTimestamp(r.WT);
			var minutesAgo = Math.round((now - timestamp) / 60000);
			return r.Value + ":" + minutesAgo;
		})
		.join(",");

	// Update last good reading time for smart polling
	lastGoodReadingTime = latestTimestamp;

	// Check vibration conditions (sets pendingAlert if needed)
	pendingAlert = ALERT_NONE;
	checkLowSoonAlert(readings);
	checkVibrationAlert(latestValue);

	// Fetch fresh Saltie data if token is configured
	if (settings.saltieApiToken) {
		fetchSaltieData();
	}

	// Get meal data string
	var mealData = getMealDataString();

	// Send data to watch
	var message = {};
	message[KEY_CGM_VALUE] = formatGlucose(latestValue);
	message[KEY_CGM_DELTA] = formatDelta(delta);
	message[KEY_CGM_TREND] = latestTrend;
	message[KEY_CGM_TIME_AGO] = minutesAgo;
	message[KEY_CGM_HISTORY] = history;
	message[KEY_CGM_ALERT] = pendingAlert;
	message[KEY_LOW_THRESHOLD] = settings.lowThreshold;
	message[KEY_HIGH_THRESHOLD] = settings.highThreshold;
	message[KEY_REVERSED] = settings.reversed ? 1 : 0;
	message[KEY_NEEDS_SETUP] = 0;
	message[KEY_SYNC_ERROR] = 0; // Success - no sync error
	message[KEY_MEAL_DATA] = mealData;

	console.log(
		"Sending: value=" +
			latestValue +
			" (" +
			formatGlucose(latestValue) +
			"), " +
			"delta=" +
			formatDelta(delta) +
			", trend=" +
			latestTrend +
			", " +
			"ago=" +
			minutesAgo +
			"min, history=" +
			readings.length +
			" points, meals=" +
			mealData
	);

	Pebble.sendAppMessage(
		message,
		function () {
			console.log("Data sent to watch");
		},
		function (e) {
			console.log("Error sending data: " + JSON.stringify(e));
		}
	);

	// Schedule next poll
	scheduleNextPoll();
}

/**
 * Calculate weighted average velocity from recent readings
 * Uses multiple time spans with heavier weighting on recent changes
 * Returns velocity in mg/dL per 5 minutes, or null if insufficient data or gaps detected
 */
function calculateVelocity(readings) {
	// Need at least 5 readings to calculate velocity
	if (!readings || readings.length < 5) {
		return null;
	}

	// Check that the first 5 values are valid (non-zero) and have no gaps
	// Each reading should be ~5 minutes apart; allow up to 7 minutes to account for slight delays
	var maxGapMs = 7 * 60 * 1000; // 7 minutes in milliseconds
	for (var i = 0; i < 5; i++) {
		if (!readings[i] || readings[i].Value === 0) {
			return null;
		}
		// Check gap between consecutive readings (except for the last one)
		if (i < 4) {
			var thisTime = parseReadingTimestamp(readings[i].WT);
			var nextTime = parseReadingTimestamp(readings[i + 1].WT);
			if (!thisTime || !nextTime) {
				return null;
			}
			var gap = thisTime - nextTime; // readings are most-recent-first
			if (gap > maxGapMs) {
				console.log(
					"Velocity calculation skipped: gap of " +
						Math.round(gap / 60000) +
						" min between readings " +
						i +
						" and " +
						(i + 1)
				);
				return null;
			}
		}
	}

	var bg0 = readings[0].Value;
	var bg1 = readings[1].Value;
	var bg2 = readings[2].Value;
	var bg3 = readings[3].Value;
	var bg4 = readings[4].Value;

	// Weigh newer values more heavily
	var w1 = 0.29;
	var w2 = 0.27;
	var w3 = 0.23;
	var w4 = 0.21;

	// Calculate velocities over different time spans (per 5-minute interval)
	var vel1 = bg0 - bg1; // 5-minute change
	var vel2 = (bg0 - bg2) / 2.0; // 10-minute change, normalized to 5-min
	var vel3 = (bg0 - bg3) / 3.0; // 15-minute change, normalized to 5-min
	var vel4 = (bg0 - bg4) / 4.0; // 20-minute change, normalized to 5-min

	// Calculate the weighted average velocity
	var velocity = vel1 * w1 + vel2 * w2 + vel3 * w3 + vel4 * w4;

	console.log("Weighted average velocity: " + velocity.toFixed(1) + " mg/dL per 5min");

	return velocity;
}

/**
 * Check if "low soon" alert should trigger based on predicted value in 20 minutes
 * Uses weighted average velocity from recent readings for smoother prediction
 */
function checkLowSoonAlert(readings) {
	if (!settings.vibeLowSoonEnabled) {
		return;
	}

	var velocity = calculateVelocity(readings);
	if (velocity === null) {
		console.log("Low soon alert: insufficient data for velocity calculation");
		return;
	}

	var currentValue = readings[0].Value;
	// velocity is per 5 minutes, so multiply by 4 to get 20-minute prediction
	var predictedValue = currentValue + velocity * 4;
	var isLowSoon = predictedValue < settings.vibeLowSoonThreshold;
	var now = Date.now();

	if (isLowSoon) {
		// Check if we should vibrate (first time or repeat interval passed)
		var shouldVibe = false;
		if (!lastLowSoonVibeTime) {
			shouldVibe = true;
		} else {
			var timeSinceVibe = (now - lastLowSoonVibeTime) / 60000; // minutes
			if (timeSinceVibe >= settings.vibeLowSoonRepeatMinutes) {
				shouldVibe = true;
			}
		}

		if (shouldVibe) {
			console.log(
				"Triggering low soon alert vibration (current: " +
					currentValue +
					", predicted: " +
					Math.round(predictedValue) +
					" in 20min)"
			);
			pendingAlert = ALERT_LOW_SOON;
			lastLowSoonVibeTime = now;
			saveVibeState();
		}
	}
	// Note: We intentionally do NOT reset lastLowSoonVibeTime when the condition clears.
	// This ensures that if the user briefly rises above the threshold and then falls back,
	// they won't get repeated alerts within the repeat interval.
}

/**
 * Check if vibration alert should trigger
 */
function checkVibrationAlert(value) {
	if (!settings.vibeEnabled) {
		return;
	}

	var isHighAlert = value >= settings.vibeHighThreshold;
	var now = Date.now();

	if (isHighAlert) {
		// Start tracking condition if not already
		if (!vibeHighConditionStartTime) {
			vibeHighConditionStartTime = now;
		}

		var conditionDuration = (now - vibeHighConditionStartTime) / 60000; // minutes

		// Check if delay has passed
		if (conditionDuration >= settings.vibeDelayMinutes) {
			// Check if we should vibrate (first time or repeat interval passed)
			var shouldVibe = false;
			if (!lastHighVibeTime) {
				shouldVibe = true;
			} else {
				var timeSinceVibe = (now - lastHighVibeTime) / 60000; // minutes
				if (timeSinceVibe >= settings.vibeRepeatMinutes) {
					shouldVibe = true;
				}
			}

			if (shouldVibe) {
				console.log("Triggering high alert vibration");
				pendingAlert = ALERT_HIGH;
				lastHighVibeTime = now;
				saveVibeState();
			}
		}
	} else {
		// Reset condition start time when condition clears (so delay timer restarts)
		// but keep lastHighVibeTime to prevent repeated alerts within repeat interval
		if (vibeHighConditionStartTime !== null) {
			vibeHighConditionStartTime = null;
			saveVibeState();
		}
	}
}

/**
 * Send error message to watch
 */
function sendError(errorText, needsSetup) {
	var message = {};
	message[KEY_CGM_VALUE] = "";
	message[KEY_CGM_DELTA] = "";
	message[KEY_CGM_TREND] = 255; // Special value: hide trend icon
	message[KEY_CGM_TIME_AGO] = 0;
	message[KEY_NEEDS_SETUP] = needsSetup ? 1 : 0;
	// Signal sync error unless this is just a setup issue
	message[KEY_SYNC_ERROR] = needsSetup ? 0 : 1;

	Pebble.sendAppMessage(
		message,
		function () {
			console.log("Error sent to watch", errorText);
		},
		function (e) {
			console.log("Failed to send error: " + JSON.stringify(e));
		}
	);
}

/**
 * Main fetch function - authenticate if needed, then fetch data
 */
function fetchData() {
	if (!settings.accountName || !settings.password) {
		console.log("No credentials configured");
		sendError("Setup", true);
		return;
	}

	// If we have a session, try to fetch directly
	if (authToken) {
		libreFetchReadings()
			.then(processReadings)
			.catch(function (error) {
				console.log("Fetch failed, re-authenticating: " + error.message);
				// Session might be expired, try re-auth
				authToken = null;
				accountId = null;
				patientId = null;
				libreLogin()
					.then(libreFetchReadings)
					.then(processReadings)
					.catch(function (error) {
						console.log("Re-auth failed: " + error.message);
						sendError("Auth err");
					});
			});
	} else {
		// Need to login first
		libreLogin()
			.then(libreFetchReadings)
			.then(processReadings)
			.catch(function (error) {
				console.log("Login/fetch failed: " + error.message);
				if (error.message.indexOf("401") >= 0 || error.message.indexOf("500") >= 0) {
					sendError("Auth err");
				} else {
					sendError("Net err");
				}
			});
	}
}

/**
 * Fetch Saltie meal data
 */
function fetchSaltieData() {
	if (!settings.saltieApiToken) {
		console.log("No Saltie API token configured");
		return;
	}

	console.log("Fetching Saltie meal data...");

	httpRequest("GET", "https://api.saltie.app/api/v1/meals/today", null, {
		"api-token": settings.saltieApiToken
	})
		.then(function (data) {
			console.log("Saltie data received: " + JSON.stringify(data));
			// Store the meal data for future use
			localStorage.setItem("saltie-meals", JSON.stringify(data));
		})
		.catch(function (error) {
			console.log("Saltie API error: " + error.message);
		});
}

/**
 * Schedule the next LibreLinkUp poll at a fixed interval.
 * 150 seconds = 2 minutes 30 seconds.
 */
function scheduleNextPoll() {
	if (pollTimer) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}

	console.log("Next poll in 300s");
	pollTimer = setTimeout(fetchData, 300 * 1000);
}

/**
 * Handle configuration page (Clay)
 */
Pebble.addEventListener("showConfiguration", function (e) {
	console.log("Showing configuration");
	// Pass current settings to Clay so the form shows saved values
	var claySettings = {
		accountName: settings.accountName,
		password: settings.password,
		server: settings.server,
		unit: settings.unit,
		reversed: settings.reversed,
		lowThreshold: settings.lowThreshold,
		highThreshold: settings.highThreshold,
		vibeLowSoonEnabled: settings.vibeLowSoonEnabled,
		vibeLowSoonThreshold: settings.vibeLowSoonThreshold,
		vibeLowSoonRepeatMinutes: settings.vibeLowSoonRepeatMinutes,
		vibeEnabled: settings.vibeEnabled,
		vibeHighThreshold: settings.vibeHighThreshold,
		vibeDelayMinutes: settings.vibeDelayMinutes,
		vibeRepeatMinutes: settings.vibeRepeatMinutes,
		saltieApiToken: settings.saltieApiToken
	};

	Pebble.openURL(clay.generateUrl(claySettings));
});

/**
 * Handle configuration response (Clay)
 */
Pebble.addEventListener("webviewclosed", function (e) {
	console.log("Configuration closed");

	if (e && !e.response) {
		return;
	}

	var dict;

	try {
		dict = JSON.parse(e.response);
	} catch (e) {
		throw new Error("The provided response was not valid JSON");
	}

	// Update local settings from Clay response
	if (dict.accountName !== undefined) settings.accountName = dict.accountName.value || "";
	if (dict.password !== undefined) settings.password = dict.password.value || "";
	if (dict.server !== undefined) settings.server = dict.server.value || "europe";
	if (dict.unit !== undefined) settings.unit = dict.unit.value || "mgdl";
	if (dict.reversed !== undefined) settings.reversed = !!dict.reversed.value;
	if (dict.highThreshold !== undefined) settings.highThreshold = parseInt(dict.highThreshold.value, 10) || 180;
	if (dict.lowThreshold !== undefined) settings.lowThreshold = parseInt(dict.lowThreshold.value, 10) || 70;
	if (dict.vibeLowSoonEnabled !== undefined) settings.vibeLowSoonEnabled = !!dict.vibeLowSoonEnabled.value;
	if (dict.vibeLowSoonThreshold !== undefined)
		settings.vibeLowSoonThreshold = parseInt(dict.vibeLowSoonThreshold.value, 10) || 80;
	if (dict.vibeLowSoonRepeatMinutes !== undefined)
		settings.vibeLowSoonRepeatMinutes = parseInt(dict.vibeLowSoonRepeatMinutes.value, 10) || 30;
	if (dict.vibeEnabled !== undefined) settings.vibeEnabled = !!dict.vibeEnabled.value;
	if (dict.vibeHighThreshold !== undefined)
		settings.vibeHighThreshold = parseInt(dict.vibeHighThreshold.value, 10) || 250;
	if (dict.vibeDelayMinutes !== undefined) settings.vibeDelayMinutes = parseInt(dict.vibeDelayMinutes.value, 10) || 60;
	if (dict.vibeRepeatMinutes !== undefined)
		settings.vibeRepeatMinutes = parseInt(dict.vibeRepeatMinutes.value, 10) || 60;
	if (dict.saltieApiToken !== undefined) settings.saltieApiToken = dict.saltieApiToken.value || "";

	saveSettings();

	// Reset session on credential change
	authToken = null;
	accountId = null;
	patientId = null;

	// Fetch data with new settings
	fetchData();
});

/**
 * Handle ready event
 */
Pebble.addEventListener("ready", function () {
	console.log("LibreLinkUp PebbleKit JS ready");
	loadSettings();
	loadVibeState();
	fetchData();
});

/**
 * Handle app message from watch
 */
Pebble.addEventListener("appmessage", function (e) {
	console.log("Received message from watch");

	if (e.payload[KEY_REQUEST_DATA]) {
		console.log("Watch requested data update");
		fetchData();
	}
});
