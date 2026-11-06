import { type API, type Characteristic, type DynamicPlatformPlugin,
  type Logging, type PlatformAccessory, type PlatformConfig, type Service } from 'homebridge';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { SmartFanHeaterAccessory } from './smartFanHeaterAccessory.js';

const execAsync = promisify(exec);

export enum DeviceType {
  heater,
  thermostat
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class PhilipsAirPlusPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: Map<string, PlatformAccessory> = new Map();
  public readonly discoveredCacheUUIDs: string[] = [];

  // Flag to track if phipsair is available
  private phipsairAvailable: boolean = false;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    log.debug('Config:', JSON.stringify(config));

    log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');

      // Check if phipsair is installed
      this.phipsairAvailable = await this.checkPhipsair();

      if (!this.phipsairAvailable) {
        log.error('phipsair is not installed! Please install it with: pip3 install phipsair');
        log.error('The plugin will not work without phipsair.');
        return;
      }

      // run the method to discover / register your devices as accessories
      await this.discoverDevices();
    });
  }

  /**
   * Check if phipsair is installed and available
   */
  async checkPhipsair(): Promise<boolean> {
    try {
      await execAsync('which phipsair');
      this.log.info('phipsair found');
      return true;
    } catch {
      // Try with python module check as fallback
      try {
        await execAsync('python3 -c "import phipsair"');
        this.log.info('phipsair module found');
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Fetch device info from IP address using phipsair
   */
  async fetchDeviceInfo(ipAddress: string, port: number = 5683): Promise<{ deviceId: string; model: string } | null> {
    try {
      this.log.info(`Fetching device info from ${ipAddress}:${port}...`);
      const { stdout } = await execAsync(`phipsair -H ${ipAddress} -P ${port} status -J`, { timeout: 30000 });

      const data = JSON.parse(stdout);

      if (data.DeviceId) {
        this.log.info(`Device detected: ${data.D01S05} (ID: ${data.DeviceId})`);
        return {
          deviceId: data.DeviceId,
          model: data.D01S05 || 'Unknown',
        };
      }

      return null;
    } catch (error) {
      const err = error as Error & { stderr?: string; stdout?: string; code?: number | string; killed?: boolean };
      this.log.error(`Failed to fetch device info from ${ipAddress}:`, err.message);
      if (err.killed) {
        this.log.error('phipsair timed out after 30s (no answer from the device on UDP port ' + port + ')');
      }
      if (err.code !== undefined) {
        this.log.error(`phipsair exit code: ${err.code}`);
      }
      if (err.stderr?.trim()) {
        this.log.error(`phipsair stderr: ${err.stderr.trim()}`);
      }
      if (err.stdout?.trim()) {
        this.log.error(`phipsair stdout: ${err.stdout.trim()}`);
      }
      return null;
    }
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    
    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    // loop over the discovered devices and register each one if it has not already been registered
    for (const device of this.config.devices) {
      this.log.debug('Processing device:', JSON.stringify(device));

      if (!device.active) {
        this.log.debug('Device inactive, continuing...');
        continue;
      }

      // Auto-detect deviceId if not provided
      let deviceId = device.deviceId;
      if (!deviceId && device.ip_address) {
        this.log.info(`No deviceId provided for ${device.name}, attempting auto-detection...`);
        let info = null;
        for (let attempt = 1; attempt <= 3 && !info; attempt++) {
          if (attempt > 1) {
            this.log.warn(`Retrying auto-detection for ${device.name} (attempt ${attempt}/3)...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
          info = await this.fetchDeviceInfo(device.ip_address, device.port || 5683);
        }

        if (info) {
          deviceId = info.deviceId;
          device.deviceId = deviceId; // Store for future use
          this.log.info(`Auto-detected deviceId: ${deviceId}`);
        } else {
          // Fall back to the deviceId of a cached accessory with the same IP, so a temporary
          // failure does not make the accessory disappear from HomeKit.
          for (const cached of this.accessories.values()) {
            const cachedDevice = cached.context.device;
            if (cachedDevice?.deviceId && cachedDevice.ip_address === device.ip_address) {
              deviceId = cachedDevice.deviceId;
              device.deviceId = deviceId;
              this.log.warn(`Auto-detection failed for ${device.name}, using cached deviceId: ${deviceId}`);
              break;
            }
          }
        }

        if (!deviceId) {
          this.log.error(`Failed to auto-detect deviceId for ${device.name}. Please check the IP address or provide deviceId manually.`);
          continue;
        }
      }

      if (!deviceId) {
        this.log.error(`No deviceId for ${device.name} and no ip_address to auto-detect. Skipping.`);
        continue;
      }

      // generate a unique id for the accessory this should be generated from
      // something globally unique, but constant, for example, the device serial
      // number or MAC address
      const uuid = this.api.hap.uuid.generate(deviceId);


      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.get(uuid);

      if (existingAccessory) {
        // the accessory already exists
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
        this.log.debug('Updating existing accessory from cache:', JSON.stringify(existingAccessory.context.device), JSON.stringify(device));
        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new SmartFanHeaterAccessory(this, existingAccessory);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info('Adding new accessory:', device.name);

        // create a new accessory
        const accessory = new this.api.platformAccessory(device.name, uuid);

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.device = device;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new SmartFanHeaterAccessory(this, accessory);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      // push into discoveredCacheUUIDs
      this.discoveredCacheUUIDs.push(uuid);
    }

    // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
    // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
    // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
    for (const [uuid, accessory] of this.accessories) {
      if (!this.discoveredCacheUUIDs.includes(uuid)) {
        this.log.info('Removing existing accessory from cache:', accessory.displayName);
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
