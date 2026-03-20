# What Next - AI Career Guidance Platform

An AI-powered career guidance platform for Indian students who just completed 12th grade and are confused about choosing a bachelor's degree.

## Features

- **Landing Page**: Clean, modern landing page with clear value proposition
- **Authentication**: Secure email/password authentication via Supabase
- **Situation Selection**: Three intuitive options to describe the student's current state
- **AI Chat Interface**: Conversational AI that asks thoughtful questions using a 5-axis framework
- **Personalized Recommendations**: Structured career recommendations with clear reasoning
- **Clarity Report**: Downloadable report summarizing the conversation and recommendations
- **Mentor Requests**: Form to connect with mentors for further guidance

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase
- **AI**: OpenAI GPT-4o
- **UI Components**: Lucide React icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- An OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd what-next
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

**Note**: The Supabase credentials are already configured in the `.env` file. You only need to add your OpenAI API key.

4. The database schema is already set up in Supabase with the following tables:
   - `conversations` - Stores chat conversations
   - `recommendations` - Stores generated career recommendations
   - `mentor_requests` - Stores mentor connection requests

### Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`.

## Application Flow

1. **Landing Page** (`/`) - Introduction and call-to-action
2. **Authentication** (`/auth`) - Sign up or sign in
3. **Situation Selection** (`/start`) - Choose your current situation
4. **AI Chat** (`/chat`) - Conversational career discovery
5. **Results** (`/results`) - Personalized recommendations

## 5-Axis Career Framework

The AI evaluates students across five key dimensions:

1. **Interest Alignment**: What subjects/activities energize them?
2. **Skill Strengths**: What are they naturally good at?
3. **Lifestyle Preferences**: Stability, creativity, travel, independence?
4. **Financial Feasibility**: Family budget and ROI expectations
5. **Job Market Demand**: India-specific opportunities and growth

## Design Guidelines

- **Font**: Inter (Google Fonts)
- **Primary Color**: #6C63FF (soft purple)
- **Background**: #FFFFFF (white)
- **Text**: #1A1A2E (dark)
- **Mobile-first**: Fully responsive design

## Database Schema

### conversations
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `situation` (text: 'no_idea' | 'comparing' | 'unsure')
- `messages` (jsonb array)
- `completed` (boolean)
- `created_at`, `updated_at` (timestamps)

### recommendations
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `conversation_id` (uuid, foreign key to conversations)
- `best_fit` (jsonb)
- `secondary` (jsonb)
- `avoid` (jsonb)
- `reasoning` (jsonb)
- `created_at` (timestamp)

### mentor_requests
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `name` (text)
- `email` (text)
- `chosen_field` (text)
- `message` (text)
- `created_at` (timestamp)

## API Routes

### POST `/api/chat`
Handles the AI conversation. Accepts messages and returns AI responses.

**Request body**:
```json
{
  "messages": [...],
  "situation": "no_idea|comparing|unsure",
  "conversationId": "uuid"
}
```

**Response**:
```json
{
  "message": "AI response text"
}
```

### POST `/api/generate-recommendation`
Generates structured career recommendations based on the full conversation.

**Request body**:
```json
{
  "messages": [...],
  "conversationId": "uuid"
}
```

**Response**:
```json
{
  "recommendation": {
    "best_fit": {...},
    "secondary": {...},
    "avoid": {...},
    "reasoning": {...}
  }
}
```

## Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Authentication is handled securely via Supabase Auth
- OpenAI API key is stored as an environment variable

## Future Enhancements

- PDF generation for clarity reports (currently generates text file)
- Email notifications for mentor requests
- Progress saving and resume functionality
- Multiple language support
- Career path comparison tool
- Integration with educational institutions

## License

MIT

## Support

For issues or questions, please open an issue on GitHub or contact support.
