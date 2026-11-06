import { PlatformAccessory, Service, type CharacteristicValue } from 'homebridge';

import { PhilipsAirPlusPlatform } from './platform.js';
import { AirControlHandler } from './airControlHandler.js';
import { DeviceModel, Mode, SmartFanHeater } from './types/SmartFanHeater.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class SmartFanHeaterAccessory extends AirControlHandler {
  private thermostatService: Service | undefined;
  private swingService: Service | undefined;
  private lightService: Service | undefined;
  private beepService: Service | undefined;
  private autoPlusAIService: Service | undefined;
  private obj?: SmartFanHeater = undefined;

  // Configuration options
  private enableBacklight: boolean;
  private enableBeep: boolean;
  private deviceModelOverride?: DeviceModel;

  constructor(
    public readonly platform: PhilipsAirPlusPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);

    // Read configuration options
    const device = accessory.context.device;
    this.enableBacklight = device.enableBacklight ?? true;
    this.enableBeep = device.enableBeep ?? true;
    // "auto" means auto-detect, so we don't set an override
    this.deviceModelOverride = (device.model && device.model !== 'auto') ? device.model as DeviceModel : undefined;

    // Auto-disable features not supported by CX3120
    if (this.deviceModelOverride === DeviceModel.CX3120) {
      this.enableBacklight = false;
      // Beep is supported on CX3120
    }

    this.initAccessory();
  }

  handleError(error: unknown, message?: string) {
    if (typeof error === 'string') {
      this.platform.log.error('handleError():', message!, error, this.accessory.displayName);
    } else if (error instanceof Error) {
      this.platform.log.error('handleError():', message!,(error as Error).message, (error as Error).stack, this.accessory.displayName);
    } else {
      this.platform.log.error('handleError(): Error with unknown type.', JSON.stringify(error), this.accessory.displayName);
    }
  }

  initAccessory() {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '')
      .setCharacteristic(this.platform.Characteristic.Model, 'Philips Air+ Smart Fan Heater');
    
    // Thermostat
    this.thermostatService = this.accessory.getService(this.platform.Service.Thermostat) || 
      this.accessory.addService(this.platform.Service.Thermostat, this.displayName );
    
    this.thermostatService.setCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState, 
      this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
    this.thermostatService.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onSet(this.setCurrentHeatingCoolingState.bind(this));

    this.thermostatService.setCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 
      this.platform.Characteristic.TargetHeatingCoolingState.OFF);
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onSet(this.setTargetHeatingCoolingState.bind(this));    
    
    this.thermostatService.setCharacteristic(this.platform.Characteristic.CurrentTemperature, 0);
    
    this.thermostatService.setCharacteristic(this.platform.Characteristic.TargetTemperature, 20);
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .setProps({ minStep: 1 })
      .onSet(this.setTargetTemperature.bind(this));
    
    this.thermostatService.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits,
      this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
    
    this.thermostatService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onSet(this.setTemperatureUnits.bind(this));

    this.thermostatService.setCharacteristic(this.platform.Characteristic.Name, this.displayName);
      
    // Swing/Oscillation switch
    // Remove old service if exists with old name
    const oldSwingService = this.accessory.getService('Swing');
    if (oldSwingService) {
      this.accessory.removeService(oldSwingService);
    }
    this.swingService = this.accessory.getService('Oscillation') ||
      this.accessory.addService(this.platform.Service.Switch, 'Oscillation', 'SWING');

    this.swingService.setCharacteristic(this.platform.Characteristic.On, false);
    this.swingService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setSwingMode.bind(this));

    // Backlight (optional - not available on all models like CX3120)
    if (this.enableBacklight) {
      this.lightService = this.accessory.getService('Backlight') ||
        this.accessory.addService(this.platform.Service.Lightbulb, 'Backlight', 'BACKLIGHT');

      this.lightService.setCharacteristic(this.platform.Characteristic.On, false);
      this.lightService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setLight.bind(this));
    } else {
      // Remove the service if it exists but is disabled
      const existingService = this.accessory.getService('Backlight');
      if (existingService) {
        this.platform.log.info('Removing Backlight service (disabled in config)', this.accessory.displayName);
        this.accessory.removeService(existingService);
      }
    }


    // Beep switch (optional - not available on all models like CX3120)
    if (this.enableBeep) {
      this.beepService = this.accessory.getService('Beep') ||
        this.accessory.addService(this.platform.Service.Switch, 'Beep', 'BEEP');

      this.beepService.setCharacteristic(this.platform.Characteristic.On, false);
      this.beepService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setBeep.bind(this));
    } else {
      // Remove the service if it exists but is disabled
      const existingBeepService = this.accessory.getService('Beep');
      if (existingBeepService) {
        this.platform.log.info('Removing Beep service (disabled or not supported)', this.accessory.displayName);
        this.accessory.removeService(existingBeepService);
      }
    }

    // Auto+ AI switch
    // Remove old service if exists with old name
    // ('Auto+' is also invalid for HAP: a name must end with a letter or number)
    for (const oldName of ['Auto Plus AI', 'Auto+']) {
      const oldAutoPlusService = this.accessory.getService(oldName);
      if (oldAutoPlusService) {
        this.accessory.removeService(oldAutoPlusService);
      }
    }
    this.autoPlusAIService = this.accessory.getService('Auto Plus') ||
      this.accessory.addService(this.platform.Service.Switch, 'Auto Plus', 'AUTO_PLUS_AI');

    this.autoPlusAIService.setCharacteristic(this.platform.Characteristic.On, false);
    this.autoPlusAIService.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setAutoPlusAI.bind(this));

    this.longPoll();
  
  }  

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setActive(value: CharacteristicValue) {    
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setActive(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03102=${value}`,'-I');
        this.obj.setActive(value as number);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setActive(${value}):`);
      }
    } else {
      this.platform.log.error(`setActive(${value}): No service or object`, this.accessory.displayName);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setSwingMode(value: CharacteristicValue) {
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setSwingMode(${value})`, this.accessory.displayName);

      try {
        const args = [...this.args];
        const enabled = value as boolean;
        const swingValue = enabled ? this.obj.swingConfig.setMultiplier : 0;
        args.push('set', `D0320F=${swingValue}`, '-I');
        this.obj.setSwingMode(enabled);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setSwingMode(${value}):`);
      }
    } else {
      this.platform.log.error(`setSwingMode(${value}): No service or object`, this.accessory.displayName);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setLight(value: CharacteristicValue) {    
    if (this.lightService && this.obj) {
      this.platform.log.info(`setLight(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03105=${value}`,'-I');
        this.obj.setLightStatus(value as number);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setLight(${value}):`);
      }
    } else {
      this.platform.log.error(`setLight(${value}): No service or object`, this.accessory.displayName);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setBeep(value: CharacteristicValue) {    
    if (this.beepService && this.obj) {
      this.platform.log.info(`setBeep(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03130=${(value as number > 0)?100:0}`,'-I');
        this.obj.setBeepStatus(value as number);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setBeep(${value}):`);
      }
    } else {
      this.platform.log.error(`setBeep(${value}): No service or object`, this.accessory.displayName);
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setAutoPlusAI(value: CharacteristicValue) {    
    if (this.autoPlusAIService && this.obj) {
      this.platform.log.info(`setAutoPlusAI(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03180=${value}`,'-I');
        this.obj.setAutoPlusAIStatus(value as number);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setAutoPlusAI(${value}):`);
      }
    } else {
      this.platform.log.error(`setAutoPlusAI(${value}): No service or object`, this.accessory.displayName);
    }
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setTemperatureUnits(value: CharacteristicValue) {
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setTemperatureUnits(${value})`, this.accessory.displayName);
    
      try {
        this.obj.setTemperatureUnit(value as number);
        this.thermostatService.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, value);
        this.thermostatService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.obj.getCurrentTemp());
        this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, this.obj.getTargetTemperature());        
      } catch (error) {
        this.handleError(error, `setTemperatureUnits(${value}):`);
      }
    } else {
      this.platform.log.error(`setTemperatureUnits(${value}): No service or object`, this.accessory.displayName);
    }
  }


  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setTargetTemperature(value: CharacteristicValue) {    
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setTargetTemperature(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D0310E=${value}`,'-I');
        this.obj.setTargetTemperature(value as number);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setTargetTemperature(${value}):`);
      }
    } else {
      this.platform.log.error(`setTargetTemperature(${value}): No service or object`, this.accessory.displayName);
    }
  }

  
  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setMode(value: Mode) {    
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setMode(${value})`, this.accessory.displayName);
      
      try {
        const args = [...this.args];
        args.push('set', `D0310C=${value}`,'-I');
        this.obj.setMode(value);
        await this.sendCommand(args, 60);
      } catch (error) {
        this.handleError(error, `setMode(${value}):`);
      }
    } else {
      this.platform.log.error(`setMode(${value}): No service or object`, this.accessory.displayName);
    }
  }

  async setCurrentHeatingCoolingState(value: CharacteristicValue) {
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setCurrentHeatingCoolingState(${value})`, this.accessory.displayName);
      switch(value){
      case this.platform.Characteristic.CurrentHeatingCoolingState.OFF:
        await this.setActive(this.platform.Characteristic.Active.INACTIVE);
        break;
      case this.platform.Characteristic.CurrentHeatingCoolingState.COOL:
        await this.setActive(this.platform.Characteristic.Active.ACTIVE);
        await this.setMode(Mode.ventilation);
        break;
      case this.platform.Characteristic.CurrentHeatingCoolingState.HEAT:
        await this.setActive(this.platform.Characteristic.Active.ACTIVE);
        await this.setMode(Mode.high);
        break;
      }
    } else {
      this.platform.log.error(`setCurrentHeatingCoolingState(${value}): No service or object`, this.accessory.displayName);
    }
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    if (this.thermostatService && this.obj) {
      this.platform.log.info(`setTargetHeatingCoolingState(${value})`, this.accessory.displayName);

      switch(value){
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        await this.setActive(this.platform.Characteristic.Active.INACTIVE);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        await this.setActive(this.platform.Characteristic.Active.ACTIVE);
        await this.setMode(Mode.ventilation);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        await this.setActive(this.platform.Characteristic.Active.ACTIVE);
        await this.setMode(Mode.high);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        await this.setActive(this.platform.Characteristic.Active.ACTIVE);
        await this.setMode(Mode.auto);
        break;
      }

    } else {
      this.platform.log.error(`setTargetHeatingCoolingState(${value}): No service or object`, this.accessory.displayName);
    }
  }

  async onCmdData(data: string) {
    data = data.toString().replace(/\n$/, '');
    this.platform.log.debug('onCmdData:', data, this.accessory.displayName);
    if (data !== '') {
      this.platform.log.error('OnCmdData()', data, this.accessory.displayName);
    } else {
      this.platform.log.success('OnCmdData()', this.accessory.displayName);
    }
  }

  async onPollData(data: string) {
    data = data.toString().replace(/\n$/, '');
    this.platform.log.debug('onPollData', this.accessory.displayName);
    this.platform.log.debug(`onPollData: ${data}`, this.accessory.displayName);
    try {
      // Update object
      if (this.obj) {
        this.obj.updateObj(data);
      } else {
        this.obj = new SmartFanHeater(this.platform, data, this.deviceModelOverride);
        this.platform.log.info(`Device model detected: ${this.obj.getDeviceModel()}`, this.accessory.displayName);
      }

      // update accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .updateCharacteristic(this.platform.Characteristic.FirmwareRevision, this.obj.getFirmware())
        .updateCharacteristic(this.platform.Characteristic.Model, this.obj.getModel());
            
      // Required Characteristics
      if (!this.obj.getActive()) {
        this.thermostatService!.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
          this.platform.Characteristic.CurrentHeatingCoolingState.OFF);
        this.thermostatService!.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 
          this.platform.Characteristic.TargetHeatingCoolingState.OFF);
      } else {
        switch(this.obj.getMode()) {
        case Mode.auto:
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
            this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 
            this.platform.Characteristic.TargetHeatingCoolingState.AUTO);
          break;
        case Mode.ventilation:
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
            this.platform.Characteristic.CurrentHeatingCoolingState.COOL);
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 
            this.platform.Characteristic.TargetHeatingCoolingState.COOL);
          break;
        default:
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState,
            this.platform.Characteristic.CurrentHeatingCoolingState.HEAT);
          this.thermostatService!.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState, 
            this.platform.Characteristic.TargetHeatingCoolingState.HEAT);
          break;
        }
      }
      this.thermostatService!.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.obj.getCurrentTemp());      
      this.thermostatService!.updateCharacteristic(this.platform.Characteristic.TargetTemperature, this.obj.getTargetTemperature());
      
      // Optional Characteristics
      this.thermostatService!.updateCharacteristic(this.platform.Characteristic.Name, this.obj.getName());

      // Light and buttons
      this.swingService!.updateCharacteristic(this.platform.Characteristic.On, this.obj.isSwingEnabled());

      if (this.lightService) {
        this.lightService.updateCharacteristic(this.platform.Characteristic.On, this.obj.getLightStatus());
      }

      if (this.beepService) {
        this.beepService.updateCharacteristic(this.platform.Characteristic.On, this.obj.getBeepStatus());
      }

      this.autoPlusAIService!.updateCharacteristic(this.platform.Characteristic.On, this.obj.getAutoPlusAIStatus());

    } catch(error) {
      this.handleError(error, 'onPollData(...):');
    }
  }
}

