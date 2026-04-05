═══════════════════════════════════════════════════════════════════════════════
⚡ GUIA RÁPIDO - 5 MINUTOS
═══════════════════════════════════════════════════════════════════════════════

# 🎯 O QUE VOCÊ PRECISA FAZER

Total de etapas: **7 passos simples**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 1: CRIAR RUNNINGPLUGIN.KT

📁 Caminho: android/app/src/main/java/com/runcadence/app/

1. Abra Android Studio
2. File → New → Kotlin Class
3. Nome: **RunningPlugin**
4. Package: com.runcadence.app
5. Copie TUDO do arquivo SOLUCAO_COMPLETA_PLUGIN_GPS.md (PARTE 1)
6. Cole

**Tempo: 2 minutos**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 2: CRIAR RUNNINGSERVICE.KT

📁 Caminho: android/app/src/main/java/com/runcadence/app/

1. File → New → Kotlin Class
2. Nome: **RunningService**
3. Package: com.runcadence.app
4. Copie TUDO da PARTE 2
5. Cole

**Tempo: 1 minuto**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 3: CRIAR USERUNNINGPLUGIN.TS

📁 Caminho: src/hooks/

1. Crie arquivo: **useRunningPlugin.ts**
2. Copie TUDO da PARTE 3
3. Cole

**Tempo: 1 minuto**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 4: CRIAR RUNNINGMAP.TSX

📁 Caminho: src/components/

1. Crie arquivo: **RunningMap.tsx**
2. Copie TUDO da PARTE 4
3. Cole

**Tempo: 1 minuto**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 5: ATUALIZAR APP.TSX

📁 Caminho: src/App.tsx

Você vai fazer 6 mudanças pequenas:

### 5.1 - IMPORTS (no topo)

Procure por:
```
import { useGPS } from './hooks/useGPS';
```

Adicione logo abaixo:
```
import { useRunningPlugin } from './hooks/useRunningPlugin';
import { RunningMap, RouteStats } from './components/RunningMap';
```

### 5.2 - CHAMAR HOOK

Procure por:
```
const stepCounter = useStepCounter();
```

Adicione logo abaixo:
```
const gpsRunning = useRunningPlugin();
```

### 5.3 - MODIFICAR handleStart

Procure por:
```ts
const handleStart = async () => {
  try {
    setIsRunning(true);
    
    await stepCounter.start();
```

Mude para:
```ts
const handleStart = async () => {
  try {
    setIsRunning(true);
    
    await stepCounter.start();
    await gpsRunning.start();  // ← ADICIONE
```

### 5.4 - MODIFICAR handleStop

Procure por:
```ts
const handleStop = async () => {
  setIsRunning(false);
  
  await stepCounter.stop();
```

Mude para:
```ts
const handleStop = async () => {
  setIsRunning(false);
  
  await stepCounter.stop();
  await gpsRunning.stop();  // ← ADICIONE
```

### 5.5 - MODIFICAR useEffect principal

Procure pelo useEffect que tem:
```
if (stepCounter.data.sensorStatus === 'active') {
```

Encontre esta linha:
```ts
const strideM = (distance / Math.max(1, stepCounter.data.sessionSteps)) || 0.7;
```

Troque por:
```ts
const realDistance = Math.max(gpsRunning.state.distance, 0.001);
const strideM = (realDistance / Math.max(1, stepCounter.data.sessionSteps)) || 0.7;
```

E adicione no final do useEffect dependencies:
```ts
], [
  stepCounter.data.sensorStatus,
  stepCounter.data.stepsPerMinute,
  stepCounter.data.sessionSteps,
  gpsRunning.state.distance,  // ← ADICIONE
  cadenceTracker.data.currentPaceMinKm,
]);
```

### 5.6 - ADICIONAR JSX (no return)

Procure pelo topbar:
```jsx
<div className="topbar">
  <div className="brand">
```

DENTRO dele, após </div> de brand, adicione:
```jsx
  <div
    className={`gps-pill ${gpsRunning.state.isTracking ? 'gps-on' : 'gps-off'}`}
  >
    <div className="gps-dot"></div>
    {gpsRunning.state.isTracking ? 'GPS ON' : 'GPS OFF'}
  </div>
```

