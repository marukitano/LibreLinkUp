/**
 * OpenLibreLinkUp Watchface - PebbleKit JS
 *
 * Handles LibreLinkUp authentication, data fetching, and smart polling.
 * Keeps the original watch-side message format so the existing UI remains unchanged.
 */

// Import Clay for configuration
var Clay = require("pebble-clay");
var clayConfig = require("./config");

function customClay(minified) {
	var clayConfigPage = this;

	clayConfigPage.on(
		clayConfigPage.EVENTS.AFTER_BUILD,
		function () {
			var accountButton =
				clayConfigPage.getItemById("toggle-account-settings");
			var accountItems =
				clayConfigPage.getItemsByGroup("account-settings");
			var accountSettingsVisible = false;

			function updateAccountSettingsVisibility() {
				for (var i = 0; i < accountItems.length; i++) {
					if (accountSettingsVisible) {
						accountItems[i].show();
					} else {
						accountItems[i].hide();
					}
				}

				if (accountButton) {
					accountButton.set(
						accountSettingsVisible
							? "Hide Account Settings"
							: "Show Account Settings"
					);
				}
			}

			updateAccountSettingsVisibility();

			if (accountButton) {
				accountButton.on("click", function () {
					accountSettingsVisible =
						!accountSettingsVisible;
					updateAccountSettingsVisibility();
				});
			}

			var unitItem =
				clayConfigPage.getItemByMessageKey("unit");
			var mmolThresholdItems =
				clayConfigPage.getItemsByGroup("threshold-unit-mmol");
			var mgdlThresholdItems =
				clayConfigPage.getItemsByGroup("threshold-unit-mgdl");
			var activeThresholdUnit =
				unitItem && unitItem.get() === "mgdl"
					? "mgdl"
					: "mmol";

			var thresholdPairs = [
				["lowThresholdMmol", "lowThresholdMgdl"],
				["highThresholdMmol", "highThresholdMgdl"],
				[
					"lowAlarmThresholdMmol",
					"lowAlarmThresholdMgdl"
				],
				[
					"highAlarmThresholdMmol",
					"highAlarmThresholdMgdl"
				]
			];

			function setThresholdGroupVisible(items, visible) {
				for (var i = 0; i < items.length; i++) {
					if (visible) {
						items[i].show();
					} else {
						items[i].hide();
					}
				}
			}

			function updateThresholdUnitVisibility() {
				setThresholdGroupVisible(
					mmolThresholdItems,
					activeThresholdUnit === "mmol"
				);
				setThresholdGroupVisible(
					mgdlThresholdItems,
					activeThresholdUnit === "mgdl"
				);
			}

			function convertThresholdValue(
				value,
				fromUnit,
				toUnit
			) {
				var parsed = parseFloat(value);

				if (!isFinite(parsed) || fromUnit === toUnit) {
					return value;
				}

				if (fromUnit === "mmol") {
					return String(Math.round(parsed * 18.0182));
				}

				return (parsed / 18.0182).toFixed(1);
			}

			function syncThresholdValues(fromUnit, toUnit) {
				for (var i = 0; i < thresholdPairs.length; i++) {
					var mmolItem =
						clayConfigPage.getItemByMessageKey(
							thresholdPairs[i][0]
						);
					var mgdlItem =
						clayConfigPage.getItemByMessageKey(
							thresholdPairs[i][1]
						);
					var sourceItem =
						fromUnit === "mmol" ? mmolItem : mgdlItem;
					var targetItem =
						toUnit === "mmol" ? mmolItem : mgdlItem;

					if (!sourceItem || !targetItem) {
						continue;
					}

					targetItem.set(
						convertThresholdValue(
							sourceItem.get(),
							fromUnit,
							toUnit
						)
					);
				}
			}

			updateThresholdUnitVisibility();

			if (unitItem) {
				unitItem.on("change", function () {
					var selectedUnit =
						this.get() === "mgdl" ? "mgdl" : "mmol";

					if (selectedUnit !== activeThresholdUnit) {
						syncThresholdValues(
							activeThresholdUnit,
							selectedUnit
						);
						activeThresholdUnit = selectedUnit;
						updateThresholdUnitVisibility();
					}
				});
			}

			var restoreButton =
				clayConfigPage.getItemById("restore-defaults");

			if (!restoreButton) {
				return;
			}

			restoreButton.on("click", function () {
				if (
					typeof confirm === "function" &&
					!confirm(
						"Restore all watchface settings to their defaults? " +
						"LibreLinkUp account details will be kept."
					)
				) {
					return;
				}

				var defaults = {
					reversed: false,
					quickView: false,
					unit: "mmol",
					pollIntervalMinutes: 5,
					lowThresholdMmol: "4.4",
					highThresholdMmol: "10.0",
					lowThresholdMgdl: "80",
					highThresholdMgdl: "180",
					goodColor: 0x00AA55,
					warningColor: 0xFFAA00,
					alarmColor: 0xFF0000,
					acousticAlarmEnabled: false,
					lowAlarmThresholdMmol: "3.9",
					lowAlarmThresholdMgdl: "70",
					highAlarmThresholdMmol: "13.9",
					highAlarmThresholdMgdl: "250"
				};

				for (var key in defaults) {
					if (!defaults.hasOwnProperty(key)) {
						continue;
					}

					var item =
						clayConfigPage.getItemByMessageKey(key);
					if (item) {
						item.set(defaults[key]);
					}
				}

				if (typeof alert === "function") {
					alert(
						"Default settings restored. " +
						"Press Save Settings to apply them."
					);
				}
			});
		}
	);
}

