const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const repo = process.env.STREAMDECK_REPO || path.resolve(__dirname, '..');
const req = createRequire(path.join(repo, 'package.json'));
const ts = req('typescript');
const quiet = { info() {}, warn() {}, debug() {}, createScope() { return this; } };
const inspector = [];
const sdk = { logger: quiet, i18n: { translate: key => key }, ui: { action: null, sendToPropertyInspector: async payload => inspector.push(payload) } };
const handlers = {}, sent = [];
let rejectAck = false;
const socket = { connected: true, on: (event, fn) => handlers[event] = fn, timeout() { return this; }, emitWithAck: async (event, payload) => { sent.push({event, payload}); if (rejectAck) throw Error('timeout'); return {ok:true}; }, connect() {} };
function load(name, mocks = {}) {
 const file = path.join(repo, 'src', name), module = {exports:{}};
 const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:id=>id in mocks?mocks[id]:req(id),Buffer,console,setTimeout,clearTimeout,setInterval,clearInterval},{filename:file});return module.exports;
}
const protocol=load('protocol.ts');
const connection=load('pixelychat-connection.ts',{'@elgato/streamdeck':{__esModule:true,default:sdk},'socket.io-client':{io:()=>socket},'./protocol':protocol}).pixelyChat;
connection.start();
const state=(widgets,extra={})=>handlers['streamdeck-state']({protocolVersion:1,widgets,...extra});
const wheel={id:'wheel',name:'Spin the Wheel',type:'spin-wheel',enabled:true,active:false,templates:[{id:'a',name:'A'},{id:'b',name:'B'}],defaultTemplateId:'a'};
const enhanced={sessionId:'host',revision:1,capabilities:{templates:true,guardedActions:true}};
const artwork=load('key-image.ts');
const renders=[];
class Base { actions=[]; }
const Action=load('actions/trigger-action-widget.ts',{
 '@elgato/streamdeck':{__esModule:true,default:sdk,action:()=>cls=>cls,SingletonAction:Base},
 '../pixelychat-connection':{pixelyChat:connection},'../key-image':{...artwork,keyImage:(type,status,options)=>{renders.push({type,status,options});return artwork.keyImage(type,status,options);}},
}).TriggerActionWidget;
(async()=>{
 state([{id:'old-wheel',name:'Old wheel',type:'spin-wheel',enabled:true,active:false}]);
 await connection.toggle('old-wheel');assert.deepEqual(JSON.parse(JSON.stringify(sent.at(-1).payload)),{widgetId:'old-wheel'});
 const count=sent.length;assert.equal((await connection.toggle('wheel','a')).errorCode,'appUpdateNeeded');assert.equal(sent.length,count);
 state([wheel],enhanced);await connection.toggle('wheel','b');let p=sent.at(-1).payload;assert.equal(p.action,'play');assert.equal(p.presetId,'b');assert.equal(p.runId,null);assert.equal(p.sessionId,'host');assert(p.requestId);
 state([{...wheel,active:true,runId:'run-b',runningTemplateId:'b'}],{...enhanced,revision:2});await connection.toggle('wheel','a');p=sent.at(-1).payload;assert.equal(p.action,'stop');assert.equal(p.runId,'run-b');
 state([wheel],enhanced);assert.equal(connection.find('wheel').active,true,'older revision cannot replace newer runtime');
 const before=sent.length;socket.connected=false;assert.equal((await connection.toggle('wheel','a')).ok,false);assert.equal(sent.length,before);socket.connected=true;
 rejectAck=true;await connection.toggle('wheel','a');assert.equal(sent.length,before+1,'ambiguous request must not retry');rejectAck=false;
 const action=new Action();let settings={widgetId:'wheel',unknownSetting:'keep'};let alertCount=0;const key={id:'key',isKey:()=>true,getSettings:async()=>settings,setSettings:async s=>{settings=s;},setImage:async()=>{},showAlert:async()=>{alertCount++;}};
 sdk.ui.action=key;
 state([wheel],{...enhanced,revision:3});await action.onDidReceiveSettings({action:key,payload:{settings}});assert.equal(settings.presetId,'a');assert.equal(settings.unknownSetting,'keep');assert.equal(settings.cachedTemplateName,'A');
 settings={...settings,presetId:'missing'};await action.onDidReceiveSettings({action:key,payload:{settings}});assert.equal(settings.presetId,'missing','missing binding must not be silently repaired');await action.onKeyDown({action:key,payload:{settings}});assert(alertCount);
 settings={...settings,presetId:'a'};state([{...wheel,active:true,runId:'b',runningTemplateId:'b',result:'B winner',resultTemplateId:'b'}],{...enhanced,revision:4});
 await action.onWillAppear({action:key,payload:{settings}});assert.equal(renders.at(-1).options.detail,'wheelActive');assert.equal(renders.at(-1).options.stopIndicator,undefined);assert.notEqual(renders.at(-1).options.detail,'B winner');
 await action.onKeyDown({action:key,payload:{settings}});assert.equal(sent.at(-1).payload.action,'stop');
 await action.onTitleParametersDidChange({action:key,payload:{settings,title:'My title',titleParameters:{showTitle:false}}});assert.equal(renders.at(-1).options.name,'My title');
 state([{...wheel,active:true,busy:true,status:'starting'}],{...enhanced,revision:5});await action.onWillAppear({action:key,payload:{settings}});assert.equal(renders.at(-1).status,'pending');assert.equal(renders.at(-1).options.detail,'starting');
 for (const type of ['spin-wheel','poll']) {
  state([{...wheel,type,active:false,result:'Previous winner',resultTemplateId:'a'}],{...enhanced,revision:6});
  await action.onWillAppear({action:key,payload:{settings}});
  assert.equal(renders.at(-1).type,type);assert.equal(renders.at(-1).status,'idle');assert.equal(renders.at(-1).options.detail,undefined,'stopped keys restore their widget icon');
 }
 state([{...wheel},{id:'timer',type:'countdown',name:'Timer',enabled:true,active:false},{id:'old',type:'spin-wheel',name:'Old',enabled:true,active:false,legacy:true}],{...enhanced,revision:6});
 settings={...settings,widgetId:'timer'};await action.onDidReceiveSettings({action:key,payload:{settings}});assert.equal(settings.presetId,undefined);assert.equal(settings.unknownSetting,'keep');
 assert(!inspector.filter(p=>p.event==='getWidgets').at(-1).items.some(i=>i.value==='old'));
 settings={widgetId:'old',custom:'preserved'};await action.onDidReceiveSettings({action:key,payload:{settings}});assert(inspector.filter(p=>p.event==='getWidgets').at(-1).items.some(i=>i.value==='old'));assert.equal(settings.presetId,undefined);assert.equal(settings.custom,'preserved');
 const xml=Buffer.from(artwork.keyImage('poll','active',{name:'<unsafe>',detail:'A & B'}).split(',')[1],'base64').toString();assert(xml.includes('&lt;unsafe&gt;'));assert(xml.includes('A &amp; B'));assert(!xml.includes('<unsafe>'));
 assert(xml.includes('<rect width="144" height="144" fill="url(#brand)"/>'));assert(xml.includes('x="4" y="4" width="136" height="136"'));assert(!xml.includes('x="111"'));
 console.log('PASS: v1 legacy payload, capability gating, explicit template/run guards, stale snapshots, no replay, template persistence, missing bindings, shared Stop, own results only, pending state, custom titles, regular-widget switching, legacy selection, SVG escaping');
})().catch(error=>{console.error(error);process.exitCode=1});
