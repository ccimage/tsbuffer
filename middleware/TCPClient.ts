import net = require('net');
import md5 = require('md5');
import Log from '../common/RunLog';
import Common from '../common/CommonDefine';
import TSBuffer, { BufferHeaderType } from './TSBuffer';

export default class TCPClient{
    private clients : {[key:string]:any} = {};

    public connectTo(HOST:string, PORT:number, dataReceiveCallback:((msg:string)=>void)) {
      let _this = this;
      let key = HOST+":"+PORT;
      let serverUrl = HOST + ":" + PORT;
      let client:any = new net.Socket();
      client.connect(PORT, HOST, function() {
          Log.output('CONNECTED TO: ' + serverUrl);
 
          client['connectCount'] = 0;
          _this.clients[key] = client;
      });
      let tsBuffer = new TSBuffer();
      let onReceivePackData = function(data:any){
            try{
                let message:any = data.toString();
                message = JSON.parse(message);
                if(message.datatype == "welcome") {
                    let text = message.text;
                    let code = md5(Common.SecurityCode+text);
                    tsBuffer.sendoutJson(JSON.stringify({"datatype":"verify","code":code}),client);
                }
                else if(dataReceiveCallback){
                    dataReceiveCallback(message);
                }
            }
            catch(ex){
                Log.output("onReceivePackData exception = ",ex);
            }
      };

      tsBuffer.onData(onReceivePackData);

      client.on('data', function(data:any) {
          tsBuffer.put(data);
      });

      // 为客户端添加“close”事件处理函数
      client.on('close', function() {
         if(_this.clients.hasOwnProperty(key)) {
            delete _this.clients[key];
         }       
         setTimeout(function(){_this.connectTo(HOST, PORT,dataReceiveCallback); }, 3000);
      });

      //出错时
      client.on('error', function(err:any) {
        if(err.code == 'ECONNREFUSED') {
          
        }
      });
    }
    public stopAllClient():void{
        let _this = this;
        for(let key in _this.clients){
            _this.clients[key].destroy();
            delete _this.clients[key];
        }
    }
    public stopClient(key:string):void{
        let _this = this;
        if(_this.clients.hasOwnProperty(key)) {
            _this.clients[key].destroy();
            delete _this.clients[key];
        }
    }

    public sendMessage(clientkey:string, message:string){
        let tsBuffer = new TSBuffer();
        tsBuffer.sendoutJson(message, this.clients[clientkey]);
    }
}