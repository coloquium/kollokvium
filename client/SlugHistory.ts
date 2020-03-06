export class SlugHistory {
    history: Array<string>;
    constructor() {
        const ls = localStorage.getItem("slugHistory");
        if (ls) {
            this.history = JSON.parse(ls);
        }
        else {
            this.history = new Array<string>();
        }
    }
    getHistory(): Array<string> {
        return this.history;
    }
    addToHistory(slug: string) {
        if(this.history.includes(slug)) return;
        this.history.push(slug);
        localStorage.setItem("slugHistory", JSON.stringify(this.history));
    }
    clearHistory() {
        this.history = new Array<string>();
        localStorage.setItem("slugHistory", JSON.stringify(this.history));
    }
}
