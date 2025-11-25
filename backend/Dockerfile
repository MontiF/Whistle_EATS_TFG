FROM node:20-alpine

WORKDIR /app

# --- NUEVA LÍNEA NECESARIA ---
# Instalamos las herramientas para poder compilar better-sqlite3
RUN apk add --no-cache python3 make g++
# -----------------------------

# Instalamos la herramienta global de SAP CDS
RUN npm install -g @sap/cds-dk

# Copiamos los archivos de configuración
COPY package.json .

# Instalamos las librerías (ahora sí funcionará bien la compilación)
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto
EXPOSE 4004

# NOTA SOBRE ESTE COMANDO:
# 'cds watch' es para desarrollo (se reinicia si cambias archivos).
# Para producción o Docker puro se suele usar 'cds run' o 'npm start'.
# Pero si te funciona para el TFG, déjalo así por ahora.
CMD ["cds", "run"]