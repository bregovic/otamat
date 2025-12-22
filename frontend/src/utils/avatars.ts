
export const avatarCategories = {
    "Zvířátka": {
        cow: '🐮', fox: '🦊', cat: '🐱', dog: '🐶', lion: '🦁', panda: '🐼', koala: '🐨', pig: '🐷',
        mouse: '🐭', frog: '🐸', bear: '🐻', tiger: '🐯', rabbit: '🐰', hamster: '🐹', dragon: '🐲', monkey: '🐵',
        chicken: '🐔', penguin: '🐧', bird: '🐦', duck: '🦆', eagle: '🦅', owl: '🦉', bat: '🦇', wolf: '🐺',
        boar: '🐗', horse: '🐴', unicorn: '🦄', bee: '🐝', bug: '🐛', butterfly: '🦋', snail: '🐌', beetle: '🐞',
        ant: '🐜', spider: '🕷', scorpion: '🦂', turtle: '🐢', snake: '🐍', lizard: '🦎', t_rex: '🦖', sauropod: '🦕',
        octopus: '🐙', squid: '🦑', shrimp: '🦐', lobster: '🦞', crab: '🦀', puffer: '🐡', fish: '🐠', dolphin: '🐬',
        whale: '🐳', shark: '🦈', crocodile: '🐊', leopard: '🐆', zebra: '🦓', gorilla: '🦍', orangutan: '🦧', elephant: '🐘',
        hippo: '🦛', rhino: '🦏', camel: '🐫', llama: '🦙', giraffe: '🦒', buffalo: '🐃', ox: '🐂', ram: '🐏',
        sheep: '🐑', goat: '🐐', deer: '🦌', turkey: '🦃', rooster: '🐓', peacock: '🦚', parrot: '🦜', swan: '🦢',
        flamingo: '🦩', dove: '🕊', raccoon: '🦝', skunk: '🦨', badger: '🦡', beaver: '🦫', otter: '🦦', sloth: '🦥'
    },
    "Jídlo": {
        apple: '🍎', pear: '🍐', orange: '🍊', lemon: '🍋', banana: '🍌', watermelon: '🍉', grapes: '🍇', strawberry: '🍓',
        cherry: '🍒', peach: '🍑', pineapple: '🍍', coconut: '🥥', kiwi: '🥝', tomato: '🍅', avocado: '🥑', broccoli: '🥦',
        carrot: '🥕', corn: '🌽', potato: '🥔', bread: '🍞', cheese: '🧀', egg: '🥚', bacon: '🥓', steak: '🥩',
        hotdog: '🌭', burger: '🍔', fries: '🍟', pizza: '🍕', sandwich: '🥪', taco: '🌮', burrito: '🌯', popcorn: '🍿',
        donut: '🍩', cookie: '🍪', cake: '🍰', chocolate: '🍫', candy: '🍬', beer: '🍺', wine: '🍷', coffee: '☕'
    },
    "Sport": {
        soccer: '⚽', basketball: '🏀', football: '🏈', baseball: '⚾', tennis: '🎾', volleyball: '🏐', rugby: '🏉',
        pool: '🎱', pingpong: '🏓', badminton: '🏸', hockey: '🏒', golf: '⛳', boxing: '🥊', ski: '🎿', snowboard: '🏂',
        swim: '🏊‍♀️', surf: '🏄‍♀️', cycle: '🚴‍♀️', trophy: '🏆', medal: '🥇', guitar: '🎸', piano: '🎹', drum: '🥁',
        game: '🎮', dart: '🎯', dice: '🎲', bowling: '🎳', art: '🎨', mic: '🎤', movie: '🎬'
    },
    "Obličeje": {
        smile: '😀', laugh: '😂', wink: '😉', love: '😍', cool: '😎', nerd: '🤓', think: '🤔', mindblown: '🤯',
        cry: '😢', sob: '😭', scream: '😱', angry: '😡', devil: '😈', clown: '🤡', ghost: '👻', alien: '👽',
        robot: '🤖', poop: '💩', skull: '💀', mask: '😷', sick: '🤢', dizzy: '😵', cowboy: '🤠', party: '🥳'
    },
    "Věci": {
        watch: '⌚', phone: '📱', laptop: '💻', camera: '📷', tv: '📺', bulb: '💡', money: '💸', diamond: '💎',
        tool: '🛠', bomb: '💣', knife: '🔪', sword: '⚔️', shield: '🛡', pill: '💊', car: '🚗', bus: '🚌',
        plane: '✈️', rocket: '🚀', boat: '🚤', bike: '🚲', house: '🏠', castle: '🏰', heart: '❤️', star: '⭐',
        fire: '🔥', water: '💧', sun: '☀️', moon: '🌙', earth: '🌍', rainbow: '🌈', umbrella: '☂️', balloon: '🎈'
    }
};

export const avatarMap: { [key: string]: string } = Object.assign({}, ...Object.values(avatarCategories));

export const getAvatarIcon = (id: string | undefined | null) => {
    if (!id) return '👤';
    return avatarMap[id] || '👤';
};
