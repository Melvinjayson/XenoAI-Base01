import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";

// Languages supported by the application
export type SupportedLanguage = "en" | "es" | "fr" | "de" | "zh" | "ja" | "ko" | "ru" | "ar";

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  translate: (key: string) => string;
  isRtl: boolean;
}

// Default translations for English
const translations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    "app.name": "Xeno AI",
    "app.description": "Intelligent AI assistant with knowledge graph capabilities",
    "splash.loading": "Loading intelligent search...",
    "splash.ready": "Ready!",
    "button.continue": "Continue",
    "button.next": "Next",
    "button.back": "Back",
    "button.finish": "Finish",
    "greeting": "Hi there! I'm Xeno AI, your personal AI assistant.",
    "search.placeholder": "Ask me anything...",
    "search.button": "Search",
    "voice.button": "Speak",
    "listening": "Listening...",
    "processing": "Processing...",
    "settings.language": "Language",
    "settings.voice": "Voice",
    "settings.theme": "Theme",
    "onboarding.welcome": "Welcome to Xeno AI",
    "onboarding.step1": "Ask questions in natural language",
    "onboarding.step2": "Visualize connected knowledge",
    "onboarding.step3": "Use voice commands for hands-free interaction",
    "onboarding.step4": "Personalize your experience",
    "knowledge.graph": "Knowledge Graph",
    "knowledge.insights": "Insights",
    // Add more translations as needed
  },
  es: {
    "app.name": "Xeno AI",
    "app.description": "Asistente de IA inteligente con capacidades de gráfico de conocimiento",
    "splash.loading": "Cargando búsqueda inteligente...",
    "splash.ready": "¡Listo!",
    "button.continue": "Continuar",
    "button.next": "Siguiente",
    "button.back": "Atrás",
    "button.finish": "Finalizar",
    "greeting": "¡Hola! Soy Xeno AI, tu asistente personal de IA.",
    "search.placeholder": "Pregúntame lo que quieras...",
    "search.button": "Buscar",
    "voice.button": "Hablar",
    "listening": "Escuchando...",
    "processing": "Procesando...",
    "settings.language": "Idioma",
    "settings.voice": "Voz",
    "settings.theme": "Tema",
    "onboarding.welcome": "Bienvenido a Xeno AI",
    "onboarding.step1": "Haz preguntas en lenguaje natural",
    "onboarding.step2": "Visualiza conocimiento conectado",
    "onboarding.step3": "Usa comandos de voz para interacción manos libres",
    "onboarding.step4": "Personaliza tu experiencia",
    "knowledge.graph": "Gráfico de Conocimiento",
    "knowledge.insights": "Perspectivas",
    // Add more translations as needed
  },
  fr: {
    "app.name": "Xeno AI",
    "app.description": "Assistant IA intelligent avec capacités de graphe de connaissances",
    "splash.loading": "Chargement de la recherche intelligente...",
    "splash.ready": "Prêt !",
    "button.continue": "Continuer",
    "button.next": "Suivant",
    "button.back": "Retour",
    "button.finish": "Terminer",
    "greeting": "Bonjour ! Je suis Xeno AI, votre assistant personnel IA.",
    "search.placeholder": "Demandez-moi n'importe quoi...",
    "search.button": "Rechercher",
    "voice.button": "Parler",
    "listening": "Écoute...",
    "processing": "Traitement...",
    "settings.language": "Langue",
    "settings.voice": "Voix",
    "settings.theme": "Thème",
    "onboarding.welcome": "Bienvenue sur Xeno AI",
    "onboarding.step1": "Posez des questions en langage naturel",
    "onboarding.step2": "Visualisez les connaissances connectées",
    "onboarding.step3": "Utilisez des commandes vocales pour interagir sans les mains",
    "onboarding.step4": "Personnalisez votre expérience",
    "knowledge.graph": "Graphe de Connaissances",
    "knowledge.insights": "Aperçus",
    // Add more translations as needed
  },
  de: {
    "app.name": "Xeno AI",
    "app.description": "Intelligenter KI-Assistent mit Wissensgrafikfunktionen",
    "splash.loading": "Intelligente Suche wird geladen...",
    "splash.ready": "Bereit!",
    "button.continue": "Weiter",
    "button.next": "Weiter",
    "button.back": "Zurück",
    "button.finish": "Fertig",
    "greeting": "Hallo! Ich bin Xeno AI, dein persönlicher KI-Assistent.",
    "search.placeholder": "Frag mich etwas...",
    "search.button": "Suchen",
    "voice.button": "Sprechen",
    "listening": "Höre zu...",
    "processing": "Verarbeitung...",
    "settings.language": "Sprache",
    "settings.voice": "Stimme",
    "settings.theme": "Thema",
    "onboarding.welcome": "Willkommen bei Xeno AI",
    "onboarding.step1": "Stellen Sie Fragen in natürlicher Sprache",
    "onboarding.step2": "Visualisieren Sie verbundenes Wissen",
    "onboarding.step3": "Verwenden Sie Sprachbefehle für freihändige Interaktion",
    "onboarding.step4": "Personalisieren Sie Ihre Erfahrung",
    "knowledge.graph": "Wissensgrafik",
    "knowledge.insights": "Erkenntnisse",
    // Add more translations as needed
  },
  zh: {
    "app.name": "Xeno AI",
    "app.description": "具有知识图谱功能的智能AI助手",
    "splash.loading": "正在加载智能搜索...",
    "splash.ready": "准备就绪！",
    "button.continue": "继续",
    "button.next": "下一步",
    "button.back": "返回",
    "button.finish": "完成",
    "greeting": "你好！我是Xeno AI，你的个人AI助手。",
    "search.placeholder": "问我任何问题...",
    "search.button": "搜索",
    "voice.button": "语音",
    "listening": "正在聆听...",
    "processing": "处理中...",
    "settings.language": "语言",
    "settings.voice": "语音",
    "settings.theme": "主题",
    "onboarding.welcome": "欢迎使用Xeno AI",
    "onboarding.step1": "用自然语言提问",
    "onboarding.step2": "可视化关联知识",
    "onboarding.step3": "使用语音命令进行免提交互",
    "onboarding.step4": "个性化您的体验",
    "knowledge.graph": "知识图谱",
    "knowledge.insights": "洞察",
    // Add more translations as needed
  },
  ja: {
    "app.name": "Xeno AI",
    "app.description": "知識グラフ機能を備えたインテリジェントAIアシスタント",
    "splash.loading": "インテリジェント検索を読み込み中...",
    "splash.ready": "準備完了！",
    "button.continue": "続ける",
    "button.next": "次へ",
    "button.back": "戻る",
    "button.finish": "完了",
    "greeting": "こんにちは！私はXeno AI、あなたの個人AIアシスタントです。",
    "search.placeholder": "何でも質問してください...",
    "search.button": "検索",
    "voice.button": "話す",
    "listening": "聴いています...",
    "processing": "処理中...",
    "settings.language": "言語",
    "settings.voice": "音声",
    "settings.theme": "テーマ",
    "onboarding.welcome": "Xeno AIへようこそ",
    "onboarding.step1": "自然言語で質問する",
    "onboarding.step2": "つながった知識を視覚化する",
    "onboarding.step3": "ハンズフリー操作に音声コマンドを使用する",
    "onboarding.step4": "エクスペリエンスをカスタマイズする",
    "knowledge.graph": "知識グラフ",
    "knowledge.insights": "インサイト",
    // Add more translations as needed
  },
  ko: {
    "app.name": "Xeno AI",
    "app.description": "지식 그래프 기능을 갖춘 지능형 AI 어시스턴트",
    "splash.loading": "지능형 검색 로딩 중...",
    "splash.ready": "준비 완료!",
    "button.continue": "계속",
    "button.next": "다음",
    "button.back": "이전",
    "button.finish": "완료",
    "greeting": "안녕하세요! 저는 Xeno AI, 당신의 개인 AI 어시스턴트입니다.",
    "search.placeholder": "무엇이든 물어보세요...",
    "search.button": "검색",
    "voice.button": "말하기",
    "listening": "듣는 중...",
    "processing": "처리 중...",
    "settings.language": "언어",
    "settings.voice": "음성",
    "settings.theme": "테마",
    "onboarding.welcome": "Xeno AI에 오신 것을 환영합니다",
    "onboarding.step1": "자연어로 질문하기",
    "onboarding.step2": "연결된 지식 시각화하기",
    "onboarding.step3": "핸즈프리 상호작용을 위한 음성 명령 사용하기",
    "onboarding.step4": "경험 맞춤화하기",
    "knowledge.graph": "지식 그래프",
    "knowledge.insights": "인사이트",
    // Add more translations as needed
  },
  ru: {
    "app.name": "Xeno AI",
    "app.description": "Интеллектуальный ИИ-помощник с возможностями графа знаний",
    "splash.loading": "Загрузка интеллектуального поиска...",
    "splash.ready": "Готово!",
    "button.continue": "Продолжить",
    "button.next": "Далее",
    "button.back": "Назад",
    "button.finish": "Завершить",
    "greeting": "Привет! Я Xeno AI, ваш личный ИИ-помощник.",
    "search.placeholder": "Спросите меня о чем угодно...",
    "search.button": "Поиск",
    "voice.button": "Говорить",
    "listening": "Слушаю...",
    "processing": "Обработка...",
    "settings.language": "Язык",
    "settings.voice": "Голос",
    "settings.theme": "Тема",
    "onboarding.welcome": "Добро пожаловать в Xeno AI",
    "onboarding.step1": "Задавайте вопросы на естественном языке",
    "onboarding.step2": "Визуализируйте связанные знания",
    "onboarding.step3": "Используйте голосовые команды для взаимодействия без рук",
    "onboarding.step4": "Персонализируйте свой опыт",
    "knowledge.graph": "Граф Знаний",
    "knowledge.insights": "Аналитика",
    // Add more translations as needed
  },
  ar: {
    "app.name": "زينو للذكاء الاصطناعي",
    "app.description": "مساعد ذكاء اصطناعي ذكي مع قدرات رسم بياني للمعرفة",
    "splash.loading": "جاري تحميل البحث الذكي...",
    "splash.ready": "جاهز!",
    "button.continue": "استمرار",
    "button.next": "التالي",
    "button.back": "رجوع",
    "button.finish": "إنهاء",
    "greeting": "مرحباً! أنا زينو للذكاء الاصطناعي، مساعدك الشخصي.",
    "search.placeholder": "اسألني أي شيء...",
    "search.button": "بحث",
    "voice.button": "تحدث",
    "listening": "جاري الاستماع...",
    "processing": "جاري المعالجة...",
    "settings.language": "اللغة",
    "settings.voice": "الصوت",
    "settings.theme": "السمة",
    "onboarding.welcome": "مرحباً بك في زينو للذكاء الاصطناعي",
    "onboarding.step1": "اطرح أسئلة بلغة طبيعية",
    "onboarding.step2": "تصور المعرفة المترابطة",
    "onboarding.step3": "استخدم الأوامر الصوتية للتفاعل بدون استخدام اليدين",
    "onboarding.step4": "خصص تجربتك",
    "knowledge.graph": "الرسم البياني للمعرفة",
    "knowledge.insights": "الرؤى",
    // Add more translations as needed
  }
};

