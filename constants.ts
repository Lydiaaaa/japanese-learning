
import { Category, TargetLanguage } from './types';

export const TARGET_LANGUAGES: { code: TargetLanguage; name: string; flag: string }[] = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

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
        'Eating at a Family Restaurant',
        'Ordering at a Bar/Izakaya',
        'Buying a Bento at a Convenience Store',
        'Asking for separate checks',
        'Ordering custom toppings at a Cafe',
        'Using a ticket machine at a Noodle shop',
        'Reserving a table by phone',
        'Asking about food allergies',
        'Ordering food delivery',
        'Complaining about a wrong order',
        'Buying street food',
        'All-you-can-eat course'
      ],
      zh: [
        '在家庭餐厅就餐',
        '在居酒屋/酒吧点菜',
        '在便利店买便当',
        '结账时要求AA制',
        '在咖啡店定制口味点单',
        '在面馆使用自动售票机',
        '打电话预订餐厅座位',
        '询问食物过敏源',
        '叫外卖',
        '投诉上错菜了',
        '买路边摊小吃',
        '吃自助餐'
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
        'Check-in at the Airport',
        'Buying a train/subway ticket',
        'Asking for directions to the station',
        'Taking a taxi to the hotel',
        'Reporting lost baggage',
        'Recharging a transport card',
        'Checking out of a hotel',
        'Asking a passerby to take a photo',
        'Renting a car',
        'Asking about bus schedule',
        'Booking a hostel',
        'Storing luggage in a locker'
      ],
      zh: [
        '在机场办理登机',
        '购买地铁/火车票',
        '询问去车站的路',
        '打车去酒店',
        '报告行李丢失',
        '给交通卡充值',
        '办理退房手续',
        '请路人帮忙拍照',
        '办理租车手续',
        '询问巴士时刻表',
        '预订青年旅舍',
        '使用储物柜寄存行李'
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
        'Setting up a bank account',
        'Registering address at City Hall',
        'Getting a haircut',
        'Sending a package at the Post Office',
        'Reporting a lost item to Police',
        'Sorting garbage correctly',
        'Visiting a clinic for a cold',
        'Signing up for a gym membership',
        'Buying tickets at a kiosk',
        'Looking for an apartment',
        'Calling a plumber for a leak',
        'Renewing a visa'
      ],
      zh: [
        '开设银行账户',
        '在市政厅登记住址',
        '去理发店剪头发',
        '去邮局寄包裹',
        '向警察挂失物品',
        '正确进行垃圾分类',
        '感冒了去诊所看病',
        '办理健身房会员',
        '在自助机买票',
        '在中介找房子',
        '水管漏水叫修理工',
        '去移民局更新签证'
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
        'Business card exchange',
        'Rescheduling a meeting',
        'Apologizing for a mistake',
        'Inviting a colleague to lunch',
        'Asking how to use the printer',
        'Making a presentation',
        'Attending a work party',
        'Part-time job interview',
        'Asking for a deadline extension'
      ],
      zh: [
        '入职第一天自我介绍',
        '向教授请教问题',
        '打电话请病假',
        '交换名片',
        '重新安排会议时间',
        '为工作失误道歉',
        '邀请同事一起吃午饭',
        '询问打印机怎么用',
        '做PPT演示汇报',
        '参加职场聚餐',
        '兼职打工面试',
        '申请延长截止日期'
      ]
    }
  }
];

export const UI_TEXT = {
  zh: {
    // 首页大标题前缀: "我想要学习 [语言]"
    homeTitlePrefix: '我想要学习',
    // 首页中间的副标题 (Position 2)
    subtitle: '选择一个具体的生活场景，掌握地道的外语表达。',
    // 顶部导航栏的 APP 名称
    navTitle: 'Saynario',
    
    learnLabel: '我想学习...', // Keep for fallback logic
    customLabel: '您想去哪里？',
    customPlaceholder: '例如：在派出所挂失...',
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
    kana: '拼写/注音',
    romaji: '罗马音/音标',
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
    
    // Dialogue specific
    scene: '场景',
    writingScene: '正在编写场景...',
    writingDesc: 'AI 正在根据上下文创作地道的对话内容...',
    contentUnavailable: '内容生成中断',
    incompleteResponse: '该场景的对话未能完整生成。',
    retrySection: '重新生成此段落'
  },
  en: {
    // Home Page Title Prefix: "I want to learn [Language]"
    homeTitlePrefix: 'I want to learn',
    // Home Page Subtitle (Position 2)
    subtitle: 'Select a real-life scenario, master authentic foreign expressions.',
    // Navbar App Name
    navTitle: 'Saynario',

    learnLabel: 'I want to learn...',
    customLabel: 'Where do you want to go today?',
    customPlaceholder: 'e.g., Returning a lost item at the police station...',
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
    kana: 'Script/Kana',
    romaji: 'Romaji/IPA',
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

    // Dialogue specific
    scene: 'Scene',
    writingScene: 'Writing Scene...',
    writingDesc: 'The AI is composing a realistic dialogue for this specific part...',
    contentUnavailable: 'Content Unavailable',
    incompleteResponse: 'The AI response for this section was incomplete.',
    retrySection: 'Retry This Section'
  }
};
