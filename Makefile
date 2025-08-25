COMPOSE=docker compose --env-file .env.local

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