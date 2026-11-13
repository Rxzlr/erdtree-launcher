/* Erdtree Launcher — Arabic/English UI translation layer.
 *
 * The launcher is written in Arabic first. This module translates the rendered
 * DOM in place, so English mode covers every view without duplicating markup.
 * Game data (character names, mod names, Nexus results) is never translated.
 */
(function () {
  const EN = {
    // ---- shell / navigation ----
    'الرئيسية': 'Home',
    'التعديلات': 'Cheats',
    'الشخصيات': 'Characters',
    'المودات': 'Mods',
    'الاعدادات': 'Settings',
    'اللعبة مو شغالة': 'Game not running',
    'اللعبة شغالة': 'Game running',
    'متصل بالتعديلات': 'Connected to cheats',
    'جاهز للتشغيل': 'Ready to launch',
    'اختر ملف اللعبة من الإعدادات': 'Choose the game file in Settings',
    'التعديلات للعب الأوفلاين بس — خلّك Solo.': 'Cheats are for offline play only — stay Solo.',
    'جاري التحميل…': 'Loading…',
    'تصغير': 'Minimize',
    'تكبير': 'Maximize',
    'إغلاق': 'Close',
    'نجهّز الشجرة…': 'Preparing the Erdtree…',

    // ---- errors / dialogs ----
    'تأكيد': 'Confirm',
    'إلغاء': 'Cancel',
    'حفظ': 'Save',
    'خطأ': 'Error',
    'صار خطأ': 'Something went wrong',
    'قبل ما نعدّل': 'Before we edit',
    'كل التعديلات للعب الأوفلاين بس. إذا عدّلت قيم وأنت أونلاين ممكن يتبند حسابك.': 'All cheats are for offline play only. Editing values while online may get your account banned.',
    'تأكد إنك داخل اللعبة بوضع Solo / Offline.': "Make sure you're in Solo / Offline mode.",
    'أنا أوفلاين — كمّل': "I'm offline — continue",
    'مسح مسار اللعبة؟': 'Clear the game path?',
    'بنمسح مسار ملف التشغيل. تقدر تحطه مرة ثانية من الإعدادات.': "We'll clear the executable path. You can set it again from Settings.",
    'مسح': 'Clear',
    'حفظ تشكيلتي': 'Save my loadout',
    'اسم التشكيلة': 'Loadout name',
    'مثال: تشكيلة القتال': 'e.g. Combat loadout',
    'بنحفظ التعديلات المفعّلة الحين، وتقدر ترجع لها من البريستات.': "We'll save the cheats that are enabled now; you can restore them from Presets.",
    'حذف التشكيلة؟': 'Delete loadout?',
    'بنحذف التشكيلة المحفوظة. التعديلات نفسها ما تنحذف.': "We'll delete the saved loadout. The cheats themselves stay as they are.",
    'حذف': 'Delete',
    'تعديل': 'Edit',
    'تفعيل': 'Enable',
    'إيقاف': 'Disable',
    'فتح': 'Open',

    // ---- home ----
    'Elden Ring · لانشر عربي': 'Elden Ring · Launcher',
    'لانشر إلدن رينغ': 'Erdtree Launcher',
    'كل شي تحت الشجرة… تشغيل، مودات، شخصيات، وتعديلات — بدون تعقيد.': 'Everything under the Erdtree… launch, mods, characters and cheats — without the hassle.',
    'كل شيء… بمكان واحد': 'Everything… in one place',
    'لانشر بسيط يفهمه أي واحد من أول مرة. شغّل لعبتك من المسار اللي تختاره، ركّب موداتك، وعدّل قيمك بضغطة.': 'A simple launcher anyone can use from the first try. Start the game from your chosen path, install your mods, and tweak your values in one click.',
    'ملف اللعبة جاهز': 'Game file ready',
    'ما اخترت ملف اللعبة': 'No game file selected',
    'ما اخترت ملف التشغيل بعد': 'No executable selected yet',
    'تشغيل اللعبة': 'Launch Game',
    'اختر ملف تشغيل اللعبة': 'Choose game executable',
    'نشغّل اللعبة من الملف اللي اخترته مباشرة — بدون ستيم.': 'We launch the game directly from your chosen file — no Steam.',
    'اختر ملف nrcs من الإعدادات، وكل تشغيل يروح عليه مباشرة.': 'Pick your nrcs file in Settings; every launch goes straight to it.',
    'ملف اللعبة مو موجود، اختر المسار الصحيح من الاعدادات': 'Game file not found. Choose the correct path in Settings.',
    'صحّح المسار': 'Fix the path',
    'ابدأ بأول مود': 'Start with your first mod',
    'الحفظ': 'Save',
    'ما لقينا حفظ': 'No save found',
    'توليد الفريمات': 'Frame generation',
    'شغال': 'On',
    'طافي': 'Off',
    'مسار الحفظ': 'Save path',
    'غير محدد': 'Not set',
    'للتعديل بس:': 'For cheats only:',
    'خلّك أوفلاين (Solo). التعديل أونلاين ممكن يبند حسابك — واللانشر ما يتجاوز أي حماية.': "Stay offline (Solo). Editing online can get you banned — the launcher doesn't bypass any protection.",
    'خلّك أوفلاين (Solo).': 'Stay offline (Solo).',
    'التعديل أونلاين ممكن يبند حسابك — وعلى مسؤوليتك.': "Editing online may get you banned — at your own risk.",
    'اختيار وضع اللعب': 'Play mode',
    'اختر كيف تبي تشغّل اللعبة. الاختيار ينحفظ تلقائياً.': 'Choose how you want to start the game. Your choice is saved automatically.',
    'Play Normal': 'Play Normal',
    'Play with Seamless Co-op': 'Play with Seamless Co-op',
    'يشتغل من ملف nrcs / eldenring.exe العادي — بدون ستيم.': 'Starts the normal nrcs / eldenring.exe file — no Steam.',
    'يشغّل launch_elden_ring_seamlesscoop.exe مباشرة للعب مع أخوياك.': 'Starts launch_elden_ring_seamlesscoop.exe directly for co-op with friends.',
    'Seamless مثبّت وجاهز': 'Seamless is installed and ready',
    'Seamless مو جاهز — افتح الاعدادات وجرّب Test Seamless': 'Seamless is not ready — open Settings and run Test Seamless',
    'الوضع المختار': 'Selected mode',
    'اللعبة شغالة الحين': 'Game is running',

    // ---- trainer ----
    'التعديلات · أوفلاين': 'Cheats · Offline',
    'شغّل اللي تبيه بضغطة. الأخضر = شغال، الرمادي = طافي.': 'Toggle what you want in one click. Green = active, gray = off.',
    'اتصال باللعبة': 'Connect to game',
    'متصل باللعبة': 'Connected to game',
    'فصل': 'Disconnect',
    'مو متصلين — التفعيل ينحفظ ويتطبق لما تتصل': 'Not connected — toggles are saved and apply when you connect.',
    'تشغيل الكل': 'Turn all on',
    'إيقاف الكل': 'Turn all off',
    'تشكيلات جاهزة أو من حفظك': 'Ready-made or saved loadouts',
    'عناوين التعديلات': 'Cheat offsets',
    'مكان كل تعديل داخل اللعبة — تحطه مرة وحدة وينحفظ': 'Where each cheat lives in memory — set it once and it is saved',
    'حفظ العناوين': 'Save offsets',
    'العنوان': 'Offset',
    'النوع': 'Type',
    'الطريقة': 'Mode',
    'القيمة': 'Value',
    'فاحص القيم': 'Value scanner',
    'دوّر على أي قيمة بنفسك — بحث أول وبحث تالي': 'Find any value yourself — first scan, then next scan',
    'اكتب الرقم اللي تشوفه في اللعبة →': 'Type the number you see in the game →',
    'عدد صحيح': 'Integer',
    'عدد صحيح (رونز/مستوى)': 'Integer (runes/level)',
    'عشري': 'Decimal',
    'عشري (دم/ستامينا)': 'Decimal (HP/stamina)',
    'عشري مزدوج': 'Double',
    'عدد صغير': 'Small number',
    'عدد كبير': 'Big number',
    'بحث أول': 'First scan',
    'بحث تالي': 'Next scan',
    'إعادة': 'Reset',
    'التعديلات تحتاج عنوان (مكان القيمة) لكل تعديل. افتح «عناوين التعديلات» تحت وحطها مرة وحدة — أو استخدم «فاحص القيم» لتدور عليها بنفسك.': 'Cheats need an offset (memory address) for each value. Open “Cheat offsets” below and set them once — or use the “Value scanner” to find them yourself.',
    'العنوان يتغيّر مع تحديثات اللعبة. إذا عندك عنوان جاهز حطه هنا، وإذا ما تعرفه استخدم': 'Offsets change with game updates. If you have one, paste it here; if not, use',
    'تحت. القيمة هي الرقم اللي ينكتب/يثبت وقت التفعيل.': 'below. The value is the number written/frozen when the cheat is enabled.',
    'أضف عنوان التعديل من لوحة العناوين.': 'Add the cheat offset from the offsets panel.',
    'يحتاج عنوان': 'Needs offset',
    'تعديلات محفوظة': 'Saved cheats',
    'آخر تعديل': 'Last edited',
    'اللاعب': 'Player',
    'دم، ستامينا، حركة، وقفز': 'HP, stamina, movement and jump',
    'القتال': 'Combat',
    'ضرر، مهارات، وضربة قاتلة': 'Damage, skills and one-hit kills',
    'الموارد': 'Resources',
    'رونز، أسلحة، دروع، ومناطق': 'Runes, weapons, armor and regions',
    'المتعة': 'Fun',
    'وقت، طقس، تصوير، وإخفاء': 'Time, weather, camera and hiding',
    'دم لا نهائي': 'Infinite HP',
    'دمك يبقى ممتلئ وما ينقص مهما انضربت.': 'Your health stays full no matter how much you get hit.',
    'ستامينا لا نهائية': 'Infinite stamina',
    'تقدر تجري وتضرب بدون ما توقف ستامينا.': 'Run and attack without your stamina running out.',
    'طيران': 'Flight',
    'تطلع وتنزل بحرية في الهواء.': 'Fly up and down freely in the air.',
    'سرعة حركة': 'Movement speed',
    'تمشي وتجري أسرع من الطبيعي.': 'Walk and run faster than normal.',
    'قفز عالي': 'High jump',
    'تقفز أعلى بكثير وتوصل أماكن صعبة.': 'Jump much higher and reach tricky places.',
    'ضرر عالي': 'High damage',
    'ضرباتك تنزل ضرر أكبر على الأعداء.': 'Your hits deal more damage to enemies.',
    'بدون كولداون': 'No cooldown',
    'تقدر تستخدم المهارات على طول بدون انتظار.': 'Use skills instantly with no waiting.',
    'ضربة قاتلة بضربة وحدة': 'One-hit kill',
    'العدو يموت من أول ضربة.': 'Enemies die from a single hit.',
    'رونز لا نهائية': 'Infinite runes',
    'رصيدك من الرونز يبقى كامل دايماً.': 'Your rune count always stays full.',
    'كل الأسلحة': 'All weapons',
    'تضيف لك كل الأسلحة المتوفرة باللعبة.': 'Adds every weapon available in the game.',
    'كل الدروع': 'All armor',
    'تضيف لك كل قطع الدروع والملابس.': 'Adds every armor piece and garment.',
    'فتح كل المناطق': 'Unlock all regions',
    'تفتح نقاط الانتقال والمناطق المخفية.': 'Unlocks fast-travel points and hidden regions.',
    'تغيير الوقت': 'Change time',
    'تحوّل الوقت بين ليل ونهار وقت ما تبغى.': 'Switch between day and night whenever you want.',
    'تغيير الطقس': 'Change weather',
    'تغيّر الجو بين مطر وضباب وصحو.': 'Change the weather between rain, fog and clear skies.',
    'وضع التصوير': 'Photo mode',
    'توقف اللعبة وتاخذ لقطات حلوة.': 'Pause the game and take nice screenshots.',
    'تصوير حر مع تغيير الوقت وإخفاء اللاعب.': 'Free camera with time control and player hiding.',
    'إخفاء اللاعب': 'Hide player',
    'إخفاء': 'Hide',
    'كل شيء': 'Everything',

    // ---- characters ----
    'حفظك · شخصياتك': 'Your save · your characters',
    'كل شخصياتك بأسماءها اللي داخل اللعبة. اختر وحدة وعدّل عليها لحالها.': 'All your characters with their in-game names. Pick one and edit it separately.',
    'مدير الحفظ': 'Save manager',
    'ابحث عن شخصية بالاسم…': 'Search characters by name…',
    'ما لقينا شخصيات في حفظك': 'No characters found in your save',
    'تأكد إنك لعبت وخلّصت أول شخصية، أو حدد ملف الحفظ الصحيح.': "Make sure you've played past the first character, or pick the right save file.",
    'حدد ملف الحفظ': 'Choose save file',
    'ما لقينا شخصية بهذا الاسم.': 'No character with that name.',
    'لكل شخصية تعديلاتها الخاصة. لما تفعّل شخصية، تنطبق تعديلاتها المختارة — وتقدر ترجع لأي شخصية وقت ثاني.': 'Each character has its own cheats. When you enable a character, its selected cheats apply — and you can switch back anytime.',
    'مفعّلة': 'Active',
    'المستوى غير معروف': 'Unknown level',
    'إيقاف الشخصية': 'Disable character',
    'تفعيل الشخصية': 'Enable character',
    'رجوع للشخصيات': 'Back to characters',
    'شخصية من حفظك': 'Character from your save',
    'مفعّلة الحين': 'Active now',
    'مو مفعّلة': 'Not active',
    'تعديلاتها تنحفظ لها لحالها.': 'Its cheats are saved separately.',
    'تعديلاتها تنطبق على اللعبة الحين. أي تغيير تحت ينحفظ لها.': 'Its cheats apply to the game now. Any change below is saved to it.',
    'فعّلها عشان تنطبق تعديلاتها على اللعبة.': 'Enable it so its cheats apply to the game.',
    'ينتظر العنوان': 'Waiting for offset',
    'ينتظر التفعيل': 'Waiting to be enabled',
    'شغال فعلياً': 'Active',

    // ---- saves ----
    'خذ نسخة احتياطية، ارجع لأي نسخة، وبدّل بين حفظاتك بأمان.': 'Back up, restore any copy, and switch between saves safely.',
    'نسخ الحفظ الحالي': 'Back up current save',
    'الحفظ الحالي': 'Current save',
    'موجود': 'Available',
    'ما لقيناه': 'Not found',
    'ما لقينا حفظ اللعبة. شغّل اللعبة مرة وحدة أو حدد مسار الحفظ من الإعدادات.': 'No game save found. Launch the game once, or choose the save path in Settings.',
    'نسخي الاحتياطية': 'My backups',
    'كل نسخة باسمها وتاريخها — تقدر ترجع لها بأي وقت': 'Every copy with its name and date — restore it anytime',
    'تلقائية': 'Automatic',
    'نسخ احتياطي': 'Back up',
    'ما فيه نسخ احتياطية بعد': 'No backups yet',
    'اضغط «نسخ الحفظ الحالي» وبنحفظ لك نسخة بأمان.': 'Press “Back up current save” and we will keep a safe copy for you.',
    'حفظات اللعبة المكتشفة': 'Detected game saves',
    'من مجلد EldenRing عندك': 'From your EldenRing folder',
    'الحالي': 'Current',
    'قبل ما ترجع نسخة،': 'Before restoring a copy,',
    'سكّر اللعبة': 'close the game',
    '. اللانشر يسوي نسخة تلقائية من حفظك الحالي قبل الاسترجاع.': '. The launcher makes an automatic backup of your current save before restoring.',
    'تحميل': 'Restore',

    // ---- mods / nexus ----
    'ثبّت مود من ملف، أو دوّر عليه في Nexus — بدون فك ضغط يدوي.': 'Install a mod from a file, or find it on Nexus — no manual unzipping.',
    'بحث في Nexus Mods': 'Search Nexus Mods',
    'تركيب مود من ملف': 'Install mod from file',
    'مفتاح Nexus (مجاني) للبحث فقط.': 'Nexus key (free) — search only.',
    'حطه مرة وحدة، وبنستخدمه للبحث. التحميل صار من داخل اللانشر عبر رابط مجاني أو من ملف — بدون اشتراك.': 'Save it once and we use it for search. Downloads happen inside the launcher: free direct sources, the in-app Nexus window, or a file — no subscription.',
    'مفتاح Nexus الشخصي…': 'Personal Nexus key…',
    'حفظ المفتاح': 'Save key',
    'فتح Nexus': 'Open Nexus',
    'تجيب المفتاح من Nexus: User Settings → API Access → Personal API Key.': 'Get the key from Nexus: User Settings → API Access → Personal API Key.',
    'اكتب اسم المود… مثال: Seamless Co-op': 'Type a mod name… e.g. Seamless Co-op',
    'بحث': 'Search',
    'الموقع': 'Website',
    'ندور في Nexus…': 'Searching Nexus…',
    'مود من Nexus': 'Mod from Nexus',
    'ينزل…': 'Downloading…',
    'الصفحة': 'Page',
    'ما لقينا نتائج بالاسم — جرّب كلمة ثانية.': 'No results by that name — try another word.',
    'اكتب اسم المود ودوس بحث.': 'Type a mod name and press search.',
    'Mod Engine 2 مو موجود.': 'Mod Engine 2 is missing.',
    'بعض المودات ما تشتغل بدونه. تقدر تحمله من موقعه وتحطه داخل مجلد اللعبة.': "Some mods won't work without it. Download it from its site and place it in the game folder.",
    'ما فيه مودات بعد': 'No mods yet',
    'حمّل مود ZIP، أو اختره من جهازك — نفكّه ونركبه لك تلقائي.': 'Download a mod ZIP, or pick one from your device — we unzip and install it for you.',
    'اختر ملف المود': 'Choose mod file',
    'ينسخ المفعّل إلى:': 'Copies enabled mods to:',
    'حدد ملف اللعبة أول عشان نطبق المودات.': 'Choose the game file first so we can apply mods.',
    'تطبيق على اللعبة': 'Apply to game',
    'مفعّل': 'Enabled',
    'موقوف': 'Disabled',
    'إيقاف المود': 'Disable mod',
    'تشغيل المود': 'Enable mod',
    'غير متوافق': 'Incompatible',
    'فتح مجلد المود': 'Open mod folder',
    'حذف المود': 'Delete mod',
    'هذا المود مو متوافق مع نسختك': "This mod isn't compatible with your game version",
    'ثبّت مود ZIP، أو اختره من جهازك — نفكّه ونركبه لك تلقائي.': 'Install a mod ZIP, or pick one from your device — we unzip and install it for you.',

    // ---- settings ----
    'كل شي هنا ينحفظ لحاله — ما تحتاج تدوس حفظ.': 'Everything here saves automatically — no need to press save.',
    'ملف تشغيل اللعبة': 'Game executable',
    'جاهز': 'Ready',
    'ما اخترت ملف التشغيل (nrcs)': 'No executable selected (nrcs)',
    'كل مرة تدوس': 'Every time you press',
    '، نستخدم هذا الملف مباشرة — بدون ما نروح لستيم. اختر ملف': ', we use this file directly — no Steam. Choose the',
    'اللي عندك.': 'file you have.',
    'تقدر تحدد ملف ثاني إذا تحب.': 'You can choose another file if you want.',
    'تلقائياً نلقى حفظك في': 'We automatically find your save in',
    'تحسين الأداء — DLSS': 'Performance boost — DLSS',
    'كرتك ما يدعم DLSS': "Your GPU doesn't support DLSS",
    'تقدر تختار «إيقاف» بس. باقي الخيارات تظهر لك عشان تعرف وش تسوي على كرت يدعم DLSS.': 'You can only choose “Off”. The other options are shown so you know what they do on a DLSS-capable GPU.',
    'توليد فريمات — Frame Generation': 'Frame generation — Frame Generation',
    'كرتك ما يدعم توليد الفريمات.': "Your GPU doesn't support frame generation.",
    'مفتاح Nexus': 'Nexus key',
    'محفوظ': 'Saved',
    'اختياري': 'Optional',
    'الصق مفتاح Nexus هنا…': 'Paste your Nexus key here…',
    'المفتاح مجاني من Nexus ويُستخدم للبحث فقط. تحميل المودات صار من روابط مجانية داخل اللانشر أو من ملف.': 'The key is free from Nexus and used for search only. Mods download inside the launcher from free sources, the in-app Nexus window, or a file.',
    'المجلدات': 'Folders',
    'بيانات اللانشر': 'Launcher data',
    'مجلد المودات': 'Mods folder',
    'نسخ الحفظ': 'Save backups',
    'عن اللانشر': 'About the launcher',
    'لانشر أوفلاين بسيط. ما يتجاوز Easy Anti-Cheat ولا يحاول يخفي نفسه. التعديل أونلاين مسؤوليته على المستخدم.': "A simple offline launcher. It doesn't bypass Easy Anti-Cheat or try to hide itself. Online editing is the user's responsibility.",
    'تحذير قبل التعديل': 'Warn before editing',
    'يظهر تنبيه الأوفلاين قبل أول تعديل': 'Shows the offline warning before your first edit',
    'لغة اللانشر': 'Launcher language',
    'اختر لغة الواجهة. التغيير ينطبق فوراً وينحفظ.': 'Choose the interface language. The change applies instantly and is saved.',
    'العربية': 'العربية',
    'الإنجليزية': 'English',
    'مثبّت': 'Installed',
    'مو مثبّت': 'Not installed',
    'إصدار': 'Version',
    'ملف التشغيل العادي': 'Normal executable',
    'ملف Seamless': 'Seamless executable',

    // DLSS options
    'إيقاف DLSS': 'DLSS off',
    'جودة': 'Quality',
    'متوازن': 'Balanced',
    'أداء': 'Performance',
    'أداء فائق': 'Ultra Performance',
    'الصورة تبقى على طبيعتها بدون أي تغيير.': 'The image stays natural with no change.',
    'أفضل صورة ممكنة، والفريمات تزيد شوي بس.': 'Best image quality, with only a small frame boost.',
    'توازن حلو بين جودة الصورة وسرعة اللعب.': 'A nice balance between image quality and performance.',
    'فريمات أعلى وجودة أقل — مناسب للأجهزة المتوسطة.': 'Higher frames and lower quality — good for mid-range PCs.',
    'أعلى فريمات وأقل جودة — للعب السلس على حساب الشكل.': 'Highest frames and lowest quality — smooth play at the cost of looks.',
    'هذا الكرت ما يدعم DLSS.': "This GPU doesn't support DLSS.",
    'كرتك ما يدعم DLSS — لا تشغل الخيارات.': "Your GPU doesn't support DLSS — leave it off.",
    'NVIDIA GeForce RTX 3060 · الاختيار ينحفظ تلقائياً.': 'NVIDIA GeForce RTX 3060 · your choice is saved automatically.',

    // ---- seamless / new UI (fixed English labels are intentionally kept) ----
    'Seamless Co-op - Multiplayer': 'Seamless Co-op - Multiplayer',
    'Password': 'Password',
    'Player Name': 'Player Name',
    'Max Players': 'Max Players',
    'Test Seamless': 'Test Seamless',
    'Open seamlesscoop.ini': 'Open seamlesscoop.ini',
    'Session password': 'Session password',
    'Your name': 'Your name',
    'جاهز للعب': 'Ready to play',
    'ناقص ملفات': 'Missing files',
    'اختبار Seamless': 'Seamless test',
    'كل الملفات موجودة والإعدادات سليمة.': 'All files are present and the configuration is valid.',
    'فيه ملفات أو إعدادات ناقصة — شوف التفاصيل تحت.': 'Some files or settings are missing — see the details below.',
    'يتم الحفظ تلقائياً': 'Saves automatically',
    'كلمة السر تُكتب في [PASSWORD] cooppassword داخل ملف seamlesscoop.ini.': 'The password is written to [PASSWORD] cooppassword in seamlesscoop.ini.',
    'الاسم يُكتب في steam_emu.ini (UserName) ويظهر لأصحابك داخل اللعبة.': 'The name is written to steam_emu.ini (UserName) and shown to your friends in-game.',
    'Seamless 2.x يدعم حتى 127 لاعب. هذا الرقم يُحفظ كحجم الحفلة المفضّل عندك.': 'Seamless 2.x supports up to 127 players. This value is saved as your preferred party size.',
    'حجم الحفلة المفضّل': 'Preferred party size',
    'تحذير: كلمة السر فاضية. أي واحد يعرف كلمة السر الفاضية يقدر يدخل.': 'Warning: the password is empty. Anyone using the same blank password can join.',
    'غير جاهز': 'Not ready',
    'Seamless جاهز — بنشغّله مباشرة بدون ستيم.': 'Seamless is ready — launching directly, no Steam.',
    'تم اختيار Seamless — بنشغّله مباشرة بدون ستيم.': 'Seamless selected — it will launch directly, no Steam.',
    'تم اختيار الوضع العادي — بنشغّله مباشرة بدون ستيم.': 'Normal mode selected — it will launch directly, no Steam.',
    'Seamless جاهز — كل الملفات موجودة.': 'Seamless is ready — all files are present.',
    'Seamless فيه ملفات أو إعدادات ناقصة — شوف التفاصيل تحت.': 'Seamless has missing files or settings — see details below.',
    'أصلح الناقص ثم اضغط Test Seamless مرة ثانية.': 'Fix what is missing, then press Test Seamless again.',
    'Seamless جاهز — تقدر تدخل مع أخوياك بنفس كلمة السر.': 'Seamless is ready — you can join your friends with the same password.',
    'مثبّت في:': 'Installed in:',
    'ما لقينا مجلد اللعبة — حدد مسار اللعبة فوق.': "We couldn't find the game folder — set the game path above.",
    '. تقدر تحدد ملف ثاني إذا تحب.': '. You can choose another file if you want.',
    '. كل شي ينحفظ تلقائياً.': '. Everything saves automatically.',
    '. والاسم يُكتب في': '. The name is written to',
    'Language / اللغة': 'Language',
    'RTL · لانشر عربي': 'RTL · Arabic launcher',
    'أول مرة؟': 'First time?',
    'إذا اخترت نفس القيمة': 'If you pick the same value',
    'اتصل باللعبة أول عشان تقدر تفحص القيم.': 'Connect to the game first so you can scan values.',
    'اضغط الزر عشان تشغّله.': 'Press the button to enable it.',
    'اكتشاف تلقائي': 'Auto-detect',
    'البحث التالي': 'Next scan mode',
    'البريستات': 'Presets',
    'التعديل': 'Edit',
    'القيمة الجديدة (اختياري)': 'New value (optional)',
    'القيمة اللي تشوفها': 'The value you see',
    'النتائج تطلع هنا.': 'Results appear here.',
    'تختفي شخصيتك من الكاميرا.': 'Your character disappears from the camera.',
    'تغيّرت': 'Changed',
    'داخل': 'inside',
    'دم وستامينا ما ينقصون — تقدر تتحمل أي قتال.': 'HP and stamina never drain — tank any fight.',
    'رونز وكل الأسلحة والدروع وكل المناطق.': 'Runes, all weapons, armor and every region.',
    'زادت': 'Increased',
    'ضرر عالي وضربة قاتلة وبدون كولداون.': 'High damage, one-hit kills and no cooldown.',
    'عربي': 'Arabic',
    'فتح مجلد اللعبة': 'Open game folder',
    'قفل مستمر': 'Persistent freeze',
    'كلمة السر تُكتب في': 'The password is written to',
    'ما تغيّرت': 'Unchanged',
    'مثال: 12500': 'e.g. 12500',
    'مرة وحدة': 'once',
    'نفس القيمة': 'Same value',
    'نقصت': 'Decreased',
    'نوع القيمة': 'Value type',
    'ينحفظ تلقائياً بعد الحفظ، ويتطبق على التعديلات المفعّلة.': 'Saves automatically and applies to enabled cheats.',
    'يُحفظ اختيارك ويُطبّق عند تشغيل اللعبة مع مود DLSS.': 'Your choice is saved and applied when launching with the DLSS mod.',
    '→ غيّره داخل اللعبة (مثلاً اشتري شي) → اكتب الرقم الجديد →': '→ change it in-game (e.g. buy something) → type the new value →',
    '→ كرّر لين تبقى نتيجة وحدة.': '→ repeat until a single result remains.',
    'تم حفظ الإعدادات وتطبيقها على ملف Seamless.': 'Settings saved and applied to the Seamless config.',
    'ما نقدر نعدّل ملف Seamless — تأكد إنه مثبّت.': "We couldn't edit the Seamless config — make sure it is installed.",
    'ما لقينا ملف إعدادات Seamless. ركّب Seamless أول.': 'Seamless config not found. Install Seamless first.',
    'Seamless مو جاهز — فيه ملفات ناقصة. افتح «فحص Seamless» في الإعدادات.': 'Seamless is not ready — files are missing. Open “Test Seamless” in Settings.',
    'هذا ملف Seamless. اختر ملف التشغيل العادي (nrcs أو eldenring.exe) — وللعب كوب اختار «Play with Seamless Co-op».': 'This is a Seamless file. Choose the normal executable (nrcs or eldenring.exe) — and use “Play with Seamless Co-op” for co-op.',
    'اللغة غير معروفة.': 'Unknown language.',
    'وضع التشغيل غير معروف.': 'Unknown play mode.',
    'عدد اللاعبين لازم يكون بين 2 و 127.': 'Max Players must be between 2 and 127.',
    'ما لقينا ملف إعدادات Seamless.': 'Seamless config not found.',
    'ملف إعدادات Seamless مو موجود.': 'Seamless config file not found.',
    'تم إرسال أمر التشغيل — انتظر اللعبة تفتح.': 'Launch command sent — wait for the game to open.',
    'بنشغّل Seamless مباشرة — بدون ستيم.': 'Starting Seamless directly — no Steam.',
    'بنشغّل الوضع العادي — بدون ستيم.': 'Starting normal mode — no Steam.',
    'تم حفظ مسار اللعبة.': 'Game path saved.',
    'لقينا اللعبة وحفظنا المسار.': 'Game found and path saved.',
    'ما لقينا اللعبة تلقائياً — اختر الملف يدوي.': "Couldn't find the game automatically — choose the file manually.",
    'انحفظ مسار اللعبة.': 'Game path saved.',
    'انحفظ مسار الحفظ.': 'Save path saved.',
    'لقينا حفظك تلقائياً.': 'Save found automatically.',
    'تم الاتصال باللعبة.': 'Connected to the game.',
    'انفصلنا عن اللعبة.': 'Disconnected from the game.',
    'شغّلنا كل التعديلات.': 'All cheats turned on.',
    'وقّفنا كل التعديلات.': 'All cheats turned off.',
    'انحفظت تشكيلتك.': 'Loadout saved.',
    'تم تفعيل البريست.': 'Preset applied.',
    'انحفظت العناوين.': 'Offsets saved.',
    'تم.' : 'Done.',
    'فشل الاتصال بالتطبيق': 'Failed to reach the app',
  };

  // ---- verified trainer (v2) strings ----
  Object.assign(EN, {
    'تشتغل فعلياً داخل اللعبة — بدون عناوين ولا إعدادات. فعّل والعب.': 'Actually works inside the game — no offsets, no setup. Toggle and play.',
    'متصلين — التعديلات تتطبق وتتأكد كل ثانية': 'Connected — cheats apply and re-verify every second',
    'شغّل اللعبة واضغط اتصال': 'Launch the game, then connect',
    'شخصيتك الآن': 'Your character right now',
    'اختبر أن الكتابة تشتغل': 'Test that writing works',
    'الدم': 'HP',
    'الفوكس': 'FP',
    'الستامينا': 'Stamina',
    'الرونز': 'Runes',
    'المستوى': 'Level',
    'أساس الشخصية': 'Character base',
    'داخل اللعبة': 'In game',
    'بانتظار الشخصية': 'Waiting for character',
    'غير متصل': 'Not connected',
    'بانتظار ما تحمّل شخصيتك': 'Waiting for you to load a character',
    'من قائمة اللعبة اختر Continue — أول ما تدخل، القيم بتظهر هنا والتعديلات المفعّلة بتشتغل لحالها.': 'Pick Continue from the game menu — once you load in, values appear here and enabled cheats apply automatically.',
    'شغّل اللعبة من الرئيسية، وبعدها اضغط «اتصال باللعبة».': 'Launch the game from Home, then press “Connect to game”.',
    'منع الموت': 'No death',
    'حتى لو نزل دمك للصفر ما تموت — اللعبة تعتبرك حي.': 'Even at zero HP you do not die — the game treats you as alive.',
    'بدون ضرر': 'No damage',
    'الضربات ما تنقص دمك نهائياً.': 'Hits do not reduce your HP at all.',
    'فوكس لا نهائي': 'Infinite FP',
    'الفوكس (FP) ما ينقص — استخدم المهارات براحتك.': 'FP never drains — use skills freely.',
    'ستامينا لا نهائية': 'Infinite stamina',
    'تقدر تجري وتضرب بدون ما توقف ستامينا.': 'Run and attack without stamina running out.',
    'تعبئة الدم': 'Refill HP',
    'يرجّع دمك كامل ١٠٠٪ بضغطة — مرة وحدة.': 'Restores your HP to 100% in one click.',
    'تعبئة الفوكس': 'Refill FP',
    'يرجّع الفوكس كامل بضغطة — مرة وحدة.': 'Restores your FP to full in one click.',
    'تعبئة الستامينا': 'Refill stamina',
    'يرجّع الستامينا كاملة بضغطة — مرة وحدة.': 'Restores your stamina to full in one click.',
    'الأدوات ما تنقص': 'Items never run out',
    'أي أداة تستخدمها (جرعات، سهام، أغراض) ما ينقص عددها.': 'Anything you use (flasks, arrows, items) keeps its count.',
    'تعطيل هجومك': 'Disable your attack',
    'يمنع شخصيتك من الهجوم — للتجارب والتصوير.': 'Prevents your character from attacking — for testing and screenshots.',
    'تجميد الحركة': 'Freeze movement',
    'توقف شخصيتك عن الحركة — للتجارب.': 'Stops your character from moving — for testing.',
    'تجميد الشخصية': 'Freeze character',
    'يوقف تحديث شخصيتك (No Update) — تجربة متقدمة.': 'Stops your character update (No Update) — advanced.',
    'رونز ٩٩٩ مليون': '999M runes',
    'يثبّت رصيد الرونز على ٩٩٩,٩٩٩,٩٩٩ — يبقى ثابت.': 'Pins your rune balance to 999,999,999.',
    'تسريع الحركة': 'Faster animation',
    'يخلي حركات شخصيتك أسرع (سرعة الأنميشن ×١.٦).': 'Speeds up your character animation (×1.6).',
    'دم، فوكس، ستامينا، وتعبئة فورية': 'HP, FP, stamina and instant refills',
    'أدوات ما تنقص، وتعطيل الهجوم/الحركة': 'Endless items, attack/movement control',
    'رونز ثابتة': 'Pinned runes',
    'سرعة أنميشن الشخصية': 'Character animation speed',
    'مرة وحدة': 'One shot',
    'عبّئ الآن': 'Refill now',
    'شغال الآن': 'Active now',
    'ينتظر الاتصال': 'Waiting for connection',
    'ينتظر الشخصية': 'Waiting for character',
    'فعّله عشان يشتغل داخل اللعبة.': 'Enable it to apply inside the game.',
    'مطبّق داخل اللعبة ومؤكد بالقراءة.': 'Applied in game and verified by read-back.',
    'شغّل اللعبة واضغط «اتصال باللعبة».': 'Launch the game and press “Connect to game”.',
    'حمّل شخصيتك (Continue) وهو يشتغل تلقائياً.': 'Load your character (Continue) and it applies automatically.',
    'اضغط الزر عشان يعبّي القيمة داخل اللعبة.': 'Press the button to refill the value in game.',
    'فاحص القيم (متقدم)': 'Value scanner (advanced)',
    'لو تبي تدور على قيمة بنفسك — بحث أول وبحث تالي': 'Find a value yourself — first scan, then next scan',
    'تعديل تجريبي — قد يجمّد شخصيتك': 'Experimental — may freeze your character',
    'تمت التعبئة داخل اللعبة ✓': 'Refilled inside the game ✓',
    'اللعبة مو شغالة — شغّلها وادخل شخصيتك أول.': 'The game is not running — launch it and load your character first.',
    'التشكيلة انحفظت. اتصل باللعبة عشان تشتغل.': 'Loadout saved. Connect to the game to apply it.',
    'الخالد': 'Undying',
    'ما تموت، بدون ضرر، وفوكس وستامينا لا نهائية.': 'No death, no damage, infinite FP and stamina.',
    'المستكشف': 'Explorer',
    'منع الموت وستامينا لا نهائية وحركة أسرع — تنقّل حر.': 'No death, infinite stamina and faster animation — roam freely.',
    'ثري الحرب': 'War rich',
    'رونز ٩٩٩ مليون ثابتة — اشترِ اللي تبي.': '999M runes pinned — buy whatever you want.',
    'غرفة التجارب': 'Test chamber',
    'تحكم كامل بالشخصية: بدون هجوم أو حركة أو تحديث.': 'Full control: no attack, no movement, no update.',

    // ---- workshop ----
    'الورشة · Elden Ring Mods': 'Workshop · Elden Ring Mods',
    'ورشة المودات': 'Mod workshop',
    'اختر مود، خلّ التحميل يخلص، ويطلع لك في «المثبتة» — فعّله بضغطة.': 'Pick a mod, let it download, and it lands in “Installed” — activate it in one click.',
    'اختر مود، خلّ التحميل يخلص، ويطلع في «موداتي» — فعّله بضغطة.': 'Pick a mod, let it download, and it lands in “My mods” — activate it in one click.',
    'موداتي': 'My mods',
    'بحث Nexus': 'Nexus search',
    'من رابط': 'From URL',
    'من ملف': 'From file',
    'The Lands Between · Workshop': 'The Lands Between · Workshop',
    'اختر… نزّل… فعّل': 'Choose… download… activate',
    'مودات إلدن رينغ المعروفة بمكان واحد: تحميل مباشر للي نقدر نوفرّه، وفتح Nexus لباقي المودات مع تركيب من ملف.':
      'Elden Ring’s best-known mods in one place: direct downloads where possible, and Nexus plus file install for the rest.',
    'مود بالورشة': 'mods in workshop',
    'Mod Engine 2 جاهز': 'Mod Engine 2 ready',
    'Mod Engine 2 مو موجود': 'Mod Engine 2 missing',
    'تصفح الورشة': 'Browse workshop',
    'ثبّت Mod Engine 2': 'Install Mod Engine 2',
    'اكتشف': 'Discover',
    'المثبتة': 'Installed',
    'تحديث': 'Refresh',
    'تركيب من رابط مباشر': 'Install from direct URL',
    'الرابط لازم يكون ملف ZIP/7z/RAR مباشر (من GitHub أو مرآة). ملفات Nexus تحتاج تسجيل دخول — نزّلها من المتصفح واستخدم «من ملف».':
      'The link must point straight at a ZIP/7z/RAR (GitHub or a mirror). Nexus files need a login — download them in the browser and use “From file”.',
    'موداتك ما راح تشتغل بدون Mod Engine 2.': 'Your mods will not load without Mod Engine 2.',
    'ثبّته مرة وحدة من الورشة — تحميل مباشر.': 'Install it once from the workshop — direct download.',
    'ثبّت المحرك': 'Install the engine',
    'ما فيه مودات مثبتة بعد': 'No mods installed yet',
    'روح «اكتشف» واختر مود، أو ثبّت واحد من ملف. بمجرد ما يخلص التحميل يطلع هنا.':
      'Open “Discover” and pick a mod, or install one from a file. As soon as a download finishes it appears here.',
    'دوّر بالورشة: اسم مود، كلمة، أو وسم…': 'Search the workshop: mod name, keyword, or tag…',
    'الكل': 'All',
    'تعديلات شاملة': 'Overhauls',
    'قتال وسحر': 'Combat & magic',
    'عالم ومحتوى': 'World & content',
    'شخصيات وأزياء': 'Characters & fashion',
    'أدوات وجودة حياة': 'Tools & quality of life',
    '«تحميل مباشر» ينزل ويثبت من داخل اللانشر.': '“Direct download” installs from inside the launcher.',
    '«Nexus» يحتاج رابط مجاني أو ملف — بدون اشتراك.': '“Nexus” opens a small window inside the launcher: one login, one click — no subscription.',
    'مسار اللعبة مو محدد — تقدر تتصفح، لكن التثبيت داخل اللعبة يحتاج مسار صحيح.':
      'Game path is not set — you can browse, but installing into the game needs a valid path.',
    'ما لقينا مود بهذا الوصف. جرّب كلمة ثانية أو «بحث Nexus».': 'No mod matches that. Try another word or “Nexus search”.',
    'نصيحة: ابدأ بـ Mod Engine 2 — أغلب مودات Nexus ما تشتغل بدونه.': 'Tip: start with Mod Engine 2 — most Nexus mods need it.',
    'نجهّز التحميل…': 'Preparing download…',
    'ينزل من المصدر': 'Downloading',
    'نفك ونثبّت': 'Extracting & installing',
    'خلص التثبيت': 'Installed',
    'فشل التثبيت': 'Install failed',
    'تحميل مباشر': 'Direct download',
    'مختار': 'Featured',
    'مثبّت': 'Installed',
    'مثبّت وجاهز': 'Installed & ready',
    'إيقاف المود': 'Disable mod',
    'تفعيل المود': 'Enable mod',
    'مفعّل داخل اللعبة': 'Active in game',
    'موقوف': 'Disabled',
    'تثبيت': 'Install',
    'تفاصيل': 'Details',
    'تثبيت الآن': 'Install now',
    'المصدر:': 'Source:',
    'تم تثبيت': 'Installed',
    'Seamless جاهز — كلمة السر محفوظة بالورشة وتنطبق عند التشغيل.': 'Seamless is ready — the password is saved and applies on launch.',
    'حط رابط تحميل مباشر يبدأ بـ https://': 'Paste a direct download link starting with https://',
    'تم التحميل والتركيب — المود في «المثبتة».': 'Downloaded and installed — the mod is in “Installed”.',
    'تحدّثت الورشة.': 'Workshop refreshed.',
    'انفعّل المود لكن التطبيق فشل:': 'The mod is enabled but applying it failed:',
    'المود مفعّل داخل اللعبة.': 'The mod is active in game.',
    'المود انوقف.': 'The mod is disabled.',
    'ما قدرنا نحمّل الورشة.': 'Could not load the workshop.',
    'مجتمع': 'Community',
  });

  // ---- first-run wizard + co-op password ----
  Object.assign(EN, {
    'كلمة سر الكو-أوب': 'Co-op password',
    '— نفسها عندك وعند أخوياك': '— same on your PC and your friends’',
    'مثال: erdtree-coop': 'e.g. erdtree-coop',
    'نسخ': 'Copy',
    'الحالية:': 'Current:',
    'ما فيه كلمة سر بعد — حدد وحدة، احفظها، وأرسلها لأخوياك.': 'No password yet — pick one, save it, and send it to your friends.',
    'شاركها مع أخوياك عشان يدخلون نفس العالم.': 'share it with your friends so they join the same world.',
    'ثبّت Seamless تلقائياً': 'Install Seamless automatically',
    'نثبّت Seamless…': 'Installing Seamless…',
    'انحفظت كلمة السر وانكتبت في Seamless — شاركها مع أخوياك.': 'Password saved and written into Seamless — share it with your friends.',
    'انكتبت كلمة السر في الحافظة — أرسلها لأخوياك.': 'Password copied to the clipboard — send it to your friends.',
    'ما فيه كلمة سر محفوظة بعد.': 'No saved password yet.',
    'اكتب كلمة السر أول — نفسها لازم تكون عند أخوياك.': 'Type the password first — your friends must use the same one.',
    'أهلاً بك في Erdtree Launcher': 'Welcome to Erdtree Launcher',
    'خلّنا نجهّز كل شي بثلاث خطوات قصيرة — نفس الخطوات تسويها عند أخوياك عشان تلعبون سوا.':
      'Let us set everything up in three short steps — your friends follow the same steps to play together.',
    'اكتشف اللعبة': 'Detect the game',
    'اختر ملف التشغيل': 'Choose the game executable',
    'لقينا اللعبة:': 'Game found:',
    'ما لقينا اللعبة تلقائياً. اضغط «اكتشف» أو اختر ملف التشغيل بنفسك.':
      'We could not find the game automatically. Press “Detect” or pick the executable yourself.',
    'ما لقينا اللعبة تلقائياً — اختر ملف التشغيل يدوياً.': 'Game not found automatically — pick the executable manually.',
    'اللانشر يشغّل اللعبة مباشرة بدون ستيم، والتعديلات أوفلاين فقط.':
      'The launcher starts the game directly without Steam; cheats are offline only.',
    'Seamless Co-op وكلمة السر': 'Seamless Co-op & password',
    'كلمة السر نفسها لازم تكون عندك وعند كل أخوياك — اللي ما يعرفها ما يدخل عالمكم.':
      'Everyone must use the same password — anyone without it cannot join your world.',
    'اسمك داخل اللعبة': 'Your in-game name',
    'Seamless مو مثبّت بعد — ثبّته بضغطة (تحميل مباشر من GitHub).':
      'Seamless is not installed yet — install it in one click (direct download from GitHub).',
    'حدد مجلد اللعبة أول (خطوة ١).': 'Set the game folder first (step 1).',
    'اكتب كلمة السر أول عشان تنكتب في إعدادات Seamless.':
      'Type the password first so it can be written into the Seamless config.',
    'تغيير كلمة السر هنا ينطبق على ملف الإعدادات مباشرة.': 'Changing the password here applies to the config file directly.',
    'جاهز… خلّنا نبدأ': 'Ready… let us start',
    'اختر وضع التشغيل الافتراضي، وتقدر تغيّره أي وقت من الرئيسية.':
      'Pick the default launch mode; you can change it anytime from Home.',
    'لعب فردي عادي': 'Regular single-player',
    'مع أخوياك بنفس كلمة السر': 'With your friends, same password',
    'اللعبة مربوطة': 'Game linked',
    'اللعبة مو محددة — تقدر تكمل وتضبطها لاحقاً': 'Game not set — you can continue and fix it later',
    'Seamless مثبّت': 'Seamless installed',
    'Seamless مو مثبّت — اللعب الجماعي يحتاجه': 'Seamless not installed — co-op needs it',
    'كلمة السر:': 'Password:',
    'بدون': 'none',
    '— شاركها مع أخوياك': '— share it with your friends',
    'خلّك Solo داخل اللعبة عند استخدام التعديلات — استخدامها أونلاين قد يبند الحساب.':
      'Stay Solo in game while using cheats — online use may get the account banned.',
    'تخطي': 'Skip',
    'رجوع': 'Back',
    'التالي': 'Next',
    'ابدأ — كل شي جاهز': 'Start — everything is ready',
    'نحفظ كلمة السر…': 'Saving the password…',
    'ننزل Seamless من GitHub…': 'Downloading Seamless from GitHub…',
    'Seamless انثبّت — كلمة السر انكتبت في إعداداته.': 'Seamless installed — the password was written into its config.',
    'نجهّز الإعدادات…': 'Finishing setup…',
    'كل شي جاهز — شارك كلمة السر مع أخوياك والعبوا سوا.': 'Everything is ready — share the password with your friends and play together.',
    'تقدر تفتح معالج الإعداد أي وقت من الاعدادات.': 'You can reopen the setup wizard anytime from Settings.',
    'معالج الإعداد': 'Setup wizard',
    'خلصت الإعداد': 'Setup complete',
    'لسى': 'Not yet',
    'يرجع يفتح خطوات الإعداد: ربط اللعبة، كلمة سر Seamless، ووضع التشغيل. مفيد أول ما ترسل اللانشر لأخوياك.':
      'Reopens the setup steps: linking the game, Seamless password, and launch mode. Handy when sending the launcher to friends.',
    'افتح معالج الإعداد': 'Open setup wizard',
    'نجهّز التحميل…': 'Preparing download…',
    'نحتاج صلاحيات مسؤول': 'Administrator permissions needed',
    'اللعبة شغالة بصلاحيات أعلى من اللانشر، وويندوز يمنعنا نقرأ ذاكرتها.':
      'The game runs with higher privileges than the launcher, and Windows blocks us from reading its memory.',
    'نقدر نعيد تشغيل اللانشر كمسؤول الحين — بعدها ارجع واضغط «اتصال باللعبة».':
      'We can restart the launcher as administrator now — then come back and press “Connect to game”.',
    'إعادة التشغيل كمسؤول': 'Restart as administrator',
    'Seamless Co-op — اللعب الجماعي': 'Seamless Co-op — Multiplayer',
    'كلمة سر مشتركة — اللي ما يعرفها ما يقدر يدخل جلستكم.':
      'A shared password — anyone without it cannot join your session.',
    'كلمة سر الجلسة': 'Session password',
    'اسم اللاعب': 'Player name',
    'الاسم اللي يشوفه أصحابك فوق شخصيتك.': 'The name your friends see above your character.',
    'اسمك': 'Your name',
    'أقصى عدد لاعبين': 'Max players',
    'حجم الحفلة اللي تفضّله — Seamless 2.x يستقبل حتى 127 لاعب.':
      'Your preferred party size — Seamless 2.x hosts up to 127 players.',
    'فتح seamlesscoop.ini': 'Open seamlesscoop.ini',
    'ندوّر على اللعبة تلقائياً…': 'Detecting the game automatically…',
  });

  const MONTHS = {
    يناير: 'Jan', فبراير: 'Feb', مارس: 'Mar', أبريل: 'Apr', مايو: 'May', يونيو: 'Jun',
    يوليو: 'Jul', أغسطس: 'Aug', سبتمبر: 'Sep', أكتوبر: 'Oct', نوفمبر: 'Nov', ديسمبر: 'Dec',
  };
  const AR_DATE = /^(\d{1,2}) (يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر) (\d{4})(?: في (\d{1,2}):(\d{2}) (ص|م))?$/;

  const PATTERNS = [
    [AR_DATE, (m) => `${MONTHS[m[2]]} ${m[1]}, ${m[3]}${m[4] ? `, ${m[4]}:${m[5]} ${m[6] === 'ص' ? 'AM' : 'PM'}` : ''}`],
    [/^(\d+) مود مفعّل$/, (m) => `${m[1]} mods enabled`],
    [/^(\d+) شخصية$/, (m) => `${m[1]} characters`],
    [/^(\d+) شخصية من حفظك$/, (m) => `${m[1]} characters from your save`],
    [/^(\d+) تعديل$/, (m) => `${m[1]} cheats`],
    [/^(\d+) تعديل مفعّل من (\d+)$/, (m) => `${m[1]} of ${m[2]} cheats enabled`],
    [/^(\d+) مفعّل$/, (m) => `${m[1]} enabled`],
    [/^(\d+) مفعّل من (\d+)$/, (m) => `${m[1]} of ${m[2]} enabled`],
    [/^(\d+) يحتاج عنوان$/, (m) => `${m[1]} need offsets`],
    [/^(\d+) شغال فعلياً$/, (m) => `${m[1]} active`],
    [/^(\d+) مفعّل · (\d+) موقوف · (\d+) مود$/, (m) => `${m[1]} enabled · ${m[2]} disabled · ${m[3]} mods`],
    [/^(\d+) مود بالورشة$/, (m) => `${m[1]} mods in workshop`],
    [/^(\d+) مثبّت$/, (m) => `${m[1]} installed`],
    [/^(\d+) تحميل مباشر$/, (m) => `${m[1]} direct downloads`],
    [/^تم تثبيت (.+)\.$/, (m) => `Installed ${m[1]}.`],
    [/^(\d+) نتيجة من Nexus$/, (m) => `${m[1]} Nexus results`],
    [/^([\d,]+) تحميل$/, (m) => `${m[1]} downloads`],
    [/^(\d+) ملف$/, (m) => `${m[1]} files`],
    [/^المستوى (\d+)$/, (m) => `Level ${m[1]}`],
    [/^المستوى (\d+) · خانة (\d+)$/, (m) => `Level ${m[1]} · Slot ${m[2]}`],
    [/^المستوى غير معروف · خانة (\d+)$/, (m) => `Unknown level · Slot ${m[1]}`],
    [/^(\d+) تعديل محفوظ لهذه الشخصية$/, (m) => `${m[1]} cheats saved for this character`],
    [/^بايت$/, () => 'B'],
  ];

  // Ambiguous Arabic words that need context-specific English.
  const CTX = {
    restore: 'Restore',
    download: 'Download',
    'dlss-off': 'Off',
    'dlss-quality': 'Quality',
    'dlss-balanced': 'Balanced',
    'dlss-performance': 'Performance',
    'dlss-ultra': 'Ultra Performance',
    'mod-on': 'Enabled',
    'mod-off': 'Disabled',
  };

  let current = 'ar';
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

  function translateValue(value) {
    if (current !== 'en') return value;
    const core = norm(value);
    if (!core) return value;
    if (Object.prototype.hasOwnProperty.call(EN, core)) {
      const translated = EN[core];
      const leading = /^\s/.test(value) ? ' ' : '';
      const trailing = /\s$/.test(value) ? ' ' : '';
      return leading + translated + trailing;
    }
    for (const [re, fn] of PATTERNS) {
      const m = core.match(re);
      if (m) {
        const leading = /^\s/.test(value) ? ' ' : '';
        const trailing = /\s$/.test(value) ? ' ' : '';
        return leading + fn(m) + trailing;
      }
    }
    return value;
  }

  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const originals = new WeakMap();
  const attrOriginals = new WeakMap();

  function restore(root) {
    if (!root) return;
    const doc = root.ownerDocument || root;
    if (root.querySelectorAll) {
      root.querySelectorAll('[data-i18n]').forEach((el) => {
        const orig = el.getAttribute('data-i18n-orig');
        if (orig != null) el.textContent = orig;
      });
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (originals.has(node)) {
        node.nodeValue = originals.get(node);
        originals.delete(node);
      }
    }
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    els.forEach((el) => {
      const map = attrOriginals.get(el);
      if (!map) return;
      for (const attr of ATTRS) if (attr in map) el.setAttribute(attr, map[attr]);
      attrOriginals.delete(el);
    });
  }

  function apply(root) {
    if (!root || current !== 'en') return;
    const doc = root.ownerDocument || root;
    if (root.querySelectorAll) {
      root.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (CTX[key]) {
          if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', el.textContent);
          el.textContent = CTX[key];
        }
      });
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (!node.nodeValue || !/[\u0600-\u06FF]/.test(node.nodeValue)) continue;
      const translated = translateValue(node.nodeValue);
      if (translated !== node.nodeValue) {
        if (!originals.has(node)) originals.set(node, node.nodeValue);
        node.nodeValue = translated;
      }
    }
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : [];
    els.forEach((el) => {
      for (const attr of ATTRS) {
        const value = el.getAttribute(attr);
        if (value && /[\u0600-\u06FF]/.test(value)) {
          const translated = translateValue(value);
          if (translated !== value) {
            let map = attrOriginals.get(el);
            if (!map) {
              map = {};
              attrOriginals.set(el, map);
            }
            if (!(attr in map)) map[attr] = value;
            el.setAttribute(attr, translated);
          }
        }
      }
    });
  }

  function applyDocument() {
    if (current !== 'en') return;
    apply(document.body);
  }

  function setLang(lang) {
    current = lang === 'en' ? 'en' : 'ar';
    document.documentElement.lang = current;
    document.documentElement.dir = current === 'en' ? 'ltr' : 'rtl';
    document.documentElement.classList.toggle('lang-en', current === 'en');
    document.title = current === 'en' ? 'Erdtree Launcher — Elden Ring Launcher' : 'Erdtree Launcher — لانشر إلدن رينغ';
    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = current === 'en' ? 'عربي' : 'EN';
    if (typeof render === 'function' && typeof S !== 'undefined' && S.state) {
      if (current === 'ar') restore(document.body);
      render();
    }
  }

  window.I18N = {
    get lang() {
      return current;
    },
    t: (value) => (current === 'en' ? translateValue(value) : value),
    apply,
    applyDocument,
    setLang,
  };
})();
