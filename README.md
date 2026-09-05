# Casa em Dia — API

Backend do aplicativo **Casa em Dia**, uma solução PWA para organização familiar.

---

## Stack

- **Runtime:** Node.js 22
- **Framework:** NestJS
- **Linguagem:** TypeScript
- **Gerenciador:** pnpm
- **Banco de dados:** PostgreSQL
- **ORM:** Prisma
- **Containerizaçao:** Docker & Docker Compose
- **Qualidade:** ESLint, Prettier
- **Testes:** Jest

---

## Requisitos

- Node.js >= 22
- pnpm >= 9
- Docker & Docker Compose (opcional, para rodar com containers)
- PostgreSQL (se for rodar localmente sem Docker)

---

## Instalação

```bash
pnpm install
```

---

## Configuração

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Preencha as variáveis no `.env`:

| Variável         | Descrição                         |
| ---------------- | --------------------------------- |
| `DATABASE_URL`   | URL de conexão com o PostgreSQL   |
| `JWT_SECRET`     | Chave secreta para JWT            |
| `PORT`           | Porta da aplicação (padrão: 3000) |

---

## Como rodar localmente

```bash
# 1. instalar dependências
pnpm install

# 2. gerar o Prisma Client
pnpm prisma:generate

# 3. executar as migrations
pnpm prisma:migrate

# 4. iniciar em modo desenvolvimento
pnpm start:dev
```

A API estará disponível em `http://localhost:3000`.

---

## Como subir com Docker

```bash
docker compose up -d
```

Isso sobe dois serviços:

| Serviço | Container            | Porta  |
| ------- | -------------------- | ------ |
| API     | `casa-em-dia-api`    | 3000   |
| Banco   | `casa-em-dia-db`     | 5432   |

Para gerar o Prisma Client dentro do container:

```bash
docker compose exec api npx prisma generate
```

Para executar migrations:

```bash
docker compose exec api npx prisma migrate dev
```

---

## Scripts disponíveis

| Comando               | Descrição                     |
| --------------------- | ----------------------------- |
| `pnpm build`          | Compila o projeto             |
| `pnpm start:dev`      | Inicia com hot-reload         |
| `pnpm start:prod`     | Inicia em produção            |
| `pnpm lint`           | Executa ESLint                |
| `pnpm format`         | Formata com Prettier          |
| `pnpm test`           | Executa testes unitários      |
| `pnpm test:e2e`       | Executa testes e2e            |
| `pnpm prisma:studio`  | Abre Prisma Studio            |

---

## Estrutura do projeto

```
src/
├── main.ts                  # Entry point
├── app.module.ts            # Módulo raiz
├── common/                  # Recursos compartilhados
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/                  # Configurações do NestJS
└── prisma/                  # Módulo Prisma
    ├── prisma.module.ts
    └── prisma.service.ts
```

---

## Endpoints

| Método | Rota        | Descrição            |
| ------ | ----------- | -------------------- |
| GET    | `/health`   | Verificação de saúde |

---

## 🚀 Ambiente de Produção

Este repositório é o **backend** do Casa em Dia. O ambiente de produção (PostgreSQL local + API + Frontend + Cloudflare Tunnel) roda em Docker Compose na pasta **`docker/production/`**.

> 📖 **Guia completo de operação em produção:** [docker/production/README.md](docker/production/README.md)

Resumo rápido:

```bash
cd docker/production
docker compose up -d --build
```

Publicado em:
- Frontend: `https://casaemdia.residuospro.com.br`
- API: `https://api-casaemdia.residuospro.com.br`

---

## Licença

MIT
