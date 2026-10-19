// FIFO admission per 32 KiB frame. A large attachment cannot hold the writer
// across frames; memory and waiting requests remain bounded.
export class FairWriter {
 constructor(limit=16){this.limit=limit;this.waiting=0;this.tail=Promise.resolve();}
 run(fn){if(this.waiting>=this.limit)return Promise.reject(Error('Blob writer busy'));this.waiting++;const job=this.tail.then(fn).finally(()=>{this.waiting--});this.tail=job.catch(()=>{});return job;}
}
