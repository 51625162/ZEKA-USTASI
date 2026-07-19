/* ================= AUDIO: sound effects ================= */
let soundOn = true;
let actx = null;
function beep(freq, dur, type){
  if(!soundOn) return;
  try{
    if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
    const o = actx.createOscillator(); const g = actx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  }catch(e){}
}
function soundGood(){ beep(523,0.12); setTimeout(()=>beep(784,0.15),90); }
function soundBad(){ beep(220,0.25,'sawtooth'); }
function soundWin(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.18),i*110)); }

/* ================= VOICE NARRATION (5 characters) ================= */
const VOICE_PROFILES = [
  {id:'ajan-ela',     name:'Ajan Ela',        desc:'Enerjik, net kadın sesi',  emoji:'🕵️‍♀️', rate:1.05, pitch:1.2},
  {id:'komiser-kaya', name:'Komiser Kaya',    desc:'Kalın ve sakin erkek sesi', emoji:'🧔', rate:0.85, pitch:0.7},
  {id:'minik-alp',    name:'Minik Alp',       desc:'Hızlı, tiz çocuk sesi',     emoji:'🧒', rate:1.28, pitch:1.5},
  {id:'robot-zeka',   name:'Robot Zeka',      desc:'Robotik anlatıcı ses',      emoji:'🤖', rate:0.98, pitch:0.55},
  {id:'ogretmen-nur', name:'Öğretmen Nur',    desc:'Sakin, öğretici ses',       emoji:'👩‍🏫', rate:0.88, pitch:1.0}
];
let availableVoices = [];
let voiceAssignment = {}; // profileId -> SpeechSynthesisVoice | null
let speechSupported = ('speechSynthesis' in window);

function loadVoices(){
  if(!speechSupported) return;
  availableVoices = window.speechSynthesis.getVoices() || [];
  const trVoices = availableVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith('tr'));
  const pool = trVoices.length ? trVoices : availableVoices;
  VOICE_PROFILES.forEach((p, i) => {
    voiceAssignment[p.id] = pool.length ? pool[i % pool.length] : null;
  });
}
if(speechSupported){
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speakOne(text, profileId){
  return new Promise((resolve) => {
    if(!speechSupported || !soundOn){ resolve(); return; }
    try{
      const profile = VOICE_PROFILES.find(p => p.id === profileId) || VOICE_PROFILES[0];
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'tr-TR';
      u.rate = profile.rate; u.pitch = profile.pitch;
      const v = voiceAssignment[profile.id];
      if(v) u.voice = v;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    }catch(e){ resolve(); }
  });
}
function cancelSpeech(){
  if(speechSupported){ try{ window.speechSynthesis.cancel(); }catch(e){} }
}

/* ================= STATE & STORAGE ================= */
const STORE_KEY = 'bilgizekasi_TALHA_progress_v3';
let state = { points:0, badges:{}, best:{}, voiceProfile:'ajan-ela', dragons:[] };
function loadProgress(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw) state = Object.assign(state, JSON.parse(raw));
  }catch(e){}
  if(!state.dragons) state.dragons = [];
  if(state.dragons.length === 0){
    state.dragons.push('lumi');
    saveProgress();
  }
}
function saveProgress(){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){}
}

const LEVEL_STEP = 40; // her 40 puanda 1 seviye
const RANK_NAMES = [
  {min:0, name:'Çaylak Dedektif'},
  {min:150, name:'Kaşif Dedektif'},
  {min:400, name:'Usta Dedektif'},
  {min:800, name:'Baş Dedektif'}
];
function levelForPoints(points){ return Math.floor(points / LEVEL_STEP) + 1; }
function getLevel(points){
  let lvl = RANK_NAMES[0], next = RANK_NAMES[1];
  for(let i=0;i<RANK_NAMES.length;i++){
    if(points >= RANK_NAMES[i].min){ lvl = RANK_NAMES[i]; next = RANK_NAMES[i+1] || null; }
  }
  return {lvl, next};
}

/* ================= HELPERS ================= */
function rand(n){ return Math.floor(Math.random()*n); }
function randInt(a,b){ return a + Math.floor(Math.random()*(b-a+1)); }
function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
function pick(arr){ return arr[rand(arr.length)]; }
function sample(arr, n){ return shuffle(arr).slice(0,Math.min(n,arr.length)); }

const EMOJI_NAMES = {
  '🟥':'kırmızı kare','🟧':'turuncu kare','🟨':'sarı kare','🟩':'yeşil kare','🟦':'mavi kare','🟪':'mor kare','⬛':'siyah kare','⬜':'beyaz kare',
  '🔴':'kırmızı daire','🟠':'turuncu daire','🟡':'sarı daire','🟢':'yeşil daire','🔵':'mavi daire','🟣':'mor daire','⚫':'siyah daire','⚪':'beyaz daire',
  '🍎':'kırmızı elma','🍏':'yeşil elma','🐱':'kedi','🐈':'başka bir kedi','⭐':'yıldız','🌟':'parlak yıldız',
  '🍇':'üzüm','🍒':'kiraz','🐰':'tavşan','🐇':'başka bir tavşan','🔺':'yukarı üçgen','🔻':'aşağı üçgen','⬆️':'yukarı ok','⬇️':'aşağı ok'
};
function nameOf(e){ return EMOJI_NAMES[e] || e; }

