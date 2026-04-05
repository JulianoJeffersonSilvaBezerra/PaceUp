═══════════════════════════════════════════════════════════════════════════════
✅ CHECKLIST FINAL - VERIFIque TUDO ANTES DE DEPLOYAR
═══════════════════════════════════════════════════════════════════════════════

Use este checklist para garantir que NADA foi esquecido.

═══════════════════════════════════════════════════════════════════════════════
# PARTE 1: ARQUIVOS ANDROID (KOTLIN)
═══════════════════════════════════════════════════════════════════════════════

[ ] RunningPlugin.kt criado?
    📁 Caminho: android/app/src/main/java/com/runcadence/app/RunningPlugin.kt
    📝 Conteúdo: ~300 linhas, começa com "package com.runcadence.app"
    ✅ Verificar:
       - Tem @PluginMethod startTracking
       - Tem @PluginMethod stopTracking
       - Tem @PluginMethod getDistance
       - Tem @PluginMethod getRoute
       - Tem função haversine()

[ ] RunningService.kt criado?
    📁 Caminho: android/app/src/main/java/com/runcadence/app/RunningService.kt
    📝 Conteúdo: ~100 linhas, começa com "package com.runcadence.app"
    ✅ Verificar:
       - Estende Service
       - Tem createNotificationChannel()
       - Tem createNotification()

═══════════════════════════════════════════════════════════════════════════════
# PARTE 2: HOOKS REACT
═══════════════════════════════════════════════════════════════════════════════

[ ] useRunningPlugin.ts criado?
    📁 Caminho: src/hooks/useRunningPlugin.ts
    📝 Conteúdo: ~200 linhas
    ✅ Verificar:
       - Tem interface GPSPoint
       - Tem interface RunningState
       - Tem function useRunningPlugin()
       - Retorna { state, start, stop, getRoute }

═══════════════════════════════════════════════════════════════════════════════
# PARTE 3: COMPONENTES REACT
═══════════════════════════════════════════════════════════════════════════════

[ ] RunningMap.tsx criado?
    📁 Caminho: src/components/RunningMap.tsx
    📝 Conteúdo: ~250 linhas
    ✅ Verificar:
       - Tem interface MapProps
       - Tem component RunningMap
       - Tem component RouteStats
       - Carrega Leaflet via CDN

═══════════════════════════════════════════════════════════════════════════════
# PARTE 4: APP.TSX (INTEGRAÇÃO)
═══════════════════════════════════════════════════════════════════════════════

[ ] Imports adicionados?
    ✅ Tem: import { useRunningPlugin } from './hooks/useRunningPlugin';
    ✅ Tem: import { RunningMap, RouteStats } from './components/RunningMap';

[ ] Hook inicializado?
    ✅ Dentro de function App(), tem: const gpsRunning = useRunningPlugin();
    ✅ Logo abaixo de: const stepCounter = useStepCounter();

[ ] handleStart modificado?
    ✅ Tem: await gpsRunning.start();
    ✅ Logo abaixo de: await stepCounter.start();

[ ] handleStop modificado?
    ✅ Tem: await gpsRunning.stop();
    ✅ Logo abaixo de: await stepCounter.stop();

[ ] useEffect modificado (sensor status)?
    ✅ Tem: const realDistance = Math.max(gpsRunning.state.distance, 0.001);
    ✅ Substitui a linha original de cálculo de stride
    ✅ Tem na dependencies: gpsRunning.state.distance,

[ ] Topbar modificado?
    ✅ Tem GPS pill com: className={`gps-pill ${gpsRunning.state.isTracking ? 'gps-on' : 'gps-off'}`}
    ✅ Mostra "GPS ON" / "GPS OFF"

[ ] Hero-card modificado?
    ✅ Eyebrow diz: "Distância GPS"
    ✅ Mostra: {(gpsRunning.state.distance / 1000).toFixed(2)}
    ✅ Unit diz: "km"

[ ] Mapa adicionado?
    ✅ Tem: <RunningMap route={...} isTracking={...} distance={...} />
    ✅ Logo após </div> do hero-card

[ ] Stats adicionado?
    ✅ Tem: <RouteStats distance={...} pointCount={...} accuracy={...} />
    ✅ Logo abaixo do mapa

[ ] App.css modificado?
    ✅ Tem: @keyframes pulse { ... }
    ✅ No final do arquivo

═══════════════════════════════════════════════════════════════════════════════
# PARTE 5: CONFIGURAÇÕES ANDROID
═══════════════════════════════════════════════════════════════════════════════

[ ] build.gradle atualizado?
    📁 Caminho: android/app/build.gradle
    ✅ Tem: implementation 'com.google.android.gms:play-services-location:21.0.1'
    ✅ Dentro de: dependencies { ... }

[ ] AndroidManifest.xml atualizado?
    📁 Caminho: android/app/src/main/AndroidManifest.xml
    ✅ Tem: <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    ✅ Tem: <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    ✅ Tem: <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    ✅ Tem: <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
    ✅ Tem: <service android:name="com.runcadence.app.RunningService" ... />

