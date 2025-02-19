import { PlatformAccessory, Service, type CharacteristicValue } from 'homebridge';

import { PhilipsAirPlusPlatform } from './platform.js';
import { AirControlHandler } from './airControlHandler.js';
import { Mode, SmartFanHeater, Swing } from './types/SmartFanHeater.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HeaterCoolerAccessory extends AirControlHandler {
  private heaterCoolerService: Service | undefined;
  private lightService: Service | undefined;
  private beepService: Service | undefined;
  private autoPlusAIService: Service | undefined;

  obj?: SmartFanHeater = undefined;

  constructor(
    public readonly platform: PhilipsAirPlusPlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    super(platform, accessory);
    // read status from device
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

  async initAccessory() {
    try {     
      const args = [...this.args];
      args.push('status', '-J');
      await this.sendCommand(args, 60, true);      
    } catch (error) {
      this.handleError(error,'initAccessory():');
    }
  }  

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setActive(value: CharacteristicValue) {    
    if (this.heaterCoolerService && this.obj) {
      this.platform.log.debug(`setActive(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03102=${value}`,'-I');
        this.obj.setActive(value as number);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.Active, value);        
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
    if (this.heaterCoolerService && this.obj) {
      this.platform.log.debug(`setSwingMode(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D0320F=${(value as number * this.obj.SwingModeSetValue)}`,'-I');
        this.obj.setSwingMode(value as number);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.SwingMode, value);        
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
      this.platform.log.debug(`setLight(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03105=${value}`,'-I');
        this.obj.setLightStatus(value as number);
        this.lightService.updateCharacteristic(this.platform.Characteristic.On, value);        
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
      this.platform.log.debug(`setBeep(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03130=${(value as number > 0)?100:0}`,'-I');
        this.obj.setBeepStatus(value as number);
        this.beepService.updateCharacteristic(this.platform.Characteristic.On, value);        
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
      this.platform.log.debug(`setAutoPlusAI(${value})`, this.accessory.displayName);
    
      try {
        const args = [...this.args];
        args.push('set', `D03180=${value}`,'-I');
        this.obj.setAutoPlusAIStatus(value as number);
        this.autoPlusAIService.updateCharacteristic(this.platform.Characteristic.On, value);        
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
    if (this.heaterCoolerService && this.obj) {
      this.platform.log.debug(`setTemperatureUnits(${value})`, this.accessory.displayName);
    
      try {
        this.obj.setTemperatureUnit(value as number);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, value);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.obj.getCurrentTemp());
        const c = this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature);
        if (c) {
          this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, 
            this.obj.getTargetTemperature());
        }
      } catch (error) {
        this.handleError(error, `setTemperatureUnits(${value}):`);
      }
    } else {
      this.platform.log.error(`setTemperatureUnits(${value}): No service or object`, this.accessory.displayName);
    }
  }

  async onCmdData(data: string, startPoll: boolean) {
    data = data.toString().replace(/\n$/, '');
    this.platform.log.debug('onCmdData:', data, this.accessory.displayName);
    try {
      this.obj = new SmartFanHeater(this.platform, data);      
    
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.manufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.obj.getModel())
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.serialNumber)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.obj.getFirmware());
      
      // get the HeaterCooler service if it exists, otherwise create a new HeaterCooler service
      this.heaterCoolerService = this.accessory.getService(this.platform.Service.HeaterCooler) || 
      this.accessory.addService(this.platform.Service.HeaterCooler, this.obj.getName());

      const mode = this.obj.getMode();
      const tempCharacteristic = this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits) ||
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 
          this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);

      this.obj.setTemperatureUnit(tempCharacteristic.value || this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
      tempCharacteristic
        .onSet(this.setTemperatureUnits.bind(this));

      // Required Characteristics
      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/HeaterCooler

      this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.Active, 
        this.obj.getActive() ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE);

      // register handlers for the Active/Inactive Characteristic
      this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.Active)
        .onSet(this.setActive.bind(this));

      switch(mode) {
      case Mode.auto:
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.AUTO);
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.obj.getTargetTemperature());
        break;
      case Mode.ventilation:
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.IDLE);
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.COOL);
        break;
      default:
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.HEAT);
        break;
      }
      
      this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.CurrentTemperature, this.obj.getCurrentTemp());

      // Optional Characteristics

      this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.Name, this.obj.getName());
      
      this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.SwingMode, 
        this.obj.getSwingMode() === Swing.on ? this.platform.Characteristic.SwingMode.SWING_ENABLED : 
          this.platform.Characteristic.SwingMode.SWING_DISABLED);

      // register handlers for the SwingMode Characteristic
      this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.SwingMode)
        .onSet(this.setSwingMode.bind(this));


      // Map backligh to a Lightbulb
      // get the Lightbulb service if it exists, otherwise create a new Lightbulb service    
      this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
        this.accessory.addService(this.platform.Service.Lightbulb, 'Backlight');

      // Required Characteristics
      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Lightbulb
      this.lightService.setCharacteristic(this.platform.Characteristic.On, this.obj.getLightStatus() ? 1 : 0);

      this.lightService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setLight.bind(this));

      // Optional Characteristics
      this.lightService.setCharacteristic(this.platform.Characteristic.Name, 'Backlight');

      // Map the beep function to a Switch
      // get the Beep Switch service if it exists, otherwise create a new Switch service    
      this.beepService = this.accessory.getService('Beep') ||
        this.accessory.addService(this.platform.Service.Switch, 'Beep', 'BEEP');

      // Required Characteristics
      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Switch
      this.beepService.setCharacteristic(this.platform.Characteristic.On, this.obj.getBeepStatus());

      this.beepService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setBeep.bind(this));

      // Optional Characteristics
      this.beepService.setCharacteristic(this.platform.Characteristic.Name, 'Beep');
      
      // Map the Auto+ AI function to a Switch
      // get the Auto Plus Switch service if it exists, otherwise create a new Switch service    
      this.autoPlusAIService = this.accessory.getService('Auto Plus AI') ||
        this.accessory.addService(this.platform.Service.Switch, 'Auto Plus AI', 'AUTO_PLUS_AI');

      // Required Characteristics
      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Switch
      this.autoPlusAIService.setCharacteristic(this.platform.Characteristic.On, this.obj.getAutoPlusAIStatus());

      this.autoPlusAIService.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setAutoPlusAI.bind(this));

      // Optional Characteristics
      this.autoPlusAIService.setCharacteristic(this.platform.Characteristic.Name, 'Auto Plus AI');

      // Start Polling
      if (startPoll) {
        this.longPoll();
      }
    
    } catch(error) {
      this.handleError(error, 'onCmdData(...):');
    }
  }

  async onData(data: string) {
    data = data.toString().replace(/\n$/, '');
    this.platform.log.debug(`onData: ${data}`, this.accessory.displayName);
    try {

      // get the HeaterCooler service if it exists, otherwise create a new HeaterCooler service
      // you can create multiple services for each accessory
      this.heaterCoolerService = this.accessory.getService(this.platform.Service.HeaterCooler) || 
        this.accessory.addService(this.platform.Service.HeaterCooler);

      // Update object
      if (this.obj) {
        this.obj.updateObj(data);
      } else {
        this.obj = new SmartFanHeater(this.platform, data);
        const tempCharacteristic = this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits) ||
        this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits, 
          this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
        this.obj.setTemperatureUnit(tempCharacteristic.value || this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS);
      }

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .updateCharacteristic(this.platform.Characteristic.FirmwareRevision, this.obj.getFirmware());


    
      const mode = this.obj.getMode();
      const c = this.heaterCoolerService.getCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature);
            
      // Required Characteristics
      this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.Active, 
        this.obj.getActive() ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE );

      switch(mode) {
      case Mode.auto:
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.AUTO);
        // Threshold is optional and only set if Mode is Auto
        if (c) {
          this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.obj.getTargetTemperature());
        } else {
          this.heaterCoolerService.setCharacteristic(this.platform.Characteristic.HeatingThresholdTemperature, this.obj.getTargetTemperature());
        }      
        break;
      case Mode.ventilation:
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.IDLE);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.COOL);
        if (c) {
          this.heaterCoolerService.removeCharacteristic(c);
        }
        break;
      default:
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.CurrentHeaterCoolerState,
          this.platform.Characteristic.CurrentHeaterCoolerState.HEATING);
        this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.TargetHeaterCoolerState, 
          this.platform.Characteristic.TargetHeaterCoolerState.HEAT);
        if (c) {
          this.heaterCoolerService.removeCharacteristic(c);
        }
        break;
      }

      this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.obj.getCurrentTemp());

      // Optional Characteristics
      this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.Name, this.obj.getName());
      
      this.heaterCoolerService.updateCharacteristic(this.platform.Characteristic.SwingMode, 
        this.obj.getSwingMode() === Swing.on ? this.platform.Characteristic.SwingMode.SWING_ENABLED : 
          this.platform.Characteristic.SwingMode.SWING_DISABLED);            

      // Light and buttons     
      this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
        this.accessory.addService(this.platform.Service.Lightbulb);

      this.lightService.updateCharacteristic(this.platform.Characteristic.On, this.obj.getLightStatus());

      this.beepService = this.accessory.getService('Beep') ||
        this.accessory.addService(this.platform.Service.Switch, 'Beep', 'BEEP');

      this.beepService.updateCharacteristic(this.platform.Characteristic.On, this.obj.getBeepStatus());
      
      this.autoPlusAIService = this.accessory.getService('Auto Plus AI') ||
        this.accessory.addService(this.platform.Service.Switch, 'Auto Plus AI', 'AUTO_PLUS_AI');

      this.autoPlusAIService.updateCharacteristic(this.platform.Characteristic.On, this.obj.getAutoPlusAIStatus());

    } catch(error) {
      this.handleError(error, 'onData(...):');
    }
  }
}

