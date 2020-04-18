"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppComponent_1 = require("./AppComponent");
const greenscreenstream_1 = require("greenscreenstream");
const DOMUtils_1 = require("../Helpers/DOMUtils");
class GreenScreenComponent extends AppComponent_1.AppComponent {
    constructor(id) {
        super();
        this.id = id;
        this.backgrounds = new Array();
        this.backgrounds.push('/img/greenscreen/costarica.jpg');
        this.backgrounds.push('/img/greenscreen/desert.jpg');
        this.backgrounds.push('/img/greenscreen/beach.jpg');
        this.background = this.backgrounds[0]; // set first as default
    }
    start(src) {
        this.gss = new greenscreenstream_1.GreenScreenStream(true, src);
        this.gss.addVideoTrack(this.mediaTrack);
        let v = document.querySelector("video#preview");
        v.srcObject = this.getMediaStream();
        // this.handle = window.setInterval(() => {
        //     //$("span.detected-color").remove(); // hack
        //     this.gss.getColorsFromStream().palette.forEach((color: Array<number>, index: number) => {
        //         let span = document.createElement("span");
        //         span.classList.add("badge", "detected-color", "mr-2");
        //         span.textContent = (6-index).toString();
        //         span.style.background = `rgb(${color[0]},${color[1]},${color[2]})`;
        //         span.addEventListener("click", () => {
        //             this.gss.setChromaKey(color[0] / 255, color[1] / 255, color[2] / 255);
        //         });
        //         document.querySelector("#palette").append(span);
        //     });
        // }, 2000);
    }
    stop() {
        //clearInterval(this.handle);
        let v = document.querySelector("video#preview");
        v.pause();
        this.gss = undefined;
    }
    getMediaStream(fps) {
        this.gss.render(fps);
        this.capturedStream = this.gss.captureStream(fps);
        return this.capturedStream;
    }
    setMediaTrack(videoTrack) {
        this.mediaTrack = videoTrack;
    }
    renderImages() {
        let html = '';
        this.backgrounds.forEach((src) => {
            html += ` <li class="media">
            <img class="mr-3 mb-3 greenscreen-option" src="${src}" >
            </li>`;
        });
        return html;
    }
    render(el) {
        let html = `
        <div class="modal" tabindex="-1" role="dialog" id="${this.id}">
        <div class="modal-dialog modal-xl" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Green screen settings <span class="ml-2 badge badge-primary">Beta</span></h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
                <div class="row">
                <div class="col-md-3">
                <h5>Backgrounds</h5>
                <ul class="list-unstyled">
                     ${this.renderImages()}
                </ul>
                </div>
                <div class="col-md-9">
                <h5>Preview</h5>
                <video width="800" height="450" id="preview" autoplay muted class="img-thumbnail greenscreen-preview -mt-2"
                poster="https://via.placeholder.com/800x450.png?text=Select an image to start...">
                </video>
             
                </div>
            </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary">Apply</button>
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`;
        let dom = AppComponent_1.AppComponent.toDOM(html);
        let opts = DOMUtils_1.DOMUtils.getAll(".greenscreen-option", dom);
        opts.forEach((el) => {
            el.addEventListener("click", () => {
                this.start(el.src);
            });
        });
        DOMUtils_1.DOMUtils.get(".btn-primary", dom).addEventListener("click", () => {
            this.onApply(this.capturedStream);
        });
        DOMUtils_1.DOMUtils.get(".btn-secondary", dom).addEventListener("click", () => {
            this.stop();
        });
        return dom;
    }
    onApply(capturedStream) {
        throw new Error("Method not implemented.");
    }
}
exports.GreenScreenComponent = GreenScreenComponent;
