import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        react(),
        
        {
        name: "full-reload-on-no-modules",
        hotUpdate({ modules, server, file }) {
            if (modules.length === 0) {
            server.hot.send({
            type: 'full-reload',
            path: '*'
            })
            }
        } 
    }
    ],
    
    
    server: {
        port: 8080,
    },
    
})
