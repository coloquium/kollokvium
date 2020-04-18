"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DOMUtils {
    static get(query, parent) {
        return parent ? parent.querySelector(query) : document.querySelector(query);
    }
    static getAll(query, parent) {
        var results = new Array();
        let queryResult = parent ? parent.querySelectorAll(query) : document.querySelectorAll(query);
        for (let i = 0; i < queryResult.length; i++)
            results.push(queryResult.item(i));
        return results;
    }
    static create(p, textContent, attr) {
        let node;
        typeof (p) === "string" ? node = document.createElement(p) : node = p;
        if (textContent)
            node.textContent = textContent;
        if (attr) {
            Object.keys(attr).forEach((k) => {
                node.setAttribute(k, attr[k]);
            });
        }
        return node;
    }
    static linkify(text) {
        const regex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(regex, (url) => {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }
}
exports.DOMUtils = DOMUtils;
