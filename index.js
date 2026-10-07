const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Banco de dados em memória
const usuarios = new Map(); // Armazena { email, tokens, chaveAPI }

// 1. Autenticação / Login
app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: "E-mail obrigatório." });

    let usuario = usuarios.get(email);
    if (!usuario) {
        usuario = {
            email,
            tokens: 5.0, // Bônus inicial
            chaveAPI: "SK-SWARM-" + Math.random().toString(36).substring(2, 18).toUpperCase()
        };
        usuarios.set(email, usuario);
    }
    res.json({ sucesso: true, ...usuario });
});

// Gerenciamento da Rede / WebSocket
let nosAtivosRede = 0;

io.on('connection', (socket) => {
    nosAtivosRede++;
    io.emit('statusRede', { nosAtivos: nosAtivosRede });

    socket.on('minerarToken', ({ email }) => {
        let usuario = usuarios.get(email);
        if (usuario) {
            usuario.tokens += 0.01; // Recompensa por manter o nó ativo
            socket.emit('saldoAtualizado', { tokens: parseFloat(usuario.tokens.toFixed(4)) });
        }
    });

    socket.on('disconnect', () => {
        nosAtivosRede = Math.max(1, nosAtivosRede - 1);
        io.emit('statusRede', { nosAtivos: nosAtivosRede });
    });
});

// 2. Execução de IA via Enxame (Gasta tokens)
app.post('/api/ai/executar', (req, res) => {
    const { chaveAPI, prompt } = req.body;
    
    let usuarioEncontrado = null;
    for (let [email, dados] of usuarios.entries()) {
        if (dados.chaveAPI === chaveAPI) {
            usuarioEncontrado = dados;
            break;
        }
    }

    if (!usuarioEncontrado) return res.status(401).json({ erro: "Chave de API inválida." });

    const custo = 0.05;
    if (usuarioEncontrado.tokens < custo) {
        return res.status(403).json({ erro: "Créditos insuficientes! Assista a um anúncio ou deixe o nó minerando." });
    }

    usuarioEncontrado.tokens -= custo;

    const respostasEnxame = [
        `[Enxame DePIN] Processado por ${nosAtivosRede} nós conectados: "${prompt}" resolvido com sucesso.`,
        `[Cluster Descentralizado] Síntese coletiva gerada para o prompt enviado. Tudo operando na malha.`,
        `[Rede P2P] Executado via nós leves em paralelo. Resposta validada pelo enxame.`
    ];

    res.json({
        sucesso: true,
        resposta: respostasEnxame[Math.floor(Math.random() * respostasEnxame.length)],
        tokensRestantes: parseFloat(usuarioEncontrado.tokens.toFixed(4))
    });
});

// 3. Rota de Recompensa por Anúncio Voluntário
app.post('/api/usuario/recompensa', (req, res) => {
    const { email, quantidade } = req.body;
    let usuario = usuarios.get(email);

    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });

    usuario.tokens += (quantidade || 1.0);

    res.json({
        sucesso: true,
        novosTokens: parseFloat(usuario.tokens.toFixed(4))
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
