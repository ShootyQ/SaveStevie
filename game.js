/* Composition root: install systems before binding events or starting the loop. */
(() => {
'use strict';
const game = DoodleDefender.createGame();
DoodleDefender.systems.dom(game);
DoodleDefender.systems.state(game);
for (const name of ["geometry","refuge","scoring","balance","desktopControls","settings","desktopDisplay","desktopUi","soundEffects","music","chapters","ui","runResults","notebook","monsters","waves","enemies","walls","effects","abilityEffects","plaguefire","supportInks","bossEncounters","stapleBoss","wobbleBoss","wobbleRepair","upgrades","testLab","waveFinale","renderer","wobblePreview","firstLessons","paperSurface","paper","paperPress","bootstompBoss","hardhatCrew","catapulter","doodleScraps","doodleTricks","paperTricks","enemyTactics","chompzilla","blackIce","thermalShock","railInk","backdraft","iceberg","tesla","chonksShield","crayonBoss","circleShapes","utilityToys","smallUtilities","gameSpeed","underDesk","loop","saveBackup","betaScraps","discoveries","whiteBrothersPreview","whiteBrothersBoss","desktopPolish","input"]) game[name] = DoodleDefender.systems[name](game);
game.input.bind();game.api.bindControlEditor();
game.dom.bestEl.textContent=game.state.best;
game.api.resize();
game.api.updateUI();
requestAnimationFrame(game.api.loop);
})();
