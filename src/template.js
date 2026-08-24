const themes = {
  strawberry: { name: 'Warm Minimal ✨', background: '#FCFAF6', primary: '#E6496F', secondary: '#F4E9DD', accent: '#FF7B94', headingColor: '#20191B', text: '#282223', muted: '#70686A', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#EADFE1' },
  blue: { name: 'Blue Trouble 💙', background: '#F4FAFF', primary: '#3B82F6', secondary: '#E8DEFF', accent: '#60A5FA', headingColor: '#0F172A', text: '#1E293B', muted: '#64748B', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#DCE7F5' },
  yellow: { name: 'Yellow Chaos 💛', background: '#FFFDF2', primary: '#D97706', secondary: '#FEF3C7', accent: '#F59E0B', headingColor: '#1C1612', text: '#2D241E', muted: '#786959', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#F0E5D0' },
  midnight: { name: 'Midnight Date 🌙', background: '#13111C', primary: '#F43F5E', secondary: '#312E4A', accent: '#FB7185', headingColor: '#FFFFFF', text: '#F1EDF7', muted: '#A59EB5', card: '#201C30EE', buttonText: '#FFFFFF', border: '#38324F' },
  rose: { name: 'Rose Gold 🌹', background: '#FFF8F5', primary: '#C95A72', secondary: '#F9E4DE', accent: '#DE758C', headingColor: '#241418', text: '#332025', muted: '#7E676D', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#EBDCDD' },
  lavender: { name: 'Soft Lavender 💜', background: '#FCF8FF', primary: '#8B5CF6', secondary: '#F1E8FF', accent: '#C084FC', headingColor: '#261B2D', text: '#2F2734', muted: '#756879', card: '#FFFFFFEE', buttonText: '#FFFFFF', border: '#E7D8F3' }
};

const fonts = {
  romantic: { name: 'Romantic', heading: 'DM Serif Display', body: 'Poppins' },
  cute: { name: 'Cute', heading: 'Fredoka', body: 'Nunito' },
  elegant: { name: 'Elegant', heading: 'Playfair Display', body: 'Inter' },
  modern: { name: 'Modern', heading: 'Manrope', body: 'Inter' },
  handwritten: { name: 'Handwritten Accent', heading: 'DM Serif Display', body: 'Caveat' }
};

const defaultContent = {
  intro: {
    eyebrow: 'Hey {{recipientName}} 👀',
    heading: 'I made something for you…',
    body: 'Made with way too much overthinking 😅',
    primary: 'Open it 👀'
  },
  main: {
    eyebrow: 'Special question ✨',
    heading: 'Will you go on a date with me?',
    body: 'I really enjoy spending time with you',
    primary: 'Haan, chalo 😌',
    secondary: 'Hmm… sochna padega 👀',
    tertiary: 'Convince me 🙃',
    quaternary: 'Pehle plan batao 👀'
  },
  thinking: {
    eyebrow: 'Back',
    heading: 'One cute date. No pressure.',
    body: 'Just food, fun and good conversation.',
    primary: 'Achha, theek hai 💖',
    secondary: 'Date ideas dikhao 👀',
    tertiary: 'Aur convince karo 🙃',
    quaternary: 'Still thinking 🤔'
  },
  convince: {
    eyebrow: 'Back',
    heading: 'Why you should say yes',
    body: 'Here is why saying yes is the best decision of your week:',
    primary: 'Fine, yes 😂💖',
    secondary: 'Benefits batao 🎁',
    tertiary: 'Plan batao',
    quaternary: 'Still not convinced'
  },
  benefits: {
    eyebrow: 'Back',
    heading: 'DATE BENEFITS',
    body: 'Everything is planned so you just have to relax and enjoy:',
    primary: 'Okay okay, yes 💖',
    secondary: 'One last try'
  },
  mood: {
    eyebrow: 'Back',
    heading: 'CHOOSE DATE VIBE',
    body: 'Pick the vibe you like best… baaki planning meri. 😌❤️',
    primary: 'Continue',
    secondary: 'Choose another'
  },
  finalAttempt: {
    eyebrow: 'Return to question',
    heading: 'No jokes now—choose what feels right for you.',
    body: 'No awkward pressure. Just be honest and choose what feels right.',
    primary: 'Chal theek hai! 💖',
    secondary: 'Surprise me 🎁',
    tertiary: 'I need more time',
    quaternary: "Let's stay friends 💛",
    quinary: 'No, thank you'
  },
  needsTime: {
    eyebrow: 'Choice Respected 🌿',
    heading: 'Take all the time you need.',
    body: 'Thank you for being honest. No pressure and no rush.',
    primary: 'Send response'
  },
  yes: {
    eyebrow: 'YES CELEBRATION 🎉',
    heading: "IT'S A DATE! 💖",
    body: 'Okay wow. This actually worked. 😂❤️',
    primary: 'Choose date and time',
    secondary: 'Let {{inviterName}} plan it'
  },
  availability: {
    eyebrow: 'One last thing',
    heading: 'Pick our date & time 👀',
    body: 'Choose the exact moment and I’ll handle the rest. 😌',
    primary: 'Confirm our date'
  },
  success: {
    eyebrow: 'Official Date Pass 💖',
    heading: 'Baaki planning meri.',
    body: 'You picked the timing. You picked the vibe. You just have to show up. 😂❤️',
    primary: 'Done'
  },
  decline: {
    eyebrow: 'Choice Respected 🤝',
    heading: 'No pressure and no awkwardness.',
    body: "Message received. No awkwardness. No pressure.\\nUnlimited friendship, memes, and fun continue as usual. 🤝\\n\\nI'm still glad I asked.",
    primary: 'Send response'
  },
  secret: {
    heading: 'Jokes apart…',
    body: "I made all this because asking you with a boring text didn't feel right.\\nWhatever happens, you're someone I genuinely love spending time with.\\nAnd I'm really happy you said yes. ❤️",
    primary: 'Close'
  }
};

const favoriteMood = { title: 'Dinner + Dessert 🍝', description: 'Food first. Everything else later.', favorite: true };
const moods = [
  favoriteMood,
  { title: 'Coffee + Walk ☕', description: 'Good conversations + long walk' },
  { title: 'Movie + Food 🎬', description: 'Movie, popcorn, and judging movie taste 😂' },
  { title: 'Long Drive 🚗', description: 'Good music playlist and open roads' },
  { title: 'Surprise Me ✨', description: 'You leave all the planning to me 😌' }
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
    content: {
      intro: {
        eyebrow: 'Hey {{recipientName}} 👀',
        heading: 'Okay bestie, I need to tell you something…',
        body: 'Made with way too much courage and zero chill. 😂',
        primary: 'What happened? 👀'
      },
      main: {
        eyebrow: 'Hear me out… 👀',
        heading: 'What if our next hangout was an actual date?',
        body: 'Same us, same unlimited bakwaas, but maybe a little bit romantic? 😌',
        primary: 'Bestie upgrade accepted 💖',
        secondary: 'Wait… what? 👀',
        tertiary: 'Convince me 😂'
      },
      thinking: {
        eyebrow: 'Back',
        heading: 'Same friendship, slightly more romantic',
        body: 'Zero awkwardness. If it’s weird, we pretend it never happened and eat pizza. 😂',
        primary: "Okay, I'm interested 💖",
        secondary: 'Show me the plan',
        tertiary: 'Try harder 😂',
        quaternary: 'Still thinking'
      },
      convince: {
        eyebrow: 'Back',
        heading: 'Friendship Benefits & Upgrades 😂',
        body: 'Why dating your best friend is top-tier: 100% food, 0% awkward small talk, and lifetime VIP gossip access.',
        primary: "Fine, let's try it 💖",
        secondary: 'Show date ideas'
      },
      benefits: {
        eyebrow: 'Back',
        heading: 'BESTIE DATE PERKS 🍕',
        body: '✓ Free food and snacks\n✓ Shared memes throughout\n✓ Best wingman upgraded to date\n✓ Zero awkward silences',
        primary: "Fine, let's try it 💖",
        secondary: 'Show date ideas'
      },
      mood: {
        eyebrow: 'Back',
        heading: 'Choose Activity',
        body: 'Pick what we do for our official first date:',
        primary: 'Continue 💖',
        secondary: 'Choose another'
      },
      finalAttempt: {
        eyebrow: 'Back',
        heading: 'The Final Decision 👀',
        body: 'No pressure, bestie. Choose what feels right for you:',
        primary: "Let's go on a date 💖",
        secondary: 'I need more time',
        tertiary: 'Keep us as friends 💛'
      },
      yes: {
        eyebrow: 'UPGRADE UNLOCKED 🎉',
        heading: 'Best-friend upgrade unlocked!',
        body: 'Besties to date mode: ACTIVATED. This is going to be iconic. 😂❤️',
        primary: 'Plan our date'
      },
      availability: {
        eyebrow: 'Lock it in',
        heading: 'Date, Time, Activity & Location',
        body: 'Choose the best time for our official bestie date.',
        primary: 'Confirm bestie date'
      },
      success: {
        eyebrow: 'Official Date Pass 💖',
        heading: 'Baaki planning meri.',
        body: 'Date confirmed! Unlimited banter, good food, and bestie energy secured.',
        primary: 'Done'
      },
      decline: {
        eyebrow: 'Choice Respected 🤝',
        heading: 'Best friends forever always 🤝',
        body: 'No awkwardness at all! Best-friend privileges remain 100% intact. 🤝❤️',
        primary: 'Send response'
      },
      secret: {
        heading: 'Jokes apart, bestie…',
        body: "You've always been one of my favorite humans.\nI'm so glad we have each other. ❤️",
        primary: 'Close'
      }
    },
    moods: [
      { title: 'Pizza + Gossip 🍕🥤', description: 'Your favorite pizza and 4 hours of pure gossiping.', favorite: true },
      { title: 'Arcade + Bowling 🎳👾', description: 'Winner gets free ice cream and bragging rights.' },
      { title: 'Street Food 🌮🥟', description: 'Momos, chaat, and exploring the best street stalls.' },
      { title: 'Movie + Long Drive 🍿🚗', description: 'Late-night snacks, comfy seats, and endless laughs.' },
      { title: 'Surprise Me ✨', description: 'You trust me to pick the best spot 😌' }
    ]
  },
  'hinglish-proposal': {
    id: 'hinglish-proposal',
    name: 'Hinglish Proposal 🇮🇳',
    tagline: 'Desi Bollywood vibes, sweet Hinglish banter',
    themePreset: 'rose',
    content: {
      intro: {
        eyebrow: 'Suno {{recipientName}}… 🌹',
        heading: 'Suno {{recipientName}}, ek zaroori baat hai…',
        body: 'Kaafi time se bolna tha, socha thoda filmy style me pooch loon! ✨',
        primary: 'Haan bolo 👀'
      },
      main: {
        eyebrow: 'Dil ki baat… 😌❤️',
        heading: 'Kya mere saath date pe chalogi?',
        body: 'Achhi jagah leke jaunga, bills mai bharunga, aur full hero jaisa treat karunga!',
        primary: 'Haan bilkul 💖',
        secondary: 'Sochne do 👀',
        tertiary: 'Pehle plan batao'
      },
      thinking: {
        eyebrow: 'Back',
        heading: 'Ek chance toh banta hai',
        body: 'Pakka bore nahi hone dunga, promise! Unlimited bakwaas free me milegi.',
        primary: 'Theek hai, chalo 💖',
        secondary: 'Date options dikhao',
        tertiary: 'Aur manao 🌹',
        quaternary: 'Abhi bhi soch rahi hoon'
      },
      convince: {
        eyebrow: 'Back',
        heading: 'Filmy Convincing ✨',
        body: 'Hero wali entry, mast khana, aur full entertainment guaranteed:',
        primary: 'Maan gayi 💖',
        secondary: 'Plan dikhao'
      },
      benefits: {
        eyebrow: 'Back',
        heading: 'VIP FILMY DATE BENEFITS 🌹',
        body: '✓ Free delicious food\n✓ Bollywood playlist\n✓ Full hero treatment\n✓ 0% boring moments',
        primary: 'Maan gayi 💖',
        secondary: 'Plan dikhao'
      },
      mood: {
        eyebrow: 'Back',
        heading: 'Choose Date Vibe ✨',
        body: 'Kaisi date pasand aayegi? Tu bol bas, reservations mai karwa lunga.',
        primary: 'Continue 💖',
        secondary: 'Choose another'
      },
      finalAttempt: {
        eyebrow: 'Back',
        heading: 'Aakhri Faisla 🌹',
        body: 'Achhi memories banegi, pakka! Ab batao kya socha?',
        primary: 'Haan, chalte hain 💖',
        secondary: 'Mujhe time chahiye',
        tertiary: 'Dost rehna better hai 🤝'
      },
      yes: {
        eyebrow: 'KAMAAL HO GAYA 🎉',
        heading: "It's a date ji! 🌹",
        body: 'I am so excited! Bahut maza aayega. 🌹❤️',
        primary: 'Din aur time fix karo'
      },
      availability: {
        eyebrow: 'Booking 🌹',
        heading: 'Date, Time & Location',
        body: 'Apna free time select karo, baki sab mere pe chhod do.',
        primary: 'Date pakki karo'
      },
      success: {
        eyebrow: 'Date Pass 🌹',
        heading: 'Milte hain phir!',
        body: 'Time note kar liya hai. Bas ready hoke aa jana! ✨',
        primary: 'Done'
      },
      decline: {
        eyebrow: 'Choice Respected 🤝',
        heading: 'Dosti zindabad hamesha ✨',
        body: 'Koi pressure nahi hai! You are super special always. 🤝❤️',
        primary: 'Send response'
      },
      secret: {
        heading: 'Dil se ek chhota sa note…',
        body: 'Tumhare saath time spend karna mujhe bohot achha lagta hai.\nLooking forward to our special day! ❤️',
        primary: 'Close'
      }
    },
    moods: [
      { title: 'Rooftop Chai ☕🌇', description: 'Sunset view, hot kulhad chai, and long conversations.', favorite: true },
      { title: 'Candlelight Dinner 🥘🕯️', description: 'Butter chicken, paneer tikka, and soothing live music.' },
      { title: 'Long Drive 🚗🌙', description: 'Bollywood playlist, cold breeze, and ice cream at 2am.' },
      { title: 'Street Food 🥟🌮', description: 'Momos, chaat, and exploring the best street stalls.' },
      { title: 'Movie + Dessert 🍨🎬', description: 'Corner seats, big popcorn tub, and waffles afterwards.' },
      { title: 'Surprise Me ✨', description: 'Full Bollywood surprise date 😌' }
    ]
  },
  'funny-proposal': {
    id: 'funny-proposal',
    name: 'Funny Proposal 😂',
    tagline: 'High-energy comedy, teasing & zero boring moments',
    themePreset: 'yellow',
    content: {
      intro: {
        eyebrow: 'FORMAL NOTICE 🚨',
        heading: 'Official date application submitted',
        body: 'Subject: Seeking formal permission to take you out on a world-class date.',
        primary: 'Review application'
      },
      main: {
        eyebrow: 'Non-negotiable offer 👀',
        heading: 'Will you accept this date application?',
        body: 'Side effects may include laughing too hard and falling slightly in love.',
        primary: 'Application accepted 💖',
        secondary: 'Application under review 👀',
        tertiary: 'Show qualifications 😂'
      },
      thinking: {
        eyebrow: 'Back',
        heading: 'Application Review In Progress',
        body: 'Our system detected high qualification and 100% good company vibes.',
        primary: 'Approve application 💖',
        secondary: 'Show practical test',
        tertiary: 'Needs more review'
      },
      convince: {
        eyebrow: 'Back',
        heading: 'Candidate Resume & Qualifications',
        body: 'Peer-reviewed research and verified candidate facts:',
        primary: 'Candidate approved 💖',
        secondary: 'Schedule practical test',
        tertiary: 'One more qualification'
      },
      benefits: {
        eyebrow: 'Back',
        heading: 'Extra Candidate Qualifications 🎁',
        body: '✓ Always orders extra fries\n✓ Excellent playlist curator\n✓ Expert meme provider\n✓ 0% boring silences',
        primary: 'Approved! 😂💖',
        secondary: 'Schedule practical test'
      },
      mood: {
        eyebrow: 'Back',
        heading: 'Choose Activity',
        body: 'Select candidate testing location / food category:',
        primary: 'Continue 💖',
        secondary: 'Choose another'
      },
      finalAttempt: {
        eyebrow: 'Back',
        heading: 'Final Committee Decision 📋',
        body: 'Select final application status for this candidate:',
        primary: 'Approved! 😂💖',
        secondary: 'Keep application pending',
        tertiary: 'Friendship position only 💛',
        quaternary: 'Decline politely'
      },
      yes: {
        eyebrow: 'OFFICIALLY HIRED 🚀',
        heading: 'Candidate approved!',
        body: 'Best hiring decision of your year. Onboarding begins immediately! 😂❤️',
        primary: 'Schedule interview-date'
      },
      availability: {
        eyebrow: 'Appointment Booking 📅',
        heading: 'Date, Time & Location',
        body: 'Lock in the slot for the official practical date exam.',
        primary: 'Confirm appointment'
      },
      success: {
        eyebrow: 'Date Approval Certificate 📜',
        heading: 'Date Approval Certificate',
        body: 'Candidate officially confirmed for date duties. Prepare for greatness! 😂✨',
        primary: 'Done 🚀'
      },
      decline: {
        eyebrow: 'Application Status 📋',
        heading: 'Friendzone Tier Unlocked 🤝',
        body: 'Honored to have my application reviewed. Unlimited friendship perks active! 😂🤝',
        primary: 'Done 🤝'
      },
      secret: {
        heading: 'Behind the comedy…',
        body: 'Jokes aside, I genuinely adore your company and cannot wait to hang out! ❤️',
        primary: 'See you soon ✨'
      }
    },
    moods: [
      { title: 'Burger Feast 🍔🥤', description: 'Loaded cheese fries, smash burgers, and thick shakes.', favorite: true },
      { title: 'Arcade 🕹️👾', description: 'Air hockey championship and claw machine attempts.' },
      { title: 'Tacos 🌮🍹', description: 'Messy delicious tacos and unlimited funny banter.' },
      { title: 'Bowling 🎳', description: 'Bowling showdown and loser buys dessert.' },
      { title: 'Go-Karting 🏎️💨', description: 'Fast laps, high adrenaline, and winner gets dinner paid.' },
      { title: 'Comedy Show 🎤😂', description: 'Live stand-up comedy and nonstop laughter.' }
    ]
  },
  'long-distance': {
    id: 'long-distance',
    name: 'Long Distance 🌎',
    tagline: 'Miles apart, together at heart — reunion & virtual date',
    themePreset: 'midnight',
    content: {
      intro: {
        eyebrow: 'Across every mile ✈️',
        heading: 'Across every mile, you are close to my heart',
        body: 'Counting down every second until we share our special time together. 🌎❤️',
        primary: 'Open our message'
      },
      main: {
        eyebrow: 'Even across the map 🗺️❤️',
        heading: 'Will you have a special date with me?',
        body: 'Whether it’s our next reunion in person or our favorite virtual candlelight dinner.',
        primary: 'Yes, across every mile 💖',
        secondary: 'Virtual or in-person? 👀',
        tertiary: 'Show reunion plans'
      },
      thinking: {
        eyebrow: 'Back',
        heading: 'How should we celebrate?',
        body: 'Pick our setup: virtual dinner, FaceTime movie, or planning our dream meetup.',
        primary: 'Always yes 💖',
        secondary: 'Virtual Date',
        tertiary: 'In-Person Reunion',
        quaternary: 'Let inviter decide'
      },
      convince: {
        eyebrow: 'Back',
        heading: 'Our Distance Story & Countdown',
        body: 'Distance means so little when someone means so much:',
        primary: 'Always yes 💖',
        secondary: 'Show date ideas',
        tertiary: 'I miss you—tell me more'
      },
      benefits: {
        eyebrow: 'Back',
        heading: 'Memories & Reunion Countdown ✈️',
        body: '✓ Synchronized playlists\n✓ Coordinated food delivery\n✓ Unbroken countdown to our next hug\n✓ Whole heart across the miles',
        primary: 'Always yes 💖',
        secondary: 'Show date ideas'
      },
      mood: {
        eyebrow: 'Back',
        heading: 'Choose Activity ✈️',
        body: 'Pick our date setting:',
        primary: 'Continue 💖',
        secondary: 'Choose another'
      },
      finalAttempt: {
        eyebrow: 'Back',
        heading: 'No Distance Can Stop Us ❤️',
        body: 'Until we are in the same room, let’s make our date unforgettable.',
        primary: 'Always yes 💖',
        secondary: 'I need more time',
        tertiary: 'Not right now'
      },
      yes: {
        eyebrow: 'NO DISTANCE TOO FAR ✈️',
        heading: 'No distance is too far!',
        body: 'I cannot wait for our special time together across the miles. 🌎❤️',
        primary: 'Plan across time zones'
      },
      availability: {
        eyebrow: 'Sync our clocks ⏰',
        heading: 'Confirm Both Time Zones & Schedule',
        body: 'Lock in the date and time across both of our locations.',
        primary: 'Confirm our date'
      },
      success: {
        eyebrow: 'Date Pass + Countdown ✈️',
        heading: 'Date Pass + Countdown',
        body: 'Our date is locked in! Counting down the hours. I love you so much! 🌎❤️',
        primary: 'Done ❤️'
      },
      decline: {
        eyebrow: 'Always connected 💌',
        heading: 'You have my whole heart ✨',
        body: 'No matter how many miles lie between us, you are always special to me. ❤️',
        primary: 'Done ❤️'
      },
      secret: {
        heading: 'A note across the miles…',
        body: 'Distance only proves how strong what we have truly is.\nI love you and cannot wait to hold you soon. ❤️✈️',
        primary: 'I love you ❤️'
      }
    },
    moods: [
      { title: 'Virtual Dinner 💻🕯️', description: 'Same meal, coordinated takeout delivery, and FaceTime.', favorite: true },
      { title: 'Synchronized Movie 🎬🍿', description: 'Teleparty sync, popcorn, and live video reactions.' },
      { title: 'Online Game Night 🎮👾', description: 'Co-op games, trivia, and playful competition.' },
      { title: 'Airport Reunion 💐✈️', description: 'Arrival hugs, biggest bouquet, and straight to dinner.' },
      { title: 'Weekend Trip 🏙️🚆', description: 'Meeting in the middle for a 48-hour dream adventure.' },
      { title: 'Virtual Stargazing 🌙🎧', description: 'Synchronized playlist, lo-fi beats, and talking till dawn.' }
    ]
  },
  'anniversary-special': {
    id: 'anniversary-special',
    name: 'Anniversary ❤️',
    tagline: 'Heartfelt milestone celebration & nostalgic romance',
    themePreset: 'rose',
    content: {
      intro: {
        eyebrow: 'Happy Anniversary my love ❤️',
        heading: 'Happy anniversary, my love',
        body: 'Celebrating another beautiful milestone in our journey together. 🥂✨',
        primary: 'Open our story 💖',
        secondary: 'Skip to surprise'
      },
      main: {
        eyebrow: 'To my favorite person ❤️',
        heading: 'Will you celebrate our anniversary with me?',
        body: 'Another year of loving you, and I want to make our celebration truly unforgettable.',
        primary: 'Forever yes 💖',
        secondary: "What's the surprise? 👀",
        tertiary: 'Choose together'
      },
      thinking: {
        eyebrow: 'Back',
        heading: 'A few hints for our special day…',
        body: 'A romantic evening, your favorite treats, and celebrating everything we share.',
        primary: "I'm in 💖",
        secondary: 'Keep it a surprise',
        tertiary: 'Show celebration options'
      },
      convince: {
        eyebrow: 'Back',
        heading: 'Celebrating our love story 💖',
        body: 'Why this anniversary is going to be extraordinary:',
        primary: 'Forever and always 💖',
        secondary: 'Show celebration options'
      },
      benefits: {
        eyebrow: 'Back',
        heading: 'ANNIVERSARY SPECIAL EDITION ✨',
        body: '✓ Romantic ambience\n✓ Your favorite cuisine\n✓ Reminiscing on our best memories\n✓ A celebration dedicated to us',
        primary: 'Forever and always 💖',
        secondary: 'Show celebration options'
      },
      mood: {
        eyebrow: 'Back',
        heading: 'Celebration Options 🥂',
        body: 'Choose how we celebrate our anniversary:',
        primary: 'Continue 💖',
        secondary: 'Choose another plan'
      },
      finalAttempt: {
        eyebrow: 'Back',
        heading: 'Celebrating Our Love Story ❤️',
        body: 'You and me, always. How would you like to celebrate?',
        primary: 'Forever and always 💖',
        secondary: 'Simple celebration',
        tertiary: 'Celebrate another day'
      },
      yes: {
        eyebrow: 'HAPPY ANNIVERSARY 🥂',
        heading: 'Forever and always',
        body: 'Here is to our journey, our love, and many more chapters together. 🥂❤️',
        primary: 'Plan our anniversary',
        secondary: 'Keep it a surprise'
      },
      availability: {
        eyebrow: 'Save the date 💍',
        heading: 'Date, Time, Dress Code & Pickup',
        body: 'Select our celebration time and details.',
        primary: 'Confirm celebration'
      },
      success: {
        eyebrow: 'Anniversary Itinerary 🥂',
        heading: 'Anniversary Itinerary',
        body: 'Everything is set for our anniversary. I love you! 🥂✨',
        primary: 'Done ❤️'
      },
      decline: {
        eyebrow: 'Together always ❤️',
        heading: 'Every day is a celebration with you ✨',
        body: 'Celebrating you is my favorite thing always. ❤️',
        primary: 'Done ❤️'
      },
      secret: {
        heading: 'My love note for you…',
        body: 'Thank you for being my anchor, my joy, and my favorite adventure.\nHappy Anniversary! ❤️💍',
        primary: 'I love you ❤️'
      }
    },
    moods: [
      { title: 'Romantic Getaway Weekend ✈️🏖️', description: 'Scenic resort stay, spa, and oceanside dinner.', favorite: true },
      { title: 'Candlelight Dinner 🍾🕯️', description: 'Chef tasting menu, vintage champagne, and live violin.' },
      { title: 'Rooftop Evening 🌇✨', description: 'Skyline view, jazz musician, and intimate dining.' },
      { title: 'Staycation 🪵🔥', description: 'Fireplace, hot cocoa, stargazing, and movie marathon.' },
      { title: 'Memory Walk 🌿📸', description: 'Revisiting where we first met and all our favorite spots.' }
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
  },
  'sorry-make-things-right': {
    id: 'sorry-make-things-right',
    name: 'Sorry & Make Things Right 🥺💐',
    tagline: 'A calm apology flow that respects boundaries',
    themePreset: 'lavender',
    fontPreset: 'modern',
    features: { confetti: false, collection: false, funnyBack: false, music: false, respectfulMode: true, optionalScheduling: true },
    content: {
      intro: { eyebrow: 'A sincere note for {{recipientName}}', heading: 'I owe you a real apology.', body: 'No drama. No pressure. I just want to acknowledge what happened properly.', primary: 'Read it' },
      main: { eyebrow: 'I am listening', heading: 'I am truly sorry.', body: 'You did not deserve what happened. I take responsibility, and I am not here to make excuses.', primary: "I'm ready to talk", secondary: 'I need more time', tertiary: 'Please give me space' },
      thinking: { eyebrow: 'Your pace matters', heading: 'Take all the time you need.', body: 'I understand if you are not ready. Your comfort matters more than my timeline.', primary: "I'm ready to talk", secondary: 'Maybe later', tertiary: 'Please give me space', quaternary: 'Show me what changes' },
      convince: { eyebrow: 'Accountability', heading: 'What I understand now', body: 'I understand that my actions hurt you. I should have handled things with more care, honesty, and respect.', primary: "I'm ready to talk", secondary: 'Meeting options', tertiary: 'I need space' },
      benefits: { eyebrow: 'What will change', heading: 'Not just words.', body: 'I will listen first, not interrupt, respect your boundaries, and avoid repeating the same mistake.', primary: "I'm ready to talk", secondary: 'How can we talk?', tertiary: 'I need space' },
      mood: { eyebrow: 'Only if comfortable', heading: 'How would you prefer to talk?', body: 'Choose whatever feels safest and easiest for you.', primary: 'Continue', secondary: '← Choose another option' },
      finalAttempt: { eyebrow: 'One respectful question', heading: 'If and when you are comfortable, may I apologize properly?', body: 'You can say yes, ask for more time, or ask for space. I will respect it.', primary: "I'm ready to talk", secondary: 'I need more time', tertiary: 'Please give me space' },
      yes: { eyebrow: 'Thank you for being open', heading: 'We can talk at your pace.', body: 'You choose the time and format. If you want to skip scheduling, that is okay too.', primary: 'Pick date & time' },
      availability: { eyebrow: 'Optional scheduling', heading: 'Pick a time only if you want to.', body: 'Choose a date, time, and format—or skip this step.', primary: 'Confirm if comfortable' },
      success: { eyebrow: 'Thank you', heading: 'I will respect the plan.', body: 'Thank you for giving me a chance to talk. I will listen and keep this respectful.', primary: 'Done' },
      decline: { eyebrow: 'Choice respected', heading: 'I understand.', body: "I will respect your space and won't pressure you. I am still sorry for what happened.", primary: 'Done' },
      secret: { heading: 'One more sincere note', body: 'I am not asking you to forget or forgive immediately. I just want to do better and respect whatever you need.', primary: 'Close' }
    },
    moods: [
      { title: 'Coffee and conversation ☕', description: 'A calm public place, short and respectful.', favorite: true },
      { title: 'Peaceful walk 🌿', description: 'Low-pressure conversation with space to pause.' },
      { title: 'Phone call 📞', description: 'Talk from wherever feels comfortable.' },
      { title: 'Video call 💻', description: 'Face-to-face without needing to meet.' },
      { title: 'Message only 💬', description: 'No call, no meetup—just written words.' }
    ]
  }
};


function normalizeTemplateId(templateId) {
  const key = String(templateId || '').trim();
  return invitationTemplates[key] ? key : '';
}

function getTemplateConfig(templateId = 'best-friend-date', inviterName = '', recipientName = '') {
  const id = normalizeTemplateId(templateId) || 'best-friend-date';
  const tpl = invitationTemplates[id] || invitationTemplates['best-friend-date'];
  const cfg = defaultConfig(inviterName, recipientName);
  const themePreset = themes[tpl.themePreset] ? tpl.themePreset : 'strawberry';
  const fontPreset = fonts[tpl.fontPreset] ? tpl.fontPreset : (cfg.theme.fontPreset || 'romantic');
  cfg.templateId = id;
  cfg.title = tpl.name;
  cfg.theme = { preset: themePreset, ...themes[themePreset], fontPreset, ...fonts[fontPreset] };
  cfg.content = { ...structuredClone(defaultContent), ...structuredClone(tpl.content || {}) };
  cfg.moods = structuredClone(tpl.moods || moods);
  cfg.features = { ...cfg.features, ...structuredClone(tpl.features || {}) };
  return cfg;
}

function validateTemplateGraph(template) {
  if (!template || !template.id) return { valid: false, error: 'Missing template or ID' };
  const content = template.content || {};
  const screens = content.screens || content;
  const standardScreens = ['intro', 'main', 'thinking', 'convince', 'benefits', 'mood', 'finalAttempt', 'yes', 'availability', 'success', 'decline'];
  const required = ['intro', 'main', 'yes', 'success', 'decline'];
  for (const req of required) {
    if (!screens[req]) return { valid: false, error: `Missing required screen ${req} in template ${template.id}` };
  }
  
  // Graph reachability check
  const visited = new Set();
  const queue = ['intro'];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    
    // Determine transitions for this screen
    let nextScreens = [];
    if (current === 'intro') nextScreens = ['main'];
    else if (current === 'main') {
      if (template.features?.respectfulMode) nextScreens = ['yes', 'decline', 'space'];
      else nextScreens = ['yes', 'thinking', 'convince', 'memories'];
    } else if (current === 'thinking') {
      if (template.features?.respectfulMode) nextScreens = ['yes', 'decline', 'space', 'benefits', 'main'];
      else nextScreens = ['yes', 'mood', 'convince', 'finalAttempt', 'main'];
    } else if (current === 'convince') {
      if (template.features?.respectfulMode) nextScreens = ['yes', 'mood', 'space', 'main'];
      else nextScreens = ['yes', 'mood', 'benefits', 'main'];
    } else if (current === 'benefits') {
      if (template.features?.respectfulMode) nextScreens = ['yes', 'mood', 'space', 'main'];
      else nextScreens = ['yes', 'mood', 'finalAttempt', 'main'];
    } else if (current === 'mood') {
      nextScreens = ['yes', 'moodConfirm', 'main'];
    } else if (current === 'moodConfirm') {
      nextScreens = ['yes', 'mood'];
    } else if (current === 'finalAttempt') {
      if (template.features?.respectfulMode) nextScreens = ['yes', 'decline', 'space'];
      else nextScreens = ['yes', 'mood', 'decline'];
    } else if (current === 'yes') {
      nextScreens = ['availability', 'success'];
    } else if (current === 'availability') {
      nextScreens = ['success', 'decline', 'space'];
    } else if (current === 'decline') {
      nextScreens = ['intro']; // replay transition
    }
    
    for (const nxt of nextScreens) {
      if (nxt === 'memories' || nxt === 'space' || nxt === 'moodConfirm' || screens[nxt] || standardScreens.includes(nxt)) {
        if (!visited.has(nxt) && !queue.includes(nxt) && nxt !== current) {
          queue.push(nxt);
        }
      }
    }
  }
  
  const terminals = ['success', 'decline', 'space'];
  const hasTerminal = terminals.some(t => visited.has(t));
  if (!hasTerminal) return { valid: false, error: `No terminal screen reachable in template ${template.id}` };
  
  return { valid: true, reachableCount: visited.size, visited: Array.from(visited) };
}

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
  normalizeTemplateId,
  getTemplateConfig,
  validateTemplateGraph,
  defaultConfig
};
