"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Subtitles {
    constructor(peeId, mediaStream, lang) {
        this.peeId = peeId;
        this.lang = lang;
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        // const audio = new Audio();
        // audio.muted = true;
        // audio.srcObject = mediaStream;
        // audio.play();
        this.recognition.onresult = (event) => {
            let interim = '';
            let final = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                }
                else {
                    interim += event.results[i][0].transcript;
                }
            }
            console.log(final.length);
            if (final.length > 0 && this.onFinal) {
                this.onFinal(this.peeId, final);
            }
            if (interim.length > 0 && this.onInterim) {
                this.onInterim(this.peeId, interim);
            }
        };
        this.recognition.onerror = (event) => {
            if (this.onError)
                this.onError(event);
        };
        this.recognition.onaudiostart = (event) => {
        };
        this.recognition.onaudioend = e => {
            if (this.onIdle)
                this.onIdle(event);
        };
        this.stop = () => {
            this.recognition.stop();
        };
        this.start = () => {
            console.log("staring....");
            this.recognition.start();
        };
        //
        if (this.onReady)
            this.onReady(this);
        //  }
    }
    getlanguagePicker() {
        let select_language = document.createElement("select");
        select_language.classList.add("select-languge");
        Subtitles.languages.forEach((entry) => {
            let country = entry[0];
            let dialects = entry[1];
            if (dialects.length === 1) {
                let option = document.createElement("option");
                option.value = dialects[0];
                option.textContent = `${country} (${dialects[0]})`;
                select_language.append(option);
            }
            else {
                let prefix = "";
                entry.forEach((a) => {
                    if (!Array.isArray(a)) {
                        prefix = a;
                    }
                    else {
                        let option = document.createElement("option");
                        option.value = a[0];
                        option.textContent = `${prefix} - ${a[1]} (${a[0]})`;
                        select_language.append(option);
                    }
                });
            }
        });
        return select_language;
    }
}
exports.Subtitles = Subtitles;
Subtitles.languages = [
    ['Afrikaans', ['af-ZA']],
    ['Bahasa Indonesia', ['id-ID']],
    ['Bahasa Melayu', ['ms-MY']],
    ['Català', ['ca-ES']],
    ['Čeština', ['cs-CZ']],
    ['Deutsch', ['de-DE']],
    ['English', ['en-AU', 'Australia'],
        ['en-CA', 'Canada'],
        ['en-IN', 'India'],
        ['en-NZ', 'New Zealand'],
        ['en-ZA', 'South Africa'],
        ['en-GB', 'United Kingdom'],
        ['en-US', 'United States']],
    ['Español', ['es-AR', 'Argentina'],
        ['es-BO', 'Bolivia'],
        ['es-CL', 'Chile'],
        ['es-CO', 'Colombia'],
        ['es-CR', 'Costa Rica'],
        ['es-EC', 'Ecuador'],
        ['es-SV', 'El Salvador'],
        ['es-ES', 'España'],
        ['es-US', 'Estados Unidos'],
        ['es-GT', 'Guatemala'],
        ['es-HN', 'Honduras'],
        ['es-MX', 'México'],
        ['es-NI', 'Nicaragua'],
        ['es-PA', 'Panamá'],
        ['es-PY', 'Paraguay'],
        ['es-PE', 'Perú'],
        ['es-PR', 'Puerto Rico'],
        ['es-DO', 'República Dominicana'],
        ['es-UY', 'Uruguay'],
        ['es-VE', 'Venezuela']],
    ['Euskara', ['eu-ES']],
    ['Français', ['fr-FR']],
    ['Galego', ['gl-ES']],
    ['Hrvatski', ['hr_HR']],
    ['IsiZulu', ['zu-ZA']],
    ['Íslenska', ['is-IS']],
    ['Italiano', ['it-IT', 'Italia'],
        ['it-CH', 'Svizzera']],
    ['Magyar', ['hu-HU']],
    ['Nederlands', ['nl-NL']],
    ['Norsk bokmål', ['nb-NO']],
    ['Polski', ['pl-PL']],
    ['Português', ['pt-BR', 'Brasil'],
        ['pt-PT', 'Portugal']],
    ['Română', ['ro-RO']],
    ['Slovenčina', ['sk-SK']],
    ['Suomi', ['fi-FI']],
    ['Svenska', ['sv-SE']],
    ['Türkçe', ['tr-TR']],
    ['български', ['bg-BG']],
    ['Pусский', ['ru-RU']],
    ['Српски', ['sr-RS']],
    ['한국어', ['ko-KR']],
    ['中文', ['cmn-Hans-CN', '普通话 (中国大陆)'],
        ['cmn-Hans-HK', '普通话 (香港)'],
        ['cmn-Hant-TW', '中文 (台灣)'],
        ['yue-Hant-HK', '粵語 (香港)']],
    ['日本語', ['ja-JP']],
    ['Lingua latīna', ['la']]
];