var clay = new Clay(
	clayConfig,
	customClay,
	{ autoHandleEvents: false }
);

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
var KEY_GOOD_COLOR = 13;
var KEY_WARNING_COLOR = 14;
var KEY_ALARM_COLOR = 15;
var KEY_POLL_INTERVAL = 16;
var KEY_QUICK_VIEW = 17;
var KEY_LOW_ALARM_THRESHOLD = 18;
var KEY_HIGH_ALARM_THRESHOLD = 19;

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
	quickView: false,
	highThreshold: 180,
	lowThreshold: 80,
	acousticAlarmEnabled: false,
	lowAlarmThreshold: 70,
	highAlarmThreshold: 250,
	goodColor: "0x00AA55",
	warningColor: "0xFFAA00",
	alarmColor: "0xFF0000",
	pollIntervalMinutes: 5
};

// Timestamp of the newest reading already evaluated for an alarm.
var lastEvaluatedAlarmReadingTimestamp = null;

/**
 * Load the last reading timestamp that was evaluated for an alarm.
 * This prevents duplicate alarms when the same LibreLinkUp reading is fetched again.
 */
function loadAlarmState() {
	var stored =
		localStorage.getItem("last-alarm-reading-timestamp");

	if (stored) {
		var parsed = parseInt(stored, 10);
		if (isFinite(parsed)) {
			lastEvaluatedAlarmReadingTimestamp = parsed;
		}
	}

	// Remove obsolete prediction/delay/repeat state from older versions.
	localStorage.removeItem("vibe-state");
}

/**
 * Persist the last evaluated reading timestamp.
 */
function saveAlarmState() {
	if (lastEvaluatedAlarmReadingTimestamp === null) {
		localStorage.removeItem("last-alarm-reading-timestamp");
		return;
	}

	localStorage.setItem(
		"last-alarm-reading-timestamp",
		String(lastEvaluatedAlarmReadingTimestamp)
	);
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
var ALERT_LOW = 1;
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

			var migratedAlarmSettings = false;

			if (
				parsed.lowAlarmThreshold === undefined &&
				parsed.vibeLowSoonThreshold !== undefined
			) {
				settings.lowAlarmThreshold =
					parsed.vibeLowSoonThreshold;
				migratedAlarmSettings = true;
			}

			if (
				parsed.highAlarmThreshold === undefined &&
				parsed.vibeHighThreshold !== undefined
			) {
				settings.highAlarmThreshold =
					parsed.vibeHighThreshold;
				migratedAlarmSettings = true;
			}

			if (parsed.acousticAlarmEnabled === undefined) {
				settings.acousticAlarmEnabled =
					!!parsed.vibeLowSoonEnabled ||
					!!parsed.vibeEnabled;
				migratedAlarmSettings = true;
			}

			if (migratedAlarmSettings) {
				saveSettings();
				console.log("Migrated legacy alarm settings");
			}

			console.log("Settings loaded - accountName: " + (settings.accountName ? "[set]" : "[empty]"));
		} catch (e) {
			console.log("Error parsing settings: " + e);
		}
	} else {
		console.log("No clay-settings found in localStorage");
	}

	// Convert older numeric Clay color values to canonical 0xRRGGBB strings.
	normalizeColorSettings();
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
 * Convert a stored mg/dL threshold to the unit shown in settings.
 */
function thresholdForSettings(mgdl) {
	return Number((mgdl / 18.0182).toFixed(1));
}

/**
 * Convert a threshold entered in the selected unit back to internal mg/dL.
 */
function thresholdInputToMgdl(
	value,
	unit,
	fallbackMgdl
) {
	var parsed = parseFloat(value);

	if (!isFinite(parsed)) {
		return fallbackMgdl;
	}

	if (unit === "mgdl") {
		return Math.round(parsed);
	}

	return Math.round(parsed * 18.0182);
}

