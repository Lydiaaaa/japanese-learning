import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键修改：强制使用相对路径，解决在非根目录部署（如预览环境）下的资源加载问题
  base: './',
});
