export interface ILogger {
    log(...args: Array<any>);
    error(...args: Array<any>);
    warning(...args: Array<any>);
}
