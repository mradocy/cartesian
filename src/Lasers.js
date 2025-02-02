/* When making other objs, add a laserLines property, an array of 
 * {x0, y0, x1, y1, color} (relative positions if obj also has x and y properties)
 * to test against the lasers
 */

FullGame.Lasers = {
    graphics:null, //the Graphics object that will draw all the lasers
    renders:[], //array of data used to draw each laser segment
    recycledRenders:[], //pool of renders used already
    particles:[], //array of data used to draw particles
    recycledParticles:[], //pool of particles used already
    sights:[], //array of data used to draw laser sights
    recycledSights:[], //pool of sights used already
    
    laserburnReds:[], //pool of recycled laserburnRed sprites
    laserburnBlues:[],
    laserburnGreens:[],
    laserburnWhites:[],
    laserburnBlacks:[],
    laserburnPowers:[], //pool of recycled laserburnPower sprites
    laserburnPowerBlues:[],
    laserburnPowerGreens:[],
    laserburnPowerPurples:[],
    
    flicker:0, //this number will slightly alter the color of the lasers. It cycles every frame
    particleTime:0,
    
    //for special levels
    number6Rendered:false,
    starRendered:false,
    artifactRendered:false,
    tilesFilled:[], //table of bool for each tile showing if the tile is filled by a laser or not
    
    //laser color constants
    COLOR_RED1:0xFF0000, //outer part of red laser
    COLOR_RED2:0xFF1919, //inner part of red laser
    COLOR_RED1_F1:0xFF1717, //outer part of red laser when flicker==1
    COLOR_RED2_F1:0xFF2A2A, //inner part of red laser when flicker==1
    COLOR_BLUE1:0x0000FF,
    COLOR_BLUE2:0x2828FF,
    COLOR_BLUE1_F1:0x1515FF,
    COLOR_BLUE2_F1:0x3131FF,
    COLOR_GREEN1:0x00FF00,
    COLOR_GREEN2:0x14FF14,
    COLOR_GREEN1_F1:0x12FF12,
    COLOR_GREEN2_F1:0x26FF26,
    COLOR_BLACK1:0x020202,
    COLOR_BLACK2:0x262626,
    COLOR_BLACK1_F1:0x080808,
    COLOR_BLACK2_F1:0x2A2A2A,
    COLOR_PURPLE1:0x910F91,
    COLOR_PURPLE2:0xA512A5,
    COLOR_PURPLE1_F1:0x940F94,
    COLOR_PURPLE2_F1:0xA812A8,
    
    //laser thickness, alpha constants
    THICKNESS_NORMAL1:5, //outer part of normal laser
    THICKNESS_NORMAL2:3, //inner part of normal laser
    ALPHA_NORMAL1:.9,//.6, //outer part of normal laser
    ALPHA_NORMAL2:1.0,//.9, //inner part of normal laser
    THICKNESS_TRANSPARENT:4,
    ALPHA_TRANSPARENT:.15,
    THICKNESS_THICK1:12,
    THICKNESS_THICK2:3,
    ALPHA_THICK1:.6,
    ALPHA_THICK2:.9,
    THICKNESS_FADEOUT:4, //thickness at beginning of fadeout
    ALPHA_FADEOUT:.6, //alpha at beginning of fadeout
    FADEOUT_DURATION:.2, //time for fadeout laser to fade out
    THICKNESS_RETICLE:1, //not an actual laser, but part of the reticle
    ALPHA_RETICLE:.3,
    
    PARTICLE_SPAWN_DURATION:.017, //the time interval between 2 particles spawn at the same spot
    PARTICLE_SPEED_MIN:50,
    PARTICLE_SPEED_MAX:200,
    PARTICLE_GRAVITY:300,
    PARTICLE_LIFE_DURATION:.25,
    PARTICLE_ALPHA1:1,
    PARTICLE_ALPHA2:1,
    PARTICLE_THICKNESS1_MIN:2,//1,
    PARTICLE_THICKNESS1_MAX:3,//2,
    PARTICLE_THICKNESS2:2,
    
    SIGHT_ALPHA:.9,
    SIGHT_RADIUS:7,
    SIGHT_THICK_ALPHA:.6,
    SIGHT_THICK_RADIUS:12,
    
    MAX_LASER_DIST:20000 //maximum distance reflected laser can travel
        
};

//make graphics object to handle all lasers
FullGame.Lasers.makeGraphics = function() {
    this.graphics = game.add.graphics(0, 0, FullGame.GI.laserGroup);
    
    var blurX = game.add.filter('BlurX');
    var blurY = game.add.filter('BlurY');
    this.graphics.filters = [blurX, blurY];
    
    
    this.tilesFilled = [];
    for (var x=0; x<FullGame.GI.tileCols.length; x++){
        var col = [];
        for (var y=0; y<FullGame.GI.tileCols[x].length; y++){
            col.push(false);
        }
        this.tilesFilled.push(col);
    }
    return this.graphics;
};

/* Call this function to fire a laser.
 * Call this AFTER EVERYTHING HAS FINISHED MOVING
 * This needs to be called each frame for a laser that is continuously firing,
 *      EXCEPT for lasers of type LASER_FADEOUT, which exist until they completely fade out.
 */
