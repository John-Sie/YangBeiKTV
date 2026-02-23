# 潤泰央北 KTV 智慧點歌系統

這是一個基於 React (Vite) 和 TypeScript 構建的智慧 KTV 點歌系統。本系統採用現代化前端技術與美觀的 UI (使用 Tailwind CSS 及 Lucide-React)，並結合 Supabase 作為後端即時資料庫與身份驗證中心，提供使用者在任何設備上都能體驗流暢的點歌服務。

## 🌟 核心功能

- **⚡ 快速點歌大廳**：支援動態搜尋（支援歌名、歌手名稱、歌曲編號），即刻找到您想唱的歌。
- **🌐 多元語系與分類過濾**：提供國語、台語、客語、英語、粵語、日語過濾，以及精確的歌曲字數過濾。
- **🎤 歌手詳細分類**：快速透過男歌手、女歌手、團體等標籤找到喜愛的歌手及其熱門作品。
- **📈 點歌排行榜與列表**：隨時掌握 KTV 最熱門排行，並可檢視目前的等候點歌佇列。
- **🔒 個人化帳戶與登入**：支援會員系統 (Supabase Authentication)，登入後可管理個人資料或參與互動。
- **🌓 系統顯示配置**：支援一鍵切換深色/淺色模式，適應不同派對場景的環境需求。
- **📝 使用者意見回饋**：內建意見回饋機制，方便後續收集使用者體驗。

## 🛠 系統架構與技術棧

- **前端框架**: React 19 (Hooks, Context) + Vite 建立。
- **型別系統**: TypeScript 提供嚴謹的靜態型別開發。
- **樣式設計**: Tailwind CSS 結合自定義樣式 (`index.css`)。
- **圖示庫**: `lucide-react`。
- **後端與資料庫**: Supabase 即時資料庫 (PostgreSQL) 與整合 API。

## 🚀 快速開始

### 1. 安裝依賴

進入專案目錄後，使用 npm 安裝套件：

```bash
npm install
```

### 2. 啟動開發伺服器

執行以下指令以啟動 Vite 測試伺服器：

```bash
npm run dev
```
啟動後，請在瀏覽器中開啟 `http://localhost:3000` 即可預覽應用程式。

### 3. 編譯與部署

若要進行產品環境發佈 (Production Build)：

```bash
npm run build
```
您可以利用產生的 `dist` 資料夾部署至任何靜態託管平台 (如 Vercel, Netlify, Github Pages)。

## 📁 專案結構簡介

主要應用程式邏輯與組件存放於以下結構中：
- `/pages`: 包含所有單獨的頁面，如 `Songs.tsx`(點歌)、`Singers.tsx`(歌手分類)、`Queue.tsx`(點歌列表)、`Rankings.tsx`(排行榜)、`Admin.tsx`(後台管理)等。
- `/components`: 共用的 React 視覺元件（如 `Layout`, `Toast`, 等）。
- `/services`: 管理與外部系統（包含 Supabase 或其他 API）的連線服務區。
- `/server` & `/db_setup.sql`: 資料庫設定建議檔或後端伺服器相關程式碼。

## 🤝 貢獻指南

若您有任何建議希望能讓這套系統更好，歡迎隨時透過提 Issue 或提交 Pull Request 與我們互動。

享受歡唱時光吧！ 🎉
