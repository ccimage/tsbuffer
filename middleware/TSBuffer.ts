
/*! 
    TSBuffer
    解决TCP网络分包和粘包的问题
    Mr.che (ccimage)
    时间 2018-1-16 16:02:56
*/



export enum BufferHeaderType{
    longLE, // 32 Little Edian
    longBE,
    shortLE,
    shortBE
}

export default class TSBuffer{
    constructor(type:BufferHeaderType = BufferHeaderType.longBE){
        this.headertype_ = type;
        this.buffer_ = new Buffer(512);
    }
    private headertype_:BufferHeaderType = BufferHeaderType.longBE;
    private buffer_:Buffer; 
    
    private listeners:{[key:string]:Function[]} = {};
    private listeners_once:{[key:string]:Function[]} = {};

    private dataLength:number = 0; //缓冲区中有效的数据长度
    
    //注册事件
    public onData(cb:(...args: any[]) => void, callonce:boolean = false){
        let e = "data";
        if(callonce){
            this.addOnceEvent(e,cb);
        } else{
            this.addEvent(e, cb);
        }
        
    }
    public onError(cb:(...args: any[]) => void, callonce:boolean = false){
        let e = "error";
        if(callonce){
            this.addOnceEvent(e,cb);
        } else{
            this.addEvent(e, cb);
        }
    }
    //取消事件
    public removeEvent(e:string){
        if(!this.listeners || !this.listeners[e]){
            return;
        }
        delete this.listeners[e];
    }

    private addEvent(e:string,cb:(...args: any[]) => void){
        this.listeners[e] = this.listeners[e] || [];
        if(this.listeners[e].indexOf(cb) == -1){
            this.listeners[e].push(cb);
        }
    }
    private addOnceEvent(e:string,cb:(...args: any[]) => void){
        this.listeners_once[e] = this.listeners_once[e] || [];
        if(this.listeners_once[e].indexOf(cb) == -1){
            this.listeners_once[e].push(cb);
        }   
    }
    /*
    * 送入一段Buffer，分为3种情况
    * 1.正常情况     某次发送的完整数据
    * 2.分包        某次发送的部分数据
    * 3.粘包        某次部分数据，另一次部分数据 
    */
    public put(data:Buffer){
        //先把数据收入缓冲区
        this.putIntoBuffer(data);
        //处理缓冲区数据
        this.readBufferSendout();

    }

    private putIntoBuffer(data:Buffer):void{
        let emptyLength = this.buffer_.length - this.dataLength;
        let dataLen = data.length;
        if(dataLen > emptyLength){
            //如果空间不够，就扩展buffer，每次都是扩展为整kb （发送的数据最好小于8Kb）
            let ex = Math.ceil((data.length + this.dataLength)/1024.0);
            let tmp = new Buffer(this.buffer_.length);
            this.buffer_.copy(tmp);
            
            this.buffer_ = new Buffer(ex * 1024);
            tmp.copy(this.buffer_);
            let copyLen = data.copy(this.buffer_, this.dataLength);
            this.dataLength += dataLen;
            
        }
        else{
            data.copy(this.buffer_, this.dataLength);
            this.dataLength += dataLen;
        }
    }
    
    private emit(e:string, data:Buffer){
        var list = this.listeners[e];
        if(list) {
            for(let i=0;i<list.length;++i) {
                list[i](data);
            }
        }


        var list = this.listeners_once[e];
        delete this.listeners_once[e];
        if(list) {
            for(var i=0;i<list.length;++i) {
                list[i](data);
            }
        }
        
    }

    private readHeader(buf:Buffer, start:number):number{
        switch(this.headertype_){
            case BufferHeaderType.longBE:
                return buf.readUInt32BE(start);
            case BufferHeaderType.longLE:
                return buf.readUInt32LE(start);
            case BufferHeaderType.shortBE:
                return buf.readUInt16BE(start);
            case BufferHeaderType.shortLE:
                return buf.readUInt16LE(start);
        }
        return -1;
    }

    private writeHeader(buf:Buffer, datalength:number){
        switch(this.headertype_){
            case BufferHeaderType.longBE:
                return buf.writeUInt32BE(datalength,0);
            case BufferHeaderType.longLE:
                return buf.writeUInt32LE(datalength,0);
            case BufferHeaderType.shortBE:
                return buf.writeUInt16BE(datalength,0);
            case BufferHeaderType.shortLE:
                return buf.writeUInt16LE(datalength,0);
        }
        return -1;
    }

    private getHeaderSize():number{
        switch(this.headertype_){
            case BufferHeaderType.longBE:
                return 4;
            case BufferHeaderType.longLE:
                return 4;
            case BufferHeaderType.shortBE:
                return 2;
            case BufferHeaderType.shortLE:
                return 2;
        }
        return 0;
    }
    //读取buff并且发送
    private readBufferSendout():void{
        let lastReadOffset:number = 0;

        const SAFETY_JUMPOUT_LOOP:number = 1000; // 安全跳出循环的次数,以防万一，一般不会达到

        //let headerFound:boolean = false; //是否已经找到header
        let headerSize = this.getHeaderSize();
        
        let loopCount = 0;
        //可能有好几份数据在缓存里，需要多次才能读取
        while(true){
            //读取数据头，表示数据的长度
            if(this.dataLength - lastReadOffset <= headerSize){
                break;
            }

            let dataSize = this.readHeader(this.buffer_, lastReadOffset);
            if(this.dataLength - lastReadOffset - headerSize < dataSize){
                //数据不完整，等待下次收到后再读
                break;
            }
            lastReadOffset += headerSize;
            let sendBuffer = new Buffer(dataSize);
            this.buffer_.copy(sendBuffer, 0, lastReadOffset, dataSize + lastReadOffset);
            lastReadOffset += dataSize;
            //Send out buffer
            this.emit("data", sendBuffer);

            loopCount++;
            if(loopCount > SAFETY_JUMPOUT_LOOP){
                break;
            }
        }
        //读取完成后，将buff里已经发送的数据去掉
        if(lastReadOffset > 0){
            let len = this.buffer_.length;
            let newBuffer = new Buffer(len);
            this.buffer_.copy(newBuffer, 0, lastReadOffset, this.dataLength);
            this.buffer_ = newBuffer;
            this.dataLength -= lastReadOffset;
        }
    }

    public sendoutJson(strJson:string, socket:any) : void {
        if(socket && socket.writable){
            let totalLength = Buffer.byteLength(strJson);
            
            let headBuf = new Buffer(4);
            this.writeHeader(headBuf, totalLength);
            socket.write(headBuf);
    
            let bodyBuf = new Buffer(totalLength);
            bodyBuf.write(strJson);
    
            socket.write(bodyBuf);
        }
        
    }

    public sendoutBuffer(buf:Buffer, socket:any) :void{
        if(socket && socket.writable){
            let totalLength = buf.length;
            
            let headBuf = new Buffer(4);
            this.writeHeader(headBuf, totalLength);
            socket.write(headBuf);
    
            socket.write(buf);
        }
    }
}
