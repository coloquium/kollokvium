import {app} from './common';

var port = process.env.PORT || 1337;
app.listen(port);
console.log("thor-io is serving on", port.toString());