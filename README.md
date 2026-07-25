# OpenLibreLinkUp

A complete glucose-monitoring watchface for the **Pebble Time 2**.\
OpenLibreLinkUp displays readings from a **FreeStyle Libre sensor** through the\
unofficial **LibreLinkUp API**.

> **Project status:** Feature-complete and ready for daily use. Future changes\
> will focus on maintenance, compatibility, and bug fixes.

OpenLibreLinkUp is based on\
[T1000 Color](https://github.com/andrewchilds/t1000-color) by\
[Andrew Childs](https://github.com/andrewchilds). The LibreLinkUp integration,\
Pebble Time 2 interface, chart, settings, alarms, and further modifications are\
maintained by **Marukitano**.

## Features

* Current glucose value

* Configurable colors for good, warning, and alarm ranges

* Trend arrow in the same color as the current glucose value

* Change since the previous reading

* Age of the latest sensor reading

* Rolling four-hour glucose chart

* Dynamic chart scaling with min/max labels

* Moving full-hour grid and hour labels

* Configurable low and high thresholds

* Support for `mmol/L` and `mg/dL`

* Black-on-white and white-on-black display modes

* Configurable update interval from 1 to 10 minutes

* Low-soon prediction alarm

* Delayed and repeating high-glucose alarm

* Acoustic alarms on the Pebble Time 2

* Vibration fallback when sound is unavailable or muted

* Connection and stale-data indicators

* Configurable settings through the Pebble phone application

## Requirements

* Pebble Time 2

* FreeStyle Libre sensor

* LibreLinkUp account

* An active LibreLinkUp shared connection

* Pebble phone application with an internet connection

* Pebble SDK for building from source

## Installation from source

Clone the repository and install the dependencies:

```
git clone https://github.com/marukitano/OpenLibreLinkUp.git
cd OpenLibreLinkUp
npm install
```

Build the watchface:

```
npm run build
```

Enable **Developer Connection** in the Pebble phone application and install the\
generated PBW file:

```
pebble install --phone PHONE_IP build/*.pbw
```

Replace `PHONE_IP` with the address shown under Developer Connection.

## Configuration

Open the settings for **OpenLibreLinkUp** in the Pebble phone application.

The settings page contains:

* LibreLinkUp email address and password

* LibreLinkUp server region

* Glucose unit

* Update interval

* Low and high chart thresholds

* Good, warning, and alarm colors

* Low-soon alarm threshold and repeat interval

* High-glucose alarm threshold, delay, and repeat interval

* Reversed display mode

## Alarms

### Low-soon alarm

The watchface estimates the glucose trend from recent readings. It can play an\
alarm when the predicted value for the next 20 minutes falls below the\
configured threshold.

### High-glucose alarm

The high alarm can be delayed so that a brief high reading does not immediately\
trigger it. The alarm can repeat at a configurable interval while the high\
condition remains active.

On the Pebble Time 2, alarms use the built-in speaker. Vibration is used as a\
fallback when sound is muted or unavailable.

## Security and privacy

Never commit LibreLinkUp credentials, access tokens, personal glucose data, or\
`emu-settings.json` to the repository.

Credentials entered through the settings page are stored by the Pebble phone\
application. OpenLibreLinkUp is an unofficial client and uses the LibreLinkUp\
API directly from PebbleKit JS.

## Disclaimer

OpenLibreLinkUp is an independent, unofficial hobby project. It is not\
affiliated with, endorsed by, or supported by Abbott, FreeStyle Libre,\
LibreLinkUp, Core Devices, Rebble, or Pebble.

The displayed glucose values are intended for convenient viewing only. Do not\
use this watchface as the sole basis for medical decisions. Always follow the\
instructions provided with your glucose-monitoring system.

## Credits

Original project:

* [T1000 Color](https://github.com/andrewchilds/t1000-color)

* Copyright © 2026 Andrew Childs

LibreLinkUp integration and modifications:

* **Marukitano**

* Copyright © 2026 Maru

## License

OpenLibreLinkUp is licensed under the [MIT License](LICENSE).

The original copyright notice and permission notice must remain included in\
copies or substantial portions of the software.
