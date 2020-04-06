export class SlugHistory {
    history: Array<string>;
    constructor() {
      
    }
    getHistory(): Array<string> {
        return this.history;
    }
    addToHistory(slug: string) {
        if(this.history.includes(slug)) return;
        this.history.push(slug);
    }
    clearHistory() {
        this.history = new Array<string>();
    }
}
