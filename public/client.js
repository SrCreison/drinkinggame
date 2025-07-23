// client.js
// Este script lida com toda a interação do usuário e a comunicação com o servidor.

document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Elementos da tela
    const joinScreen = document.getElementById('join-screen');
    const gameScreen = document.getElementById('game-screen');

    // Elementos de entrada
    const playerNameInput = document.getElementById('player-name-input');
    const joinGameBtn = document.getElementById('join-game-btn');

    // Elementos do jogo
    const playerList = document.getElementById('player-list');
    const turnIndicator = document.getElementById('turn-indicator');
    const cardContainer = document.getElementById('card-container');
    const card = document.getElementById('card');
    const cardTitle = document.getElementById('card-title');
    const cardDescription = document.getElementById('card-description');
    const drawCardBtn = document.getElementById('draw-card-btn');

    let selfId = null;
    let cardIsFlipped = false;

    // --- Event Listeners ---

    // Entrar no jogo
    joinGameBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        if (playerName) {
            socket.emit('joinGame', { playerName });
            joinScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
        }
    });
    
    playerNameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            joinGameBtn.click();
        }
    });

    // Comprar uma carta
    drawCardBtn.addEventListener('click', () => {
        if (!drawCardBtn.disabled) {
            socket.emit('drawCard');
        }
    });

    // --- Handlers do Socket.IO ---

    // Armazena o próprio ID ao entrar
    socket.on('selfJoined', ({ selfId: myId }) => {
        selfId = myId;
    });

    // Recebe o estado atualizado do jogo do servidor
    socket.on('updateGameState', (gameState) => {
        const { players, currentPlayerId, lastCard, gameInProgress } = gameState;

        // Atualiza a lista de jogadores
        playerList.innerHTML = '';
        players.forEach(player => {
            const playerElement = document.createElement('li');
            playerElement.textContent = player.name;
            playerElement.className = 'player-list-item p-3 rounded-md transition-all duration-300';
            if (player.id === currentPlayerId) {
                playerElement.classList.add('current-player');
            }
            if (player.id === selfId) {
                playerElement.textContent += ' (Você)';
                playerElement.classList.add('font-bold');
            }
            playerList.appendChild(playerElement);
        });

        // Atualiza o indicador de turno e o botão de comprar
        if (gameInProgress) {
            const currentPlayer = players.find(p => p.id === currentPlayerId);
            if (currentPlayer) {
                if (currentPlayer.id === selfId) {
                    turnIndicator.textContent = "É a sua vez!";
                    turnIndicator.className = 'text-xl mb-6 h-8 font-semibold text-center text-green-400';
                    drawCardBtn.disabled = false;
                } else {
                    turnIndicator.textContent = `Aguardando ${currentPlayer.name} comprar...`;
                    turnIndicator.className = 'text-xl mb-6 h-8 font-semibold text-center text-yellow-400';
                    drawCardBtn.disabled = true;
                }
            }
        } else {
            turnIndicator.textContent = 'Aguardando jogadores...';
            drawCardBtn.disabled = true;
        }

        // Atualiza a exibição da carta
        if (lastCard) {
            if (!cardIsFlipped) {
                card.classList.add('flipped');
                cardIsFlipped = true;
            }
            cardTitle.textContent = lastCard.title;
            cardDescription.textContent = lastCard.description;
        } else {
             if (cardIsFlipped) {
                card.classList.remove('flipped');
                cardIsFlipped = false;
            }
        }
    });
});
