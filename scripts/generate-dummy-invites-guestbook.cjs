/**
 * Generates production-like dummyData/example/invites.json and guestbook.json.
 * Guestbook entries are interleaved by type so sorting by date looks natural.
 * Run: node scripts/generate-dummy-invites-guestbook.cjs
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'dummyData', 'example');

const longGuestbookMessage = `We have been looking forward to writing this since the day you two made it official — not because we love typing, but because you deserve more than a generic “congrats” on a card. You have built something rare: a partnership that is visibly kind, stubbornly hopeful, and weird in the best way (the kind of weird that makes ordinary Tuesdays feel like an inside joke). From cramped flats to big moves, from tiny wins to the hard seasons you never posted about, you have shown up for each other with the sort of patience most people only read about.

Thank you for the save-the-dates, the spreadsheets, the playlists, and the million tiny decisions that turned into a day we cannot wait to witness. Thank you for letting us be part of the story — not as spectators, but as people who will cry during vows, laugh during speeches, and dance badly on purpose because joy is the whole point.

Here is to the promises, the rings, the cake, and every quiet morning after. Here is to friendship that outlasts trends, to love that does not keep score, and to a honeymoon where the only notifications are waves and birds. We are cheering for you — today, tomorrow, and on every anniversary you celebrate with takeout and slippers.`;

const mediumMessage = `Cannot believe the day is almost here — you two have been planning like pros and still found time to check in on everyone else. We will be there with bells on (metaphorically; actual bells subject to venue rules).`;

const officeCrewMessage = `We are raising a metaphorical glass from the break room — congratulations on the wedding. Your save-the-date has been on the fridge, the whiteboard, and someone’s monitor wallpaper for weeks, so you have officially broken our collective cool. Half of us only know you from retreats and client dinners, and you still made us feel like friends, not plus-ones on a spreadsheet. We have argued about gifts, rehearsed our group photo faces, and promised not to mention “the incident” at the Christmas party (unless the speeches go long). Wishing you inbox zero until the aisle, kind weather, and a honeymoon where the only “stand-up” is on the beach. Cannot wait to watch you both say the words, eat the cake, and dance like nobody is grading footwork.`;

/** Fisher–Yates shuffle (mutates) */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

const surnames = [
    'Thompson',
    'Chen',
    'Murphy',
    'Singh',
    'Patel',
    'Williams',
    'Nakamura',
    "O'Connor",
    'Rahman',
    'Nguyen',
    'Kowalski',
    'Silva',
    'Haddad',
    'McKenzie',
    'Park',
    'Iyer',
    'Foster',
    'Okonkwo',
    'Lindqvist',
    'Reyes',
    'Tanaka',
];

const givenMale = [
    'James',
    'Michael',
    'David',
    'Daniel',
    'Marcus',
    'Omar',
    'Wei',
    'Lucas',
    'Ryan',
    'Tom',
    'Vikram',
    'Noah',
    'Blake',
    'Sam',
    'Drew',
];

const givenFemale = [
    'Olivia',
    'Emma',
    'Sarah',
    'Priya',
    'Ana',
    'Elena',
    'Mina',
    'Sophie',
    'Grace',
    'Chioma',
    'Ruth',
    'Avery',
    'Jamie',
    'River',
    'Eleanor',
];

const givenChildren = ['Leo', 'Zara', 'Sofia', 'Aria', 'Dev', 'Kiran', 'Nina', 'Jack', 'Maya', 'Hugo'];

function fullName(given, surname) {
    return `${given} ${surname}`;
}

/**
 * Newest post first in the feed = smallest daysAgo.
 * Keeps interleaved[] order identical to reverse-chronological display order (no jitter, so types stay mixed).
 */
function assignDaysAgo(entries, maxDays = 115) {
    const n = entries.length;
    if (n === 0) return;
    for (let i = 0; i < n; i++) {
        entries[i].daysAgo = n === 1 ? 0 : Math.floor((i * maxDays) / (n - 1));
    }
}

