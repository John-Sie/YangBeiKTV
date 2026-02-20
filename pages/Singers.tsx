
import React, { useState, useMemo, useEffect } from 'react';
import { Song, User, SongRequest } from '../types';
import { Mic, User as UserIcon, Users, ChevronRight, Music2, ArrowLeft, Mic2, Guitar, Archive, Disc } from 'lucide-react';
import { Songs } from './Songs';

interface SingersProps {
  songs: Song[];
  user: User | null;
  refreshUserData: () => void;
  onRequest: () => void;
  onAddRequest: (req: SongRequest) => void;
  onBackToCategories?: () => void;
}

type SingerCategory = 'Male' | 'Female' | 'Group' | 'Chorus' | 'Other';

// --- Knowledge Base for Artist Classification ---

// Specific Chorus pairings that lack separators or fall through logic
const KNOWN_CHORUS = new Set([
    '李宗盛鄭怡', '周杰倫袁詠琳', '沈芳如沈建豪', '張學友高慧君', '成龍蘇慧倫', 
    '王力宏盧巧音', '王力宏Selina', '陶喆蔡依林', '吳宗憲溫嵐', '劉德華陳慧琳'
]);

const KNOWN_MALE = new Set([
    // Pop / Mandopop (Verified Males)
    '周杰倫', '陳奕迅', '林俊傑', '王力宏', '陶喆', '李榮浩', '薛之謙', '伍佰', '張學友', '劉德華', 
    '蕭敬騰', '林宥嘉', '周興哲', '盧廣仲', '張宇', '陳零九', '邱鋒澤', '韋禮安', '瘦子', '高爾宣', 
    'ØZI', '張信哲', '費玉清', '任賢齊', '五月天阿信', '光良', '品冠', '羅志祥', '潘瑋柏', '吳青峰', 
    '張震嶽', '李聖傑', '林志炫', '許嵩', '胡夏', '毛不易', '周華健', '庾澄慶', '黃品源', '趙傳', 
    '伍思凱', '張雨生', '王傑', '童安格', '齊秦', '蘇永康', '杜德偉', '李克勤', '古巨基', '謝和弦',
    '炎亞綸', '畢書盡', '鼓鼓', '小宇', '方大同', 'Tank', '范逸臣', '楊宗緯', '蕭煌奇', '荒山亮',
    '陳勢安', '嚴爵', '蔡旻佑', '黃鴻升', '柯有倫', '陳小春', '鄭中基', '黎明', '郭富城', '鍾漢良',
    '熊天平', '巫啟賢', '高明駿', '黃仲昆', '陳昇', '康康', 'NONO', '吳宗憲', '黃立行', 'MC HotDog',
    'Matzka', 'HUSH', 'J.Sheon', 'Leo王', '熊仔', '熱狗', '蛋堡', '頑童',
    '巴大雄', '付玉龍', '祁隆', '吳聽徹', '巫奇', '林奕匡', '派偉俊', '焦靖峰', 
    '山内惠介', '陳雅森', '乱彈阿翔', '倪賓', '陳旭', '李明德',
    
    // Taiwanese / Hokkien (Male)
    '翁立友', '蔡小虎', '羅時豐', '施文彬', '袁小迪', '陳雷', '葉啟田', '沈文程', '洪榮宏', '王識賢',
    '許富凱', '陳隨意', '莊振凱', '江志豐', '蔡義德', '鄔兆邦', '陳百潭', '楊哲', '邵大倫',
    '吳俊宏', '林俊吉', '傅振輝', '高向鵬', '七郎', '阿吉仔', '陳建瑋', '曾瑋中', '郭忠祐', '余天',
    '謝雷', '李茂山', '黃西田', '鄭進一', '陳一郎', '郭金發', '良山', '葉富紀',
    '方順吉', '吳欣達', '王中平', '李明洋', '蔡佳麟',
    
    // Western / International (Male)
    'Ed Sheeran', 'Justin Bieber', 'Bruno Mars', 'Michael Jackson', 'Eminem', 'Charlie Puth', 
    'Shawn Mendes', 'Sam Smith', 'Post Malone', 'Drake', 'The Weeknd', 'Troye Sivan', 'Lauv',
    'Jason Mraz', 'John Mayer', 'Elvis Presley', 'Frank Sinatra', 'Elton John', 'George Michael',
    'Adam Levine', 'Justin Timberlake', 'Usher', 'Chris Brown', 'Ne-Yo', 'Pitbull', 'ZAYN',
    'Harry Styles', 'Niall Horan', 'Liam Payne', 'Louis Tomlinson', 'Robbie Williams',
    'Bob Dylan', 'David Bowie', 'Prince', 'Stevie Wonder', 'Paul McCartney', 'John Lennon'
]);

