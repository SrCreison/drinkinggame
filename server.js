// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path'); // Corrigido: Usar require para importar o módulo
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, 'public');
console.log(`[INFO] Servindo ficheiros estáticos a partir de: ${publicPath}`);
app.use(express.static(publicPath));

// --- Estado do Jogo ---
let players = [];
let currentPlayerIndex = 0;
let gameInProgress = false;
let lastCard = null;

const cardDeck = [
    // Cartas Clássicas
    { title: "Social", description: "Todos bebem!" },
    { title: "Cascata", description: "Todos começam a beber. Você não pode parar até que a pessoa que comprou a carta pare." },
    { title: "Mestre das Regras", description: "Crie uma nova regra. A regra dura por um total de três rodadas. Quem quebrá-la, bebe." },
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
    { title: "Troca de Lugar", description: "Escolha outro jogador para trocar de lugar com você. Vocês também trocam o que estiverem bebendo." },
    { title: "Braços de T-Rex", description: "Até a sua próxima vez, você só pode beber com os cotovelos colados ao corpo. Se esquecer, bebe uma dose extra." },
    { title: "Titanic", description: "Escolha um jogador para ser seu 'Jack'. Se você beber, ele bebe. Se ele beber, você bebe. A parceria acaba se um de vocês tirar esta carta de novo e escolher um novo Jack." },
    { title: "Apelidos", description: "Você tem o direito de dar um apelido para cada jogador. Até esta carta sair de novo, todos devem usar os apelidos. Quem errar, bebe." },
    { title: "O Protetor", description: "Escolha um jogador para proteger (não pode ser você mesmo). Por 3 rodadas, ninguém pode mandar esse jogador beber. Cartas como 'Social' ainda o afetam." },
    { title: "Terceira Pessoa", description: "Você só pode falar de si mesmo na terceira pessoa (ex: 'O João está com sede') até a sua próxima vez. Se falar 'eu', 'meu', ou 'mim', você bebe." },
    { title: "O Advogado", description: "Escolha um jogador para ser julgado por um 'crime' que você inventar. Alguém o acusa, outro o defende. O grupo vota no mais convincente. O perdedor do debate bebe." },
    { title: "Duas Verdades, Uma Mentira", description: "Conte duas verdades e uma mentira sobre você. Os outros devem adivinhar qual é a mentira. Se acertarem, você bebe. Se errarem, todos eles bebem." },
    { title: "Google", description: "Faça uma pergunta de conhecimento geral bem difícil. O primeiro a responder corretamente no chat está salvo. Todos os outros bebem." },
    { title: "Pantomima", description: "Faça uma mímica para o grupo adivinhar um filme, série ou personagem. O primeiro a acertar pode mandar 3 doses para quem quiser." },
    { title: "O Leiloeiro", description: "Leiloe uma tarefa (ex: 'Quem bebe 1 dose para eu ter que cantar?'). Quem der o maior lance, cumpre e você faz a tarefa. Se ninguém der lance, você bebe 3 doses." },
    { title: "Sem Rir", description: "Você tem 1 minuto para tentar fazer os outros jogadores rirem, sem rir você mesmo. Cada jogador que rir, bebe. Se você rir, você bebe." },
    { title: "Bomba Relógio", description: "Você não bebe agora, mas é obrigado a beber em dobro na sua próxima vez (sua dose + a dose de quem te mandar)." },
    { title: "Buraco Negro", description: "Esta carta fica 'na mesa'. O próximo jogador que comprar uma carta que o faça beber, bebe por si e pelo Buraco Negro (bebe em dobro). Depois, a carta some." },
    { title: "Imunidade Diplomática", description: "Até o início da sua próxima rodada, você não pode ser alvo de escolhas de outros jogadores. Você ainda bebe com cartas 'Social' ou se quebrar regras." },
    { title: "Robin Hood", description: "O jogador com a bebida mais cheia e o jogador com a bebida mais vazia, bebem." },
    { title: "O Viajante do Tempo", description: "Beba um gole para cada hora que já se passou desde as 17h de hoje." },
    { title: "O Bandeirante", description: "Começando por você, cada jogador deve nomear uma cidade do estado de São Paulo. O primeiro a repetir ou não saber, bebe." },
    { title: "Calendário", description: "Qual a data de amanhã (dia e mês)? Se você acertar, distribua 3 doses. Se errar, beba 3 doses." },
    { title: "Daltônico", description: "Escolha uma cor. Todos que estiverem vestindo uma peça de roupa dessa cor, bebem." },
    { title:- "Sopa de Letrinhas", description: "Todos os jogadores cujo nome começa com uma vogal (A, E, I, O, U), bebem." },
    { title: "Aniversariante do Mês", description: "Todos que fazem aniversário neste mês (Julho) bebem. Se ninguém fizer, o jogador que comprou a carta bebe." },
    { title: "Rivais", description: "Escolha outros dois jogadores para serem rivais. Pelas próximas 3 rodadas, sempre que um deles beber, o outro bebe também." },
    { title: "O Trio", description: "Escolha mais dois jogadores. Vocês formam um trio. A próxima carta que afetar um de vocês, afeta o trio inteiro. A regra vale apenas para a próxima carta." },
    { title: "Mestre e Aprendiz", description: "Escolha um 'aprendiz'. Pelas próximas 3 rodadas, ele deve te servir a bebida. Se ele esquecer, bebe uma dose. Se você esquecer de pedir, você bebe." },
    { title: "Dobro ou Nada", description: "Você pode beber 2 doses agora ou arriscar. Se arriscar, use um app de 'cara ou coroa'. Cara = você não bebe nada. Coroa = você bebe 4 doses." },
    { title: "A Oferta", description: "Você pode escolher: ou bebe 1 dose, ou cria uma mini-regra que vale apenas até o início do seu próximo turno." },
    { title: "Confissão", description: "Confesse algo embaraçoso ou beba 3 doses. O grupo decide se a confissão foi boa o suficiente." },
    { title: "O Eco", description: "Diga uma palavra. O jogador seguinte repete sua palavra e adiciona uma nova. A corrente continua até alguém errar a sequência. Quem errar, bebe." },
    { title: "Associação de Ideias", description: "Diga uma palavra. O próximo jogador deve dizer a primeira palavra que lhe vier à cabeça. A regra passa adiante. O primeiro a demorar mais de 3 segundos para responder, bebe." },
    { title: "De Quem é a Frase?", description: "Fale uma frase de um filme ou série famosa. O primeiro a adivinhar de onde é a frase pode mandar 3 pessoas beberem." },
    { title: "Bateria Social", description: "Todos checam a porcentagem da bateria. Quem tiver a menor, distribui 3 doses. Quem tiver a maior, bebe 1 dose." },
    { title: "O Stalker", description: "Espie a tela do celular do jogador à sua esquerda por 10s. Com base no que vir, faça um comentário. Se o grupo achar engraçado, o dono do celular bebe. Se não, você bebe." },
    { title: "O DJ da Rodada", description: "Toque o início de uma música no seu celular. O primeiro a adivinhar o artista corretamente está salvo e pode mandar alguém beber." },
    { title: "Desenhista Cego", description: "O jogador à sua direita te diz o que desenhar. Usando o editor de imagem do celular, desenhe em 30s. Se o grupo adivinhar o que é, você está salvo. Se não, você bebe." },
    { title: "O Imperador", description: "Até seu próximo turno, você pode dar ordens simples aos outros (ex: 'Fale como um robô'). Se alguém se recusar, bebe. Mas se você não der nenhuma ordem, você bebe 3 doses no final." },
    { title: "Escudo Refletor", description: "Memorize esta carta. Na próxima vez que um jogador te escolher para beber, a dose é refletida de volta para ele. A carta só vale uma vez e não funciona com regras globais." },
    { title: "A Escolha Difícil", description: "Escolha dois jogadores. Eles devem decidir entre si quem vai beber 3 doses. Se não decidirem em 15 segundos, os dois bebem." },
    { title: "O Historiador", description: "Quem comprou a primeira carta do jogo? Se você acertar, essa pessoa bebe. Se errar, você bebe." },
    { title: "Déjà Vu", description: "Lembre-se da regra da penúltima carta comprada e aplique-a novamente. Se ninguém lembrar, todos bebem." },
    { title: "Crise da Quarta-feira", description: "Hoje é quarta-feira. Beba 1 dose se você já quer que a semana acabe. Você aponta quem deve beber." },
    { title: "O Número 23", description: "O número do dia é 23. Diga algo famoso associado a este número. Se conseguir, distribua 2 doses. Se não, beba 3." },
    { title: "O Publicitário", description: "Escolha um objeto perto de você e crie um slogan para ele. Se o grupo achar criativo, você pode dar 3 doses. Se não, você bebe." },
    { title: "Narração Esportiva", description: "Você deve narrar as ações do próximo jogador como se fosse uma partida de futebol até a vez dele acabar. Se parar ou gaguejar, bebe." },
    { title: "O Entrevistador", description: "Faça 3 perguntas rápidas para um jogador. Ele deve responder com a primeira coisa que vier à mente. Se ele hesitar em qualquer uma, bebe." },
    { title: "Palavra Proibida", description: "Escolha uma palavra comum (ex: 'beber', 'sim', 'não'). Quem disser, bebe."},
    { title: "Torre de Copos", description: "Empilhe 3 copos descartáveis. Se derrubar, beba 2."},
    { title: "Personagem Secreto", description: "Pense em um personagem famoso e responda perguntas do grupo com 'sim' ou 'não'. Se não adivinharem em 1 minuto, todos (incluindo você) bebem."},
    { title: "Desafio do Equilíbrio", description: "Fique em um pé só com os olhos fechados por 15 segundos. Se cair, beba."},
    { title: "Apresentador de TV", description: "Finja que está apresentando um programa de TV por 1 minuto. Se quebrar o personagem, beba."},
    { title: "História Improvisada", description: "Conte uma história curta usando as palavras que os jogadores falarem aleatoriamente. Se travar ou repetir, beba."},
    { title: "Verdade ou Mentira", description: "O jogador conta uma história, sendo verdade ou não. Ao final da história, os jogadores julgarão se é verdade ou mentira. Quem errar, bebe."},
    { title: "Pergunta Proibida", description: "Escolha uma pergunta que ninguém pode fazer até o fim da rodada. Quem perguntar, bebe."},
    { title: "Código Secreto", description: "Escolha um gesto secreto com outro jogador. Quando for feito em silêncio, todos devem copiar. O último a perceber, bebe."},
    { title: "Mudo por 1 Rodada", description: "Você não pode falar até sua próxima vez. Se falar, beba."},
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
