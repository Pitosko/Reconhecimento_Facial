const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use(session({
  secret: 'facial-captcha-secret-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 5 * 60 * 1000 } // 5 minutos
}));

const CHALLENGES = [
  { id: 'smile',     label: 'Sorri',           emoji: '😄', description: 'Mostra um sorriso' },
  { id: 'open_mouth',label: 'Abre a boca',     emoji: '😮', description: 'Abre bem a boca' },
  { id: 'eyes_closed',label: 'Fecha os olhos', emoji: '😌', description: 'Fecha os dois olhos' },
  { id: 'surprised', label: 'Faz surpresa',    emoji: '😲', description: 'Faz cara de surpresa' },
];

// Gerar desafio aleatório
app.get('/api/challenge', (req, res) => {
  const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  req.session.currentChallenge = challenge.id;
  req.session.challengeTime = Date.now();
  req.session.attempts = (req.session.attempts || 0);
  res.json({ challenge });
});

// Validar resultado do desafio
app.post('/api/verify', (req, res) => {
  const { detectedExpression, confidence } = req.body;
  const { currentChallenge, challengeTime, attempts } = req.session;

  if (!currentChallenge) {
    return res.json({ success: false, message: 'Sem desafio ativo. Tenta novamente.' });
  }

  // Timeout de 30 segundos
  if (Date.now() - challengeTime > 30000) {
    req.session.currentChallenge = null;
    return res.json({ success: false, message: 'Tempo esgotado! Gera um novo desafio.' });
  }

  const matched = detectedExpression === currentChallenge && confidence > 0.65;

  if (matched) {
    req.session.authenticated = true;
    req.session.currentChallenge = null;
    req.session.attempts = 0;
    return res.json({ success: true, message: 'Humano confirmado! Acesso concedido.' });
  } else {
    req.session.attempts = (attempts || 0) + 1;
    if (req.session.attempts >= 5) {
      req.session.attempts = 0;
      req.session.currentChallenge = null;
      return res.json({ success: false, blocked: true, message: 'Demasiadas tentativas. Aguarda 30 segundos.' });
    }
    return res.json({ success: false, message: 'Expressão não reconhecida. Tenta outra vez!' });
  }
});

// Verificar estado de autenticação
app.get('/api/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