const KNOWN_FEMALE = new Set([
    // Pop / Mandopop / Asian
    '蔡依林', '張惠妹', '鄧紫棋', '田馥甄', '梁靜茹', '孫燕姿', '王心凌', '楊丞琳', 'A-Lin', '張韶涵', 
    '蔡健雅', '徐佳瑩', '莫文蔚', '劉若英', '戴愛玲', '陳綺貞', '魏如萱', '家家', '李佳薇', '閻奕格', 
    '吳卓源', '陳芳語', '艾怡良', '李玟', '王菲', '林憶蓮', '鄭秀文', '楊乃文', '陳淑樺', '許茹芸', 
    '蘇慧倫', '萬芳', '彭佳慧', '順子', '溫嵐', '那英', '張清芳', '范瑋琪', '郭靜', '安心亞', '李千娜',
    '白安', '孫盛希', '9m88', '阿桑', '藍又時', '林凡', '梁文音', '徐若瑄', '丁噹', '叮噹', '卓文萱',
    '郁可唯', '劉惜君', '張碧晨', '袁詠琳', '江美琪', '侯湘婷', '許慧欣', '蕭亞軒', '王若琳', '范曉萱',
    '周蕙', '辛曉琪', '趙詠華', '李翊君', '高勝美', '潘越雲', '蔡琴', '甄妮', '鳳飛飛', '鄧麗君',
    '徐懷鈺', '曾沛慈', '李毓芬', '郭雪芙', '鄭宜農', '曹雅雯', '陳忻玥', '采子', '葉炫清',
    '丁小芹', '于文文', '於文文', '于台煙', '於台煙', '元若藍', '天童よしみ', '比莉', '水森かおり', 
    '水蜜桃姐姐', '王心如', '王冰洋', '王奕心', '王菀之', '王詩安', '王靖雯', '王靖雯不胖', '王蓉', 
    '任素汐', '任夏', '任然', '伍代夏子', '同恩', '多岐川舞子', '宇多田光', '岑寧兒', '川中美幸', 
    '川島茉樹代', 'Makiyo', '方千玉', '方季惟', '方晴', '坂本冬美', '本冬美', '石川さゆり', '石欣卉', 
    '竹內まりや', '竹内まりや', '何以奇', '何俐恩', '何欣穗', '何韻詩', '吳玫嫺', '呂薔', '宋孟君', 
    '宋新妮', '汪小敏', '汪佩蓉', '周迅', '周筆暢', '周璇', '孟佳', '孟庭葦', '尚雯婕', '弦子', 
    '林二汶', '林心如', '林依晨', '林采欣', '林采緹', '林冠吟', '林美秀', '林語菲', '柯以敏', 
    '柯泯薰', '洪安妮', '洪佩瑜', '田震', '由紀さおり', '紀曉君', '莊心妍', '莊妮', '莎拉Sana', 
    '許美嫻', '許哲珮', '郭書瑤', '郭美美', '降央卓瑪', '陳明', '陳明真', '陳粒', '陳雪凝', 
    '陳嘉樺', '陳綺涵', '陳德容', '陶蕙', '單依純', '傅又宣', '傅如喬', '張艾嘉', '張曼莉', 
    '張靚穎', '梁文英', '梁雁翎', '梁心頤', '童欣', '舒淇', '葉倩文', '葉蒨文', '葉璦菱', '葛台瑄', 
    '楊千嬅', '楊林', '楊麗珍', '溫奕心', '戴佩妮', '蔡依真', '蔡以真', '蔡佩軒', '蔡淳佳', 
    '蔡詩蕓', '鄧福如', '鄭茵聲', '閻韋伶', '盧凱彤', '蕭薔', '蕭瀟', '謝麗金', '鍾汶', '韓紅', 
    '魏如昀', '魏妙如', '魏佳藝', '龔玥', '龔詩嘉', '關心妍', '關詩敏', '蘇芮',
    '二珂', '周二珂', '旺仔小喬', '莫叫姐姐', '小阿七', '阿肆', 'A Si',
    '多哇.才吉', '劉藍溪',

    // Taiwanese / Hokkien (Female)
    '白冰冰', '江蕙', '黃乙玲', '張秀卿', '詹雅雯', '龍千玉', '孫淑媚', '秀蘭瑪雅', '黃妃', '李愛綺', '王瑞霞',
    '朱海君', '張涵雅', '謝宜君', '向蕙玲', '謝金燕', '蔡秋鳳', '曾心梅', '郭婷筠', 
    '陳怡婷', '張文綺', '賴慧如', '唐儷', '楊靜', '林姍', '喬幼', '董育君', '謝金晶', '陳淑萍', 
    '吳申梅', '戴梅君', '甲子慧', '邱芸子', '陳思安', '林良歡', '談詩玲', '陳小雲', '陳盈潔',
    '方瑞娥', '張蓉蓉', '黃思婷', '林喬安', '陳雪萍', '鳳娘', '一綾', '張艾莉', '蔡一紅',
    
    // Western / International
    'Adele', 'Taylor Swift', 'Ariana Grande', 'Billie Eilish', 'Lady Gaga', 'Rihanna', 'Katy Perry',
    'Beyoncé', 'Sia', 'Dua Lipa', 'Olivia Rodrigo', 'Miley Cyrus', 'Celine Dion', 'Whitney Houston',
    'Mariah Carey', 'Madonna', 'Britney Spears', 'Avril Lavigne', 'Shakira', 'Jessie J', 'Alicia Keys',
    'Christina Aguilera', 'Norah Jones', 'Lana Del Rey', 'Selena Gomez', 'Demi Lovato', 'Camila Cabello',
    'Cardi B', 'Nicki Minaj', 'Doja Cat', 'Megan Thee Stallion', 'SZA', 'Halsey',
    'Aaliyah', 'Alanis Morissette', 'Alannah Myles', 'Alison Krauss', 'Amy Grant', 'Anastacia', 
    'Aretha Franklin', 'Barbra Streisand', 'Belinda Carlisle', 'Bette Midler', 'Beyonce', 
    'Carly Rae Jepsen', 'Carole King', 'C. Simon', 'Carly Simon', 'Cher', 'Debbie Gibson', 
    'Deborah Gibson', 'Diana Ross', 'Dionne Warwick', 'Dido', 'Donna Summer', 'Ellie Goulding', 
    'Enya', 'Faith Hill', 'Gabrielle', 'Geri Halliwell', 'Gloria Estefan', 'Gloria Gaynor', 
    'Idina Menzel', 'Janet Jackson', 'Jennifer Lopez', 'Jewel', 'Juce Newton', 'Juice Newton', 
    'Kelly Clarkson', 'Kylie Minogue', 'Laura Branigan', 'LeAnn Rimes', 'Lene Marlin', 
    'Linda Ronstadt', 'Lindsay Lohan', 'Lisa Stansfield', 'Mandy Moore', 'Macy Gray', 'Mya', 
    'Natalie Cole', 'Natalie Imbruglia', 'Nelly Furtado', 'Olivia Newton-John', 'Pink', 
    'Paula Cole', 'Rita Coolidge', 'Robyn', 'Sarah McLachlan', 'Selena', 'Shania Twain', 
    'Sheena Easton', 'Sheryl Crow', 'Sinead O’Connor', 'Sophie B. Hawkins', 'Sue Thompson', 
    'Tamia', 'Toni Braxton', 'Vanessa Williams', 'Vicki Carr', 'Wendy Moten'
]);