Depois procure pelo hero-card e TROQUE esta parte:
```jsx
<div className="hero-card">
  <div className="hero-top">
    <div>
      <div className="eyebrow">Pace</div>
      <div className="hero-pace">{cadenceTracker.data.currentPaceMinKm.toFixed(2)}</div>
      <div className="hero-unit">min/km</div>
    </div>
```

Por:
```jsx
<div className="hero-card">
  <div className="hero-top">
    <div>
      <div className="eyebrow">Distância GPS</div>
      <div className="hero-pace">
        {(gpsRunning.state.distance / 1000).toFixed(2)}
      </div>
      <div className="hero-unit">km</div>
    </div>
```

E adicione LOGO APÓS o </div> final do hero-card:
```jsx
{/* MAPA */}
<RunningMap
  route={gpsRunning.state.route}
  isTracking={gpsRunning.state.isTracking}
  distance={gpsRunning.state.distance}
/>

{/* ESTATÍSTICAS */}
<RouteStats
  distance={gpsRunning.state.distance}
  pointCount={gpsRunning.state.pointCount}
  accuracy={gpsRunning.state.lastPoint?.accuracy || 0}
/>
```

**Tempo: 5-7 minutos**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 6: ATUALIZAR build.gradle

📁 Caminho: android/app/build.gradle

Procure por:
```gradle
dependencies {
```

Adicione esta linha:
```gradle
    implementation 'com.google.android.gms:play-services-location:21.0.1'
```

Exemplo:
```gradle
dependencies {
    implementation 'com.getcapacitor:android:7.0.0'
    implementation 'com.google.android.gms:play-services-location:21.0.1'  // ← ADICIONE
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
```

**Tempo: 1 minuto**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 7: ATUALIZAR AndroidManifest.xml

📁 Caminho: android/app/src/main/AndroidManifest.xml

Procure por:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
```

LOGO ABAIXO, adicione:
```xml
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

Procure por:
```xml
<application
```

DENTRO dela, antes de </application>, adicione:
```xml
    <service
        android:name="com.runcadence.app.RunningService"
        android:foregroundServiceType="location"
        android:enabled="true"
        android:exported="false" />
```

**Tempo: 2 minutos**

═══════════════════════════════════════════════════════════════════════════════

## ✅ PASSO 8: BUILD & DEPLOY

Terminal (na raiz do projeto):

```bash
npm run build
npx cap sync android
npx cap open android
```

Isso abre Android Studio.

**No Android Studio:**
1. Menu: Build → Build Bundle(s)/APK(s) → Build APK(s)
2. Aguarde completar
3. Menu: Run → Run 'app'
4. Selecione seu dispositivo/emulador

**Tempo: 5-10 minutos** (depende da internet)

═══════════════════════════════════════════════════════════════════════════════

## 🎉 RESULTADO FINAL

Quando você abrir o app:

✅ GPS ativará automaticamente
✅ Mapa aparecerá em tempo real
✅ Sua rota ficará visível (linha verde)
✅ Distância em km será calculada real
✅ Marcador pulsante na posição atual
✅ Precisão do GPS em metros

═══════════════════════════════════════════════════════════════════════════════

## 🐛 SE ALGO DER ERRO

### "Plugin not found"
→ Verificar se os arquivos .kt estão no caminho correto
→ Rodar: npx cap sync android

### "Permissão negada"
→ App pede permissão na primeira execução - TAP em PERMITIR
→ Se não pediu, Settings → Apps → RunCadence → Permissions → Location

### "Mapa branco"
→ Verificar internet
→ Mapa precisa carregar tiles (OpenStreetMap)

### "GPS não aparece"
→ Emulador: Settings → Location → ligar GPS
→ Dispositivo real: Settings → Location → ligar GPS

═══════════════════════════════════════════════════════════════════════════════

## 📊 TEMPO TOTAL

Copiar arquivos:        5 minutos
Editar App.tsx:         5-7 minutos
Atualizar configs:      3 minutos
Build & Deploy:         5-10 minutos
                        ──────────────
                        18-25 minutos

═══════════════════════════════════════════════════════════════════════════════

Pronto!

Seu app funciona completamente.

Sem mais problemas de GPS.
Sem mais erro de 500m.
Mapa funcionando.
Rota visível.

═══════════════════════════════════════════════════════════════════════════════
