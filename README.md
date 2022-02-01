# Kollokvium (colloquium)

## About

Engaging in digital meetings should be simple, secure and not require installation of software, just a browser and an internet connection.

Unnecessary logins, user registrations and data should not flow through third parties, but between the peers involved in the meeting, this makes the connection private and also resilient against overloaded servers that applications like skype and discord may experience under high load, which often happens in a crisis.

> Our digital meetings should be flexible, resilient and protected!

Kollokvium target companies, associations and individuals, both young and old, perhaps especially those without any deeper computer experience as it requires no installation or signup and can be started simply by following a link and clicking start.

Unlike many other video conferencing technologies we passes everyone’s Media Streams to all participants, rather than sending the to a central media server for mixing the streams, The result is lower latency, better quality, privacy and security, as data flow P2P , there is now middleman involved, except in the setup phase of the room's (negotiation), not nothing is stored at server(s)  and data is ofcourse encrypted, our server is just a message broker (signaling and state of rooms) . 

The system uses standardized native technologies such as WebRTC, the open standard for Web communication. We also leverage the power of the technology already in our end-users hands - don't reinvent the wheel again!

Our implementation adds advanced video routing concepts such as stream forwarding, bandwidth estimations and many other things.

## Feature list  (current)

1. 1-many participants ( P2P Streams )
2. Instanet messages/Chat  (P2P DataChannels) with **immediate translation**
3. Share files (P2P DataChannels) - fast and secure **no uploads**.
4. Screen sharing, Chooose between tab's, windows or the desktop. - P2P Streams 
5. Random room generator or user-defined room names
6. No login and registration required
7. Multiple stream recording ( record the meeting or single participant ), Recording done locally.
8. Lock / unlock rooms
9. Subtitles / captions (Speech recognition)
10. Auto translate of Subtitles / captions ( from source to prefered language)
11. Picture-In-Picture support (renders all streams into PiP element)
12. Active speaker - Indication of who is talking
13. Active speaker view and grid view 
14. E2EE , Currently disabled
15. Electron clients ( can be found in this repo https://github.com/coloquium/kollokvium-electron )
16. Virtual backgrounds (secure) - Predefined or custom virtual backgrounds - **clientside only**

..and more

## Hotkeys aka keyboard shortcuts  

`ctrl-l` Request low resolution media streams from all connected participanyts.

`ctrl-r` Start / stop recording of meeting ( applies to recoring of everyone participating)

`ctrl-g` Toogle active-speaker vide / grid view (default).

`ctrl-m` Mute / un-mute microphone.

`ctrl-v` Mute / un-mute camera.

`ctrl+q` Mute / un-mute all audio.

`ctrl+s` Enable / disable subtitles (captions).

`ctrl+i` Hide / show chat & fileshare window.

`ctrl-u` Get statistics for each RTCPeerConnection. Generate 1-n HTML based reports that is passedf back to client as downloadable files.

`ctrl-b` Start/stop recording of each stream individually. 

## Planned features / addons

`broadcast mode` - A view/mode where user can create a room/space for 1-many broadcasts for lectures, presentations and such scenarios 

`advanced mode`  - A view/mode that let's the "organizer" (meeting creator) mute video/audio remotly,kick, ban, lock and set meeting pin-codes etc.  **2022-01-31 - Currently developing ***


## Install 
Clone the repository and run `npm install`  see package.json for build scripts.

## Build scripts

See package.json ( scripts section/object)

## Quick deploy guides

## Local development

Build and and launch using `npm start` and then browse to `localhost:1337` or for frontend only development use `npm start:debug` which is much smoother. Pleaase note
that npm start:debug is using a shared wss server hosted by us by default. please study scripts sections of `package.json` for futher information.

### Azure deploy
To deploy to Azure you need an Azure account, and you need to create an Azure Wep Application, and a storage account to host the Static Website.

### Heroku apps
Fork the repository and connect to Heroku and run deploy, modify settings.json

### Deploy front end only 
If you want to deploy only the front-end as a static site, build the application and copy all the files from dist/client folder to the root of you web application. 

## Issues & Questions

Good Luck, and if run into problems, bugs or questions or just have ideas to share. post them here under issues (https://github.com/coloquium/kollokvium/issues)

## Other 

Thanks to Sami Anas, https://www.pexels.com/sv-se/@samianas for greate background image we currently use.

Regards
    Team Kollokvium (colloquium)
 