/* ================= DRAGON COLLECTION ================= */
const DRAGONS = [
  {id:'lumi',      name:'Lumi',        cat:'mantik',   rarity:'bronze',  emoji:'🐲', ability:'Sayı ve şekil dizilerindeki kalıpları anında görür.', trait:'Meraklı, sabırlı ve her zaman ilk yardıma koşan bir ejder.'},
  {id:'zeko',      name:'Zeko',        cat:'mantik',   rarity:'silver',  emoji:'🐉', ability:'Karmaşık dizilerde bir sonraki adımı tahmin eder.', trait:'Hızlı düşünür, bulmacalardan asla kaçmaz.'},
  {id:'akilhan',   name:'Akılhan',     cat:'mantik',   rarity:'gold',    emoji:'🐲', ability:'En zor mantık sorularını bile saniyeler içinde çözer.', trait:'Sakin ve güvenilir, takımın akıl hocası.'},
  {id:'bilgeata',  name:'Bilgeata',    cat:'mantik',   rarity:'diamond', emoji:'🐉', ability:'Tüm mantık dünyasının efsanevi ustası.', trait:'Bilge, sözleri az ama her sözü değerli.'},

  {id:'gizem',     name:'Gizem',       cat:'sifre',    rarity:'bronze',  emoji:'🦎', ability:'Basit şifreleri gözünü kırpmadan çözer.', trait:'Gizemli ve sessiz, sürprizleri sever.'},
  {id:'kodra',     name:'Kodra',       cat:'sifre',    rarity:'silver',  emoji:'🐍', ability:'Sembol ve harf kalıplarını hızla eşleştirir.', trait:'Meraklı bir kâşif, her kodun peşine düşer.'},
  {id:'sirran',    name:'Sirran',      cat:'sifre',    rarity:'gold',    emoji:'🐲', ability:'En karışık şifreleri bile tek bakışta çözer.', trait:'Kurnaz ama dürüst, dostlarına sadık.'},
  {id:'mechul',    name:'Meçhul',      cat:'sifre',    rarity:'diamond', emoji:'🐉', ability:'Hiçbir kod ona karşı gizli kalamaz.', trait:'Efsanevi şifre ustası, izini kimse süremez.'},

  {id:'anika',     name:'Anıka',       cat:'hafiza',   rarity:'bronze',  emoji:'🦕', ability:'Gördüğü kartları kolayca hatırlar.', trait:'Neşeli ve unutkan dostlarına yardımcı olmayı sever.'},
  {id:'hatirla',   name:'Hatırla',     cat:'hafiza',   rarity:'silver',  emoji:'🦖', ability:'Uzun kart dizilerini bile aklında tutar.', trait:'Sabırlı, tekrar etmekten yorulmaz.'},
  {id:'zihara',    name:'Zihara',      cat:'hafiza',   rarity:'gold',    emoji:'🐉', ability:'Bir kez gördüğünü asla unutmaz.', trait:'Keskin zekalı, hafıza şampiyonu.'},
  {id:'bellekhan', name:'Bellekhan',   cat:'hafiza',   rarity:'diamond', emoji:'🐲', ability:'Tüm hafıza oyunlarının efsanevi rekortmeni.', trait:'Görkemli ve unutulmaz, tıpkı hafızası gibi.'},

  {id:'pusula',    name:'Pusula',      cat:'yon',      rarity:'bronze',  emoji:'🐦‍🔥', ability:'Yönleri ve dönüşleri kolayca takip eder.', trait:'Maceracı, hep yeni rotalar keşfeder.'},
  {id:'yonata',    name:'Yönata',      cat:'yon',      rarity:'silver',  emoji:'🐉', ability:'Karmaşık dönüş kalıplarını çözer.', trait:'Cesur ve yönünü hiç şaşırmaz.'},
  {id:'rotam',     name:'Rotam',       cat:'yon',      rarity:'gold',    emoji:'🐲', ability:'Uzaydaki her dönüşü önceden hisseder.', trait:'Lider ruhlu, takımına yol gösterir.'},
  {id:'gokyon',    name:'Gökyön',      cat:'yon',      rarity:'diamond', emoji:'🐉', ability:'Gökyüzünün en usta yön ustası.', trait:'Efsanevi, rüzgarla birlikte süzülür.'},

  {id:'siravi',    name:'Sıravi',      cat:'siralama', rarity:'bronze',  emoji:'🦎', ability:'Olayların doğru sırasını kolayca bulur.', trait:'Düzenli ve titiz, her şeyi sırayla sever.'},
  {id:'zamano',    name:'Zamano',      cat:'siralama', rarity:'silver',  emoji:'🐍', ability:'Zaman içindeki olayları akıllıca sıralar.', trait:'Sakin, acele etmez ama hep doğru zamanlar.'},
  {id:'ardil',     name:'Ardıl',       cat:'siralama', rarity:'gold',    emoji:'🐉', ability:'En karmaşık hikâyeleri bile doğru sıraya dizer.', trait:'Hikâye anlatmayı çok sever.'},
  {id:'kronos',    name:'Kronoş',      cat:'siralama', rarity:'diamond', emoji:'🐲', ability:'Zamanın efsanevi bekçisi, hiçbir sıra ona karışmaz.', trait:'Görkemli ve bilge, çağların tanığı.'},

  {id:'gozcuk',    name:'Gözcük',      cat:'dikkat',   rarity:'bronze',  emoji:'🦖', ability:'Farklı olanı hemen fark eder.', trait:'Meraklı gözlerle her şeyi inceler.'},
  {id:'simsek',    name:'Şimşek',      cat:'dikkat',   rarity:'silver',  emoji:'🐉', ability:'Göz kırpmadan en küçük farkı yakalar.', trait:'Hızlı ve enerjik, asla durmaz.'},
  {id:'farkina',   name:'Farkına',     cat:'dikkat',   rarity:'gold',    emoji:'🐲', ability:'Kamuflajı bozan keskin bir göze sahip.', trait:'Dikkatli ve sakin, hiçbir şeyi kaçırmaz.'},
  {id:'argus',     name:'Argus',       cat:'dikkat',   rarity:'diamond', emoji:'🐉', ability:'Bin gözle bakar, hiçbir detay ona saklı kalmaz.', trait:'Efsanevi gözcü, koleksiyonun en keskin bakışlısı.'}
];
const RARITY_LABEL = {bronze:'Bronz', silver:'Gümüş', gold:'Altın', diamond:'Elmas'};
const CAT_LABEL = {mantik:'🧩 Mantık', sifre:'🔐 Şifre', hafiza:'🃏 Hafıza', yon:'🧭 Uzamsal', siralama:'📖 Sıralama', dikkat:'🔍 Dikkat'};

function nextLockedDragon(){
  return DRAGONS.find(d => !state.dragons.includes(d.id));
}
function unlockDragonsForLevelUp(levelsGained){
  const newlyUnlocked = [];
  for(let i=0;i<levelsGained;i++){
    const next = nextLockedDragon();
    if(next){ state.dragons.push(next.id); newlyUnlocked.push(next); }
  }
  return newlyUnlocked;
}

/* ================= GAME DEFINITIONS ================= */
const GAMES = [
  {id:'mantik', title:'Mantık Yürütme', desc:'Sayı ve şekil dizilerindeki sırrı çöz', icon:'🧩', stars:2, type:'mcq', count:35, gen: genMantik},
  {id:'matris', title:'Parça Birleştir', desc:'Kalıbı incele, eksik parçayı bul', icon:'🖼️', stars:3, type:'mcq', count:35, gen: genMatris},
  {id:'sifre', title:'Şifreyi Çöz', desc:'Dedektif koduyla gizli kelimeyi bul', icon:'🔐', stars:2, type:'mcq', count:35, gen: genSifre},
  {id:'hafiza', title:'Hafıza Kartları', desc:'Eşleri bul, hafızanı test et', icon:'🃏', stars:2, type:'memory', count:8},
  {id:'yon', title:'Uzamsal Dizi', desc:'Dönen okların bir sonrakini tahmin et', icon:'🧭', stars:3, type:'mcq', count:35, gen: genYon},
  {id:'siralama', title:'Olayları Sırala', desc:'Hikâyeyi doğru sıraya diz', icon:'📖', stars:2, type:'sequence', count:25},
  {id:'dikkat', title:'Tek Farklıyı Bul', desc:'Kamuflajı boz, farklı olanı yakala', icon:'🔍', stars:1, type:'attention', count:40}
];

