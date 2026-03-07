# Little League Lineup Pro

A smart baseball lineup generator for little league teams that balances infield/outfield time and manages pitching limits.

## Features

- **Smart Rotation Algorithm**: 
    - **Balanced Play**: Automatically balances infield and outfield time for every player.
    - **Pitching Limits**: Ensures no child pitches more than 2 innings per game.
    - **Fair Bench Rotation**: Implements a "everyone sits once before anyone sits twice" rule.
    - **10-Position Support**: Includes the standard infield plus 4 outfielders (LF, LC, RC, RF).
- **Roster Management**: Easily add/remove players and set their "Can Pitch" or "Can Catch" preferences.
- **Persistence**: Your roster is automatically saved to your browser's local storage.
- **Participation Summary**: A detailed breakdown of innings played by category for each player.

## Tech Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Motion (formerly Framer Motion)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd little-league-lineup-pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Hosting on Vercel or Netlify (Recommended)

This project is a standard Vite SPA. To host it:

1. Push your code to a GitHub repository.
2. Connect your repository to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. The build settings should be automatically detected:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Hosting on GitHub Pages

1. Install the `gh-pages` package:
   ```bash
   npm install gh-pages --save-dev
   ```
2. Add deployment scripts to `package.json`.
3. Run `npm run deploy`.

## License

MIT
