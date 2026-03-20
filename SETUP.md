# What Next - Setup Guide

## Quick Start

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the API key (starts with `sk-`)
5. **Important**: Save this key securely - you won't be able to see it again!

### Step 2: Add OpenAI API Key to Environment

1. Open the `.env` file in the project root
2. Replace `your_openai_api_key_here` with your actual OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

**Note**: The Supabase credentials are already configured and working!

### Step 3: Run the Application

```bash
# Install dependencies (if not already done)
npm install

# Run in development mode
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing the Application

### 1. Landing Page (/)
- Visit `http://localhost:3000`
- You should see the "What Next" landing page
- Click "Start for free" button

### 2. Authentication (/auth)
- Create a new account with:
  - Name: Your name
  - Email: Any valid email
  - Password: At least 6 characters
- Or sign in if you already have an account

### 3. Situation Selection (/start)
- After login, you'll see three situation cards
- Choose one that describes your situation:
  - "I have no idea what to choose"
  - "I'm deciding between a few options"
  - "I chose something but I'm not sure"

### 4. AI Chat (/chat)
- The AI will start the conversation automatically
- Answer the questions thoughtfully
- The progress bar shows which stage you're on:
  - Interests
  - Skills
  - Lifestyle
  - Finances
  - Market
- After enough conversation (typically 12+ messages), you'll see a button:
  - "I have enough to give you a recommendation. Ready?"
- Click it to generate your recommendation

### 5. Results (/results)
- View your personalized career recommendations
- Three sections:
  - ✅ Best fit for you (top recommendation)
  - ℹ️ Also worth considering (secondary option)
  - ❌ Think carefully about (path to avoid)
- Download your clarity report
- Submit a mentor request form

## Troubleshooting

### "Unauthorized" Error
- Make sure you're signed in
- Check that Supabase credentials are correct in `.env`

### AI Not Responding
- Verify your OpenAI API key is correct in `.env`
- Check that you have credits in your OpenAI account
- Look at the browser console for error messages

### Database Errors
- The database schema is already set up in Supabase
- If you see RLS errors, make sure you're authenticated
- Check that your Supabase project is active

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check that you're using Node.js 18 or higher
- Run `npm run build` to see specific error messages

## Environment Variables Explained

```env
# Supabase Configuration (Already Set Up)
NEXT_PUBLIC_SUPABASE_URL=https://tsyzwcyxaiwcmtvfqdkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration (You Need to Add This)
OPENAI_API_KEY=sk-your-key-here
```

### Why NEXT_PUBLIC_* prefix?
- Environment variables with `NEXT_PUBLIC_` are exposed to the browser
- The Supabase URL and anon key are safe to expose (they're public)
- The OpenAI API key does NOT have this prefix (it's server-only for security)

## Database Information

The following tables are already created in your Supabase database:

1. **conversations**: Stores all chat conversations
2. **recommendations**: Stores generated career recommendations
3. **mentor_requests**: Stores mentor connection requests

All tables have Row Level Security (RLS) enabled, so users can only access their own data.

## Cost Information

### OpenAI API Costs
- Model used: GPT-4o
- Approximate cost per conversation: $0.05 - $0.15
- Recommendation generation: $0.10 - $0.20
- Total per user: ~$0.15 - $0.35

### Supabase Costs
- Free tier includes:
  - 500MB database
  - 50,000 monthly active users
  - 2GB bandwidth
- This should be sufficient for testing and initial launch

## Production Deployment

### Recommended Platforms
1. **Vercel** (easiest for Next.js)
2. **Netlify**
3. **Railway**
4. **AWS/Google Cloud** (more advanced)

### Pre-deployment Checklist
- [ ] Add OpenAI API key to environment variables
- [ ] Verify Supabase credentials are correct
- [ ] Test the complete user flow
- [ ] Update metadata in `app/layout.tsx`
- [ ] Add proper error handling
- [ ] Set up monitoring/analytics
- [ ] Configure custom domain (optional)

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
6. Click "Deploy"

## Support

If you encounter any issues:

1. Check the browser console for errors
2. Check the terminal/server logs
3. Verify all environment variables are set correctly
4. Make sure you're using the latest version of the code
5. Ensure your OpenAI account has available credits

## Next Steps

After setting up the application:

1. Test the complete flow yourself
2. Gather feedback from real users
3. Monitor OpenAI API usage and costs
4. Consider adding analytics (e.g., PostHog, Google Analytics)
5. Set up error tracking (e.g., Sentry)
6. Plan for scaling if user base grows

Good luck with What Next! 🚀
