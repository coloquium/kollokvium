export class AppComponent {
    static toDOM(html: string): any {
        var d = document, i, a = d.createElement("div"), b = d.createDocumentFragment();
        a.innerHTML = html;
        while (i = a.firstChild)
            b.appendChild(i);
        return b;
    }
    constructor(){
        
    }
}