// Pure Bands
const KNOWN_BANDS = new Set([
    '五月天', 'S.H.E', '蘇打綠', '魚丁糸', '茄子蛋', '告五人', '動力火車', '玖壹壹', '頑童MJ116', 
    'F.I.R', 'F.I.R.', '飛兒樂團', '信樂團', '南拳媽媽', '原子邦妮', '草東沒有派對', '美秀集團', '滅火器', 
    '理想混蛋', '八三夭', 'MP魔幻力量', '5566', 'Energy', '草蜢', '小虎隊', '優客李林', '錦繡二重唱', 
    '無印良品', 'Beyond', '獅子合唱團', '七月半', '宇宙人', 'Tizzy Bac', '旺福', '董事長樂團',
    '四分衛', '1976', 'Trash', '麋先生', 'Hello Nico', 'Crispy脆樂團', '棉花糖', 
    'King & Prince', 'Chage & Aska', 'KinKi Kids', 'AKB48', 'EXO', 'Big Bang', 'Super Junior',
    '少女時代', 'Red Velvet', 'Aespa', 'IVE', 'NewJeans', 'Le Sserafim', '(G)I-DLE',
    '草屯囝仔', '臭屁嬰仔', '187INC', '影子計劃', '兄弟本色', '浩角翔起', 'CHING G SQUAD',
    '辦桌二人組', '張三李四', '九澤CP', '2個女生', '兩個女生',
    '動靜', '動靜樂團', '太妃堂', 'TOFFEE', '鳳凰傳奇', '蜜雪薇琪', '閃亮三姊妹', '閃亮三姐妹', 'Carpenters', '木匠兄妹', '流浪天涯三兄妹',
    '*Nsync', 'N Sync', '183CLUB', '183 CLUB', '2moro', '2MORO', '2Unlimited', '4 In Love', 
    '98 Degrees', '98°', '七朵花', '中國娃娃', '元氣G-Boys', '元衛覺醒', '內山田洋とクール・ファイブ', 
    '反骨男孩', '女F4', '可米小子', '大台風樂隊', '大嘴巴', '女孩與機器人', '守夜人', '東方神起', 
    '東方快車', '東城衛', '羽泉', '老王樂隊', '自由派對', '自由發揮', '至上勵合', '玖月奇跡', 
    '南方二重唱', '南征北戰NZBZ', '咻比嘟華', '城市少女', '怕胖團', '房東的貓', '怪物團體', 
    '深白色2人組', '深白色二人組', '浪花兄弟', '火箭少女101', '牛奶咖啡', '神木與瞳', '筷子兄弟', 
    '縱貫線', '翼勢力', '黑色餅乾', '黑眼豆豆', 'Black Eyed Peas', '櫻桃幫', '脫拉庫', 
    '康士坦的變化球', 'TRASH', 'Mr.Miss', 'Twins', 'SHE',
    '十月合唱團', '印象合唱團', '兒童合唱團', '刺客合唱團', '丘丘合唱團', 
    '小海燕 合唱團', '小海燕合唱團', '超仁 合唱團', '蟑螂 合唱團', '蟑螂合唱團',
    '耳朵便利店', '東方T&J',
    
    // Western Groups
    'Maroon 5', 'Coldplay', 'Blackpink', 'BTS', 'Twice', 'Westlife', 'Backstreet Boys', 
    'Linkin Park', 'The Beatles', 'Queen', 'Bon Jovi', 'Guns N\' Roses', 'Nirvana', 'Radiohead',
    'Imagine Dragons', 'OneRepublic', 'The Chainsmokers', 'Daft Punk', 'AC/DC', 'Pink Floyd',
    'One Direction', 'Fifth Harmony', 'Little Mix', 'Destiny\'s Child', 'Spice Girls',
    'The Rolling Stones', 'Led Zeppelin', 'The Who', 'The Doors', 'The Eagles',
    'Fleetwood Mac', 'ABBA', 'Bee Gees', 'The Carpenters', 'Simon & Garfunkel',
    'Wham!', 'Pet Shop Boys', 'Erasure', 'Roxette', 'Savage Garden', 'Air Supply',
    'Ace Of Base', 'Aerosmith', 'America', 'Animals', 'Bangles', 'Black Sabbath', 'Blondie', 
    'Blue', 'Boney M', 'Boston', 'Boyz II Men', 'Boyzone', 'Bread', 'Cardigans', 'Chicago', 
    'Clash', 'Commodores', 'Corrs', 'Creedence Clearwater Revival', 'Crowded House', 'Culture Club', 
    'D12', 'Deep Purple', 'Dexy’s Midnight Runners', 'Dixie Chicks', 'Drifters', 'Eagles', 'Eagle', 
    'Everly Brothers', 'F4', 'Five', 'Foreigner', 'Four Tops', 'Free', 'Garbage', 'Gorillaz', 
    'Green Day', 'Hanson', 'Heart', 'Herman’s Hermits', 'Hollies', 'Human League', 'Jamiroquai', 
    'Kinks', 'Lady Antebellum', 'Lifehouse', 'Limp Bizkit', 'Matchbox 20', 'M2M', 'Michael Learns To Rock', 
    'MLTR', 'Moody Blues', 'No Doubt', 'No Mercy', 'Platters', 'Police', 'R.E.M.', 'Red Hot Chili Peppers', 
    'REO Speedwagon', 'Right Said Fred', 'Righteous Brothers', 'Rolling Stones', 'Roxy Music', 
    'S Club 7', 'Sister Sledge', 'Sixpence None The Richer', 'Smokie', 'Steps', 'Stereophonics', 
    'Stylistics', 'Sugababes', 'Supremes', 'Surface', 'Sweet', 'Swing Out Sister', 'Take That', 
    'Temptations', 'TFBOYS', 'Train', 'Turtles', 'U2', 'Wet Wet Wet', 'Whitesnake', 'Yes'
]);

