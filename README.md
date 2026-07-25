# OpenLibreLinkUp

A glucose-monitoring watchface for the **Pebble Time 2**. It displays data from
a **FreeStyle Libre sensor** through the unofficial **LibreLinkUp API**.

This project is based on
[T1000 Color](https://github.com/andrewchilds/t1000-color) by
[Andrew Childs](https://github.com/andrewchilds). The LibreLinkUp integration,
Pebble Time 2 interface, chart, settings, and further modifications are
maintained by **Marukitano**.

## Features

- Current glucose value with configurable range colors
- Colored vector trend arrow and delta
- Age of the latest sensor reading
- Rolling four-hour glucose chart
- Dynamic chart scaling with min/max labels
- Moving full-hour grid and hour labels
- Configurable low/high thresholds
- `mg/dL` and `mmol/L`
- Black and white display modes
- Configurable polling interval
- Low-soon prediction alarm
- Delayed/repeating high-glucose alarm
- Acoustic alarms on supported watches, with vibration fallback
- Connection and stale-data indicators

## Requirements

- Pebble Time 2
- FreeStyle Libre sensor
- LibreLinkUp account with a shared connection
- Pebble SDK for building and sideloading

## Build

```sh
npm install
npm run build
pebble install --phone PHONE_IP build/LibreLinkUp.pbw
```

## Security

Do not commit LibreLinkUp credentials, access tokens, personal glucose data, or
`emu-settings.json`. Account credentials entered through the watchface settings
are stored by the Pebble phone application.

## Disclaimer

OpenLibreLinkUp is an independent, unofficial hobby project. It is not
affiliated with or endorsed by Abbott, FreeStyle Libre, LibreLinkUp, Core
Devices, Rebble, or Pebble.

The displayed glucose values are for convenient viewing only. Do not use this
watchface as the sole basis for medical decisions.

## Credits and license

Original project:

- [T1000 Color](https://github.com/andrewchilds/t1000-color)
- Copyright © 2026 Andrew Childs

LibreLinkUp integration and modifications:

- **Marukitano**
- Modifications copyright © 2026 Marukitano

Licensed under the MIT License. The original copyright and license notice must
remain included in copies or substantial portions of the original software.
See [`LICENSE`](LICENSE).
