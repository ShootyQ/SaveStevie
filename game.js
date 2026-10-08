/* Composition root: install systems before binding events or starting the loop. */
(() => {
'use strict';
const game = DoodleDefender.createGame();
DoodleDefender.systems.dom(game);
DoodleDefender.systems.state(game);
for (const name of ["geometry","refuge","balance","settings","soundEffects","music","chapters","ui","notebook","monsters","waves","enemies","walls","effects","abilityEffects","plaguefire","supportInks","bossEncounters","stapleBoss","wobbleBoss","wobbleRepair","upgrades","testLab","waveFinale","renderer","wobblePreview","loop","input"]) game[name] = DoodleDefender.systems[name](game);
game.input.bind();
game.dom.bestEl.textContent=game.state.best;
game.api.resize();
game.api.updateUI();
requestAnimationFrame(game.api.loop);
})();
