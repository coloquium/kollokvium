"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *  Class enebales customization of "Kollokvium" for personal / corperate usage
 *
 * @export
 * @class AppDomain
 */
class AppDomain {
    constructor(domain, contextPrefix) {
        this.domain = domain;
        this.contextPrefix = contextPrefix;
        this.version = "1.0.3";
    }
    getSlug(value) {
        return `${this.contextPrefix}-${value}`;
    }
}
exports.AppDomain = AppDomain;
