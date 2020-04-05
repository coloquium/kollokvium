"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppComponent_1 = require("./AppComponent");
class AppComponentToaster extends AppComponent_1.AppComponent {
    /**
     *
     *
     * @static
     * @returns {HTMLElement}
     * @memberof AppComponentToaster
     */
    static dungeonToaster(caption, message) {
        let p = `
        <div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-autohide="false">
        <div class="toast-header">
            <i class="fas fa-info-circle"></i>&nbsp;
              <strong class="mr-auto">${caption}</strong>         
          <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="toast-body">  
            <p>${message}</p>
            <button class="btn btn-primary btn-sm accept"> Accept</button>
            <button class="btn btn-danger btn-sm" decline>Decline</button>
        </div>
      </div>
    `;
        return this.toDOM(p);
    }
}
exports.AppComponentToaster = AppComponentToaster;
