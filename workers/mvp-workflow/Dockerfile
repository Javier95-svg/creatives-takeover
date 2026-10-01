FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /worker
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY runner.mjs build.mjs outcomes.mjs ./
USER pwuser
ENTRYPOINT ["node","runner.mjs"]
