FROM node:20-alpine

WORKDIR /app

# Instalamos la herramienta global de SAP CDS
RUN npm install -g @sap/cds-dk

# Copiamos los archivos de configuración de paquetes
COPY package.json .

# Instalamos las librerías
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto 4004 (el estándar de SAP CAP)
EXPOSE 4004

# Comando de arranque
CMD ["cds", "run", "--profile", "production"]
