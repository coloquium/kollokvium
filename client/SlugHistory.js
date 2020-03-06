"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SlugHistory {
    constructor() {
        const ls = localStorage.getItem("slugHistory");
        if (ls) {
            this.history = JSON.parse(ls);
        }
        else {
            this.history = new Array();
        }
    }
    getHistory() {
        return this.history;
    }
    addToHistory(slug) {
        if (this.history.includes(slug))
            return;
        this.history.push(slug);
        localStorage.setItem("slugHistory", JSON.stringify(this.history));
    }
    clearHistory() {
        this.history = new Array();
        localStorage.setItem("slugHistory", JSON.stringify(this.history));
    }
}
exports.SlugHistory = SlugHistory;
