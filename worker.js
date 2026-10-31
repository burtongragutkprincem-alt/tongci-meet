import { page } from './page.js';
const json = (value, status = 200) => Response.json(value, {status, headers:{'Cache-Control':'no-store'}});
const normalize = value => value.normalize('NFKC').replace(/\s+/gu, '').toLowerCase();
export function view(room, token) {
  const index = room.players.findIndex(player => player.token === token);
  if (index < 0) throw new Error('你不在这个房间，请重新加入');
  return {id:room.id, round:room.round, epoch:room.epoch, me:index, players:room.players.map(player => ({name:player.name, ready:!!player.word})), history:room.history, won:room.won, submitted:!!room.players[index].word};
}
export function move(room, token, input) {
  const player = room.players.find(player => player.token === token);
  if (!player) throw new Error('你不在这个房间');
  if (input.epoch !== room.epoch || input.round !== room.round) throw new Error('轮次已更新，请重试');
  if (input.action === 'reset') {
    if (!room.won) throw new Error('请完成当前一局再重新开始');
    room.epoch++; room.round=1; room.history=[]; room.won=false; room.players.forEach(person => person.word='');
    return;
  }
  if (room.players.length !== 2) throw new Error('等好友加入后再提交哦');
  if (room.won) throw new Error('你们已经相遇啦，开始新一局吧');
  if (player.word) return;
  const word = typeof input.word === 'string' ? input.word.trim() : '';
  if (!word || [...word].length > 20) throw new Error('请输入 1–20 个字');
  player.word=word;
  if (room.players.every(person => person.word)) {
    const words=room.players.map(person => person.word);
    room.won=normalize(words[0])===normalize(words[1]);
    room.history.push({round:room.round,words,matched:room.won});
    room.round++; room.players.forEach(person => person.word='');
  }
}
export default {
  async fetch(request, env) {
    const url=new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    try {
      const db=env.DB || Object.values(env).find(value => value && typeof value.prepare==='function');
      if (!db) return json({error:'房间服务尚未配置，请稍后再试'},503);
      await db.prepare('CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
      if (request.method==='POST' && url.pathname==='/api/create') {
        const input=await request.json(); const id=crypto.randomUUID().replaceAll('-',''); const token=crypto.randomUUID();
        const room={id,epoch:1,round:1,players:[{token,name:String(input.name||'小星星').slice(0,12),word:''}],history:[],won:false};
        await db.prepare('DELETE FROM rooms WHERE expires < ?').bind(Date.now()).run();
        await db.prepare('INSERT INTO rooms VALUES (?, ?, 0, ?)').bind(id,JSON.stringify(room),Date.now()+86400000).run();
        return json({token,...view(room,token)});
      }
      const id=url.searchParams.get('room'); const token=request.headers.get('Authorization')?.replace('Bearer ','');
      if (!id || !/^[a-f0-9]{32}$/.test(id)) return json({error:'房间链接不正确'},400);
      for (let attempt=0;attempt<6;attempt++) {
        const row=await db.prepare('SELECT * FROM rooms WHERE id = ? AND expires > ?').bind(id,Date.now()).first();
        if (!row) return json({error:'房间已过期或不存在，请新建房间'},404);
        const room=JSON.parse(row.data);
        if (request.method==='GET') return json(view(room,token));
        if (request.method!=='POST') return json({error:'不支持的请求'},405);
        const input=await request.clone().json(); let activeToken=token;
        if (url.pathname==='/api/join') {
          if (!room.players.some(player=>player.token===token)) {
            if (room.players.length>=2) return json({error:'房间已满，只能两个人一起玩'},409);
            activeToken=crypto.randomUUID(); room.players.push({token:activeToken,name:String(input.name||'小月亮').slice(0,12),word:''});
          }
        } else if (url.pathname==='/api/play') move(room,token,input);
        else return json({error:'接口不存在'},404);
        const result=await db.prepare('UPDATE rooms SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(room),id,row.revision).run();
        if (result.meta.changes) return json({token:activeToken,...view(room,activeToken)});
      }
      return json({error:'刚刚同时操作了，请重试'},409);
    } catch(error) { return json({error:error.message || '暂时连接不上，请重试'},400); }
  }
};
