# http://54.95.158.122:3002/api-docs

setup:
	npm install

dev:
	npm run dev

docker-build:
	docker build -t kurosawakuro/poc-api-jsondb-3000 .

docker-run:
	docker run -p 3000:3000 kurosawakuro/poc-api-jsondb-3000

docker-stop:
	docker stop kurosawakuro/poc-api-jsondb-3000

docker-remove:
	docker rm kurosawakuro/poc-api-jsondb-3000

docker-logs:
	docker logs kurosawakuro/poc-api-jsondb-3000

docker-deploy-dockerhub:
	docker push kurosawakuro/poc-api-jsondb-3000:latest







