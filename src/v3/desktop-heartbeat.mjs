// Native desktop timers are independent of Chromium's hidden-window timer budget.
// No Electron power blocker: sleep/exit still suspends work and durable queues stay put.
export function desktopBackgroundEnabled(platform){return !platform?.isMobileApp&&!platform?.isIosApp&&!platform?.isAndroidApp&&!!(platform?.isDesktopApp||platform?.isWin||platform?.isMacOS||platform?.isLinux);}
export function startDesktopHeartbeat({timers,tick,intervalMs=10000}){
 let stopped=false,busy=false;
 const run=async()=>{if(stopped||busy)return;busy=true;try{await tick();}catch{}finally{busy=false;}};
 const timer=timers.setInterval(()=>void run(),intervalMs);timer?.unref?.();
 return ()=>{stopped=true;timers.clearInterval(timer);};
}
export async function boundedDesktopCheck({client,timers,timeoutMs=20000,isCurrent=()=>true}){
 // A browser request timeout can itself be throttled while hidden. Bound only
 // the liveness probe with a native timeout, never repeat native filesystem I/O.
 let deadline;
 try{return await Promise.race([client.checkConnection(),new Promise(resolve=>{deadline=timers.setTimeout(()=>{if(isCurrent()&&!client.stopped&&!client.transportBlocked&&!client.terminalCloseCode)client.resume();resolve(false);},timeoutMs);deadline?.unref?.();})]);}
 finally{timers.clearTimeout(deadline);}
}
