import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';

const database=new DatabaseSync(process.env.DATABASE_PATH || ':memory:');
const DB={
  prepare(sql) {
    const statement=database.prepare(sql);
    const query=parameters=>({
      async run() {const result=statement.run(...parameters);return {meta:{changes:Number(result.changes)}};},
      async first() {return statement.get(...parameters) || null;}
    });
    return {...query([]),bind(...parameters) {return query(parameters);}};
  }
};

const server=createServer(async(incoming,outgoing)=>{
  try {
    if(incoming.url==='/healthz') {outgoing.writeHead(200);outgoing.end('ok');return;}
    const chunks=[];let size=0;
    for await(const chunk of incoming) {
      size+=chunk.length;
      if(size>8192) {outgoing.writeHead(413);outgoing.end('Request too large');return;}
      chunks.push(chunk);
    }
    const method=incoming.method;
    const request=new Request('http://localhost'+incoming.url,{method,headers:incoming.headers,...(method!=='GET'&&method!=='HEAD'?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,{DB});
    outgoing.writeHead(response.status,{'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',...Object.fromEntries(response.headers)});
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500,{'Content-Type':'application/json'});
    outgoing.end(JSON.stringify({error:'服务暂时不可用，请稍后重试'}));
  }
});
server.listen(Number(process.env.PORT || 3000),'0.0.0.0');
process.on('SIGTERM',()=>server.close(()=>{database.close();process.exit(0);}));
