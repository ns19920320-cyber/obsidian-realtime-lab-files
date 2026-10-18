// Local operator CLI, not exposed through HTTP or Obsidian. Supply filesystem
// paths only; it never asks for, reads or creates an authentication credential.
import {createServerBackup,verifyServerBackup,restoreServerBackup,scheduleServerBackups} from '../src/v3/server-backup.mjs';
const [command,source,target]=process.argv.slice(2);
try{
 if(command==='create'&&source&&target)console.log(JSON.stringify(await createServerBackup(source,target)));
 else if(command==='verify'&&source&&!target)console.log(JSON.stringify(await verifyServerBackup(source)));
 else if(command==='restore'&&source&&target)console.log(JSON.stringify(await restoreServerBackup(source,target)));
 else if(command==='watch'&&source&&target){const intervalMs=Number(process.env.LAB_BACKUP_INTERVAL_MS||86400000),keep=Number(process.env.LAB_BACKUP_KEEP||14),maxAgeMs=Number(process.env.LAB_BACKUP_MAX_AGE_DAYS||30)*86400000;if(!Number.isInteger(keep)||keep<1||keep>10000||!Number.isFinite(maxAgeMs)||maxAgeMs<0)throw Error('Invalid retention policy');const job=scheduleServerBackups({source,backupRoot:target,intervalMs,retention:{keep,maxAgeMs},onStatus:s=>console.log(JSON.stringify({time:new Date().toISOString(),...s}))});const keepAlive=setInterval(()=>{},60000);for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{clearInterval(keepAlive);void job.close().then(()=>process.exit());});}
 else throw Error('Usage: node scripts/server-backup.mjs create SOURCE BACKUP_ROOT | verify SNAPSHOT | restore SNAPSHOT NEW_DIRECTORY | watch SOURCE BACKUP_ROOT');
}catch(e){console.error(e.message);process.exitCode=1;}
