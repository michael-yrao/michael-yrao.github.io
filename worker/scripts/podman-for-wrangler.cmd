@echo off
rem Local Windows twin of podman-for-wrangler.sh. UNTESTED against real Podman: no machine is initialised here.
rem Node receives the raw command line, so "=" in --provenance=false or K=V survives (cmd would split it).
if not defined PODMAN_EXE set "PODMAN_EXE=C:\Program Files\RedHat\Podman\podman.exe"
node -e "const a=process.argv.slice(1);const d=a[0]==='build'?(x=>x==='--load'||x==='--provenance'||x.startsWith('--provenance=')):()=>false;const r=require('child_process').spawnSync(process.env.PODMAN_EXE,a.filter(x=>!d(x)),{stdio:'inherit'});process.exit(r.status===null?1:r.status)" -- %*
exit /b %ERRORLEVEL%