// Language names in their native language
export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
  ar: "العربية"
};

// Right-to-left languages
const rtlLanguages: SupportedLanguage[] = ["ar"];

// Create context
const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  translate: () => "",
  isRtl: false
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageStorage] = useLocalStorage<SupportedLanguage>("xeno-language", "en");
  const [isRtl, setIsRtl] = useState(rtlLanguages.includes(language));

  // Detect browser language on first load
  useEffect(() => {
    if (!language) {
      const browserLang = navigator.language.split("-")[0] as SupportedLanguage;
      
      // Check if browser language is supported, default to English if not
      if (Object.keys(translations).includes(browserLang)) {
        setLanguageStorage(browserLang);
      } else {
        setLanguageStorage("en");
      }
    }
  }, []);

  // Update RTL status when language changes
  useEffect(() => {
    setIsRtl(rtlLanguages.includes(language));
    
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    
    // Set lang attribute for accessibility
    document.documentElement.lang = language;
  }, [language, isRtl]);

  // Translation function
  const translate = (key: string): string => {
    if (!language) return key;
    
    const langTranslations = translations[language];
    return langTranslations[key] || translations.en[key] || key;
  };

  // Set language and update storage
  const setLanguage = (newLanguage: SupportedLanguage) => {
    setLanguageStorage(newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook for accessing language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}