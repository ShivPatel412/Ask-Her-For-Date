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
    name: 'Classic Date ❤️',
    tagline: 'Simple, timeless romantic proposal',
    themePreset: 'strawberry',
    content: defaultContent,
    moods: moods
  },
  'best-friend-date': {
    id: 'best-friend-date',
    name: 'Best Friend → Date 👀',
    tagline: 'Playful friends-to-date banter & laughter',
    themePreset: 'blue',
    content: defaultContent,
    moods: [
      { title: 'Unlimited Pizza & Bakwaas 🍕🥤', description: 'Your favorite pizza and 4 hours of pure gossiping.', favorite: true },
      { title: 'Arcade & Bowling Showdown 🎳👾', description: 'Winner gets free ice cream and bragging rights.' },
      { title: 'Drive-in Movie & Snacks 🍿🚗', description: 'Late-night snacks, comfy seats, and endless laughs.' },
      { title: 'Street Food Crawl 🌮🥟', description: 'Momos, chaat, and exploring the best street stalls.' }
    ]
  },
  'hinglish-proposal': {
    id: 'hinglish-proposal',
    name: 'Hinglish Proposal 🇮🇳',
    tagline: 'Desi Bollywood vibes, sweet Hinglish banter',
    themePreset: 'rose',
    content: {
      intro: { eyebrow: 'Suno {{recipientName}}… 🌹', heading: 'Ek bohot zaroori sawaal hai…', body: 'Kaafi time se bolna tha, socha thoda filmy style me pooch loon! ✨', primary: 'Aage Dekho ✨' },
      main: { eyebrow: 'Dil ki baat… 😌❤️', heading: 'Kya mere saath date pe chalogi?', body: 'Achhi jagah leke jaunga, bills mai bharunga, aur full hero jaisa treat karunga!', primary: 'Haan bilkul, chalo! 🌹❤️', secondary: 'Sochne do thoda 👀', tertiary: 'Pehle plan batao 🍕' },
      thinking: { eyebrow: '← Are aise mat karo 🥺', heading: 'Itna kya sochna yaar?', body: 'Pakka bore nahi hone dunga, promise! Unlimited bakwaas free me milegi.', primary: 'Theek hai, maan gayi 😌❤️', secondary: 'Date options dikhao 🍽️', tertiary: 'Aur manao 🌹', quaternary: 'Abhi bhi thinking 🤔' },
      convince: { eyebrow: '← Reasons suno 🌹', heading: 'Mere Saath Date Ke Fayde ✨', body: 'Ye offers limited time ke liye available hain:', primary: 'Done karte hain ❤️', secondary: 'Vibe choose karo ✨', tertiary: 'Ek aur reason do 👀' },
      benefits: { eyebrow: '← Full package 🌹', heading: 'THE SPECIAL VIP DATE ✨', body: 'Exclusively arranged for {{nickname}} 🌹', primary: 'Pakka done 🌹❤️', secondary: 'Select setting 🍽️', tertiary: 'Ek aakhri sawaal 💫' },
      mood: { eyebrow: '← Back to question 🌹', heading: 'Kaisi date pasand aayegi? ✨', body: 'Tu bol bas, reservations mai karwa lunga.', primary: 'Aage badho ✨', secondary: '← Dusri vibe dekho' },
      finalAttempt: { eyebrow: '← Ek aakhri try 🥺', heading: 'Ek baar chal ke dekho na!', body: 'Achhi memories banegi, pakka! Ab toh yes bol do? 😌', primary: 'Haan chalte hain! 🌹❤️', secondary: 'Surprise me ✨', tertiary: 'Pehle dost rehne do 🤝' },
      yes: { eyebrow: 'YESSS! KAMAAL HO GAYA 🎉', heading: "IT'S A DATE JI! 🌹❤️", body: 'I am so excited! Bahut maza aayega.', primary: 'Time aur date fix karo 📅' },
      availability: { eyebrow: 'Date book karo 🌹', heading: 'Kab chalna hai batao ✨', body: 'Apna free time select karo, baki sab mere pe chhod do.', primary: 'Confirm Date ❤️' },
      success: { eyebrow: 'Reservation Confirmed 🌹', heading: 'Milte hain phir!', body: 'Time note kar liya hai. Bas ready hoke aa jana! ✨', primary: 'Invitation details dekho ✨' },
      decline: { eyebrow: 'No problem yaar! 🌹', heading: 'Dosti zindabad hamesha ✨', body: "Koi pressure nahi hai!\nYou are super special to me always. 🤝❤️", primary: 'Done 🤝' },
      secret: { heading: 'Dil se ek chhota sa note…', body: "Tumhare saath time spend karna mujhe bohot achha lagta hai.\nLooking forward to our special day together! ❤️", primary: 'See you soon ✨' }
    },
    moods: [
      { title: 'Rooftop Cafe & Chai ☕🌇', description: 'Sunset view, hot kulhad chai, and long conversations.', favorite: true },
      { title: 'Candlelight North Indian Dinner 🥘🕯️', description: 'Butter chicken, paneer tikka, and soothing live music.' },
      { title: 'Late Night Long Drive 🚗🌙', description: 'Bollywood playlist, cold breeze, and ice cream at 2am.' },
      { title: 'Cozy Movie & Dessert 🍨🎬', description: 'Corner seats, big popcorn tub, and waffles afterwards.' }
    ]
  },
  'funny-proposal': {
    id: 'funny-proposal',
    name: 'Funny Proposal 😂',
    tagline: 'High-energy comedy, teasing & zero boring moments',
    themePreset: 'lavender',
    content: {
      intro: { eyebrow: 'ATTENTION PLEASE 🚨', heading: 'Official formal date application…', body: 'Subject: Seeking permission to take you out on a world-class date.', primary: 'Review Application 📄' },
      main: { eyebrow: 'Non-negotiable offer 👀', heading: 'Will you go on a date with me?', body: 'Side effects may include laughing too hard and falling slightly in love.', primary: 'Application Accepted 😂❤️', secondary: 'Check resume 👀', tertiary: 'Interview questions 📋' },
      thinking: { eyebrow: '← Wait wait wait 🏃💨', heading: 'System error: Rejection not found.', body: 'Our servers do not support saying no to such a handsome/lovely person. 😂', primary: 'Fine, let’s go 😂❤️', secondary: 'Show date ideas 🍔', tertiary: 'Convince me more 🍕', quaternary: 'Still reviewing 🤔' },
      convince: { eyebrow: '← Top reasons 😂', heading: 'Why I am the #1 date candidate:', body: 'Peer-reviewed research and verified facts:', primary: 'Approved! 😂❤️', secondary: 'Select food vibe 🍟', tertiary: 'What else? 👀' },
      benefits: { eyebrow: '← Package perks 🎁', heading: 'THE VIP DATE EXPERIENCE ✨', body: 'Guaranteed 100% fun, 0% awkward silence.', primary: 'Let’s do this! ❤️', secondary: 'Pick food category 🍕', tertiary: 'One more joke 😂' },
      mood: { eyebrow: '← Back to form 📋', heading: 'Pick your preferred date vibe ✨', body: 'You select the vibe, I pay for the food.', primary: 'Lock it in ✨', secondary: '← Pick another option' },
      finalAttempt: { eyebrow: '← Critical error ⚠️', heading: 'Saying no is currently illegal.', body: 'Just look at the effort put into this web app! Will you please say yes? 🥹', primary: 'YES OF COURSE 😂❤️', secondary: 'Surprise me 🍔', tertiary: 'Best friends forever 🤝' },
      yes: { eyebrow: 'MISSION ACCOMPLISHED 🚀', heading: 'DATE CONFIRMED! 🎉❤️', body: 'Best decision of your week. Get ready!', primary: 'Pick our schedule 📅' },
      availability: { eyebrow: 'Final step 📅', heading: 'When are you blessing me with your presence?', body: 'Pick a slot so I can iron my best shirt.', primary: 'Confirm Date Time ❤️' },
      success: { eyebrow: 'It’s on the calendar 🗓️', heading: 'Get ready for greatness.', body: 'Date confirmed. Bring your appetite and your best jokes! 😂✨', primary: 'Done 🚀' },
      decline: { eyebrow: 'Application Status 📋', heading: 'Friendzone Tier Unlocked 🤝', body: "Still honored to have your application reviewed.\nUnlimited friendship privileges remain active! 😂", primary: 'Done 🤝' },
      secret: { heading: 'Behind the comedy…', body: "Jokes aside, I genuinely adore your company and cannot wait to hang out! ❤️", primary: 'See you soon ✨' }
    },
    moods: [
      { title: 'Tacos & Margaritas / Mocktails 🌮🍹', description: 'Messy delicious tacos and unlimited funny banter.', favorite: true },
      { title: 'Arcade Gaming Madness 🕹️👾', description: 'Air hockey championship and claw machine attempts.' },
      { title: 'Burger Feast & Milkshakes 🍔🥤', description: 'Loaded cheese fries, smash burgers, and thick shakes.' },
      { title: 'Go-Kart Racing 🏎️💨', description: 'Fast laps, high adrenaline, and winner gets dinner paid.' }
    ]
  },
  'long-distance': {
    id: 'long-distance',
    name: 'Long Distance 🌎',
    tagline: 'Miles apart, together at heart — reunion & virtual date',
    themePreset: 'lavender',
    content: {
      intro: { eyebrow: 'Across every mile ✈️', heading: 'No distance can keep us apart…', body: 'Counting down every single second until I see you next. 🌎❤️', primary: 'Open our space 💌' },
      main: { eyebrow: 'Even across the map 🗺️❤️', heading: 'Will you go on a special date with me?', body: 'Whether it’s our next reunion in person or our favorite virtual candlelight dinner.', primary: 'Yes, across all miles ❤️✈️', secondary: 'Virtual or In-Person? 👀', tertiary: 'Reunion plans ✨' },
      thinking: { eyebrow: '← Distance is nothing 🌍', heading: 'You are always worth the wait.', body: 'Every timezone, every flight, and every phone call brought us right here. ✨', primary: 'Always yes ❤️', secondary: 'View date vibes 📱', tertiary: 'Reunion ideas ✈️', quaternary: 'Thinking of you 💕' },
      convince: { eyebrow: '← Why us? 🌎', heading: 'Distance means so little when you mean so much.', body: 'Every memory we have and every countdown we share:', primary: 'Forever yes ❤️✈️', secondary: 'Choose our date vibe 📱', tertiary: 'Tell me more 💕' },
      benefits: { eyebrow: '← Our connection ✈️', heading: 'THE LONG-DISTANCE DATE 🌍', body: 'Specially planned for {{nickname}} ❤️', primary: 'I’m ready ❤️✈️', secondary: 'Pick date setting 📱', tertiary: 'Countdown details ✨' },
      mood: { eyebrow: '← Back to question 🌍', heading: 'Pick our special date setting ✈️', body: 'Virtual setup or our dream airport reunion date.', primary: 'Continue 💕', secondary: '← Choose another setting' },
      finalAttempt: { eyebrow: '← Close your eyes 🌎', heading: 'Soon we will be in the same room.', body: 'Until then, let’s make tonight unforgettable. Will you say yes?', primary: 'Yes, my love ❤️', secondary: 'Surprise date ✈️', tertiary: 'Always together 💌' },
      yes: { eyebrow: 'NO DISTANCE TOO FAR ✈️', heading: "IT'S A DATE, MY LOVE! ❤️", body: 'Cannot wait for our special time together.', primary: 'Set date & time 📅' },
      availability: { eyebrow: 'Sync our clocks ⏰', heading: 'Choose our date & timezone 🌍', body: 'Lock in our special time together across the miles.', primary: 'Lock in our date ❤️' },
      success: { eyebrow: 'Locked in across the map ✈️', heading: 'Counting down the hours.', body: 'I have the date and time saved. I love you so much! 🌎❤️', primary: 'View invitation ❤️' },
      decline: { eyebrow: 'Always connected 💌', heading: 'You have my whole heart ✨', body: "No matter how many miles lie between us, you are my home. ❤️", primary: 'Done ❤️' },
      secret: { heading: 'A note across the miles…', body: "Distance only proves how strong what we have truly is.\nI love you and cannot wait to hold you soon. ❤️✈️", primary: 'I love you ❤️' }
    },
    moods: [
      { title: 'Virtual Candlelight & Netflix 💻🕯️', description: 'Same movie, coordinated takeout delivery, and FaceTime.', favorite: true },
      { title: 'Airport Reunion & Flowers 💐✈️', description: 'Arrival hugs, biggest bouquet, and straight to dinner.' },
      { title: 'Midway City Weekend Trip 🏙️🚆', description: 'Meeting in the middle for a 48-hour dream adventure.' },
      { title: 'Virtual Stargazing & Late Talk 🌙🎧', description: 'Synchronized playlist, lo-fi beats, and talking till dawn.' }
    ]
  },
  'anniversary-special': {
    id: 'anniversary-special',
    name: 'Anniversary ❤️',
    tagline: 'Heartfelt milestone celebration & nostalgic romance',
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
  },
  'first-date': {
    id: 'first-date',
    name: 'First Date 🌹',
    tagline: 'Gentle butterflies, sweet charm & relaxed conversation',
    themePreset: 'rose',
    content: {
      intro: { eyebrow: 'Hey {{recipientName}} 🌹', heading: 'A little question for you…', body: 'No awkwardness, just genuine curiosity and sweet vibes. ✨', primary: 'Open invitation 🌹' },
      main: { eyebrow: 'First date butterflies ✨', heading: 'Would you like to go out on a date with me?', body: 'I would truly love the chance to get to know you better over good food and relaxed conversation.', primary: 'I would love to 🌹', secondary: 'What do you have in mind? 👀', tertiary: 'Where are we going? ✨' },
      thinking: { eyebrow: '← Take your time 😌', heading: 'Just a casual, lovely evening.', body: 'Zero pressure, just great conversation and delicious treats.', primary: 'Sounds wonderful 🌹', secondary: 'View date ideas 🍽️', tertiary: 'Tell me more ✨', quaternary: 'Thinking… 💫' },
      convince: { eyebrow: '← The first date plan 🌹', heading: 'What to expect on our date:', body: 'Thoughtfully planned so you can simply relax and enjoy:', primary: 'Count me in 🌹❤️', secondary: 'Choose our first vibe ✨', tertiary: 'One more detail 👀' },
      benefits: { eyebrow: '← Date highlights 🌹', heading: 'OUR FIRST DATE EXPERIENCE ✨', body: 'Tailored for {{nickname}} 🌹', primary: 'I’m convinced 🌹❤️', secondary: 'Pick our spot 🍽️', tertiary: 'One quick thing… 💫' },
      mood: { eyebrow: '← Back to question 🌹', heading: 'Choose your ideal first date vibe ✨', body: 'Pick whatever setting feels most comfortable and fun for you.', primary: 'Continue 🌹', secondary: '← Choose another vibe' },
      finalAttempt: { eyebrow: '← One chance? 🥺', heading: 'Just one delightful evening.', body: 'I promise to make it relaxed, fun, and memorable.', primary: 'Yes, let’s do it 🌹✨', secondary: 'Surprise me ✨', tertiary: 'Maybe as friends first 🤝' },
      yes: { eyebrow: 'SO HAPPY YOU SAID YES 🌹', heading: "IT'S OUR FIRST DATE! ✨", body: 'I am so genuinely excited to take you out.', primary: 'Choose date & time 📅' },
      availability: { eyebrow: 'Pick your free day 🌹', heading: 'When are you free to meet? ✨', body: 'Select the date and time that works best for your schedule.', primary: 'Confirm First Date ❤️' },
      success: { eyebrow: 'All set perfectly 🌹', heading: 'Looking forward to our first date.', body: 'I have the time and date noted. See you soon! ✨', primary: 'View invitation details 🌹' },
      decline: { eyebrow: 'Thank you for your honesty 🌹', heading: 'Grateful for you always ✨', body: "I truly appreciate you taking the time to read this.\nWishing you all the happiness always! 🌹", primary: 'Done 🌹' },
      secret: { heading: 'From the heart…', body: "I have wanted to ask you out for a while now.\nReally looking forward to spending time with you! 🌹❤️", primary: 'See you soon ✨' }
    },
    moods: [
      { title: 'Cozy Italian & Gelato 🍝🍨', description: 'Fresh pasta, warm candle ambience, and artisan gelato.', favorite: true },
      { title: 'Art Gallery & Coffee Walk 🖼️☕', description: 'Exhibitions, quiet museum halls, and a warm latte stroll.' },
      { title: 'Sunset Rooftop Appetizers 🌇🍸', description: 'City lights, golden hour skyline, and finger food.' },
      { title: 'Botanical Garden & Tea 🌿🍵', description: 'Fresh flowers, afternoon tea, and a peaceful garden walk.' }
    ]
  },
  'birthday-date': {
    id: 'birthday-date',
    name: 'Birthday Date 🎂',
    tagline: 'Birthday celebration, pampering & making them feel special',
    themePreset: 'strawberry',
    content: {
      intro: { eyebrow: 'Happy Birthday {{recipientName}}! 🎂🎉', heading: 'Your special day deserves a special treat…', body: 'Because the birthday person deserves only the very best! 🎁✨', primary: 'Unwrap invitation 🎁' },
      main: { eyebrow: 'To the birthday star 👑🎂', heading: 'Will you let me take you out for your birthday?', body: 'Your choice of cuisine, dessert on me, and a whole day dedicated to celebrating you.', primary: 'Birthday date accepted! 🎂❤️', secondary: 'What’s the birthday plan? 🎁', tertiary: 'Do I get cake? 🍰' },
      thinking: { eyebrow: '← Birthday VIP 🎂', heading: 'You deserve to be celebrated.', body: 'Cake, your favorite food, and making your birthday memorable.', primary: 'Let’s celebrate! 🎂❤️', secondary: 'Show birthday plans 🎁', tertiary: 'More surprises ✨', quaternary: 'Thinking 😌' },
      convince: { eyebrow: '← Birthday perks 🎂', heading: 'THE BIRTHDAY VIP TREATMENT 🎁', body: 'Everything planned for your special day:', primary: 'I’m ready! 🎂❤️', secondary: 'Pick birthday spot 🍰', tertiary: 'What else? 🎈' },
      benefits: { eyebrow: '← VIP perks 🎂', heading: 'BIRTHDAY CELEBRATION PERKS ✨', body: 'Specially created for birthday star {{nickname}} 👑', primary: 'Sounds amazing 🎂❤️', secondary: 'Choose spot 🍽️', tertiary: 'One more surprise 🎁' },
      mood: { eyebrow: '← Back to question 🎂', heading: 'Pick your dream birthday vibe 🍰', body: 'It is your day! You choose whatever you crave most.', primary: 'Continue 🎂', secondary: '← Choose another vibe' },
      finalAttempt: { eyebrow: '← Birthday wish 🎂', heading: 'Make my birthday wish come true!', body: 'Let me treat you and make your birthday unforgettable.', primary: 'Yes, let’s celebrate! 🎂❤️', secondary: 'Surprise birthday plan 🎁', tertiary: 'Just cake is fine 🍰' },
      yes: { eyebrow: 'HAPPY BIRTHDAY! 🎂🎉', heading: 'BIRTHDAY DATE IS ON! 🎁❤️', body: 'Get ready for an extraordinary birthday celebration.', primary: 'Pick celebration time 📅' },
      availability: { eyebrow: 'Birthday calendar 🎂', heading: 'Select your birthday date time 🎁', body: 'Lock in when we celebrate your special day.', primary: 'Confirm Birthday Date 🎂❤️' },
      success: { eyebrow: 'Birthday date locked 🎂', heading: 'All set for your birthday!', body: 'Everything is planned. Happy Birthday in advance! 🎁✨', primary: 'View invitation details 🎂' },
      decline: { eyebrow: 'Happy Birthday always 🎂', heading: 'Wishing you the best year ahead! ✨', body: "Have the most wonderful birthday celebration!\nYou deserve all the happiness in the world. 🎂🎉", primary: 'Done 🎂' },
      secret: { heading: 'A birthday wish for you…', body: "I am so grateful to have you in my life and celebrate another year of you.\nHappy Birthday! 🎂❤️", primary: 'Thank you ✨' }
    },
    moods: [
      { title: 'Fine Dining & Birthday Dessert 🍷🍰', description: 'Sparkler candle dessert, chef dinner, and birthday toast.', favorite: true },
      { title: 'Fun Activity & Theme Park 🎢🎡', description: 'Rides, carnival games, candy floss, and big smiles.' },
      { title: 'Spa Day & Sunset Dinner 💆‍♀️🌇', description: 'Relaxing massage, pampering, and rooftop dinner.' },
      { title: 'Private Karaoke & Feast 🎤🍕', description: 'Singing your favorite anthems, cocktails, and great food.' }
    ]
  },
  'valentines-day': {
    id: 'valentines-day',
    name: 'Valentine’s Day 💌',
    tagline: 'The ultimate Valentine proposal, roses & romantic dinner',
    themePreset: 'strawberry',
    content: {
      intro: { eyebrow: 'Happy Valentine’s Season 💌🌹', heading: 'A special question for February 14th…', body: 'Roses are red, violets are blue, Valentine’s Day is better with you. ❤️', primary: 'Open Valentine Card 💌' },
      main: { eyebrow: 'Will you be my Valentine? 🌹💌', heading: 'Will you be my Valentine and go on a date with me?', body: 'Flowers, your favorite food, chocolates, and an unforgettable romantic evening together.', primary: 'Yes! I will be your Valentine 🌹❤️', secondary: 'What are you planning? 🍫', tertiary: 'Where are we going? 🍷' },
      thinking: { eyebrow: '← Valentine question 🌹', heading: 'A date made for romance.', body: 'Let me make this Valentine’s Day genuinely magical for you.', primary: 'I would love that 🌹❤️', secondary: 'Show Valentine vibes 🍫', tertiary: 'Tell me more 💕', quaternary: 'Thinking 😌' },
      convince: { eyebrow: '← Valentine perks 💌', heading: 'THE VALENTINE’S EXPERIENCE 🌹', body: 'Why saying yes to this Valentine’s date is a must:', primary: 'Yes, my Valentine! 🌹❤️', secondary: 'Pick date setting 🍷', tertiary: 'More surprises 🍫' },
      benefits: { eyebrow: '← Romantic perks 🌹', heading: 'VALENTINE SPECIAL EDITION ✨', body: 'Crafted exclusively for my Valentine {{nickname}} ❤️', primary: 'Let’s do it 🌹❤️', secondary: 'Choose setting 🍷', tertiary: 'One more question 💌' },
      mood: { eyebrow: '← Back to question 🌹', heading: 'Pick your dream Valentine setting 🍷', body: 'Choose how we spend our romantic Valentine’s Day together.', primary: 'Continue 💌', secondary: '← Choose another setting' },
      finalAttempt: { eyebrow: '← One sweet question 🌹', heading: 'Be my Valentine?', body: 'No one else I would rather spend Valentine’s Day with.', primary: 'Yes, forever your Valentine 🌹❤️', secondary: 'Surprise Valentine date 🍫', tertiary: 'Maybe as friends 🤝' },
      yes: { eyebrow: 'HAPPY VALENTINE’S DAY 🌹', heading: "IT'S A VALENTINE DATE! 💌❤️", body: 'I cannot wait to celebrate this day of love with you.', primary: 'Choose Valentine time 📅' },
      availability: { eyebrow: 'Reserve Valentine’s 🌹', heading: 'Select our Valentine date & time 💌', body: 'Lock in our reservation for February 14th or Valentine weekend.', primary: 'Confirm Valentine’s Date ❤️' },
      success: { eyebrow: 'Valentine locked in 🌹', heading: 'Counting down to February 14th.', body: 'Everything is reserved for our Valentine’s date. Happy Valentine’s! 💌✨', primary: 'View invitation ❤️' },
      decline: { eyebrow: 'Warmest wishes 💌', heading: 'Sending you love always ✨', body: "No matter what, I appreciate and adore you.\nHappy Valentine’s Day! 🌹❤️", primary: 'Done 🌹' },
      secret: { heading: 'From my heart to yours…', body: "You make every single day feel like Valentine’s Day.\nI am so lucky to have you in my life. ❤️💌", primary: 'Happy Valentine’s ❤️' }
    },
    moods: [
      { title: 'Candlelight Dinner & Rose Bouquet 🌹🍷', description: '50 red roses, candlelit table, and wine pairing.', favorite: true },
      { title: 'Chocolatier Tasting & Sunset Walk 🍫🌅', description: 'Artisan chocolate truffles, fondue, and golden hour walk.' },
      { title: 'Starlit Rooftop Romance 🌇✨', description: 'Skyline view, jazz musician, and intimate dining.' },
      { title: 'Cozy Fireside Fondue & Wine 🧀🍷', description: 'Cheese and chocolate fondue, warm fire, and acoustic playlist.' }
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
