"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AppComponent {
    static toDOM(html) {
        var d = document, i, a = d.createElement("div"), b = d.createDocumentFragment();
        a.innerHTML = html;
        while (i = a.firstChild)
            b.appendChild(i);
        return b;
    }
    constructor() {
    }
}
exports.AppComponent = AppComponent;