function buildInvites() {
    const invites = [];
    let surnameIx = 0;
    const nextSurname = () => surnames[surnameIx++ % surnames.length];

    // --- The <Surname> family (multi-guest) ---
    for (let i = 0; i < 12; i++) {
        const s = nextSurname();
        const gM = pick(givenMale);
        const gF = pick(givenFemale);
        const child = pick(givenChildren);
        invites.push({
            name: `The ${s} family`,
            guests: [
                { name: fullName(gM, s), attending: true, dietaryRestrictions: i % 4 === 0 ? 'Vegetarian' : undefined },
                { name: fullName(gF, s), attending: true },
                { name: fullName(child, s), attending: i % 3 !== 0, dietaryRestrictions: i % 3 === 0 ? 'Kids meal if available' : undefined },
            ],
            seen: Math.random() > 0.08,
            responded: Math.random() > 0.12,
            notes: i % 5 === 0 ? 'Looking forward to it — let us know if you need anything.' : undefined,
            phone: i % 7 === 0 ? `+61 4${String(10 + (i % 80)).padStart(2, '0')} ${String(100000 + i * 137).slice(0, 3)} ${String(100 + i * 11).slice(0, 3)}` : undefined,
            email: i % 8 === 0 ? `${gM.toLowerCase()}.${s.toLowerCase()}@example.com` : undefined,
            carpoolRequested: i % 9 === 0,
            carpoolSpotsOffered: i % 9 === 0 ? 0 : i % 11 === 0 ? 2 : undefined,
        });
    }

    // --- Husband & wife style ---
    for (let i = 0; i < 14; i++) {
        const s = nextSurname();
        const a = pick(givenMale);
        const b = pick(givenFemale);
        invites.push({
            name: `${a} & ${b} ${s}`,
            guests: [
                { name: fullName(a, s), attending: true, dietaryRestrictions: i % 6 === 0 ? 'Halal preferred' : undefined },
                { name: fullName(b, s), attending: true },
            ],
            seen: Math.random() > 0.1,
            responded: Math.random() > 0.1,
            carpoolRequested: i % 10 === 0,
            carpoolSpotsOffered: i % 10 === 0 ? 0 : undefined,
        });
    }

    // --- Single recipient (full name) ---
    for (let i = 0; i < 16; i++) {
        const s = nextSurname();
        const g = i % 2 === 0 ? pick(givenFemale) : pick(givenMale);
        invites.push({
            name: fullName(g, s),
            guests: [{ name: fullName(g, s), attending: true, dietaryRestrictions: i % 5 === 0 ? 'Coeliac — gluten free' : undefined }],
            seen: Math.random() > 0.07,
            responded: Math.random() > 0.09,
            email: i % 4 === 0 ? `${g.toLowerCase()}.${s.toLowerCase().replace(/'/g, '')}@example.com` : undefined,
            notes: i % 6 === 0 ? 'Travelling from interstate — may arrive the night before.' : undefined,
        });
    }

    // --- Couple without repeating surname in label (first names only + shared surname in guests) ---
    for (let i = 0; i < 10; i++) {
        const s = nextSurname();
        const a = pick(givenMale);
        const b = pick(givenFemale);
        invites.push({
            name: `${a} & ${b}`,
            guests: [
                { name: fullName(a, s), attending: true },
                { name: fullName(b, s), attending: true },
            ],
            seen: true,
            responded: true,
        });
    }

    // --- Regrets (whole household can't make it) ---
    for (let i = 0; i < 4; i++) {
        const s = nextSurname();
        invites.push({
            name: `The ${s} family`,
            guests: [
                { name: fullName(pick(givenMale), s), attending: false },
                { name: fullName(pick(givenFemale), s), attending: false },
                { name: fullName(pick(givenChildren), s), attending: false },
            ],
            seen: true,
            responded: true,
            notes: 'So sorry — we will be overseas. Thinking of you both.',
        });
    }

    // --- Plus-one TBC, realistic ---
    for (let i = 0; i < 3; i++) {
        const s = nextSurname();
        const host = pick(givenMale);
        invites.push({
            name: `${fullName(host, s)} + guest`,
            guests: [
                { name: fullName(host, s), attending: true },
                { name: 'Guest (name to follow)', attending: undefined },
            ],
            seen: true,
            responded: false,
            notes: 'Plus-one details next week.',
        });
    }

    // --- Carpool / transport notes (natural wording) ---
    const sCar = nextSurname();
    invites.push({
        name: `The ${sCar} family`,
        guests: [
            { name: fullName(pick(givenMale), sCar), attending: true },
            { name: fullName(pick(givenFemale), sCar), attending: true },
        ],
        seen: true,
        responded: true,
        carpoolRequested: true,
        carpoolSpotsOffered: 0,
        notes: 'Happy to meet near the station if anyone is heading that way.',
    });

    const sOffer = nextSurname();
    invites.push({
        name: `${pick(givenMale)} & ${pick(givenFemale)} ${sOffer}`,
        guests: [
            { name: fullName(pick(givenMale), sOffer), attending: true },
            { name: fullName(pick(givenFemale), sOffer), attending: true },
        ],
        seen: true,
        responded: true,
        carpoolRequested: false,
        carpoolSpotsOffered: 3,
        phone: '+61 400 222 881',
        notes: 'Driving from the coast — room for three if helpful.',
    });

    shuffle(invites);
    return invites;
}