/* ---- Mantık Yürütme ---- */
const SHAPE_POOLS = [
  ['🔺','🔵'], ['⭐','🌙','☀️'], ['🍎','🍌'], ['🐱','🐶','🐰'], ['🟢','🟡','🔴']
];
function genMantik(count){
  const qs = [];
  for(let i=0;i<count;i++){
    if(Math.random() < 0.55){
      const start = randInt(1,12);
      const step = pick([2,3,4,5]);
      const terms = [start, start+step, start+2*step, start+3*step];
      const correct = start + 4*step;
      const distractors = new Set();
      while(distractors.size < 3){
        const d = correct + pick([-4,-3,-2,-1,1,2,3,4]) * pick([1,step]);
        if(d !== correct && d > 0) distractors.add(d);
      }
      const options = shuffle([correct, ...distractors]);
      const addSteps = [];
      for(let k=0;k<terms.length;k++){
        addSteps.push(`${terms[k]}${step>=0?'+':''}${step}=${terms[k]+step}`);
      }
      qs.push({
        prompt: `<div class="seq">${terms.join(' , ')} , <b>?</b></div><div class="prompt-sub">Bu sayı dizisinde sırada ne var?</div>`,
        options: options.map(String),
        correct: options.indexOf(correct),
        answerText: String(correct),
        solutionSteps: [
          `Dizideki sayılara bakalım: ${terms.join(', ')}.`,
          `Her adımda ${step} ${step>=0?'ekleniyor':'çıkarılıyor'}: ${addSteps.join(', ')}.`,
          `Son sayı ${terms[3]} idi, ona da ${step} ${step>=0?'eklersek':'çıkarırsak'} ${correct} çıkar.`,
          `Doğru cevap: ${correct}.`
        ]
      });
    } else {
      const unit = pick(SHAPE_POOLS);
      const seq = [];
      for(let k=0;k<5;k++) seq.push(unit[k % unit.length]);
      const shown = seq.slice(0,4);
      const correct = seq[4];
      const others = SHAPE_POOLS.flat().filter(s => s !== correct);
      const distractors = sample(others, 3);
      const options = shuffle([correct, ...distractors]);
      qs.push({
        prompt: `<div class="seq">${shown.join(' ')} ❓</div><div class="prompt-sub">Şekil düzeninde sırada ne var?</div>`,
        options,
        correct: options.indexOf(correct),
        answerText: correct,
        solutionSteps: [
          `Şekil düzenine bakalım: ${shown.join(' ')}.`,
          `Bu düzende ${unit.length} şekil sırayla tekrar ediyor: ${unit.join(' ')}.`,
          `Dörtten sonra düzen baştan başlıyor, yani sırada yine ${correct} gelir.`,
          `Doğru cevap: ${correct}.`
        ]
      });
    }
  }
  return qs;
}

/* ---- Parça Birleştir (matris) ---- */
const SQUARES = ['🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜'];
const CIRCLES = ['🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪'];
function genMatris(count){
  const qs = [];
  for(let i=0;i<count;i++){
    const palette = Math.random()<0.5 ? SQUARES : CIRCLES;
    const c0 = rand(palette.length);
    const cellAt = (r,c) => palette[(c0 + r + c) % palette.length];
    const grid = [cellAt(0,0), cellAt(0,1), cellAt(1,0)];
    const correct = cellAt(1,1);
    const others = palette.filter(p => p !== correct);
    const distractors = sample(others, 3);
    const options = shuffle([correct, ...distractors]);
    const html = `<div class="matrix-grid">
        <div class="matrix-cell">${grid[0]}</div>
        <div class="matrix-cell">${grid[1]}</div>
        <div class="matrix-cell">${grid[2]}</div>
        <div class="matrix-cell matrix-q">?</div>
      </div><div class="prompt-sub">Kalıbı tamamlayan parça hangisi?</div>`;
    qs.push({
      prompt: html, options, correct: options.indexOf(correct), answerText: correct,
      solutionSteps: [
        `Kalıptaki renklere bakalım: sol üstte ${nameOf(grid[0])}, sağ üstte ${nameOf(grid[1])}, sol altta ${nameOf(grid[2])}.`,
        `Bu bulmacada renkler satır ve sütun sırasına göre bir sonrakine geçiyor.`,
        `Sağ alt köşeye kuralı uygularsak orada ${nameOf(correct)} olması gerekir.`,
        `Doğru cevap: ${correct}.`
      ]
    });
  }
  return qs;
}

/* ---- Şifreyi Çöz ---- */
const WORD_BANK = ['KEDİ','KUŞ','TOP','ARI','BAL','ELMA','AY','EV','AT','YOL','KUM','DAL','SAP','GÜL','SU','KOL',
  'KAPI','MASA','KALEM','SİLGİ','DEFTER','OKUL','BALON','GEMİ','UÇAK','TREN','ORMAN','DENİZ','GÜNEŞ','YILDIZ','BULUT','YAĞMUR','KAR','RÜZGAR'];
const SYMBOL_POOL = ['★','●','▲','■','♦','♥','☀','☂','✿','❀','☘','⚡','☾','✈','⌘','§','¤','♣','♠','☎','☺','✎','☯','♪','⌂','◆','▶','✚','☁','✦','☕','✂'];
let cipherKey = null;
function buildCipherKey(){
  const letters = new Set();
  WORD_BANK.forEach(w => w.split('').forEach(ch => letters.add(ch)));
  const letterArr = Array.from(letters);
  const symbols = shuffle(SYMBOL_POOL).slice(0, letterArr.length);
  const key = {};
  letterArr.forEach((l,i) => key[l] = symbols[i]);
  return key;
}
function encode(word, key){ return word.split('').map(ch => key[ch]).join(' '); }
function genSifre(count){
  cipherKey = buildCipherKey();
  const qs = [];
  const used = new Set();
  for(let i=0;i<count;i++){
    let word;
    let tries = 0;
    do { word = pick(WORD_BANK); tries++; } while(used.has(word) && used.size < WORD_BANK.length && tries < 20);
    used.add(word);
    const others = WORD_BANK.filter(w => w !== word);
    const distractors = sample(others, 3);
    const options = shuffle([word, ...distractors]);
    const legend = Object.entries(cipherKey).map(([l,s]) => `${l}=${s}`).join('  ');
    const decodeSteps = word.split('').map(ch => `${cipherKey[ch]} → ${ch}`).join(', ');
    qs.push({
      prompt: `<div style="font-size:0.7rem;color:#8a7f5c;font-family:var(--font-mono);margin-bottom:10px;line-height:1.8;">${legend}</div>
                <div class="seq">${encode(word, cipherKey)}</div>
                <div class="prompt-sub">Bu şifreli kelime hangisi?</div>`,
      options,
      correct: options.indexOf(word),
      answerText: word,
      solutionSteps: [
        `Önce anahtara bakıp her sembolü harfe çevirelim.`,
        `Semboller sırayla: ${decodeSteps}.`,
        `Harfleri yan yana koyunca kelime "${word}" olur.`,
        `Doğru cevap: ${word}.`
      ]
    });
  }
  return qs;
}