FullGame.Lasers.fireLaser = function(startX, startY, cosHeading, sinHeading, color, laserType){
    var game = FullGame.GI;
    var dt = game.time.physicsElapsed;
    
    var worldWrap = FullGame.GI.worldWrap;
    var dist = 0; //(rough estimate) makes sure lasers don't go on forever
    var x0 = startX;
    var y0 = startY;
    var cos = cosHeading;
    var sin = sinHeading;
    var c = color;
    var x=0; var y=0; var i=0; var j=0;
    var tileStr;
    while (dist < this.MAX_LASER_DIST){
        
        var dToHit = 9999999999; //distance; used when comparing what the laser hit first
        var xHit = 0;
        var yHit = 0;
        var objHit = null;
        var tileTypeHit = FullGame.Til.NORMAL;
        var colorHit = FullGame.Til.BLACK;
        var normalHit = 0; //normal of the surface hit (in radians)
        
        //time until hit horizontal tile wall
        if (cos > .000001){ //going right, detect hitting left wall
            for (i = Math.max(0, Math.floor(x0 / game.tileWidth)+1); i < game.tileCols.length; i++){
                x = i * game.tileWidth;
                y = y0 + (x - x0) * (sin / cos);
                j = Math.floor(y / game.tileHeight);
                if (j < 0 || j >= game.tileCols[i].length){ //then would hit top or bottom bounds of screen
                    break;
                }
                tileStr = game.tileCols[i][j];
                if (FullGame.Til.tileHasCollision(tileStr, laserType == FullGame.Til.LASER_THICK)){
                    //would hit tile
                    var d = (x - x0) / cos;
                    if (d < dToHit){ //then would hit this tile first (compared to other things tested)
                        dToHit = d;
                        xHit = x;
                        yHit = y;
                        objHit = null;
                        tileTypeHit = FullGame.Til.tileType(tileStr);
                        colorHit = FullGame.Til.tileLeftColor(tileStr);
                        normalHit = Math.PI;
                        break;
                    }
                }
            }
            if (i == game.tileCols.length){ //then hit right bounds of world without hitting a tile
                x = i * game.tileWidth;
                y = y0 + (x - x0) * (sin / cos);
                var d = (x - x0) / cos;
                if (d < dToHit){
                    dToHit = d;
                    xHit = x;
                    yHit = y;
                    objHit = { isWorldBounds:true };
                }
            }
        } else if (cos < -.000001){ //going left, detect hitting right wall
            for (i = Math.min(game.tileCols.length-1, Math.floor(x0 / game.tileWidth)-1); i >= 0; i--){
                x = (i+1) * game.tileWidth;
                y = y0 + (x - x0) * (sin / cos);
                j = Math.floor(y / game.tileHeight);
                if (j < 0 || j >= game.tileCols[i].length){ //then would hit top or bottom bounds of screen
                    break;
                }
                tileStr = game.tileCols[i][j];
                if (FullGame.Til.tileHasCollision(tileStr, laserType == FullGame.Til.LASER_THICK)){
                    //would hit tile
                    var d = (x - x0) / cos;
                    if (d < dToHit){ //then would hit this tile first (compared to other things tested)
                        dToHit = d;
                        xHit = x;
                        yHit = y;
                        objHit = null;
                        tileTypeHit = FullGame.Til.tileType(tileStr);
                        colorHit = FullGame.Til.tileRightColor(tileStr);
                        normalHit = 0;
                        break;
                    }
                }
            }
            if (i == -1){ //then hit left bounds of world without hitting a tile
                x = 0;
                y = y0 + (x - x0) * (sin / cos);
                var d = (x - x0) / cos;
                if (d < dToHit){
                    dToHit = d;
                    xHit = x;
                    yHit = y;
                    objHit = { isWorldBounds:true };
                }
            }
        }
        
        //time until hit vertical tile wall
        if (sin > .000001){ //going down, detect hitting top wall
            for (j = Math.max(0, Math.floor(y0 / game.tileHeight)+1); j < game.tileCols[0].length; j++){
                y = j * game.tileHeight;
                x = x0 + (y - y0) * (cos / sin);
                i = Math.floor(x / game.tileWidth);
                if (i < 0 || i >= game.tileCols.length){ //then would hit left or right bounds of screen
                    break;
                }
                tileStr = game.tileCols[i][j];
                if (FullGame.Til.tileHasCollision(tileStr, laserType == FullGame.Til.LASER_THICK)){
                    //would hit tile
                    var d = (y - y0) / sin;
                    if (d < dToHit){ //then would hit this tile first (compared to other things tested)
                        dToHit = d;
                        xHit = x;
                        yHit = y;
                        objHit = null;
                        tileTypeHit = FullGame.Til.tileType(tileStr);
                        colorHit = FullGame.Til.tileTopColor(tileStr);
                        normalHit = -Math.PI/2;
                        break;
                    }
                }
            }
            if (j == game.tileCols[0].length){ //then hit bottom bounds of world without hitting a tile
                y = j * game.tileHeight;
                x = x0 + (y - y0) * (cos / sin);
                var d = (y - y0) / sin;
                if (d < dToHit){
                    dToHit = d;
                    xHit = x;
                    yHit = y;
                    objHit = { isWorldBounds:true };
                }
            }
        } else if (sin < -.000001){ //going up, detect hitting bottom wall
            for (j = Math.min(game.tileCols[0].length-1, Math.floor(y0 / game.tileHeight)-1); j >= 0; j--){
                y = (j+1) * game.tileHeight;
                x = x0 + (y - y0) * (cos / sin);
                i = Math.floor(x / game.tileWidth);
                if (i < 0 || i >= game.tileCols.length){ //then would hit left or right bounds of screen
                    break;
                }
                tileStr = game.tileCols[i][j];
                if (FullGame.Til.tileHasCollision(tileStr, laserType == FullGame.Til.LASER_THICK)){
                    //would hit tile
                    var d = (y - y0) / sin;
                    if (d < dToHit){ //then would hit this tile first (compared to other things tested)
                        dToHit = d;
                        xHit = x;
                        yHit = y;
                        objHit = null;
                        tileTypeHit = FullGame.Til.tileType(tileStr);
                        colorHit = FullGame.Til.tileBottomColor(tileStr);
                        normalHit = Math.PI/2;
                        break;
                    }
                }
            }
            if (j == -1){ //then hit top bounds of world without hitting a tile
                y = 0;
                x = x0 + (y - y0) * (cos / sin);
                var d = (y - y0) / sin;
                if (d < dToHit){
                    dToHit = d;
                    xHit = x;
                    yHit = y;
                    objHit = { isWorldBounds:true };
                }
            }
        }
        
        //time until hit player
        if (FullGame.GI.player != null && FullGame.GI.player.visible){
            var plr = FullGame.GI.player;
            var pt;
            if ((x0-plr.x)*(x0-plr.x) + (y0-plr.y)*(y0-plr.y) <= plr.RADIUS*plr.RADIUS){
                //can still hit player, even if it starts from inside
                //fixing a glitch
                pt = this.laserHitCirclePoint(x0, y0, xHit, yHit, plr.x+(plr.body.velocity.x*dt), plr.y+(plr.body.velocity.y*dt), plr.RADIUS*3/4);
            } else {
                pt = this.laserHitCirclePoint(x0, y0, xHit, yHit, plr.x+(plr.body.velocity.x*dt), plr.y+(plr.body.velocity.y*dt), plr.RADIUS);
            }
            if (pt != null) {
                var d = Math.sqrt((pt.x-x0)*(pt.x-x0)+(pt.y-y0)*(pt.y-y0));
                if (d < dToHit){
                    dToHit = d;
                    xHit = pt.x;
                    yHit = pt.y;
                    objHit = plr;
                    colorHit = FullGame.Til.BLACK;
                    normalHit = Math.atan2(yHit-plr.y, xHit-plr.x);
                }
            }
        }
        
        //time until hit eyebot
        for (i=0; i<FullGame.GI.eyebots.length; i++){
            var eb = FullGame.GI.eyebots[i];
            if (eb.dead) continue;
            var pt = this.laserHitCirclePoint(x0, y0, xHit, yHit, eb.x, eb.y, eb.RADIUS);
            if (pt != null) {
                var d = Math.sqrt((pt.x-x0)*(pt.x-x0)+(pt.y-y0)*(pt.y-y0));
                if (d < dToHit){
                    dToHit = d;
                    xHit = pt.x + 1*(pt.x-eb.x)/eb.RADIUS;
                    yHit = pt.y + 1*(pt.y-eb.y)/eb.RADIUS;
                    objHit = eb;
                    normalHit = Math.atan2(yHit-eb.y, xHit-eb.x);
                    colorHit = eb.colorHit(normalHit);
                }
            }
        }
        
        //time until hit portal
        for (i=0; i<FullGame.GI.portals.length; i++){
            var por = FullGame.GI.portals[i];
            var pts = this.laserHitCirclePoint(x0, y0, xHit, yHit, por.x, por.y, por.RADIUS, true);
            if (pts != null) {
                var ptx = (pts.p1.x+pts.p2.x)/2;
                var pty = (pts.p1.y+pts.p2.y)/2;
                var d = Math.sqrt((ptx-x0)*(ptx-x0)+(pty-y0)*(pty-y0));
                if (d < dToHit){
                    dToHit = d;
                    xHit = ptx;
                    yHit = pty;
                    objHit = por;
                    normalHit = Math.atan2(yHit-por.y, xHit-por.x);
                    colorHit = FullGame.Til.BLACK;
                }
            }
        }
        
        //time until hit griddy
        for (i=0; i<FullGame.GI.griddys.length; i++){
            var grd = FullGame.GI.griddys[i];
            if (grd.dead) continue;
            if (laserType == FullGame.Til.LASER_TRANSPARENT){
                continue; //decided that transparent lasers won't hit griddy either
                var pts = this.laserHitCirclePoint(x0, y0, xHit, yHit, grd.x, grd.y, grd.RADIUS, true);
                if (pts != null) {
                    var ptx = (pts.p1.x+pts.p2.x)/2;
                    var pty = (pts.p1.y+pts.p2.y)/2;
                    var d = Math.sqrt((ptx-x0)*(ptx-x0)+(pty-y0)*(pty-y0));
                    if (d < dToHit){
                        dToHit = d;
                        xHit = ptx;
                        yHit = pty;
                        objHit = grd;
                        normalHit = Math.atan2(yHit-grd.y, xHit-grd.x);
                        colorHit = FullGame.Til.BLACK;
                    }
                }
            }
        }
        
        //time until hit another object
        for (i=0; i<FullGame.GI.objs.length; i++){
            var obj = FullGame.GI.objs[i];
            if (obj.laserLines == undefined) continue;
            for (j=0; j<obj.laserLines.length; j++){
                var line = obj.laserLines[j];
                x = line.x0;
                y = line.y0;
                var lx2 = line.x1;
                var ly2 = line.y1;
                if (obj.x != undefined){
                    x += obj.x;
                    lx2 += obj.x;
                }
                if (obj.y != undefined){
                    y += obj.y;
                    ly2 += obj.y;
                }
                if (obj.body != undefined && obj.body.velocity != undefined){
                    x += obj.body.velocity.x * dt;
                    y += obj.body.velocity.y * dt;
                    lx2 += obj.body.velocity.x * dt;
                    ly2 += obj.body.velocity.y * dt;
                }
                var pt = this.laserHitLinePoint(x0, y0, xHit, yHit, x, y, lx2, ly2);
                if (pt == null) continue;
                var d = Math.sqrt((pt.x-x0)*(pt.x-x0)+(pt.y-y0)*(pt.y-y0));
                if (d < dToHit){
                    dToHit = d;
                    xHit = pt.x;
                    yHit = pt.y;
                    objHit = obj;
                    colorHit = line.color;
                    var angle = Math.atan2(ly2-y, lx2-x);
                    var normal1 = angle + Math.PI/2;
                    var normal2 = angle - Math.PI/2;
                    if (Math.abs(Math.angleDiff(normal1, Math.atan2(y0-yHit, x0-xHit))) < Math.PI/2){
                        normalHit = normal1;
                    } else {
                        normalHit = normal2;
                    }
                }
            }
        }
        
        
        
        //create render for laser
        var reflect = FullGame.Til.willReflect(c, colorHit);
        var r;
        if (this.recycledRenders.length > 0){
            r = this.recycledRenders.pop();
        } else {
            r = {};
        }
        r.x0 = x0;
        r.y0 = y0;
        r.x1 = xHit;
        r.y1 = yHit;
        r.color = c;
        r.type = laserType;
        r.t = 0; //for LASER_FADEOUT type
        this.renders.push(r);
        
        //check if laser passed through any orbs
        if (laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK ||
            laserType == FullGame.Til.LASER_TRANSPARENT){
            for (i=0; i<FullGame.GI.orbs.length; i++){
                var orb = FullGame.GI.orbs[i];
                if (orb.type == undefined || orb.type != "orb") continue;
                if (orb.color != c) continue;
                if (!orb.visible) continue;
                var pt = this.laserHitCirclePoint(x0, y0, xHit, yHit, orb.x, orb.y, orb.radius);
                if (pt == null) continue;
                
                //at this point, confirmed orb has been passed through
                if (laserType == FullGame.Til.LASER_TRANSPARENT){
                    if (orb.HALF_GLOW_MECHANIC_EXISTS){
                        if (orb.halfGlowThisFrame)
                            orb.glowThisFrame = true;
                        else
                            orb.halfGlowThisFrame = true;
                    }
                } else {
                    orb.glowThisFrame = true;
                }
            }
        }
        
        //check if laser passed through any gems
        if (laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK ||
            laserType == FullGame.Til.LASER_TRANSPARENT){
            for (i=0; i<FullGame.GI.gems.length; i++){
                var gem = FullGame.GI.gems[i];
                if (!gem.isGem) continue;
                if (gem.color != c) continue;
                
                var pts = this.laserHitCirclePoint(x0, y0, xHit, yHit, gem.x, gem.y, gem.radius, true);
                if (pts == null) continue;
                
                //at this point, confirmed gem has been passed through
                gem.spawnLasers(c, laserType, pts.p1.x, pts.p1.y, pts.p2.x, pts.p2.y);
                
            }
        }
        
        //check if laser passed through any griddys
        if (laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK){
            for (i=0; i<FullGame.GI.griddys.length; i++){
                var grd = FullGame.GI.griddys[i];
                
                var pts = this.laserHitCirclePoint(x0, y0, xHit, yHit, grd.x, grd.y, grd.RADIUS, true);
                if (pts == null) continue;
                
                //at this point, confirmed grd has been passed through
                grd.shotAt();
            }
        }
        
        //record all tiles the laser passed through
        //(if thick laser) also destroy sand tiles it passed through immediately
        //This isn't working.  Feature wasn't great anyway
        if (laserType != FullGame.Til.LASER_TRANSPARENT && laserType != FullGame.Til.LASER_FADEOUT){
            if (Math.abs(cos) > .00001){
                for (x = Math.min(x0, xHit); x <= Math.max(x0, xHit); x = Math.min(Math.max(x0, xHit), x+game.tileWidth)){
                    y = y0 + (x - x0) * (sin / cos);
                    i = Math.floor(x / game.tileWidth);
                    j = Math.floor(y / game.tileHeight);
                    if (i < 0 || i >= game.tileCols.length) break;
                    if (j < 0 || j >= game.tileCols[i].length) break;

                    this.tilesFilled[i][j] = true;
                    if (false && laserType == FullGame.Til.LASER_THICK &&
                        FullGame.Til.tileType(game.tileCols[i][j]) == FullGame.Til.SAND){
                        var coords = "" + i + "," + j;
                        game.tilesPressuredThisFrame.push(coords);
                        game.destroyTileCounters[coords] = 99999; //so will be destroyed immediately
                    }
                    if (x == Math.max(x0, xHit)) break;
                }
            }
            if (Math.abs(sin) > .00001){
                for (y = Math.min(y0, yHit); y <= Math.max(y0, yHit); y = Math.min(Math.max(y0, yHit), y+game.tileHeight)){
                    x = x0 + (y - y0) * (cos / sin);
                    i = Math.floor(x / game.tileWidth);
                    j = Math.floor(y / game.tileHeight);
                    if (i < 0 || i >= game.tileCols.length) break;
                    if (j < 0 || j >= game.tileCols[i].length) break;

                    this.tilesFilled[i][j] = true;
                    if (false && laserType == FullGame.Til.LASER_THICK &&
                        FullGame.Til.tileType(game.tileCols[i][j]) == FullGame.Til.SAND){
                        var coords = "" + i + "," + j;
                        game.tilesPressuredThisFrame.push(coords);
                        game.destroyTileCounters[coords] = 99999; //so will be destroyed immediately
                    }
                    if (y == Math.max(y0, yHit)) break;
                }
            }
        }
        
        
        //check what laser did
        dist += dToHit;
        if (objHit == null){
            //hit tile
            var x = Math.floor(xHit / game.tileWidth);
            var y = Math.floor(yHit / game.tileHeight);
            if (normalHit == 0) //hit right side of tile
                x--;
            if (normalHit == Math.PI/2) //hit bottom side of tile
                y--;
            tileStr = game.tileCols[x][y];
            var tileWillBeDestroyed = false;
            if (!reflect &&
                (((laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK) && FullGame.Til.tileType(tileStr) == FullGame.Til.SAND) ||
                (laserType == FullGame.Til.LASER_THICK && FullGame.Til.tileType(tileStr) == FullGame.Til.NORMAL))){
                //hit tile that will be destroyed
                var coords = "" + x + "," + y;
                game.tilesPressuredThisFrame.push(coords);
                tileWillBeDestroyed = true;
            }
            
            //create laserburn
            if (false && //disabled for now
                !tileWillBeDestroyed &&
                (laserType == FullGame.Til.LASER_NORMAL ||
                 laserType == FullGame.Til.LASER_THICK)) {
                
                var lb;
                var lbKey = "laserburn_red";
                var lbCache = this.laserburnReds;
                if (laserType == FullGame.Til.LASER_THICK){
                    switch (c){
                    case FullGame.Til.PURPLE:
                        lbCache = this.laserburnPowerPurples;
                        lbKey = "laserburn_power_purple";
                        break;
                    case FullGame.Til.BLUE:
                        lbCache = this.laserburnPowerBlues;
                        lbKey = "laserburn_power_blue";
                        break;
                    case FullGame.Til.GREEN:
                        lbCache = this.laserburnPowerGreens;
                        lbKey = "laserburn_power_green";
                        break;
                    case FullGame.Til.RED:
                    default:
                        lbCache = this.laserburnPowers;
                        lbKey = "laserburn_power";
                        break;
                    }
                } else {
                    switch (c){
                    case FullGame.Til.BLUE:
                        lbCache = this.laserburnBlues;
                        lbKey = "laserburn_blue";
                        break;
                    case FullGame.Til.GREEN:
                        lbCache = this.laserburnGreens;
                        lbKey = "laserburn_green";
                        break;
                    case FullGame.Til.BLACK:
                        lbCache = this.laserburnBlacks;
                        lbKey = "laserburn_black";
                        break;
                    case FullGame.Til.WHITE:
                        lbCache = this.laserburnWhites;
                        lbKey = "laserburn_white";
                        break;
                    case FullGame.Til.RED:
                    default:
                        lbCache = this.laserburnReds;
                        lbKey = "laserburn_red";
                        break;
                    }
                }
                if (lbCache.length == 0){
                    lb = game.add.sprite(xHit, yHit, lbKey, undefined, FullGame.GI.frontGroup);
                    lb.anchor.setTo(0, .5);
                    lb.animations.add("play", [0, 1, 2, 3], 20, false);
                    lb.duration = 4 / 20.0;
                    lb.lbCache = lbCache;
                    lb.update = function() {
                        var dt = game.time.physicsElapsed;
                        this.t += dt;
                        if (this.t > this.duration){
                            this.visible = false;
                            this.lbCache.push(this);
                        }
                    };
                } else {
                    lb = lbCache.pop();
                    lb.x = xHit;
                    lb.y = yHit;
                    lb.visible = true;
                    lb.animations.stop();
                }
                lb.animations.play("play");
                lb.t = 0;
                lb.rotation = normalHit + Math.PI;
            }
            
        } else if (objHit == FullGame.GI.player){
            //hit player
            if (!reflect &&
                (laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK)){
                objHit.damage((xHit < objHit.x), (laserType == FullGame.Til.LASER_THICK));
            }
        } else if (objHit.isEyebot != undefined && objHit.isEyebot){
            //hit eyebot, can damage it
            if (!reflect &&
                (laserType == FullGame.Til.LASER_NORMAL || laserType == FullGame.Til.LASER_THICK)){
                objHit.damage();
            }
        } else if (objHit.isRoplate != undefined && objHit.isRoplate){
            //hit roplate, can rotate it
            if (!reflect){
                if (laserType == FullGame.Til.LASER_NORMAL){
                    objHit.applyForce(xHit, yHit, Math.atan2(yHit-y0, xHit-x0));
                } else if (laserType == FullGame.Til.LASER_THICK){
                    objHit.applyThickForce(xHit, yHit, Math.atan2(yHit-y0, xHit-x0));
                }
            }
        } else if (objHit.isSlider != undefined && objHit.isSlider){
            //hit slider, can move it
            if (!reflect){
                if (laserType == FullGame.Til.LASER_NORMAL){
                    objHit.applyForce(normalHit+Math.PI, Math.atan2(yHit-y0, xHit-x0));
                } else if (laserType == FullGame.Til.LASER_THICK){
                    objHit.applyThickForce(normalHit+Math.PI, Math.atan2(yHit-y0, xHit-x0));
                }
            }
        } else if (objHit.isDoor != undefined && objHit.isDoor){
            //hit door, can destroy it if laser is thick
            if (!reflect && laserType == FullGame.Til.LASER_THICK){
                var dirS = "right";
                if (Math.abs(normalHit + Math.PI/2) < .1){ //hit top side
                    dirS = "down";
                } else if (Math.angleDiff(normalHit, 0) < .1){ //hit right side
                    dirS = "left";
                } else if (Math.angleDiff(normalHit, Math.PI/2) < .1){ //hit bottom side
                    dirS = "up";
                } else if (Math.angleDiff(normalHit, Math.PI) < .1){ //hit left side
                    dirS = "right";
                }
                
                objHit.breakOpen(dirS);
            }
        } else if (objHit.isAlien != undefined && objHit.isAlien) {
            //hit alien, can damage it
            if (!reflect && laserType == FullGame.Til.LASER_NORMAL &&
                colorHit == FullGame.Til.BLACK){
                objHit.damage();
            }
        }
        
        var goingOutOfBounds = false;
        if (objHit != null)
            goingOutOfBounds = (objHit.isWorldBounds != undefined && objHit.isWorldBounds);
        
        var wentThroughPortal = (objHit != null && objHit.isPortal != undefined && objHit.isPortal
            && (objHit.portalTo != null || objHit.mapTo != ""));
        
        //particles
        if (!wentThroughPortal && !goingOutOfBounds){
            this.spawnParticles(xHit, yHit, c, laserType, reflect, normalHit);
        }
        
        
        if (wentThroughPortal && objHit.portalTo != null) {
            //hit portal, make new laser out other side
            x0 = objHit.portalTo.x + (xHit - objHit.x);
            y0 = objHit.portalTo.y + (yHit - objHit.y);
            //angle stays the same
            
        } else if (reflect){
            //create new laser
            var angleDiff = normalHit - Math.atan2(-sin, -cos);
            var angle = normalHit + angleDiff;
            cos = Math.cos(angle);
            sin = Math.sin(angle);
            x0 = xHit;
            y0 = yHit;
            
        } else if (goingOutOfBounds && worldWrap){
            //create new laser with world wrap
            if (xHit <= 0){
                x0 = game.worldWidth - 1;
            } else if (xHit >= game.worldWidth){
                x0 = 0;
            } else {
                x0 = xHit;
            }
            if (yHit <= 0){
                y0 = game.worldHeight - 1;
            } else if (yHit >= game.worldHeight){
                y0 = 0;
            } else {
                y0 = yHit;
            }
            //angle stays the same
            
        } else { //no new laser created
            
            break;
        }
        
        
    }
    
    
    
};

