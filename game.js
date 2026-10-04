/* Composition root: install systems before binding events or starting the loop. */
(() => {
'use strict';
const game = DoodleDefender.createGame();
DoodleDefender.systems.dom(game);
DoodleDefender.systems.state(game);
for (const name of ["geometry","ui","waves","enemies","walls","effects","upgrades","renderer","loop","input"]) game[name] = DoodleDefender.systems[name](game);
game.input.bind();
game.dom.bestEl.textContent=game.state.best;
game.api.resize();
game.api.updateUI();
requestAnimationFrame(game.api.loop);
})();
