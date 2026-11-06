<p align="center">
    <img src="images/logo.png" height="200">
</p>

<h1 align="center">homebridge-philipsairplus-platform</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/homebridge-philipsair-platform"><img src="https://img.shields.io/npm/v/homebridge-philipsair-platform.svg?style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/homebridge-philipsair-platform"><img src="https://img.shields.io/npm/dt/homebridge-philipsair-platform.svg?style=flat-square" alt="npm downloads"></a>
  <a href="https://github.com/homebridge/homebridge/wiki/Verified-Plugins"><img src="https://badgen.net/badge/homebridge/verified/purple" alt="verified-by-homebridge"></a>
</p>

<p align="center">A Homebridge plugin for Philips Air+ Smart Tower Heaters.</p>

## Installation

After [Homebridge](https://github.com/homebridge/homebridge) has been installed:

```
sudo npm install -g --unsafe-perm homebridge-philipsairplus-platform@latest
```

The plugin uses a library based on `python3`. To use the plugin, Python/Pip must be installed!

```
sudo apt install python3-pip git
```

You also need the `phipsair` module from [M. Frister](https://github.com/mfrister/phipsair):

```
sudo pip3 install -U phipsair
```

### Docker Installation

If you are running Homebridge in a Docker container (e.g., `homebridge/homebridge`), you need to install the dependencies using the startup script.

Create or edit the file `/homebridge/startup.sh` with the following content:

```bash
#!/bin/bash

# Install phipsair library
apt update && apt install -y python3 python3-pip
pip3 install phipsair --break-system-packages
```

Make sure the script is executable and restart your container.

## Device ID Auto-Detection

The plugin can automatically detect the `deviceId` from the device's IP address. Simply leave the `deviceId` field empty and provide the `ip_address`.

If you prefer to manually get the deviceId, use the following phipsair command:
```
phipsair -H <ip-address> status -J
```

> **Note:** The plugin will check if `phipsair` is installed at startup. If not found, an error message will be displayed in the logs.

## Example Config

### Minimal configuration (with auto-detection)

```json
{
    "platforms": [
        {
            "platform": "PhilipsAirPlusPlatform",
            "name": "PhilipsAirPlusPlatform",
            "devices": [
                {
                    "active": true,
                    "name": "Heater",
                    "ip_address": "192.168.10.77"
                }
            ]
        }
    ]
}
```

### Full configuration

```json
{
    "platforms": [
        {
            "platform": "PhilipsAirPlusPlatform",
            "name": "PhilipsAirPlusPlatform",
            "devices": [
                {
                    "active": true,
                    "debug": false,
                    "name": "Heater",
                    "deviceId": "4c9c6904ca0f11afb5691bcd86317a2a",
                    "ip_address": "192.168.10.77",
                    "port": 5683,
                    "model": "CX3120",
                    "enableBacklight": false,
                    "enableBeep": true
                }
            ]
        }
    ]
}
```

| Fields             | Description                                                  | Default                    | Required |
|--------------------|--------------------------------------------------------------|----------------------------|----------|
| **platform**       | Must always be `PhilipsAirPlusPlatform`.                     | `"PhilipsAirPlusPlatform"` | Yes      |
| **name**           | For logging purposes                                         | `"PhilipsAirPlusPlatform"` | Yes      |
| devices            | Array of Philips air purifiers.                              |                            | Yes      |
| - active           | Whether the device is active and should be used              |                            | Yes      |
| - debug            | Enables additional output (debug) in the log.                | `false`                    | No       |
| - name             | Unique name of your device.                                  |                            | Yes      |
| - deviceId         | Device unique identifier (auto-detected if empty)            | Auto-detected              | No       |
| - **ip_address**   | Host/IP address of your device.                              |                            | Yes      |
| - port             | Port of your device.                                         | `5683`                     | No       |
| - model            | Device model: `auto`, `CX5120`, or `CX3120`                  | `auto`                     | No       |
| - enableBacklight  | Enable backlight control (not supported on CX3120)           | `true`                     | No       |
| - enableBeep       | Enable beep control switch                                   | `true`                     | No       |

## HomeKit Controls

When you add the device to HomeKit, you will see the following controls:

### Thermostat

The main thermostat control with the following modes:

| HomeKit Mode | Device Mode |
|--------------|-------------|
| Off          | Power off   |
| Auto         | Automatic   |
| Heat         | High        |
| Cool         | Ventilation |

> **Note:** Medium and Low modes are not directly accessible via HomeKit but are preserved if set via the Philips app.

### Switches

HomeKit displays switches with generic names ("Switch", "Switch 2", etc.). Here is the mapping:

| HomeKit Name   | Function    | Description                              |
|----------------|-------------|------------------------------------------|
| Switch 1       | Oscillation | Enables/disables the swing rotation      |
| Switch 2       | Beep        | Enables/disables the button sounds       |
| Switch 3       | Auto Plus   | Enables/disables the Auto+ AI mode       |
| Backlight      | Backlight   | Controls the display backlight (CX5120 only) |

> **Tip:** You can rename these switches in the Home app by long-pressing the accessory and selecting "Accessory Settings".


# Tested devices

The following devices have been tested with this plugin and confirmed to work:

| Model      | Features                                      |
|------------|-----------------------------------------------|
| CX5120/11  | Full support (thermostat, backlight, beep, oscillation, Auto+) |
| CX3120/01  | Thermostat, beep, oscillation, Auto+ (no backlight) |

# Supported clients

This plugin has been verified to work with the following apps/systems:

- iOS >= 13
- Apple Home
- Homebridge >= v1.8.0
- Node >= 22


# Contributing

> This project is heavily inspired by Seydx's [homebridge-philipsair-platform](https://github.com/SeydX/homebridge-philipsair-platform) and - Since the plugin didn't support heaters and coolers I extended it. The **homebridge-philips-air** was a very great help for the implementation!

**Contributors:**
- [Jeko](https://github.com/jeko) - CX3120 support, auto-detection of deviceId, phipsair verification, UI improvements

You can contribute to this homebridge plugin in following ways:

- Report issues and help verify fixes as they are checked in.
- Review the source code changes.
- Contribute bug fixes.
- Contribute changes to extend the capabilities
- Pull requests are accepted.

# Troubleshooting
If you have any issues with the plugin then you can run this plugin in debug mode, which will provide some additional information. This might be useful for debugging issues. Just open your config ui and set debug to true!

# Disclaimer

All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.

# License

### MIT License

Copyright (c) 2024 André Vieira

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
