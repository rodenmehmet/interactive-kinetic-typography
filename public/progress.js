(() => {
  const key='word-in-motion-progress-v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}};
  const write=()=>{const v=document.getElementById('video');if(!v||!v.currentSrc)return;const match=v.currentSrc.match(/\/(FAF|DE)-(\d{2})-/);try{localStorage.setItem(key,JSON.stringify({src:v.currentSrc,time:v.currentTime||0,group:match?.[1]||'',videoId:match?`${match[1]}-${match[2]}`:''}));}catch{}};
  const restore=()=>{const v=document.getElementById('video'),saved=read();if(!v||!saved.src||v.currentSrc!==saved.src)return;const apply=()=>{if(saved.time>0&&Number.isFinite(v.duration))try{v.currentTime=Math.min(saved.time,Math.max(0,v.duration-.05));}catch{}};if(v.readyState>=1)apply();else v.addEventListener('loadedmetadata',apply,{once:true});};
  window.addEventListener('load',()=>{const v=document.getElementById('video');if(!v)return;const originalGroup=window.selectGroup,originalVideo=window.selectVideo;if(originalGroup&&originalVideo){window.selectGroup=(group)=>{originalGroup(group);const saved=read();if(saved.group===group&&saved.videoId)originalVideo(saved.videoId,false);};}v.addEventListener('timeupdate',write);v.addEventListener('pause',write);v.addEventListener('loadedmetadata',restore);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')write();});restore();});
})();