/* ---- Uzamsal Dizi ---- */
const ARROWS = ['↑','↗','→','↘','↓','↙','←','↖'];
function genYon(count){
  const qs = [];
  for(let i=0;i<count;i++){
    const start = rand(8);
    const step = pick([1,2,3]);
    const seq = [0,1,2,3].map(k => ARROWS[(start + k*step) % 8]);
    const correct = ARROWS[(start + 4*step) % 8];
    const others = ARROWS.filter(a => a !== correct);
    const distractors = sample(others, 3);
    const options = shuffle([correct, ...distractors]);
    qs.push({
      prompt: `<div class="seq">${seq.join('  ')}  ❓</div><div class="prompt-sub">Dönüş kalıbında sıradaki ok hangisi?</div>`,
      options,
      correct: options.indexOf(correct),
      answerText: correct,
      solutionSteps: [
        `Ok dizisine bakalım: ${seq.join(' ')}.`,
        `Her adımda ok, saat yönünde ${step} basamak dönüyor.`,
        `Son oku bir kez daha ${step} basamak döndürünce ${correct} elde ederiz.`,
        `Doğru cevap: ${correct}.`
      ]
    });
  }
  return qs;
}

/* ---- Olayları Sırala ---- */
const STORIES = [
  ['Diş fırçasına macun sür','Dişlerini fırçala','Ağzını suyla çalkala','Fırçanı yıkayıp yerine koy'],
  ['Uyan ve gerin','Yüzünü yıka','Kahvaltını yap','Çantanı alıp okula git'],
  ['Malzemeleri hazırla','Karışımı iyice karıştır','Fırına koy','Kekin pişmesini bekle'],
  ['Toprağı kaz','Tohumu toprağa ek','Düzenli su ver','Çiçek filizlenip açar'],
  ['Kitabı raftan seç','Kapağını aç','Sayfaları oku','Kitabı kapatıp rafa koy'],
  ['Gökyüzü kararır','Yağmur yağmaya başlar','Bulutlar dağılır','Gökkuşağı belirir'],
  ['Uçurtmayı hazırla','Rüzgarlı bir alan bul','İpi tutup koş','Uçurtma gökyüzünde süzülür'],
  ['Çorabı çıkart çekmeceden','Çorabı ayağına geçir','Ayakkabılarını giy','Dışarı çıkmaya hazır ol'],
  ['Musluğu aç','Ellerine sabun sür','Ellerini ovarak yıka','Havluyla ellerini kurula'],
  ['Kağıdı masaya koy','Boyaları seç','Resmi çiz','Resmi duvara as'],
  ['Alışveriş listesini yaz','Markete git','Ürünleri sepete koy','Kasada ödeme yap'],
  ['Çantandan defterini çıkar','Ödevi oku','Soruları çöz','Defterini çantana koy'],
  ['Sebzeleri doğra','Suyu kaynat','Sebzeleri suya at','Çorba pişince servis et'],
  ['Tohum toprağa düşer','Kök toprağın altına iner','Filiz toprağın üstüne çıkar','Ağaç zamanla büyür'],
  ['Tırtıl yumurtadan çıkar','Tırtıl koza örer','Kozanın içinde değişir','Kelebek olup uçar'],
  ['Pijamalarını giy','Dişlerini fırçala','Kitap oku','Işığı kapatıp uyu'],
  ['Bisikleti çıkar','Kaskını tak','Pedalları çevir','Yolda ilerle'],
  ['Davetiyeleri gönder','Balonları şişir','Pastayı kes','Hediyeleri aç'],
  ['Hava soğur','Kar yağmaya başlar','Kartopu oynanır','Kardan adam yapılır'],
  ['Ağaca tırman','Elmayı kopar','Sepete koy','Elmayı yıkayıp ye'],
  ['Mektubu yaz','Zarfa koy','Pul yapıştır','Posta kutusuna at'],
  ['Oltayı hazırla','Suya at','Balık yakalanmasını bekle','Balığı çıkar'],
  ['Ders kitabını aç','Konuyu tekrar et','Erken yat','Sınava zamanında git'],
  ['Sulama kabını doldur','Toprağa suyu dök','Güneş ışığı alır','Çiçek tazelenir'],
  ['Kuş dal toplar','Yuvayı örer','Yumurta bırakır','Yavrular yumurtadan çıkar'],
  ['Takımlar sahaya çıkar','Hakem düdük çalar','Oyuncular topa vurur','Gol olunca herkes sevinir'],
  ['Okul biter','Bavul hazırlanır','Tatile gidilir','Denizde yüzülür'],
  ['Fikir bulunur','Hikaye yazılır','Resimler eklenir','Kitap tamamlanır']
];
function genSiralama(count){
  const chosen = sample(STORIES, Math.min(count, STORIES.length));
  return chosen.map(steps => ({ steps }));
}

/* ---- Tek Farklıyı Bul (dikkat) ---- */
const ATTN_SETS = [ SQUARES, CIRCLES, ['🍎','🍏'], ['🐱','🐈'], ['⭐','🌟'], ['🍇','🍒'], ['🐰','🐇'], ['🔺','🔻'], ['⬆️','⬇️'] ];
function genDikkat(count){
  const qs = [];
  for(let i=0;i<count;i++){
    const size = Math.min(4 + Math.floor(i/6), 6);
    const pool = pick(ATTN_SETS);
    const base = pool[0];
    let odd = pool.length > 1 ? pool[randInt(1,pool.length-1)] : pool[0];
    const total = size*size;
    const oddIndex = rand(total);
    const row = Math.floor(oddIndex/size), col = oddIndex % size;
    qs.push({
      size, base, odd, oddIndex,
      solutionSteps: [
        `Bu turda hücrelerin çoğu ${nameOf(base)} idi.`,
        `Farklı olan hücre ${nameOf(odd)} idi.`,
        `O hücre tam olarak ${row+1}. satır, ${col+1}. sütundaydı.`,
        `Dikkatli bakınca farkı yakalayabiliriz!`
      ]
    });
  }
  return qs;
}

