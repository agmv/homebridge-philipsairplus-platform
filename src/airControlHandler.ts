import { ChildProcess, exec, spawn } from 'node:child_process';
import { IPv4Address, PlatformAccessory } from 'homebridge';

import { PhilipsAirPlusPlatform } from './platform';
import path from 'path';
import { fileURLToPath } from 'url';


export class AirControlHandler {
  manufacturer: string = 'Philips';
  serialNumber: string = '0000';
  private ipAddress: IPv4Address;
  private port: number;
  args: Array<string>;
  private airControl: ChildProcess | undefined;
  //private processTimeout!: NodeJS.Timeout;
  private shutdown: boolean = false;

  constructor(
        public readonly platform: PhilipsAirPlusPlatform,
        public readonly accessory: PlatformAccessory,
  ) {
    this.ipAddress = accessory.context.device.ip_address;
    this.port = accessory.context.device.port || 5683;
    this.serialNumber = accessory.context.device.serialNumber || '0000';
    const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
    const __dirname = path.dirname(__filename); // get the name of the directory
  
    this.args = [
      'python3',
      `${path.resolve(__dirname, '../')}/lib/pyaircontrol.py`,
      '-H',
      this.ipAddress,
      '-P',
      this.port.toString(),
      this.platform.config.debug ? '-D' : '',      
    ].filter((cmd) => cmd);   
    
    this.platform.api.on('shutdown', () => {
      this.kill(true);
    });
  }

  async onData(data: string) {
    this.platform.log.debug('onData:', JSON.stringify(data), this.accessory.displayName);
  };

  async onError(err: object) {
    this.platform.log.error(err.toString(), this.accessory.displayName);
  }

  sendCommand(args: unknown[], callback?: (data: string) => void, timeoutInSec?: number) {
    this.platform.log.debug(`CMD: ${args.join(' ')}`, this.accessory.displayName);
    return new Promise<void>((resolve, reject) => {
      exec(args.join(' '), (timeoutInSec) ? { timeout: timeoutInSec*60*1000 }: {}, (err, stdout, stderr) => {
        if (err) {
          this.platform.log.error(stderr, this.accessory.displayName);
          return reject(err);
        }
        if (stdout) {
          this.platform.log.debug('CMD response:', JSON.stringify(stdout), this.accessory.displayName);
        }
        if (callback) {
          callback(stdout);
        }
        resolve();
      });
    });
  }

  longPoll() {
    const args = [...this.args];
    args.push('status-observe', '-J');

    this.platform.log.debug('Starting poll:', args.join(' '), this.accessory.displayName);

    this.airControl = spawn(args.shift() as string, args, { stdio: ['ignore','pipe','inherit'] });

    if (this.airControl) {

      this.airControl.stdout?.on('data', this.onData.bind(this));

      this.airControl.stderr?.on('data', this.onError.bind(this));

      this.airControl.stderr?.on('exit', () => {
        this.platform.log.debug(
          `airControl process killed (${this.shutdown ? 'expected' : 'not expected'})`,
          this.accessory.displayName,
        );

        /*clearTimeout(this.processTimeout);

        if (!this.shutdown) {
          this.platform.log.debug('Restarting polling process', this.accessory.displayName);
        }*/
      });

      /*this.processTimeout = setTimeout(() => {
        this.platform.log.debug('Timeout!', this.airControl?.pid);
        if (this.airControl) {
          this.airControl.kill();
          this.airControl = undefined;
        }
        this.longPoll();
      }, 5 * 60 * 1000);*/
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