// Non-Artists (Song names, Soundtracks, Folk, etc.)
const KNOWN_OTHERS = new Set([
    '(鋼琴師)插曲', '2014潮客樂主題曲', '一口甜', '一切有我', '一支榴槤', '一縷輕煙', '又見炊煙', 
    '三年的舊情', '三聲無奈', '不甘拆分開', '你的上好佳', '你愛不愛我', '到底愛我不愛', 
    '我比誰都愛你', '我在妳左右', '再會呀港都', '夜來香', '望春風', 
    '昨日重現(生命因你而動)插曲', '雪絨花(音樂之聲)插曲', '因為我愛你(走出非洲)插曲', 
    '遠航(哥倫布傳)插曲', '以吻封緘(蝴蝶夢)插曲', '民歌', '民歌往事', '民歌專輯', 
    '外場老歌', '陝北民歌', '蒙古族民歌', 'Traditional Folk Song', 'Copy BT07-PZ',
    '張三李四鄧福如', // Special case: Looks like concatenated names
    'zp xo4', '天涯芳草', '慈母淚痕', '桑塔露琪亞',
    
    // Generic Chorus / Duet titles or Songwriters that look like duets
    '15所高中大合唱', '2013全職高中大合唱', '2017高中大合唱', '2022全國高中生大合唱', 
    '全國高中生大合唱', '高中生大合唱', '滾石大合唱', '大合唱', '大對唱', '合唱', '情歌對唱',
    'Adams & Lange', 'Ashford & V. Simpson', 'B.Adams & J.Valiance', 
    'Buck Ram & Peter Tinturin & William', 'Carol Bayer Sager & Albert Hammond', 
    'Dickson/Goffin/Foster/Crosby', 'Frank J. Myers & Gary Baker', 
    'Frank Wildhorn&John Bettis', 'Gerry Goffin & Michael Masser', 
    'John MacLeod & Tony Macaulay', 'Linda Creed&Michael Masser', 
    'Mann & Weil & Snow', 'Pomeranz&David Zippel', 'Stock&Aitken', 
    'Williams&G.M.', 'Zager & Evan'
]);

