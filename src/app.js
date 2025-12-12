// app.js

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
// REMOVEMOS: child_process, path, fs, http, https, crypto.
// As funcionalidades de exec, fs, http/https e crypto agora estão encapsuladas
// dentro das rotas modulares, tornando o app.js mais limpo.

const app = express();

// --- 1. IMPORTAÇÃO DAS ROTAS MODULARES ---
// Importe cada arquivo de rota que você forneceu:
const healthRouter = require('./routes/health');
const loginRouter = require('./routes/login'); // Rota de login de exemplo
const usersRouter = require('./routes/users'); // Rota de CRUD de usuários
const vulnerabilitiesRouter = require('./routes/vulnerabilities'); // Novas rotas de vulnerabilidade

// --- 2. MIDDLEWARES GLOBAIS ---

const corsOptions = {
    origin: 'http://localhost:8080', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. CONFIGURAÇÃO DA CONEXÃO DE BANCO DE DADOS (MYSQL - Antiga) ---
// NOTA: Os arquivos 'health.js' e 'users.js' parecem usar uma pool/query para PostgreSQL,
// mas este arquivo ainda usa a conexão mysql. Mantenho a conexão mysql
// aqui, mas as rotas modulares PostgreSQL podem falhar sem a pool de PG.

const DB_HOST = process.env.DB_HOST || 'mysql'; 
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_DATABASE = process.env.DB_DATABASE || 'vulnerable_db';

const db = mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE
});

// Lidar com desconexão do DB
db.on('error', (err) => {
    console.error('ERRO FATAL NO BANCO DE DADOS:', err.code);
});
// -------------------------------------------------------------------------


// --- 4. MONTAGEM DAS ROTAS MODULARES ---

// Rota de Health Check
app.use('/health', healthRouter); 

// Rotas CRUD de Usuários (API RESTful)
// O users.js usa o prefixo /api/users em sua documentação Swagger
app.use('/api/users', usersRouter); 

// Rota de Login Antiga (Substituída pela rota modular)
// O login.js está montado em /login, mas o arquivo de rota usa '/'.
app.use('/login', loginRouter); 

// Rotas com vulnerabilidades para fins de teste SAST/DAST
// Monta as rotas: /vulnerabilities/login, /vulnerabilities/fetch-url, etc.
app.use('/vulnerabilities', vulnerabilitiesRouter); 


// --- 5. ROTAS QUE NÃO FORAM MODULARIZADAS (Opcional: Deixadas aqui se forem necessárias) ---

// Se a rota /execute precisa ficar aqui, mantenha-a.
app.post('/execute', (req, res) => {
    // VULNERABILIDADE: Command Injection (Injeção de Comando)
    const command = req.body.command || '';
    exec(`ls ${command}`, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: error.message, stderr });
        }
        res.json({ output: stdout });
    });
});

// Se a rota /download precisa ficar aqui, mantenha-a.
app.get('/download', (req, res) => {
    // VULNERABILIDADE: Path Traversal (Atravessamento de Diretório)
    const filename = req.query.file || '';
    const filepath = path.join(__dirname, filename);

    fs.stat(filepath, (err, stat) => {
        if (err) {
            return res.status(404).json({ error: 'ARQUIVO NÃO ENCONTRADO' });
        }
        res.sendFile(filepath, (sendErr) => {
            if (sendErr) {
                res.status(500).json({ error: sendErr.message });
            }
        });
    });
});

// Se a rota /search precisa ficar aqui, mantenha-a.
app.get('/search', (req, res) => {
    // VULNERABILIDADE: Cross-Site Scripting (XSS)
    const searchTerm = req.query.q || '';
    const html = `
        <html>
          <body>
            <h1>RESULTADOS PARA: ${searchTerm}</h1>
          </body>
        </html>
    `;
    res.set('Content-Type', 'text/html');
    res.send(html);
});

// Rota de fallback 404
app.use((req, res) => {
    res.status(404).json({ error: 'NÃO ENCONTRADO' });
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`SERVIDOR EXECUTANDO NA PORTA ${PORT}`);
    });
}