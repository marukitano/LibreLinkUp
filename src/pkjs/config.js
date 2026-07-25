module.exports = [
	{
		type: "heading",
		defaultValue: "LibreLinkUp Watchface Settings"
	},
	{
		type: "section",
		items: [
			{
				type: "heading",
				defaultValue: "LibreLinkUp Account"
			},
			{
				type: "input",
				messageKey: "accountName",
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
				label: "Password",
				attributes: {
					placeholder: "LibreLinkUp password",
					type: "password"
				}
			},
			{
				type: "select",
				messageKey: "server",
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
				label: "Low Threshold (mmol/L)",
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
				messageKey: "highThresholdMmol",
				label: "High Threshold (mmol/L)",
				defaultValue: 10.0,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "text",
				defaultValue: "<small>The two grey dashed chart lines always use mmol/L values, regardless of the display unit.</small>"
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
				defaultValue: "<small>Good = between the limits. Warning = up to 2 mmol/L outside. Alarm = further outside.</small>"
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
				label: "Low Soon Threshold (mmol/L)",
				defaultValue: 4.4,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
				}
			},
			{
				type: "text",
				defaultValue: "<small>Play a sound when predicted to be below this value in 20 minutes. If the watch is muted, vibration is used instead.</small>"
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
				label: "High Alert Threshold (mmol/L)",
				defaultValue: 13.9,
				attributes: {
					type: "number",
					step: "0.1",
					min: "2.0",
					max: "20.0"
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
		type: "submit",
		defaultValue: "Save Settings"
	}
];
