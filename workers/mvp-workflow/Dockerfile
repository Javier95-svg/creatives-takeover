FROM mcr.microsoft.com/playwright:v1.60.0-noble
WORKDIR /worker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY runner.mjs build.mjs outcomes.mjs static-outcome.mjs ./
USER pwuser
ENTRYPOINT ["node","runner.mjs"]
