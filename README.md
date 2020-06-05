# Kollokvium (colloquium)

## About

Engaging in digital meetings should be simple, secure and not require installation of software, just a browser and an internet connection.

Unnecessary logins, user registrations and data should not flow through third parties, but between the peers involved in the meeting, this makes the connection private and also resilient against overloaded servers that applications like skype and discord may experience under high load, which often happens in a crisis.

>Our digital meetings should be flexible, resilient and protected!

Kollokvium target companies, associations and individuals, both young and old, perhaps especially those without any deeper computer experience as it requires no installation or signup and can be started simply by following a link and clicking start.

Unlike many other video conferencing technologies we passes everyone’s Media Streams to all participants, rather than sending the to a central media server for mixing the streams, The result is lower latency, better quality, privacy and security, as data flow P2P , there is now middleman involved, except in the setup phase of the room's (negotiation), not nothing is stored at server(s)  and data is ofcourse encrypted, our server is just a message broker (signaling and state of rooms) . 

The system uses standardized native technologies such as WebRTC, the open standard for Web communication. We also leverage the power of the technology already in our end-users hands - don't reinvent the wheel again!

Our implementation adds advanced video routing concepts such as stream forwarding, bandwidth estimations and many other things.

## Feature list  (current)

1. 1-many participants ( P2P Streams )
2. Instanet messages/Chat  (P2P DataChannels) 
3. Share files (P2P DataChannels)
4. Screen sharing, Chooose between tab's, windows or the desktop. (P2P Streams)
5. Random room generator or user defined room names
6. No login and registration required
7. Multiple stream recording ( record the meeting  or single participant ), Recording done locally.
8. Lock / unlock rooms
9.  Subtitles / captions ( speech recognition)
10. Auto translate of Subtitles / captions ( from source to prefered langugee )
11. Picture-In-Picture support (renders all streams into PiP element)
12. Active speaker - Indication of who is talking

..and more

## Planned features / addons

1. `/broadcast` - A view where user can create a room/space for 1-many broadcasts for lectures, presentations and such scenarios 
2. `/adnanced`    - A view that let's the "organizer" (meeting creator) mute video/audio remotly,kick, ban, lock and set meeting pin-codes etc.
3. Finalize the electron builds for Windows, OSX and Linux  
4. E2EE encryption (will be implemented in thor-io.vnext)

## Install 
Clone the repository and run npm install & npm run build & npm start

## Quick deploy guides.
To run the application locally run npm start and then browse to localhost:1337 

### Azure deploy
To deploy to Azure you need an Azure account, and you need to create an Azure Wep Application, and a storage account to host the Static Website.

### Heroku apps
Fork the repository and connect to Heroku and run deploy.

### Deploy front end only 
If you want to deploy only the front-end as a static site, build the application and copy all the files from dist/client folder to the root of you web application. 

## Issues & Questions

Goodluck, and if run into problems, bugs or questions or just have ideas to share. post them here under issues

Regards
    Team Kollokvium (colloquium)
 