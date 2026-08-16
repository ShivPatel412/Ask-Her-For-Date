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

const musicPresets = [
  { key: 'preset:piano', name: 'Piano Serenade 🎹', desc: 'Soft emotive romantic piano', mood: 'romantic' },
  { key: 'preset:acoustic', name: 'Acoustic Sunset 🎸', desc: 'Warm fingerstyle acoustic melody', mood: 'romantic' },
  { key: 'preset:jazz', name: 'Midnight Jazz 🎷', desc: 'Slow, smooth late-night jazz', mood: 'latenight' },
  { key: 'preset:lofi', name: 'Lo-fi Romance 🎧', desc: 'Chill beats, warm vinyl, and cozy chords', mood: 'latenight' },
  { key: 'preset:ukulele', name: 'Sweet Ukulele ☀️', desc: 'Playful, sunny, cheerful vibe', mood: 'funny' },
  { key: 'preset:ballad', name: 'Emotional Strings 🎻', desc: 'Gentle, touching cello and violin', mood: 'emotional' },
  { key: 'preset:dreamy', name: 'Celestial Starlight ✨', desc: 'Ethereal ambient pads and sparkle bells', mood: 'dreamy' }
];

const invitationTemplates = {
  'classic': {
    id: 'classic',
    name: 'Classic Playful Invite ❤️',
    tagline: 'The viral romantic & playful banter experience',
    themePreset: 'strawberry',
    content: defaultContent,
    moods: moods
  },
  'romantic-dinner': {
    id: 'romantic-dinner',
    name: 'Candlelight Dinner 🍷✨',
    tagline: 'Intimate dinner date with soft romantic elegance',
    themePreset: 'rose',
    content: {
      intro: { eyebrow: 'For someone truly special ✨', heading: 'An evening made just for you…', body: 'Because you deserve an extraordinary date night. 🌹', primary: 'Step Inside ✨' },
      main: { eyebrow: 'A special question for you… 🌹', heading: 'Will you join me for dinner?', body: 'Candlelight, your favorite cuisine, and conversations that linger under the stars.', primary: 'I would love to 🌹', secondary: 'Tell me more 👀', tertiary: 'What are you planning? ✨' },
      thinking: { eyebrow: '← Take your time 😌', heading: 'An unforgettable evening awaits.', body: 'Delicious food, beautiful ambience, and my undivided attention. 🍷', primary: 'Sounds wonderful ✨', secondary: 'View dinner ideas 🍽️', tertiary: 'Convince me more 🌹', quaternary: 'Thinking… 💫' },
      convince: { eyebrow: '← Why this dinner? 🌹', heading: 'Here is what I have planned:', body: 'Every detail thoughtfully arranged for you:', primary: 'Yes, let’s do it 🍷❤️', secondary: 'Show date ideas ✨', tertiary: 'What else? 😌' },
      benefits: { eyebrow: '← Date details 🍷', heading: 'THE CANDLELIGHT EXPERIENCE ✨', body: 'Specially crafted for {{nickname}} 🌹', primary: 'I’m convinced 🌹❤️', secondary: 'Choose dinner vibe 🍽️', tertiary: 'One more thing… 💫' },
      mood: { eyebrow: '← Back to question 🌹', heading: 'Pick your dream dinner vibe ✨', body: 'You choose the setting, I’ll take care of all reservations. 🍷', primary: 'Continue ✨', secondary: '← Choose another vibe' },
      finalAttempt: { eyebrow: '← Reconsider? 🥺', heading: 'One enchanting evening. 🌹', body: 'Just good food, great wine, and genuine laughter. Will you say yes?', primary: 'Yes, let’s go 🌹✨', secondary: 'Surprise me 🍷', tertiary: 'Maybe another time 😌' },
      yes: { eyebrow: 'A BEAUTIFUL BEGINNING ✨', heading: "IT'S A DATE 🍷🌹", body: 'I can’t wait to share this wonderful evening with you.', primary: 'Pick our date & time 📅' },
      availability: { eyebrow: 'Reserve our table 🍷', heading: 'Choose our evening & time ✨', body: 'Select the date and time that suits you best.', primary: 'Confirm Reservation ❤️' },
      success: { eyebrow: 'Reserved perfectly 🌹', heading: 'I’ll handle every detail.', body: 'You selected the vibe and the time. All you have to do is be there. ✨', primary: 'View invitation details ✨' },
      decline: { eyebrow: 'Thank you for being honest 🌹', heading: 'Grateful for your company always ✨', body: "No pressure at all.\nI truly appreciate you and cherish having you in my life.\n\nWarmest wishes always. 🌹", primary: 'Done 🌹' },
      secret: { heading: 'From the heart…', body: "I wanted to ask you in a way as special and lovely as you are.\nI am so genuinely excited for our dinner date together. ❤️", primary: 'See you soon ✨' }
    },
    moods: [
      { title: 'Fine Dining & Wine 🍷🍝', description: 'Candlelight, Italian cuisine, and great wine.', favorite: true },
      { title: 'Rooftop Sunset Lounge 🌇🍸', description: 'Breathtaking skyline views and artisan cocktails.' },
      { title: 'Cozy French Bistro 🥖✨', description: 'Warm jazz ambience, fondue, and decadent dessert.' },
      { title: 'Secret Garden Cafe 🌿🕯️', description: 'Lush greenery, fairy lights, and intimate setting.' }
    ]
  },
  'coffee-casual': {
    id: 'coffee-casual',
    name: 'Cozy Coffee & Conversations ☕🌿',
    tagline: 'Warm, relaxed coffee date with cozy aesthetic',
    themePreset: 'yellow',
    content: {
      intro: { eyebrow: 'Hey {{recipientName}} ☕', heading: 'A quick coffee invitation…', body: 'Warm brew, cozy corner, and zero awkwardness. 🌿', primary: 'Open note ☕' },
      main: { eyebrow: 'Quick question for you ☕🌿', heading: 'Coffee & a long walk with me?', body: 'I would love to grab your favorite brew and catch up properly.', primary: 'Coffee sounds amazing ☕❤️', secondary: 'Which cafe? 👀', tertiary: 'What kind of coffee? 🥐' },
      thinking: { eyebrow: '← Re-read question ☕', heading: 'Just a casual coffee date 🌿', body: 'Good brews, fresh pastries, and endless banter.', primary: 'Count me in ☕', secondary: 'See cafe options 👀', tertiary: 'Convince me 🌿', quaternary: 'Still thinking 🤔' },
      convince: { eyebrow: '← Why coffee? ☕', heading: 'The Coffee Date Perks 🥐', body: 'Why grabbing coffee together is a great idea:', primary: 'Alright, yes ☕❤️', secondary: 'Show cafe vibes 🌿', tertiary: 'What else? 😌' },
      benefits: { eyebrow: '← Coffee perks ☕', heading: 'CAFE DATE PERKS 🌿', body: 'Specially brewed for {{nickname}} ☕', primary: 'I’m in ☕❤️', secondary: 'Pick cafe style 🌿', tertiary: 'One more question 👀' },
      mood: { eyebrow: '← Back to question ☕', heading: 'Pick your ideal cafe vibe 🌿', body: 'You choose the spot, coffee is on me. ☕', primary: 'Continue ☕', secondary: '← Choose another vibe' },
      finalAttempt: { eyebrow: '← One more chance? 🥺', heading: 'Just one cozy coffee cup. ☕', body: 'No pressure, just delicious drinks and great company. 🌿', primary: 'Okay, let’s get coffee ☕', secondary: 'Surprise cafe 👀', tertiary: 'I’ll think about it 😌' },
      yes: { eyebrow: 'PERFECT BREW ☕', heading: "IT'S A COFFEE DATE! 🌿", body: 'Looking forward to our coffee break together!', primary: 'Pick our date & time 📅' },
      availability: { eyebrow: 'Schedule coffee ☕', heading: 'Pick date & time for coffee 🌿', body: 'Choose when you’re free and I’ll take care of the rest.', primary: 'Lock it in ☕❤️' },
      success: { eyebrow: 'Brewing soon ☕', heading: 'First sip is on me.', body: 'You picked the time and vibe. See you at the cafe! 🌿', primary: 'All set ☕' },
      decline: { eyebrow: 'All good! ☕', heading: 'Rain check anytime 🌿', body: "No worries at all!\nAlways down to catch up whenever you feel like coffee. ☕✨", primary: 'Done 🤝' },
      secret: { heading: 'A sweet little note…', body: "Honestly, coffee is just an excuse to spend time with you.\nLooking forward to it! ☕❤️", primary: 'See you there ☕' }
    },
    moods: [
      { title: 'Artisan Cafe & Matcha 🍵🍰', description: 'Specialty pour-overs, matcha lattes, and cheesecake.', favorite: true },
      { title: 'Cozy Bookstore Cafe 📚☕', description: 'Old books, quiet reading nook, and warm cappuccino.' },
      { title: 'Sunny Outdoor Garden 🌿🥐', description: 'Fresh air, croissants, and iced lattes under the trees.' },
      { title: 'Late Night Dessert Bar 🍦☕', description: 'Hot chocolate, churros, and late-night talks.' }
    ]
  },
  'best-friend-date': {
    id: 'best-friend-date',
    name: 'Best Friends Day Out 🍕🎈',
    tagline: 'High-energy, teasing Hinglish invite with food and laughs',
    themePreset: 'blue',
    content: defaultContent,
    moods: moods
  },
  'anniversary-special': {
    id: 'anniversary-special',
    name: 'Anniversary Celebration 💍🥂',
    tagline: 'Heartfelt milestone invitation with romantic memories',
    themePreset: 'rose',
    content: {
      intro: { eyebrow: 'Happy Anniversary my love ❤️', heading: 'Celebrating another milestone together…', body: 'A journey of love, laughter, and memories. 🥂✨', primary: 'Open our celebration 💖' },
      main: { eyebrow: 'To my favorite person ❤️', heading: 'Will you celebrate our special day with me?', body: 'Another year of loving you, and I want to celebrate us in the most unforgettable way.', primary: 'Forever yes ❤️💍', secondary: 'What’s the surprise? ✨', tertiary: 'Where are we going? 🥂' },
      thinking: { eyebrow: '← Looking back ❤️', heading: 'Every moment with you is special.', body: 'Let’s dress up, reminisce, and make new memories together. ✨', primary: 'I can’t wait 🥂❤️', secondary: 'Show celebration ideas 🍾', tertiary: 'Tell me more 💕', quaternary: 'Thinking 😌' },
      convince: { eyebrow: '← Our milestone 🥂', heading: 'Celebrating our love story 💖', body: 'Why this anniversary is going to be extraordinary:', primary: 'Yes, forever and always 💍❤️', secondary: 'Pick anniversary vibe 🍾', tertiary: 'More surprises ✨' },
      benefits: { eyebrow: '← Anniversary perks 💍', heading: 'ANNIVERSARY SPECIAL EDITION ✨', body: 'Crafted exclusively for {{nickname}} ❤️', primary: 'Let’s celebrate 🥂❤️', secondary: 'Choose vibe 🍾', tertiary: 'More details ✨' },
      mood: { eyebrow: '← Back to question ❤️', heading: 'Pick our anniversary setting 🥂', body: 'Choose how we celebrate another beautiful year together.', primary: 'Continue 💖', secondary: '← Choose another setting' },
      finalAttempt: { eyebrow: '← Forever & always ❤️', heading: 'You and me, always.', body: 'Let’s celebrate how far we’ve come and everything ahead.', primary: 'Always yes, my love ❤️', secondary: 'Surprise celebration ✨', tertiary: 'Of course yes 💍' },
      yes: { eyebrow: 'HAPPY ANNIVERSARY 🥂', heading: 'TO US AND OUR LOVE! ❤️', body: 'Here is to many more chapters together.', primary: 'Choose date & time 📅' },
      availability: { eyebrow: 'Save the date 💍', heading: 'Select our celebration time 🥂', body: 'Lock in the perfect moment for our special evening.', primary: 'Confirm Anniversary Date ❤️' },
      success: { eyebrow: 'It’s official ❤️', heading: 'Counting down the hours.', body: 'Everything is set for our anniversary. I love you! 🥂✨', primary: 'View invitation ❤️' },
      decline: { eyebrow: 'Together always ❤️', heading: 'Every day is a celebration with you ✨', body: "No matter where or when, celebrating you is my favorite thing. ❤️", primary: 'Done ❤️' },
      secret: { heading: 'My love note for you…', body: "Thank you for being my anchor, my joy, and my favorite adventure.\nHappy Anniversary! ❤️💍", primary: 'I love you ❤️' }
    },
    moods: [
      { title: 'Romantic Getaway Weekend ✈️🏖️', description: 'Scenic resort stay, spa, and oceanside dinner.', favorite: true },
      { title: 'Fine Dining & Champagne 🍾🕯️', description: 'Chef tasting menu, vintage champagne, and live violin.' },
      { title: 'Scenic Sunset Cruise ⛵🌅', description: 'Private boat, golden hour skyline, and hors d’oeuvres.' },
      { title: 'Cozy Cabin Staycation 🪵🔥', description: 'Fireplace, hot cocoa, stargazing, and movie marathon.' }
    ]
  }
};

function defaultConfig(inviterName = '', recipientName = '') {
  return {
    theme: { preset: 'strawberry', ...themes.strawberry, fontPreset: 'romantic', ...fonts.romantic },
    content: structuredClone(defaultContent),
    features: { mascots: true, tinyMode: true, collection: true, confetti: true, funnyBack: true, music: false, musicUrl: null, musicName: null, musicVolume: 35, musicMood: 'romantic', musicPlayerStyle: 'romantic', musicStartOffset: 0, coverPhoto: false, coverPhotoUrl: null, coverPhotoCaption: null, coverPhotoStyle: 'polaroid', coverPhotoAlt: '', coverPhotoOverlay: 40, memories: false, memoriesList: [], mascotPack: 'original' },
    moods: structuredClone(moods),
    inviterName, recipientName, title: 'Something for you ❤️'
  };
}

module.exports = {
  themes,
  fonts,
  defaultContent,
  favoriteMood,
  moods,
  musicPresets,
  invitationTemplates,
  defaultConfig
};
