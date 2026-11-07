const fs=require('fs'),vm=require('vm'),A='/home/claude/agricultural-platform-fixed/';
let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x)))};
// ---- rooms (points) ----
const ctx={window:{},console,setTimeout,clearTimeout,document:{}};vm.createContext(ctx);
for(const f of ['rooms-config','rooms-utils','rooms-api','rooms-progress'])
  vm.runInContext(fs.readFileSync(A+'about/js/'+f+'.js','utf8')+(f==='rooms-config'?';this.ROOMS_CONFIG=ROOMS_CONFIG':f==='rooms-utils'?';this.RoomsUtils=RoomsUtils':f==='rooms-api'?';this.RoomsApi=RoomsApi':';this.RoomsProgress=RoomsProgress'),ctx);
const {RoomsApi,RoomsProgress}=ctx;
const raw=(tp)=>({id:'r1',slug:'soil',title:'تربة',total_points:tp,tasks:[{id:'t1',title:'a',points:10},{id:'t2',title:'b',points:20}]});
ok('totalPoints من قاعدة البيانات', RoomsApi.normalizeRoom(raw(75)).totalPoints===75);
ok('fallback لمجموع المهام إن غاب العمود', RoomsApi.normalizeRoom({...raw(),total_points:undefined}).totalPoints===30);
ok('القيمة 0 من القاعدة تُحترم', RoomsApi.normalizeRoom(raw(0)).totalPoints===0);
const room=RoomsApi.normalizeRoom(raw(30));
RoomsProgress.completions=new Map([['t1',{points:10,completedAt:'2026-01-01'}],['gone',{points:90,completedAt:'2026-01-02'}]]);
const f=RoomsProgress.forRoom(room);ok('forRoom: المكتسب من مهام الغرفة فقط والمتاح من القاعدة',f.points===10&&f.totalPoints===30&&f.done===1,f);
const o=RoomsProgress.overall([room]);ok('overall: المكتسب = كل الإنجازات والمتاح = مجموع الغرف',o.points===100&&o.totalPoints===30,o);
// fallback عند غياب العمود
ok('isMissingPointsColumn(42703)',RoomsApi.isMissingPointsColumn({code:'42703'})&&!RoomsApi.isMissingPointsColumn({code:'500',message:'x'}));
let calls=[];ctx.PlatformAuth={getClient:()=>({from:()=>{const b={select(c){calls.push(c);return b},eq(){return b},order(){return b},then(r){return Promise.resolve(calls.length===1?{data:null,error:{code:'42703',message:'column rooms.total_points does not exist'}}:{data:[raw(30)],error:null}).then(r)}};return b}})};
ctx.window.PlatformAuth=ctx.PlatformAuth;
vm.runInContext('RoomsApi.noTotalPoints=false',ctx);
ctx.RoomsUtils.withTimeout=(p)=>p;
RoomsApi.listRooms().then(r=>{ok('listRooms يعيد المحاولة بدون total_points',calls.length===2&&calls[0].includes('total_points')&&!calls[1].includes('total_points')&&r.data.length===1,calls);
  // ---- admin graduation module ----
  let cfg;const w={AdminData:{createRepository:()=>({update:()=>Promise.resolve({})})},AdminCrud:{define:(i,c)=>{cfg=c}}};
  vm.runInContext(fs.readFileSync(A+'admin/js/modules/graduation.js','utf8'),vm.createContext({window:w,URL,Date,Object,Array}));
  const form=cfg.toForm({title:'t',students:['أ','ب'],objectives:['h'],keywords:['k'],gallery_images:['https://a.b/1.png'],external_links:[{title:'مرجع',url:'https://x.y'}]});
  ok('toForm يحوّل المصفوفات لأسطر',form.students_lines.length===2&&form.links_lines[0]==='مرجع | https://x.y');
  const v={...form};const err=cfg.beforeSave(v);
  ok('beforeSave يعيد البناء ذهابًا وإيابًا',err===''&&v.external_links[0].url==='https://x.y'&&v.students.length===2&&!('students_lines' in v)&&v.gallery_images.length===1,v);
  ok('beforeSave يرفض رابط صورة سيئ',cfg.beforeSave({gallery_lines:['javascript:alert(1)'],links_lines:[]})!=='');
  ok('beforeSave يرفض مرجعًا برابط سيئ',cfg.beforeSave({gallery_lines:[],links_lines:['x | ftp://a']})!=='');
  ok('مشروع جديد مسودة افتراضيًا',cfg.defaults.is_published===false);
  const t={};vm.runInContext(fs.readFileSync(A+'admin/js/modules/rooms.js','utf8'),vm.createContext({window:{AdminDom:{html(){},raw(){}},AdminData:{},AdminCrud:{define:(i,c)=>{t[i]=c}}}}));
  ok('حقل نقاط المهمة اليدوي أُزيل من نموذج المهام',!t.tasks.fields.some(x=>x.key==='points')&&t.quiz.fields.some(x=>x.key==='points'));
  console.log(`\n${pass}/${pass+fail} passed`);process.exit(fail?1:0);
});
