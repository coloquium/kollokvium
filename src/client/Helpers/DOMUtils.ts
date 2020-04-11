export class DOMUtils {
    static get(query: string, parent?: Element): HTMLElement {
        return parent ? parent.querySelector(query) : document.querySelector(query)
    }
    static getAll(query: string, parent?: Element): Array<Element> {
        var results = new Array<Element>();
        let queryResult = parent ? parent.querySelectorAll(query) : document.querySelectorAll(query)
        for (let i = 0; i < queryResult.length; i++) results.push(queryResult.item(i));
        return results;
    }
    static create(p: string | HTMLElement, textContent?: string, attr?: Object): HTMLElement {
        let node: HTMLElement;
        typeof (p) === "string" ? node = document.createElement(p) : node = p;
        if (textContent)
            node.textContent = textContent;
        if (attr) {
            Object.keys(attr).forEach((k: string) => {
                node.setAttribute(k, attr[k]);
            });
        }
        return node;
    }
    
    static linkify(text:string) {
        const regex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return text.replace(regex, (url:string) => {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }
  
}

