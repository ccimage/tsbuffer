import net = require('net');
import md5 = require('md5');
import Log from '../common/RunLog';
import Common from '../common/CommonDefine';
import TSBuffer from './TSBuffer';

//TCP Server
//Start by options : port, label and 3 callback
export default class TCPServer{
    private label : string = "";
    private port : number = 0;
    public constructor(label:string, port:number){
        this.label = label;
        this.port = port;
    }
    public start(dataCallback:Function){
        let _this = this;
        let server = net.createServer();
        
        server.on('listening', function() {
            Log.output('('+_this.label+') is listening on ' + _this.port);
        });
        server.on('connection', function(socket:any) {
            Log.output('('+_this.label+') new connection created on :' + socket.remoteAddress+":"+socket.remotePort);
            socket.verifyCode = socket.remoteAddress + socket.remoteFamily + socket.remotePort;

            let onReceivePackData = function (data: any) {
                try {
                    let result = data.toString();
                    result = JSON.parse(result);
    
                    if (result.datatype == 'verify') {
                        _this._checkVerifyCode(socket, result.code);
                        return;
                    }
                    if (!socket.hasVerified) {
                        Log.output('('+_this.label+') received message from un-verified client, ' + JSON.stringify(result));
                        return;
                    }
    
                    dataCallback(JSON.stringify(result));
                } catch (ex) {
                    Log.output('('+_this.label+') socket on data exception:' + ex.message);
                }
            };
            
            let tsBuffer = new TSBuffer();
            tsBuffer.onData(onReceivePackData);
            // new connection
            socket.on('data', function(data:any) {
              tsBuffer.put(data);
            });
            socket.on('end', function(data:any) {
                // connection closed
                Log.output('('+_this.label+') connection quit:' + socket.remoteAddress+":"+socket.remotePort);
            });
            socket.on('error', function(err:any) {
                Log.output('('+_this.label+') error : '+ JSON.stringify(err));
            });
            socket.on('drain', function() {
            });
            let welcomeStr = JSON.stringify({"datatype":'welcome',"text": socket.verifyCode});     
            tsBuffer.sendoutJson(welcomeStr, socket); 
            setTimeout(function(){
              _this._verifyClient(socket);
            }, 10000);   
        });
        server.on('close', function() {
            Log.output('('+_this.label+') is now closed');
        });
        server.on('error', function(err) {
            Log.output('('+_this.label+') Error occurred:', err.message);
        });
        server.listen(_this.port, "0.0.0.0");
    }
    private _verifyClient(socket:any) {
      if(!socket.hasVerified) {
        socket.destroy();
      }
    }
    private _checkVerifyCode(socket:any, code:string) {
      let scode = socket.verifyCode;
      let calccode = md5(Common.SecurityCode + scode);
 
      if(calccode == code){
        socket.hasVerified = true;
      }
      else{
        socket.destroy();
      }
    }
}