# The coach runtime image. glibc amd64 on purpose: the Agent SDK ships its binary as a platform
# optional dependency, so no alpine and no --omit=optional.

FROM --platform=linux/amd64 node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# Python 3.14 is the host's version and the only one the cse-progress scripts are tested on, so the
# runtime stage starts from the python image and borrows Node 22 from the node image.
FROM --platform=linux/amd64 python:3.14-slim-bookworm
ENV DEBIAN_FRONTEND=noninteractive
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ripgrep ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

# The cse-progress scripts and hooks run on this venv's python.
RUN python3 -m venv /opt/py
COPY requirements.txt /tmp/requirements.txt
RUN /opt/py/bin/pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

ENV PATH=/opt/py/bin:$PATH \
    TZ=America/New_York \
    NODE_ENV=production \
    GIT_TERMINAL_PROMPT=0 \
    PYTHONIOENCODING=utf-8

RUN useradd --create-home --home-dir /home/coach --shell /bin/bash coach \
    && mkdir -p /home/coach/work /home/coach/.claude-config \
    && chown -R coach:coach /home/coach

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Build-time smoke, no network and no API key: the SDK loads, its platform binary runs (found by name, so
# the platform package is not hardcoded), python is 3.14, git runs, and the clock stamps New York time
# (session_date.py reads local time).
RUN set -e; \
    node --input-type=module -e "await import('@anthropic-ai/claude-agent-sdk')"; \
    claude_bin="$(find /app/node_modules/@anthropic-ai -maxdepth 2 -type f -name claude | head -1)"; \
    if [ -z "$claude_bin" ]; then echo "SDK platform binary not found" >&2; exit 1; fi; \
    "$claude_bin" --version; \
    case "$(python --version)" in "Python 3.14"*) ;; *) echo "python is not 3.14" >&2; exit 1 ;; esac; \
    git --version; \
    case "$(TZ=America/New_York date +%Z)" in EDT|EST) ;; *) echo "TZ check failed" >&2; exit 1 ;; esac

USER coach
ENV HOME=/home/coach
EXPOSE 8080
CMD ["node", "dist/main.js"]
