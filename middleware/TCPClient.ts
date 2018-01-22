import net = require('net');
import md5 = require('md5');
import Log from '../common/RunLog';
import Common from '../common/CommonDefine';
import TSBuffer, {
    BufferHeaderType
} from './TSBuffer';

export default class TCPClient {
    private client?: net.Socket;
    private quitByUser:boolean = false;
    private waiter?:NodeJS.Timer;
    public connectTo(HOST: string, PORT: number, dataReceiveCallback: ((msg: string) => void)) {
        if(this.client != undefined){
            this.quitByUser = true;
            this.client.destroy();
            this.client = undefined;
        }
        
        let _this = this;
        let serverUrl = HOST + ":" + PORT;
        this.client = new net.Socket();
        this.client.connect(PORT, HOST, function () {
            Log.output('CONNECTED TO: ' + serverUrl);
        });
        let tsBuffer = new TSBuffer();
        let onReceivePackData = function (data: any) {
            try {
                let message: any = data.toString();
                message = JSON.parse(message);
                if (message.datatype == "welcome") {
                    let text = message.text;
                    let code = md5(Common.SecurityCode + text);
                    tsBuffer.sendoutJson(JSON.stringify({
                        "datatype": "verify",
                        "code": code
                    }), _this.client);
                } else if (dataReceiveCallback) {
                    dataReceiveCallback(message);
                }
            } catch (ex) {
                Log.output("onReceivePackData exception = ", ex);
            }
        };

        tsBuffer.onData(onReceivePackData);

        this.client.on('data', function (data: any) {
            tsBuffer.put(data);
        });

        // 为客户端添加“close”事件处理函数
        this.client.on('close', function () {
            Log.output('client on close, disconnect from '+serverUrl);
            if(!_this.quitByUser){
                _this.reconnect(HOST, PORT, dataReceiveCallback);
            }
        });

        //出错时
        this.client.on('error', function (err: any) {
            if (err.code == 'ECONNREFUSED') {

            }
            Log.output('client on error, server is '+serverUrl+", error code="+err.code);
            if(!_this.quitByUser){
                _this.reconnect(HOST, PORT, dataReceiveCallback);
            }
        });
    }
    public stopClient(): void {
        if(this.client != undefined){
            this.client.destroy();
        }
    }
    public sendMessage(message: string) {
        let tsBuffer = new TSBuffer();
        tsBuffer.sendoutJson(message, this.client);
    }

    private reconnect(HOST: string, PORT: number, dataReceiveCallback: ((msg: string) => void)){
        if(this.waiter != undefined){
            return;
        }
        let _this = this;
        this.waiter = setTimeout(function () {
            _this.waiter = undefined;
            _this.connectTo(HOST, PORT, dataReceiveCallback);
        }, 3000);
        
    }
}