import {
  EmotionType,
  SkillType,
  type Choice,
  type Emotion,
  type MindfulnessExercise,
  type Outcome,
  type Scenario,
  type ScenarioNode,
  type TeamworkChallenge,
} from "./types";

type ChoiceInit = {
  label: string;
  next: string;
  skills?: SkillType[];
  harmony?: number;
  minGrade?: number;
  requiresCalm?: boolean;
};

function choice(nodeId: string, init: ChoiceInit, index: number): Choice {
  const slug = init.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return {
    choiceId: `${nodeId}__${index}__${slug}`,
    nodeId,
    label: init.label,
    nextNodeId: init.next,
    skills: init.skills ?? [],
    harmony: init.harmony ?? 0,
    minGrade: init.minGrade,
    requiresCalm: init.requiresCalm,
  };
}

function node(
  scenarioId: string,
  nodeId: string,
  speaker: string,
  prompt: string,
  choices: ChoiceInit[],
  outcome?: Outcome,
): ScenarioNode {
  return {
    nodeId,
    scenarioId,
    speaker,
    prompt,
    isTerminal: choices.length === 0,
    outcome,
    choices: choices.map((item, index) => choice(nodeId, item, index)),
  };
}

const S = SkillType;

const wateringNodes = [
  node(
    "watering-can",
    "wc-start",
    "Bramble",
    "You wait by the rain barrel. Your watering can is empty. Pip steps in front of you and turns on the tap. Your cheeks feel hot.",
    [
      { label: "Hey! Move! I was here first!", next: "wc-yell", harmony: -1 },
      {
        label: "Pip, I was waiting. Can we see who is first?",
        next: "wc-ask",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Say nothing and squeeze the handle.", next: "wc-quiet" },
      {
        label: "I feel frustrated. I want a fair turn.",
        next: "wc-feel",
        skills: [S.CONFLICT_RESOLUTION, S.EMOTIONAL_LITERACY],
        harmony: 2,
        minGrade: 3,
      },
      {
        label: "Take a slow breath, then use a clear voice.",
        next: "wc-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "watering-can",
    "wc-yell",
    "Pip",
    'Pip jumps. Water splashes their shoes. Their ears droop. "I didn\'t see you. You didn\'t have to yell."',
    [
      {
        label: "Sorry I yelled. I still need a turn.",
        next: "wc-repair",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "You should look next time!", next: "wc-sharp", harmony: -1 },
      { label: "Walk away mad.", next: "wc-tangle" },
    ],
  ),
  node(
    "watering-can",
    "wc-sharp",
    "Bramble",
    "Pip steps back. The tap is free, but the air feels prickly. A fair turn and a kind repair are different.",
    [
      {
        label: "I was scared I would wait forever. Sorry I snapped.",
        next: "wc-repair",
        skills: [S.CONFLICT_RESOLUTION, S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Take the water and stay quiet.", next: "wc-tangle" },
    ],
  ),
  node(
    "watering-can",
    "wc-ask",
    "Pip",
    'Pip looks behind them and blinks. "Oh. You were here. I was rushing to my seedlings and I didn\'t look."',
    [
      {
        label: "Thanks for listening. I'll fill mine, then you.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.TEAMWORK],
        harmony: 2,
      },
      { label: "You always cut. That's not fair.", next: "wc-pattern", harmony: -1 },
    ],
  ),
  node(
    "watering-can",
    "wc-pattern",
    "Pip",
    '"I don\'t always. I messed up this time." Pip\'s face falls.',
    [
      {
        label: "You're right — this time. Let's fix this time.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Stay angry.", next: "wc-tangle" },
    ],
  ),
  node(
    "watering-can",
    "wc-quiet",
    "Bramble",
    "The line moves. Your tummy stays tight. Quiet can be a choice. It can also hide a need.",
    [
      {
        label: "I need a turn. I'll say it now.",
        next: "wc-late",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 1,
      },
      {
        label: "I need a break from this line.",
        next: "wc-break",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
      { label: "Leave with the tight feeling.", next: "wc-tangle" },
    ],
  ),
  node(
    "watering-can",
    "wc-late",
    "You",
    '"I froze before. I was next. Can we fix the order?" Pip nods and makes space at the tap.',
    [
      {
        label: "Fill your can, then hand the tap to Pip.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.TEAMWORK],
        harmony: 2,
      },
    ],
  ),
  node(
    "watering-can",
    "wc-feel",
    "Pip",
    '"I didn\'t know you felt that way. What would feel fair?" Pip turns the tap down.',
    [
      {
        label: "I go first. Then you. We can tell the next kid the order.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.TEAMWORK],
        harmony: 2,
      },
      { label: "Just forget it.", next: "wc-quiet" },
    ],
  ),
  node(
    "watering-can",
    "wc-calm",
    "Bramble",
    "You feel your feet on the moss. Your voice comes out smaller and clearer.",
    [
      {
        label: "Pip, I was next. Please wait for me.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "watering-can",
    "wc-repair",
    "Pip",
    '"Thanks for saying sorry. You can go first." Pip moves aside.',
    [
      {
        label: "Fill your can, then share the tap.",
        next: "wc-bloom",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 1,
      },
    ],
  ),
  node(
    "watering-can",
    "wc-break",
    "Bramble",
    "You step onto the moss and put a hand on your belly. Taking a break is a boundary. The barrel will still be here.",
    [
      {
        label: "Go back and ask for your turn.",
        next: "wc-late",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 1,
      },
      {
        label: "Stop for today. I named what I needed.",
        next: "wc-soft",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
    ],
  ),
  node(
    "watering-can",
    "wc-bloom",
    "Bramble",
    "The seedlings get a drink, and so does the friendship. You asked for a fair turn without squashing Pip. A blue butterfly lands on the barrel.",
    [],
    "bloom",
  ),
  node(
    "watering-can",
    "wc-soft",
    "Bramble",
    "You listened to your body and took space. That is a strong, kind skill. The garden keeps your place.",
    [],
    "repair",
  ),
  node(
    "watering-can",
    "wc-tangle",
    "Bramble",
    "The water got shared, but the friendship feels scratchy. That happens. You can walk this grove again and try a new sentence. The garden is not mad at you.",
    [],
    "tangle",
  ),
];

const shovelNodes = [
  node(
    "shared-shovel",
    "sh-start",
    "Bramble",
    "You are digging a small hole for a bulb. Moss picks up your shovel and starts a different hole. Your hands are suddenly empty.",
    [
      {
        label: "I'm still using that. You can have it when my bulb is in.",
        next: "sh-clear",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Grab the shovel back without words.", next: "sh-grab", harmony: -1 },
      { label: "Say \"Fine, take it\" while your jaw feels tight.", next: "sh-fine" },
      {
        label: "I want to finish my turn. Then we can plan the next one.",
        next: "sh-plan",
        skills: [S.BOUNDARIES, S.TEAMWORK],
        harmony: 2,
        minGrade: 4,
      },
      {
        label: "I need a minute with my tool. You can stay and wait with me.",
        next: "sh-calm",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 2,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "shared-shovel",
    "sh-clear",
    "Moss",
    '"Oh. I thought it was free. I\'ll wait." Moss sits on their heels.',
    [
      {
        label: "Thanks. I'll hand it to you when the bulb is covered.",
        next: "sh-bloom",
        skills: [S.BOUNDARIES, S.TEAMWORK],
        harmony: 2,
      },
      { label: "Don't touch my stuff.", next: "sh-hard", harmony: -1 },
    ],
  ),
  node(
    "shared-shovel",
    "sh-hard",
    "Bramble",
    "Moss scoots back. The shovel is yours, and Moss looks smaller.",
    [
      {
        label: "I still need it. I didn't need to say it that way. Sorry.",
        next: "sh-bloom",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Keep digging and ignore Moss.", next: "sh-tangle" },
    ],
  ),
  node(
    "shared-shovel",
    "sh-grab",
    "Moss",
    '"Ow. You could have said something." A little dirt flies up. Moss stumbles back.',
    [
      {
        label: "You're right. I should have used words. I still need the shovel.",
        next: "sh-clear",
        skills: [S.CONFLICT_RESOLUTION, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Keep digging fast.", next: "sh-tangle" },
    ],
  ),
  node(
    "shared-shovel",
    "sh-fine",
    "Bramble",
    "Moss starts digging, happy. Your jaw stays tight. Saying fine when you mean no can hide a boundary.",
    [
      {
        label: "Wait. I wasn't done. I said fine, but I meant not yet.",
        next: "sh-clear",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Walk off and feel mad.", next: "sh-tangle" },
    ],
  ),
  node(
    "shared-shovel",
    "sh-plan",
    "Moss",
    '"A plan helps me. I get excited and grab." Moss nods.',
    [
      {
        label: "Two more scoops for my bulb. Then it's your turn. I'll say it out loud.",
        next: "sh-bloom",
        skills: [S.BOUNDARIES, S.TEAMWORK],
        harmony: 2,
      },
      { label: "Actually, never mind.", next: "sh-fine" },
    ],
  ),
  node(
    "shared-shovel",
    "sh-calm",
    "Bramble",
    "You keep the shovel low and your voice low. Moss waits. The dirt smells like rain.",
    [
      {
        label: "Finish the bulb, then pass the shovel with a thank-you.",
        next: "sh-bloom",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "shared-shovel",
    "sh-bloom",
    "Bramble",
    "You kept your turn and left room for Moss. A boundary can be a door, not a wall. The bulb sits safe in the ground.",
    [],
    "bloom",
  ),
  node(
    "shared-shovel",
    "sh-tangle",
    "Bramble",
    "The bulb is planted, but somebody's feelings got nicked. You can try a clearer not-yet next time. The garden will wait with you.",
    [],
    "tangle",
  ),
];

const noteNodes = [
  node(
    "whatever-note",
    "nt-start",
    "Bramble",
    'You ask Lumen if your row of seeds looks okay. Lumen shrugs and says, "Whatever." Your throat goes tight.',
    [
      {
        label: "When I hear whatever, I feel hurt. What did you mean?",
        next: "nt-ask",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Oh. So you hate it.", next: "nt-assume", harmony: -1 },
      {
        label: "Check your body before you answer.",
        next: "nt-body",
        skills: [S.MINDFULNESS, S.EMOTIONAL_LITERACY],
        harmony: 1,
      },
      { label: 'Say "whatever" back.', next: "nt-back", harmony: -1 },
    ],
  ),
  node(
    "whatever-note",
    "nt-ask",
    "Lumen",
    '"I meant I don\'t know about seeds. I didn\'t mean your row is bad." Lumen\'s eyes get wide.',
    [
      {
        label: "Thanks for telling me. I don't know is clearer for me than whatever.",
        next: "nt-bloom",
        skills: [S.EMOTIONAL_LITERACY, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Well, it sounded mean.", next: "nt-still" },
    ],
  ),
  node(
    "whatever-note",
    "nt-still",
    "Lumen",
    '"I can see how it sounded mean. I was tired, not mad." Lumen looks down.',
    [
      {
        label: "I'm glad I asked. I'm still a little stingy, and I believe you.",
        next: "nt-bloom",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Stop talking and frown.", next: "nt-tangle" },
    ],
  ),
  node(
    "whatever-note",
    "nt-assume",
    "Lumen",
    '"I don\'t hate it. I hate not knowing what to say." Lumen\'s voice gets small.',
    [
      {
        label: "I guessed the worst. Let me ask instead.",
        next: "nt-ask",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "It still feels like hate.", next: "nt-guess" },
    ],
  ),
  node(
    "whatever-note",
    "nt-guess",
    "Bramble",
    "Feelings can be real even when the story is not finished. You can tell Lumen the feeling, not the guess.",
    [
      {
        label: "I feel hurt.",
        next: "nt-ask",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Walk away believing the guess.", next: "nt-tangle" },
    ],
  ),
  node(
    "whatever-note",
    "nt-body",
    "Bramble",
    "Your throat is tight. Your hands are fists. Those are body cues. They mean a feeling is here. They do not yet know Lumen's whole story.",
    [
      {
        label: "Name it: I feel hurt and confused.",
        next: "nt-ask",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Ignore the cues and snap.", next: "nt-back" },
    ],
  ),
  node(
    "whatever-note",
    "nt-back",
    "Bramble",
    "You say whatever too. Now two people are shut. The row of seeds waits in the quiet.",
    [
      {
        label: "That didn't help. I'll try again. What did you mean?",
        next: "nt-ask",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Leave the row.", next: "nt-tangle" },
    ],
  ),
  node(
    "whatever-note",
    "nt-bloom",
    "Bramble",
    "You asked about the feeling and the meaning. Lumen learns a clearer phrase. You learn that a sharp word can hide a shy one.",
    [],
    "bloom",
  ),
  node(
    "whatever-note",
    "nt-tangle",
    "Bramble",
    "The word whatever is still sitting between you. One question could open it. You can come back when you want.",
    [],
    "tangle",
  ),
];

const planNodes = [
  node(
    "three-plans",
    "pl-start",
    "Bramble",
    "One garden bed. Three ideas. Pip wants berries. Moss wants flowers. You want a quiet sitting stone. Everyone talks at once.",
    [
      {
        label: "Let's each say one sentence. I'll listen first.",
        next: "pl-listen",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "My sitting stone is the best. We're doing that.", next: "pl-mine", harmony: -1 },
      { label: "Let's vote. The losers have to smile.", next: "pl-vote" },
      {
        label: "What if the bed shared the jobs: berries in back, flowers on the edge, one stone?",
        next: "pl-mix",
        skills: [S.TEAMWORK],
        harmony: 2,
        minGrade: 4,
      },
      {
        label: "I don't know how to choose. Can we ask Bramble for help?",
        next: "pl-help",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
    ],
  ),
  node(
    "three-plans",
    "pl-listen",
    "You",
    'Pip says, "Berries feed people." Moss says, "Flowers feed bees." You want a place to rest. All three reasons are real.',
    [
      {
        label: "Suggest a shared bed.",
        next: "pl-mix",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "I heard you, and I still pick only the stone.", next: "pl-mine" },
    ],
  ),
  node(
    "three-plans",
    "pl-mine",
    "Moss",
    '"Then it\'s not a team bed." The others go quiet. Pip kicks a pebble.',
    [
      {
        label: "I pushed. Let me hear your reasons again.",
        next: "pl-listen",
        skills: [S.TEAMWORK, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Build the stone alone.", next: "pl-tangle" },
    ],
  ),
  node(
    "three-plans",
    "pl-vote",
    "Pip",
    '"A vote that ignores a tie isn\'t listening." The stone, the berries, and the flowers each get one vote.',
    [
      {
        label: "You're right. A tie means we need a mix, not a winner.",
        next: "pl-mix",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "My vote felt bigger.", next: "pl-tangle" },
    ],
  ),
  node(
    "three-plans",
    "pl-mix",
    "Bramble",
    "You sketch in the dirt: berries behind, flowers at the rim, a flat stone in the corner. Pip grins. Moss nods.",
    [
      {
        label: "Who wants which job?",
        next: "pl-jobs",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "I'll do it all so it's done right.", next: "pl-alone" },
    ],
  ),
  node(
    "three-plans",
    "pl-jobs",
    "You",
    "Pip takes the berries, Moss takes the flowers, and you set the stone. You check on each other once.",
    [
      {
        label: "Plant it together.",
        next: "pl-bloom",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
    ],
  ),
  node(
    "three-plans",
    "pl-alone",
    "Bramble",
    "Doing it all is heavy. Teams share the weight.",
    [
      {
        label: "Hand out the jobs.",
        next: "pl-jobs",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "Stay buried in the work.", next: "pl-tangle" },
    ],
  ),
  node(
    "three-plans",
    "pl-help",
    "Bramble",
    '"What does each idea care about?" You do not have to pick a boss.',
    [
      {
        label: "Ask Pip and Moss what their idea protects.",
        next: "pl-listen",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "Never mind. I'll decide.", next: "pl-mine" },
    ],
  ),
  node(
    "three-plans",
    "pl-bloom",
    "Bramble",
    "The bed holds food, bees, and a place to sit. Nobody had to disappear for the plan to work.",
    [],
    "bloom",
  ),
  node(
    "three-plans",
    "pl-tangle",
    "Bramble",
    "The bed is only one idea now, and two friends are quiet. A team plan has room for more than one good thing.",
    [],
    "tangle",
  ),
];

const benchNodes = [
  node(
    "empty-bench",
    "bn-start",
    "Bramble",
    "Friends sit together on the garden bench with their snacks. It looks full. You stand with your lunch in both hands. Your chest feels heavy.",
    [
      {
        label: "Can I sit with you? I can bring a stump if we need room.",
        next: "bn-ask",
        skills: [S.CONFLICT_RESOLUTION, S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Walk away and think, they don't like me.", next: "bn-story", harmony: -1 },
      { label: "Squeeze in fast and bump someone's lunch.", next: "bn-bump", harmony: -1 },
      {
        label: "I feel left out when there's no space. Can we make room?",
        next: "bn-feel",
        skills: [S.EMOTIONAL_LITERACY, S.CONFLICT_RESOLUTION],
        harmony: 2,
        minGrade: 3,
      },
      {
        label: "Ask a garden keeper for help joining.",
        next: "bn-adult",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
    ],
  ),
  node(
    "empty-bench",
    "bn-ask",
    "Pip",
    '"We didn\'t see you. Yes — a stump is smart." Pip scoots. Moss moves a basket.',
    [
      {
        label: "Sit and say, thanks for making room.",
        next: "bn-bloom",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "You should have saved me a seat.", next: "bn-blame" },
    ],
  ),
  node(
    "empty-bench",
    "bn-blame",
    "Pip",
    '"We can make room now. We can\'t undo the minute we missed you." Pip\'s smile slips.',
    [
      {
        label: "Making room now helps. Thanks.",
        next: "bn-bloom",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Stay standing and mad.", next: "bn-tangle" },
    ],
  ),
  node(
    "empty-bench",
    "bn-story",
    "Bramble",
    "The heavy chest is real. The thought they don't like me is a guess. Guesses can feel true before you check.",
    [
      {
        label: "Go back and ask for space.",
        next: "bn-ask",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 1,
      },
      {
        label: "Sit nearby and wave.",
        next: "bn-wave",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "Believe the guess and hide.", next: "bn-tangle" },
    ],
  ),
  node(
    "empty-bench",
    "bn-wave",
    "Moss",
    'Moss waves back and points at the grass. "Picnic spot?"',
    [
      {
        label: "Yes. I'll sit close.",
        next: "bn-bloom",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "Look away.", next: "bn-tangle" },
    ],
  ),
  node(
    "empty-bench",
    "bn-bump",
    "Lumen",
    '"I want you here, and I also want my lunch safe." A pear rolls into the dirt.',
    [
      {
        label: "Sorry I bumped you. Can we try again with a stump?",
        next: "bn-ask",
        skills: [S.CONFLICT_RESOLUTION, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "The bench was rude first.", next: "bn-tangle" },
    ],
  ),
  node(
    "empty-bench",
    "bn-feel",
    "Pip",
    '"I didn\'t know. Let\'s make a seat." The group gets quiet in a kind way.',
    [
      {
        label: "Help pull a stump over.",
        next: "bn-bloom",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "Forget I said it.", next: "bn-story" },
    ],
  ),
  node(
    "empty-bench",
    "bn-adult",
    "Bramble",
    "Asking a keeper for help is brave, not babyish. The keeper walks over with you, not instead of you.",
    [
      {
        label: "I say the ask, with the keeper beside me.",
        next: "bn-ask",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Let the keeper talk, and hide behind them.", next: "bn-hide" },
    ],
  ),
  node(
    "empty-bench",
    "bn-hide",
    "Bramble",
    "The seat appears, but your friends did not hear your voice.",
    [
      {
        label: "Thanks. Next time I want to try the words.",
        next: "bn-repair",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Stay hidden.", next: "bn-tangle" },
    ],
  ),
  node(
    "empty-bench",
    "bn-bloom",
    "Bramble",
    "There is room. You asked, and they made space. Belonging can start with one clear sentence.",
    [],
    "bloom",
  ),
  node(
    "empty-bench",
    "bn-repair",
    "Bramble",
    "You joined, and you told the truth: you want to use your own voice next time. That is growing.",
    [],
    "repair",
  ),
  node(
    "empty-bench",
    "bn-tangle",
    "Bramble",
    "You are still outside the circle. The heavy feeling makes sense. When you are ready, one small ask can test the guess.",
    [],
    "tangle",
  ),
];

const photoNodes = [
  node(
    "photo-leaf",
    "ph-start",
    "Bramble",
    'A group chat pops up on your leaf-tab. Someone writes, "Forward the picture of Robin at rehearsal. They didn\'t say yes, but it\'s funny." Your thumb hovers.',
    [
      {
        label: "No. That's private. I won't send it.",
        next: "ph-no",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Send it so the chat stays friendly.", next: "ph-send", harmony: -1 },
      {
        label: "I don't share pictures of people who didn't agree. We could send a joke we made up.",
        next: "ph-alt",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      {
        label: "Leave the chat and tell a trusted adult.",
        next: "ph-adult",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      {
        label: "Pause, set the tablet down, then answer.",
        next: "ph-pause",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "photo-leaf",
    "ph-no",
    "Bramble",
    '"Wow, calm down, it\'s just a joke." Your face heats. The picture is still unsent.',
    [
      {
        label: "Jokes still need a yes. I can be in the chat and not send it.",
        next: "ph-bloom",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Whatever, fine — and send it.", next: "ph-send", harmony: -1 },
      {
        label: "I need a break from this chat.",
        next: "ph-adult",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
    ],
  ),
  node(
    "photo-leaf",
    "ph-send",
    "Bramble",
    "The picture flies to more people. Robin finds out later and goes quiet at the garden gate. A laugh that needs a secret can hurt.",
    [
      {
        label: "I shouldn't have sent it. I'll tell Robin, delete it, and ask the chat to delete it too.",
        next: "ph-repair",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Hope Robin never knows.", next: "ph-tangle" },
    ],
  ),
  node(
    "photo-leaf",
    "ph-repair",
    "Bramble",
    "You tell Robin the truth and ask the group to delete the picture. Repair does not erase it. It does give Robin your honesty.",
    [],
    "repair",
  ),
  node(
    "photo-leaf",
    "ph-alt",
    "Bramble",
    '"Okay, send the joke." The picture stays unsent. Robin walks by, unsuspecting and safe.',
    [
      {
        label: "Send the made-up joke instead.",
        next: "ph-bloom",
        skills: [S.BOUNDARIES, S.TEAMWORK],
        harmony: 1,
      },
    ],
  ),
  node(
    "photo-leaf",
    "ph-adult",
    "Bramble",
    "You show a trusted adult the message. You do not have to solve a privacy problem alone. Robin stays in charge of their own picture.",
    [],
    "bloom",
  ),
  node(
    "photo-leaf",
    "ph-pause",
    "Bramble",
    "The tablet is on the bench. Your hands are empty for a moment. The urge to be included is still there, and so is your choice.",
    [
      {
        label: "Pick up the tablet and say no.",
        next: "ph-no",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 1,
      },
      { label: "Pick it up and send.", next: "ph-send" },
    ],
  ),
  node(
    "photo-leaf",
    "ph-bloom",
    "Bramble",
    "You protected Robin's privacy and stayed kind. A boundary can keep a friendship cleaner than a joke.",
    [],
    "bloom",
  ),
  node(
    "photo-leaf",
    "ph-tangle",
    "Bramble",
    "The picture is out, and Robin did not get a choice. If this were real, telling an adult and Robin would be the next brave step. You can practice that repair again.",
    [],
    "tangle",
  ),
];

const seedNodes = [
  node(
    "last-seed",
    "ls-start",
    "Bramble",
    "One sunflower packet is left on the seed table. You and Pip reach for it at the same time. Your fingers bump.",
    [
      {
        label: "Can we split the seeds? You plant half, and I plant half.",
        next: "ls-split",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "I saw it first!", next: "ls-grab", harmony: -1 },
      { label: "Let go and say nothing. Your tummy stays tight.", next: "ls-quiet" },
      {
        label: "I feel rushy. I want some seeds, and I want you to have some too.",
        next: "ls-feel",
        skills: [S.CONFLICT_RESOLUTION, S.EMOTIONAL_LITERACY],
        harmony: 2,
        minGrade: 3,
      },
      {
        label: "Take a breath, then offer to share the packet.",
        next: "ls-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "last-seed",
    "ls-split",
    "Pip",
    '"Yes. I was scared there would not be enough for my row." Pip sets the packet down between you.',
    [
      {
        label: "Count them together and make two even piles.",
        next: "ls-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.TEAMWORK],
        harmony: 2,
      },
      { label: "I get the bigger pile.", next: "ls-uneven", harmony: -1 },
    ],
  ),
  node(
    "last-seed",
    "ls-uneven",
    "Pip",
    '"That does not feel like half." Pip\'s ears droop over the smaller pile.',
    [
      {
        label: "You're right. Let's make the piles even.",
        next: "ls-bloom",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Keep the big pile.", next: "ls-tangle" },
    ],
  ),
  node(
    "last-seed",
    "ls-grab",
    "Pip",
    '"Hey. That packet might have been for both of us." Pip\'s hand is still open.',
    [
      {
        label: "Sorry I grabbed. Let's open it and share.",
        next: "ls-split",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "They're mine now.", next: "ls-tangle" },
    ],
  ),
  node(
    "last-seed",
    "ls-quiet",
    "Bramble",
    "Pip takes the packet and smiles, not unkindly. You have no seeds, and the tight feeling stays. Quiet hid what you wanted.",
    [
      {
        label: "Pip, I wanted some too. Can we still share?",
        next: "ls-split",
        skills: [S.CONFLICT_RESOLUTION],
        harmony: 1,
      },
      {
        label: "I need a break from this want. I'll ask a keeper for another packet later.",
        next: "ls-soft",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
      { label: "Walk away mad.", next: "ls-tangle" },
    ],
  ),
  node(
    "last-seed",
    "ls-feel",
    "Pip",
    '"I feel rushy too." Pip slows their hands. "What would feel fair?"',
    [
      {
        label: "Let's count out loud so we both see the same number.",
        next: "ls-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Forget it.", next: "ls-quiet" },
    ],
  ),
  node(
    "last-seed",
    "ls-calm",
    "Bramble",
    "You feel your feet on the path. Your voice comes out steady. The packet is still on the table.",
    [
      {
        label: "There is one packet. I want to split it with you.",
        next: "ls-bloom",
        skills: [S.CONFLICT_RESOLUTION, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "last-seed",
    "ls-bloom",
    "Bramble",
    "Two small piles of sunflower seeds wait in the sun. You asked for enough, and you left enough. A fair share can feed two rows.",
    [],
    "bloom",
  ),
  node(
    "last-seed",
    "ls-soft",
    "Bramble",
    "You named the want and chose a pause. A keeper can help you find seeds without a fight. The garden keeps a place for your row.",
    [],
    "repair",
  ),
  node(
    "last-seed",
    "ls-tangle",
    "Bramble",
    "Somebody has the seeds, and the air feels scratchy. That can happen when there is only one packet. You can walk this path again and try a sharing sentence.",
    [],
    "tangle",
  ),
];

const noiseNodes = [
  node(
    "loud-game",
    "lg-start",
    "Bramble",
    "Lumen and two friends clap a fast rhythm game beside the plant labels. The sound fills your ears. You wanted to read the labels.",
    [
      {
        label: "The clapping is too big for my ears. Can we make it softer?",
        next: "lg-ask",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Cover your ears and shout, \"Stop!\"", next: "lg-shout", harmony: -1 },
      { label: "Move away and tell no one why.", next: "lg-leave" },
      {
        label: "I like your game. I also need a quieter spot for a few minutes.",
        next: "lg-both",
        skills: [S.BOUNDARIES, S.EMOTIONAL_LITERACY],
        harmony: 2,
        minGrade: 3,
      },
      {
        label: "Feel your feet, then ask for a smaller sound.",
        next: "lg-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "loud-game",
    "lg-ask",
    "Lumen",
    '"I didn\'t know it was too big. We can clap small." Lumen holds their hands lower.',
    [
      {
        label: "Thank you. Small claps work for me.",
        next: "lg-bloom",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "You should have known.", next: "lg-sharp", harmony: -1 },
    ],
  ),
  node(
    "loud-game",
    "lg-sharp",
    "Bramble",
    "Lumen's rhythm stops. They step back. The quiet you needed is here, and so is a worried friend.",
    [
      {
        label: "I was overloaded, and I still want to be kind. Softer claps, please.",
        next: "lg-bloom",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Walk off.", next: "lg-tangle" },
    ],
  ),
  node(
    "loud-game",
    "lg-shout",
    "Lumen",
    '"That scared me." Lumen\'s hands freeze in the air. The game is quiet now, but everybody is startled.',
    [
      {
        label: "Sorry I yelled. My ears hurt. Can the game be quieter?",
        next: "lg-ask",
        skills: [S.CONFLICT_RESOLUTION, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Keep shouting.", next: "lg-tangle" },
    ],
  ),
  node(
    "loud-game",
    "lg-leave",
    "Bramble",
    "The ferns are quieter. Leaving can be a boundary. Your friends still think you disappeared for no reason.",
    [
      {
        label: "Go back and tell them why you left.",
        next: "lg-ask",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
      {
        label: "Stay in the quiet ferns. I told my body what it needed.",
        next: "lg-soft",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 1,
      },
      { label: "Stay and feel mad that nobody noticed.", next: "lg-tangle" },
    ],
  ),
  node(
    "loud-game",
    "lg-both",
    "Lumen",
    '"We can play over by the pines. You can keep the labels." Lumen points to a farther patch.',
    [
      {
        label: "That plan fits both of us. Thank you.",
        next: "lg-bloom",
        skills: [S.BOUNDARIES, S.TEAMWORK],
        harmony: 2,
      },
    ],
  ),
  node(
    "loud-game",
    "lg-calm",
    "Bramble",
    "Your feet find the ground. The clapping is still there, and your voice has room.",
    [
      {
        label: "Lumen, my ears are full. Please make the game smaller, or move it a few steps away.",
        next: "lg-bloom",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "loud-game",
    "lg-bloom",
    "Bramble",
    "The labels are readable, and the game still exists. You asked for a smaller sound without making Lumen the problem. A boundary can turn the volume down.",
    [],
    "bloom",
  ),
  node(
    "loud-game",
    "lg-soft",
    "Bramble",
    "You gave your ears a rest. Next time you can add the sentence, if you want. Stopping was allowed.",
    [],
    "repair",
  ),
  node(
    "loud-game",
    "lg-tangle",
    "Bramble",
    "The garden is quieter, and a friendship feels startled. You can try again with a smaller sentence. Your ears were telling the truth.",
    [],
    "tangle",
  ),
];

const nameNodes = [
  node(
    "chosen-name",
    "cn-start",
    "Bramble",
    "Moss grins and calls you by an old joke name. Your face gets hot. You picked your garden name on purpose.",
    [
      {
        label: "Please use my garden name. The joke name doesn't feel good.",
        next: "cn-ask",
        skills: [S.EMOTIONAL_LITERACY, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Laugh, even though it stings.", next: "cn-laugh" },
      { label: "Don't call me that!", next: "cn-snap", harmony: -1 },
      {
        label: "Find a garden keeper and practice the sentence first.",
        next: "cn-keeper",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
      {
        label: "I feel embarrassed. The name I chose is the one I want.",
        next: "cn-feel",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
        minGrade: 5,
      },
      {
        label: "Notice the heat in your face, then ask for your name.",
        next: "cn-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "chosen-name",
    "cn-ask",
    "Moss",
    '"I thought it was only funny. I can stop." Moss waits for the name.',
    [
      {
        label: "Thanks. My garden name is the one to use.",
        next: "cn-bloom",
        skills: [S.EMOTIONAL_LITERACY, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "You always do this.", next: "cn-pattern", harmony: -1 },
    ],
  ),
  node(
    "chosen-name",
    "cn-pattern",
    "Moss",
    '"I don\'t want it to be always. Tell me the name again."',
    [
      {
        label: "Here it is. Please use it from now on.",
        next: "cn-bloom",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
      { label: "Never mind.", next: "cn-laugh" },
    ],
  ),
  node(
    "chosen-name",
    "cn-laugh",
    "Bramble",
    "Moss laughs with you. Your face is still hot. A laugh can hide a no.",
    [
      {
        label: "I laughed, but I meant no. Please use my garden name.",
        next: "cn-ask",
        skills: [S.EMOTIONAL_LITERACY, S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Keep the joke going.", next: "cn-tangle" },
    ],
  ),
  node(
    "chosen-name",
    "cn-snap",
    "Moss",
    "Moss flinches. The joke stops. They look unsure, not mean.",
    [
      {
        label: "I got hot. I still need my garden name. Sorry I snapped.",
        next: "cn-bloom",
        skills: [S.EMOTIONAL_LITERACY, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Don't talk to me.", next: "cn-tangle" },
    ],
  ),
  node(
    "chosen-name",
    "cn-keeper",
    "Bramble",
    "A keeper listens while you practice. Asking for help is a real step, not a smaller one.",
    [
      {
        label: "Practice, then go tell Moss.",
        next: "cn-ask",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 1,
      },
      {
        label: "The keeper will help me say it later. I did the first step.",
        next: "cn-soft",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
    ],
  ),
  node(
    "chosen-name",
    "cn-feel",
    "Moss",
    '"Embarrassed is a big word. I hear it." Moss says your garden name once, carefully.',
    [
      {
        label: "Yes. Embarrassed means I want the name I picked.",
        next: "cn-bloom",
        skills: [S.EMOTIONAL_LITERACY],
        harmony: 2,
      },
    ],
  ),
  node(
    "chosen-name",
    "cn-calm",
    "Bramble",
    "The heat in your face is a signal, not a rule. Your breath makes space for the sentence.",
    [
      {
        label: "Moss, please use my garden name. The joke name makes my face hot.",
        next: "cn-bloom",
        skills: [S.EMOTIONAL_LITERACY, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "chosen-name",
    "cn-bloom",
    "Bramble",
    "Your garden name stands where you put it. Moss knows which word to use. Naming a feeling helped the boundary stay kind.",
    [],
    "bloom",
  ),
  node(
    "chosen-name",
    "cn-soft",
    "Bramble",
    "You did not have to say it perfectly today. A keeper holds the sentence with you until you are ready.",
    [],
    "repair",
  ),
  node(
    "chosen-name",
    "cn-tangle",
    "Bramble",
    "The joke name is still in the air. You can come back and try the clearer ask. Wanting your own name is fair.",
    [],
    "tangle",
  ),
];

const gateNodes = [
  node(
    "gate-watch",
    "gw-start",
    "Bramble",
    "The garden gate needs three jobs: watcher, water-passer, and sign-holder. Pip takes watcher again. Lumen has no job. You wanted a turn.",
    [
      {
        label: "Can we rotate? I want a turn watching, and Lumen needs a job too.",
        next: "gw-rotate",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "I always get the boring job.", next: "gw-complain", harmony: -1 },
      { label: "Do all three jobs yourself.", next: "gw-all" },
      {
        label: "Let's name the jobs and let each person pick one.",
        next: "gw-pick",
        skills: [S.TEAMWORK],
        harmony: 2,
        minGrade: 5,
      },
      {
        label: "Pause, then suggest a fair turn.",
        next: "gw-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "gate-watch",
    "gw-rotate",
    "Pip",
    '"I like watching. I didn\'t see that Lumen was left out." Pip looks at the empty sign.',
    [
      {
        label: "You watch first. Then me. Lumen holds the sign.",
        next: "gw-bloom",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "Then I should watch the whole time.", next: "gw-grab", harmony: -1 },
    ],
  ),
  node(
    "gate-watch",
    "gw-grab",
    "Lumen",
    "Lumen looks at the ground. The sign still has no holder.",
    [
      {
        label: "Sorry. A turn means we share. Lumen picks next.",
        next: "gw-bloom",
        skills: [S.TEAMWORK, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "I'm the leader, so I decide.", next: "gw-tangle" },
    ],
  ),
  node(
    "gate-watch",
    "gw-complain",
    "Pip",
    '"I didn\'t know you wanted the gate. You can say so."',
    [
      {
        label: "I do want it. Let's trade halfway.",
        next: "gw-rotate",
        skills: [S.TEAMWORK],
        harmony: 1,
      },
      { label: "Forget it. I'll just stand here.", next: "gw-tangle" },
    ],
  ),
  node(
    "gate-watch",
    "gw-all",
    "Bramble",
    "You hold the sign, pass the water, and watch the gate. It looks helpful. Lumen still has nothing to do.",
    [
      {
        label: "I took too much. Who wants the sign?",
        next: "gw-rotate",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
      { label: "Keep doing all the jobs.", next: "gw-tangle" },
    ],
  ),
  node(
    "gate-watch",
    "gw-pick",
    "Lumen",
    '"I want the sign. I can hold it steady." Pip keeps watcher for the first while. A job is left for you.',
    [
      {
        label: "I'll pass the water. Let's say the plan out loud.",
        next: "gw-bloom",
        skills: [S.TEAMWORK],
        harmony: 2,
      },
    ],
  ),
  node(
    "gate-watch",
    "gw-calm",
    "Bramble",
    "You let the hurry settle. Three jobs are still on the gate, and three gardeners are here.",
    [
      {
        label: "Pip watches first, I pass water, and Lumen holds the sign. Then we switch.",
        next: "gw-bloom",
        skills: [S.TEAMWORK, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "gate-watch",
    "gw-bloom",
    "Bramble",
    "The gate has a watcher, a water-passer, and a sign. Nobody is the only helper. Sharing the jobs lets the whole team belong.",
    [],
    "bloom",
  ),
  node(
    "gate-watch",
    "gw-tangle",
    "Bramble",
    "The gate is watched, and somebody was left out. You can try a turn-taking sentence next time. A team is more than one busy person.",
    [],
    "tangle",
  ),
];

const noteNodesForward = [
  node(
    "forwarded-note",
    "fn-start",
    "Bramble",
    "Pip holds out a leaf-note. It says something unkind about Robin, who is not here. Pip asks you to pass it to the next bed.",
    [
      {
        label: "I won't pass this. Robin didn't agree, and it's unkind.",
        next: "fn-stop",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Pass it so you stay in the group.", next: "fn-pass", harmony: -1 },
      { label: "Laugh and add one more unkind word.", next: "fn-add", harmony: -1 },
      {
        label: "This could hurt Robin. I want a keeper to help, and I won't spread it.",
        next: "fn-adult",
        skills: [S.BOUNDARIES],
        harmony: 2,
        minGrade: 5,
      },
      {
        label: "Put the leaf down, breathe, then say you won't send it.",
        next: "fn-calm",
        skills: [S.MINDFULNESS],
        harmony: 1,
        requiresCalm: true,
      },
    ],
  ),
  node(
    "forwarded-note",
    "fn-stop",
    "Pip",
    '"Everyone else is passing it." Pip does not let go of the leaf yet.',
    [
      {
        label: "I can be in the group and still not pass a hurtful note.",
        next: "fn-bloom",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Fine, just this once.", next: "fn-pass", harmony: -1 },
    ],
  ),
  node(
    "forwarded-note",
    "fn-pass",
    "Bramble",
    "The note moves to the next bed. Robin still does not know. Your hands feel uneasy.",
    [
      {
        label: "Go back to Pip and say you want it to stop.",
        next: "fn-stop",
        skills: [S.BOUNDARIES],
        harmony: 1,
      },
      {
        label: "Tell a keeper what the note said.",
        next: "fn-adult",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Leave it. It's already gone.", next: "fn-tangle" },
    ],
  ),
  node(
    "forwarded-note",
    "fn-add",
    "Pip",
    "Pip laughs, and the joke gets bigger. Robin is still not in the circle.",
    [
      {
        label: "I added to it, and that was unkind. Let's stop and not send it further.",
        next: "fn-stop",
        skills: [S.BOUNDARIES, S.CONFLICT_RESOLUTION],
        harmony: 2,
      },
      { label: "Keep going.", next: "fn-tangle" },
    ],
  ),
  node(
    "forwarded-note",
    "fn-adult",
    "Bramble",
    "A keeper can help Robin without you having to police the whole garden. You still get to choose what you pass on.",
    [
      {
        label: "Tell the keeper the words, and ask them to help Robin.",
        next: "fn-bloom",
        skills: [S.BOUNDARIES],
        harmony: 2,
      },
      { label: "Change your mind and pass the note.", next: "fn-pass", harmony: -1 },
    ],
  ),
  node(
    "forwarded-note",
    "fn-calm",
    "Bramble",
    "The leaf is on the soil, not in the next hand. One breath makes the no easier to say.",
    [
      {
        label: "I won't pass a note that hurts someone who isn't here.",
        next: "fn-bloom",
        skills: [S.BOUNDARIES, S.MINDFULNESS],
        harmony: 2,
      },
    ],
  ),
  node(
    "forwarded-note",
    "fn-bloom",
    "Bramble",
    "The unkind note stops with you. Robin keeps a choice they never got to make. A boundary can protect someone who is not in the circle.",
    [],
    "bloom",
  ),
  node(
    "forwarded-note",
    "fn-tangle",
    "Bramble",
    "The note traveled, and Robin did not get a say. If this were real, telling a keeper and Robin would be the next brave step. You can practice the stop again.",
    [],
    "tangle",
  ),
];

export const SCENARIOS: Scenario[] = [
  {
    scenarioId: "watering-can",
    title: "The Watering Can",
    blurb: "Someone steps in front of you at the rain barrel.",
    skillFocus: SkillType.CONFLICT_RESOLUTION,
    minGrade: 1,
    maxGrade: 6,
    entryNodeId: "wc-start",
  },
  {
    scenarioId: "shared-shovel",
    title: "The Shared Shovel",
    blurb: "A friend picks up the tool you are still using.",
    skillFocus: SkillType.BOUNDARIES,
    minGrade: 1,
    maxGrade: 6,
    entryNodeId: "sh-start",
  },
  {
    scenarioId: "empty-bench",
    title: "The Empty Spot",
    blurb: "The bench looks full, and your chest feels heavy.",
    skillFocus: SkillType.CONFLICT_RESOLUTION,
    minGrade: 1,
    maxGrade: 6,
    entryNodeId: "bn-start",
  },
  {
    scenarioId: "three-plans",
    title: "Three Plans, One Bed",
    blurb: "Your team wants three different gardens in one patch.",
    skillFocus: SkillType.TEAMWORK,
    minGrade: 3,
    maxGrade: 6,
    entryNodeId: "pl-start",
  },
  {
    scenarioId: "whatever-note",
    title: "The Word Whatever",
    blurb: "A short answer stings, and you do not know the story yet.",
    skillFocus: SkillType.EMOTIONAL_LITERACY,
    minGrade: 3,
    maxGrade: 6,
    entryNodeId: "nt-start",
  },
  {
    scenarioId: "photo-leaf",
    title: "The Private Picture",
    blurb: "A chat wants a photo of a classmate who did not say yes.",
    skillFocus: SkillType.BOUNDARIES,
    minGrade: 4,
    maxGrade: 6,
    entryNodeId: "ph-start",
  },
  {
    scenarioId: "last-seed",
    title: "The Last Sunflower",
    blurb: "One seed packet is left, and two hands reach for it.",
    skillFocus: SkillType.CONFLICT_RESOLUTION,
    minGrade: 1,
    maxGrade: 6,
    entryNodeId: "ls-start",
  },
  {
    scenarioId: "loud-game",
    title: "Too Much Noise",
    blurb: "A clap game is fun for them and too loud for your ears.",
    skillFocus: SkillType.BOUNDARIES,
    minGrade: 1,
    maxGrade: 6,
    entryNodeId: "lg-start",
  },
  {
    scenarioId: "chosen-name",
    title: "The Name I Chose",
    blurb: "An old joke name sticks, and your garden name gets left behind.",
    skillFocus: SkillType.EMOTIONAL_LITERACY,
    minGrade: 3,
    maxGrade: 6,
    entryNodeId: "cn-start",
  },
  {
    scenarioId: "gate-watch",
    title: "Who Watches the Gate",
    blurb: "Three jobs are at the gate, and one friend has none.",
    skillFocus: SkillType.TEAMWORK,
    minGrade: 3,
    maxGrade: 6,
    entryNodeId: "gw-start",
  },
  {
    scenarioId: "forwarded-note",
    title: "The Forwarded Note",
    blurb: "A hurtful note about Robin is handed to you to pass on.",
    skillFocus: SkillType.BOUNDARIES,
    minGrade: 4,
    maxGrade: 6,
    entryNodeId: "fn-start",
  },
];

export const NODES: ScenarioNode[] = [
  ...wateringNodes,
  ...shovelNodes,
  ...benchNodes,
  ...planNodes,
  ...noteNodes,
  ...photoNodes,
  ...seedNodes,
  ...noiseNodes,
  ...nameNodes,
  ...gateNodes,
  ...noteNodesForward,
];

export const EMOTIONS: Emotion[] = [
  {
    emotionId: "anxiety",
    name: EmotionType.ANXIETY,
    creature: "Worrying Willow",
    bodyCues: "A tight tummy, fast thoughts, shaky hands, or a buzzy chest.",
    helps: [
      "A slow petal breath.",
      "A true sentence: I feel worried about one thing.",
      "One small next step, not the whole problem.",
    ],
    story:
      'Willow rustles even when the wind is small. "I plan for storms that are not here yet," Willow whispers. "Naming the worry gives it edges."',
  },
  {
    emotionId: "frustration",
    name: EmotionType.FRUSTRATION,
    creature: "Angry Ash",
    bodyCues: "A hot face, clenched fists, a loud voice that wants out, or a tight jaw.",
    helps: [
      "A pause before the loud words.",
      "I feel frustrated because…",
      "A job for the energy: stomp the path, then speak.",
    ],
    story:
      'Ash puffs up like a little stove. "Heat means I care," Ash says. "I can be hot and still choose a safe sentence."',
  },
  {
    emotionId: "loneliness",
    name: EmotionType.LONELINESS,
    creature: "Lonely Lichen",
    bodyCues: "A heavy chest, a quiet mouth, or eyes that keep finding the group from the side.",
    helps: [
      "A small ask: Can I sit nearby?",
      "Company that is not a crowd, like one friend or a keeper.",
      "Remembering that a guess about being unwanted is not a fact.",
    ],
    story:
      'Lichen grows in soft patches, a little apart from the trees. "Being near is different from being in the way," Lichen says.',
  },
  {
    emotionId: "enthusiasm",
    name: EmotionType.ENTHUSIASM,
    creature: "Excited Ember",
    bodyCues: "Bouncy legs, a big smile, a fast voice, or a body that cannot sit still.",
    helps: [
      "A wiggle, then a wait.",
      "Asking, Is this a good time for my big idea?",
      "Sharing the spark so it does not run over a friend.",
    ],
    story:
      'Ember sparkles even while standing. "Joy is welcome here," Ember says. "I can shine and still leave room."',
  },
  {
    emotionId: "sadness",
    name: EmotionType.SADNESS,
    creature: "Sad Sprout",
    bodyCues: "A slow body, watery eyes, a dropped voice, or wanting a hug or quiet.",
    helps: [
      "Saying I feel sad, without a rush to be cheerful.",
      "A quiet seat, or a kind person nearby.",
      "A small comfort: water, a walk, or a soft leaf to hold.",
    ],
    story:
      'Sprout sits low, with one raindrop on a leaf. "Sad can visit," Sprout says. "It does not mean I am broken. It means something mattered."',
  },
];

export const EXERCISES: MindfulnessExercise[] = [
  {
    exerciseId: "petal-breath",
    title: "Petal Breath",
    technique: "Deep breathing",
    durationSec: 48,
    blurb: "A flower grows as you breathe in and rests as you breathe out.",
  },
  {
    exerciseId: "sense-trail",
    title: "Five-Sense Trail",
    technique: "Grounding 5-4-3-2-1",
    durationSec: 120,
    blurb: "Find five things you see, then hearing, touch, smell, and taste in the garden.",
  },
  {
    exerciseId: "pause-pebble",
    title: "Pause Pebble",
    technique: "Pause before reacting",
    durationSec: 90,
    blurb: "When a feeling flares, wait until the pebble glows before you choose.",
  },
  {
    exerciseId: "seed-picture",
    title: "Seed Picture",
    technique: "Visualization and positive self-talk",
    durationSec: 60,
    blurb: "Grow a safe picture in your mind, and choose a kind sentence to take with you.",
  },
];

export const CHALLENGES: TeamworkChallenge[] = [
  {
    challengeId: "lantern-message",
    title: "Lantern Message",
    teamCode: "LANTERN",
    focus: "Say exactly what you mean",
    blurb: "Describe a pattern so a friend can rebuild it. Close words are not the same as clear ones.",
  },
  {
    challengeId: "shared-basket",
    title: "The Shared Basket",
    teamCode: "BASKET",
    focus: "Share the jobs",
    blurb: "Match each garden job to the friend whose body and pace fit it.",
  },
  {
    challengeId: "trust-stones",
    title: "Trust Stones",
    teamCode: "TRUST",
    focus: "Lead and follow",
    blurb: "Give a true path, or follow a friend's steps across the mist.",
  },
];

const scenarioMap = new Map(SCENARIOS.map((scenario) => [scenario.scenarioId, scenario]));
const nodesByScenario = new Map<string, ScenarioNode[]>();
for (const item of NODES) {
  const list = nodesByScenario.get(item.scenarioId) ?? [];
  list.push(item);
  nodesByScenario.set(item.scenarioId, list);
}

export function getScenario(scenarioId: string): Scenario | undefined {
  return scenarioMap.get(scenarioId);
}

export function getNodes(scenarioId: string): ScenarioNode[] {
  return nodesByScenario.get(scenarioId) ?? [];
}

export function getNode(scenarioId: string, nodeId: string): ScenarioNode | undefined {
  return getNodes(scenarioId).find((item) => item.nodeId === nodeId);
}

export function getEntryNode(scenarioId: string): ScenarioNode | undefined {
  const scenario = getScenario(scenarioId);
  if (!scenario) return undefined;
  return getNode(scenarioId, scenario.entryNodeId);
}

export function getEmotion(emotionId: string): Emotion | undefined {
  return EMOTIONS.find((item) => item.emotionId === emotionId);
}

export function describeEmotion(emotion: Emotion): string {
  return `${emotion.story} Body cues: ${emotion.bodyCues}`;
}

export function getExercise(exerciseId: string): MindfulnessExercise | undefined {
  return EXERCISES.find((item) => item.exerciseId === exerciseId);
}

export function getChallenge(challengeId: string): TeamworkChallenge | undefined {
  return CHALLENGES.find((item) => item.challengeId === challengeId);
}

export function scenarioTitle(scenarioId?: string): string {
  if (!scenarioId) return "Garden path";
  return getScenario(scenarioId)?.title ?? "Garden path";
}

export function exerciseTitle(exerciseId?: string): string {
  if (!exerciseId) return "Calm practice";
  return getExercise(exerciseId)?.title ?? "Calm practice";
}

export function challengeTitle(challengeId?: string): string {
  if (!challengeId) return "Team trial";
  return getChallenge(challengeId)?.title ?? "Team trial";
}
