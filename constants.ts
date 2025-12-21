
import { Category, LearningLanguage } from './types';

export interface LanguageConfig {
  id: LearningLanguage;
  name: { zh: string, en: string };
  flag: string;
  theme: string; // Hex color (600)
  themeLight: string; // Hex color (50)
  themeDark: string; // Hex color (700)
  code: string; // BCP-47
}

export const LEARNING_LANGUAGES: LanguageConfig[] = [
  { 
    id: 'ja', 
    name: { zh: '日语', en: 'Japanese' }, 
    flag: '🇯🇵', 
    theme: '#1996de', 
    themeLight: '#f0f9ff',
    themeDark: '#0284c7',
    code: 'ja-JP' 
  },
  { 
    id: 'en', 
    name: { zh: '英语', en: 'English' }, 
    flag: '🇺🇸', 
    theme: '#4f46e5', 
    themeLight: '#eef2ff',
    themeDark: '#4338ca',
    code: 'en-US' 
  },
  { 
    id: 'zh', 
    name: { zh: '中文', en: 'Chinese' }, 
    flag: '🇨🇳', 
    theme: '#dc2626', 
    themeLight: '#fef2f2',
    themeDark: '#b91c1c',
    code: 'zh-CN' 
  },
  { 
    id: 'fr', 
    name: { zh: '法语', en: 'French' }, 
    flag: '🇫🇷', 
    theme: '#0891b2', 
    themeLight: '#ecfeff',
    themeDark: '#0e7490',
    code: 'fr-FR' 
  },
  { 
    id: 'es', 
    name: { zh: '西语', en: 'Spanish' }, 
    flag: '🇪🇸', 
    theme: '#ea580c', 
    themeLight: '#fff7ed',
    themeDark: '#c2410c',
    code: 'es-ES' 
  },
  { 
    id: 'de', 
    name: { zh: '德语', en: 'German' }, 
    flag: '🇩🇪', 
    theme: '#b45309', 
    themeLight: '#fffbeb',
    themeDark: '#92400e',
    code: 'de-DE' 
  },
];

export const CATEGORIES: Category[] = [
  {
    id: 'dining',
    name: { en: 'Dining & Food', zh: '餐饮美食' },
    icon: 'Utensils',
    presets: {
      en: [
        'Eating at a local restaurant',
        'Ordering at a bar/pub',
        'Buying groceries at the market',
        'Asking for the bill',
        'Ordering a custom coffee at a cafe',
        'Using a self-service kiosk',
        'Making a dinner reservation',
        'Asking about ingredients',
        'Ordering delivery on an app',
        'Complaining about a wrong order',
        'Buying street food',
        'Attending a food tasting event'
      ],
      zh: [
        '在当地餐厅就餐',
        '在酒吧/酒馆点餐',
        '在超市买菜',
        '结账并要求发票',
        '在咖啡店定制口味',
        '使用自助点餐机',
        '打电话预订座位',
        '询问食物成分',
        '在APP上点外卖',
        '投诉上错菜了',
        '在路边摊买小吃',
        '参加美食品鉴活动'
      ]
    }
  },
  {
    id: 'travel',
    name: { en: 'Travel & Transport', zh: '旅行交通' },
    icon: 'Plane',
    presets: {
      en: [
        'Check-in at the airport',
        'Buying a train ticket',
        'Asking for directions',
        'Taking a taxi to the hotel',
        'Reporting lost baggage',
        'Using public transport card',
        'Checking out of a hotel',
        'Asking someone to take a photo',
        'Renting a car',
        'Asking about the schedule',
        'Booking a hostel',
        'Using a storage locker'
      ],
      zh: [
        '在机场办理登机',
        '购买火车票',
        '询问路怎么走',
        '打车去酒店',
        '报告行李丢失',
        '使用交通卡',
        '办理退房手续',
        '请路人帮忙拍照',
        '办理租车',
        '询问班次时刻表',
        '预订青年旅馆',
        '使用储物柜'
      ]
    }
  },
  {
    id: 'lifestyle',
    name: { en: 'Daily Life & Services', zh: '日常生活' },
    icon: 'Building',
    presets: {
      en: [
        'Opening a bank account',
        'Registering at the city office',
        'Getting a haircut',
        'Sending a package at the post office',
        'Reporting lost keys to police',
        'Learning about local recycling',
        'Visiting a doctor for a checkup',
        'Signing up for the gym',
        'Buying tickets for a show',
        'Visiting a real estate agent',
        'Calling for home repair',
        'Applying for a library card'
      ],
      zh: [
        '去银行开户',
        '在市政大厅登记',
        '去理发店剪发',
        '去邮局寄包裹',
        '去警察局报失',
        '学习当地垃圾分类',
        '去看医生检查身体',
        '办理健身房会员',
        '购买演出门票',
        '去中介看房子',
        '呼叫家庭维修',
        '申请办理借书证'
      ]
    }
  },
  {
    id: 'work_school',
    name: { en: 'Work & School', zh: '职场校园' },
    icon: 'Briefcase',
    presets: {
      en: [
        'Introducing yourself to a team',
        'Asking a professor for help',
        'Calling in sick',
        'Exchanging contact info',
        'Rescheduling a meeting',
        'Apologizing for a late task',
        'Inviting a colleague for lunch',
        'Asking how to use equipment',
        'Making a short presentation',
        'Attending a company social',
        'Job interview conversation',
        'Asking for a deadline extension'
      ],
      zh: [
        '向团队做自我介绍',
        '向教授请教问题',
        '打电话请病假',
        '交换联系方式',
        '改约会议时间',
        '为延误任务道歉',
        '邀请同事吃午餐',
        '询问设备怎么使用',
        '做简短工作演示',
        '参加公司聚会',
        '面试时的对话',
        '申请延长截止日期'
      ]
    }
  }
];

