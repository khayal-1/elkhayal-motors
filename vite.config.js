import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project-site path (https://khayal-1.github.io/elkhayal-motors/)
  base: '/elkhayal-motors/',
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    target: 'es2020',
    sourcemap: false
  }
});
