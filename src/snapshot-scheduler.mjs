// One timer, one in-flight save, at most one replacement final snapshot.
export class SnapshotScheduler{
 constructor({capture,persist,delayMs=0,lastState='',onError=()=>{}}){Object.assign(this,{capture,persist,delayMs,lastState,onError});this.dirty=false;this.closed=false;this.inFlight=false;this.pending=undefined;this.timer=null;this.error=null;this.job=Promise.resolve();}
 changed(){if(!this.persist||this.closed)return;this.dirty=true;if(!this.inFlight&&this.delayMs===0)this.flush();else this.arm();}
 arm(){if(!this.persist||this.closed||this.inFlight||this.timer!==null)return;this.timer=setTimeout(()=>{this.timer=null;this.flush();},this.delayMs);}
 flush(force=false){if(this.timer!==null){clearTimeout(this.timer);this.timer=null;}if(!this.persist)return this.lastState;if(!this.dirty&&!force)return this.lastState;const state=this.capture();this.lastState=state;this.dirty=false;if(this.inFlight)this.pending=state;else this.write(state);return state;}
 write(state){let value;try{value=this.persist(state);}catch(e){this.failed(e);return;}if(value&&typeof value.then==='function'){this.inFlight=true;this.job=Promise.resolve(value).then(()=>this.finish(true),e=>{this.failed(e);this.finish(false);});}else this.finish(true);}
 failed(e){this.error=e;this.dirty=true;this.onError(e);}
 finish(ok){this.inFlight=false;if(ok)this.error=null;if(this.pending!==undefined){const state=this.pending;this.pending=undefined;this.write(state);}else if(ok&&this.dirty&&!this.closed)this.arm();}
 async wait(){while(this.inFlight)await this.job;return !this.error;}
 close(){this.closed=true;this.flush();return this.wait();}
}