//returns {x, y} where laser segment woudl hit line segment, or null if wouldn't hit
FullGame.Lasers.laserHitLinePoint = function(startX, startY, endX, endY, lineX1, lineY1, lineX2, lineY2) {
    
    //bounds checking
    if (Math.max(startX, endX) < Math.min(lineX1, lineX2)) return null;
    if (Math.min(startX, endX) > Math.max(lineX1, lineX2)) return null;
    if (Math.max(startY, endY) < Math.min(lineY1, lineY2)) return null;
    if (Math.min(startY, endY) > Math.max(lineY1, lineY2)) return null;
    
    //intersection
    var pt = this.linesIntersectPoint(startX, startY, endX, endY, lineX1, lineY1, lineX2, lineY2);
    if (pt == null) return null;
    
    //doesn't count if too close to the starting point
    if ((startX-pt.x)*(startX-pt.x) + (startY-pt.y)*(startY-pt.y) < 1){
        return null;
    }
    
    //last check to see if point is actually on the lines
    if (Math.min(startX, endX)-.00001 < pt.x && pt.x < Math.max(startX, endX)+.00001 &&
        Math.min(startY, endY)-.00001 < pt.y && pt.y < Math.max(startY, endY)+.00001 &&
        Math.min(lineX1, lineX2)-.00001 < pt.x && pt.x < Math.max(lineX1, lineX2)+.00001 &&
        Math.min(lineY1, lineY2)-.00001 < pt.y && pt.y < Math.max(lineY1, lineY2)+.00001
       ){
        return pt;
    }
    return null;
    
};
    

