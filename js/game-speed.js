/* Speed changes simulation time only. Input and audio keep their real clocks. */
DoodleDefender.systems.gameSpeed=function(game){
 const a=game.api,s=game.state;let selected=1;
 function gameSpeed(){return a.doubleSpeedUnlocked()?selected:1;}
 function renderGameSpeed(){
  const unlocked=a.doubleSpeedUnlocked(),speed=gameSpeed(),button=game.dom.$('pauseSpeedBtn');
  button.disabled=!unlocked;button.textContent='Speed: '+speed+'×';button.setAttribute?.('aria-pressed',String(speed===2));
  button.setAttribute?.('aria-label',unlocked?'Game speed '+speed+' times. Switch to '+(speed===2?1:2)+' times speed.':'Double speed locked. Defeat the first boss to unlock.');
  game.dom.$('pauseSpeedHelp').textContent=unlocked?'2× speeds up the wave timer and all combat. Boss arrivals reset to 1×. Drawing and audio stay normal.':'Beat King Doodle-Doom on wave 5 to permanently unlock 2× speed.';
 }
 function setGameSpeed(speed){if(![1,2].includes(speed)||speed===2&&!a.doubleSpeedUnlocked())return false;selected=speed;renderGameSpeed();return true;}
 function resetBossSpeed(){selected=1;renderGameSpeed();}
 function simulationSpeed(){
  if(gameSpeed()!==2||!s.running||s.paused||s.inUpgrade||s.betweenWaves||s.awaitingSpec||document.hidden||a.infoOpen()||a.windowFocusBlocked?.()||a.firstLessonActive()||a.synergyRevealActive()||a.waveFinaleActive()||a.wobbleRepairActive()||a.bossEntranceActive())return 1;
  return 2;
 }
 Object.assign(a,{gameSpeed,simulationSpeed,setGameSpeed,renderGameSpeed,resetBossSpeed});
 game.dom.$('pauseSpeedBtn').onclick=()=>setGameSpeed(gameSpeed()===2?1:2);
 return {};
};
