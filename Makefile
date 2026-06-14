.PHONY: dev dev-backend dev-frontend migrate test-backend test-frontend test-e2e build clean setup seed health prod prod-down

dev:
	docker compose up --build

dev-backend:
	cd backend && air

dev-frontend:
	cd frontend && npm run dev

migrate:
	cd backend && go run cmd/server/main.go migrate

seed:
	cd backend && go run cmd/seed/main.go

test-backend:
	cd backend && go test ./... -v -cover -count=1

test-frontend:
	cd frontend && npm run test

test-e2e:
	cd frontend && npx playwright test

build:
	cd backend && go build -o bin/server ./cmd/server
	cd frontend && npm run build

clean:
	docker compose down -v
	rm -rf backend/bin frontend/.next

setup:
	@cp -n .env.example .env 2>/dev/null || true
	@cp -n backend/.env.example backend/.env 2>/dev/null || true
	@cp -n frontend/.env.local.example frontend/.env.local 2>/dev/null || true
	@echo "✅ .env files created. Add your real API keys before running 'make dev'"

health:
	@curl -sf http://localhost:8080/health | jq . || echo "❌ Backend not running"
	@curl -sf http://localhost:8080/api/v1/health/db | jq . || echo "❌ DB not connected"

prod:
	docker compose -f docker-compose.prod.yml up --build -d

prod-down:
	docker compose -f docker-compose.prod.yml down