//returns {x, y} where laser segment would hit circle, or null if it wouldn't hit
FullGame.Lasers.laserHitCirclePoint = function(startX, startY, endX, endY, circleX, circleY, circleRadius, returnBothPoints) {
    
    //bounds checking
    if (Math.max(startX, endX) < circleX - circleRadius) return null;
    if (Math.min(startX, endX) > circleX + circleRadius) return null;
    if (Math.max(startY, endY) < circleY - circleRadius) return null;
    if (Math.min(startY, endY) > circleY + circleRadius) return null;
    
    //wouldn't hit if started inside the circle
    if ((startX-circleX)*(startX-circleX) + (startY-circleY)*(startY-circleY) < circleRadius*circleRadius)
        return null;
    
    //intersection
    var pts = this.lineIntersectCirclePoints(startX, startY, endX, endY, circleX, circleY, circleRadius);
    if (pts == null) return null;
    //getting point closest to start
    var pt;
    if ((pts.p1.x-startX)*(pts.p1.x-startX) + (pts.p1.y-startY)*(pts.p1.y-startY) <
        (pts.p2.x-startX)*(pts.p2.x-startX) + (pts.p2.y-startY)*(pts.p2.y-startY)){
        pt = pts.p1;
    } else {
        pt = pts.p2;
    }
    //last check to see if point is actually on the line
    if (Math.min(startX, endX)-.00001 < pt.x && pt.x < Math.max(startX, endX)+.00001 &&
        Math.min(startY, endY)-.00001 < pt.y && pt.y < Math.max(startY, endY)+.00001){
        if (returnBothPoints != undefined && returnBothPoints){
            if (pt == pts.p1) return {p1:pts.p1, p2:pts.p2};
            else return {p1:pts.p2, p2:pts.p1};
        } else {
            return pt;
        }
    }
    return null;
};