// Helper to guess category based on name
const classifyArtist = (name: string): SingerCategory => {
    const n = name.trim();
    const lowerN = n.toLowerCase();

    // 0. Check Others (Explicit List & Patterns)
    if (KNOWN_OTHERS.has(n)) return 'Other';
    if (n.includes('插曲') || n.includes('主題曲')) return 'Other';
    if (n.startsWith('Copy ')) return 'Other';

    // 1. Check Explicit Lists
    if (KNOWN_CHORUS.has(n)) return 'Chorus';
    if (KNOWN_BANDS.has(n)) return 'Group';
    if (KNOWN_FEMALE.has(n)) return 'Female';
    if (KNOWN_MALE.has(n)) return 'Male';
    
    // 2. Detect Band Keywords (Explicitly a band)
    if (n.includes('樂團') || n.includes('Orchestra') || n.includes('Choir') || lowerN.startsWith('the ')) {
        return 'Group';
    }
    if (lowerN.includes('band') && !lowerN.includes('feat') && !lowerN.includes('&')) {
        return 'Group'; // e.g. "RubberBand" but not "Jay feat. Band"
    }

    // 3. Detect Chorus / Duet / Feat separators
    // Expanded based on feedback
    const chorusIndicators = [
        '/', ' feat', ' ft', ' vs ', ' x ', ' with ', '合唱', '對唱', '、', '+', '&', 
        ',', '，', ' and ', ';', '_', '|', '群星', '全體歌手', 'Various', 'featuring'
    ];
    
    if (chorusIndicators.some(indicator => lowerN.includes(indicator.toLowerCase()))) {
        return 'Chorus';
    }

    // 4. Special Chorus detection (Dot separator, Brackets)
    // "黃鴻升.柯有倫" has chinese chars and dot
    if (n.includes('.') && /[\u4e00-\u9fa5]/.test(n)) {
        return 'Chorus';
    }
    // "Johnny Mathis[Various]"
    if (n.includes('[') && n.includes(']')) return 'Chorus';

    // 5. Special Space Detection for likely Duets
    // Logic: If contains space, AND is not wrapped in parenthesis (alias).
    // REFINED: To be a duet, split by space, and verify at least TWO parts have Chinese characters.
    // This catches "方順吉 吳欣達" (Both parts have Chinese)
    // This avoids "周杰倫 Jay Chou" (Only first part has Chinese)
    // This avoids "Ed Sheeran" (No parts have Chinese)
    if (n.includes(' ') && !n.includes('(') && !n.includes(')')) {
        const parts = n.split(' ');
        const chineseParts = parts.filter(p => /[\u4e00-\u9fa5]/.test(p));
        
        // If at least two distinct parts contain Chinese characters, it's likely a Duet
        if (chineseParts.length >= 2) {
            return 'Chorus';
        }
    }

    // 6. Fallback Logic for unknowns
    // Heuristic: Check for common female characters in Chinese names
    const femaleChars = ['妃', '婷', '娜', '玲', '雅', '惠', '妹', '琪', '萱', '怡', '茹', '淑', '娟', '芬', '芳', '儀', '靜', '慧', '瑩', '慈', '珊', '琳', '潔', '貞', '萍', '薇', '燕', '鳳', '梅', '蘭', '娥', '姬', '仙', '芸'];
    
    if (femaleChars.some(char => n.includes(char))) {
        return 'Female';
    }

    // Default Fallback
    return 'Male'; 
};

