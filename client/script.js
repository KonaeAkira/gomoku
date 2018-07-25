$(document).ready(function() {
	
	var turn = 'Black';
	var role = 'Spectator';
	
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
		
		function placeMove(x, y) {
			$('#' + x + '-' + y).parent().html('<div id="' + x + '-' + y + '" class="boardCell boardCell' + turn + '"></div>');
			if (turn == 'Black') {
				turn = 'White';
			} else {
				turn = 'Black';
			}
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
			} else if (message[0] == 'END') {
				if (message[1] == 'Tie') {
					alert('Tie!');
				} else {
					alert(message[1] + ' wins!');
				}
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
