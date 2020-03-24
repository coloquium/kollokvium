# Kollokvium (colloquium)

## about
This is an example of applications based on thor-io vnext and its abstraction layer WebRTC API. It gives you a multi-party video conference with room function's, screen & file sharing + a simpe chat.

Colloquium (Latin colloquium) is a living, developing example / web application.

A live example is deployed at Heroku, you can find it here - here https://kollokvium.herokuapp.com/


## feature list

1. 1-n participants
2. Instanet messages (chat )
3. File share ( files sent to chat window)
4. Screen sharing ( deskop )
5. Random room generator or user defined
6. No login and registration required
7. Customizable,  See blow
8. Multiple stream recording ( record the meeting )

## install 

1. Clone this repo
2. Run npm install 
3. Run npm start to start local-server at http://localhost:1337 
4. Modify & compile
5. Make sure you run weback , or put it on watch 

## Quick customization guide.

Clone/download the this repo, modify settings.json in found in the ./client folder, compile and run webpack.

### settings.json

    {
    "domain": "Kollokvium", // name of your app
    "contextPrefix": "kollokvium", // your prefix for 'signals', rooms, negotiation etc. hidden for user
    "serverUrl": "wss://kollokvium.herokuapp.com", // server url, use this if you just want to host app ( html, js, css ) , othewise change.
    "version": "1.0.5" // just the version
    }

## Set up on host
 
If you want to host "only" client, copy index.html, img,build and css folders into your site and/or folder.  To host application deploy all in your hosting enviorment. 


## Other

Goodluck, and if you find issues, have ides post them here 
https://github.com/MagnusThor/kollokvium/issues

Regards

 Team Kollokvium
 
