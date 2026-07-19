import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // Backlog #9 review 19/07: bundle 600kB 1 chunk. Tách 2 nhóm ổn định để cache trình duyệt
    // sống qua các lần deploy (mọi chunk vẫn nạp ngay lúc mở app — không đổi hành vi):
    //  - react: react/react-dom đổi ~vài tháng/lần
    //  - data: src/data/* (echo DB, vũ khí, chữ ký seticon…) chỉ đổi khi regen theo patch game
    // Vite 8 chạy rolldown → dùng advancedChunks (manualChunks kiểu rollup đã bỏ).
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'data', test: /[\\/]src[\\/]data[\\/]/ },
          ],
        },
      },
    },
  },
})
