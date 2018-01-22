export default class RunLog{
    private constructor() { }
    private static operationLog:any[] = [];
    private static logCountLimit:number = 10000
    public static  output(type:string="Debug", msg:string=""):void{
        console.log("[%s] %s (%s)", new Date().toLocaleString(), msg, type);
    }

    public static assert(msg:string):void{
        console.assert(false,"[%s] %s", new Date().toLocaleString(), msg);
    }
    
    public static addlog(type:string, msg:string):void {
        let logcount = RunLog.operationLog.length;
        RunLog.operationLog.unshift({"type":type,"num":logcount,"datetime":new Date().toLocaleString(),"msg":msg});

        if(RunLog.operationLog.length > RunLog.logCountLimit) {
            RunLog.operationLog.pop();
        }
    }
    public static clearLog():void{
        RunLog.operationLog = [];
    }

    public static getDataByType(type:string){
        let data = [];
        let temp = this.operationLog
        for(let i=0; i < temp.length; i++) {
            let item = temp[i];
            if(item.type != type) {
                continue;
            }
            data.push({"type":item.type,"num":item["num"], "datetime":item["datetime"], "msg":item["msg"]});
        }
        return data;
    }
}