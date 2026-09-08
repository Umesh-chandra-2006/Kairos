@echo off
cd /d "D:\k\apps\api"
node --env-file="D:\k\.env" "D:\k\apps\api\node_modules\tsx\dist\cli.mjs" src/index.ts 1>> "D:\k\api.log" 2>> "D:\k\api.err.log"