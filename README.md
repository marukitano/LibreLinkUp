# OpenLibreLinkUp

![](./OpenLibreLinkUp.png) ![](./OpenLibreLinkUp2.png) ![](./OpenLibreLinkUp4.png) ![](./OpenLibreLinkUp3.png)

> [Deutsche Version](#deutsche-version)

A glucose-monitoring watchface for the **Pebble Time 2**. OpenLibreLinkUp
displays readings from a **FreeStyle Libre sensor** through the unofficial
**LibreLinkUp API**.

> **Project status:** Feature-complete and prepared for release. Future changes
> will focus on compatibility, maintenance, and bug fixes.

OpenLibreLinkUp is based on
[T1000 Color](https://github.com/andrewchilds/t1000-color) by
[Andrew Childs](https://github.com/andrewchilds). The LibreLinkUp integration,
Pebble Time 2 interface, chart, settings, alarms, and further modifications are
maintained by **Marukitano**.

## Features

- Current glucose value in `mmol/L` or `mg/dL`
- Configurable delta interval: 5, 10, 15, 20, or 30 minutes
- Trend arrow derived from the same normalized delta shown on the watch
- Age of the latest sensor reading
- Time-accurate rolling chart covering the latest 210 minutes
- Dynamic vertical scaling with minimum and maximum labels
- Full-width dotted guides for the visible minimum and maximum
- Moving full-hour grid and five hour labels
- Colored warning and alarm threshold lines
- Configurable good, warning, and alarm colors
- Optional Quick View color band behind the glucose row
- Normal white-on-black and reversed black-on-white display modes
- Configurable update interval from 1 to 10 minutes
- Direct low and high glucose alarms
- Speaker alarms on the Pebble Time 2 with vibration fallback
- Connection and stale-data indicators
- Settings in English, German, French, and Italian
- Restore-defaults button that keeps LibreLinkUp account details

## Trend arrow

The arrow follows the delta displayed on the watch. The normalized delta is
converted to `mmol/L` and rounded to one decimal place:

| Displayed delta | Arrow |
| --- | --- |
| `-0.1` to `+0.1 mmol/L` | Horizontal |
| `+0.2 mmol/L` | 45° upward |
| `-0.2 mmol/L` | 45° downward |
| `+0.3 mmol/L` or more | Vertical upward |
| `-0.3 mmol/L` or less | Vertical downward |

## Alarms

The optional acoustic alarm evaluates the **current reading only**.

Each genuinely new LibreLinkUp measurement at or beyond the configured low or
high alarm threshold triggers one alarm. Fetching the same measurement again
does not trigger a duplicate alarm. There is no prediction, delay, or separate
repeat timer.

On the Pebble Time 2, alarms use the built-in speaker. If the watch is muted or
sound is unavailable, vibration is used instead.

## Requirements

- Pebble Time 2
- FreeStyle Libre sensor
- LibreLinkUp account
- Active LibreLinkUp shared connection
- Pebble phone application with internet access
- Pebble SDK for building from source

## Installation from source

```sh
git clone https://github.com/marukitano/OpenLibreLinkUp.git
cd OpenLibreLinkUp
npm install
npm run build
```

Enable **Developer Connection** in the Pebble phone application and install the
generated PBW file:

```sh
pebble install --phone PHONE_IP build/OpenLibreLinkUp.pbw
```

Replace `PHONE_IP` with the address shown under Developer Connection.

## Configuration

Open the settings for **OpenLibreLinkUp** in the Pebble phone application.

The settings page includes:

- Language
- Glucose unit
- Update interval
- Delta interval
- Good-range warning thresholds
- Low and high alarm thresholds
- Good, warning, and alarm colors
- Acoustic alarm toggle
- Reversed display mode
- Quick View color band
- LibreLinkUp email address, password, and server region

Account fields are collapsed by default to prevent accidental changes while
scrolling. Restoring defaults keeps the LibreLinkUp email address, password, and
server region.

## Security and privacy

Never commit LibreLinkUp credentials, access tokens, personal glucose data, or
`emu-settings.json` to the repository.

Credentials entered through the settings page are stored by the Pebble phone
application. OpenLibreLinkUp is an unofficial client and accesses the
LibreLinkUp API directly from PebbleKit JS.

## Disclaimer

OpenLibreLinkUp is an independent, unofficial hobby project. It is not
affiliated with, endorsed by, or supported by Abbott, FreeStyle Libre,
LibreLinkUp, Core Devices, Rebble, or Pebble.

The displayed glucose values and alarms are intended for convenient viewing
only. Do not use this watchface as the sole basis for medical decisions. Always
follow the instructions provided with your glucose-monitoring system.

## Credits

Original project:

- [T1000 Color](https://github.com/andrewchilds/t1000-color)
- Copyright © 2026 Andrew Childs

LibreLinkUp integration and modifications:

- **Marukitano**
- Copyright © 2026 Maru

## License

OpenLibreLinkUp is licensed under the [MIT License](LICENSE). The original
copyright notice and permission notice must remain included in copies or
substantial portions of the software.

---

# Deutsche Version

## OpenLibreLinkUp

Ein Blutzucker-Watchface für die **Pebble Time 2**. OpenLibreLinkUp zeigt
Messwerte eines **FreeStyle-Libre-Sensors** über die inoffizielle
**LibreLinkUp-API** an.

> **Projektstatus:** Funktionsumfang abgeschlossen und für die Veröffentlichung
> vorbereitet. Künftige Änderungen konzentrieren sich auf Kompatibilität,
> Wartung und Fehlerbehebungen.

OpenLibreLinkUp basiert auf
[T1000 Color](https://github.com/andrewchilds/t1000-color) von
[Andrew Childs](https://github.com/andrewchilds). Die LibreLinkUp-Anbindung,
die Oberfläche für die Pebble Time 2, das Diagramm, die Einstellungen, die
Alarme und alle weiteren Anpassungen werden von **Marukitano** gepflegt.

## Funktionen

- Aktueller Glukosewert in `mmol/L` oder `mg/dL`
- Einstellbares Delta-Intervall: 5, 10, 15, 20 oder 30 Minuten
- Trendpfeil aus demselben normalisierten Delta wie die sichtbare Anzeige
- Alter des letzten Sensorwerts
- Zeitgenaues rollendes Diagramm über die letzten 210 Minuten
- Dynamische vertikale Skalierung mit Minimum und Maximum
- Gepunktete Hilfslinien für Minimum und Maximum über die ganze Breite
- Mitlaufendes Stundenraster mit fünf Stundenbeschriftungen
- Farbige Warn- und Alarmgrenzen
- Einstellbare Farben für Ziel-, Warn- und Alarmbereich
- Optionales Quick-View-Farbband hinter der Glukosezeile
- Normale Darstellung Weiß auf Schwarz und umgekehrt Schwarz auf Weiß
- Einstellbares Aktualisierungsintervall von 1 bis 10 Minuten
- Direkte Alarme bei niedrigem und hohem Glukosewert
- Lautsprecheralarm auf der Pebble Time 2 mit Vibrationsersatz
- Hinweise bei Verbindungsproblemen und veralteten Messwerten
- Einstellungen auf Englisch, Deutsch, Französisch und Italienisch
- Wiederherstellung der Standardwerte ohne Löschen der Kontodaten

## Trendpfeil

Der Pfeil folgt dem Delta, das auf der Uhr angezeigt wird. Das normalisierte
Delta wird in `mmol/L` umgerechnet und auf eine Nachkommastelle gerundet:

| Angezeigtes Delta | Pfeil |
| --- | --- |
| `-0,1` bis `+0,1 mmol/L` | Waagerecht |
| `+0,2 mmol/L` | 45° nach oben |
| `-0,2 mmol/L` | 45° nach unten |
| Ab `+0,3 mmol/L` | Senkrecht nach oben |
| Ab `-0,3 mmol/L` | Senkrecht nach unten |

## Alarme

Der optionale akustische Alarm bewertet ausschließlich den **aktuellen
Messwert**.

Jeder tatsächlich neue LibreLinkUp-Messwert an oder außerhalb der eingestellten
unteren oder oberen Alarmgrenze löst genau einen Alarm aus. Wird derselbe
Messwert erneut abgerufen, entsteht kein doppelter Alarm. Es gibt keine
Vorhersage, Verzögerung und keinen gesonderten Wiederholungstimer.

Auf der Pebble Time 2 werden Alarme über den eingebauten Lautsprecher
ausgegeben. Ist die Uhr stummgeschaltet oder kein Ton verfügbar, wird
stattdessen vibriert.

## Voraussetzungen

- Pebble Time 2
- FreeStyle-Libre-Sensor
- LibreLinkUp-Konto
- Aktive Freigabeverbindung in LibreLinkUp
- Pebble-App auf dem Smartphone mit Internetzugang
- Pebble SDK zum Bauen aus dem Quellcode

## Installation aus dem Quellcode

```sh
git clone https://github.com/marukitano/OpenLibreLinkUp.git
cd OpenLibreLinkUp
npm install
npm run build
```

In der Pebble-App die **Developer Connection** aktivieren und die erzeugte
PBW-Datei installieren:

```sh
pebble install --phone PHONE_IP build/OpenLibreLinkUp.pbw
```

`PHONE_IP` durch die Adresse ersetzen, die unter Developer Connection
angezeigt wird.

## Konfiguration

In der Pebble-App die Einstellungen von **OpenLibreLinkUp** öffnen.

Die Einstellungsseite enthält:

- Sprache
- Glukoseeinheit
- Aktualisierungsintervall
- Delta-Intervall
- Warngrenzen des Zielbereichs
- Untere und obere Alarmgrenze
- Farben für Ziel-, Warn- und Alarmbereich
- Schalter für den akustischen Alarm
- Umgekehrte Darstellung
- Quick-View-Farbband
- LibreLinkUp-E-Mail-Adresse, Passwort und Serverregion

Die Kontofelder sind standardmäßig eingeklappt, damit sie beim Scrollen nicht
versehentlich geändert werden. Beim Wiederherstellen der Standardwerte bleiben
LibreLinkUp-E-Mail-Adresse, Passwort und Serverregion erhalten.

## Sicherheit und Datenschutz

LibreLinkUp-Zugangsdaten, Zugriffstoken, persönliche Glukosedaten und die Datei
`emu-settings.json` dürfen nicht in das Repository hochgeladen werden.

Die über die Einstellungsseite eingegebenen Zugangsdaten werden von der
Pebble-App auf dem Smartphone gespeichert. OpenLibreLinkUp ist ein
inoffizieller Client und greift über PebbleKit JS direkt auf die
LibreLinkUp-API zu.

## Haftungsausschluss

OpenLibreLinkUp ist ein unabhängiges, inoffizielles Hobbyprojekt. Es steht in
keiner Verbindung zu Abbott, FreeStyle Libre, LibreLinkUp, Core Devices,
Rebble oder Pebble und wird von diesen weder unterstützt noch offiziell
empfohlen.

Die dargestellten Glukosewerte und Alarme dienen ausschließlich der
komfortablen Anzeige. Das Watchface darf nicht als alleinige Grundlage für
medizinische Entscheidungen verwendet werden. Beachte immer die Anweisungen
deines Glukosemesssystems.

## Danksagung

Ursprüngliches Projekt:

- [T1000 Color](https://github.com/andrewchilds/t1000-color)
- Copyright © 2026 Andrew Childs

LibreLinkUp-Anbindung und Anpassungen:

- **Marukitano**
- Copyright © 2026 Maru

## Lizenz

OpenLibreLinkUp steht unter der [MIT-Lizenz](LICENSE). Der ursprüngliche
Copyright-Hinweis und der Lizenztext müssen in Kopien oder wesentlichen Teilen
der Software enthalten bleiben.
