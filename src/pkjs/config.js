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
				defaultValue: "Glucose & Updates"
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
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Good Range"
			},
			{
				type: "color",
				messageKey: "goodColor",
				label: "Good Color",
				defaultValue: "0x00AA55"
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
				defaultValue: "<small>Values inside this range use the Good color. Outside it they use the Warning color until an alarm threshold is reached.</small>"
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Warning"
			},
			{
				type: "color",
				messageKey: "warningColor",
				label: "Warning Color",
				defaultValue: "0xFFAA00"
			}
		]
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "Alarm"
			},
			{
				type: "color",
				messageKey: "alarmColor",
				label: "Alarm Color",
				defaultValue: "0xFF0000"
			},
			{
				type: "input",
				messageKey: "lowAlarmThresholdMmol",
				group: "threshold-unit-mmol",
				label: "Low Alarm / Red Threshold (mmol/L)",
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
				messageKey: "lowAlarmThresholdMgdl",
				group: "threshold-unit-mgdl",
				label: "Low Alarm / Red Threshold (mg/dL)",
				defaultValue: 70,
				attributes: {
					type: "number",
					step: "1",
					min: "36",
					max: "360"
				}
			},
			{
				type: "input",
				messageKey: "highAlarmThresholdMmol",
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
				messageKey: "highAlarmThresholdMgdl",
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
				type: "toggle",
				messageKey: "acousticAlarmEnabled",
				label: "Enable Acoustic Alarm",
				defaultValue: false
			},
			{
				type: "text",
				defaultValue: "<small>Each new glucose measurement at or beyond either alarm threshold triggers one alarm. There is no prediction, delay or separate repeat timer. If the watch is muted, vibration is used instead.</small>"
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
				label: "Quick View Color Band",
				defaultValue: false
			},
			{
				type: "text",
				defaultValue: "<small>Quick View shows the current Good, Warning or Alarm color behind the glucose row. Text and symbols inside the band are always black.</small>"
			}
		]
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
		type: "button",
		id: "restore-defaults",
		defaultValue: "Restore Default Settings",
		primary: false,
		description: "Restores display, colors, thresholds and alarm settings. LibreLinkUp email, password and server region are kept. Press Save Settings afterwards."
	},
	{
		type: "submit",
		defaultValue: "Save Settings"
	}
];