export const Singers: React.FC<SingersProps> = ({ songs, user, refreshUserData, onRequest, onAddRequest }) => {
  const [view, setView] = useState<'categories' | 'list' | 'songs'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<SingerCategory>('Male');
  const [selectedWordCount, setSelectedWordCount] = useState<number | 'all'>('all');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // 1. Extract and Classify Artists
  const artistMap = useMemo(() => {
    const map = {
        Male: new Set<string>(),
        Female: new Set<string>(),
        Group: new Set<string>(),
        Chorus: new Set<string>(),
        Other: new Set<string>()
    };

    songs.forEach(song => {
        if (!song.artist || song.isDeleted) return;
        
        // Clean up artist name (trim spaces)
        const cleanName = song.artist.trim();
        const category = classifyArtist(cleanName);
        map[category].add(cleanName);
    });

    const result = {
        Male: Array.from(map.Male).sort((a, b) => a.localeCompare(b, 'zh-TW')),
        Female: Array.from(map.Female).sort((a, b) => a.localeCompare(b, 'zh-TW')),
        Group: Array.from(map.Group).sort((a, b) => a.localeCompare(b, 'zh-TW')),
        Chorus: Array.from(map.Chorus).sort((a, b) => a.localeCompare(b, 'zh-TW')),
        Other: Array.from(map.Other).sort((a, b) => a.localeCompare(b, 'zh-TW'))
    };

    // DEBUG: Print Chorus list to console for user to check
    console.group("=== 合唱 / 對唱 歌手清單 (排查用) ===");
    console.log("總數:", result.Chorus.length);
    console.log(result.Chorus.join('\n'));
    console.groupEnd();

    return result;
  }, [songs]);

  // 2. Filter Artists by Word Count
  const filteredArtists = useMemo(() => {
      const artists = artistMap[selectedCategory];
      if (selectedWordCount === 'all') return artists;
      
      return artists.filter(name => {
          // If selected is 11, show 11 or more chars
          if (selectedWordCount >= 11) return name.length >= 11;
          return name.length === selectedWordCount;
      });
  }, [artistMap, selectedCategory, selectedWordCount]);

  // 3. Filter Songs by Selected Artist
  const artistSongs = useMemo(() => {
      if (!selectedArtist) return [];
      return songs.filter(s => s.artist === selectedArtist);
  }, [songs, selectedArtist]);


  // --- Render Views ---

  if (view === 'categories') {
      return (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-2">
                      <Mic className="text-ktv-500" size={32} />
                      歌手分類
                  </h2>
                  <p className="text-gray-500">請選擇歌手類型</p>
              </div>

              {/* Grid Updated for 5 Categories */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
                  
                  {/* Male */}
                  <button 
                    onClick={() => { setSelectedCategory('Male'); setView('list'); setSelectedWordCount('all'); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm hover:shadow-xl aspect-[4/5] flex flex-col items-center justify-center"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <UserIcon size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <UserIcon size={40} />
                          </div>
                          <div className="text-center">
                              <h3 className="text-xl font-bold dark:text-white">男歌手</h3>
                              <span className="text-sm text-gray-500 block mt-1">{artistMap.Male.length} 位</span>
                          </div>
                      </div>
                  </button>

                  {/* Female */}
                  <button 
                    onClick={() => { setSelectedCategory('Female'); setView('list'); setSelectedWordCount('all'); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:border-pink-500 dark:hover:border-pink-500 transition-all shadow-sm hover:shadow-xl aspect-[4/5] flex flex-col items-center justify-center"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <UserIcon size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center text-pink-600 dark:text-pink-400">
                              <UserIcon size={40} />
                          </div>
                          <div className="text-center">
                              <h3 className="text-xl font-bold dark:text-white">女歌手</h3>
                              <span className="text-sm text-gray-500 block mt-1">{artistMap.Female.length} 位</span>
                          </div>
                      </div>
                  </button>

                  {/* Group (Band) */}
                  <button 
                    onClick={() => { setSelectedCategory('Group'); setView('list'); setSelectedWordCount('all'); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:border-purple-500 dark:hover:border-purple-500 transition-all shadow-sm hover:shadow-xl aspect-[4/5] flex flex-col items-center justify-center"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Guitar size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                              <Guitar size={40} />
                          </div>
                          <div className="text-center">
                              <h3 className="text-xl font-bold dark:text-white">樂團 / 團體</h3>
                              <span className="text-sm text-gray-500 block mt-1">{artistMap.Group.length} 組</span>
                          </div>
                      </div>
                  </button>

                  {/* Chorus (Duet) */}
                  <button 
                    onClick={() => { setSelectedCategory('Chorus'); setView('list'); setSelectedWordCount('all'); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:border-orange-500 dark:hover:border-orange-500 transition-all shadow-sm hover:shadow-xl aspect-[4/5] flex flex-col items-center justify-center"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Users size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                              <Users size={40} />
                          </div>
                          <div className="text-center">
                              <h3 className="text-xl font-bold dark:text-white">合唱 / 對唱</h3>
                              <span className="text-sm text-gray-500 block mt-1">{artistMap.Chorus.length} 組</span>
                          </div>
                      </div>
                  </button>

                  {/* Other */}
                  <button 
                    onClick={() => { setSelectedCategory('Other'); setView('list'); setSelectedWordCount('all'); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 hover:border-gray-500 dark:hover:border-gray-400 transition-all shadow-sm hover:shadow-xl aspect-[4/5] flex flex-col items-center justify-center"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Disc size={100} />
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
                              <Disc size={40} />
                          </div>
                          <div className="text-center">
                              <h3 className="text-xl font-bold dark:text-white">其他 / 插曲</h3>
                              <span className="text-sm text-gray-500 block mt-1">{artistMap.Other.length} 組</span>
                          </div>
                      </div>
                  </button>

              </div>
          </div>
      );
  }

  if (view === 'list') {
      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
              <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setView('categories')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                      <ArrowLeft className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <div>
                      <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                          {selectedCategory === 'Male' && <UserIcon className="text-blue-500" />}
                          {selectedCategory === 'Female' && <UserIcon className="text-pink-500" />}
                          {selectedCategory === 'Group' && <Guitar className="text-purple-500" />}
                          {selectedCategory === 'Chorus' && <Users className="text-orange-500" />}
                          {selectedCategory === 'Other' && <Disc className="text-gray-500" />}
                          
                          {selectedCategory === 'Male' ? '男歌手' : 
                           selectedCategory === 'Female' ? '女歌手' : 
                           selectedCategory === 'Group' ? '樂團 / 團體' : 
                           selectedCategory === 'Chorus' ? '合唱 / 對唱' : '其他 / 插曲'}
                      </h2>
                      <p className="text-sm text-gray-500">選擇一位歌手以查看歌曲</p>
                  </div>
              </div>

              {/* Word Count Filter Tabs */}
              <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <button 
                    onClick={() => setSelectedWordCount('all')}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedWordCount === 'all' ? 'bg-ktv-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                  >
                      全部
                  </button>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(count => (
                      <button 
                        key={count}
                        onClick={() => setSelectedWordCount(count)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedWordCount === count ? 'bg-ktv-500 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                      >
                          {count === 11 ? '11字以上' : `${count} 字`}
                      </button>
                  ))}
              </div>

              {/* Artists Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredArtists.map((artist, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setSelectedArtist(artist); setView('songs'); }}
                        className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl hover:border-ktv-500 dark:hover:border-ktv-500 hover:shadow-md transition-all text-left flex justify-between items-center group h-auto min-h-[3.5rem]"
                      >
                          <span className="font-bold dark:text-white break-words text-left flex-1 pr-2 leading-tight">{artist}</span>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-ktv-500 transition-colors shrink-0" />
                      </button>
                  ))}
              </div>
              
              {filteredArtists.length === 0 && (
                  <div className="text-center py-20 text-gray-400">
                      沒有找到符合字數的歌手
                  </div>
              )}
          </div>
      );
  }

  // view === 'songs'
  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-300">
           <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="text-gray-500 dark:text-gray-400" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                        <Music2 className="text-ktv-500" />
                        {selectedArtist} 的歌曲
                    </h2>
                    <p className="text-sm text-gray-500">共 {artistSongs.length} 首</p>
                </div>
            </div>

            {/* Reuse Songs Component but filtered */}
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                <Songs 
                    songs={artistSongs} 
                    user={user} 
                    refreshUserData={refreshUserData} 
                    onRequest={onRequest} 
                    onAddRequest={onAddRequest}
                    variant="default" // Use default variant logic but input is pre-filtered
                />
            </div>
      </div>
  );
};
