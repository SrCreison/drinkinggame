// server.js
// Este é o núcleo do nosso jogo, lidando com toda a lógica e comunicação em tempo real.

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve os arquivos HTML, CSS e JS do diretório 'public'
app.use(express.static('public'));

// --- Estado do Jogo ---
// Vamos armazenar todos os dados do jogo na memória para simplificar.
let players = [];
let currentPlayerIndex = 0;
let gameInProgress = false;
let lastCard = null;

// --- O "Baralho do Perigo" ---
// É aqui que a mágica acontece. Adicione quantas cartas criativas,
// engraçadas ou "perigosas" você conseguir imaginar!
const cardDeck = [
    // Cartas Clássicas
    { title: "Social", description: "Todos bebem!" },
    { title: "Cascata", description: "Todos começam a beber. Você não pode parar até que a pessoa que comprou a carta pare." },
    { title: "Mestre das Regras", description: "Crie uma nova regra. A regra dura até que esta carta seja comprada novamente. Quem quebrá-la, bebe." },
    { title: "Mestre das Perguntas", description: "Você é o Mestre das Perguntas até esta carta ser comprada novamente. Se alguém responder a uma pergunta sua, essa pessoa bebe." },
    { title: "Mestre do Dedão", description: "Você é o Mestre do Dedão. Quando você colocar seu dedão na mesa, todos os outros jogadores devem fazer o mesmo. O último a fazer, bebe." },
    { title: "Rima", description: "Diga uma palavra. O próximo jogador deve dizer uma palavra que rime. O primeiro a falhar, bebe." },
    { title: "Dê Dois, Tome Dois", description: "Você deve beber duas doses e pode dar duas doses para qualquer jogador(es)." },
    { title: "Desafio ou Dose", description: "Cumpra um desafio criado pelo grupo, ou tome uma dose/vire sua bebida." },
    { title: "Vírus", description: "Você tem o Vírus. Se você falar com outro jogador e ele responder, ele agora também tem o Vírus. Quem tem o Vírus bebe se falar. O comprador da carta é curado quando a próxima carta for comprada." },
    { title: "Escolha Alguém", description: "Escolha uma pessoa para beber." },
    { title: "Céu", description: "Aponte para o céu! O último jogador a fazer isso, bebe." },
    { title: "Parceiro", description: "Escolha um 'parceiro'. Pelo resto do jogo, sempre que você tiver que beber, ele também terá que beber (e vice-versa)." },
    { title: "Modo Silêncio", description: "Ninguém pode falar. O primeiro a falar, bebe. O silêncio é quebrado quando a próxima carta for comprada." },
    { title: "Contador de Histórias", description: "Comece uma história com uma frase. O próximo jogador adiciona uma frase. O primeiro a hesitar ou errar a história, bebe." },
    { title: "O Imitador", description: "Escolha outro jogador para imitar. Você deve agir como ele até sua próxima vez. Se sair do personagem, você bebe." },
    { title: "Categorias Temáticas", description: "Escolha uma categoria específica (ex: 'Marcas de carro com a letra F', 'Personagens de Simpsons'). Em círculo, cada um nomeia um item. O primeiro a falhar ou repetir, bebe." },
    { title: "Quem tem mais chance de...", description: "Faça uma pergunta 'Quem tem mais chance de...' (ex: '...ir para um reality show?'). O grupo aponta para alguém. A pessoa mais votada bebe." },
    { title: "Eu Nunca... ", description: "Diga algo que você nunca fez (ex: 'Eu nunca fingi estar doente para faltar no trabalho'). Quem JÁ fez, bebe 2 doses." },
    { title: "O Filósofo", description: "Faça uma pergunta polêmica (ex: 'O ovo veio antes da galinha?'). Todos devem dar sua opinião. A pior resposta, na opinião da maioria, bebe." },
    { title: "Regra do Mindinho", description: "Até a sua próxima vez, todos só podem beber segurando o copo com o dedo mindinho levantado. Quem esquecer, bebe." },
    { title: "Piadista", description: "Conte uma piada. Se ninguém rir, você bebe. Se pelo menos uma pessoa rir, você escolhe duas pessoas para beberem." },
    { title: "Coringa", description: "Guarde esta carta. Você pode usá-la a qualquer momento para anular uma regra que te faria beber e passar a dose para outra pessoa." },
    { title: "Troca de Lugar", description: "Escolha outro jogador para trocar de lugar com você. Vocês também trocam o que estiverem bebendo." }
];


// --- Lógica em Tempo Real com Socket.io ---
io.on('connection', (socket) => {
    console.log(`Um usuário conectou: ${socket.id}`);

    // Quando um jogador entra no jogo
    socket.on('joinGame', ({ playerName }) => {
        if (players.find(p => p.id === socket.id)) {
            return; // Jogador já está no jogo
        }
        const newPlayer = {
            id: socket.id,
            name: playerName,
        };
        players.push(newPlayer);
        console.log(`${playerName} entrou no jogo.`);

        // Se for o primeiro jogador, inicia o jogo
        if (players.length === 1) {
            gameInProgress = true;
            currentPlayerIndex = 0;
        }
        
        // Informa ao novo jogador seu próprio ID
        socket.emit('selfJoined', { selfId: socket.id });

        // Transmite o estado atualizado do jogo para todos os jogadores
        broadcastGameState();
    });

    // Quando o jogador atual compra uma carta
    socket.on('drawCard', () => {
        const player = players.find(p => p.id === socket.id);
        if (!player || !gameInProgress || players[currentPlayerIndex].id !== socket.id) {
            // Não é a vez deste jogador ou o jogo não está rolando
            return;
        }

        // Compra uma carta aleatória
        const card = cardDeck[Math.floor(Math.random() * cardDeck.length)];
        lastCard = card;

        // Passa para o próximo jogador
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

        console.log(`${player.name} comprou: ${card.title}`);
        broadcastGameState();
    });

    // Quando um jogador desconecta
    socket.on('disconnect', () => {
        console.log(`Um usuário desconectou: ${socket.id}`);
        const disconnectedPlayerIndex = players.findIndex(p => p.id === socket.id);

        if (disconnectedPlayerIndex !== -1) {
            players.splice(disconnectedPlayerIndex, 1);

            if (players.length === 0) {
                // Se não houver mais jogadores, reseta o jogo
                gameInProgress = false;
                currentPlayerIndex = 0;
                lastCard = null;
                console.log("Todos os jogadores saíram. Jogo resetado.");
            } else {
                // Ajusta o índice do jogador atual se necessário
                if (currentPlayerIndex >= players.length) {
                    currentPlayerIndex = 0;
                }
            }
            // Atualiza todo mundo
            broadcastGameState();
        }
    });
});

// Função auxiliar para enviar o estado atual para todos os clientes
function broadcastGameState() {
    const gameState = {
        players: players,
        currentPlayerId: gameInProgress ? players[currentPlayerIndex].id : null,
        lastCard: lastCard,
        gameInProgress: gameInProgress
    };
    io.emit('updateGameState', gameState);
}


server.listen(PORT, () => {
    console.log(`🍻 Servidor Baralho do Perigo está rodando em http://localhost:${PORT}`);
});
