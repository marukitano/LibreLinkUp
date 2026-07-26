# Changelog

All notable changes to OpenLibreLinkUp are documented in this file.

## 1.2.0 - 2026-07-26

### Added

- LibreLinkUp authentication and glucose retrieval
- Time-accurate 210-minute rolling chart
- Dynamic chart scaling with minimum and maximum labels
- Full-width dotted minimum and maximum guides
- Colored warning and alarm threshold lines
- Configurable good, warning, and alarm colors
- Quick View color band
- Configurable glucose and delta intervals
- Trend arrows derived from the displayed normalized delta
- Direct low and high glucose alarms
- Speaker alarms with vibration fallback
- `mmol/L` and `mg/dL` support
- English, German, French, and Italian settings
- Restore-defaults action that preserves account details

### Changed

- Simplified alarms to one alert for each genuinely new reading in an alarm range
- Improved chart density, positioning, vertical scaling, and edge usage
- Unified public defaults across settings, runtime, and emulator tools
- Updated release documentation to match the implemented behavior
- Made the emulator settings helper work with Linux and macOS SDK locations

### Fixed

- Settings persistence and Clay color-palette detection
- Duplicate alarm prevention for repeated API fetches
- Quick View divider rendering
- Trend arrow disappearance across uneven history intervals
- Unused runtime code and temporary diagnostics
- Hidden sync-spinner timers
- Warning-icon `GPath` memory leak

## 1.1.2

- Earlier development release.
