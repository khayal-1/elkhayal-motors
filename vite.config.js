import { defineConfig } from 'vite';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    target: 'es2020',
    sourcemap: false
  }
});
