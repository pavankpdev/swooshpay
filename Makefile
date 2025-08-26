COMPOSE=docker compose --env-file .env.local
DATABASE_URL=postgresql://swooshpay:swooshpay@localhost:5432/swooshpay?sslmode=disable

.PHONY: dev stop logs ps dbconsole reset-db

## Spin up containers in detached mode
dev:
	$(COMPOSE) up -d
	@echo "🟢 Postgres running on localhost:5432, user:$$PG_USER db:$$PG_DB"

## Stop containers
stop:
	$(COMPOSE) down

## Tail logs
logs:
	$(COMPOSE) logs -f

## Show container status
ps:
	$(COMPOSE) ps

## psql shell into postgres
dbconsole:
	@docker exec -it swooshpay_postgres psql -U $$PG_USER -d $$PG_DB

## Drop & recreate local DB (CAUTION)
reset-db:
	$(COMPOSE) down -v
	$(COMPOSE) up -d

create-migration:
	pnpm dbmate new $(name)

migration-up:
	DATABASE_URL="$(DATABASE_URL)" pnpm dbmate up

migration-down:
	DATABASE_URL="$(DATABASE_URL)" pnpm dbmate down