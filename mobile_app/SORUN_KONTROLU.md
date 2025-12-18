# 📱 Mobile App Sorunları - Hızlı Kontrol

## VS Code Problems Panelinde Görmek İçin

1. **View** > **Problems** (veya Ctrl+Shift+M)
2. Sorunları listeleyin

## Muhtemel Sorunlar ve Çözümleri

### 1. ESLint Warnings (Kritik Değil)
```javascript
// Unused variables
const [data, setData] = useState(null);  // 'data' is never used

// Çözüm: Kullanılmayan değişkenleri sil veya ignore et
```

### 2. Import Sıralama
```javascript
// ESLint: Import should be sorted

// Çözüm: Alfabetik sırala veya .eslintrc'de kapat
```

### 3. Missing Dependencies (useEffect)
```javascript
useEffect(() => {
  fetchData();
}, []); // 'fetchData' is missing in dependency array

// Çözüm: useCallback kullan veya dependency ekle
```

### 4. Expo SDK Version Mismatch
```json
// package.json
"expo": "~54.0.0",
"react-native": "0.76.5" // Version uyumsuzluğu

// Çözüm: Compatible versiyonları kullan
```

---

## Otomatik Düzeltme Komutları

### ESLint Auto-fix
```bash
cd mobile_app
npx eslint . --fix
```

### Expo Doctor (Bağımlılık kontrolü)
```bash
cd mobile_app
npx expo-doctor
```

### TypeScript Check (Eğer TS kullanılıyorsa)
```bash
cd mobile_app
npx tsc --noEmit
```

---

## Şu Anda Bilinen Sorunlar

1. ✅ **ApiSettingsScreen.js** - JSX hataları düzeltildi
2. ⚠️ **Gradle config** - Android Studio ile ilgili, kritik değil

---

## Sorunları Görmek İçin

Lütfen VS Code'da **Problems** panelini açın ve buradaki sorunları paylaşın:

```
Ctrl + Shift + M (Windows)
Cmd + Shift + M (Mac)
```

Ya da terminal'de:
```bash
cd mobile_app
npm run lint
```

---

Sorunları görünce hemen düzeltelim! 🚀
