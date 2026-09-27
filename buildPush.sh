# UUID des sites Umami (générés dans l'UI Umami sur stats.claireadresse.fr).
# À renseigner après le premier déploiement d'Umami, puis rebuilder.
UMAMI_SRC=https://stats.claireadresse.fr/script.js
UMAMI_WEBSITE_ID_PUBLIC=cc40ccb5-2cdc-4bec-a8f1-d3a834e53b4f

docker build --build-arg SITE_URL=https://claireadresse.fr --build-arg SITE_VARIANT=PUBLIC \
  --build-arg NEXT_PUBLIC_UMAMI_SRC=$UMAMI_SRC \
  --build-arg NEXT_PUBLIC_UMAMI_WEBSITE_ID=$UMAMI_WEBSITE_ID_PUBLIC \
  -f frontend/Dockerfile -t ghcr.io/jolivem/vibenu:latest .
docker push ghcr.io/jolivem/vibenu:latest