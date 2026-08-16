const themes = {
  strawberry: { name: 'Warm Minimal ✨', background: '#FCFAF6', primary: '#E6496F', secondary: '#F4E9DD', accent: '#FF7B94', headingColor: '#20191B', text: '#282223', muted: '#70686A', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#EADFE1' },
  blue: { name: 'Blue Trouble 💙', background: '#F4FAFF', primary: '#3B82F6', secondary: '#E8DEFF', accent: '#60A5FA', headingColor: '#0F172A', text: '#1E293B', muted: '#64748B', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#DCE7F5' },
  yellow: { name: 'Yellow Chaos 💛', background: '#FFFDF2', primary: '#D97706', secondary: '#FEF3C7', accent: '#F59E0B', headingColor: '#1C1612', text: '#2D241E', muted: '#786959', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#F0E5D0' },
  midnight: { name: 'Midnight Date 🌙', background: '#13111C', primary: '#F43F5E', secondary: '#312E4A', accent: '#FB7185', headingColor: '#FFFFFF', text: '#F1EDF7', muted: '#A59EB5', card: '#201C30EE', buttonText: '#FFFFFF', border: '#38324F' },
  rose: { name: 'Rose Gold 🌹', background: '#FFF8F5', primary: '#C95A72', secondary: '#F9E4DE', accent: '#DE758C', headingColor: '#241418', text: '#332025', muted: '#7E676D', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#EBDCDD' }
};

const fonts = {
  romantic: { name: 'Romantic', heading: 'DM Serif Display', body: 'Poppins' },
  cute: { name: 'Cute', heading: 'Fredoka', body: 'Nunito' },
  elegant: { name: 'Elegant', heading: 'Playfair Display', body: 'Inter' },
  modern: { name: 'Modern', heading: 'Manrope', body: 'Inter' },
  handwritten: { name: 'Handwritten Accent', heading: 'DM Serif Display', body: 'Caveat' }
};

const defaultContent = {
  intro: { eyebrow: 'Hey {{recipientName}} 👀', heading: 'I made something for you…', body: 'Made with way too much overthinking 😂', primary: 'Open it 👀' },
  main: { eyebrow: 'Okay, ab main point pe aate hain… 👀', heading: 'Will you go on a date with me?', body: "I really enjoy spending time with you, and I've been wanting to ask you this for a while.", primary: 'Haan, chalo 😌', secondary: 'Hmm… sochna padega 👀', tertiary: 'Convince me 😏' },
  thinking: { eyebrow: '← Ek baar question fir se dekh le? 👀', heading: 'One cute date? That’s it. 😌', body: 'No awkward pressure. Just food, fun, and me behaving (mostly). 😂', primary: 'Achha theek hai 😂', secondary: 'Pehle plan batao 👀', tertiary: 'Aur convince karo 😏', quaternary: 'Still thinking 🤭' },
  convince: { eyebrow: '← Accha accha, options fir se dikhao 😌', heading: 'Okay {{nickname}}, presentation starts now. 😂', body: 'Why you should say yes:', primary: 'Fineee, yes 😂❤️', secondary: 'Date idea dikhao 👀', tertiary: 'Hmm, aur effort chahiye 😏' },
  benefits: { eyebrow: '← Restart the drama 😂', heading: 'DATE BENEFITS PACKAGE™', body: 'Prepared specially for {{nickname}} 😂', primary: 'Okay okay, yes 😂❤️', secondary: 'Plan batao pehle 😌', tertiary: 'Still not convinced 😏' },
  mood: { eyebrow: '← Main question, please 😏', heading: 'Okay {{nickname}}, pick your mood 👀', body: 'You choose the vibe… baaki planning meri. 😌❤️', primary: 'Continue 👀', secondary: '← Pick another vibe' },
  finalAttempt: { eyebrow: '← Okay, ek aur chance do 😭😂', heading: 'Okay okay… I see how it is. 😂', body: 'One proper date. No big promises. No awkward expectations. Just you, me, food, and a good time. 😌', primary: 'Chal theek hai, date pe chalte hain 😂', secondary: 'Surprise me 😏', tertiary: 'Best friend hi theek hai 😂' },
  yes: { eyebrow: 'WAIT.', heading: "IT'S A DATE.", body: 'Okay wow. This actually worked. 😂', primary: 'Okay, ab plan karte hain 👀' },
  availability: { eyebrow: 'One last thing', heading: 'Pick our date & time 👀', body: 'Choose the exact moment and I’ll handle the rest. 😌', primary: 'Confirm date & time ❤️' },
  success: { eyebrow: 'Perfect. 😌', heading: 'Baaki planning meri.', body: 'You picked the timing. You picked the vibe. You just have to show up. 😂', primary: 'Okay, ab plan karte hain 👀' },
  decline: { eyebrow: 'Hahaha, okay. 😭😂', heading: 'Best-friend privileges remain fully active. 🤝', body: "Message received. No awkwardness. No pressure.\nUnlimited bakwaas, food plans, memes, and annoying each other continue as usual. 😂\n\nI'm still glad I asked.", primary: 'Done 🤝' },
  secret: { heading: 'Jokes apart…', body: "I made all this because asking you with a boring text didn't feel right.\nWhatever happens, you're someone I genuinely love spending time with.\nAnd I'm really happy you said yes. ❤️", primary: 'Okay bas, emotional mat ho 😂' }
};

const favoriteMood = { title: 'Long Drive + Food 🚗🍟', description: 'Good playlist, long talks, and snacks.', favorite: true };
const moods = [
  favoriteMood,
  { title: 'Coffee + Walk ☕', description: 'Good conversations + long walk' },
  { title: 'Dinner + Dessert 🍝', description: 'Food first. Everything else later.' },
  { title: 'Movie + Food 🎬', description: "We can judge each other's movie taste 😂" },
  { title: 'Fun Activity 🎳', description: 'Loser buys dessert.' },
  { title: 'Drinks + Party 🍸🎉', description: 'Music + drinks + questionable dancing 😂' },
  { title: 'Surprise Me ✨', description: 'Dangerous amount of trust 👀' }
];

function defaultConfig(inviterName = '', recipientName = '') {
  return {
    theme: { preset: 'strawberry', ...themes.strawberry, fontPreset: 'romantic', ...fonts.romantic },
    content: structuredClone(defaultContent),
    features: { mascots: true, tinyMode: true, collection: true, confetti: true, funnyBack: true, music: false, musicUrl: null, musicName: null, memories: false, mascotPack: 'original' },
    moods: structuredClone(moods),
    inviterName, recipientName, title: 'Something for you ❤️'
  };
}

module.exports = { themes, fonts, favoriteMood, defaultConfig };