/* ================= NAVIGATION ================= */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ================= LOGIN ================= */
document.getElementById('login-form').addEventListener('submit', function(e){
  e.preventDefault();
  const user = document.getElementById('input-user').value.trim().toUpperCase();
  const pass = document.getElementById('input-pass').value.trim();
  const err = document.getElementById('login-error');
  if(user === 'TALHA' && pass === '54321'){
    err.textContent = '';
    loadProgress();
    renderDashboard();
    showScreen('screen-dashboard');
    soundWin();
  } else {
    err.textContent = 'Bu kimlik tanınmadı, dedektif. Tekrar dener misin?';
    const card = document.querySelector('.login-card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    soundBad();
  }
});

document.getElementById('btn-sound').addEventListener('click', function(){
  soundOn = !soundOn;
  this.textContent = soundOn ? '🔊 Ses Açık' : '🔇 Ses Kapalı';
  if(!soundOn) cancelSpeech();
});

/* ================= VOICE PICKER MODAL ================= */
function openVoiceModal(){
  const grid = document.getElementById('voice-grid');
  grid.innerHTML = '';
  VOICE_PROFILES.forEach(p => {
    const card = document.createElement('div');
    card.className = 'voice-card' + (state.voiceProfile === p.id ? ' selected' : '');
    card.innerHTML = `
      <div class="v-emoji">${p.emoji}</div>
      <div class="v-info"><div class="v-name">${p.name}</div><div class="v-desc">${p.desc}</div></div>
      <div class="v-actions">
        <button class="v-btn v-listen">🔊 Dinle</button>
        <button class="v-btn v-select">${state.voiceProfile === p.id ? '✓ Seçili' : 'Seç'}</button>
      </div>`;
    card.querySelector('.v-listen').addEventListener('click', () => {
      cancelSpeech();
      speakOne('Merhaba, ben ' + p.name + '. Sana çözümleri böyle anlatacağım!', p.id);
    });
    card.querySelector('.v-select').addEventListener('click', () => {
      state.voiceProfile = p.id;
      saveProgress();
      document.getElementById('btn-voice').textContent = '🎙️ ' + p.name;
      openVoiceModal();
    });
    grid.appendChild(card);
  });
  document.getElementById('voice-modal').classList.add('active');
}
document.getElementById('btn-voice').addEventListener('click', openVoiceModal);
document.getElementById('voice-modal-close').addEventListener('click', () => {
  document.getElementById('voice-modal').classList.remove('active');
});
document.getElementById('voice-modal').addEventListener('click', (e) => {
  if(e.target.id === 'voice-modal') document.getElementById('voice-modal').classList.remove('active');
});

/* ================= VIDEO ANLATIM MODAL ================= */
const VIDEO_TOPICS = [
  {emoji:'🧠', title:'Zeka Soruları — Görsel, Matematik, Mantık', desc:'Genel zeka becerilerini test eden eğlenceli sorular', ytId:'-wbRZyfoBi8'},
  {emoji:'🧩', title:'Mantık Soruları — İlkokul Seviyesi', desc:'Kısa ve kolay mantık sorularıyla pratik yap', ytId:'bh4adUyKmVM'}
];
function renderVideoList(){
  const list = document.getElementById('video-list');
  list.innerHTML = '';
  VIDEO_TOPICS.forEach(v => {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `<div class="vi-emoji">${v.emoji}</div><div class="vi-info"><div class="vi-title">${v.title}</div><div class="vi-desc">${v.desc}</div></div>`;
    item.addEventListener('click', () => playVideo(v));
    list.appendChild(item);
  });
}
function playVideo(v){
  document.getElementById('video-list').style.display = 'none';
  document.getElementById('video-player-wrap').style.display = 'block';
  document.getElementById('video-embed').innerHTML = `<iframe src="https://www.youtube.com/embed/${v.ytId}" title="${v.title}" allowfullscreen></iframe>`;
}
document.getElementById('btn-videos').addEventListener('click', () => {
  renderVideoList();
  document.getElementById('video-list').style.display = 'flex';
  document.getElementById('video-player-wrap').style.display = 'none';
  document.getElementById('video-embed').innerHTML = '';
  document.getElementById('video-modal').classList.add('active');
});
document.getElementById('video-back').addEventListener('click', () => {
  document.getElementById('video-embed').innerHTML = '';
  document.getElementById('video-list').style.display = 'flex';
  document.getElementById('video-player-wrap').style.display = 'none';
});
document.getElementById('video-modal-close').addEventListener('click', () => {
  document.getElementById('video-embed').innerHTML = '';
  document.getElementById('video-modal').classList.remove('active');
});
document.getElementById('video-modal').addEventListener('click', (e) => {
  if(e.target.id === 'video-modal'){
    document.getElementById('video-embed').innerHTML = '';
    document.getElementById('video-modal').classList.remove('active');
  }
});

/* ================= DRAGON DETAIL MODAL (hareketli gösterim) ================= */
function openDragonModal(dragon){
  document.getElementById('dragon-modal-title').textContent = `${dragon.emoji} ${dragon.name}`;
  document.getElementById('dragon-display').textContent = dragon.emoji;
  const info = document.getElementById('dragon-info');
  info.innerHTML = `
    <div class="d-row">${CAT_LABEL[dragon.cat]} • ${RARITY_LABEL[dragon.rarity]} rütbe</div>
    <div class="d-row"><b>Yetenek:</b> ${dragon.ability}</div>
    <div class="d-row"><b>Özellik:</b> ${dragon.trait}</div>
  `;
  document.getElementById('dragon-modal').classList.add('active');
  cancelSpeech();
  speakOne(`${dragon.name}. Yeteneği: ${dragon.ability} Özelliği: ${dragon.trait}`, state.voiceProfile);
}
document.getElementById('dragon-modal-close').addEventListener('click', () => {
  cancelSpeech();
  document.getElementById('dragon-modal').classList.remove('active');
});
document.getElementById('dragon-modal').addEventListener('click', (e) => {
  if(e.target.id === 'dragon-modal'){
    cancelSpeech();
    document.getElementById('dragon-modal').classList.remove('active');
  }
});

/* ================= DRAGON GIFT MODAL (seviye atlama hediyesi) ================= */
let giftQueue = [];
function queueDragonGifts(dragons){
  giftQueue = giftQueue.concat(dragons);
  if(giftQueue.length === dragons.length) showNextGift();
}
function showNextGift(){
  if(giftQueue.length === 0) return;
  const dragon = giftQueue[0];
  document.getElementById('gift-display').textContent = dragon.emoji;
  document.getElementById('gift-info').innerHTML = `
    <div class="d-row" style="text-align:center;font-family:var(--font-display);font-size:1.1rem;">${dragon.name}</div>
    <div class="d-row">${CAT_LABEL[dragon.cat]} • ${RARITY_LABEL[dragon.rarity]} rütbe</div>
    <div class="d-row"><b>Yetenek:</b> ${dragon.ability}</div>
  `;
  document.getElementById('gift-modal').classList.add('active');
  cancelSpeech();
  soundWin();
  speakOne(`Tebrikler! ${dragon.name} adlı ejderi kazandın! Yeteneği: ${dragon.ability}`, state.voiceProfile);
}
document.getElementById('gift-continue').addEventListener('click', () => {
  cancelSpeech();
  giftQueue.shift();
  document.getElementById('gift-modal').classList.remove('active');
  if(giftQueue.length > 0) setTimeout(showNextGift, 300);
  else renderDashboard();
});

/* ================= DASHBOARD RENDER ================= */
const BADGE_ICON = { gold:'🥇', silver:'🥈', bronze:'🥉' };
const BADGE_RANK = { none:0, bronze:1, silver:2, gold:3 };

function renderDragonGrid(){
  const grid = document.getElementById('dragon-grid');
  grid.innerHTML = '';
  const unlockedCount = state.dragons.length;
  document.getElementById('dragon-section-title').textContent = `🐉 Ejder Koleksiyonu (${unlockedCount}/${DRAGONS.length}) — Seviye atladıkça yeni ejder kazanırsın!`;
  const nextDragon = nextLockedDragon();
  DRAGONS.forEach(d => {
    const unlocked = state.dragons.includes(d.id);
    const slot = document.createElement('div');
    if(unlocked){
      slot.className = 'dragon-slot rarity-' + d.rarity;
      slot.innerHTML = `<span class="d-emoji">${d.emoji}</span><div class="d-name">${d.name}</div>`;
      slot.addEventListener('click', () => openDragonModal(d));
    } else if(d.id === nextDragon?.id){
      const hintWord = d.ability.split(' ').slice(0,3).join(' ');
      slot.className = 'dragon-slot locked next-hint';
      slot.innerHTML = `<span class="d-emoji">❔</span><div class="d-name">Sırada</div><div class="d-hint">${CAT_LABEL[d.cat]}<br>${hintWord}...</div>`;
    } else {
      slot.className = 'dragon-slot locked';
      slot.innerHTML = `<span class="d-emoji">🔒</span><div class="d-name">???</div>`;
    }
    grid.appendChild(slot);
  });
}

/* ================= SOLUTION MODAL (sesli + görsel anlatım) ================= */
let solutionPaused = false;
function openSolutionModal(steps){
  cancelSpeech();
  solutionPaused = false;
  document.getElementById('sol-pause').textContent = '⏸ Duraklat';
  const box = document.getElementById('solution-steps');
  box.innerHTML = '';
  if(!speechSupported){
    const note = document.createElement('div');
    note.className = 'no-speech-note';
    note.textContent = 'Bu cihazda sesli anlatım desteklenmiyor, adımlar görsel olarak gösteriliyor.';
    box.appendChild(note);
  }
  const stepEls = steps.map((text, i) => {
    const el = document.createElement('div');
    el.className = 'sol-step' + (i === steps.length-1 ? ' final' : '');
    el.textContent = text;
    box.appendChild(el);
    return el;
  });
  document.getElementById('solution-modal').classList.add('active');
  playSolutionSteps(steps, stepEls, 0);
}
async function playSolutionSteps(steps, els, startIdx){
  for(let i=startIdx;i<steps.length;i++){
    if(!document.getElementById('solution-modal').classList.contains('active')) return;
    els.forEach(el => el.classList.remove('speaking'));
    els[i].classList.add('shown');
    els[i].classList.add('speaking');
    els[i].scrollIntoView({block:'nearest', behavior:'smooth'});
    await speakOne(steps[i], state.voiceProfile);
    if(!speechSupported) await new Promise(r => setTimeout(r, 900));
    els[i].classList.remove('speaking');
  }
}
document.getElementById('solution-modal-close').addEventListener('click', () => {
  cancelSpeech();
  document.getElementById('solution-modal').classList.remove('active');
});
document.getElementById('solution-modal').addEventListener('click', (e) => {
  if(e.target.id === 'solution-modal'){
    cancelSpeech();
    document.getElementById('solution-modal').classList.remove('active');
  }
});
document.getElementById('sol-replay').addEventListener('click', () => {
  const box = document.getElementById('solution-steps');
  const els = Array.from(box.querySelectorAll('.sol-step'));
  const texts = els.map(el => el.textContent);
  cancelSpeech();
  els.forEach(el => el.classList.remove('shown','speaking'));
  playSolutionSteps(texts, els, 0);
});
document.getElementById('sol-pause').addEventListener('click', function(){
  if(!speechSupported) return;
  if(!solutionPaused){
    window.speechSynthesis.pause();
    solutionPaused = true;
    this.textContent = '▶ Devam Et';
  } else {
    window.speechSynthesis.resume();
    solutionPaused = false;
    this.textContent = '⏸ Duraklat';
  }
});

function renderDashboard(){
  const { lvl, next } = getLevel(state.points);
  document.getElementById('agent-level').textContent = lvl.name;
  document.getElementById('agent-points').textContent = state.points;
  const pct = next ? Math.min(100, Math.round(((state.points - lvl.min) / (next.min - lvl.min)) * 100)) : 100;
  document.getElementById('level-progress').style.width = pct + '%';

  const vp = VOICE_PROFILES.find(p => p.id === state.voiceProfile) || VOICE_PROFILES[0];
  document.getElementById('btn-voice').textContent = '🎙️ ' + vp.name;

  renderDragonGrid();

  const badgesRow = document.getElementById('badges-row');
  badgesRow.innerHTML = '';
  GAMES.forEach(g => {
    const tier = state.badges[g.id];
    const slot = document.createElement('div');
    slot.className = 'badge-slot' + (tier ? ' ' + tier : '');
    slot.title = g.title + (tier ? ' — ' + tier : ' — henüz rozet yok');
    slot.textContent = tier ? BADGE_ICON[tier] : g.icon;
    badgesRow.appendChild(slot);
  });

  const grid = document.getElementById('case-grid');
  grid.innerHTML = '';
  GAMES.forEach(g => {
    const best = state.best[g.id];
    const card = document.createElement('div');
    card.className = 'case-card';
    card.innerHTML = `
      <div class="icon">${g.icon}</div>
      <h3>${g.title}</h3>
      <p>${g.desc}</p>
      <div class="stars">${'★'.repeat(g.stars)}${'☆'.repeat(3-g.stars)}</div>
      <div class="best">${g.count ? g.count + ' soru havuzu' : ''}${best ? ' • En iyi: ' + best : ''}</div>
      <button class="start-btn">Göreve Başla →</button>
    `;
    card.querySelector('.start-btn').addEventListener('click', () => startGame(g.id));
    grid.appendChild(card);
  });
}

document.getElementById('btn-back').addEventListener('click', () => { cancelSpeech(); showScreen('screen-dashboard'); renderDashboard(); });
document.getElementById('btn-home').addEventListener('click', () => { cancelSpeech(); showScreen('screen-dashboard'); renderDashboard(); });
document.getElementById('btn-replay').addEventListener('click', () => startGame(runtime.gameId));

/* ================= GAME RUNTIME ================= */
let runtime = { gameId:null, def:null, qIndex:0, correct:0, pointsEarned:0, questions:[] };

function startGame(id){
  const def = GAMES.find(g => g.id === id);
  runtime = { gameId:id, def, qIndex:0, correct:0, pointsEarned:0, questions:[] };
  document.getElementById('g-title').textContent = def.icon + ' ' + def.title;
  showScreen('screen-game');

  if(def.type === 'mcq'){
    runtime.questions = def.gen(def.count);
    renderMCQStep();
  } else if(def.type === 'memory'){
    startMemory(def.count);
  } else if(def.type === 'sequence'){
    runtime.questions = genSiralama(def.count);
    renderSequenceStep();
  } else if(def.type === 'attention'){
    runtime.questions = genDikkat(def.count);
    renderAttentionStep();
  }
}

/* ---- MCQ runner (mantik, matris, sifre, yon) ---- */
function renderMCQStep(){
  const { qIndex, questions } = runtime;
  document.getElementById('g-meta').textContent = `Soru ${qIndex+1}/${questions.length}  •  ⭐ ${runtime.pointsEarned}`;
  const q = questions[qIndex];
  const stage = document.getElementById('game-stage');
  stage.innerHTML = `
    <div class="prompt-box">${q.prompt}</div>
    <div class="options-grid" id="opt-grid"></div>
    <div class="feedback-msg" id="feedback"></div>
    <div class="answer-actions" id="answer-actions" style="display:none;"></div>
  `;
  const grid = document.getElementById('opt-grid');
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => answerMCQ(i));
    grid.appendChild(btn);
  });
}
function answerMCQ(i){
  const q = runtime.questions[runtime.qIndex];
  const buttons = document.querySelectorAll('#opt-grid .opt-btn');
  buttons.forEach(b => b.disabled = true);
  const fb = document.getElementById('feedback');
  if(i === q.correct){
    buttons[i].classList.add('correct');
    runtime.correct++; runtime.pointsEarned += 10;
    fb.textContent = 'Harika! Doğru ipucu 🔎'; fb.className = 'feedback-msg good';
    soundGood();
  } else {
    buttons[i].classList.add('wrong');
    buttons[q.correct].classList.add('correct');
    fb.textContent = 'Doğrusu buydu, üzülme dedektif!'; fb.className = 'feedback-msg bad';
    soundBad();
  }
  showAnswerActions(q.solutionSteps, advanceMCQ);
}
function advanceMCQ(){
  runtime.qIndex++;
  if(runtime.qIndex < runtime.questions.length) renderMCQStep();
  else finishGame(runtime.correct, runtime.questions.length, runtime.pointsEarned);
}
function showAnswerActions(solutionSteps, onNext){
  const box = document.getElementById('answer-actions');
  box.style.display = 'flex';
  box.innerHTML = '';
  if(solutionSteps){
    const solBtn = document.createElement('button');
    solBtn.className = 'pill-btn solution-btn';
    solBtn.textContent = '💡 Çözümü Gör';
    solBtn.addEventListener('click', () => openSolutionModal(solutionSteps));
    box.appendChild(solBtn);
  }
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pill-btn';
  nextBtn.textContent = '➡️ Sonraki';
  nextBtn.addEventListener('click', onNext);
  box.appendChild(nextBtn);
}