function buildGuestbook() {
    /** Pools by rough “kind” for round-robin interleaving */
    const pools = {
        long: [],
        longOffice: [],
        medium: [],
        short: [],
        photoOnly: [],
        emptyWithPhoto: [],
        whitespacePhoto: [],
        minimal: [],
        emoji: [],
        /** Trigger evaluateGuestbookAutomoderation (URL / profanity / excessive caps) — DummyDataPopulator applies hide() after create */
        automod: [],
        hidden: [],
        anonymous: [],
        noDisplayName: [],
    };

    const authorFirst = [
        'Mia',
        'Leo',
        'Sarah',
        'Tom',
        'Grace',
        'James',
        'Nina',
        'Chris',
        'Amy',
        'Ben',
        'Zoe',
        'Dan',
        'Kate',
        'Will',
        'Lucy',
        'Alex',
        'Sam',
        'Jules',
        'Ravi',
        'Emma',
        'Nick',
        'Clara',
        'Hannah',
        'Sean',
        'Priya',
        'Matt',
        'Laura',
        'Steve',
        'Jen',
        'Owen',
        'Beth',
        'Mark',
        'Sophie',
        'Ryan',
        'Ella',
    ];

    let nameRot = 0;
    const nextAuthor = () => authorFirst[nameRot++ % authorFirst.length];

    // Long messages (varied sign-offs)
    const longSignoffs = [
        'With love',
        'All our love',
        'See you soon',
        'Hugs',
        'Cheers',
        'Xx',
    ];
    for (let i = 0; i < 10; i++) {
        pools.long.push({
            displayName: `${nextAuthor()} K.`,
            content: `${longGuestbookMessage}\n\n— ${pick(longSignoffs)}`,
            visible: true,
            attachDummyPhoto: i % 3 !== 1,
        });
    }

    pools.longOffice.push({
        displayName: 'The office crew',
        content: officeCrewMessage,
        visible: true,
        attachDummyPhoto: true,
    });

    for (let i = 0; i < 22; i++) {
        pools.medium.push({
            displayName: i % 4 === 0 ? undefined : `${nextAuthor()} ${pick(['M.', 'R.', 'L.', 'T.', 'S.'])}`,
            content: `${mediumMessage} So glad we get to celebrate with you.`,
            visible: Math.random() > 0.06,
            attachDummyPhoto: i % 5 === 2,
        });
    }

    const shorts = [
        'So happy for you both — see you on the day!',
        'Yes!!',
        '❤️',
        'See you there.',
        'Hype!',
        'Congrats!',
        'Crying already.',
        'Cannot wait.',
        'Woo!',
        'Team bride & groom',
        'RSVP: joy',
        'Finally!!',
        'Love this for you.',
    ];
    for (const t of shorts) {
        pools.short.push({
            displayName: `${nextAuthor()} ${pick(['B.', 'P.', 'H.', 'W.', 'M.', 'L.'])}`,
            content: t,
            visible: true,
            attachDummyPhoto: false,
        });
    }

    const photoOnlyNames = [
        () => `${nextAuthor()} & family`,
        () => `${nextAuthor()} & Sam`,
        () => `${nextAuthor()} ${pick(['R.', 'T.', 'K.'])}`,
        () => `The ${pick(['Nguyens', 'Patels', 'Kellys'])}`,
    ];
    for (let i = 0; i < 8; i++) {
        pools.photoOnly.push({
            displayName: pick(photoOnlyNames)(),
            visible: true,
            attachDummyPhoto: true,
        });
    }

    for (let i = 0; i < 6; i++) {
        pools.emptyWithPhoto.push({
            displayName: `${nextAuthor()} ${pick(['L.', 'T.', 'F.'])}`,
            content: '',
            visible: true,
            attachDummyPhoto: true,
        });
    }

    for (let i = 0; i < 4; i++) {
        pools.whitespacePhoto.push({
            displayName: pick(['Mum', 'Dad', 'Aunt Jo', 'Uncle Pete']),
            content: '   \n\t  ',
            visible: true,
            attachDummyPhoto: true,
        });
    }

    pools.minimal.push({
        displayName: `${nextAuthor()} C.`,
        content: '.',
        visible: true,
    });

    pools.emoji.push({
        displayName: `${nextAuthor()}`,
        content: '💒✨🥂',
        visible: true,
        attachDummyPhoto: true,
    });

    pools.automod.push(
        {
            displayName: 'Owen T.',
            content: 'Venue parking map: https://example.com/parking — sharing in case it helps anyone.',
            visible: true,
        },
        {
            displayName: 'Beth M.',
            content: 'Found your registry via www.example.com/registry — hope that is OK to mention!',
            visible: true,
        },
        {
            displayName: 'Sean P.',
            content:
                'Planning this was bullshit-level stressful for everyone and you still made it look effortless. Absolute legends.',
            visible: true,
        },
        {
            displayName: 'Ravi K.',
            content:
                'I AM SO INCREDIBLY HAPPY FOR YOU BOTH AND I CANNOT WAIT TO CELEBRATE WITH YOU ON THE DAY THIS IS GOING TO BE AMAZING',
            visible: true,
        },
        {
            displayName: 'Hannah L.',
            content: 'More photos here: https://example.com/album',
            visible: true,
            attachDummyPhoto: true,
        },
        {
            displayName: 'Uncle Pete',
            content: 'Catering looked great on weddingcatering.com when we were planning ours — anyway, see you soon!',
            visible: true,
        },
    );

    for (let i = 0; i < 10; i++) {
        pools.hidden.push({
            displayName: `${nextAuthor()} ${pick(['S.', 'W.', 'H.'])}`,
            content: 'Leaving this private — but we are so happy for you both.',
            visible: false,
        });
    }

    pools.anonymous.push({
        displayName: 'Anonymous',
        content: 'A quiet note — you two are wonderful.',
        visible: true,
    });

    pools.noDisplayName.push({
        content: 'Couldn’t find the name field — but congratulations!',
        visible: true,
        attachDummyPhoto: false,
    });

    // Round-robin interleave so chronological order mixes entry styles
    const keys = Object.keys(pools);
    const interleaved = [];
    let round = 0;
    let added = true;
    while (added) {
        added = false;
        for (const k of keys) {
            const p = pools[k];
            if (round < p.length) {
                interleaved.push(p[round]);
                added = true;
            }
        }
        round++;
    }

    assignDaysAgo(interleaved, 115);
    return interleaved;
}

const invites = buildInvites();
const guestbook = buildGuestbook();

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'invites.json'), JSON.stringify(invites, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(outDir, 'guestbook.json'), JSON.stringify(guestbook, null, 2) + '\n', 'utf8');

console.log(`Wrote ${invites.length} invites and ${guestbook.length} guestbook rows to ${outDir}`);
