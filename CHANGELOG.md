# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- deviceId auto-detection: log stderr, stdout, exit code and timeout when `phipsair` fails
- deviceId auto-detection: retry up to 3 times before giving up
- Fall back to the cached deviceId (same IP) instead of removing the accessory from HomeKit when auto-detection fails
- Rename the "Auto+" switch to "Auto Plus" (the old name was rejected by HAP-NodeJS); the old service is removed automatically
- Exclude `.claude` local settings from the npm package

## [2.1.0] - 2026-02-16
- Update dependencies
- Merge [PR#119](https://github.com/agmv/homebridge-philipsairplus-platform/pull/119) from [Jeko](https://github.com/LeJeko) 

## [2.0.9] - 2025-11-25
- Update dependencies

## [2.0.8] - 2025-11-23
- Update dependencies
- Fix device initiation to respect characteristics accepted values

## [2.0.5] - 2025-06-30
- Fix module resolution (reported: https://github.com/homebridge/homebridge-plugin-template/issues/84)

## [2.0.4] - 2025-06-30
- Updated dependencies

## [2.0.3] - 2025-03-08
- Fixed temperature step to be 1°
- Added additional logging for longPoll callback

## [2.0.2] - 2025-03-08
- Bug fixing

## [2.0.1] - 2025-03-08
- Improved logging messages

## [2.0.0] - 2025-03-08
- Major refactoring. Accessories now are mapped to a thermostat with additional switches for other functions: swing, backlight, sounds, Auto+ AI

## [1.0.26] - 2025-03-07
- Fix bug on accessory creation

## [1.0.25] - 2025-03-07
- Revert ability to set heating threshold temperature
- Map accessory as thermostat

## [1.0.24] - 2025-03-07
- Updated dependencies
- Ability to set heating threshold temperature, or target temperature

## [1.0.23] - 2025-02-17
- Updated dependencies
- Fixed poll mechanism

## [1.0.22] - 2025-02-03
- Updated dependencies

## [1.0.21] - 2025-01-21
- Updated dependencies

## [1.0.18] - 2024-12-27
- Moved debug configuration to the device configuration to support debug per device
