// Curated end-game builds. Every entry is safe to apply offline: the launcher
// writes the attributes straight into the live character and stores the
// loadout on that character in the launcher.
const buildExtras = require('./builds-extra');

const BASE_BUILDS = [
  {
    id: 'bleed',
    name: 'Bleed Lord',
    role: 'Bleed',
    types: ['strongest', 'boss', 'fun'],
    power: 9.8,
    rating: 5.0,
    tagline: 'Two katanas. One hemorrhage proc. Nothing survives the second combo.',
    description:
      'The most feared PvE setup in the Lands Between. Rivers of Blood carries the entire build, while Seppuku on an off-hand Uchigatana pushes bleed buildup through the roof. Bloodflame Blade and Swarm of Flies keep the meter filling from range.',
    playstyle: 'Aggressive, close-range duelist. Open with Swarm of Flies, close the gap, then chain Corpse Piler. Reset bleed with Seppuku after every encounter.',
    image: 'assets/builds/bleed.jpg',
    accent: '#b3242f',
    weapon: [
      { name: 'Rivers of Blood', id: '0x89F080', note: 'Corpse Piler ash of war' },
      { name: 'Uchigatana', id: '0x895440', note: 'Off-hand, Seppuku' },
    ],
    armor: [
      { name: 'White Mask', id: '0xA6040' },
      { name: "Lord of Blood's Robe", id: '0x75364' },
      { name: 'Traveling Maiden Gloves', id: '' },
      { name: "Lord of Blood's Trousers", id: '' },
    ],
    talismans: [
      { name: "Lord of Blood's Exultation", id: '0x870' },
      { name: "Millicent's Prosthesis", id: '0x4E2' },
      { name: 'Rotten Winged Sword Insignia', id: '0x821' },
      { name: 'Shard of Alexander', id: '0x4CF' },
    ],
    stats: { vigor: 60, mind: 20, endurance: 25, strength: 20, dexterity: 45, intelligence: 10, faith: 15, arcane: 40 },
    spells: [
      { name: 'Bloodflame Blade', id: '0x18B0' },
      { name: 'Swarm of Flies', id: '0x1C2A' },
    ],
    acquisition: [
      {
        item: 'Rivers of Blood',
        location: 'Church of Repose, Mountaintops of the Giants',
        boss: 'Bloody Finger Okina (invader)',
        how: 'Rest at Church of Repose and walk north along the frozen road. Okina invades as you approach the first ruined camp.',
      },
      {
        item: 'White Mask',
        location: 'Mohgwyn Palace, Siofra River',
        boss: 'Nameless White Mask (invader)',
        how: 'Complete Varré\'s questline to reach Mohgwyn Palace. The three White Mask invaders spawn near the blood lake; the last one drops the helm.',
      },
      {
        item: "Lord of Blood's Exultation",
        location: 'Leyndell Catacombs, Leyndell',
        boss: 'Esgar, Priest of Blood',
        how: 'Drop into the sealed pit in the Subterranean Shunning-Grounds and follow the pipe maze to the boss room.',
      },
      {
        item: 'Shard of Alexander',
        location: 'Farum Azula, Crumbling Beast Grave',
        boss: 'Alexander, Warrior Jar',
        how: 'Finish Alexander\'s questline and duel him at the Dragon Temple Lift in Farum Azula.',
      },
    ],
    howTo: [
      'Ride to Church of Repose in the Mountaintops and defeat Okina for Rivers of Blood.',
      'Finish Varré\'s quest and farm the White Mask invaders at Mohgwyn Palace.',
      'Clear Leyndell Catacombs for Lord of Blood\'s Exultation.',
      'Complete Alexander\'s quest in Farum Azula for Shard of Alexander.',
      'Buy Seppuku from the Bloody Finger hunter or find it in Mt. Gelmir, then apply it to the off-hand Uchigatana.',
    ],
  },
  {
    id: 'mage',
    name: 'Carian Comet Mage',
    role: 'Mage',
    types: ['strongest', 'boss', 'beginner'],
    power: 9.6,
    rating: 4.9,
    tagline: 'One Comet Azur. One flask. One very short boss fight.',
    description:
      'A pure intelligence caster built around Comet Azur and Terra Magica. The Carian Regal Scepter gives the best scaling, while Lusat\'s staff is the emergency nuke button. Everything in the kit exists to hold the boss still for three seconds.',
    playstyle: 'Stay at max range, buff with Terra Magica, then channel Comet Azur. Rock Sling staggers, Glintstone Pebble is your low-cost poke.',
    image: 'assets/builds/mage.jpg',
    accent: '#4b6fd6',
    weapon: [
      { name: 'Carian Regal Scepter', id: '0x1F8E9D0', note: 'Main catalyst' },
      { name: "Lusat's Glintstone Staff", id: '0x1FB33C0', note: 'Burst catalyst, costs extra FP' },
    ],
    armor: [
      { name: "Azur's Glintstone Crown", id: '0x8DD88' },
      { name: "Lusat's Robe", id: '0x8DA04' },
      { name: "Lusat's Manchettes", id: '0x8DA68' },
      { name: 'Snow Witch Skirt', id: '0xF6A7C' },
    ],
    talismans: [
      { name: 'Graven-School Talisman', id: '0xBB8' },
      { name: 'Graven-Mass Talisman', id: '0xBB9' },
      { name: 'Magic Scorpion Charm', id: '0x7D0' },
      { name: 'Radagon Icon', id: '0xBFE' },
    ],
    stats: { vigor: 60, mind: 38, endurance: 25, strength: 10, dexterity: 12, intelligence: 80, faith: 7, arcane: 9 },
    spells: [
      { name: 'Comet Azur', id: '0x1068' },
      { name: 'Terra Magica', id: '' },
      { name: 'Rock Sling', id: '0x1266' },
      { name: 'Glintstone Pebble', id: '' },
    ],
    acquisition: [
      {
        item: 'Carian Regal Scepter',
        location: 'Roundtable Hold, Enia',
        boss: 'Remembrance of the Full Moon Queen (Rennala)',
        how: 'Trade Rennala\'s Remembrance to Enia at the Roundtable Hold.',
      },
      {
        item: "Lusat's Glintstone Staff",
        location: 'Sellia Hideaway, Caelid',
        boss: 'Crystalian trio',
        how: 'Break the illusory wall in Sellia Hideaway and loot the staff past the crystal boss.',
      },
      {
        item: 'Azur\'s Glintstone Crown',
        location: 'Primeval Sorcerer Azur, Mt. Gelmir',
        boss: 'None — quest NPC',
        how: 'Find Azur on the cliffs above the Hermit Village and exhaust his dialogue; the crown is on his corpse after the quest advances.',
      },
      {
        item: 'Comet Azur',
        location: 'Primeval Sorcerer Azur, Mt. Gelmir',
        boss: 'None',
        how: 'Take the Comet Azur scroll from Azur\'s study and give it to Sellen or Corhyn.',
      },
      {
        item: 'Terra Magica',
        location: 'Converted Fringe Tower, Liurnia',
        boss: 'None',
        how: 'Use the Erudition gesture in front of the tower seal and climb to the chest.',
      },
    ],
    howTo: [
      'Beat Rennala in Raya Lucaria and trade her Remembrance for the Carian Regal Scepter.',
      'Loot Lusat\'s staff from Sellia Hideaway in Caelid.',
      'Find Azur in Mt. Gelmir for his crown and the Comet Azur scroll.',
      'Solve the Converted Fringe Tower with the Erudition gesture for Terra Magica.',
      'Buy Rock Sling from the Caelid sorcerer or loot the Street of Sages Ruins.',
    ],
  },
  {
    id: 'strength',
    name: 'Colossal Crusher',
    role: 'Strength',
    types: ['strongest', 'beginner', 'boss'],
    power: 9.3,
    rating: 4.8,
    tagline: 'One swing is a boss phase. Two swings is a Remembrance.',
    description:
      'The classic unga-bunga endgame build. Giant-Crusher with Royal Knight\'s Resolve deletes health bars, and the Bull-Goat set lets you trade hits without flinching. Great-Jar\'s Arsenal keeps the whole loadout under 70% equip load.',
    playstyle: 'Walk forward. Charge heavy. Repeat. Jump attacks break poise faster than anything else in the game.',
    image: 'assets/builds/strength.jpg',
    accent: '#b07b34',
    weapon: [
      { name: 'Giant-Crusher', id: '0x160A170', note: 'Royal Knight\'s Resolve' },
      { name: 'Greatsword', id: '0x3D0900', note: 'Optional, Lion\'s Claw' },
    ],
    armor: [
      { name: 'Bull-Goat Helm', id: '0x222E0' },
      { name: 'Bull-Goat Armor', id: '0x22344' },
      { name: 'Bull-Goat Gauntlets', id: '0x223A8' },
      { name: 'Bull-Goat Greaves', id: '0x2240C' },
    ],
    talismans: [
      { name: "Great-Jar's Arsenal", id: '0x408' },
      { name: 'Claw Talisman', id: '0x884' },
      { name: 'Axe Talisman', id: '0x852' },
      { name: 'Ritual Sword Talisman', id: '0x802' },
    ],
    stats: { vigor: 60, mind: 20, endurance: 40, strength: 80, dexterity: 14, intelligence: 9, faith: 9, arcane: 7 },
    spells: [],
    acquisition: [
      {
        item: 'Giant-Crusher',
        location: 'Leyndell, Royal Capital — colosseum carriage',
        boss: 'None',
        how: 'Ride the carriage road near the Capital Outskirts and loot the chest on the wagon.',
      },
      {
        item: 'Bull-Goat set',
        location: 'Mt. Gelmir, Ninth Camp',
        boss: 'Great Horned Tragoth (invader)',
        how: 'Invade Tragoth through Patches\' quest or the Recusant finger; he drops the full set.',
      },
      {
        item: "Great-Jar's Arsenal",
        location: 'Great Jar, Caelid',
        boss: 'Three NPC invaders',
        how: 'Defeat the three Great Jar duelists at the colosseum in northern Caelid.',
      },
      {
        item: 'Claw Talisman',
        location: 'Stormveil Castle, Liurnia side',
        boss: 'None',
        how: 'Jump across the rooftops near the Rampart Tower and drop into the chest room.',
      },
    ],
    howTo: [
      'Loot the Giant-Crusher from the carriage near Leyndell\'s colosseum.',
      'Finish Patches\' questline and defeat Great Horned Tragoth for the Bull-Goat set.',
      'Win the three Great Jar duels in Caelid for Great-Jar\'s Arsenal.',
      'Grab the Claw Talisman from the Stormveil rooftops.',
      'Apply Royal Knight\'s Resolve from the Haligtree and two-hand the hammer.',
    ],
  },
  {
    id: 'samurai',
    name: 'White Reed Ronin',
    role: 'Dexterity',
    types: ['pvp', 'fun', 'boss'],
    power: 9.1,
    rating: 4.7,
    tagline: 'The cleanest duelist in the Lands Between. Every dodge is a counter.',
    description:
      'A dexterity-first katana build with absurd bleed and stance pressure. Nagakiba gives the reach, Uchigatana gives the speed, and the White Reed set keeps you light enough to dodge everything. This is the build that makes the game look easy.',
    playstyle: 'Patient, reactive, stylish. Bait a swing, Bloodhound\'s Step through it, punish with Unsheathe. Keep Seppuku active on the off-hand.',
    image: 'assets/builds/samurai.jpg',
    accent: '#d8d2c2',
    weapon: [
      { name: 'Nagakiba', id: '0x897B50', note: 'Main hand, Unsheathe' },
      { name: 'Uchigatana', id: '0x895440', note: 'Off-hand, Seppuku' },
    ],
    armor: [
      { name: 'White Reed Armor', id: '0xD4EA4' },
      { name: 'White Reed Gauntlets', id: '0xD4F08' },
      { name: 'White Reed Greaves', id: '0xD4F6C' },
      { name: 'Iron Kasa', id: '' },
    ],
    talismans: [
      { name: 'Rotten Winged Sword Insignia', id: '0x821' },
      { name: "Millicent's Prosthesis", id: '0x4E2' },
      { name: 'Shard of Alexander', id: '0x4CF' },
      { name: 'Dragoncrest Greatshield Talisman', id: '0xFA3' },
    ],
    stats: { vigor: 55, mind: 20, endurance: 25, strength: 18, dexterity: 80, intelligence: 9, faith: 9, arcane: 15 },
    spells: [],
    acquisition: [
      {
        item: 'Nagakiba',
        location: 'Liurnia, near Laskyar Ruins',
        boss: 'Bloody Finger Nerijus / Yura quest',
        how: 'Complete Yura\'s encounter at Laskyar Ruins and take the blade from his fallen body later in the quest.',
      },
      {
        item: 'White Reed set',
        location: 'Mountaintops of the Giants, Hidden Path to the Haligtree',
        boss: 'None',
        how: 'Loot the set from the invisible bridge route to Ordina, Liturgical Town.',
      },
      {
        item: 'Rotten Winged Sword Insignia',
        location: 'Elphael, Brace of the Haligtree',
        boss: 'Millicent quest ending',
        how: 'Side with Millicent at the end of her questline and receive the talisman.',
      },
      {
        item: 'Dragoncrest Greatshield Talisman',
        location: 'Elphael, Brace of the Haligtree',
        boss: 'None',
        how: 'Drop into the rot swamp and open the chest guarded by the Kindred of Rot.',
      },
    ],
    howTo: [
      'Finish Yura\'s questline in Liurnia for the Nagakiba.',
      'Reach Ordina via the Hidden Path to the Haligtree and loot the White Reed set.',
      'Complete Millicent\'s quest for the Prosthesis and the Rotten Winged Sword Insignia.',
      'Find Bloodhound\'s Step in Dragonbarrow and apply it to the Nagakiba.',
      'Unsheathe is native to katanas — no extra ash needed.',
    ],
  },
  {
    id: 'faith',
    name: 'Golden Order Paladin',
    role: 'Faith',
    types: ['beginner', 'boss'],
    power: 9.4,
    rating: 4.9,
    tagline: 'Holy greatsword, golden buffs, and a health bar that refuses to empty.',
    description:
      'A faith paladin that heals on hit. Blasphemous Blade\'s Taker\'s Flames restores HP for every enemy it touches, and the Erdtree Seal makes Golden Vow and Flame, Grant Me Strength hit their strongest scalings. Tanky, self-sufficient, and excellent in co-op.',
    playstyle: 'Buff before every fight, then use Taker\'s Flames as both damage and healing. Golden Vow carries your friends too.',
    image: 'assets/builds/faith.jpg',
    accent: '#d8a93a',
    weapon: [
      { name: 'Blasphemous Blade', id: '0x2FE9A0', note: 'Taker\'s Flames' },
      { name: 'Erdtree Seal', id: '0x207DDF0', note: 'Incantation catalyst' },
    ],
    armor: [
      { name: 'Bull-Goat Helm', id: '0x222E0' },
      { name: 'Scaled Armor', id: '' },
      { name: 'Scaled Gauntlets', id: '' },
      { name: 'Scaled Greaves', id: '' },
    ],
    talismans: [
      { name: 'Shard of Alexander', id: '0x4CF' },
      { name: 'Ritual Sword Talisman', id: '0x802' },
      { name: 'Dragoncrest Greatshield Talisman', id: '0xFA3' },
      { name: "Great-Jar's Arsenal", id: '0x408' },
    ],
    stats: { vigor: 60, mind: 30, endurance: 30, strength: 22, dexterity: 15, intelligence: 9, faith: 65, arcane: 10 },
    spells: [
      { name: 'Golden Vow', id: '0x19C8' },
      { name: 'Flame, Grant Me Strength', id: '0x17A2' },
      { name: 'Erdtree Heal', id: '' },
    ],
    acquisition: [
      {
        item: 'Blasphemous Blade',
        location: 'Roundtable Hold, Enia',
        boss: 'Remembrance of the Blasphemous (Rykard)',
        how: 'Defeat Rykard in Volcano Manor and trade his Remembrance to Enia.',
      },
      {
        item: 'Erdtree Seal',
        location: 'Prison Town Church, Mt. Gelmir',
        boss: 'None',
        how: 'Open the chest behind the church altar after clearing the prison town.',
      },
      {
        item: 'Golden Vow',
        location: 'Corpse near Road of Iniquity, Mt. Gelmir',
        boss: 'None',
        how: 'Follow the cliff path north of the Road of Iniquity Site of Grace and loot the corpse.',
      },
      {
        item: 'Flame, Grant Me Strength',
        location: 'Fort Gael, Caelid',
        boss: 'None',
        how: 'Climb the fort walls and take the incantation from the chest at the top.',
      },
    ],
    howTo: [
      'Defeat Rykard and trade his Remembrance for the Blasphemous Blade.',
      'Loot the Erdtree Seal from Prison Town Church.',
      'Pick up Golden Vow on the cliffs of Mt. Gelmir.',
      'Clear Fort Gael in Caelid for Flame, Grant Me Strength.',
      'Two-hand the Blasphemous Blade and keep Golden Vow up at all times.',
    ],
  },
  {
    id: 'dragon',
    name: 'Dragon Communion',
    role: 'Arcane / Faith',
    types: ['fun', 'boss'],
    power: 9.0,
    rating: 4.6,
    tagline: 'Become the thing the Tarnished are afraid of.',
    description:
      'A dragon communion caster that turns dragon hearts into raw elemental force. The Dragon Communion Seal scales with both faith and arcane, and Greyoll\'s Roar deletes entire rooms. Dragonclaw and Dragonmaw give you the melee pressure a pure caster normally lacks.',
    playstyle: 'Mid-range bruiser-caster. Open with Greyoll\'s Roar, then weave Dragonclaw into the gaps. Agheel\'s Flame clears groups.',
    image: 'assets/builds/dragon.jpg',
    accent: '#c4522a',
    weapon: [
      { name: 'Dragon Communion Seal', id: '0x2080500', note: 'Scales faith + arcane' },
      { name: 'Rivers of Blood', id: '0x89F080', note: 'Optional backup' },
    ],
    armor: [
      { name: 'Drake Knight Helm', id: '' },
      { name: 'Drake Knight Armor', id: '' },
      { name: 'Drake Knight Gauntlets', id: '' },
      { name: 'Drake Knight Greaves', id: '' },
    ],
    talismans: [
      { name: "Faithful's Canvas Talisman", id: '0xBE0' },
      { name: "Flock's Canvas Talisman", id: '0xBEA' },
      { name: 'Dragoncrest Greatshield Talisman', id: '0xFA3' },
      { name: 'Ritual Sword Talisman', id: '0x802' },
    ],
    stats: { vigor: 60, mind: 35, endurance: 25, strength: 18, dexterity: 20, intelligence: 10, faith: 45, arcane: 45 },
    spells: [
      { name: 'Dragonclaw', id: '0x1B94' },
      { name: 'Dragonmaw', id: '0x1BA8' },
      { name: "Greyoll's Roar", id: '0x1BB2' },
      { name: "Agheel's Flame", id: '0x1B59' },
    ],
    acquisition: [
      {
        item: 'Dragon Communion Seal',
        location: "Fringefolk Hero's Grave, Stranded Graveyard",
        boss: 'None — imp statue',
        how: 'Use a Stonesword Key on the imp statue at the start of the grave and loot the seal past the chariot.',
      },
      {
        item: 'Dragonclaw / Dragonmaw',
        location: 'Cathedral of Dragon Communion, Limgrave',
        boss: 'None',
        how: 'Trade Dragon Hearts at the altar. Dragonclaw costs 2 hearts, Dragonmaw 3.',
      },
      {
        item: "Greyoll's Roar",
        location: 'Cathedral of Dragon Communion, Caelid',
        boss: 'Elder Dragon Greyoll',
        how: 'Kill Greyoll in Caelid for 5 Dragon Hearts, then buy the incantation at the cathedral.',
      },
      {
        item: 'Drake Knight set',
        location: 'Crumbling Farum Azula',
        boss: 'None',
        how: 'Loot the set from the Dragon Temple rooftops and the Beast Grave bridges.',
      },
    ],
    howTo: [
      'Grab the Dragon Communion Seal from Fringefolk Hero\'s Grave with a Stonesword Key.',
      'Kill Greyoll in Caelid for a stack of Dragon Hearts.',
      'Trade hearts for Dragonclaw, Dragonmaw, Agheel\'s Flame and Greyoll\'s Roar.',
      'Loot the Drake Knight set in Farum Azula.',
      'Open every fight with Greyoll\'s Roar and stay mid-range.',
    ],
  },
];

const BUILDS = [...BASE_BUILDS, ...buildExtras];

const STAT_KEYS = ['vigor', 'mind', 'endurance', 'strength', 'dexterity', 'intelligence', 'faith', 'arcane'];

function levelFor(stats) {
  const total = STAT_KEYS.reduce((sum, key) => sum + (Number(stats?.[key]) || 0), 0);
  return Math.max(1, Math.min(713, total - 79));
}

function cloneBuild(build) {
  return JSON.parse(JSON.stringify(build));
}

function list() {
  return BUILDS.map(cloneBuild);
}

function find(id) {
  const build = BUILDS.find((item) => item.id === id);
  return build ? cloneBuild(build) : null;
}

module.exports = { BUILDS, STAT_KEYS, list, find, levelFor, cloneBuild };
