import { AppComponent } from './AppComponent';
export class AppComponentToaster extends AppComponent {
  /**
   * 
   *
   * @static
   * @returns {HTMLElement}
   * @memberof AppComponentToaster
   */
  static dungeonToaster(caption: string, message: string): DocumentFragment {
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
    console.log("rendering");
    return this.toDOM(p);
  }
}