/* ---- Memory game ---- */
let memState = null;
function startMemory(pairCount){
  const emojiPool = ['🕵️','🔦','🗝️','🧤','📌','🧭','📎','🔬','🎩','👛','🖋️','🧪'];
  const chosen = sample(emojiPool, pairCount);
  const deck = shuffle([...chosen, ...chosen]).map((emoji, idx) => ({ id: idx, emoji, flipped:false, matched:false }));
  memState = { deck, first:null, second:null, moves:0, matchedCount:0, lock:false };
  document.getElementById('g-meta').textContent = `${pairCount} çift`;
  renderMemory();
}
function renderMemory(){
  const stage = document.getElementById('game-stage');
  stage.innerHTML = `
    <div class="mem-stats"><span>🔁 Hamle: <b id="mem-moves">0</b></span><span>✅ Eşleşen: <b id="mem-matched">0</b>/${memState.deck.length/2}</span></div>
    <div class="memory-grid" id="mem-grid"></div>
    <div class="feedback-msg" id="feedback"></div>
  `;
  const grid = document.getElementById('mem-grid');
  memState.deck.forEach(card => {
    const btn = document.createElement('button');
    btn.className = 'mem-card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
    btn.textContent = (card.flipped || card.matched) ? card.emoji : '❓';
    btn.disabled = card.matched;
    btn.addEventListener('click', () => flipCard(card.id));
    grid.appendChild(btn);
  });
}
function flipCard(id){
  if(memState.lock) return;
  const card = memState.deck.find(c => c.id === id);
  if(card.flipped || card.matched) return;
  card.flipped = true;
  if(memState.first === null){
    memState.first = id;
  } else {
    memState.second = id;
    memState.lock = true;
    memState.moves++;
  }
  renderMemory();
  document.getElementById('mem-moves').textContent = memState.moves;
  document.getElementById('mem-matched').textContent = memState.matchedCount;

  if(memState.second !== null){
    const a = memState.deck.find(c => c.id === memState.first);
    const b = memState.deck.find(c => c.id === memState.second);
    setTimeout(() => {
      if(a.emoji === b.emoji){
        a.matched = true; b.matched = true; memState.matchedCount++;
        soundGood();
      } else {
        a.flipped = false; b.flipped = false;
        soundBad();
      }
      memState.first = null; memState.second = null; memState.lock = false;
      renderMemory();
      if(memState.matchedCount === memState.deck.length/2){
        const idealMoves = memState.deck.length/2;
        const ratio = idealMoves / memState.moves;
        const pts = Math.max(30, Math.round(100 * ratio));
        finishGame(memState.matchedCount, memState.deck.length/2, pts, memState.moves);
      }
    }, 700);
  }
}

