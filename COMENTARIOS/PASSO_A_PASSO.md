═══════════════════════════════════════════════════════════════════════════════
🚀 IMPLEMENTAÇÃO DO 30% QUE FALTA - PASSO-A-PASSO
═══════════════════════════════════════════════════════════════════════════════

## 📋 CHECKLIST VISUAL

┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: ARQUIVOS KOTLIN (Plugin Android)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ❌ [ ] 1. RunningPlugin.kt                                                  │
│        Caminho: android/app/src/main/java/com/runcadence/app/               │
│        O quê: Plugin Capacitor que faz a mágica com Fused Location          │
│        Função: Rastreia GPS real, calcula distância Haversine, rota         │
│                                                                              │
│ ❌ [ ] 2. RunningService.kt                                                 │
│        Caminho: android/app/src/main/java/com/runcadence/app/               │
│        O quê: Foreground Service (aquela notificação persistente)           │
│        Função: Permite GPS rodar em background sem Android matar            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 2: ARQUIVOS REACT/TS (Frontend)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ ❌ [ ] 3. useRunningPlugin.ts                                               │
│        Caminho: src/hooks/                                                  │
│        O quê: Hook React que gerencia o plugin Android                      │
│        Função: state, start(), stop(), getRoute()                           │
│                                                                              │
│ ❌ [ ] 4. RunningMap.tsx                                                    │
│        Caminho: src/components/                                             │
│        O quê: Componente com Leaflet (mapa interativo)                      │
│        Função: Mostra rota em tempo real + marker pulsante                  │
│                                                                              │
│ ❌ [ ] 5. Integração no App.tsx                                             │
│        O quê: Imports + hooks + JSX                                         │
│        Função: Conectar tudo e renderizar mapa                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FASE 3: CONFIGURAÇÃO ANDROID                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ❌ [ ] 6. build.gradle (atualizado)                                         │
│        Caminho: android/app/                                                │
│        Adicionar: com.google.android.gms:play-services-location:21.0.1      │
│                                                                              │
│ ❌ [ ] 7. AndroidManifest.xml (permissões)                                  │
│        Adicionar:                                                            │
│        • <uses-permission> (ACCESS_FINE_LOCATION, FOREGROUND_SERVICE)       │
│        • <service> RunningService com foregroundServiceType="location"      │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════

## 🔧 INSTRUÇÕES PASSO-A-PASSO

### PASSO 1: Criar estrutura de pastas
```
android/app/src/main/java/com/runcadence/app/
├── MainActivity.kt (já existe)
├── RunningPlugin.kt ← NOVO
└── RunningService.kt ← NOVO

src/
├── hooks/
│   ├── useGPS.ts (já existe)
│   ├── useCadence.ts (já existe)
│   ├── useMusicEngine.ts (já existe)
│   └── useRunningPlugin.ts ← NOVO
└── components/
    └── RunningMap.tsx ← NOVO
```

### PASSO 2: Copiar arquivos Kotlin
1. Abrir Android Studio
2. android/app/src/main/java/com/runcadence/app/
3. Clicar com botão direito → New → Kotlin Class
4. Nome: RunningPlugin
5. Cola o código de RunningPlugin.kt
6. Repetir para RunningService.kt

### PASSO 3: Copiar useRunningPlugin.ts
1. Criar arquivo: src/hooks/useRunningPlugin.ts
2. Cola todo o código
3. Verificar imports (useState, useEffect, useRef, useCallback)

### PASSO 4: Copiar RunningMap.tsx
1. Criar arquivo: src/components/RunningMap.tsx
2. Cola todo o código
3. Verificar imports (React, useEffect, useRef)

### PASSO 5: Modificar App.tsx
Procurar por:
- `const stepCounter = useStepCounter();`
- Adicionar logo abaixo: `const gpsRunning = useRunningPlugin();`

Procurar por função `handleStart`:
- Adicionar linha: `await gpsRunning.start();`

Procurar por função `handleStop`:
- Adicionar linha: `await gpsRunning.stop();`

Procurar por JSX do hero-card:
- Adicionar após: 
  ```jsx
  <RunningMap
    route={gpsRunning.state.route}
    isTracking={gpsRunning.state.isTracking}
    distance={gpsRunning.state.distance}
  />
  <RouteStats
    distance={gpsRunning.state.distance}
    pointCount={gpsRunning.state.pointCount}
    accuracy={gpsRunning.state.lastPoint?.accuracy || 0}
  />
  ```

### PASSO 6: Atualizar build.gradle
1. Abrir: android/app/build.gradle
2. Procurar por: `dependencies {`
3. Adicionar antes de closing brace:
```gradle
implementation 'com.google.android.gms:play-services-location:21.0.1'
```

### PASSO 7: Atualizar AndroidManifest.xml
1. Abrir: android/app/src/main/AndroidManifest.xml
2. Procurar por: `<manifest xmlns:android=...`
3. Adicionar antes de `<application>`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

4. Dentro de `<application>`, adicionar:
```xml
<service
    android:name="com.runcadence.app.RunningService"
    android:foregroundServiceType="location"
    android:enabled="true"
    android:exported="false" />
```

### PASSO 8: Build e Deploy
```bash
# Terminal - na raiz do projeto
npm run build
npx cap sync android
npx cap open android
```

Depois no Android Studio:
- Build → Build Bundle(s)/APK(s) → Build APK(s)
- Run → Run 'app' (no seu dispositivo/emulador)

═══════════════════════════════════════════════════════════════════════════════

## ✅ VERIFICAÇÃO FINAL

Após tudo pronto, testar:

1. [ ] App abre sem erros
2. [ ] Ao apertar START:
   - [ ] Notificação "RunCadence" aparece no status bar
   - [ ] GPS pill muda para verde "GPS ON"
   - [ ] Mapa aparece (pode estar vazio se não tiver GPS)
3. [ ] Durante corrida:
   - [ ] Pontos aparecem no mapa em tempo real
   - [ ] Distância aumenta continuamente
   - [ ] Markerverde marca última posição
4. [ ] Ao apertar STOP:
   - [ ] Mapa congela
   - [ ] Rota fica visível
   - [ ] Distância final aparece

═══════════════════════════════════════════════════════════════════════════════

## 🐛 TROUBLESHOOTING

❌ "Plugin não existe"
→ Verificar se RunningPlugin.kt está no caminho correto
→ Rodar: npx cap sync android

❌ "Erro de permissão"
→ Verificar AndroidManifest.xml tem todas as permissões
→ App pede permissão ao usuario na primeira execução - aceitar

❌ "Mapa branco/vazio"
→ Verificar Internet disponível
→ Leaflet depende de CDN

❌ "GPS não atualiza"
→ Emulador: Settings → Location → desligar/ligar
→ Dispositivo real: ligar GPS nas configurações

═══════════════════════════════════════════════════════════════════════════════