═══════════════════════════════════════════════════════════════════════════════
# PARTE 6: TESTES RÁPIDOS
═══════════════════════════════════════════════════════════════════════════════

Após npm run build, verifique:

[ ] Sem erros de TypeScript?
    npm run build → deve terminar com "✓ built in 2.5s"

[ ] Sem erros de imports?
    - useRunningPlugin importa corretamente
    - RunningMap importa corretamente

[ ] npx cap sync android rodou sem erro?
    npx cap sync android → deve copiar os plugins para Android

═══════════════════════════════════════════════════════════════════════════════
# PARTE 7: BUILD E DEPLOY
═══════════════════════════════════════════════════════════════════════════════

[ ] Android Studio aberto?
    npx cap open android → abre Android Studio

[ ] Gradle sincronizado?
    No Android Studio: File → Sync Now

[ ] APK buildado?
    Menu: Build → Build Bundle(s)/APK(s) → Build APK(s)
    ✅ Deve completar sem erros

[ ] App instalado no dispositivo?
    Menu: Run → Run 'app'
    ✅ Selecione seu dispositivo/emulador
    ✅ Aguarde instalar

═══════════════════════════════════════════════════════════════════════════════
# PARTE 8: TESTES FUNCIONAIS
═══════════════════════════════════════════════════════════════════════════════

Abra o app no seu dispositivo:

[ ] App abre sem crashes?
    ✅ Sem mensagens de erro na tela

[ ] GPS pill aparece?
    ✅ No topo, ao lado do logo
    ✅ Inicialmente "GPS OFF"

[ ] Ao clicar START:
    ✅ GPS pill muda para "GPS ON" (verde)
    ✅ Notificação "RunCadence" aparece no status bar
    ✅ Distância começa em 0.00 km

[ ] Mapa aparece?
    ✅ Após 2-3 segundos de GPS ativo
    ✅ Mostra sua localização (centro de Petrolina por padrão)

[ ] Sua rota aparece no mapa?
    ✅ Linha verde começaa aparecer conforme você se move
    ✅ Marker pulsante (verde) marca sua posição atual

[ ] Distância aumenta?
    ✅ Conforme você caminha, distância em km aumenta
    ✅ Stats mostram precisão (±metros) e número de pontos

[ ] Ao clicar STOP:
    ✅ GPS pill muda para "GPS OFF"
    ✅ Mapa congela
    ✅ Rota fica permanente (visível)
    ✅ Notificação desaparece

═══════════════════════════════════════════════════════════════════════════════
# POSSÍVEIS PROBLEMAS E SOLUÇÕES
═══════════════════════════════════════════════════════════════════════════════

❌ PROBLEMA: "Plugin 'RunningPlugin' not found"
✅ SOLUÇÃO:
   - Verificar se RunningPlugin.kt está em: android/app/src/main/java/com/runcadence/app/
   - Rodar: npx cap sync android
   - Limpar Android Studio: File → Invalidate Caches / Restart

❌ PROBLEMA: "Erro de permissão ao iniciar"
✅ SOLUÇÃO:
   - App pede permissão na primeira execução - TAP "PERMITIR"
   - Se não pediu, Settings → Apps → RunCadence → Permissions → Location → Permitir

❌ PROBLEMA: "Mapa branco/vazio"
✅ SOLUÇÃO:
   - Verificar internet (Leaflet carrega tiles do OpenStreetMap)
   - Esperar 5 segundos após ligar GPS
   - GPS precisa ter sinal (outdoor é melhor)

❌ PROBLEMA: "GPS não aparece / fica 0.00 km"
✅ SOLUÇÃO:
   - Emulador: Settings → Location → ligar GPS
   - Dispositivo real: Settings → Location → ligar GPS
   - Sair de dentro de casa (sinal fraco)
   - Esperar 30 segundos para GPS lock

❌ PROBLEMA: "Distância salta de repente"
✅ SOLUÇÃO:
   - Normal em GPS (erro de posicionamento)
   - Haversine filtra outliers
   - Melhora ao se mover continuamente

❌ PROBLEMA: "App mata em background"
✅ SOLUÇÃO:
   - Verificar se AndroidManifest.xml tem service RunningService
   - Foreground Service deve estar ativo
   - Notificação deve estar visível

═══════════════════════════════════════════════════════════════════════════════
# RESUMO FINAL
═══════════════════════════════════════════════════════════════════════════════

Se TODAS as caixas acima estão marcadas ✅, seu app está 100% pronto.

Tempo total: ~20-30 minutos de implementação

Resultado: App de corrida profissional com:
✅ GPS em tempo real (lat/lng preciso)
✅ Rota visível no mapa
✅ Cálculo de distância via Haversine
✅ Funciona em background 24h
✅ Integrado com seu motor de música
✅ UI belíssima

Pronto para produção.

═══════════════════════════════════════════════════════════════════════════════
