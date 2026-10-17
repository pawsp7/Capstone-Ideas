# Capstone-Ideas
Ideas for upcoming SAIT capstone

=== HARMONY GARDEN ===

The Harmony Garden is an educational adventure game designed to teach essential interpersonal and emotional skills that many children — and adults — struggle with. Through interactive storytelling, cooperative puzzles, and mindfulness activities, players learn how to navigate conflict, set boundaries, understand emotions, and communicate effectively.

The game is structured around four interconnected learning zones:

    Conflict Resolution Grove
    Feelings Forest
    Mindful Mountain
    Teamwork Trials

Each zone focuses on a different life skill, creating a holistic learning experience while addressing a huge gap in childhood education.

## Play the garden

The playable app lives in `web/`. It is a night-garden adventure for grades 1–6: cream garden spirits, leaf green, bark brown, and butterfly blue on a black field. Bramble, the guide, walks a player through one ripple at a time — a grove story, a feeling creature, a calm practice, a kinder repair, then a teamwork trial.

```bash
cd web
npm install
npm test
npm run dev
```

Open the local address Vite prints. Students pick a made-up garden name. Leave the join code empty for a solo garden, or enter a class code such as `FERN-2-17`. Teachers plant a class from “I am a garden keeper” and can preview a filled sample desk. Sounds start off.

Progress stays in this browser. A student can copy a blossom slip from the journal, and a teacher can download a class file, to carry a garden to another device. There is no leaderboard and no real-name roster.

The domain follows `model/harmony_garden.puml`. `SupabaseDB.store` / `retrieve` and `SupabaseAuth.signInWithCode` / `getRole` are the browser save and the keeper, counselor, and join codes. Students only see their own rows. A counselor can view a class and cannot change the roster.

## Publish

GitHub Pages: merge this app to `main`, then in the repository settings set Pages to **GitHub Actions**. The workflow `.github/workflows/pages.yml` tests, builds `web/`, and deploys. On a private repository, Pages also has to be enabled for private sites.

Vercel: import the repository and set the Root Directory to `web`. The app is a Vite project, so the build settings are install `npm ci`, build `npm run build`, and output `dist`. Those paths are relative to `web/`. `web/vercel.json` sets them. A root-level install command that also contains `--prefix web` looks for `web/web` and the install stops before the app compiles.
