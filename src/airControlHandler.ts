import { ChildProcess, exec, spawn } from 'node:child_process';
import { IPv4Address, PlatformAccessory } from 'homebridge';

import { PhilipsAirPlusPlatform } from './platform';
import path from 'path';
import { fileURLToPath } from 'url';


export abstract class AirControlHandler {
  manufacturer: string = 'Philips';
  serialNumber: string = '0000';
  ipAddress: IPv4Address;
  port: number;
  debug: boolean = false;
  args: Array<string>;
  private airControl: ChildProcess | undefined;
  private shutdown: boolean = false;

  constructor(
        public readonly platform: PhilipsAirPlusPlatform,
        public readonly accessory: PlatformAccessory,
  ) {
    this.ipAddress = accessory.context.device.ip_address;
    this.port = accessory.context.device.port || 5683;
    this.serialNumber = accessory.context.device.serialNumber || '0000';
    this.debug = accessory.context.device.debug || false;
    const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
    const __dirname = path.dirname(__filename); // get the name of the directory
  
    this.args = [
      'python3',
      '-u',
      `${path.resolve(__dirname, '../')}/lib/pyaircontrol.py`,
      '-H',
      this.ipAddress,
      '-P',
      this.port.toString(),
      this.debug ? '-D' : '',
    ].filter((cmd) => cmd);   
    
    this.platform.api.on('shutdown', () => {
      this.kill(true);
    });
  }

  abstract onData(data: string) : Promise<void>;
  abstract onCmdData(data: string) : Promise<void>;

  async onStdErrData(error: string) {
    error = error.toString();
    this.platform.log.debug('onStdErrData():', error, this.accessory.displayName);    
  }

  async onError(error: Error) {
    this.platform.log.error('onError():', error.message, error.stack, this.accessory.displayName);    
  }

  sendCommand(args: unknown[], timeoutInSec?: number) {
    this.platform.log.debug(`CMD: ${args.join(' ')}`, this.accessory.displayName);
    return new Promise<void>((resolve, reject) => {
      exec(args.join(' '), (timeoutInSec) ? { timeout: timeoutInSec*60*1000 }: {}, (err, stdout, stderr) => {
        if (err) {
          this.platform.log.error('CMD error:', stderr, this.accessory.displayName);
          return reject(err);
        }
        if (stdout) {
          this.platform.log.debug('CMD response:', stdout.toString(), this.accessory.displayName);
          this.onCmdData(stdout);
        }
        resolve();
      });
    });
  }

  longPoll() {
    const args = [...this.args];
    args.push('status-observe', '-J');

    this.platform.log.debug('Starting poll:', args.join(' '), this.accessory.displayName);

    this.airControl = spawn(args.shift() as string, args, { stdio: ['ignore','pipe','pipe'] });

    if (this.airControl) {

      this.airControl.stdout?.on('data', this.onData.bind(this));

      this.airControl.stderr?.on('data', this.onStdErrData.bind(this));

      this.airControl.stderr?.on('exit', () => {
        if (this.shutdown) {
          this.platform.log.debug('airControl process killed (expected)', this.accessory.displayName);
        } else {
          this.platform.log.error('airControl process killed (not expected)', this.accessory.displayName);
        }        
      });

      this.airControl.on('error', this.onError.bind(this));

    } else {
      this.platform.log.error('Failed to spawn process', this.accessory.displayName);
    }
  }


  kill(shutdown: boolean) {
    this.shutdown = shutdown || false;

    if (this.airControl) {
      this.platform.log.debug('Killing airControl process', this.accessory.displayName);
      this.airControl.kill();
      this.airControl = undefined;
    }
  }
  
}