export const UI_TEXT = {
  zh: {
    titlePrefix: '我想练习',
    titleSuffix: '',
    subtitle: '选择一个具体的生活场景，掌握地道的口语表达。',
    navTitle: 'Saynario',
    learning: '学习语言',
    customLabel: '您想去哪里？',
    customPlaceholder: '例如：在市政大厅办理业务...',
    start: '开始',
    vocab: '核心词汇',
    expressions: '常用表达',
    dialogue: '情景对话',
    currentScenario: '当前场景',
    constructing: '正在构建场景...',
    constructingDesc: '正在为您分析语境、筛选词汇并编写对话：',
    loadingSteps: [
      '正在分析场景语境...',
      '正在筛选核心高频词汇...',
      '正在编写地道的表达方式...',
      '正在构建双人情景对话...',
      '正在进行最终校对与翻译...'
    ],
    errorTitle: '出错了',
    errorDesc: '生成内容失败，请检查API Key或重试。',
    goHome: '返回首页',
    tryAgain: '重试',
    back: '返回',
    favorites: '我的收藏',
    noFavorites: '暂无收藏内容',
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
    generatingPDF: '正在生成...',
    shuffle: '换一批',
    notation: '发音显示',
    kana: '拼音/注音',
    romaji: '罗马音',
    downloadAudio: '下载音频',
    generatingAudio: '合成音频中...',
    voiceEngine: '语音引擎',
    engineSystem: '极速',
    engineAi: 'AI音质',
    share: '分享',
    copyLink: '复制链接',
    linkCopied: '链接已复制！',
    creatingLink: '正在创建...',
    loadingShare: '正在加载分享的场景...',
    shareError: '无法加载分享的内容',
    deleteVersion: '删除此版本',
    confirmDeleteVersion: '确定要删除当前版本的内容吗？无法撤销。',
    loadMore: '获取更多',
    loadingMore: '正在获取...',
    maxLoaded: '已全部加载',
    scene: '场景',
    writingScene: '正在编写场景...',
    writingDesc: 'AI 正在根据上下文创作地道的对话内容...',
    contentUnavailable: '内容生成中断',
    incompleteResponse: '该场景的对话未能完整生成。',
    retrySection: '重新生成此段落'
  },
  en: {
    titlePrefix: 'I want to practice',
    titleSuffix: '',
    subtitle: 'Select a real-life scenario to master vocabulary and conversation.',
    navTitle: 'Saynario',
    learning: 'Learning',
    customLabel: 'Where do you want to go today?',
    customPlaceholder: 'e.g., Handling business at the city hall...',
    start: 'Start',
    vocab: 'Vocabulary',
    expressions: 'Expressions',
    dialogue: 'Dialogue',
    currentScenario: 'Current Scenario',
    constructing: 'Constructing Scenario...',
    constructingDesc: 'Analyzing context, selecting vocabulary, and writing dialogues for:',
    loadingSteps: [
      'Analyzing scenario context...',
      'Selecting essential vocabulary...',
      'Curating useful expressions...',
      'Writing realistic dialogues...',
      'Finalizing translations...'
    ],
    errorTitle: 'Oops! Something went wrong.',
    errorDesc: 'Failed to generate content. Please check your API key or try again.',
    goHome: 'Go Home',
    tryAgain: 'Try Again',
    back: 'Back',
    favorites: 'My Favorites',
    noFavorites: 'No favorites yet',
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
    generatingPDF: 'Generating...',
    shuffle: 'Shuffle',
    notation: 'Notation',
    kana: 'Phonetic',
    romaji: 'Romaji',
    downloadAudio: 'Download Audio',
    generatingAudio: 'Generating Audio...',
    voiceEngine: 'Voice Engine',
    engineSystem: 'Fast',
    engineAi: 'AI High-Q',
    share: 'Share',
    copyLink: 'Copy Link',
    linkCopied: 'Link Copied!',
    creatingLink: 'Creating...',
    loadingShare: 'Loading shared scenario...',
    shareError: 'Failed to load shared content',
    deleteVersion: 'Delete Version',
    confirmDeleteVersion: 'Are you sure you want to delete this version? This cannot be undone.',
    loadMore: 'Get More',
    loadingMore: 'Loading...',
    maxLoaded: 'All Loaded',
    scene: 'Scene',
    writingScene: 'Writing Scene...',
    writingDesc: 'The AI is composing a realistic dialogue for this specific part...',
    contentUnavailable: 'Content Unavailable',
    incompleteResponse: 'The AI response for this section was incomplete.',
    retrySection: 'Retry This Section'
  }
};
