import { Category, Language } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'dining',
    name: {
      en: 'Dining & Food',
      zh: '餐饮美食'
    },
    icon: 'Utensils',
    presets: {
      en: [
        'Eating at Saizeriya (Family Restaurant)',
        'Ordering at an Izakaya',
        'Buying a Bento at a Konbini',
        'Asking for separate checks'
      ],
      zh: [
        '在萨莉亚就餐（家庭餐厅）',
        '在居酒屋点菜',
        '在便利店买便当',
        '结账时要求AA制'
      ]
    }
  },
  {
    id: 'travel',
    name: {
      en: 'Travel & Transport',
      zh: '旅行交通'
    },
    icon: 'Plane',
    presets: {
      en: [
        'Check-in at Haneda Airport',
        'Buying a Shinkansen ticket',
        'Asking for directions to the station',
        'Taking a taxi to the hotel'
      ],
      zh: [
        '在羽田机场办理登机',
        '购买新干线车票',
        '询问去车站的路',
        '打车去酒店'
      ]
    }
  },
  {
    id: 'lifestyle',
    name: {
      en: 'Daily Life & Services',
      zh: '日常生活'
    },
    icon: 'Building',
    presets: {
      en: [
        'Setting up bank auto-transfer at SMBC',
        'Registering address at City Hall',
        'Getting a haircut',
        'Sending a package at the Post Office'
      ],
      zh: [
        '在三井住友银行办理转账',
        '在市役所登记住址',
        '去理发店剪头发',
        '去邮局寄包裹'
      ]
    }
  },
  {
    id: 'work_school',
    name: {
      en: 'Work & School',
      zh: '职场校园'
    },
    icon: 'Briefcase',
    presets: {
      en: [
        'First day self-introduction',
        'Asking a professor a question',
        'Calling in sick to work',
        'Business card exchange'
      ],
      zh: [
        '入职第一天自我介绍',
        '向教授请教问题',
        '打电话请病假',
        '交换名片'
      ]
    }
  }
];

export const UI_TEXT = {
  zh: {
    title: '日语场景大师',
    subtitle: '选择一个具体的生活场景，掌握地道的日语表达。',
    customLabel: '您想去哪里？',
    customPlaceholder: '例如：在派出所挂失...',
    start: '开始',
    vocab: '核心词汇',
    expressions: '常用表达',
    dialogue: '情景对话',
    currentScenario: '当前场景',
    constructing: '正在构建场景...',
    constructingDesc: '正在为您分析语境、筛选词汇并编写对话：',
    errorTitle: '出错了',
    errorDesc: '生成内容失败，请检查API Key或重试。',
    goHome: '返回首页',
    tryAgain: '重试',
    back: '返回',
    favorites: '我的收藏',
    noFavorites: '暂无收藏内容',
    navTitle: '日语场景大师',
    listen: '试听',
    record: '跟读',
    stop: '停止',
    playMy: '回放',
    speaker: '说话人',
    role: '角色',
    history: '我看过的场景',
    noHistory: '暂无历史记录',
    regenerate: '重新生成',
    versions: '版本',
    latest: '最新',
    delete: '删除',
    version: '版本',
    login: '登录',
    logout: '退出登录',
    syncing: '同步中...',
    guest: '访客',
    download: '下载 PDF',
    generatingPDF: '正在生成...'
  },
  en: {
    title: 'Nihongo Scene Master',
    subtitle: 'Select a real-life scenario to master vocabulary and conversation.',
    customLabel: 'Where do you want to go today?',
    customPlaceholder: 'e.g., Returning a lost item at the police station...',
    start: 'Start',
    vocab: 'Vocabulary',
    expressions: 'Expressions',
    dialogue: 'Dialogue',
    currentScenario: 'Current Scenario',
    constructing: 'Constructing Scenario...',
    constructingDesc: 'Analyzing context, selecting vocabulary, and writing dialogues for:',
    errorTitle: 'Oops! Something went wrong.',
    errorDesc: 'Failed to generate content. Please check your API key or try again.',
    goHome: 'Go Home',
    tryAgain: 'Try Again',
    back: 'Back',
    favorites: 'My Favorites',
    noFavorites: 'No favorites yet',
    navTitle: 'Nihongo Scene Master',
    listen: 'Listen',
    record: 'Shadow',
    stop: 'Stop',
    playMy: 'Play My Recording',
    speaker: 'Speaker',
    role: 'Role',
    history: 'My Scenarios',
    noHistory: 'No history yet',
    regenerate: 'Regenerate',
    versions: 'Versions',
    latest: 'Latest',
    delete: 'Delete',
    version: 'Version',
    login: 'Log In',
    logout: 'Log Out',
    syncing: 'Syncing...',
    guest: 'Guest',
    download: 'Download PDF',
    generatingPDF: 'Generating...'
  }
};