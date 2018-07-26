$(document).ready(function() {
	
	var turn = 'Waiting';
	var role = 'Spectator';
	
	var nameBlack = '';
	var nameWhite = '';
	
	var string = '';
	for (var i = 0; i < 15; ++i) {
		string += '<tr>';
		for (var j = 0; j < 15; ++j) {
			string += '<td><div class="boardCell boardCellBlank" id="' + i + '-' + j + '"></div></td>';
		}
		string += '</tr>';
	}
	$('.board').html(string);
	
	var ws = new WebSocket('ws://' + prompt('Enter server IP'));
	
	ws.onopen = function() {
		
		$('#board-overlay').hide();
		
		window.setTimeout(function() {
			if (role != 'Spectator') {
				ws.send('NME ' + prompt('Enter your name'));
			}
		}, 500);
		
		function updateTitle() {
			if (turn == 'Waiting') {
				document.title = 'Gomoku - Waiting for players';
			} else if (turn == 'Over') {
				document.title = 'Gomoku - Game over';
			} else if (turn == role) {
				document.title = 'Gomoku - Your turn';
			} else if (role == 'Spectator') {
				document.title = 'Gomoku - ' + turn + '\'s turn';
			} else {
				document.title = 'Gomoku - Opponent\'s turn';
			}
		}
		
		updateTitle();
		
		function placeMove(x, y) {
			$('#' + x + '-' + y).parent().html('<div id="' + x + '-' + y + '" class="boardCell boardCell' + turn + '"></div>');
			if (turn == 'Black') {
				turn = 'White';
			} else {
				turn = 'Black';
			}
			updateTitle();
		}
		
		ws.onmessage = function(message) {
			console.log('[Server] ' + message.data);
			message = message.data.split(' ');
			if (message[0] == 'MOV') {
				placeMove(message[1], message[2]);
			} else if (message[0] == 'ASN') {
				role = message[1];
			} else if (message[0] == 'NME') {
				if (message[1] == role) {
					$('#name' + message[1]).html(message[2] + '<info>&nbsp(You)</info>');
				} else {
					$('#name' + message[1]).html(message[2]);
				}
				if (message[1] == 'Black') {
					nameBlack = message[2];
				} else if (message[1] == 'White') {
					nameWhite = message[2];
				}
			} else if (message[0] == 'END') {
				if (message[1] == 'Tie') {
					alert('Tie!');
				} else {
					alert(message[1] + ' wins!');
				}
				turn = 'Over';
				updateTitle();
			} else if (message[0] == 'DIS') {
				if (message[1] == 'Spectator') {
				
				} else {
					$('#name' + message[1]).html('<i>Disconnected</i>');
				}
			} else if (message[0] == 'BEG') {
				turn = 'Black';
				updateTitle();
			}
		}
		
		$('.boardCellBlank').parent().mouseover(function() {
			if ($(this).children().first().hasClass('boardCellBlank') && role != 'Spectator') {
				$(this).children().addClass('boardCell' + role);
			}
		});
		
		$('.boardCellBlank').parent().mouseleave(function() {
			if ($(this).children().first().hasClass('boardCellBlank')) {
				$(this).children().removeClass('boardCellBlack');
				$(this).children().removeClass('boardCellWhite');
			}
		});
		
		$('.boardCellBlank').parent().click(function() {
			if ($(this).children().first().hasClass('boardCellBlank') && role != 'Spectator') {
				var data = $(this).children().first().attr('id').split('-');
				ws.send('MOV ' + data[0] + ' ' + data[1]);
			}
		});
		
	}
	
});
