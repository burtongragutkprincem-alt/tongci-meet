import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

test('两台设备完整联机流程',async()=>{
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'31987'},stdio:'ignore'});
  try {
    let ready=false;
    for(let attempt=0;attempt<40;attempt++) {
      try {ready=(await fetch('http://127.0.0.1:31987/healthz')).ok;}catch{}
      if(ready)break;
      await delay(100);
    }
    assert.ok(ready,'服务成功启动');
    const api=async(path,token,data)=>{
      const response=await fetch('http://127.0.0.1:31987/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(token||'')},body:data?JSON.stringify(data):undefined});
      return {status:response.status,...await response.json()};
    };
    const first=await api('create',null,{name:'星星'});
    assert.equal(first.status,200);
    const room=first.id;
    const second=await api('join?room='+room,null,{name:'月亮'});
    assert.equal(second.players.length,2);
    assert.equal((await api('join?room='+room,null,{name:'第三个人'})).status,409);
    await api('play?room='+room,first.token,{word:'天气',round:1,epoch:1});
    assert.equal(JSON.stringify(await api('state?room='+room,second.token)).includes('天气'),false);
    const revealed=await api('play?room='+room,second.token,{word:'天气',round:1,epoch:1});
    assert.equal(revealed.won,true);
    assert.deepEqual(revealed.history[0].words,['天气','天气']);
    const reset=await api('play?room='+room,first.token,{action:'reset',round:2,epoch:1});
    assert.equal(reset.epoch,2);
    assert.equal(reset.history.length,0);
  } finally {child.kill();}
});