/**
 * Convert Clay color values to 24-bit RGB.
 *
 * Clay may return a color either as:
 * - a decimal number, for example 43605
 * - a decimal string, for example "43605"
 * - a hexadecimal string, for example "0x00AA55" or "#00AA55"
 *
 * Pure digit strings must be interpreted as decimal. Treating "43605" as
 * hexadecimal produces 0x043605, which becomes nearly black on Pebble.
 */
function colorToRgbInt(value, fallback) {
	var fallbackValue = fallback || "0xFFFFFF";

	if (typeof value === "number" && isFinite(value)) {
		return Math.round(value) & 0xFFFFFF;
	}

	var text = String(
		value !== undefined && value !== null && value !== ""
			? value
			: fallbackValue
	).trim();

	var parsed;

	if (/^0x[0-9a-f]+$/i.test(text)) {
		parsed = parseInt(text.substring(2), 16);
	} else if (/^#[0-9a-f]+$/i.test(text)) {
		parsed = parseInt(text.substring(1), 16);
	} else if (/^[0-9]+$/.test(text)) {
		parsed = parseInt(text, 10);
	} else if (/^[0-9a-f]+$/i.test(text)) {
		parsed = parseInt(text, 16);
	}

	if (!isFinite(parsed)) {
		return colorToRgbInt(fallbackValue, "0xFFFFFF");
	}

	return parsed & 0xFFFFFF;
}

/**
 * Store colors in one unambiguous format for Clay and future app launches.
 */
function rgbIntToClayColor(value, fallback) {
	var rgb = colorToRgbInt(value, fallback);
	var hex = rgb.toString(16).toUpperCase();

	while (hex.length < 6) {
		hex = "0" + hex;
	}

	return "0x" + hex;
}

function normalizeColorSettings() {
	settings.goodColor = rgbIntToClayColor(
		settings.goodColor,
		"0x00AA55"
	);
	settings.warningColor = rgbIntToClayColor(
		settings.warningColor,
		"0xFFAA00"
	);
	settings.alarmColor = rgbIntToClayColor(
		settings.alarmColor,
		"0xFF0000"
	);
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

	// Compact history: values only, most recent first.
	// The chart uses equal horizontal spacing, so timestamps are unnecessary.
	var history = readings
		.map(function (r) {
			return Math.round(r.Value);
		})
		.join(",");

	// Update last good reading time for smart polling
	lastGoodReadingTime = latestTimestamp;

	// Evaluate the current value once for every genuinely new reading.
	pendingAlert = ALERT_NONE;
	checkCurrentAlarm(
		latestValue,
		latestTimestamp,
		!!fromCache
	);

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
	message[KEY_LOW_ALARM_THRESHOLD] = settings.lowAlarmThreshold;
	message[KEY_HIGH_ALARM_THRESHOLD] = settings.highAlarmThreshold;
	message[KEY_GOOD_COLOR] = colorToRgbInt(settings.goodColor, "0x00AA55");
	message[KEY_WARNING_COLOR] = colorToRgbInt(settings.warningColor, "0xFFAA00");
	message[KEY_ALARM_COLOR] = colorToRgbInt(settings.alarmColor, "0xFF0000");
	message[KEY_POLL_INTERVAL] = settings.pollIntervalMinutes;
	message[KEY_REVERSED] = settings.reversed ? 1 : 0;
	message[KEY_QUICK_VIEW] = settings.quickView ? 1 : 0;
	message[KEY_NEEDS_SETUP] = 0;
	message[KEY_SYNC_ERROR] = 0; // Success - no sync error

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
			" points"
	);

	console.log(
		"Sending compact diagram: " +
			readings.length +
			" points, " +
			history.length +
			" bytes"
	);

	Pebble.sendAppMessage(
		message,
		function () {
			console.log("Current value and diagram sent to watch");
		},
		function (e) {
			console.log(
				"Error sending current value and diagram: " +
				JSON.stringify(e)
			);
		}
	);

	// Schedule next poll
	scheduleNextPoll();
}

/**
 * Trigger one alarm for every new measurement in the configured alarm range.
 *
 * There is no prediction, delay or repeat timer. Re-fetching the same
 * LibreLinkUp measurement does not trigger a duplicate alarm.
 */