//returs {x, y} of where line (l1x1, l1y1, l1x2, l1y2) and line (l2x1, l2y1, l2x2, l2y2) intersect another
FullGame.Lasers.linesIntersectPoint = function(l1x1, l1y1, l1x2, l1y2, l2x1, l2y1, l2x2, l2y2){
    
    var A1 = l1y2-l1y1;
    var B1 = l1x1-l1x2;
    var C1 = A1*l1x1 + B1*l1y1;
    var A2 = l2y2-l2y1;
    var B2 = l2x1-l2x2;
    var C2 = A2*l2x1 + B2*l2y1;
    var det = A1*B2-A2*B1;
    if (Math.abs(det) > 0.000001){
        return {x:((B2*C1 - B1*C2)/det), y:((A1*C2 - A2*C1)/det)};
    }
    return null;
    
};

//returns {p1, p2} where p1, p2 are points the line defined by (x1,y1) and (x2,y2) intersect the circle
FullGame.Lasers.lineIntersectCirclePoints = function(x1, y1, x2, y2, cx, cy, r) {
    var X1, Y1, X2, Y2, disc;
    
    if (Math.abs(x2-x1) > .00001){
        var m = (y2-y1)/(x2-x1);
        var A = 1 + m*m;
        var B = -2*(cx + m*m*x1 - m*y1 + m*cy);
        var C = cx*cx + cy*cy + y1*y1 + m*m*x1*x1 - r*r - 2*m*x1*y1 + 2*cy*m*x1 - 2*cy*y1;
        disc = B*B - 4*A*C;
        if (disc < 0){
            return null;
        }
        disc = Math.sqrt(disc);
        X1 = (-B + disc) / (2*A);
        X2 = (-B - disc) / (2*A);
        Y1 = m*(X1-x1) + y1;
        Y2 = m*(X2-x1) + y1;
        
    } else {
        disc = r*r - (x1-cx)*(x1-cx);
        if (disc < 0){
            return null;
        }
        disc = Math.sqrt(disc);
        X1 = x1;
        X2 = X1;
        Y1 = cy + disc;
        Y2 = cy - disc;
    }
    
    return {p1:{x:X1, y:Y1}, p2:{x:X2, y:Y2}};

};

