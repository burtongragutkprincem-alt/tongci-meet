import {test} from 'node:test';
import assert from 'node:assert/strict';
import {move,view} from './worker.js';
const makeRoom=()=>({id:'test',epoch:1,round:1,players:[{token:'a',name:'A',word:''},{token:'b',name:'B',word:''}],history:[],won:false});
test('隐藏对手词，双方提交后揭晓，规范化比较',()=>{const room=makeRoom();move(room,'a',{round:1,epoch:1,word:'天气'});assert.equal(JSON.stringify(view(room,'b')).includes('天气'),false);move(room,'b',{round:1,epoch:1,word:'天 气'});assert.equal(room.won,true);assert.equal(room.history.length,1);assert.equal(room.round,2)});
test('不同词继续，重复提交无效，过期轮次拒绝',()=>{const room=makeRoom();move(room,'a',{round:1,epoch:1,word:'云'});move(room,'a',{round:1,epoch:1,word:'太阳'});move(room,'b',{round:1,epoch:1,word:'雨'});assert.equal(room.won,false);assert.deepEqual(room.history[0].words,['云','雨']);assert.throws(()=>move(room,'a',{round:1,epoch:1,word:'天气'}));assert.throws(()=>view(room,'outsider'))});