function checkCurrentAlarm(
	value,
	readingTimestamp,
	fromCache
) {
	if (
		!readingTimestamp ||
		fromCache ||
		readingTimestamp ===
			lastEvaluatedAlarmReadingTimestamp
	) {
		return;
	}

	lastEvaluatedAlarmReadingTimestamp = readingTimestamp;
	saveAlarmState();

	if (!settings.acousticAlarmEnabled) {
		return;
	}

	if (value <= settings.lowAlarmThreshold) {
		console.log(
			"Triggering low alarm for new reading: " +
				value +
				" mg/dL"
		);
		pendingAlert = ALERT_LOW;
		return;
	}

	if (value >= settings.highAlarmThreshold) {
		console.log(
			"Triggering high alarm for new reading: " +
				value +
				" mg/dL"
		);
		pendingAlert = ALERT_HIGH;
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
	message[KEY_QUICK_VIEW] = settings.quickView ? 1 : 0;
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
 * Schedule the next LibreLinkUp poll using the configured interval.
 */
function scheduleNextPoll() {
	if (pollTimer) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}

	var minutes = parseInt(settings.pollIntervalMinutes, 10) || 5;
	if (minutes < 1) minutes = 1;
	if (minutes > 10) minutes = 10;

	console.log("Next poll in " + minutes + " minute(s)");
	pollTimer = setTimeout(fetchData, minutes * 60 * 1000);
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
		quickView: settings.quickView,
		lowThresholdMmol: thresholdForSettings(settings.lowThreshold),
		highThresholdMmol: thresholdForSettings(settings.highThreshold),
		lowThresholdMgdl: settings.lowThreshold,
		highThresholdMgdl: settings.highThreshold,
		acousticAlarmEnabled: settings.acousticAlarmEnabled,
		lowAlarmThresholdMmol: thresholdForSettings(settings.lowAlarmThreshold),
		lowAlarmThresholdMgdl: settings.lowAlarmThreshold,
		highAlarmThresholdMmol: thresholdForSettings(settings.highAlarmThreshold),
		highAlarmThresholdMgdl: settings.highAlarmThreshold,
		goodColor: settings.goodColor,
		warningColor: settings.warningColor,
		alarmColor: settings.alarmColor,
		pollIntervalMinutes: settings.pollIntervalMinutes
	};

	clay.setSettings(claySettings);
	Pebble.openURL(clay.generateUrl());
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
	if (dict.quickView !== undefined) settings.quickView = !!dict.quickView.value;

	var selectedThresholdUnit =
		settings.unit === "mgdl" ? "mgdl" : "mmol";
	var lowWarningField =
		selectedThresholdUnit === "mgdl"
			? dict.lowThresholdMgdl
			: dict.lowThresholdMmol;
	var highWarningField =
		selectedThresholdUnit === "mgdl"
			? dict.highThresholdMgdl
			: dict.highThresholdMmol;

	if (highWarningField !== undefined) {
		settings.highThreshold = thresholdInputToMgdl(
			highWarningField.value,
			selectedThresholdUnit,
			180
		);
	}
	if (lowWarningField !== undefined) {
		settings.lowThreshold = thresholdInputToMgdl(
			lowWarningField.value,
			selectedThresholdUnit,
			80
		);
	}
	if (dict.acousticAlarmEnabled !== undefined) {
		settings.acousticAlarmEnabled =
			!!dict.acousticAlarmEnabled.value;
	}

	var lowAlarmField =
		selectedThresholdUnit === "mgdl"
			? dict.lowAlarmThresholdMgdl
			: dict.lowAlarmThresholdMmol;
	if (lowAlarmField !== undefined) {
		settings.lowAlarmThreshold = thresholdInputToMgdl(
			lowAlarmField.value,
			selectedThresholdUnit,
			70
		);
	}

	var highAlarmField =
		selectedThresholdUnit === "mgdl"
			? dict.highAlarmThresholdMgdl
			: dict.highAlarmThresholdMmol;
	if (highAlarmField !== undefined) {
		settings.highAlarmThreshold = thresholdInputToMgdl(
			highAlarmField.value,
			selectedThresholdUnit,
			250
		);
	}
	if (dict.goodColor !== undefined) {
		settings.goodColor = rgbIntToClayColor(
			dict.goodColor.value,
			"0x00AA55"
		);
	}
	if (dict.warningColor !== undefined) {
		settings.warningColor = rgbIntToClayColor(
			dict.warningColor.value,
			"0xFFAA00"
		);
	}
	if (dict.alarmColor !== undefined) {
		settings.alarmColor = rgbIntToClayColor(
			dict.alarmColor.value,
			"0xFF0000"
		);
	}
	if (dict.pollIntervalMinutes !== undefined) {
		var pollInterval = parseInt(dict.pollIntervalMinutes.value, 10) || 5;
		settings.pollIntervalMinutes = Math.max(1, Math.min(10, pollInterval));
	}

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
	loadAlarmState();
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