FullGame.Lasers.withinDist = function(x0, y0, x1, y1, dist){
    return (x0-x1)*(x0-x1) + (y0-y1)*(y0-y1) < dist*dist;
};

FullGame.Lasers.updateGraphics = function() {
    
    var dt = game.time.physicsElapsed;
    
    //disabling flicker for now
    //this.flicker = (this.flicker+1) % 2;
    
    
    //purposefully applying particle time threshold out of order so particles get a chance to spawn
    this.particleTime -= this.PARTICLE_SPAWN_DURATION * Math.floor(this.particleTime / this.PARTICLE_SPAWN_DURATION);
    this.particleTime += dt;
    
    this.graphics.clear();
    var color1, thickness1, alpha1, color2, thickness2, alpha2;
    for (var i=0; i<this.renders.length; i++){
        var r = this.renders[i];
        r.t = Math.min(this.FADEOUT_DURATION, r.t + game.time.physicsElapsed);
        
        //color from color
        switch (r.color){
        case FullGame.Til.RED:
            if (this.flicker == 1 && r.type != FullGame.Til.LASER_TRANSPARENT){
                color1 = this.COLOR_RED1_F1;
                color2 = this.COLOR_RED2_F1;
            } else {
                color1 = this.COLOR_RED1;
                color2 = this.COLOR_RED2;
            }
            break;
        case FullGame.Til.BLUE:
            if (this.flicker == 1 && r.type != FullGame.Til.LASER_TRANSPARENT){
                color1 = this.COLOR_BLUE1_F1;
                color2 = this.COLOR_BLUE2_F1;
            } else {
                color1 = this.COLOR_BLUE1;
                color2 = this.COLOR_BLUE2;
            }
            break;
        case FullGame.Til.GREEN:
            if (this.flicker == 1 && r.type != FullGame.Til.LASER_TRANSPARENT){
                color1 = this.COLOR_GREEN1_F1;
                color2 = this.COLOR_GREEN2_F1;
            } else {
                color1 = this.COLOR_GREEN1;
                color2 = this.COLOR_GREEN2;
            }
            break;
        case FullGame.Til.BLACK:
            if (this.flicker == 1 && r.type != FullGame.Til.LASER_TRANSPARENT){
                color1 = this.COLOR_BLACK1_F1;
                color2 = this.COLOR_BLACK2_F1;
            } else {
                color1 = this.COLOR_BLACK1;
                color2 = this.COLOR_BLACK2;
            }
            break;
        case FullGame.Til.PURPLE:
            if (this.flicker == 1 && r.type != FullGame.Til.LASER_TRANSPARENT){
                color1 = this.COLOR_PURPLE1_F1;
                color2 = this.COLOR_PURPLE2_F1;
            } else {
                color1 = this.COLOR_PURPLE1;
                color2 = this.COLOR_PURPLE2;
            }
            break;
        }
        
        //thickness and alpha from type
        switch (r.type){
        case FullGame.Til.LASER_NORMAL:
            thickness1 = this.THICKNESS_NORMAL1;
            thickness2 = this.THICKNESS_NORMAL2;
            alpha1 = this.ALPHA_NORMAL1;
            alpha2 = this.ALPHA_NORMAL2;
            break;
        case FullGame.Til.LASER_TRANSPARENT:
            thickness1 = this.THICKNESS_TRANSPARENT;
            thickness2 = 0;
            alpha1 = this.ALPHA_TRANSPARENT;
            alpha2 = 0;
            break;
        case FullGame.Til.LASER_THICK:
            thickness1 = this.THICKNESS_THICK1;
            thickness2 = this.THICKNESS_THICK2;
            alpha1 = this.ALPHA_THICK1;
            alpha2 = this.ALPHA_THICK2;
            break;
        case FullGame.Til.LASER_FADEOUT:
            thickness1 = this.THICKNESS_FADEOUT * (1 - r.t / this.FADEOUT_DURATION);
            thickness2 = 0;
            alpha1 = this.ALPHA_THICK1 * (1 - r.t / this.FADEOUT_DURATION);
            alpha2 = 0;
            break;
        }
        
        //draw
        this.graphics.lineStyle(thickness1, color1, alpha1);
        this.graphics.moveTo(r.x0, r.y0);
        this.graphics.lineTo(r.x1, r.y1);
        if (thickness2 > 0){
            this.graphics.lineStyle(thickness2, color2, alpha2);
            this.graphics.moveTo(r.x0, r.y0);
            this.graphics.lineTo(r.x1, r.y1);
        }
        
    }
    
    //check if anything special was drawn
    this.number6Rendered = false;
    this.starRendered = false;
    this.artifactRendered = false;
    var plr = FullGame.GI.player;
    if (plr != null){
        if (FullGame.Vars.startMap == "numbers"){
            for (var i=0; i<this.renders.length; i++){
                var r = this.renders[i];
                if (r.type != FullGame.Til.LASER_NORMAL) continue;
                
                if (Math.abs(r.x0 - 1536) < .1 &&
                    (192 < r.y1 && r.y1 < 256.1) &&
                     1504 < plr.x){
                    this.number6Rendered = true;
                }
            }
        } else if (FullGame.Vars.startMap == "star"){
            var line2 = false;
            var line3 = false;
            var line4 = false;
            var line5 = false;
            for (var i=0; i<this.renders.length; i++){
                var r = this.renders[i];
                if (r.type != FullGame.Til.LASER_NORMAL) continue;
                if (r.color != FullGame.Til.GREEN) continue;
                var radius = 125; //roplate width is 115
                if (this.withinDist(448, 384, r.x0, r.y0, radius) &&
                    Math.abs(r.y1 - 64) < .1)
                    line2 = true;
                else if (Math.abs(r.y0 - 64) < .1 &&
                    this.withinDist(704, 384, r.x1, r.y1, radius))
                    line3 = true;
                else if (this.withinDist(704, 384, r.x0, r.y0, radius) &&
                    this.withinDist(384, 153, r.x1, r.y1, radius))
                    line4 = true;
                else if (this.withinDist(384, 153, r.x0, r.y0, radius) &&
                    Math.abs(r.x1 - 768) < .1 &&
                    128 <= r.y1 && r.y1 <= 192)
                    line5 = true;
                /*     xx,64
                
                384,153     768,128-192
                
                448,384     704,384
                */
            }
            if (line2 && line3 && line4 && line5)
                this.starRendered = true;
        } else if (FullGame.Vars.startMap == "landedAgain"){
            var line1 = false;
            var line2 = false;
            for (var i=0; i<this.renders.length; i++){
                var r = this.renders[i];
                if (r.type != FullGame.Til.LASER_NORMAL) continue;
                if (r.color != FullGame.Til.GREEN) continue;
                
                if (Math.abs(r.y0 - 640) < .1 &&
                    Math.abs(r.y1 - 768) < .1 &&
                    (1344 < r.x1 && r.x1 <= 1408)){
                    line1 = true;
                }
                if (Math.abs(r.y0 - 640) < .1 &&
                    Math.abs(r.y1 - 768) < .1 &&
                    (1280 <= r.x1 && r.x1 < 1344)){
                    line2 = true;
                }
            }
            if (line1 && line2)
                this.artifactRendered = true;
        }
    }
    
    //recycle renders
    for (i=0; i<this.renders.length; i++){
        var r = this.renders[i];
        //only keep renders of fadeout lasers, until they completely fade out
        if (r.type == FullGame.Til.LASER_FADEOUT && r.t < this.FADEOUT_DURATION){
            continue;
        }
        //recycle everything else
        this.recycledRenders.push(r);
        this.renders.splice(i, 1);
        i--;
    }
    
    //draw particles
    for (i=0; i<this.particles.length; i++){
        var p = this.particles[i];
        //move particle
        p.t += dt;
        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        alpha1 = this.PARTICLE_ALPHA1;
        alpha2 = this.PARTICLE_ALPHA2;
        thickness1 = this.PARTICLE_THICKNESS1_MIN + Math.random() * (this.PARTICLE_THICKNESS1_MAX-this.PARTICLE_THICKNESS1_MIN);
        thickness2 = this.PARTICLE_THICKNESS2;
        switch (p.color){
        case FullGame.Til.RED:
            if (p.flicker == 1){
                color1 = this.COLOR_RED1_F1;
                color2 = this.COLOR_RED2_F1;
            } else {
                color1 = this.COLOR_RED1;
                color2 = this.COLOR_RED2;
            }
            break;
        case FullGame.Til.BLUE:
            if (p.flicker == 1){
                color1 = this.COLOR_BLUE1_F1;
                color2 = this.COLOR_BLUE2_F1;
            } else {
                color1 = this.COLOR_BLUE1;
                color2 = this.COLOR_BLUE2;
            }
            break;
        case FullGame.Til.GREEN:
            if (p.flicker == 1){
                color1 = this.COLOR_GREEN1_F1;
                color2 = this.COLOR_GREEN2_F1;
            } else {
                color1 = this.COLOR_GREEN1;
                color2 = this.COLOR_GREEN2;
            }
            break;
        case FullGame.Til.BLACK:
            if (p.flicker == 1){
                color1 = this.COLOR_BLACK1_F1;
                color2 = this.COLOR_BLACK2_F1;
            } else {
                color1 = this.COLOR_BLACK1;
                color2 = this.COLOR_BLACK2;
            }
            break;
        case FullGame.Til.PURPLE:
            if (p.flicker == 1){
                color1 = this.COLOR_PURPLE1_F1;
                color2 = this.COLOR_PURPLE2_F1;
            } else {
                color1 = this.COLOR_PURPLE1;
                color2 = this.COLOR_PURPLE2;
            }
            break;
        }
        
        //draw
        this.graphics.lineStyle(0);
        this.graphics.beginFill(color1, alpha1);
        this.graphics.drawRect(p.x-thickness1/2, p.y-thickness1/2, thickness1, thickness1);
        this.graphics.endFill();
        this.graphics.beginFill(color2, alpha2);
        this.graphics.drawRect(p.x-thickness2/2, p.y-thickness2/2, thickness2, thickness2);
        this.graphics.endFill();
    }
    
    //recycle particles
    for (i=0; i<this.particles.length; i++){
        p = this.particles[i];
        if (p.t >= p.d){
            this.particles.splice(i, 1);
            i--;
            this.recycledParticles.push(p);
        }
    }
    
    //draw sights
    while (this.sights.length > 0){
        var s = this.sights.pop();
        
        alpha1 = this.SIGHT_ALPHA;
        var rad = this.SIGHT_RADIUS;
        if (s.thick){
            alpha1 = this.SIGHT_THICK_ALPHA;
            rad = this.SIGHT_THICK_RADIUS;
        }
        switch (s.color){
        case FullGame.Til.RED:
            color1 = this.COLOR_RED2;
            break;
        case FullGame.Til.BLUE:
            color1 = this.COLOR_BLUE2;
            break;
        case FullGame.Til.GREEN:
            color1 = this.COLOR_GREEN2;
            break;
        case FullGame.Til.BLACK:
            color1 = this.COLOR_BLACK2;
            break;
        case FullGame.Til.PURPLE:
            color1 = this.COLOR_PURPLE2;
            break;
        }
        
        //draw
        this.graphics.lineStyle(0);
        this.graphics.beginFill(color1, alpha1);
        this.graphics.drawCircle(s.x, s.y, rad);
        this.graphics.endFill();
        
        this.recycledSights.push(s);
    }
    
    
    //move griddys
    for (var i=0; i<FullGame.GI.griddys.length; i++){
        var grd = FullGame.GI.griddys[i];
        grd.dangerStep();
    }
    
    //reset tilesFilled
    for (var i=0; i<this.tilesFilled.length; i++){
        for (var j=0; j<this.tilesFilled[i].length; j++){
            this.tilesFilled[i][j] = false;
        }
    }
    
};

