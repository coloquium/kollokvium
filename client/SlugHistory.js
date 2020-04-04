"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SlugHistory {
    constructor() {
    }
    getHistory() {
        return this.history;
    }
    addToHistory(slug) {
        if (this.history.includes(slug))
            return;
        this.history.push(slug);
    }
    clearHistory() {
        this.history = new Array();
    }
}
exports.SlugHistory = SlugHistory;
