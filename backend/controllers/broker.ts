import {
    ThorIO,
    ControllerProperties,
    CanInvoke,
    CanSet
} from 'thor-io.vnext'
@ControllerProperties("broker", false, 2000)
export class Broker extends ThorIO.Controllers.BrokerController {
    constructor(connection: ThorIO.Connection) {
        super(connection);
    }
}