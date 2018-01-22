//import * as AES from './common/AES';
import tcpclient from './middleware/TCPClient';
import tcpserver from './middleware/TCPServer';
import { setTimeout } from 'timers';

interface test{
    [key: string]: Function;
}

class test{

    public testRun(){
        
        //this.testPerformance();
        this.testTCP();
    }
/*
    private testPerformance(){
        var aesHelper = new AES.default();
        let totalcount = 1000;
        console.log("字符串加密-解密算法性能测试，每种算法运行 "+totalcount+"次");
        for(var i = 0; i < 4; i++){
            var time = new Date().getTime();
            for(var j = 0; j < totalcount;j++){
                var encrypttext = aesHelper.Encrypt("The repository for high quality TypeScript type definitions",i);
                var text = aesHelper.Decrypt(encrypttext,i);
            }
            var newtime = new Date().getTime();
            var span = newtime - time;

            console.log(aesHelper.Algorithm[i] + "运算耗时"+span+"毫秒");
        }
    }
*/
    private testTCP(){
        let server = new tcpserver("test server", 10001);
        let msgCount = 0;
        let correctCount = 0;
        server.start(function(data:string){
            msgCount++;
            
            if(data.length == 865){
                let o = JSON.parse(data);
                if(o["GITHUB"].length == 852){
                    correctCount++;
                }
                else{
                    console.log("信息不能正确解析：",data);
                }
            }
            else{
                console.log("从客户端收到的信息不对：",data);
            }
        });

        let client = new tcpclient();
        client.connectTo("127.0.0.1", 10001, function(msg){
            console.log("从服务器收到信息：",msg);
        });

        setTimeout(function(){
            let jsonDemo:{[key:string]:string} = {};
            jsonDemo["GITHUB"] = "is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.is how people build software We’re supporting a community where more than 27 million people learn, share, and work together to build software.";
            for(let i = 0; i < 100; i++){
                client.sendMessage("127.0.0.1:10001",JSON.stringify(jsonDemo));
            }
        }, 2000);

        setTimeout(function(){
            console.log("收到数据：",msgCount, "其中正确的次数：", correctCount);
        },3000);
    }
}


let abc = new test();
let aaa = "testRun";
abc[aaa]();

