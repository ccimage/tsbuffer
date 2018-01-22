import net = require('net');
import md5 = require('md5');
import Log from '../common/RunLog';
import Common from '../common/CommonDefine';
import TSBuffer from './TSBuffer';

//TCP Server
//Start by options : port, label and 3 callback
export default class TCPServer {
    private label: string = "";
    private port: number = 0;
    private clients: {
        [key: string]: any
    } = {};
    public constructor(label: string, port: number) {
        this.label = label;
        this.port = port;
    }
    public start(dataCallback: Function) {
        let _this = this;
        let server = net.createServer();

        server.on('listening', function () {
            Log.output('(' + _this.label + ') is listening on ' + _this.port);
        });
        server.on('connection', function (socket: net.Socket) {
            let clientKey = "";
            if (socket.remoteAddress && socket.remotePort) {
                clientKey = socket.remoteAddress + ":" + socket.remotePort;
            } else {
                Log.assert("[TCP Server] cant get remote ip neither remote port");
                socket.destroy();
                return;
            }
            Log.output('(' + _this.label + ') new connection created on :' + socket.remoteAddress + ":" + socket.remotePort);

            let verifycode = "";
            if (socket.remoteFamily) {
                verifycode = "(" + socket.remoteFamily + ")" + clientKey;
            } else {
                verifycode = "VerifyByTime" + new Date().toLocaleString();
            }
            _this.clients[clientKey] = {
                "socket": socket,
                "verified": false,
                "verifycode": verifycode
            };

            let onReceivePackData = function (data: any) {
                try {
                    let result = data.toString();
                    result = JSON.parse(result);

                    if (result.datatype == 'verify') {
                        _this._checkVerifyCode(clientKey, socket, result.code);
                        return;
                    }
                    let item = _this.clients[clientKey];
                    if (!item.verified) {
                        Log.output('(' + _this.label + ') received message from un-verified client, ' + JSON.stringify(result));
                        return;
                    }

                    dataCallback(JSON.stringify(result));
                } catch (ex) {
                    Log.output('(' + _this.label + ') socket on data exception:' + ex.message);
                }
            };

            let tsBuffer = new TSBuffer();
            tsBuffer.onData(onReceivePackData);
            // new connection
            socket.on('data', function (data: any) {
                tsBuffer.put(data);
            });
            socket.on('end', function (data: any) {
                // connection closed
                Log.output('(' + _this.label + ') connection quit:' + clientKey);
            });
            socket.on('error', function (err: any) {
                Log.output('(' + _this.label + ') error : ' + JSON.stringify(err) + ", connection:" + clientKey);
            });
            socket.on('drain', function () {});
            let welcomeStr = JSON.stringify({
                "datatype": 'welcome',
                "text": verifycode
            });
            tsBuffer.sendoutJson(welcomeStr, socket);
            setTimeout(function () {
                _this._verifyClient(clientKey, socket);
            }, 10000);
        });
        server.on('close', function () {
            Log.output('(' + _this.label + ') is now closed');
        });
        server.on('error', function (err) {
            Log.output('(' + _this.label + ') Error occurred:', err.message);
        });
        server.listen(_this.port, "0.0.0.0");
    }
    private _verifyClient(clientkey: string, socket: net.Socket) {
        let item = this.clients[clientkey];
        if (!item.verified) {
            socket.destroy();
        }
    }
    private _checkVerifyCode(clientkey: string, socket: net.Socket, code: string) {
        let item = this.clients[clientkey];
        let scode = item.verifycode;
        let calccode = md5(Common.SecurityCode + scode);

        if (calccode == code) {
            this.clients[clientkey].verified = true;
        } else {
            socket.destroy();
        }
    }

    public sendToAll(jsonMessage:string):void{
        let tsbuffer = new TSBuffer();
        for(let okey in this.clients){
            tsbuffer.sendoutJson(jsonMessage, this.clients[okey].socket);
        }
    }
}