/* ---- Sequence game (olayları sırala) ---- */
let seqState = null;
function renderSequenceStep(){
  const story = runtime.questions[runtime.qIndex];
  const shuffled = shuffle(story.steps.map((s,i) => ({ text:s, correctPos:i })));
  seqState = { story, pool: shuffled, answer: [] };
  document.getElementById('g-meta').textContent = `Hikâye ${runtime.qIndex+1}/${runtime.questions.length}  •  ⭐ ${runtime.pointsEarned}`;
  renderSequenceUI();
}
function renderSequenceUI(){
  const stage = document.getElementById('game-stage');
  stage.innerHTML = `
    <div class="prompt-box" style="font-size:1rem;">Adımlara doğru sırayla tıkla 👇</div>
    <div class="seq-lists">
      <div class="seq-pool" id="seq-pool"></div>
      <div class="seq-answer" id="seq-answer"></div>
    </div>
    <div class="seq-controls">
      <button class="pill-btn" id="seq-undo">↩ Geri Al</button>
      <button class="pill-btn" id="seq-check">✓ Kontrol Et</button>
    </div>
    <div class="feedback-msg" id="feedback"></div>
    <div class="answer-actions" id="answer-actions" style="display:none;"></div>
  `;
  const pool = document.getElementById('seq-pool');
  seqState.pool.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'seq-chip';
    btn.textContent = item.text;
    const used = seqState.answer.includes(item);
    btn.disabled = used;
    btn.addEventListener('click', () => {
      seqState.answer.push(item);
      renderSequenceUI();
    });
    pool.appendChild(btn);
  });
  const ans = document.getElementById('seq-answer');
  seqState.answer.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'seq-answer-slot';
    row.innerHTML = `<span class="num">${idx+1}</span> ${item.text}`;
    ans.appendChild(row);
  });
  document.getElementById('seq-undo').disabled = seqState.answer.length === 0;
  document.getElementById('seq-undo').addEventListener('click', () => { seqState.answer.pop(); renderSequenceUI(); });
  document.getElementById('seq-check').disabled = seqState.answer.length !== seqState.story.steps.length;
  document.getElementById('seq-check').addEventListener('click', checkSequence);
}
function checkSequence(){
  const isCorrect = seqState.answer.every((item, idx) => item.correctPos === idx);
  const fb = document.getElementById('feedback');
  document.querySelectorAll('.seq-chip, #seq-check, #seq-undo').forEach(b => b.disabled = true);
  if(isCorrect){
    fb.textContent = 'Hikâyeyi mükemmel çözdün! 🕵️'; fb.className = 'feedback-msg good';
    runtime.correct++; runtime.pointsEarned += 15;
    soundGood();
  } else {
    fb.textContent = 'Sıra biraz karışmış, sorun değil!'; fb.className = 'feedback-msg bad';
    soundBad();
  }
  const steps = [
    `Bu hikâyenin doğru sırasına bakalım.`,
    ...seqState.story.steps.map((s,i) => `${i+1}. adım: ${s}`),
    `Her adım bir öncekinin doğal sonucu olduğu için sıra böyle olur.`
  ];
  showAnswerActions(steps, advanceSequence);
}
function advanceSequence(){
  runtime.qIndex++;
  if(runtime.qIndex < runtime.questions.length) renderSequenceStep();
  else finishGame(runtime.correct, runtime.questions.length, runtime.pointsEarned);
}

