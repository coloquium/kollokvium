/**
 *  Class enebales customization of "Kollokvium" for personal / corperate usage
 *
 * @export
 * @class AppDomain
 */
export class AppDomain {
    getSlug(value: string): string {
     return `${this.contextPrefix}-${value}`;
    }
    version:string;
    constructor(public domain: string, public contextPrefix: string) {
        this.version = "1.0.3";
    }
}
