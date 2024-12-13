# Gunakan image Node.js resmi sebagai base image
FROM node:18-slim

# Set working directory di dalam container
WORKDIR /usr/src/app

# Salin package.json dan package-lock.json terlebih dahulu untuk menginstall dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Ekspose port yang digunakan oleh aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "start"]
