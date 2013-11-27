module Lines{
    var Color = {
        red : 'red',
        green: 'green', 
        blue: 'blue', 
        brown: 'brown',
        yellow: 'yellow',
        orange:'orange'
    }

    var CELL_SIZE:number = 40;
    var CELL_COUNT: number = 10;
    var RADIUS = (CELL_SIZE/2) - 3;
    var MIN_LEN = 5;
    var SPAWN_AFTER_LINE_REMOVAL = false;

    class Ball{
        constructor(public color, public radius: number, public x: number, public y: number){
        }

        public update(){
        }

        public render(ctx){
            ctx.translate((this.x+0.5)*CELL_SIZE, (this.y+0.5)*CELL_SIZE)
            ctx.beginPath();
                ctx.arc(0,0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            ctx.closePath();
            ctx.beginPath();
                ctx.scale(2, 1);
                ctx.arc(0, -8, this.radius/4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fill();
            ctx.closePath();
        }

        public startBouncing():BouncingBall{
            return new BouncingBall(this.color, this. radius, this. x, this.y);
        }
    }

    interface Point{
        x:number; y:number;
    }

    class BouncingBall extends Ball{
        _phase: number = 0;

        constructor(color, radius: number, x: number, y: number){
            super (color, radius, x, y);
        }


        public update(){
            this._phase = (this._phase + 0.5)%(2*Math.PI);
        }

        public render(ctx){
            ctx.translate(0, 2*Math.sin(this._phase));
            super.render(ctx);
        }

        public stopBouncing():Ball{
            return new Ball(this.color, this.radius, this.x, this.y);
        }
    }

    class Board{
        _board: Ball[][];
        _selected: BouncingBall;
        
        constructor (public size:number){
            this._board = [];
            for (var i = 0; i < size; i++){
                var row: Ball[] = [];
                for (var j = 0; j < size; j++){
                    row[j] = null;
                }
                this._board[i] = row;
            }

            this.onCellClickImpl = this.selectBall;
        }

        public BallsRemoved: (number)=>void;

        private randomColor(){
            var colors = [];
            for(var i in Color){
                colors.push(i);
            }

            return colors[Math.floor(Math.random()*colors.length)];
        }

        public spawnBalls(){
            
            for(var i = 0; i < 3; i++){
                var freeCells = this.getFreeCells();
                if (freeCells.length < 1){
                    alert("Game over!");
                    this.update = () =>{};
                    this.onCellClickImpl = () =>{};
                    break;
                }
                var idx = Math.floor(Math.random()*freeCells.length);
                var coord = freeCells[idx];
                this._board[coord.y][coord.x] = new Ball(this.randomColor(), RADIUS, coord.x, coord.y);
                this.checkLines(coord.x, coord.y);
            }
        }

        private getFreeCells(){
            var freeCells: Point[] = []
            for (var i = 0; i < this.size; i++){
                for(var j = 0; j < this.size; j++){
                    if (this._board[i][j] == null){
                        freeCells.push({x:j, y:i});
                    }
                }
            }
            return freeCells;
        }

        public update(){
            for (var i = 0; i < this.size; i++){
                for(var j = 0; j < this.size; j++){
                    if (this._board[i][j] != null){
                        this._board[i][j].update();
                    }
                }
            }
        }

        public render(ctx: CanvasRenderingContext2D){
            ctx.clearRect(0,0,400,400);
            ctx.beginPath(); 
            for(var i = 1; i < this.size; i++){
                ctx.moveTo(i * CELL_SIZE, 0);
                ctx.lineTo(i*CELL_SIZE, CELL_SIZE*this.size);
                ctx.stroke();
            }
            for(var i = 1; i < this.size; i++){
                ctx.moveTo(0,i * CELL_SIZE);
                ctx.lineTo(CELL_SIZE*this.size, i*CELL_SIZE);
                ctx.stroke();
            }
            for (var i = 0; i < this.size; i++){
                for(var j = 0; j < this.size; j++){
                    if (this._board[i][j] != null){
                        ctx.save();
                        this._board[i][j].render(ctx);
                        ctx.restore();
                    }
                }
            }
        }

        private selectBall(x,y){
            var ball = this._board[y][x];
            if (ball == null){
                return;
            }

            if (this._selected){
                this._board[this._selected.y][this._selected.x] = this._selected.stopBouncing();
            }

            this._selected = ball.startBouncing();
            this._board[y][x] = this._selected;
            this.onCellClickImpl = this.tryMoveBall;
        }

        private tryMoveBall(x,y){
            if (!this._selected) return
            if (this._board[y][x] != null) {
                this.selectBall(x,y);
                return;
            }
            var path = this.buildPath(this._selected.x, this._selected.y, x, y);
            if (path == null) return;
            this.onCellClickImpl = (x,y)=>{}
            this.update = this.walkPath(path, this.update);
        }

        private buildPath(x0, y0, x1, y1){
            var waveMap = new Uint8Array(this.size * this.size);
            var queue : Point[] = [{x:x0, y:y0}];
            for (var y = 0; y < this.size; y++)
            for (var x = 0; x < this.size; x++)
            {
                waveMap[y * this.size+x] = this._board[y][x] == null ? 0 : 255;
            }
            waveMap[y0*this.size + x0] = 1;
            while(queue.length > 0){
                var point = queue.shift();

                if (point.x == x1 && point.y == y1){
                    break;
                }

                var cval = waveMap[point.y*this.size + point.x];

                for(var dy = -1; dy <= 1; dy++)
                for(var dx = -1; dx <= 1; dx++){
                    if (dx == 0 && dy == 0) continue;
                    if (dx != 0 && dy != 0) continue;
                    var x = point.x + dx; var y = point.y + dy;
                    if (x < 0 || y < 0 || x >= this.size || y >= this.size)
                        continue;
                    var val= waveMap[y*this.size + x];
                    if (val == 0){              // not visited
                        queue.push({x:x, y:y});
                    }
                    if (val < 255 && (val > cval || val == 0)){ // there's shoter path
                        waveMap[y*this.size + x] = cval+1;
                    }
                }
            }

            var cval = waveMap[y1*this.size + x1];
            if (cval > 0){
                var x:number = x1; var y:number = y1;
                var path = [];
                while(!(x == x0 && y == y0)){
                    path.unshift({x:x, y:y});

                    var next = false;

                    for(var dy = -1; dy <= 1 && !next; dy++)
                    for(var dx = -1; dx <= 1 && !next; dx++){
                        if ((dx==0&&dy==0) || (dx!=0&&dy!=0) || x+dx < 0 || y+dy < 0 || x+dx >= this.size || y+dy >= this.size)
                            continue;
                        var val = waveMap[(y+dy)*this.size + (x + dx)];
                        if (val == cval-1){
                            cval = cval - 1;
                            x = x+dx; y = y+dy;
                            next = true;
                        }
                    }
                }
                path.unshift({x:x0, y:y0});

                return path; 
            }

            return null;
        }

        private walkPath(path: Point[], oldUpdate){
            var i = 0;
            return () =>{
                if (i < path.length){
                    this._board[this._selected.y][this._selected.x] = null;
                    this._selected.x = path[i].x;
                    this._selected.y = path[i].y;
                    this._board[this._selected.y][this._selected.x] = this._selected;
                    i++;
                } else {
                    this._board[this._selected.y][this._selected.x] = this._selected.stopBouncing();
                    var ballsRemoved = this.checkLines(this._selected.x, this._selected.y);
                    this._selected = null;
                    this.update = oldUpdate;
                    this.onCellClickImpl = this.selectBall;
                    if (!ballsRemoved || SPAWN_AFTER_LINE_REMOVAL)
                        this.spawnBalls();
                }
            }
        }

        private checkLines(ox:number, oy:number): boolean{
            if (this._board[oy][ox] == null){
                return false;
            }
            var color = this._board[oy][ox].color;
            var directions: Point[] = [{x:1, y:1}, {x:-1, y:1}, {x:1, y:0}, {x:0, y:1} ];

            var ballsToRemove : Point[] = [{x:ox, y:oy}];
            for(var dirI in directions){
                var dir = directions[dirI];
                // accumulate balls of the same color;
                var ballsInDirection: Point[] = [];
                // ...moving 'forward'...
                var x = ox+dir.x; var y = oy+dir.y;
                while (y>=0 && y < this.size && x>=0&&x<=this.size && 
                        this._board[y][x] != null && this._board[y][x].color == color){
                    ballsInDirection.push({x:x, y:y});
                    x += dir.x; y+=dir.y;
                }
                // ...and backward.
                var x = ox-dir.x; var y = oy-dir.y;
                while (y>=0 && y < this.size && x>=0&&x<=this.size && 
                        this._board[y][x] != null && this._board[y][x].color == color){
                    ballsInDirection.push({x:x, y:y});
                    x -= dir.x; y-=dir.y;
                }
                if (ballsInDirection.length >= MIN_LEN-1){
                    ballsToRemove = ballsToRemove.concat(ballsInDirection);
                }
            }
            if (ballsToRemove.length > 1){
                for(var i in ballsToRemove){
                    var ball = ballsToRemove[i];
                    this._board[ball.y][ball.x] = null;
                }
                if (this.BallsRemoved){
                    this.BallsRemoved(ballsToRemove.length);
                }
                return true;
            }
            return false;
        }

        private onCellClickImpl(x,y) {}

        public onCellClick(x, y){
            this.onCellClickImpl(x,y);
        }
    }

    export function main(){
        var container = document.getElementById("container");
        var canvas = <HTMLCanvasElement>document.createElement("canvas");
        canvas.width = CELL_SIZE * CELL_COUNT;
        canvas.height = CELL_SIZE * CELL_COUNT;
        var scoreContainer = document.createElement("div");
        var scoreLabel = document.createElement("span");
        scoreLabel.innerText = "Score: ";
        var scoreValue = document.createElement("span");
        scoreContainer.appendChild(scoreLabel);
        scoreContainer.appendChild(scoreValue);
        container.appendChild(canvas);
        container.appendChild(scoreContainer);


        var ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
        ctx.translate(0.5, 0.5);

        var board = new Board(CELL_COUNT);
        var score: number = 0;
        var scoreScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ];
        board.BallsRemoved = (n) => {
            score += scoreScale[n - MIN_LEN];
            scoreValue.innerText = score.toString();
        }
        board.spawnBalls();

        var lastUpdateTime = new Date().getMilliseconds();
        function step(timestamp){
            if (timestamp - lastUpdateTime > 40){
                board.update();
                lastUpdateTime = timestamp;
            }

            board.render(ctx);
            window.requestAnimationFrame(step);
        }

        canvas.addEventListener("mouseup", function(e:any){
            var x = e.pageX - canvas.offsetLeft;
            var y = e.pageY - canvas.offsetTop;
            board.onCellClick(Math.floor(x/CELL_SIZE), Math.floor(y/CELL_SIZE));
        });

        window.requestAnimationFrame(step);
    }
}