FullGame.Lasers.spawnParticles = function(x, y, color, laserType, reflected, normal) {
    
    if (laserType == FullGame.Til.LASER_FADEOUT)
        return;
    if (laserType == FullGame.Til.LASER_TRANSPARENT ||
        laserType == FullGame.Til.LASER_THICK){
        //make laser sight
        var sight;
        if (this.recycledSights.length > 0){
            sight = this.recycledSights.pop();
        } else {
            sight = {};
        }
        sight.x = x;
        sight.y = y;
        sight.color = color;
        sight.thick = (laserType == FullGame.Til.LASER_THICK);
        
        this.sights.push(sight);
        if (laserType == FullGame.Til.LASER_TRANSPARENT)
            return;
    }
    
   
    for (var i=this.PARTICLE_SPAWN_DURATION; i<this.particleTime; i += this.PARTICLE_SPAWN_DURATION){
        
        var part;
        if (this.recycledParticles.length > 0){
            part = this.recycledParticles.pop();
        } else {
            part = {};
        }
        
        var angle = normal + Math.random()*Math.PI - Math.PI/2;
        var speed = this.PARTICLE_SPEED_MIN + Math.random() * (this.PARTICLE_SPEED_MAX - this.PARTICLE_SPEED_MIN);
        var gravity = this.PARTICLE_GRAVITY;
        part.x = x;
        part.y = y;
        part.vx = speed * Math.cos(angle);
        part.vy = speed * Math.sin(angle);
        part.ax = 0;
        part.ay = gravity;
        part.color = color;
        part.t = 0;
        part.d = this.PARTICLE_LIFE_DURATION;
        part.flicker = Math.floor(Math.random() * 2);
        
        this.particles.push(part);
        
    }
    
};


FullGame.Lasers.destroy = function() {
    this.graphics.clear();
    this.graphics = null;
    //recycle renders
    while (this.renders.length > 0){
        this.recycledRenders.push(this.renders.pop());
    }
    //recylce particles
    while (this.particles.length > 0){
        this.recycledParticles.push(this.particles.pop());
    }
    //recylce sights
    while (this.sights.length > 0){
        this.recycledSights.push(this.sights.pop());
    }
    
    //destroy laserburns
    this.laserburnReds.splice(0, this.laserburnReds.length);
    this.laserburnBlues.splice(0, this.laserburnBlues.length);
    this.laserburnGreens.splice(0, this.laserburnGreens.length);
    this.laserburnWhites.splice(0, this.laserburnWhites.length);
    this.laserburnBlacks.splice(0, this.laserburnBlacks.length);
    this.laserburnPowers.splice(0, this.laserburnPowers.length);
    this.laserburnPowerBlues.splice(0, this.laserburnPowerBlues.length);
    this.laserburnPowerGreens.splice(0, this.laserburnPowerGreens.length);
    this.laserburnPowerPurples.splice(0, this.laserburnPowerPurples.length);
};