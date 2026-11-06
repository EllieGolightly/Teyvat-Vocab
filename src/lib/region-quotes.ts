/**
 * Short, verbatim Chinese excerpts checked against the linked transcripts on
 * 2026-11-06. Dialogue, character voice-overs and official greetings are labelled
 * separately; quotations inside dialogue remain attributed in the source label.
 * Keep excerpts brief and do not substitute fan-written sayings for game lines.
 */
export interface RegionQuote {
  id: string;
  text: string;
  source: string;
  sourceUrl: string;
}

const quote = (id: string, text: string, source: string, page: string): RegionQuote => ({
  id, text, source, sourceUrl: `https://wiki.biligame.com/ys/${page}`,
});

export const REGION_QUOTES: Record<string, RegionQuote[]> = {
  liyue: [
    quote('liyue-journey', '循着旅途不断追寻与收获，果然是件好事。', '活动剧情「千里寻音迹难觅」节选', '千里寻音迹难觅'),
    quote('liyue-witness', '见证者，为见证而来。铭记者，因铭记而生。', '传说任务「变乱似流，磐石不转」', '变乱似流，磐石不转'),
    quote('liyue-together', '下次「记录」，不妨再结伴同行吧。', '传说任务「万象之录」节选', '万象之录'),
    quote('liyue-golden', '你在我的记忆中也会如黄金般闪耀。', '角色语音「想要了解钟离·其五」节选', '钟离语音'),
    quote('liyue-spring', '此般盎然春意，应有好茶与好友相伴。', '官方贺图「2022 白色情人节·钟离」节选', '钟离'),
    quote('liyue-city', '以闲人之身见证街市繁荣，也是件乐事啊。', '活动剧情「飞彩镌流年」·钟离第一天对话', '「飞彩镌流年」（任务）'),
    quote('liyue-clear-heart', '人生自在，靠的还是一颗坚定又澄澈的心。', '尘歌壶·钟离好感对话节选', '钟离/家园'),
    quote('liyue-open-road', '是堂主的心意，她愿你前路坦荡无阻。', '活动剧情「奇门术息灾平昏寿，护摩法净世定幽冥」', '奇门术息灾平昏寿，护摩法净世定幽冥'),
    quote('liyue-now', '彼时彼景，一如此时此刻。', '活动剧情「人前人后」', '人前人后'),
    quote('liyue-rest', '有点意思，不妨小坐片刻，聊作消遣。', '网页活动「开山览物」', '「开山览物」'),
  ],
  inazuma: [
    quote('inazuma-not-alone', '你无需担忧未来，也无需独自前行。', '传说任务「熠熠生辉之樱」·影', '熠熠生辉之樱'),
    quote('inazuma-beginning', '我会成为下一个「开始」。', '传说任务「熠熠生辉之樱」·影', '熠熠生辉之樱'),
    quote('inazuma-here', '不用惊慌，我就在这里。', '传说任务「涤荡秽浊之光」·影', '涤荡秽浊之光'),
    quote('inazuma-resilience', '是啊，多么强大，坚韧，值得为之骄傲…', '传说任务「断绝旧日之途」·影', '断绝旧日之途'),
    quote('inazuma-good-dream', '这一次…一定会是个好梦', '活动剧情「如伴雷电」·影', '如伴雷电'),
    quote('inazuma-dream-wish', '祝愿今夜，人人皆得「好梦」。', '活动剧情「如逢露水」·影节选', '如逢露水'),
    quote('inazuma-try', '嗯，多多尝试也不是坏事。', '官方贺图「2024 雷电将军生日」节选', '雷电将军'),
    quote('inazuma-sword', '不必拘谨，尽情挥剑便是。', '官方贺图「2025 雷电将军生日」节选', '雷电将军'),
    quote('inazuma-practice', '有你作为陪练之宾，我好像能挥出更强更快的一剑。', '角色语音「突破的感受·合」节选', '雷电将军语音'),
    quote('inazuma-reflect', '那你便闭上双眼，与我一同观照内心…', '幻想真境剧诗·影·对话一节选', '雷电将军/幻想真境剧诗'),
  ],
  sumeru: [
    quote('sumeru-action', '智慧是懂得衡量，也是懂得选择。', '魔神任务「虚空劫灰往世书」节选', '虚空劫灰往世书'),
    quote('sumeru-dream', '今晚，愿你也有个好梦。', '尘歌壶·偏好摆设对话', '纳西妲/家园'),
    quote('sumeru-well-done', '你已经做得很好了，摸摸头。', '尘歌壶·纳西妲好感对话', '纳西妲/家园'),
    quote('sumeru-world', '果然要亲眼去看，才能感受到世界的美。', '角色语音「闲聊·感受」', '纳西妲语音'),
    quote('sumeru-memory', '我相信此刻的时间，会为我们而停驻。', '活动剧情「赠予她回忆」', '赠予她回忆'),
    quote('sumeru-never-late', '只要能醒过来，什么时候都不算晚。', '传说任务「告别之梦」节选', '告别之梦'),
    quote('sumeru-imagination', '「想象」，便是突破那些习以为常的事物。', '魔神任务「终将结束的花神诞祭」', '终将结束的花神诞祭'),
    quote('sumeru-rebuild', '不论是文化、友谊、信任…我们都会重新得到的。', '魔神任务「请饮下祝胜之酒」节选', '请饮下祝胜之酒'),
    quote('sumeru-learning', '感情真的很复杂，看来我还要继续学习才行。', '传说任务「若还有另一个家」', '若还有另一个家'),
    quote('sumeru-together', '能和大家共同度过这个日子，真是令人高兴呢。', '官方贺图「2026 纳西妲生日」节选', '角色贺图'),
  ],
  fontaine: [
    quote('fontaine-reunion', '离别难免有所不舍，但离别又是为了更好的相逢。', '魔神任务「纳塔！新的旅程」', '纳塔！新的旅程'),
    quote('fontaine-stage', '让世界成为我们的舞台，随时随地都可以开启一段即兴演出。', '尘歌壶·芙宁娜好感对话节选', '芙宁娜/家园'),
    quote('fontaine-past', '过去的种种经历组成了现在的我', '角色语音「想要了解芙宁娜·其五」节选', '芙宁娜语音'),
    quote('fontaine-choice', '我有选择的资格了。', '传说任务「水应流向何方」', '水应流向何方'),
    quote('fontaine-sweet', '为了展现出我的最佳状态，补充糖分也是必要的嘛。', '幻想真境剧诗·对话一', '芙宁娜/幻想真境剧诗'),
    quote('fontaine-traveler', '只是一个想要寻遍美景、四处采风的小小游客而已啦。', '活动剧情「人来人往」节选', '人来人往'),
    quote('fontaine-protect', '我一定…会守护住你们。', '魔神任务「审判日」·芙宁娜心声', '审判日'),
    quote('fontaine-return', '重返舞台也没有想象中那么令人反感。', '传说任务「轻歌涓浅，怡如此生」节选', '轻歌涓浅，怡如此生'),
    quote('fontaine-dream', '不过仔细想想，刚才...倒是做了个不错的美梦。', '官方贺图「2026 芙宁娜生日」节选', '角色贺图/生日贺图/2026'),
    quote('fontaine-enjoy', '这不是挺好的建议吗？旅行就该这么享受才对。', '活动剧情「若我们再次相见」', '若我们再次相见'),
  ],
  natlan: [
    quote('natlan-no-regrets', '这一路就应该潇潇洒洒，不留遗憾。', '魔神任务「名为『命运』的燃料」节选', '名为「命运」的燃料'),
    quote('natlan-courage', '鼓起勇气，不必为了未知而不安', '魔神任务「星与火的征途」节选', '星与火的征途'),
    quote('natlan-together', '我们不会孤军奋战', '魔神任务「星与火的征途」节选', '星与火的征途'),
    quote('natlan-hope', '我们不会放弃「希望」', '魔神任务「众望所归」·过场动画对白', '众望所归'),
    quote('natlan-future', '有什么比我们携手创造的未来更加重要的呢？', '魔神任务「当一切镌刻成碑」', '当一切镌刻成碑'),
    quote('natlan-support', '我们能做的只有支持他们这一件事。', '魔神任务「抉择」', '抉择'),
    quote('natlan-now', '不论如何，专注当下吧', '地图事件「异象·纳塔」节选', '异象·纳塔'),
    quote('natlan-true-heart', '同伴、友情、支持…说法不怎么高级，但我们的心意都是真的。', '魔神任务「你的往事如一座花园」节选', '你的往事如一座花园'),
    quote('natlan-practice', '别害羞啊，一回生二回熟，多上台几次就习惯了。', '官方贺图「2026 玛薇卡生日」节选', '玛薇卡'),
    quote('natlan-honesty', '哈哈，很像你的回答，我喜欢你的坦诚。', '魔神任务「摇曳灯火一分为二」', '摇曳灯火一分为二'),
  ],
  // Fewer excerpts are intentional: keep the Queen's confirmed dialogue rather
  // than padding the collection with invented lines or other characters' words.
  snezhnaya: [
    quote('snezhnaya-self', '我会选择做真实的自己', '魔神任务「溯见光影交织」·安娜丝塔夏节选', '溯见光影交织'),
    quote('snezhnaya-destiny', '我们都在为自己的命运抗争。', '魔神任务「溯见光影交织」·安娜丝塔夏节选', '溯见光影交织'),
    quote('snezhnaya-present', '我便只会选择活在当下。', '魔神任务「于饯别之时散落的黑羽」·安娜丝塔夏节选', '于饯别之时散落的黑羽'),
    quote('snezhnaya-no-pawns', '我只是不喜欢有「弃子」的战术。', '魔神任务「于饯别之时散落的黑羽」·安娜丝塔夏', '于饯别之时散落的黑羽'),
    quote('snezhnaya-time', '众卿心中的诸多疑惑，就交给时间来解答吧。', '魔神任务「仅此一着」·安娜丝塔夏', '仅此一着'),
    quote('snezhnaya-resolve', '反抗绝非虚妄。', '魔神任务「仅此一着」·安娜丝塔夏节选', '仅此一着'),
  ],
  nodkrai: [
    quote('nodkrai-moonlight', '也请你们记得，月光永远联系着我们，不论日夜。', '魔神任务「回到月亮上去」', '回到月亮上去'),
    quote('nodkrai-story', '你也是…旅行者。去走进属于你的故事吧。', '魔神任务「循着过往的足迹」', '循着过往的足迹'),
    quote('nodkrai-blessing', '若你需要的话，我会给予你月亮的赐福。', '角色语音「初次见面」节选', '哥伦比娅语音'),
    quote('nodkrai-name', '今后也这么呼唤我吧。', '魔神任务「名于何处？」', '名于何处？'),
    quote('nodkrai-simple-world', '它们眼中的世界很单纯，也很美丽。', '尘歌壶·哥伦比娅谈月灵', '哥伦比娅/家园'),
    quote('nodkrai-friends', '我喜欢朋友们，所以总是会在生活中不知不觉想起大家。', '活动剧情「水族箱里的…朋友？」节选', '水族箱里的…朋友？'),
    quote('nodkrai-melody', '好听的旋律，应该有美丽的月光相伴。', '伴月纪闻「如月之恒」节选', '如月之恒'),
    quote('nodkrai-trust', '他们一定会发现的。我知道。', '魔神任务「最初的那抹月光」', '最初的那抹月光'),
    quote('nodkrai-home', '现在的我，已经稳稳地站在这片养育我的土地上了。', '魔神任务「空月归乡」节选', '空月归乡'),
    quote('nodkrai-company', '那我就先期待有你们相伴的这几天吧。', '伴月纪闻「归家的月亮」节选', '归家的月亮'),
  ],
};
