module.exports = [
	{
		type: "heading",
		defaultValue: "OpenLibreLinkUp Settings"
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "LibreLinkUp Account"
			},
			{
				type: "button",
				id: "toggle-account-settings",
				defaultValue: "Show Account Settings",
				primary: false,
				description: "Email, password and server region are hidden by default to prevent accidental changes while scrolling."
			},
			{
				type: "input",
				messageKey: "accountName",
				group: "account-settings",
				label: "Email",
				attributes: {
					placeholder: "LibreLinkUp email address",
					autocapitalize: "off",
					autocorrect: "off"
				}
			},
			{
				type: "input",
				messageKey: "password",
				group: "account-settings",
				label: "Password",
				attributes: {
					placeholder: "LibreLinkUp password",
					type: "password"
				}
			},
			{
				type: "select",
				messageKey: "server",
				group: "account-settings",
				label: "Server Region",
				defaultValue: "europe",
				options: [
					{ label: "Europe", value: "europe" },
					{ label: "Germany / DACH", value: "germany" },
					{ label: "France", value: "france" },
					{ label: "United States", value: "us" },
					{ label: "Global / fallback", value: "global" }
				]
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Display"
			},
			{
				type: "toggle",
				messageKey: "reversed",
				label: "Reversed (black on white)",
				defaultValue: false
			},
			{
				type: "toggle",
				messageKey: "quickView",
				label: "Quick View color band",
				defaultValue: false
			},
			{
				type: "text",
				defaultValue: "<small>Shows a green, yellow or red band behind the current glucose row. All values inside the band are black.</small>"
			},
			{
				type: "select",
				messageKey: "unit",
				label: "Glucose Units",
				defaultValue: "mmol",
				options: [
					{ label: "mmol/L", value: "mmol" },
					{ label: "mg/dL", value: "mgdl" }
				]
			},
			{
				type: "slider",
				messageKey: "pollIntervalMinutes",
				label: "Update Interval (minutes)",
				defaultValue: 5,
				min: 1,
				max: 10,
				step: 1
			},
			{
				type: "input",
				messageKey: "lowThresholdMmol",
				group: "threshold-unit-mmol",
				label: "Low Warning Threshold (mmol/L)",
				defaultValue: 4.4,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "input",
				messageKey: "highThresholdMmol",
				group: "threshold-unit-mmol",
				label: "High Warning Threshold (mmol/L)",
				defaultValue: 10.0,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "input",
				messageKey: "lowThresholdMgdl",
				group: "threshold-unit-mgdl",
				label: "Low Warning Threshold (mg/dL)",
				defaultValue: 80,
				attributes: {
					type: "number",
					step: "1",
					min: "36",
					max: "360"
				}
			},
			{
				type: "input",
				messageKey: "highThresholdMgdl",
				group: "threshold-unit-mgdl",
				label: "High Warning Threshold (mg/dL)",
				defaultValue: 180,
				attributes: {
					type: "number",
					step: "1",
					min: "36",
					max: "360"
				}
			},
			{
				type: "text",
				defaultValue: "<small>Threshold fields automatically follow the selected glucose unit. Green is inside the warning thresholds, yellow is between warning and alarm thresholds, and red begins exactly at the alarm thresholds below.</small>"
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Chart Point Colors"
			},
			{
				type: "color",
				messageKey: "goodColor",
				label: "Good",
				defaultValue: "0x00AA55"
			},
			{
				type: "color",
				messageKey: "warningColor",
				label: "Warning",
				defaultValue: "0xFFAA00"
			},
			{
				type: "color",
				messageKey: "alarmColor",
				label: "Alarm",
				defaultValue: "0xFF0000"
			},
			{
				type: "text",
				defaultValue: "<small>Good = inside the warning range. Warning = between warning and alarm thresholds. Alarm = at or beyond the configured alarm thresholds.</small>"
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Low Soon Alert"
			},
			{
				type: "toggle",
				messageKey: "vibeLowSoonEnabled",
				label: "Enable low soon acoustic alarm",
				defaultValue: false
			},
			{
				type: "input",
				messageKey: "vibeLowSoonThresholdMmol",
				group: "threshold-unit-mmol",
				label: "Low Soon Alarm / Red Threshold (mmol/L)",
				defaultValue: 3.9,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "input",
				messageKey: "vibeLowSoonThresholdMgdl",
				group: "threshold-unit-mgdl",
				label: "Low Soon Alarm / Red Threshold (mg/dL)",
				defaultValue: 70,
				attributes: {
					type: "number",
					step: "1",
					min: "36",
					max: "360"
				}
			},
			{
				type: "text",
				defaultValue: "<small>This value is also the exact red threshold for low chart points and Quick View. The alarm sounds when the glucose value is predicted to be below it in 20 minutes. If the watch is muted, vibration is used instead.</small>"
			},
			{
				type: "slider",
				messageKey: "vibeLowSoonRepeatMinutes",
				label: "Repeat (minutes)",
				defaultValue: 30,
				min: 15,
				max: 60,
				step: 5
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "High Alert"
			},
			{
				type: "toggle",
				messageKey: "vibeEnabled",
				label: "Enable high acoustic alarm",
				defaultValue: false
			},
			{
				type: "input",
				messageKey: "vibeHighThresholdMmol",
				group: "threshold-unit-mmol",
				label: "High Alarm / Red Threshold (mmol/L)",
				defaultValue: 13.9,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "input",
				messageKey: "vibeHighThresholdMgdl",
				group: "threshold-unit-mgdl",
				label: "High Alarm / Red Threshold (mg/dL)",
				defaultValue: 250,
				attributes: {
					type: "number",
					step: "1",
					min: "36",
					max: "360"
				}
			},
			{
				type: "slider",
				messageKey: "vibeDelayMinutes",
				label: "Delay (minutes)",
				defaultValue: 60,
				min: 15,
				max: 120,
				step: 15
			},
			{
				type: "slider",
				messageKey: "vibeRepeatMinutes",
				label: "Repeat (minutes)",
				defaultValue: 60,
				min: 15,
				max: 120,
				step: 15
			}
		]
	},
	{
		type: "button",
		id: "restore-defaults",
		defaultValue: "Restore Default Settings",
		primary: false,
		description: "Restores display, colors, thresholds and alarms. LibreLinkUp email, password and server region are kept. Press Save Settings afterwards."
	},
	{
		type: "submit",
		defaultValue: "Save Settings"
	}
];
