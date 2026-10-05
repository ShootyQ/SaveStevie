DoodleDefender.systems.state = function initializeState(game) {
game.state.W = 800;
game.state.H = 700;
game.state.dpr = 1;
game.state.last = 0;
game.state.spawnTimer = 0;
game.state.running = false;
game.state.paused = false;
game.state.inUpgrade = false;
game.state.betweenWaves = false;
game.state.endless = false;
game.state.awaitingSpec = false;
game.state.wave = 1;
game.state.kills = 0;
game.state.score = 0;
game.state.waveKills = 0;
game.state.waveTime = 25;
game.state.timeLeft = 25;
game.state.best = +(localStorage.getItem('doodleDefenderBestV4')||1);
game.state.walls = [];
game.state.enemies = [];
game.state.particles = [];
game.state.floaters = [];
game.state.projectiles = [];
game.state.enemyShots = [];
game.state.drawing = false;
game.state.currentWall = null;
game.state.rerolls = 1;
game.state.specialization = 'none';
game.state.pendingNextWave = false;
game.state.finalOvertime = false;
game.state.finalBossDefeated = false;
game.state.player = {x:400,y:350,r:17,maxHp:100,hp:100,rockCd:0};
game.state.stats = {
  maxInk:250,ink:250,inkRegen:8,wallHp:95,wallDamage:10,wallSlow:0,wallStun:0,
  refund:0,luck:0,playerRegen:0,doubleLine:false,tripleLine:false,explode:false,
  repairOnKill:0,freehandLevel:0,freehandCharge:0,freehandThreshold:80,freehandBank:0,freehandBankSize:40,strokeCount:0,closedBonus:1,killHeal:0,
  lineCost:.31,lineWidth:8,wallLife:72,intersectBonus:0,repairDraw:0,firstFree:false,
  firstStrokeUsed:false,playerArmor:0,rockDamage:0,rockRate:0,enemyScale:1,
  extraChoice:false,uncommonFloor:false,newCardBias:false
};
game.state.inks = {
  fire:0,frost:0,electric:0,poison:0,blast:0,vampire:0,gravity:0,repulsion:0,void:0,chaos:0
};
game.state.synergies = new Set();
game.state.discoveredSynergies = new Set();
game.state.synergySplashTimer = null;
game.state.stacks = {};
};
