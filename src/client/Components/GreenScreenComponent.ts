import { AppComponent } from './AppComponent';
import { GreenScreenMethod, GreenScreenStream } from 'greenscreenstream';
import { DOMUtils } from '../Helpers/DOMUtils';
import { Utils } from 'thor-io.client-vnext';
export class GreenScreenComponent extends AppComponent {


    backgrounds: Array<string>;

    background: string;

    mediaTrack: MediaStreamTrack;

    gss: GreenScreenStream;
    handle: number;
    capturedStream: MediaStream;
    canvas: HTMLCanvasElement;
    fps: number;

    constructor(public id: string) {
        super()

        this.backgrounds = new Array<string>();

        this.backgrounds.push('/img/greenscreen/costarica.jpg');
        this.backgrounds.push('/img/greenscreen/desert.jpg');
        this.backgrounds.push('/img/greenscreen/beach.jpg');
        this.background = this.backgrounds[0]; // set first as default
        this.canvas =document.createElement("canvas") as HTMLCanvasElement;
        this.canvas.width = 640; this.canvas.height = 360;

    }

    stop(){
        this.gss.stop();
    }
    
    init(src: string,_fps:number = 25) {
       
        this.fps = _fps;        
        this.gss = new GreenScreenStream(GreenScreenMethod.VirtualBackground,this.canvas,this.canvas.width,this.canvas.height);

        this.gss.bufferVert =`
        uniform float time;
        uniform vec2 resolution;   
        uniform sampler2D webcam;
        uniform sampler2D background;
        uniform vec4 chromaKey; 
        uniform vec2 maskRange;
        out vec4 fragColor;
        void mainImage( out vec4 fragColor, in vec2 fragCoord )
            {
                vec2 q = 1. -fragCoord.xy / resolution.xy;                
                vec3 bg = texture( background, q ).xyz;
                vec3 fg = texture( webcam, q ).xyz;                
                vec3 dom = vec3(0,1.0,0);                
                float maxrb = max( fg.r, fg.b );                
                float k = clamp( (fg.g-maxrb)*5.0, 0.0, 1.0 );            
                float dg = fg.g;                 
                fg.g = min( fg.g, maxrb*0.8 ); 
                fg += dg - fg.g;
                fragColor = vec4( mix(fg, bg, k), 1.0 );
            }
            void main(){    
                mainImage(fragColor,gl_FragCoord.xy);      
            }        
        `;
       
        this.gss.initialize(src).then ( p => {
            console.log(src);
            this.gss.addVideoTrack(this.mediaTrack).then( s => {
                    const v = DOMUtils.get<HTMLVideoElement>("video#preview");
                    this.capturedStream = this.gss.captureStream(this.fps);  
                    v.srcObject =  this.capturedStream; 
                    this.gss.start(_fps);
            });
        
        }).catch(err => {
            console.error(err)
        })
    }
  

    setMediaTrack(videoTrack: MediaStreamTrack) {
        this.mediaTrack = videoTrack;
    }

    private renderImages(): string {
        let html = ''
        this.backgrounds.forEach((src: string) => {
            html += ` <li class="media">
            <img class="mr-3 mb-3 greenscreen-option" src="${src}" >
            </li>`
        });
        return html;
    }

    render(el?: HTMLElement) {
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
                <video width="640" height="360" id="preview" autoplay muted class="img-thumbnail greenscreen-preview -mt-2"
                poster="/img/800x450.png">
                </video>
             
                </div>
            </div>

            </div>
            <div class="modal-footer" id="gss-action">
              <button type="button" class="btn btn-primary" id="apply-virtualbg">Apply</button>
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`



        let dom = AppComponent.toDOM(html) as HTMLElement;

        let opts = DOMUtils.getAll(".greenscreen-option", dom);

        opts.forEach((el: HTMLImageElement) => {
            el.addEventListener("click", () => {
                DOMUtils.get<HTMLButtonElement>("#apply-virtualbg").disabled = false;
                if(!this.capturedStream){                
                this.init(el.src);
                }else{
                    this.gss.setBackground(el.src);
                    console.log("swap");
                }
            });
        });

        DOMUtils.get(".btn-primary", dom).addEventListener("click", () => {
            this.onApply(this.capturedStream);
        });
        DOMUtils.get(".btn-secondary", dom).addEventListener("click", () => {
          
                if(!this.capturedStream){
                    this.gss.stop(true);
                    
                }

        });
        return dom;



    }
    onApply(capturedStream: MediaStream) {
        throw new Error("Method not implemented.");
    }

}
