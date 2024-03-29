import { BrowserInfo } from "./BrowserInfo";
import { ILogger } from "./ILogger";
export class AppLogger implements ILogger {
  items: Map<
    string,
    {
      level: string;
      args: any;
      ts: number;
    }
  >;
  browsweInfo: BrowserInfo;
  os: string;

  constructor(public displayInConsole?: boolean) {
    this.items = new Map<
      string,
      {
        level: string;
        args: any;
        ts: number;
      }
    >();
    this.browsweInfo = BrowserInfo.getBrowser();
    this.os = BrowserInfo.getOS();
  }
  serialize(): Promise<string> {
    let p = new Promise<string>((resolve, reject) => {
      try {
        let logText = `<h1>AppLogger</h1>`;
        this.items.forEach((entry) => {
          logText += `<hr><h2>${new Date(entry.ts).toString()}</h2>`;
          logText += `<h3>${entry.level}</h4>`;
          logText += `<pre>${JSON.stringify(entry.args)}</pre>`;
        });
        resolve(logText);
      } catch (error) {
        reject(error);
      }
    });
    return p;
  }
  addItem(level: string, data: any): void {
    this.items.set(Math.random().toString(36).substr(2, 9), {
      args: data,
      ts: performance.now(),
      level: level,
    });
  }

  log(...args: any) {
    this.addItem("log", args);
    this.displayInConsole && console.log.apply(console, args);
  }
  error(...args: any) {
    this.addItem("error", args);
    this.displayInConsole && console.error.apply(console, args);
  }
  warning(...args: any) {
    this.addItem("warning", args);
    this.displayInConsole && console.warn.apply(console, args);
  }
  toString(): string {
    return JSON.stringify(this);
  }
  render(): HTMLElement {
    throw "not yet implemented";
  }
}
