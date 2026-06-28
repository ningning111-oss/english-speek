import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Screen = 'home' | 'intro' | 'practice' | 'review' | 'focus' | 'complete' | 'report';
type Turn = { ai: string; hint: string; answer: string; tip: string };
type SceneId = string;
type Scene = { id: SceneId; day: number; title: string; description: string; introTitle: string; introText: string; art: string; phrases: string[]; groups: { title: string; focus: string; turns: Turn[] }[] };
type AudioContextConstructor = typeof AudioContext;
type WindowWithWebkitAudio = Window & { webkitAudioContext?: AudioContextConstructor };
const TURNS_PER_GROUP = 3;
const TOTAL_TURNS = 9;
const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
const TTS_AUDIO_BASE = assetUrl('/audio/kokoro-82m/af_heart/en-us/24k');

const audioKey = (text: string): string => {
  let hash = 0x811c9dc5;
  for (const char of text.trim()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `tts-${hash.toString(16).padStart(8, '0')}`;
};

const schoolGroups: { title: string; focus: string; turns: Turn[] }[] = [
  {
    title: '和老师打招呼', focus: 'Good morning.',
    turns: [
      { ai: 'Good morning, lemon!', hint: '老师在向你问早。', answer: 'Good morning!', tip: '把 morning 说得连贯就很好。' },
      { ai: 'How are you?', hint: '老师在问你今天怎么样。', answer: "I'm fine, thank you.", tip: 'fine 可以微笑着轻轻说。' },
      { ai: 'Are you happy today?', hint: '老师问你今天开心吗？', answer: 'Yes, I am!', tip: 'Yes 后面停一下更自然。' },
    ],
  },
  {
    title: '介绍自己', focus: 'My name is lemon.',
    turns: [
      { ai: "What's your name?", hint: '老师想知道你的名字。', answer: 'My name is lemon.', tip: 'name 可以稍微拉长一点。' },
      { ai: 'How old are you?', hint: '老师问你几岁。', answer: "I'm seven years old.", tip: 'seven 的第一个音轻轻咬下唇。' },
      { ai: 'Are you a new student?', hint: '你是新同学吗？', answer: 'Yes, I am.', tip: '短句清楚说出来就很棒。' },
    ],
  },
  {
    title: '开启新一天', focus: "I'm fine.",
    turns: [
      { ai: 'How do you feel today?', hint: '老师问你今天感觉如何。', answer: "I'm fine.", tip: '声音响亮一点会更自信。' },
      { ai: 'Do you have your schoolbag?', hint: '你带书包了吗？', answer: 'Yes, I do.', tip: 'do 的尾音不用拖长。' },
      { ai: 'Do you have a pencil?', hint: '你带铅笔了吗？', answer: 'Yes, I do.', tip: '这句你已经越来越熟啦。' },
    ],
  },
];

const scenes: Scene[] = [
  { id: 'school', day: 1, title: '早上到学校', description: '和老师打招呼，还能介绍自己。', introTitle: '见到老师，先说声早上好', introText: '老师会用英语问你几个小问题。想不起来也没关系，我们会一起练。', art: '🏫', phrases: ['Good morning.', "I’m fine.", 'My name is lemon.'], groups: schoolGroups },
  { id: 'stationery', day: 2, title: '课间借文具', description: '礼貌地借铅笔、橡皮和尺子。', introTitle: '需要文具时，礼貌地问同学', introText: '今天练习借用文具。先说 please，用完以后别忘了说 thank you。', art: '✏️', phrases: ['A pencil, please.', 'Here you are.', 'Thank you.'], groups: [
    { title: '借一支铅笔', focus: 'A pencil, please.', turns: [
      { ai: 'What do you need?', hint: '同学在问你需要什么。', answer: 'A pencil, please.', tip: '最后加上 please 更有礼貌。' },
      { ai: 'Do you need a pencil?', hint: '同学问你是否需要铅笔。', answer: 'Yes, please.', tip: '短短两词也能说得很清楚。' },
      { ai: 'Here you are.', hint: '同学把铅笔递给你。', answer: 'Thank you.', tip: '收到东西要记得说谢谢。' },
    ] },
    { title: '借一块橡皮', focus: 'An eraser, please.', turns: [
      { ai: 'What do you need now?', hint: '同学问你现在需要什么。', answer: 'An eraser, please.', tip: 'eraser 前面用 an。' },
      { ai: 'Is this your eraser?', hint: '同学问这是你的橡皮吗。', answer: 'No, it is not.', tip: '慢慢说完整就很好。' },
      { ai: 'You can use mine.', hint: '同学愿意把自己的借给你。', answer: 'Thank you.', tip: '礼貌回应就完成啦。' },
    ] },
    { title: '归还文具', focus: 'Here you are.', turns: [
      { ai: 'Are you finished?', hint: '同学问你用完了吗。', answer: 'Yes, I am.', tip: '清楚回答 yes。' },
      { ai: 'Can I have my pencil?', hint: '同学想拿回铅笔。', answer: 'Here you are.', tip: '递东西时可以这样说。' },
      { ai: 'Thank you, lemon.', hint: '同学在感谢你。', answer: "You're welcome.", tip: '用不客气做礼貌收尾。' },
    ] },
  ] },
  { id: 'lunch', day: 3, title: '快乐午餐时间', description: '说出喜欢的食物，并礼貌表达。', introTitle: '午餐到了，说说你喜欢什么', introText: '今天会聊到苹果、牛奶和午餐。不会说时，可以随时查看中文解释。', art: '🍎', phrases: ['I like apples.', 'Milk, please.', 'Yummy!'], groups: [
    { title: '选择水果', focus: 'I like apples.', turns: [
      { ai: 'Do you like apples?', hint: '老师问你喜欢苹果吗。', answer: 'Yes, I do.', tip: '用开心的语气回答。' },
      { ai: 'What fruit do you like?', hint: '老师问你喜欢什么水果。', answer: 'I like apples.', tip: '把 like 和 apples 连起来。' },
      { ai: 'Here is an apple.', hint: '老师递给你一个苹果。', answer: 'Thank you.', tip: '记得礼貌地说谢谢。' },
    ] },
    { title: '选择饮品', focus: 'Milk, please.', turns: [
      { ai: 'Would you like some milk?', hint: '老师问你想喝牛奶吗。', answer: 'Yes, please.', tip: 'please 让表达更礼貌。' },
      { ai: 'Milk or water?', hint: '老师让你选择牛奶或水。', answer: 'Milk, please.', tip: '说出选择就可以。' },
      { ai: 'Here is your milk.', hint: '老师把牛奶递给你。', answer: 'Thank you.', tip: '收到饮品说谢谢。' },
    ] },
    { title: '分享感受', focus: 'Yummy!', turns: [
      { ai: 'Is your lunch good?', hint: '老师问午餐好吃吗。', answer: 'Yes, it is.', tip: '响亮回答会更自信。' },
      { ai: 'How does it taste?', hint: '老师问味道怎么样。', answer: 'Yummy!', tip: '用开心的表情说出来。' },
      { ai: 'Are you full?', hint: '老师问你吃饱了吗。', answer: 'Yes, I am.', tip: '今天的午餐对话完成啦。' },
    ] },
  ] },
];

type ExtraSceneSeed = { day: number; title: string; description: string; art: string; phrases: [string, string, string]; prompts: [string, string, string] };
const makeExtraScene = (seed: ExtraSceneSeed): Scene => ({
  id: `day-${seed.day}`,
  day: seed.day,
  title: seed.title,
  description: seed.description,
  introTitle: `一起练习「${seed.title}」`,
  introText: `今天会练习 3 个常用表达。听不懂时可以查看中文解释，也可以跳过。`,
  art: seed.art,
  phrases: seed.phrases,
  groups: seed.phrases.map((phrase, index) => ({
    title: `生活表达 ${index + 1}`,
    focus: phrase,
    turns: [
      { ai: seed.prompts[index], hint: `听清问题后，可以回答：${phrase}`, answer: phrase, tip: '先完整说出来，就已经很棒。' },
      { ai: 'Can you say it again?', hint: '对方想请你再说一次。', answer: phrase, tip: '这一次说得更连贯一点。' },
      { ai: 'One more time, please.', hint: '再练最后一次就完成啦。', answer: phrase, tip: '最后一次也勇敢说出来。' },
    ],
  })),
});

scenes.push(...([
  { day: 4, title: '课堂点名', description: '听到名字后，清楚地回应老师。', art: '🙋🏻‍♀️', phrases: ["I'm here.", 'Yes, teacher.', "That's me."], prompts: ['Lemon?', 'Are you here?', 'Who is lemon?'] },
  { day: 5, title: '我的书包', description: '介绍书包和里面的学习用品。', art: '🎒', phrases: ['This is my bag.', 'I have a book.', 'It is yellow.'], prompts: ['Is this your bag?', 'What is in your bag?', 'What color is it?'] },
  { day: 6, title: '我的颜色', description: '说出并选择自己喜欢的颜色。', art: '🎨', phrases: ['I like blue.', 'It is red.', 'Yellow, please.'], prompts: ['What color do you like?', 'What color is it?', 'Which color do you want?'] },
  { day: 7, title: '下课去玩', description: '邀请同学一起玩，并做出回应。', art: '🛝', phrases: ["Let's play!", 'Can I play?', 'Yes, come on!'], prompts: ['What do you want to do?', 'What can you ask your friend?', 'May I play with you?'] },
  { day: 8, title: '操场活动', description: '表达跑、跳和玩球等动作。', art: '⚽️', phrases: ['I can run.', 'I can jump.', "Let's play ball."], prompts: ['What can you do?', 'Can you jump?', 'What shall we play?'] },
  { day: 9, title: '喝水时间', description: '礼貌地请求喝水。', art: '🥤', phrases: ['Water, please.', 'May I drink?', 'Thank you.'], prompts: ['What would you like?', 'What do you want to ask?', 'Here is your water.'] },
  { day: 10, title: '去洗手间', description: '在课堂上礼貌表达需求。', art: '🚻', phrases: ['May I go out?', 'I need the toilet.', 'Thank you, teacher.'], prompts: ['What do you want to ask?', 'What do you need?', 'You may go now.'] },
  { day: 11, title: '天气真好', description: '描述晴天、雨天和冷暖。', art: '☀️', phrases: ["It's sunny.", "It's raining.", "It's cold."], prompts: ["How's the weather?", 'Do you see the rain?', 'How do you feel outside?'] },
  { day: 12, title: '放学回家', description: '和老师同学礼貌告别。', art: '👋', phrases: ['Goodbye!', 'See you tomorrow.', 'Have a nice day.'], prompts: ['School is over. What do you say?', 'When will you meet again?', 'What can you say to your teacher?'] },
  { day: 13, title: '我的家庭', description: '介绍爸爸、妈妈和家人。', art: '👨‍👩‍👧', phrases: ['This is my mom.', 'This is my dad.', 'I love my family.'], prompts: ['Who is she?', 'Who is he?', 'How do you feel about your family?'] },
  { day: 14, title: '我的朋友', description: '介绍朋友并表达友好。', art: '🧒🏻', phrases: ['This is my friend.', 'Her name is Amy.', 'We play together.'], prompts: ['Who is she?', "What's her name?", 'What do you do together?'] },
  { day: 15, title: '生日快乐', description: '送上生日祝福并表达感谢。', art: '🎂', phrases: ['Happy birthday!', 'This is for you.', 'Thank you!'], prompts: ["It's your friend's birthday. What do you say?", 'What do you say when giving a gift?', 'Here is your birthday gift.'] },
  { day: 16, title: '我喜欢苹果', description: '表达喜欢或不喜欢的食物。', art: '🍏', phrases: ['I like apples.', "I don't like pears.", 'Apples are yummy.'], prompts: ['What fruit do you like?', 'Do you like pears?', 'How do apples taste?'] },
  { day: 17, title: '我会唱歌', description: '用英语表达自己会做的事。', art: '🎵', phrases: ['I can sing.', 'I can dance.', 'Listen to me.'], prompts: ['Can you sing?', 'What else can you do?', 'What do you say before singing?'] },
  { day: 18, title: '我不会画画', description: '坦然表达不会，并请求帮助。', art: '🖍️', phrases: ["I can't draw.", 'Can you help me?', "I'll try again."], prompts: ['Can you draw this?', 'What can you ask your friend?', 'Will you try one more time?'] },
  { day: 19, title: '问路到教室', description: '询问教室的位置并听懂方向。', art: '🧭', phrases: ['Where is my class?', 'This way, please.', 'Thank you.'], prompts: ['What do you want to find?', 'How can you show the way?', 'Your classroom is over there.'] },
  { day: 20, title: '今天星期几', description: '询问并回答星期。', art: '📅', phrases: ['What day is it?', "It's Monday.", 'See you on Tuesday.'], prompts: ['What do you want to know?', 'Today is the first school day.', 'When will you meet again?'] },
  { day: 21, title: '现在几点了', description: '询问并表达简单时间。', art: '⏰', phrases: ['What time is it?', "It's eight o'clock.", 'Time for class.'], prompts: ['What do you want to know?', 'The clock says eight.', 'What happens at eight?'] },
  { day: 22, title: '感觉不舒服', description: '告诉老师自己的身体感受。', art: '🤒', phrases: ["I don't feel well.", 'My head hurts.', 'I need help.'], prompts: ['How do you feel?', 'What hurts?', 'What do you need?'] },
  { day: 23, title: '请帮帮我', description: '遇到困难时主动请求帮助。', art: '🆘', phrases: ['Please help me.', "I can't open it.", 'Thank you for helping.'], prompts: ['What can you say when you need help?', 'What is the problem?', 'Your friend helped you. What do you say?'] },
  { day: 24, title: '谢谢和不客气', description: '练习日常礼貌回应。', art: '🤝', phrases: ['Thank you.', "You're welcome.", 'My pleasure.'], prompts: ['Your friend gives you a pencil.', 'Your friend says thank you.', 'How else can you reply?'] },
  { day: 25, title: '对不起，没关系', description: '学会道歉和友好回应。', art: '💛', phrases: ["I'm sorry.", "It's okay.", 'Be careful, please.'], prompts: ['You bump into your friend.', 'Your friend says sorry.', 'What kind reminder can you give?'] },
  { day: 26, title: '早餐时间', description: '选择早餐并表达喜好。', art: '🥛', phrases: ['I want some bread.', 'Milk, please.', 'Breakfast is good.'], prompts: ['What do you want for breakfast?', 'What would you like to drink?', 'How is your breakfast?'] },
  { day: 27, title: '宠物朋友', description: '介绍喜欢的小动物。', art: '🐶', phrases: ['I like dogs.', 'It is cute.', 'Come here, puppy.'], prompts: ['What animal do you like?', 'What do you think of it?', 'What can you say to the puppy?'] },
  { day: 28, title: '公园散步', description: '说出在公园看到的事物。', art: '🌳', phrases: ['I see a tree.', 'Look at the bird.', "Let's take a walk."], prompts: ['What do you see?', 'What do you want your friend to see?', 'What shall we do in the park?'] },
  { day: 29, title: '超市购物', description: '询问物品并礼貌购买。', art: '🛒', phrases: ['I want an apple.', 'How much is it?', 'Here you are.'], prompts: ['What do you want to buy?', 'What do you ask about the price?', 'What do you say when paying?'] },
  { day: 30, title: '小小英语挑战', description: '综合复习问候、介绍和表达。', art: '🏆', phrases: ['Hello, I am lemon.', 'I can speak English.', "Let's be friends!"], prompts: ['Can you introduce yourself?', 'What can you proudly say?', 'What can you say to a new friend?'] },
] as ExtraSceneSeed[]).map(makeExtraScene));

const Icon = ({ name, size = 22 }: { name: 'back' | 'sound' | 'mic' | 'arrow' | 'lock' | 'check' | 'star' | 'slow' | 'home' | 'translate' | 'bulb'; size?: number }) => {
  const paths: Record<string, React.ReactNode> = {
    back: <><path d="m15 18-6-6 6-6"/></>,
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>,
    slow: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    home: <><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    translate: <><path d="M4 5h8M8 3v2M6 5c.5 3 2.2 5.2 5 7M11 5c-.8 3-3.2 6-7 8"/><path d="m14 19 3.5-9 3.5 9M15.3 16h4.4"/></>,
    bulb: <><path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .7-1.5 1.7-1.5 3.5h-4c0-1.8-.5-2.8-1.5-3.5Z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

function SceneIllustration({ scene }: { scene: Scene }) {
  if (scene.id === 'school') return <img className="school-art" src={assetUrl('/assets/lemon-school-hero-v2.png')} alt="小女孩 lemon 早上到学校和老师打招呼" />;
  return <div className={`school-art scene-art scene-art-${scene.id}`} role="img" aria-label={`${scene.title}场景插画`}><span>{scene.art}</span><b>{scene.title}</b><small>{scene.description}</small></div>;
}

const Progress = ({ group, turn = 0, label = true }: { group: number; turn?: number; label?: boolean }) => {
  const pct = Math.min(100, ((group * TURNS_PER_GROUP + turn) / TOTAL_TURNS) * 100);
  return <div className="progress-wrap" aria-label={`今日练习进度 ${Math.round(pct)}%`}>
    {label && <div className="progress-label"><span>今日进度</span><span>{group} / 3 组</span></div>}
    <div className="progress-track"><span style={{ width: `${pct}%` }} /></div>
  </div>;
};

function App() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scenePickerOpen, setScenePickerOpen] = useState(false);
  const selectedScene = scenes[sceneIndex];
  const groups = selectedScene.groups;
  const [screen, setScreen] = useState<Screen>('home');
  const [group, setGroup] = useState(0);
  const [turn, setTurn] = useState(0);
  const [heard, setHeard] = useState(false);
  const [recording, setRecording] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const [micError, setMicError] = useState(false);
  const [micErrorText, setMicErrorText] = useState('请允许浏览器使用麦克风后再试一次。');
  const [voiceResults, setVoiceResults] = useState<boolean[][]>(() => scenes[0].groups.map(item => item.turns.map(() => false)));
  const [help, setHelp] = useState<'none' | 'hint' | 'slow'>('none');
  const [audioNotice, setAudioNotice] = useState('');
  const [manualAudioSrc, setManualAudioSrc] = useState('');
  const [reportHold, setReportHold] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const activeAudio = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const makeAudioSrc = (text: string, slow = false): string => {
    const speedFolder = slow ? 'slow' : 'normal';
    return `${TTS_AUDIO_BASE}/${speedFolder}/${audioKey(text)}.wav`;
  };

  const ensureAudio = (src: string): HTMLAudioElement => {
    const cached = audioCache.current.get(src);
    if (cached) return cached;
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.volume = 1;
    audio.src = src;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('aria-hidden', 'true');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioCache.current.set(src, audio);
    return audio;
  };

  useEffect(() => {
    return () => {
      if (holdTimer.current) window.clearTimeout(holdTimer.current);
      activeAudio.current?.pause();
      audioCache.current.forEach(audio => {
        audio.pause();
        audio.remove();
      });
      audioCache.current.clear();
    };
  }, []);

  useEffect(() => {
    const texts = new Set<string>();
    if (screen === 'home') {
      selectedScene.phrases.forEach(text => texts.add(text));
      texts.add(groups[0]?.turns[0]?.ai);
    } else if (screen === 'intro') {
      texts.add(groups[0]?.turns[0]?.ai);
    } else if (screen === 'practice') {
      const current = groups[group]?.turns[turn];
      texts.add(current?.ai);
      texts.add(current?.answer);
    } else if (screen === 'review' || screen === 'focus') {
      texts.add(groups[group]?.focus);
    } else if (screen === 'complete') {
      groups.forEach(item => texts.add(item.focus));
    }
    texts.forEach(text => {
      if (!text) return;
      ensureAudio(makeAudioSrc(text));
      ensureAudio(makeAudioSrc(text, true));
    });
  }, [group, groups, screen, selectedScene, turn]);

  const stopAudio = (): void => {
    if (!activeAudio.current) return;
    activeAudio.current.pause();
    activeAudio.current.currentTime = 0;
  };

  const playFixedAudio = (text: string, slow = false): void => {
    stopAudio();
    setAudioNotice('');
    setManualAudioSrc('');
    const audioSrc = makeAudioSrc(text, slow);
    const audio = ensureAudio(audioSrc);
    activeAudio.current = audio;
    audio.currentTime = 0;
    audio.onerror = () => setAudioNotice('这句音频文件没有找到，请重新生成 Kokoro 固定音频。');
    audio.onended = () => setAudioNotice('');
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setManualAudioSrc(audioSrc);
        setAudioNotice('浏览器拦截了这次播放，请轻点“重新播放”。');
      });
    }
  };
  const playOnTouch = (event: React.PointerEvent<HTMLButtonElement>, text: string, slow = false): void => {
    event.preventDefault();
    playFixedAudio(text, slow);
  };
  const startPractice = () => { setGroup(0); setTurn(0); setHeard(false); setNoVoice(false); setMicError(false); setVoiceResults(groups.map(item => item.turns.map(() => false))); setHelp('none'); setScreen('intro'); };
  const goHome = () => { stopAudio(); setScreen('home'); };
  const recordVoice = async (trackTurn: boolean) => {
    if (recording || heard) return;
    setNoVoice(false);
    setMicError(false);
    setMicErrorText('请允许浏览器使用麦克风后再试一次。');
    setRecording(true);
    if (trackTurn) setVoiceResults(previous => previous.map((row, rowIndex) => row.map((value, columnIndex) => rowIndex === group && columnIndex === turn ? false : value)));
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    try {
      if (!window.isSecureContext) throw new Error('microphone-insecure-context');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('microphone-unavailable');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioContextClass) throw new Error('audio-context-unavailable');
      audioContext = new AudioContextClass();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const stopAt = performance.now() + 2600;
      let detectedVoice = false;
      while (performance.now() < stopAt) {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        if (Math.sqrt(energy / samples.length) > 0.035) detectedVoice = true;
        await new Promise(resolve => window.setTimeout(resolve, 100));
      }
      setRecording(false);
      setHeard(detectedVoice);
      setNoVoice(!detectedVoice);
      if (detectedVoice && trackTurn) setVoiceResults(previous => previous.map((row, rowIndex) => row.map((value, columnIndex) => rowIndex === group && columnIndex === turn ? true : value)));
    } catch (error) {
      setRecording(false);
      setHeard(false);
      setNoVoice(true);
      setMicError(true);
      const errorName = error instanceof DOMException ? error.name : error instanceof Error ? error.message : '';
      if (errorName === 'microphone-insecure-context') setMicErrorText('手机浏览器要求 HTTPS 才能使用麦克风，请使用我发你的 https 链接打开。');
      else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') setMicErrorText('麦克风权限被拒绝了，请在浏览器地址栏或系统设置里允许麦克风后再试。');
      else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') setMicErrorText('没有检测到可用麦克风，请检查设备麦克风权限或换一个浏览器。');
      else setMicErrorText('麦克风暂时不可用，请确认已允许浏览器使用麦克风后再试。');
    } finally {
      stream?.getTracks().forEach(track => track.stop());
      if (audioContext) await audioContext.close();
    }
  };
  const nextTurn = () => {
    if (turn < TURNS_PER_GROUP - 1) { setTurn(v => v + 1); setHeard(false); setNoVoice(false); setHelp('none'); }
    else { setScreen('review'); setHeard(false); setHelp('none'); }
  };
  const nextGroup = () => {
    if (group < 2) { setGroup(v => v + 1); setTurn(0); setHeard(false); setNoVoice(false); setHelp('none'); setScreen('practice'); }
    else setScreen('complete');
  };
  const holdStart = () => {
    setReportHold(true);
    holdTimer.current = window.setTimeout(() => { setReportHold(false); setScreen('report'); }, 900);
  };
  const holdEnd = () => { setReportHold(false); if (holdTimer.current) window.clearTimeout(holdTimer.current); };
  const spokenCount = voiceResults.flat().filter(Boolean).length;
  const completedGroups = voiceResults.filter(row => row.every(Boolean)).length;
  const completionRate = Math.round((spokenCount / TOTAL_TURNS) * 100);
  const audioToast = audioNotice ? <div className="audio-notice" role="status"><span>{audioNotice}</span>{manualAudioSrc && <button onPointerDown={event => { event.preventDefault(); const audio = ensureAudio(manualAudioSrc); activeAudio.current = audio; audio.currentTime = 0; audio.play().then(() => setAudioNotice('')).catch(() => setAudioNotice('仍然被浏览器拦截，请再轻点一次播放按钮。')); }}><Icon name="sound" size={17}/> 重新播放</button>}</div> : null;

  if (screen === 'home') return <><main className="phone home-screen">
    <div className="topline"><div><p className="eyebrow">小小英语对话官</p><h1>早上好，lemon <span aria-hidden="true">👋</span></h1></div><div className="avatar girl-avatar" aria-label="lemon 的小女孩头像">👧🏻</div></div>
    <section aria-label="今日英语练习"><div className="hero-card">
      <button className="scene-tag scene-picker-trigger" onClick={() => setScenePickerOpen(true)}>今日场景 · Day {selectedScene.day} <span aria-hidden="true">⌄</span></button><h3>{selectedScene.title}</h3><p>{selectedScene.description}</p><SceneIllustration scene={selectedScene} />
      <div className="phrase-row">{selectedScene.phrases.map(x => <button key={x} className="phrase" onPointerDown={event => playOnTouch(event, x)} aria-label={`播放 ${x}`}><span><Icon name="sound" size={17}/></span>{x}</button>)}</div>
      <div className="facts"><div><span aria-hidden="true">◷</span><b>约 5–10 分钟</b></div><i/><div><span className="bars" aria-hidden="true">▂▄▆█</span><b>3 组 · 每组 3 轮</b></div></div>
      <Progress group={0}/>
    </div></section>
    <div className="bottom-actions"><button className="primary" onClick={startPractice}>开始今日练习 <Icon name="arrow"/></button><button className={`parent-entry ${reportHold ? 'holding' : ''}`} onPointerDown={holdStart} onPointerUp={holdEnd} onPointerCancel={holdEnd} onPointerLeave={holdEnd}><Icon name="lock" size={18}/> 家长报告 · 长按进入</button></div>
    {scenePickerOpen && <div className="scene-picker-backdrop" role="presentation" onClick={() => setScenePickerOpen(false)}><section className="scene-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="scene-picker-title" onClick={event => event.stopPropagation()}><div className="scene-picker-heading"><div><small>30 个日常对话场景</small><h2 id="scene-picker-title">选择练习场景</h2></div><button onClick={() => setScenePickerOpen(false)} aria-label="关闭场景选择">✕</button></div><div className="scene-options">{scenes.map((scene, index) => <button key={scene.id} className={index === sceneIndex ? 'selected' : ''} onClick={() => { setSceneIndex(index); setVoiceResults(scene.groups.map(item => item.turns.map(() => false))); setGroup(0); setTurn(0); setHeard(false); setNoVoice(false); setScenePickerOpen(false); }}><span>{scene.art}</span><div><small>Day {scene.day}</small><b>{scene.title}</b><p>{scene.description}</p></div><i>{index === sceneIndex ? '✓' : '›'}</i></button>)}</div></section></div>}
  </main>{audioToast}</>;

  if (screen === 'intro') return <><main className="phone flow-screen">
    <Header title="今天的场景" onBack={goHome}/><Progress group={0} turn={0} label={false}/>
    <div className="intro-art"><span className="sun">☀️</span><SceneIllustration scene={selectedScene} /></div>
    <section className="center-copy"><div className="scene-tag soft">{selectedScene.title}</div><h1>{selectedScene.introTitle}</h1><p>{selectedScene.introText}</p></section>
    <div className="example-card"><span className="mini-avatar">T</span><div><small>先听老师说</small><button onPointerDown={event => playOnTouch(event, groups[0].turns[0].ai)}>{groups[0].turns[0].ai} <Icon name="sound" size={18}/></button></div></div>
    <button className="text-help" onClick={() => setHelp(help === 'hint' ? 'none' : 'hint')}>我还不知道怎么说</button>
    {help === 'hint' && <div className="gentle-note">没关系，等会儿点击“中文解释”，就会看到小提示。</div>}
    <div className="bottom-actions"><button className="primary" onClick={() => { playFixedAudio(groups[0].turns[0].ai); setScreen('practice'); }}>我准备好了 <Icon name="arrow"/></button></div>
  </main>{audioToast}</>;

  if (screen === 'practice') {
    const item = groups[group].turns[turn];
    return <><main className="phone flow-screen practice-screen">
      <Header title={`第 ${group + 1} 组 · ${groups[group].title}`} onBack={() => setScreen(group === 0 ? 'intro' : 'focus')}/><div className="step-row"><span>第 {turn + 1} / 3 轮</span><span>今天第 {group + 1} / 3 组</span></div><Progress group={group} turn={turn} label={false}/>
      <section className="dialogue-area"><div className="teacher-orb">T<span className="online"/></div><div className="ai-bubble"><small>老师问</small><strong>{item.ai}</strong><button className="listen" onPointerDown={event => playOnTouch(event, item.ai)}><Icon name="sound" size={18}/> 再听一遍</button></div></section>
      <section className="speak-area" aria-live="polite"><p>{recording ? '正在听你说…' : heard ? '我听到啦！' : noVoice ? '还没有听到声音' : '轮到你说'}</p><button className={`mic-button ${recording ? 'recording' : ''} ${heard ? 'done' : ''}`} onClick={() => recordVoice(true)} aria-label={heard ? '已经完成录音' : '点击开始说话'}>{heard ? <Icon name="check" size={42}/> : <Icon name="mic" size={42}/>}<span className="pulse"/></button><small>{heard ? item.answer : recording ? '请清楚地说一句英语' : noVoice ? '点击麦克风，再试一次' : '点击后开始说话'}</small></section>
      {heard && <div className="success-note"><span>✨</span><div><b>说出来就是很棒的一步！</b><p>{item.tip}</p></div></div>}
      {noVoice && <div className="no-voice-note"><button className="dismiss-no-voice" onClick={() => { setNoVoice(false); setMicError(false); }} aria-label="关闭麦克风提示">✕</button><div><b>{micError ? '暂时无法使用麦克风' : '这次没有检测到开口声音'}</b><p>{micError ? micErrorText : '本次会在家长报告中标记为未练习，再说一次就可以更新。'}</p></div></div>}
      {!heard && <div className="assist-row"><button onPointerDown={event => { playOnTouch(event, item.ai, true); setHelp('slow'); }}><Icon name="slow" size={24}/><small>慢一点</small></button><button onClick={() => setHelp(help === 'hint' ? 'none' : 'hint')}><Icon name="translate" size={24}/><small>中文解释</small></button><button onPointerDown={event => { playOnTouch(event, item.answer, true); setHelp('hint'); }}><Icon name="bulb" size={24}/><small>我不知道</small></button></div>}
      {help !== 'none' && !heard && <div className="explain-card"><b>{help === 'slow' ? '已经放慢啦，再听一次' : item.hint}</b><span>可以这样回答：{item.answer}</span></div>}
      {!heard && <button className="skip-turn" disabled={recording} onClick={() => { setNoVoice(false); setMicError(false); nextTurn(); }}>这句不想说，跳过这题 <Icon name="arrow" size={18}/></button>}
      {heard && <div className="bottom-actions"><button className="primary" onClick={nextTurn}>{turn === TURNS_PER_GROUP - 1 ? '看看这组表现' : '继续下一轮'} <Icon name="arrow"/></button></div>}
    </main>{audioToast}</>;
  }

  if (screen === 'review') return <><main className="phone flow-screen review-screen">
    <Header title={`第 ${group + 1} 组完成`} onBack={() => { setTurn(TURNS_PER_GROUP - 1); setScreen('practice'); }}/><Progress group={group + 1} turn={0} label={false}/>
    <div className="celebrate"><div className="star-medal"><Icon name="star" size={54}/></div><p>{voiceResults[group].some(Boolean) ? '太棒啦，lemon！' : '已经看完这一组'}</p><h1>{voiceResults[group].some(Boolean) ? `你完成了「${groups[group].title}」` : `「${groups[group].title}」还没有开口`}</h1></div>
    <section className="result-card"><div className="result-heading"><span className={voiceResults[group].every(Boolean) ? 'check-dot' : 'miss-dot'}>{voiceResults[group].every(Boolean) ? <Icon name="check"/> : '✕'}</span><div><small>{voiceResults[group].every(Boolean) ? '今天已经掌握' : `检测到 ${voiceResults[group].filter(Boolean).length} / 3 次开口`}</small><strong>{groups[group].turns[0].answer}</strong></div><button onPointerDown={event => playOnTouch(event, groups[group].turns[0].answer)} aria-label="播放重点句"><Icon name="sound"/></button></div><div className="divider"/><div className="focus-line"><span>再练一下会更棒</span><b>{groups[group].focus}</b><p>只练这一句，轻松说顺就好。</p></div></section>
    <p className="kind-copy">不用每句都完美，敢开口就是进步。</p>
    <div className="bottom-actions"><button className="primary" onClick={() => { playFixedAudio(groups[group].focus, true); setHeard(false); setNoVoice(false); setMicError(false); setHelp('none'); setScreen('focus'); }}>练一下重点句 <Icon name="arrow"/></button></div>
  </main>{audioToast}</>;

  if (screen === 'focus') return <><main className="phone flow-screen focus-screen">
    <Header title="重点复练" onBack={() => setScreen('review')}/><div className="focus-count">只练 1 句</div>
    <section className="focus-card"><span>跟着说</span><h1>{groups[group].focus}</h1><button className="round-sound" onPointerDown={event => playOnTouch(event, groups[group].focus, true)} aria-label="播放重点句"><Icon name="sound" size={28}/></button><p>慢慢说，不着急。</p></section>
    <section className="speak-area" aria-live="polite"><p>{recording ? '正在听你说…' : heard ? '这次更顺啦！' : noVoice ? '还没有听到声音' : '现在试试看'}</p><button className={`mic-button ${recording ? 'recording' : ''} ${heard ? 'done' : ''}`} onClick={() => recordVoice(false)} aria-label={heard ? '重点复练已完成' : '点击开始重点复练'}>{heard ? <Icon name="check" size={42}/> : <Icon name="mic" size={42}/>}<span className="pulse"/></button><small>{heard ? '重点句完成' : noVoice ? '点击麦克风，再试一次' : '点击开始说话'}</small></section>
    {noVoice && <div className="no-voice-note"><button className="dismiss-no-voice" onClick={() => { setNoVoice(false); setMicError(false); }} aria-label="关闭麦克风提示">✕</button><div><b>{micError ? '暂时无法使用麦克风' : '这次没有检测到开口声音'}</b><p>{micError ? micErrorText : '请靠近一点，再清楚地说一次。'}</p></div></div>}
    {!heard && <button className="skip-turn" disabled={recording} onClick={() => { setNoVoice(false); setMicError(false); nextGroup(); }}>{group === 2 ? '暂不复练，完成今日练习' : '暂不复练，进入下一组'} <Icon name="arrow" size={18}/></button>}
    {heard && <div className="success-note"><span>🌟</span><div><b>你认真听，也勇敢说了！</b><p>今天的重点已经记住啦。</p></div></div>}
    {heard && <div className="bottom-actions"><button className="primary" onClick={nextGroup}>{group === 2 ? '完成今日练习' : '进入下一组'} <Icon name="arrow"/></button></div>}
  </main>{audioToast}</>;

  if (screen === 'complete') return <><main className="phone flow-screen complete-screen">
    <div className="confetti" aria-hidden="true">✦　•　★　•　✦</div><div className="completion-icon">🏅</div><p className="eyebrow">今日练习结束</p><h1>{spokenCount > 0 ? '今天的你，勇敢又认真！' : '今天先听到这里'}</h1><p className="subtitle">{spokenCount > 0 ? `${spokenCount} 次开口，每一次都算数。` : '还没有检测到开口，家长报告会如实记录。'}</p>
    <section className="summary-card"><div><strong>{completedGroups}</strong><span>完成组数</span></div><i/><div><strong>{spokenCount}</strong><span>开口次数</span></div><i/><div><strong>{completedGroups}</strong><span>掌握句子</span></div></section>
    <section className="sentence-list"><h2>今天的重点句</h2>{groups.map((item, index) => { const mastered = voiceResults[index].every(Boolean); return <button onPointerDown={event => playOnTouch(event, item.focus)} key={item.focus}><span className={mastered ? 'check-dot' : 'miss-dot'}>{mastered ? <Icon name="check" size={17}/> : '✕'}</span><b>{item.focus}</b><Icon name="sound" size={20}/></button>; })}</section>
    <div className="parent-tip"><Icon name="lock"/><div><b>给家长的小结已经准备好</b><p>回到首页后，长按“家长报告”查看。</p></div></div>
    <div className="bottom-actions"><button className="primary" onClick={goHome}>回到首页 <Icon name="home"/></button></div>
  </main>{audioToast}</>;

  return <><main className="phone flow-screen report-screen">
    <Header title="今日学习报告" onBack={goHome}/><div className="report-date">{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())} · {selectedScene.title}</div>
    <section className={`report-hero ${spokenCount === 0 ? 'report-missed' : ''}`}><div><span>今日完成度</span><strong>{completionRate}%</strong><p>{completedGroups} 组完成 · 检测到 {spokenCount} / 9 次开口</p></div><div className={`ring ${spokenCount < TOTAL_TURNS ? 'ring-missed' : ''}`}>{spokenCount === TOTAL_TURNS ? '✓' : '✕'}</div></section>
    <section className="report-section"><h2>孩子今天的表现</h2><div className="report-grid"><div><span>{spokenCount > 0 ? '🗣️' : '✕'}</span><b>{spokenCount > 0 ? '已经开口' : '未检测到开口'}</b><p>{spokenCount} 次有效声音记录</p></div><div><span>{completedGroups > 0 ? '✓' : '✕'}</span><b>{completedGroups > 0 ? '完成练习' : '本次没有练习'}</b><p>{completedGroups} / 3 组完成</p></div></div></section>
    <section className="report-section"><h2>本次练习记录</h2><div className="practice-status-list">{groups.map((item, index) => { const count = voiceResults[index].filter(Boolean).length; const complete = count === TURNS_PER_GROUP; return <div key={item.title} className={complete ? 'status-complete' : 'status-missed'}><span>{complete ? '✓' : '✕'}</span><div><b>第 {index + 1} 组 · {item.title}</b><p>{complete ? '已完成 3 轮开口练习' : `未完成：检测到 ${count} / 3 次开口`}</p></div></div>; })}</div></section>
    <section className="report-section suggestion"><h2>明天的小建议</h2><p>在合适的生活场景里，用 <b>“{selectedScene.phrases[0]}”</b> 和家人练一次。生活里多用一次，比重复背很多遍更有效。</p></section>
    <p className="privacy">仅在设备本地检测声音强弱，不保存或上传孩子的录音。</p>
  </main>{audioToast}</>;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="nav"><button onClick={onBack} aria-label="返回"><Icon name="back"/></button><strong>{title}</strong><span/></header>;
}

const appWindow = window as typeof window & { __lemonReactRoot?: ReturnType<typeof createRoot> };
const reactRoot = appWindow.__lemonReactRoot ?? createRoot(document.getElementById('root')!);
appWindow.__lemonReactRoot = reactRoot;
reactRoot.render(<React.StrictMode><App /></React.StrictMode>);