/* ---- Attention game (tek farklıyı bul) ---- */
let attnState = null;
function renderAttentionStep(){
  const q = runtime.questions[runtime.qIndex];
  attnState = { q, timeLeft:100, timerId:null, answered:false };
  document.getElementById('g-meta').textContent = `Tur ${runtime.qIndex+1}/${runtime.questions.length}  •  ⭐ ${runtime.pointsEarned}`;
  const stage = document.getElementById('game-stage');
  stage.innerHTML = `
    <div class="prompt-box" style="font-size:1rem;">Farklı olanı bul ve tıkla!</div>
    <div class="attn-timerbar"><div class="attn-timerfill" id="attn-fill"></div></div>
    <div class="attn-grid" id="attn-grid" style="grid-template-columns:repeat(${q.size},44px);"></div>
    <div class="feedback-msg" id="feedback"></div>
    <div class="answer-actions" id="answer-actions" style="display:none;"></div>
  `;
  const grid = document.getElementById('attn-grid');
  const total = q.size * q.size;
  for(let i=0;i<total;i++){
    const cell = document.createElement('button');
    cell.className = 'attn-cell';
    cell.textContent = (i === q.oddIndex) ? q.odd : q.base;
    cell.addEventListener('click', () => answerAttention(i === q.oddIndex));
    grid.appendChild(cell);
  }
  attnState.timerId = setInterval(() => {
    attnState.timeLeft -= 1.6;
    const fill = document.getElementById('attn-fill');
    if(fill) fill.style.width = Math.max(0, attnState.timeLeft) + '%';
    if(attnState.timeLeft <= 0){
      clearInterval(attnState.timerId);
      if(!attnState.answered) answerAttention(false, true);
    }
  }, 100);
}
function answerAttention(isCorrect, timeout){
  if(attnState.answered) return;
  attnState.answered = true;
  clearInterval(attnState.timerId);
  const fb = document.getElementById('feedback');
  document.querySelectorAll('.attn-cell').forEach(c => c.disabled = true);
  if(isCorrect){
    const bonus = Math.max(2, Math.round(attnState.timeLeft/20));
    runtime.correct++; runtime.pointsEarned += 3 + bonus;
    fb.textContent = 'Keskin göz! 👀'; fb.className = 'feedback-msg good';
    soundGood();
  } else {
    fb.textContent = timeout ? 'Süre doldu, bir dahakine!' : 'Bu değildi, tekrar dikkat et!';
    fb.className = 'feedback-msg bad';
    soundBad();
  }
  showAnswerActions(attnState.q.solutionSteps, advanceAttention);
}
function advanceAttention(){
  runtime.qIndex++;
  if(runtime.qIndex < runtime.questions.length) renderAttentionStep();
  else finishGame(runtime.correct, runtime.questions.length, runtime.pointsEarned);
}

/* ================= FINISH / RESULT ================= */
function tierFor(ratio){
  if(ratio >= 0.9) return 'gold';
  if(ratio >= 0.65) return 'silver';
  if(ratio >= 0.4) return 'bronze';
  return null;
}
function finishGame(correct, total, points, moves){
  cancelSpeech();
  const ratio = correct / total;
  const tier = tierFor(ratio);
  const currentRank = BADGE_RANK[state.badges[runtime.gameId] || 'none'];
  if(tier && BADGE_RANK[tier] > currentRank){
    state.badges[runtime.gameId] = tier;
  }
  const levelBefore = levelForPoints(state.points);
  state.points += points;
  const levelAfter = levelForPoints(state.points);
  const levelsGained = Math.max(0, levelAfter - levelBefore);
  const newDragons = levelsGained > 0 ? unlockDragonsForLevelUp(levelsGained) : [];

  const label = moves ? `${correct} eşleşme • ${moves} hamlede` : `${correct}/${total} doğru`;
  const prevBest = state.best[runtime.gameId];
  if(!prevBest || points > (parseInt(prevBest) || 0)){
    state.best[runtime.gameId] = label;
  }
  saveProgress();

  document.getElementById('result-emoji').textContent = tier ? BADGE_ICON[tier] : '🔎';
  document.getElementById('result-title').textContent = tier ? 'Vaka Çözüldü!' : 'İyi Deneme, Dedektif!';
  document.getElementById('result-sub').textContent = tier ? (tier === 'gold' ? 'Altın rozet kazandın!' : tier === 'silver' ? 'Gümüş rozet kazandın!' : 'Bronz rozet kazandın!') : 'Biraz daha pratik yapalım mı?';
  document.getElementById('res-correct').textContent = `${correct}/${total}`;
  document.getElementById('res-points').textContent = points;
  showScreen('screen-result');
  if(tier === 'gold') soundWin(); else if(tier) soundGood();

  if(newDragons.length > 0){
    giftQueue = [];
    setTimeout(() => queueDragonGifts(newDragons), 700);
  }
}

/* ================= INIT ================= */
loadProgress();
