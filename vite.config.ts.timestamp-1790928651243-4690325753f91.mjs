// vite.config.ts
import tailwindcss from "file:///app/applet/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///app/applet/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { defineConfig } from "file:///app/applet/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///app/applet/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/app/applet";
var vite_config_default = defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "logo.png", "logo.jpg"],
        manifest: {
          id: "/",
          name: "JIPAS - Joy International Primary/Junior/Senior High & Adult School Portal System",
          short_name: "JIPAS",
          description: "A production-grade, multi-role school management system.",
          theme_color: "#4f46e5",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        devOptions: {
          enabled: true,
          type: "module"
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024
          // 15MB
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, ".")
      }
    },
    define: {
      "process.env.FIREBASE_AUTH_DOMAIN": JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "")
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {}
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwL2FwcGxldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtkZWZpbmVDb25maWd9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSwgXG4gICAgICB0YWlsd2luZGNzcygpLFxuICAgICAgVml0ZVBXQSh7XG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ2xvZ28ucG5nJywgJ2xvZ28uanBnJ10sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgaWQ6ICcvJyxcbiAgICAgICAgICBuYW1lOiAnSklQQVMgLSBKb3kgSW50ZXJuYXRpb25hbCBQcmltYXJ5L0p1bmlvci9TZW5pb3IgSGlnaCAmIEFkdWx0IFNjaG9vbCBQb3J0YWwgU3lzdGVtJyxcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnSklQQVMnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQSBwcm9kdWN0aW9uLWdyYWRlLCBtdWx0aS1yb2xlIHNjaG9vbCBtYW5hZ2VtZW50IHN5c3RlbS4nLFxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzRmNDZlNScsXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICBzdGFydF91cmw6ICcvJyxcbiAgICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9sb2dvLnBuZycsXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgICBwdXJwb3NlOiAnYW55JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9sb2dvLnBuZycsXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgICBwdXJwb3NlOiAnYW55JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJy9sb2dvLnBuZycsXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxuICAgICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBkZXZPcHRpb25zOiB7XG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0eXBlOiAnbW9kdWxlJyxcbiAgICAgICAgfSxcbiAgICAgICAgd29ya2JveDoge1xuICAgICAgICAgIG1heGltdW1GaWxlU2l6ZVRvQ2FjaGVJbkJ5dGVzOiAxNSAqIDEwMjQgKiAxMDI0LCAvLyAxNU1CXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLicpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgJ3Byb2Nlc3MuZW52LkZJUkVCQVNFX0FVVEhfRE9NQUlOJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuRklSRUJBU0VfQVVUSF9ET01BSU4gfHwgcHJvY2Vzcy5lbnYuVklURV9GSVJFQkFTRV9BVVRIX0RPTUFJTiB8fCAnJyksXG4gICAgfSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIC8vIEhNUiBpcyBkaXNhYmxlZCBpbiBBSSBTdHVkaW8gdmlhIERJU0FCTEVfSE1SIGVudiB2YXIuXG4gICAgICAvLyBEbyBub3QgbW9kaWZ5ZmlsZSB3YXRjaGluZyBpcyBkaXNhYmxlZCB0byBwcmV2ZW50IGZsaWNrZXJpbmcgZHVyaW5nIGFnZW50IGVkaXRzLlxuICAgICAgaG1yOiBwcm9jZXNzLmVudi5ESVNBQkxFX0hNUiAhPT0gJ3RydWUnLFxuICAgICAgLy8gRGlzYWJsZSBmaWxlIHdhdGNoaW5nIHdoZW4gRElTQUJMRV9ITVIgaXMgdHJ1ZSB0byBzYXZlIENQVSBkdXJpbmcgYWdlbnQgZWRpdHMuXG4gICAgICB3YXRjaDogcHJvY2Vzcy5lbnYuRElTQUJMRV9ITVIgPT09ICd0cnVlJyA/IG51bGwgOiB7fSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1OLE9BQU8saUJBQWlCO0FBQzNPLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUSxvQkFBbUI7QUFDM0IsU0FBUyxlQUFlO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxNQUFNO0FBQ2hDLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxNQUNaLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxRQUNkLGVBQWUsQ0FBQyxlQUFlLFlBQVksVUFBVTtBQUFBLFFBQ3JELFVBQVU7QUFBQSxVQUNSLElBQUk7QUFBQSxVQUNKLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLGtCQUFrQjtBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULFdBQVc7QUFBQSxVQUNYLE9BQU87QUFBQSxVQUNQLE9BQU87QUFBQSxZQUNMO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsY0FDTixTQUFTO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxjQUNOLFNBQVM7QUFBQSxZQUNYO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLFFBQ0EsWUFBWTtBQUFBLFVBQ1YsU0FBUztBQUFBLFVBQ1QsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBLFNBQVM7QUFBQSxVQUNQLCtCQUErQixLQUFLLE9BQU87QUFBQTtBQUFBLFFBQzdDO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsR0FBRztBQUFBLE1BQ2xDO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sb0NBQW9DLEtBQUssVUFBVSxRQUFRLElBQUksd0JBQXdCLFFBQVEsSUFBSSw2QkFBNkIsRUFBRTtBQUFBLElBQ3BJO0FBQUEsSUFDQSxRQUFRO0FBQUE7QUFBQTtBQUFBLE1BR04sS0FBSyxRQUFRLElBQUksZ0JBQWdCO0FBQUE7QUFBQSxNQUVqQyxPQUFPLFFBQVEsSUFBSSxnQkFBZ0IsU0FBUyxPQUFPLENBQUM7QUFBQSxJQUN0RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
