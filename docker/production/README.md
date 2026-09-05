# Casa em Dia — Produção (Docker Compose + Cloudflare Tunnel)

Ambiente de **produção** do **Casa em Dia**, rodando localmente com Docker Compose e exposto à internet via **Cloudflare Tunnel**.

Stack completa em containers: PostgreSQL (local), API (Node/Express/Prisma), Frontend (Vue/Nginx) e `cloudflared`.

---

## 📁 Estrutura

```
docker/production/
├── docker-compose.yml   # definição da stack
├── .env                 # segredos e configuração (NÃO versionar)
└── .gitignore           # ignora o .env
```

Diretórios do **código** (fora daqui):
- Backend: `C:\Users\kalli\Documents\casa-em-dia`
- Frontend: `C:\Users\kalli\Documents\casa-em-dia-front`

---

## 🏗️ Serviços

| Serviço | Imagem/Build | Porta interna | Porta host | Descrição |
|---------|--------------|---------------|-----------|-----------|
| `db` | postgres:16-alpine | 5432 | **5433** | PostgreSQL local (produção) |
| `api` | build `../../` (casa-em-dia) | 3000 | 3000 | Backend Node/Prisma |
| `frontend` | build `../../../casa-em-dia-front` | 80 | 8081 | Frontend Vue/Nginx |
| `cloudflared` | cloudflare/cloudflared | - | - | Cloudflare Tunnel |

Todos os serviços estão na rede `casaemdia_net`.

---

## 🔑 Variáveis de ambiente (`.env`)

| Variável | Descrição |
|----------|-----------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciais do banco local |
| `JWT_SECRET` | Chave de assinatura JWT |
| `PORT` | Porta interna da API (3000) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | SMTP para envio de e-mails |
| `FRONTEND_URL` | Origem CORS do frontend (`https://casaemdia.residuospro.com.br`) |
| `API_URL` | URL pública da API (`https://api-casaemdia.residuospro.com.br`) — vira `VITE_API_URL` |
| `VITE_FIREBASE_*` | Config do Firebase (build do frontend) |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token do tunnel `casa-em-dia-tunel` |
| `CLOUDFLARE_ACCOUNT_ID` | ID do tunnel/ária |

> ⚠️ **Não commite o `.env`** (já está no `.gitignore` local). O `.env` contém segredos.

---

## 🚀 Como subir

A partir da pasta `docker/production`:

```bash
# Subir toda a stack (build das imagens)
docker compose up -d --build

# Subir serviços específicos
docker compose up -d db
docker compose up -d api
docker compose up -d frontend
docker compose up -d cloudflared

# Verificar status
docker compose ps
```

A API roda `prisma migrate deploy` automaticamente no start (aplica migrations pendentes).

---

## 🔍 Validar

```bash
# API local
curl http://localhost:3000/health        # → {"status":"ok"}

# Frontend local
curl http://localhost:8081/

# Via tunnel (publicado)
curl https://api-casaemdia.residuospro.com.br/health
curl https://casaemdia.residuospro.com.br/
```

---

## Logs e manutenção

```bash
docker compose logs -f api
docker compose logs -f cloudflared
docker compose down          # para os containers (mantém volumes)
docker compose down --volumes  # para e apaga dados (cuidado!)
docker compose up -d --build api   # aplica mudanças de código na API (rebuild)
```

> ⚠️ O backend não tem volume montado para o código-fonte. Para aplicar mudanças de código, **rebuild** (`docker compose up -d --build api`).

---

## ☁️ Cloudflare Tunnel

O acesso público é feito pelo tunnel `casa-em-dia-tunel`. Hostnames configurados no painel **Zero Trust → Tunnels → casa-em-dia-tunel → Public Hostnames**:

| Hostname | Origem (HTTP) |
|----------|---------------|
| `casaemdia.residuospro.com.br` | `http://frontend:80` |
| `api-casaemdia.residuospro.com.br` | `http://api:3000` |

### Regras importantes
- **Use `http://` nas origens** (os serviços internos atendem em HTTP puro; `https://` causa 502/404).
- **Subdomínios multinível** (3+ níveis, ex.: `api.casaemdia...`) exigem o **Advanced Certificate Manager** — por isso a API usa `api-casaemdia...` (2 níveis), coberto pelo certificado padrão.
- Mantenha **um único connector por tunnel**. Não crie serviços `cloudflared` duplicados (ex.: serviço Windows + container) — causam 502 intermitentes.

### Conectar o tunnel
1. Crie o tunnel no painel e **copie o token** (`eyJ...`).
2. Preencha `CLOUDFLARE_TUNNEL_TOKEN` no `.env`.
3. Suba o container: `docker compose up -d cloudflared`.

Ao adicionar hostnames no painel, o CNAME DNS para `*.cfargotunnel.com` é criado automaticamente.

---

## 🗄️ Banco de dados

O Postgres local foi criado e **populado via migração** do servidor remoto (`147.79.110.185:5432/casa-em-dia-db`) com `pg_dump`/`pg_restore`.

### Backup local
```bash
# Dump do banco local para arquivo
docker exec casa-em-dia-db pg_dump -U casa-em-dia-user -d casa-em-dia-db -F c -f /tmp/backup.dump
docker cp casa-em-dia-db:/tmp/backup.dump ./backup-$(date +%F).dump
```

### Restaurar backup
```bash
docker cp ./backup-$(date +%F).dump casa-em-dia-db:/tmp/
docker exec casa-em-dia-db pg_restore -U casa-em-dia-user -d casa-em-dia-db --clean --if-exists /tmp/backup-*.dump
```

> A porta do host é **5433** (a 5432 pode estar em uso). Para conectar de fora: `psql -h localhost -p 5433 -U casa-em-dia-user -d casa-em-dia-db`.

---

## 📤 Uploads

Arquivos enviados (fotos de perfil etc.) ficam no volume **nomeado `casa-em-dia_uploads`** (declarado `external: true`), montado em `/app/uploads` no container da API. Esse volume é **reutilizado** do ambiente anterior para não perder as fotos existentes.

---

## 🛠️ Troubleshooting

- **API não sobe / migration falha**: verifique se o `db` está healthy e se `DATABASE_URL` aponta para `db:5432` (o compose monta automaticamente).
- **502 via tunnel**: confira se o origin usa `http://` e se há apenas 1 connector. Veja `docker logs casa-em-dia-cloudflared`.
- **Frontend chama URL errada**: o `VITE_API_URL` é embutido no build. Mude no `.env` e **reconstrua**: `docker compose up -d --build frontend`.
- **Erro SSL/TLS em subdomínio**: confira se não é um subdomínio multinível (3+ níveis) sem Advanced Certificate Manager.
