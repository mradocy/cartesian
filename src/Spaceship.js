//returns made spaceship, but doesn't add it to FullGame.GI.objs (will be done in ParseObjects)
FullGame.makeSpaceship = function(x, y, damaged_) {
    
    var damaged = false;
    if (damaged_ != null && damaged_ == true)
        damaged = true;
    var sh;
    var spriteKey = "spaceship";
    if (damaged){
        spriteKey = "spaceship_repaired";
    }
    sh = game.add.sprite(x, y, spriteKey, undefined, FullGame.GI.frontGroup);
    sh.animations.add("idle", [0], 5, true);
    if (!damaged){
        sh.animations.add("blink", [0, 1], 4, true);
        sh.animations.add("shine", [1], 4, true);
    }
    
    sh.TAKEOFF_ACCEL = -60;
    sh.vy = 0;
    sh.landingY0 = y;
    sh.LANDING_Y1 = 188;
    sh.LANDING_DURATION = 10.0;
    
    sh.EX_X = 75;
    sh.EX_WIDTH = 34;
    sh.EX_Y = 295;
    sh.EX_SPEED = 50;
    sh.EX_LANDING_SPEED = 100;
    sh.EX_ACCEL = 300;
    sh.EX_MAX_ANGLE = 40 *Math.PI/180;
    sh.EX_PERIOD = .01;
    sh.EX_DURATION = .5;
    sh.EX_SPRITE_KEYS = ["ship_ex_1", "ship_ex_2"];
    sh.exTime = 0;
    sh.exCache = []; //recycles exhaust particles
    
    sh.readyToLeave = (FullGame.Vars.playerLaserType == FullGame.Til.LASER_THICK);
    sh.leaving = false;
    sh.landing = false;
    sh.landingTime = 0;
    sh.endShip = false;
    
    
    if (sh.readyToLeave){
        sh.animations.play("blink");
    } else {
        sh.animations.play("idle");
    }
    
    sh.update = function() {
        
        var dt = game.time.physicsElapsed;
        var plr = FullGame.GI.player;
        
        if (this.landing){
            
            this.landingTime += dt;
            
            this.EX_X = 90; ///????? why do I have to do this???
            
            if (this.landingTime >= this.LANDING_DURATION){
                this.y = this.LANDING_Y1;
                this.landing = false;
                this.readyToLeave = true;
                this.exTime = 0;
            } else {
                var dur = this.LANDING_DURATION - 5.0;
                var time = this.landingTime - 5.0;
                
                if (time < 0){
                    this.y = this.landingY0;
                } else {
                    this.y = Math.easeOutQuad(time, this.landingY0, this.LANDING_Y1-this.landingY0, dur);
                    
                    if (time > dur/3){
                        this.exTime += dt;
                        while (this.exTime > this.EX_PERIOD){
                            this.exTime -= this.EX_PERIOD;
                            this.spawnEx(1);
                        }
                        
                        if (time-dt <= dur/3){
                            FullGame.playSFX("spaceship_land");
                        }
                    }
                    
                }
                
            }
            
        } else if (this.leaving){
            
            if (this.y > -400){
                this.vy += this.TAKEOFF_ACCEL * dt;
                this.y += this.vy * dt;
                if (this.y < -200 && this.y-this.vy*dt >= -200){
                    FullGame.HUD.fadeOut();
                }
            } else {
                if (this.endShip){
                    FullGame.GI.state.start("EndScene");
                } else {
                    FullGame.GI.state.start("SpaceshipCutscene");
                }
            }
            
            this.exTime += dt;
            while (this.exTime > this.EX_PERIOD){
                this.exTime -= this.EX_PERIOD;
                this.spawnEx(1);
            }
            
        } else if (this.readyToLeave && plr != null){
            //check if player is close enough to take off
            if (plr.x < this.x+100 && plr.x > this.x+60 &&
                plr.y < this.y+311){
                this.takeOff();
            }
        }
        
    };
    
    sh.afterCollision = function() {
        
    };
    
    sh.spawnEx = function(numExs) {
        
        for (var i=0; i<numExs; i++){
            
            var r = (Math.random()*2-1);
            var angle = Math.PI/2 - r * this.EX_MAX_ANGLE;
            var x = this.x + this.EX_X + this.EX_WIDTH * (r+1)/2;
            var y = this.y + this.EX_Y;
            var c = Math.cos(angle);
            var s = Math.sin(angle);
            
            var ex;
            if (this.exCache.length == 0){
                ex = game.add.image(x, y, this.EX_SPRITE_KEYS[Math.floor(this.EX_SPRITE_KEYS.length*Math.random())], undefined, FullGame.GI.frontGroup);
                ex.anchor.setTo(.5, .5);
                ex.spaceShip = this;
                ex.update = function() {
                    var dt = game.time.physicsElapsed;
                    this.speed += this.accel * dt;
                    this.x += this.c * this.speed * dt;
                    this.y += this.s * this.speed * dt;
                    this.t += dt;
                    this.alpha = Math.min(1, 1 - this.t / this.duration);
                    if (this.t > this.duration){
                        this.visible = false;
                        this.spaceShip.exCache.push(this);
                    }
                };
            } else {
                ex = this.exCache.pop();
                ex.x = x;
                ex.y = y;
                ex.visible = true;
            }
            ex.c = c;
            ex.s = s;
            ex.speed = this.EX_SPEED;
            if (this.landing){
                ex.speed = this.EX_LANDING_SPEED;
            }
            ex.accel = this.EX_ACCEL;
            ex.t = 0;
            ex.duration = this.EX_DURATION;
            ex.alpha = 1;
            FullGame.GI.frontGroup.setChildIndex(ex, 0);
            //ex.bringToTop();
            
        }
    };
    
    //work here, call this to have space ship take off
    sh.takeOff = function() {
        
        //player behavior
        var plr = FullGame.GI.player;
        plr.setBehavior("spaceship");
        
        this.animations.play("shine");
        FullGame.playSFX("spaceship_takeoff");
        this.leaving = true;
        FullGame.fadeOutMusic(1.0);
        FullGame.playSFX("puzzle_solved");
    };
    
    return sh;
};