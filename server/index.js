const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080, clientTracking: true });
wss.saved = [];

var online = 0;
var blackConnected = false;
var whiteConnected = false;

class Game {
	constructor(size, cond) {
		this.size = size;
		this.cond = cond;
		this.board = [];
		for (var i = 0; i < size; ++i) {
			this.board.push([]);
			for (var j = 0; j < size; ++j) {
				this.board[i].push(0);
			}
		}
		this.state = "WAIT";
		this.moves = 0;
	}
	// Start the game
	start() {
		this.state = "TURN_BLACK";
	}
	// Check if game is ongoing
	ongoing() {
		return this.state == "TURN_BLACK" || this.state == "TURN_WHITE";
	}
	// Get current player's turn
	turn() {
		if (this.state == "TURN_BLACK") {
			return "Black";
		} else if (this.state == "TURN_WHITE") {
			return "White";
		} else {
			return "None";
		}
	}
	// Check if coords are in range
	inRange(x, y) {
		return x >= 0 && x < this.size && y >= 0 && y < this.size;
	}
	// Check if move is valid
	valid(x, y) {
		if (this.ongoing == false) {
			return false;
		} else if (!this.inRange(x, y)) {
			return false;
		} else {
			return this.board[x][y] == 0;
		}
	}
	// Play a move
	move(x, y) {
		if (this.valid(x, y)) {
			// Increase total moves
			++this.moves;
			// Set the piece on the board
			if (this.state == "TURN_BLACK") {
				this.board[x][y] = 1;
			} else {
				this.board[x][y] = -1;
			}
			var dx = [0, 1, 1, 1, 0, -1, -1, -1];
			var dy = [1, 1, 0, -1, -1, -1, 0, 1];
			// Check for a winning state
			for (var i = 0; i < 4; ++i) {
				var u = x + dx[i];
				var v = y + dy[i];
				var cnt = 1;
				while (this.inRange(u, v) && this.board[u][v] == this.board[x][y]) {
					++cnt;
					u += dx[i];
					v += dy[i];
				}
				u = x - dx[i];
				v = y - dy[i];
				while (this.inRange(u, v) && this.board[u][v] == this.board[x][y]) {
					++cnt;
					u -= dx[i];
					v -= dy[i];
				}
				// Is a winning state
				if (cnt == this.cond) {
					if (this.state == "TURN_BLACK") {
						this.state = "OVER_BLACK";
					} else {
						this.state = "OVER_WHITE";
					}
					return;
				}
			}
			// Change game state
			if (this.moves == this.size * this.size) {
				this.state = "OVER_TIE";
			} else if (this.state == "TURN_BLACK") {
				this.state = "TURN_WHITE";
			} else {
				this.state = "TURN_BLACK";
			}
		}
	}
}

var game = new Game(15, 5);

wss.broadcast = function(message, save = true) {
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
	if (save == true) {
		wss.saved.push(message);
	}
}

wss.on('connection', function connection(ws, req) {
	
	ws.isAlive = true;
	ws.on('pong', function() {
		ws.isAlive = true;
	});
	
	const ip = req.connection.remoteAddress;
	console.log('[Server] ' + ip + ' connected (' + (++online) + ' connections avtive)');
	
	const interval = setInterval(function ping() {
		if (ws.isAlive == false) {
			console.log('[Server] ' + ip + ' disconnected (' + (--online) + ' connections active)');
			wss.broadcast('DIS ' + ws.role);
			if (game.ongoing()) {
				if (ws.role == 'Black') {
					wss.broadcast('END White');
				} else {
					wss.broadcast('END Black');
				}
			}
			clearInterval(interval);
			ws.terminate();
		}
		ws.isAlive = false;
		ws.ping(function(){});
	}, 1000);
	
	for (var i = 0; i < wss.saved.length; ++i) {
		ws.send(wss.saved[i]);
	}
	
	if (blackConnected == false) {
		blackConnected = true;
		ws.role = 'Black';
	} else if (whiteConnected == false) {
		whiteConnected = true;
		ws.role = 'White';
		game.start();
	} else {
		ws.role = 'Spectator';
	}
	console.log('[Server] ' + ip + ' has been assigned ' + ws.role);
	ws.send('ASN ' + ws.role);
	wss.broadcast('CON ' + ws.role);
	
	ws.on('message', function incoming(message) {
		console.log('[' + ws.role + '] ' + message);
		message = message.split(' ');
		if (message[0] == 'MOV') {
			if (message.length == 3 && game.turn() == ws.role) {
				var x = Number(message[1]);
				var y = Number(message[2]);
				if (game.valid(x, y)) {
					game.move(x, y);
					wss.broadcast('MOV ' + x + ' ' + y);
					if (game.ongoing() == false) {
						if (game.state == 'OVER_BLACK') {
							wss.broadcast('END Black');
						} else if (game.state == 'OVER_WHITE') {
							wss.broadcast('END White');
						} else {
							wss.broadcast('END Tie');
						}
					}
				} else {
					ws.send('ERR INVALID_MOVE');
				}
			} else {
				ws.send('ERR BAD_REQUEST');
			}
		} else if (message[0] == 'NME' && ws.role != "Spectator") {
			if (message[1].length > 16) {
				message[1] = message[1].toString().substr(0, 16);
			}
			wss.broadcast('NME ' + ws.role + ' ' + message[1]);
		} else {
			ws.send('ERR BAD_REQUEST');
		}
	});
	
});
