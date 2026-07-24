# Libre Glucose Watchface for Pebble Time 2

A glucose-monitoring watchface for the **Pebble Time 2**, designed to display data from a **FreeStyle Libre sensor** through the **LibreLinkUp API**.

This project is based on [T1000 Color](https://github.com/andrewchilds/t1000-color) by [Andrew Childs](https://github.com/andrewchilds), which was originally developed for Dexcom CGM data.

The LibreLinkUp integration and all Libre-specific modifications are being developed by **Maru**.

> [Deutsche Version](#deutsche-version)

## Project status

This project is currently under development.

The goal is to adapt the original Dexcom-based watchface for use with FreeStyle Libre sensors and LibreLinkUp while retaining the clear glucose display and history graph of T1000 Color.

## Planned features

* Current glucose value
* Glucose trend arrow
* Change since the previous reading
* Time since the last glucose reading
* Glucose history graph
* Support for `mg/dL` and `mmol/L`
* Configurable high and low thresholds
* Color-coded glucose ranges
* Connection and stale-data warnings
* LibreLinkUp account configuration
* Support for Pebble Time 2

Additional settings and features may be added during development.

## Requirements

* Pebble Time 2
* FreeStyle Libre sensor
* LibreLinkUp account
* A working LibreLinkUp connection
* Pebble development environment for building and sideloading

## Security notice

Do not store or publish your LibreLinkUp login credentials, access tokens, API data, or personal glucose data in this repository.

Before publishing changes, always check files such as:

```text
.env
config.json
settings.json
appinfo.json
package.json
```

Credentials and tokens should be stored locally and excluded through `.gitignore` whenever possible.

## Building

Install the required dependencies:

```sh
npm install
```

Build and install the watchface locally:

```sh
npm run sideload
```

Run it in the Pebble Time 2 emulator:

```sh
npm run emulator
```

The build process may change while LibreLinkUp support is being implemented.

## Disclaimer

This project is an independent, unofficial hobby project.

It is not affiliated with, endorsed by, or supported by Abbott, FreeStyle Libre, LibreLinkUp, Core Devices, Rebble, or Pebble.

The glucose values displayed by this watchface are intended for convenient viewing only. Do not rely on this software as the sole basis for medical decisions. Always follow the instructions provided with your glucose-monitoring system and consult a qualified medical professional when necessary.

## Credits

This project is based on:

* [T1000 Color](https://github.com/andrewchilds/t1000-color)
* Original author: [Andrew Childs](https://github.com/andrewchilds)

LibreLinkUp integration, Libre-specific functionality, configuration changes, and further development:

* **Maru**

Thank you to Andrew Childs for publishing the original project under the MIT License.

## License

This project is licensed under the **MIT License**.

The original copyright notice and MIT License from T1000 Color must remain included in copies or substantial portions of the original software.

Copyright © 2026 Andrew Childs
Modifications copyright © 2026 Maru

See the [`LICENSE`](LICENSE) file for details.

---

# Deutsche Version

## Libre-Blutzucker-Watchface für die Pebble Time 2

Ein Blutzucker-Watchface für die **Pebble Time 2**, das die Messwerte eines **FreeStyle-Libre-Sensors** über die **LibreLinkUp-API** anzeigen soll.

Das Projekt basiert auf [T1000 Color](https://github.com/andrewchilds/t1000-color) von [Andrew Childs](https://github.com/andrewchilds). Das ursprüngliche Watchface wurde für die Anzeige von Dexcom-CGM-Daten entwickelt.

Die LibreLinkUp-Anbindung und alle Libre-spezifischen Anpassungen werden von **Maru** entwickelt.

## Projektstatus

Dieses Projekt befindet sich derzeit in Entwicklung.

Das Ziel ist, das ursprünglich für Dexcom entwickelte Watchface an FreeStyle-Libre-Sensoren und LibreLinkUp anzupassen. Die übersichtliche Darstellung des aktuellen Glukosewerts und des bisherigen Verlaufs soll dabei erhalten bleiben.

## Geplante Funktionen

* Anzeige des aktuellen Glukosewerts
* Trendpfeil
* Änderung seit der vorherigen Messung
* Zeit seit dem letzten Messwert
* Diagramm des Glukoseverlaufs
* Unterstützung für `mg/dL` und `mmol/L`
* Einstellbare obere und untere Grenzwerte
* Farbliche Kennzeichnung der Glukosebereiche
* Warnung bei Verbindungsproblemen oder veralteten Messwerten
* Konfiguration des LibreLinkUp-Kontos
* Unterstützung für die Pebble Time 2

Während der Entwicklung können weitere Einstellungen und Funktionen hinzukommen.

## Voraussetzungen

* Pebble Time 2
* FreeStyle-Libre-Sensor
* LibreLinkUp-Konto
* Funktionierende LibreLinkUp-Verbindung
* Pebble-Entwicklungsumgebung zum Bauen und Sideloaden

## Sicherheitshinweis

Veröffentliche niemals deine LibreLinkUp-Anmeldedaten, Zugriffstoken, API-Daten oder persönlichen Glukosewerte in diesem Repository.

Kontrolliere vor dem Veröffentlichen insbesondere Dateien wie:

```text
.env
config.json
settings.json
appinfo.json
package.json
```

Zugangsdaten und Token sollten möglichst nur lokal gespeichert und über `.gitignore` vom Repository ausgeschlossen werden.

## Projekt bauen

Installiere zuerst die benötigten Abhängigkeiten:

```sh
npm install
```

Baue das Watchface und installiere es lokal:

```sh
npm run sideload
```

Starte es im Emulator der Pebble Time 2:

```sh
npm run emulator
```

Der genaue Build-Prozess kann sich während der Entwicklung der LibreLinkUp-Unterstützung noch ändern.

## Haftungsausschluss

Dieses Projekt ist ein unabhängiges und inoffizielles Hobbyprojekt.

Es steht in keiner Verbindung zu Abbott, FreeStyle Libre, LibreLinkUp, Core Devices, Rebble oder Pebble und wird von diesen Unternehmen und Projekten weder unterstützt noch offiziell empfohlen.

Die auf dem Watchface dargestellten Glukosewerte dienen lediglich der komfortablen Anzeige. Verlasse dich bei medizinischen Entscheidungen nicht ausschließlich auf diese Software. Beachte immer die Anweisungen deines Glukosemesssystems und wende dich bei medizinischen Fragen an eine qualifizierte Fachperson.

## Danksagung

Dieses Projekt basiert auf:

* [T1000 Color](https://github.com/andrewchilds/t1000-color)
* Ursprünglicher Entwickler: [Andrew Childs](https://github.com/andrewchilds)

LibreLinkUp-Anbindung, Libre-spezifische Funktionen, Anpassungen der Konfiguration und weitere Entwicklung:

* **Maru**

Vielen Dank an Andrew Childs, dass er das ursprüngliche Projekt unter der MIT-Lizenz veröffentlicht hat.

## Lizenz

Dieses Projekt wird unter der **MIT-Lizenz** veröffentlicht.

Der ursprüngliche Copyright-Hinweis und die MIT-Lizenz von T1000 Color müssen in Kopien oder wesentlichen Teilen des ursprünglichen Programmcodes erhalten bleiben.

Copyright © 2026 Andrew Childs
Änderungen Copyright © 2026 Maru

Weitere Informationen befinden sich in der Datei [`LICENSE`](LICENSE).
